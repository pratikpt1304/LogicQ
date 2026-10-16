#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>

int main() {
    HANDLE hJob = CreateJobObjectA(NULL, NULL);
    if (!hJob) {
        printf("CreateJobObject failed: %lu\n", GetLastError());
        return 1;
    }

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION jeli;
    memset(&jeli, 0, sizeof(jeli));
    jeli.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_PROCESS_MEMORY |
        JOB_OBJECT_LIMIT_JOB_MEMORY |
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE |
        JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
    jeli.BasicLimitInformation.ActiveProcessLimit = 1;
    SIZE_T memBytes = 128ULL * 1024ULL * 1024ULL;
    jeli.ProcessMemoryLimit = memBytes;
    jeli.JobMemoryLimit = memBytes;

    BOOL ok = SetInformationJobObject(hJob, JobObjectExtendedLimitInformation, &jeli, sizeof(jeli));
    printf("SetInformationJobObject returned: %d, GetLastError: %lu\n", ok, GetLastError());

    CloseHandle(hJob);
    return 0;
}
