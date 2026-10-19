/**
 * win-sandbox-runner.c
 * High-Performance Win32 Job Object Process Isolation Sandbox Runner for LogicQ
 *
 * Compiles with:
 *   gcc -O2 -Wall -s win-sandbox-runner.c -o win-sandbox-runner.exe
 *
 * Usage:
 *   win-sandbox-runner.exe <timeLimitMs> <memoryLimitMb> <workingDir> <targetBinaryPath> [runToken]
 *
 * Enforces:
 *   - ActiveProcessLimit = 1 (anti-fork-bomb kernel limit)
 *   - ProcessMemoryLimit & JobMemoryLimit = 128MB (or user limit)
 *   - JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE (zero orphaned processes)
 *   - CPU time watchdog + wall-clock watchdog (e.g. 2.0s CPU / 3.0s wall)
 *   - Streaming stdout/stderr with 10MB maximum output buffer cap
 *   - QueryInformationJobObject accounting (userTimeMs, kernelTimeMs, peakMemKb)
 *   - Suppression of Windows WerFault crash dialogs via SetErrorMode
 *   - Secure metadata output to stderr with runToken sentinel:
 *     __LQ_META_<runToken>__|exitCode|timedOut|ole|userTimeMs|kernelTimeMs|peakMemKb
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <io.h>
#include <fcntl.h>

#define MAX_OUTPUT_BYTES (10 * 1024 * 1024) // 10 MB maximum output buffer cap
#define MAX_STDERR_BYTES (2 * 1024 * 1024)  // 2 MB maximum stderr buffer cap
#define BUFFER_CHUNK_SIZE (64 * 1024)       // 64 KB read buffer
#define EXIT_CODE_TIMEOUT 124
#define EXIT_CODE_MLE 99

typedef struct {
    HANDLE hPipeRead;
    HANDLE hStdOutWrite;
    volatile LONG totalBytes;
    volatile LONG oleTriggered;
    HANDLE hJob;
} OutputThreadContext;

typedef struct {
    HANDLE hPipeRead;
    HANDLE hStdErrWrite;
    volatile LONG totalBytes;
} StderrThreadContext;

// Background thread streaming stdout from child pipe and enforcing 10MB cap
static DWORD WINAPI StdoutReaderThread(LPVOID lpParam) {
    OutputThreadContext *ctx = (OutputThreadContext *)lpParam;
    char buffer[BUFFER_CHUNK_SIZE];
    DWORD bytesRead = 0;
    DWORD bytesWritten = 0;

    while (ReadFile(ctx->hPipeRead, buffer, sizeof(buffer), &bytesRead, NULL) && bytesRead > 0) {
        LONG newTotal = InterlockedAdd(&ctx->totalBytes, bytesRead);
        if (newTotal > MAX_OUTPUT_BYTES) {
            ctx->oleTriggered = 1;
            // Write remaining allowable bytes
            LONG allowed = MAX_OUTPUT_BYTES - (newTotal - bytesRead);
            if (allowed > 0) {
                WriteFile(ctx->hStdOutWrite, buffer, (DWORD)allowed, &bytesWritten, NULL);
            }
            // Terminate job immediately due to output limit exceeded
            if (ctx->hJob) {
                TerminateJobObject(ctx->hJob, EXIT_CODE_MLE);
            }
            break;
        }
        WriteFile(ctx->hStdOutWrite, buffer, bytesRead, &bytesWritten, NULL);
    }
    return 0;
}

// Background thread streaming stderr from child pipe
static DWORD WINAPI StderrReaderThread(LPVOID lpParam) {
    StderrThreadContext *ctx = (StderrThreadContext *)lpParam;
    char buffer[BUFFER_CHUNK_SIZE];
    DWORD bytesRead = 0;
    DWORD bytesWritten = 0;

    while (ReadFile(ctx->hPipeRead, buffer, sizeof(buffer), &bytesRead, NULL) && bytesRead > 0) {
        LONG newTotal = InterlockedAdd(&ctx->totalBytes, bytesRead);
        if (newTotal <= MAX_STDERR_BYTES) {
            WriteFile(ctx->hStdErrWrite, buffer, bytesRead, &bytesWritten, NULL);
        }
    }
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 5) {
        fprintf(stderr, "Usage: %s <timeLimitMs> <memoryLimitMb> <workingDir> <targetBinaryPath> [runToken]\n", argv[0]);
        return 1;
    }

    // Suppress Windows error reporting dialogs (WerFault.exe)
    SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX);

    unsigned long timeLimitMs = strtoul(argv[1], NULL, 10);
    if (timeLimitMs == 0) timeLimitMs = 1000;

    unsigned long memoryLimitMb = strtoul(argv[2], NULL, 10);
    if (memoryLimitMb == 0) memoryLimitMb = 128;

    const char *workDir = argv[3];
    const char *targetExePath = argv[4];
    const char *runToken = (argc >= 6 && argv[5][0] != '\0') ? argv[5] : "DEFAULT";

    // 1. Create Win32 Job Object
    HANDLE hJob = CreateJobObjectA(NULL, NULL);
    if (!hJob) {
        fprintf(stderr, "Runner Error: CreateJobObject failed (code %lu)\n", GetLastError());
        return 1;
    }

    // 2. Configure Job Object Limits
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION jeli;
    memset(&jeli, 0, sizeof(jeli));

    jeli.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_PROCESS_MEMORY |
        JOB_OBJECT_LIMIT_JOB_MEMORY |
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE |
        JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;

    // Strict 1 process limit (kills fork bombs)
    jeli.BasicLimitInformation.ActiveProcessLimit = 1;

    // Memory limit (heap, stack, BSS)
    SIZE_T memBytes = (SIZE_T)memoryLimitMb * 1024ULL * 1024ULL;
    jeli.ProcessMemoryLimit = memBytes;
    jeli.JobMemoryLimit = memBytes;

    if (!SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, &jeli, sizeof(jeli))) {
        fprintf(stderr, "Runner Error: SetInformationJobObject failed (code %lu)\n", GetLastError());
        CloseHandle(hJob);
        return 1;
    }

    // 3. Setup Redirection Pipes
    HANDLE hStdoutRead = NULL, hStdoutWrite = NULL;
    HANDLE hStderrRead = NULL, hStderrWrite = NULL;

    SECURITY_ATTRIBUTES sa;
    memset(&sa, 0, sizeof(sa));
    sa.nLength = sizeof(SECURITY_ATTRIBUTES);
    sa.bInheritHandle = TRUE;
    sa.lpSecurityDescriptor = NULL;

    if (!CreatePipe(&hStdoutRead, &hStdoutWrite, &sa, 0)) {
        fprintf(stderr, "Runner Error: CreatePipe stdout failed (code %lu)\n", GetLastError());
        CloseHandle(hJob);
        return 1;
    }
    SetHandleInformation(hStdoutRead, HANDLE_FLAG_INHERIT, 0);

    if (!CreatePipe(&hStderrRead, &hStderrWrite, &sa, 0)) {
        fprintf(stderr, "Runner Error: CreatePipe stderr failed (code %lu)\n", GetLastError());
        CloseHandle(hStdoutRead);
        CloseHandle(hStdoutWrite);
        CloseHandle(hJob);
        return 1;
    }
    SetHandleInformation(hStderrRead, HANDLE_FLAG_INHERIT, 0);

    // Stdin: Child directly inherits runner's stdin handle or NUL if closed/invalid
    HANDLE hStdin = GetStdHandle(STD_INPUT_HANDLE);
    if (!hStdin || hStdin == INVALID_HANDLE_VALUE) {
        hStdin = CreateFileA("NUL", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, &sa, OPEN_EXISTING, 0, NULL);
    } else {
        SetHandleInformation(hStdin, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT);
    }

    // 4. Create Child Process in Suspended State
    STARTUPINFOA si;
    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = hStdin;
    si.hStdOutput = hStdoutWrite;
    si.hStdError = hStderrWrite;

    PROCESS_INFORMATION pi;
    memset(&pi, 0, sizeof(pi));

    char cmdLine[MAX_PATH * 2 + 10];
    snprintf(cmdLine, sizeof(cmdLine), "\"%s\"", targetExePath);

    BOOL created = FALSE;
    DWORD err = 0;
    for (int retry = 0; retry < 60; retry++) {
        created = CreateProcessA(
            NULL,
            cmdLine,
            NULL,
            NULL,
            TRUE, // inherit handles
            CREATE_SUSPENDED,
            NULL,
            workDir,
            &si,
            &pi
        );
        if (created) break;
        err = GetLastError();
        // 4551: Windows Defender / App Control file scanning race
        // 5: ERROR_ACCESS_DENIED (temporary file scanner lock)
        // 32: ERROR_SHARING_VIOLATION
        if (err == 4551 || err == 5 || err == 32) {
            Sleep(50);
        } else {
            break;
        }
    }

    // Close write handles in parent immediately so reader threads receive EOF on process exit
    CloseHandle(hStdoutWrite);
    CloseHandle(hStderrWrite);

    if (!created) {
        fprintf(stderr, "Runner Error: CreateProcessA failed (code %lu)\n", err);
        CloseHandle(hStdoutRead);
        CloseHandle(hStderrRead);
        CloseHandle(hJob);
        return 1;
    }

    // 5. Assign to Job Object before resuming execution
    if (!AssignProcessToJobObject(hJob, pi.hProcess)) {
        DWORD err = GetLastError();
        fprintf(stderr, "Runner Error: AssignProcessToJobObject failed (code %lu)\n", err);
        TerminateProcess(pi.hProcess, 1);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        CloseHandle(hStdoutRead);
        CloseHandle(hStderrRead);
        CloseHandle(hJob);
        return 1;
    }

    // 6. Resume child execution
    ResumeThread(pi.hThread);

    // 7. Launch asynchronous pipe reader threads
    OutputThreadContext stdoutCtx;
    memset(&stdoutCtx, 0, sizeof(stdoutCtx));
    stdoutCtx.hPipeRead = hStdoutRead;
    stdoutCtx.hStdOutWrite = GetStdHandle(STD_OUTPUT_HANDLE);
    stdoutCtx.hJob = hJob;

    StderrThreadContext stderrCtx;
    memset(&stderrCtx, 0, sizeof(stderrCtx));
    stderrCtx.hPipeRead = hStderrRead;
    stderrCtx.hStdErrWrite = GetStdHandle(STD_ERROR_HANDLE);

    HANDLE hStdoutThread = CreateThread(NULL, 0, StdoutReaderThread, &stdoutCtx, 0, NULL);
    HANDLE hStderrThread = CreateThread(NULL, 0, StderrReaderThread, &stderrCtx, 0, NULL);

    // 8. Watchdog: Wait for process termination with CPU user time and wall-clock limits
    DWORD wallWatchdogMs = timeLimitMs + 1000;
    if (wallWatchdogMs < 3000) wallWatchdogMs = 3000;

    int timedOut = 0;
    DWORD stepMs = 50;
    DWORD elapsedWallMs = 0;

    while (elapsedWallMs < wallWatchdogMs) {
        DWORD waitRes = WaitForSingleObject(pi.hProcess, stepMs);
        if (waitRes == WAIT_OBJECT_0) {
            break;
        }
        elapsedWallMs += stepMs;

        JOBOBJECT_BASIC_ACCOUNTING_INFORMATION bai;
        if (QueryInformationJobObject(hJob, JobObjectBasicAccountingInformation, &bai, sizeof(bai), NULL)) {
            unsigned long currentCpuMs = (unsigned long)(bai.TotalUserTime.QuadPart / 10000ULL);
            if (currentCpuMs >= timeLimitMs) {
                timedOut = 1;
                TerminateJobObject(hJob, EXIT_CODE_TIMEOUT);
                break;
            }
        }
    }

    if (elapsedWallMs >= wallWatchdogMs && !timedOut) {
        timedOut = 1;
        TerminateJobObject(hJob, EXIT_CODE_TIMEOUT);
    }

    // Wait for reader threads to flush remaining output
    if (hStdoutThread) {
        WaitForSingleObject(hStdoutThread, 500);
        CloseHandle(hStdoutThread);
    }
    if (hStderrThread) {
        WaitForSingleObject(hStderrThread, 500);
        CloseHandle(hStderrThread);
    }

    // 9. Query Job Object Accounting Information
    JOBOBJECT_BASIC_ACCOUNTING_INFORMATION bai;
    memset(&bai, 0, sizeof(bai));
    QueryInformationJobObject(hJob, JobObjectBasicAccountingInformation, &bai, sizeof(bai), NULL);

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION xli;
    memset(&xli, 0, sizeof(xli));
    QueryInformationJobObject(hJob, JobObjectExtendedLimitInformation, &xli, sizeof(xli), NULL);

    unsigned long userTimeMs = (unsigned long)(bai.TotalUserTime.QuadPart / 10000ULL);
    unsigned long kernelTimeMs = (unsigned long)(bai.TotalKernelTime.QuadPart / 10000ULL);
    unsigned long peakMemKb = (unsigned long)(xli.PeakProcessMemoryUsed / 1024ULL);

    DWORD exitCode = 0;
    GetExitCodeProcess(pi.hProcess, &exitCode);

    if (userTimeMs >= timeLimitMs) {
        timedOut = 1;
    }

    int ole = stdoutCtx.oleTriggered ? 1 : 0;

    // 10. Print structured metadata to stderr with runToken sentinel
    fprintf(stderr, "\n__LQ_META_%s__|%lu|%d|%d|%lu|%lu|%lu\n",
            runToken,
            (unsigned long)exitCode,
            timedOut,
            ole,
            userTimeMs,
            kernelTimeMs,
            peakMemKb);
    fflush(stderr);

    // Teardown handles
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    CloseHandle(hStdoutRead);
    CloseHandle(hStderrRead);
    CloseHandle(hJob);

    return 0;
}
