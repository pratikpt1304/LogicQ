#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    if (argc > 1 && strcmp(argv[1], "child") == 0) {
        printf("Child starting allocation...\n");
        size_t sz = 30 * 1024 * 1024;
        char *p = (char *)malloc(sz);
        if (!p) {
            printf("Child malloc failed!\n");
            return 1;
        }
        for (size_t i = 0; i < sz; i += 4096) {
            p[i] = 1;
        }
        printf("Child touched all 30MB!\n");
        Sleep(500);
        return 0;
    }

    HANDLE hJob = CreateJobObjectA(NULL, NULL);
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION jeli;
    memset(&jeli, 0, sizeof(jeli));
    jeli.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_PROCESS_MEMORY |
        JOB_OBJECT_LIMIT_JOB_MEMORY |
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    jeli.BasicLimitInformation.ActiveProcessLimit = 1;
    SIZE_T memBytes = 128ULL * 1024ULL * 1024ULL;
    jeli.ProcessMemoryLimit = memBytes;
    jeli.JobMemoryLimit = memBytes;
    SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, &jeli, sizeof(jeli));

    STARTUPINFOA si;
    memset(&si, 0, sizeof(si));
    si.cb = sizeof(si);

    PROCESS_INFORMATION pi;
    memset(&pi, 0, sizeof(pi));

    char cmd[MAX_PATH];
    snprintf(cmd, sizeof(cmd), "\"%s\" child", argv[0]);

    CreateProcessA(NULL, cmd, NULL, NULL, FALSE, CREATE_SUSPENDED, NULL, NULL, &si, &pi);
    AssignProcessToJobObject(hJob, pi.hProcess);
    ResumeThread(pi.hThread);

    // Poll memory while child is alive
    for (int i = 0; i < 10; i++) {
        Sleep(100);
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION xli;
        memset(&xli, 0, sizeof(xli));
        QueryInformationJobObject(hJob, JobObjectExtendedLimitInformation, &xli, sizeof(xli), NULL);

        JOBOBJECT_BASIC_ACCOUNTING_INFORMATION bai;
        memset(&bai, 0, sizeof(bai));
        QueryInformationJobObject(hJob, JobObjectBasicAccountingInformation, &bai, sizeof(bai), NULL);

        printf("Tick %d: PeakProcessMem=%llu KB, PeakJobMem=%llu KB, CurrentJobMem=%llu KB\n",
               i,
               (unsigned long long)(xli.PeakProcessMemoryUsed / 1024ULL),
               (unsigned long long)(xli.PeakJobMemoryUsed / 1024ULL),
               (unsigned long long)(jeli.BasicLimitInformation.LimitFlags)); // test
    }

    WaitForSingleObject(pi.hProcess, INFINITE);

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION xliAfter;
    memset(&xliAfter, 0, sizeof(xliAfter));
    QueryInformationJobObject(hJob, JobObjectExtendedLimitInformation, &xliAfter, sizeof(xliAfter), NULL);

    printf("AFTER CHILD EXIT: PeakProcessMem=%llu KB, PeakJobMem=%llu KB\n",
           (unsigned long long)(xliAfter.PeakProcessMemoryUsed / 1024ULL),
           (unsigned long long)(xliAfter.PeakJobMemoryUsed / 1024ULL));

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    CloseHandle(hJob);
    return 0;
}
