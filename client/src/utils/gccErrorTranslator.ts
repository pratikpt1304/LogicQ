export interface GccHint {
  line?: number;
  column?: number;
  title: string;
  explanation: string;
  remedy: string;
  category: 'SYNTAX' | 'TYPO' | 'POINTER_SCANF' | 'MEMORY' | 'HEADER' | 'LOGIC';
}

/**
 * Parses raw GCC compiler/linker diagnostics and produces student-friendly,
 * plain-English explanations with actionable remedies.
 */
export function translateGccDiagnostics(rawOutput: string = ''): GccHint[] {
  if (!rawOutput || typeof rawOutput !== 'string') return [];

  const hints: GccHint[] = [];
  const lines = rawOutput.split('\n');

  // Helper to extract line number from "solution.c:12:5: error: ..."
  const extractLineNumber = (msg: string): { line?: number; column?: number } => {
    const match = msg.match(/:(\d+):(\d+):/);
    if (match) {
      return { line: parseInt(match[1], 10), column: parseInt(match[2], 10) };
    }
    const matchLineOnly = msg.match(/:(\d+):/);
    if (matchLineOnly) {
      return { line: parseInt(matchLineOnly[1], 10) };
    }
    return {};
  };

  // 1. Missing Semicolon
  if (rawOutput.includes("expected ';'") || rawOutput.includes("expected ';' before")) {
    const lineInfo = extractLineNumber(lines.find((l) => l.includes("expected ';'")) || '');
    hints.push({
      ...lineInfo,
      title: "Missing Semicolon (;)",
      explanation: "In C, every statement must end with a semicolon ';'. The compiler found the next token before seeing a semicolon.",
      remedy: lineInfo.line
        ? "Check line " + lineInfo.line + " or the line right above it and add a semicolon ';' at the end."
        : "Check the statement just above the reported error and ensure it ends with ';'.",
      category: 'SYNTAX',
    });
  }

  // 2. scanf Missing Ampersand (&)
  if (
    rawOutput.includes("format '%d' expects argument of type 'int *'") ||
    rawOutput.includes("format '%f' expects argument of type 'float *'") ||
    rawOutput.includes("format '%lf' expects argument of type 'double *'") ||
    rawOutput.includes("expects argument of type")
  ) {
    const lineInfo = extractLineNumber(lines.find((l) => l.includes("expects argument of type")) || '');
    hints.push({
      ...lineInfo,
      title: "Missing & (Address-Of) in scanf",
      explanation: "scanf needs the memory address of the variable to store user input. Passing the variable directly causes a segmentation fault or crash.",
      remedy: "Add '&' before your variable name inside scanf. For example: scanf(\"%d\", &num); instead of scanf(\"%d\", num);. (Note: string buffers/arrays do not need '&').",
      category: 'POINTER_SCANF',
    });
  }

  // 3. Typo in function name (e.g. prinft, scnaf, mian)
  const implicitDeclMatch = rawOutput.match(/implicit declaration of function ['‘]([a-zA-Z0-9_]+)['’]/);
  if (implicitDeclMatch) {
    const funcName = implicitDeclMatch[1];
    const lineInfo = extractLineNumber(lines.find((l) => l.includes("implicit declaration")) || '');

    const knownFixes: Record<string, string> = {
      prinft: 'printf (from <stdio.h>)',
      prinf: 'printf (from <stdio.h>)',
      scnaf: 'scanf (from <stdio.h>)',
      scanff: 'scanf (from <stdio.h>)',
      mian: 'main',
      viod: 'void',
      stirng: 'string',
      sqrtt: 'sqrt (from <math.h>)',
      poww: 'pow (from <math.h>)',
      fror: 'for',
      whlie: 'while',
    };

    const suggested = knownFixes[funcName.toLowerCase()];
    hints.push({
      ...lineInfo,
      title: "Unknown Function '" + funcName + "'",
      explanation: "The compiler does not recognize '" + funcName + "'. This usually means a spelling typo or a missing header file.",
      remedy: suggested
        ? "Did you mean '" + suggested + "'? Check spelling on line " + (lineInfo.line || "where it is called") + "."
        : "Verify the spelling of '" + funcName + "' and ensure you have included its header (e.g. #include <stdio.h>).",
      category: 'TYPO',
    });
  }

  // 4. Undeclared Identifier / Variable
  const undeclaredMatch = rawOutput.match(/['‘]([a-zA-Z0-9_]+)['’] undeclared/);
  if (undeclaredMatch) {
    const varName = undeclaredMatch[1];
    const lineInfo = extractLineNumber(lines.find((l) => l.includes("undeclared")) || '');
    hints.push({
      ...lineInfo,
      title: "Variable '" + varName + "' Not Declared",
      explanation: "In C, every variable must be declared with a data type (like int, float, char) before you use it.",
      remedy: "Declare '" + varName + "' with its data type (e.g. 'int " + varName + ";' or 'char " + varName + ";') at the beginning of your function.",
      category: 'SYNTAX',
    });
  }

  // 5. Assignment vs Equality (lvalue required)
  if (rawOutput.includes('lvalue required as left operand of assignment')) {
    const lineInfo = extractLineNumber(lines.find((l) => l.includes('lvalue required')) || '');
    hints.push({
      ...lineInfo,
      title: 'Invalid Assignment (lvalue required)',
      explanation: 'You can only assign values to a single variable on the left side of =. You cannot assign to an expression like x + y = 10 or a constant like 5 = x.',
      remedy: "Put the single variable on the left: x = 10;. If you meant to compare values in an 'if' statement, use '==' instead of '='.",
      category: 'SYNTAX',
    });
  }

  // 6. Conflicting Types / Return Type Mismatch
  if (rawOutput.includes('conflicting types for') || rawOutput.includes('type mismatch')) {
    const lineInfo = extractLineNumber(lines.find((l) => l.includes('conflicting types')) || '');
    hints.push({
      ...lineInfo,
      title: 'Conflicting Types',
      explanation: 'The function or variable declaration does not match how it was previously declared or called.',
      remedy: 'Make sure your function prototype and implementation have the exact same return type and parameter types.',
      category: 'SYNTAX',
    });
  }

  // 7. Segmentation Fault / SIGSEGV in runtime/stderr
  if (rawOutput.includes('Segmentation fault') || rawOutput.includes('SIGSEGV') || rawOutput.includes('core dumped')) {
    hints.push({
      title: 'Segmentation Fault (Memory Access Crash)',
      explanation: 'Your C program crashed because it tried to read or write to a restricted memory location.',
      remedy: 'Common causes: 1) Missing & in scanf (e.g. scanf("%d", &x)), 2) Array index out of bounds (e.g. accessing arr[100] when size is 10), 3) Dereferencing a NULL or uninitialized pointer (*p).',
      category: 'MEMORY',
    });
  }

  // 8. Time Limit Exceeded / Infinite Loop
  if (rawOutput.includes('TIME_LIMIT_EXCEEDED') || rawOutput.includes('Time limit exceeded') || rawOutput.includes('timed out')) {
    hints.push({
      title: 'Execution Timed Out (Possible Infinite Loop)',
      explanation: 'Your code took longer than 1.0 second to finish. In C, this almost always means a loop is never terminating.',
      remedy: 'Check your while or for loops. Ensure the loop counter increases/decreases towards the termination condition (e.g. i++ or count--) so the loop can exit.',
      category: 'LOGIC',
    });
  }

  // 9. Missing main function
  if (rawOutput.includes('undefined reference to `main`') || rawOutput.includes("undefined reference to 'main'")) {
    hints.push({
      title: "Missing 'main()' Function",
      explanation: "Every C program must have an entry point function named main().",
      remedy: "Ensure your code defines: int main() { ... return 0; }. Check that 'main' is not misspelled as 'mian'.",
      category: 'HEADER',
    });
  }

  return hints;
}
