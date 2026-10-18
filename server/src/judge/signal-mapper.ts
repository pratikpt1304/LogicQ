export interface DecodedSignal {
  signal?: string;
  description: string;
  exitCode?: number;
  isCrash?: boolean;
}

/**
 * Maps Windows NTSTATUS and POSIX exit codes to standard signal classifications
 * with human-readable diagnostic descriptions.
 */
export function decodeSignal(code: number | null | undefined): DecodedSignal {
  if (code === null || code === undefined || code === 0) {
    return {
      signal: undefined,
      description: 'Program exited successfully with code 0',
      exitCode: 0,
      isCrash: false,
    };
  }

  const unsignedCode = code >>> 0;

  // POSIX 11 (SIGSEGV), 139 (128+11), Windows 0xC0000005 (3221225477)
  if (code === 11 || code === 139 || unsignedCode === 3221225477) {
    return {
      signal: 'SIGSEGV',
      description:
        'Segmentation fault (access violation): attempting to read or write unallocated memory or dereference an invalid/null pointer.',
      exitCode: code,
      isCrash: true,
    };
  }

  // POSIX 8 (SIGFPE), 136 (128+8), Windows 0xC0000094 (3221225620)
  if (code === 8 || code === 136 || unsignedCode === 3221225620) {
    return {
      signal: 'SIGFPE',
      description:
        'Arithmetic exception (SIGFPE): integer division by zero or modulo by zero.',
      exitCode: code,
      isCrash: true,
    };
  }

  // POSIX 6 (SIGABRT), 134 (128+6), exit(3)
  if (code === 6 || code === 3 || code === 134) {
    return {
      signal: 'SIGABRT',
      description:
        'Process abort (SIGABRT): program called abort() or a standard library assertion failed.',
      exitCode: code,
      isCrash: true,
    };
  }

  // Windows 0xC00000FD (3221225725)
  if (unsignedCode === 3221225725) {
    return {
      signal: 'STACK_OVERFLOW',
      description:
        'Stack overflow: excessive recursion depth or huge local stack array allocation. Consider dynamic allocation (malloc) or increasing base case checks.',
      exitCode: code,
      isCrash: true,
    };
  }

  if (code === 99) {
    return {
      signal: 'MLE',
      description: 'Memory limit exceeded: heap allocation cap reached in isolated sandbox.',
      exitCode: code,
      isCrash: true,
    };
  }

  if (code === 124 || code === 137) {
    return {
      signal: 'SIGKILL',
      description: 'Time limit exceeded: execution terminated by sandbox timer.',
      exitCode: code,
      isCrash: true,
    };
  }

  if (code === 143) {
    return {
      signal: 'SIGTERM',
      description: 'Termination signal received.',
      exitCode: code,
      isCrash: true,
    };
  }

  if (code === 132 || unsignedCode === 3221225501) {
    return {
      signal: 'SIGILL',
      description: 'Illegal instruction (SIGILL): CPU encountered an invalid machine instruction.',
      exitCode: code,
      isCrash: true,
    };
  }

  return {
    signal: `EXIT_${code}`,
    description: `Process exited abnormally with non-zero exit code ${code}.`,
    exitCode: code,
    isCrash: true,
  };
}
