export interface GccHint {
  line?: number;
  column?: number;
  title: string;
  explanation: string;
  remedy: string;
  category: 'SYNTAX' | 'TYPO' | 'POINTER_SCANF' | 'MEMORY' | 'HEADER' | 'LOGIC' | 'FORMAT';
}

export interface MonacoGccMarker {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  title: string;
  message: string;
  remedy: string;
  severity: 'error' | 'warning' | 'info';
}

export interface OutputMismatchAnalysis {
  type: 'PROMPT_DETECTED' | 'FLOAT_PRECISION' | 'TRAILING_WHITESPACE' | 'CASE_MISMATCH' | 'EMPTY_OUTPUT' | 'VALUE_MISMATCH';
  title: string;
  message: string;
  actionableTip: string;
}

// Helper to extract line number from "solution.c:12:5: error: ..."
function extractLineNumber(msg: string): { line?: number; column?: number } {
  const match = msg.match(/:(\d+):(\d+):/);
  if (match) {
    return { line: parseInt(match[1], 10), column: parseInt(match[2], 10) };
  }
  const matchLineOnly = msg.match(/:(\d+):/);
  if (matchLineOnly) {
    return { line: parseInt(matchLineOnly[1], 10), column: 1 };
  }
  return {};
}

/**
 * Parses raw GCC compiler/linker diagnostics and produces student-friendly,
 * plain-English explanations with actionable remedies.
 */
export function translateGccDiagnostics(rawOutput: string = ''): GccHint[] {
  if (!rawOutput || typeof rawOutput !== 'string') return [];

  const hints: GccHint[] = [];
  const lines = rawOutput.split('\n');

  // 1. Missing Semicolon
  if (rawOutput.includes("expected ';'") || rawOutput.includes("expected ';' before")) {
    const errorLine = lines.find((l) => l.includes("expected ';'")) || '';
    const lineInfo = extractLineNumber(errorLine);
    hints.push({
      ...lineInfo,
      title: "Missing Semicolon (;)",
      explanation: "In C, every statement must end with a semicolon ';'. The compiler encountered the next token before seeing a semicolon.",
      remedy: lineInfo.line
        ? `Check line ${lineInfo.line} or the line right above it and add a semicolon ';' at the end.`
        : "Check the statement just above the reported error and ensure it ends with ';'.",
      category: 'SYNTAX',
    });
  }

  // 2. scanf Missing Ampersand (&)
  if (
    rawOutput.includes("format '%d' expects argument of type 'int *'") ||
    rawOutput.includes("format '%f' expects argument of type 'float *'") ||
    rawOutput.includes("format '%lf' expects argument of type 'double *'") ||
    rawOutput.includes("format '%lld' expects argument of type 'long long int *'") ||
    rawOutput.includes("format '%c' expects argument of type 'char *'") ||
    rawOutput.includes("expects argument of type")
  ) {
    const errorLine = lines.find((l) => l.includes("expects argument of type")) || '';
    const lineInfo = extractLineNumber(errorLine);
    hints.push({
      ...lineInfo,
      title: "Missing & (Address-Of) in scanf",
      explanation: "scanf requires the memory address of the variable to store user input. Passing the variable directly causes a crash (Segmentation Fault).",
      remedy: "Add '&' before your variable name inside scanf. For example: scanf(\"%d\", &num); instead of scanf(\"%d\", num);. (Note: string char arrays do not require '&').",
      category: 'POINTER_SCANF',
    });
  }

  // 3. Typo in function name (e.g. prinft, scnaf, mian)
  const implicitDeclMatch = rawOutput.match(/implicit declaration of function ['‘]([a-zA-Z0-9_]+)['’]/);
  if (implicitDeclMatch) {
    const funcName = implicitDeclMatch[1];
    const errorLine = lines.find((l) => l.includes("implicit declaration")) || '';
    const lineInfo = extractLineNumber(errorLine);

    const knownFixes: Record<string, string> = {
      prinft: 'printf (from <stdio.h>)',
      prinf: 'printf (from <stdio.h>)',
      pritnf: 'printf (from <stdio.h>)',
      print: 'printf (from <stdio.h>)',
      scnaf: 'scanf (from <stdio.h>)',
      scanff: 'scanf (from <stdio.h>)',
      sacnf: 'scanf (from <stdio.h>)',
      mian: 'main',
      mainn: 'main',
      viod: 'void',
      stirng: 'string',
      sqrtt: 'sqrt (from <math.h>)',
      poww: 'pow (from <math.h>)',
      fror: 'for',
      fro: 'for',
      whlie: 'while',
      whil: 'while',
      retunr: 'return',
      retrun: 'return',
      retun: 'return',
      incude: 'include',
      inclue: 'include',
    };

    const suggested = knownFixes[funcName.toLowerCase()];
    hints.push({
      ...lineInfo,
      title: `Unknown Function '${funcName}'`,
      explanation: `The compiler does not recognize '${funcName}'. This usually means a spelling typo or a missing header file.`,
      remedy: suggested
        ? `Did you mean '${suggested}'? Check spelling on line ${lineInfo.line || "where it is called"}.`
        : `Verify the spelling of '${funcName}' and ensure you included the necessary header (e.g. #include <stdio.h> or #include <math.h>).`,
      category: 'TYPO',
    });
  }

  // 4. Undeclared Identifier / Variable
  const undeclaredMatch = rawOutput.match(/['‘]([a-zA-Z0-9_]+)['’] undeclared/);
  if (undeclaredMatch) {
    const varName = undeclaredMatch[1];
    const errorLine = lines.find((l) => l.includes("undeclared")) || '';
    const lineInfo = extractLineNumber(errorLine);
    hints.push({
      ...lineInfo,
      title: `Variable '${varName}' Not Declared`,
      explanation: `In C, every variable must be declared with its data type (like int, float, char) before you can use it.`,
      remedy: `Declare '${varName}' before using it (e.g., 'int ${varName};' or 'float ${varName};') inside your function.`,
      category: 'SYNTAX',
    });
  }

  // 5. Missing closing bracket / brace / parenthesis
  if (rawOutput.includes("expected '}'") || rawOutput.includes("expected ')'") || rawOutput.includes("expected ']'")) {
    const errorLine = lines.find((l) => l.includes("expected '}'") || l.includes("expected ')'") || l.includes("expected ']'")) || '';
    const lineInfo = extractLineNumber(errorLine);
    const bracket = rawOutput.includes("expected '}'") ? '}' : rawOutput.includes("expected ')'") ? ')' : ']';
    hints.push({
      ...lineInfo,
      title: `Missing Closing Bracket '${bracket}'`,
      explanation: `Every opening bracket '{', '(', or '[' must have a matching closing bracket '${bracket}'.`,
      remedy: `Count your opening and closing braces. Make sure the main function and all loops or if-statements have closing '${bracket}'.`,
      category: 'SYNTAX',
    });
  }

  // 6. Assignment vs Equality (lvalue required)
  if (rawOutput.includes('lvalue required as left operand of assignment')) {
    const errorLine = lines.find((l) => l.includes('lvalue required')) || '';
    const lineInfo = extractLineNumber(errorLine);
    hints.push({
      ...lineInfo,
      title: 'Invalid Assignment (lvalue required)',
      explanation: "You can only assign values to a single variable on the left side of '='. You cannot assign to an expression or constant (e.g. '5 = x' or 'x + y = 10').",
      remedy: "Put the single variable on the left: 'x = 10;'. If you meant to compare values in an 'if' condition, use '==' instead of '='.",
      category: 'SYNTAX',
    });
  }

  // 7. Missing Return in Non-Void Function
  if (rawOutput.includes('control reaches end of non-void function')) {
    const errorLine = lines.find((l) => l.includes('non-void function')) || '';
    const lineInfo = extractLineNumber(errorLine);
    hints.push({
      ...lineInfo,
      title: "Missing 'return' Statement",
      explanation: "Your function (e.g., 'int main()') is declared to return an integer, but reaches the end without a return statement.",
      remedy: "Add 'return 0;' at the end of your main() function before the closing brace '}'.",
      category: 'SYNTAX',
    });
  }

  // 8. Missing math.h for sqrt, pow, abs, ceil, floor
  if (rawOutput.includes('undefined reference to `sqrt`') || rawOutput.includes('undefined reference to `pow`') || rawOutput.includes('undefined reference to `ceil`') || rawOutput.includes('undefined reference to `floor`')) {
    hints.push({
      title: "Missing Math Library (<math.h>)",
      explanation: "Mathematical functions like sqrt(), pow(), ceil(), and floor() require the standard math header.",
      remedy: "Add '#include <math.h>' at the very top of your C file.",
      category: 'HEADER',
    });
  }

  // 9. Missing string.h for strlen, strcmp, strcpy
  if (rawOutput.includes('undefined reference to `strlen`') || rawOutput.includes('undefined reference to `strcmp`') || rawOutput.includes('undefined reference to `strcpy`')) {
    hints.push({
      title: "Missing String Library (<string.h>)",
      explanation: "String manipulation functions require the standard string library.",
      remedy: "Add '#include <string.h>' at the very top of your C file.",
      category: 'HEADER',
    });
  }

  // 10. Segmentation Fault / SIGSEGV in runtime/stderr
  if (rawOutput.includes('Segmentation fault') || rawOutput.includes('SIGSEGV') || rawOutput.includes('core dumped')) {
    hints.push({
      title: 'Segmentation Fault (Memory Access Crash)',
      explanation: 'Your C program crashed because it attempted to access an invalid or restricted memory address.',
      remedy: "Check these 3 common causes: 1) Did you forget '&' in scanf (e.g. scanf(\"%d\", &x))? 2) Is an array index out of bounds (e.g. arr[10] when size is 10)? 3) Dereferencing a NULL or uninitialized pointer.",
      category: 'MEMORY',
    });
  }

  // 11. Time Limit Exceeded / Infinite Loop
  if (rawOutput.includes('TIME_LIMIT_EXCEEDED') || rawOutput.includes('Time limit exceeded') || rawOutput.includes('timed out')) {
    hints.push({
      title: 'Execution Timed Out (Possible Infinite Loop)',
      explanation: 'Your code took longer than 1.0 second to finish. In C, this almost always means a while or for loop never terminates.',
      remedy: "Check your loops: Ensure the loop variable changes (e.g., 'i++' or 'i--') towards the exit condition, and verify the termination condition doesn't remain perpetually true.",
      category: 'LOGIC',
    });
  }

  // 12. Missing main function
  if (rawOutput.includes('undefined reference to `main`') || rawOutput.includes("undefined reference to 'main'")) {
    hints.push({
      title: "Missing 'main()' Function",
      explanation: "Every C program must have an entry point function named main().",
      remedy: "Ensure your code defines: 'int main() { ... return 0; }'. Make sure 'main' is not misspelled as 'mian' or 'mainn'.",
      category: 'HEADER',
    });
  }

  // 13. Division by Zero
  if (rawOutput.includes('floating point exception') || rawOutput.includes('SIGFPE')) {
    hints.push({
      title: 'Division by Zero (Arithmetic Exception)',
      explanation: 'Your program attempted to divide a number by zero or perform modulo by zero (e.g., x / 0 or x % 0).',
      remedy: "Add an if-condition before performing division or modulo to ensure the divisor is not zero: 'if (b != 0) { ... }'.",
      category: 'LOGIC',
    });
  }

  return hints;
}

/**
 * Extracts Monaco-compatible inline error markers from GCC compiler output.
 */
export function extractMonacoMarkers(rawOutput: string = ''): MonacoGccMarker[] {
  if (!rawOutput || typeof rawOutput !== 'string') return [];

  const markers: MonacoGccMarker[] = [];
  const lines = rawOutput.split('\n');

  for (const line of lines) {
    // Matches: "solution.c:12:5: error: expected ';' before 'return'"
    // or: "solution.c:12: error: ..."
    const match = line.match(/:(\d+)(?::(\d+))?:\s*(error|warning|note):\s*(.+)/i);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const colNum = match[2] ? parseInt(match[2], 10) : 1;
      const severityStr = match[3].toLowerCase();
      const rawMsg = match[4].trim();

      // Find if we have a friendly hint for this line
      const hints = translateGccDiagnostics(line);
      const matchedHint = hints[0];

      const severity: 'error' | 'warning' | 'info' =
        severityStr === 'error' ? 'error' : severityStr === 'warning' ? 'warning' : 'info';

      markers.push({
        line: lineNum,
        column: colNum,
        endLine: lineNum,
        endColumn: colNum + 20,
        title: matchedHint?.title || (severityStr === 'error' ? 'Compile Error' : 'Compiler Warning'),
        message: matchedHint ? `${matchedHint.title}: ${matchedHint.remedy}` : rawMsg,
        remedy: matchedHint?.remedy || rawMsg,
        severity,
      });
    }
  }

  return markers;
}

/**
 * Analyzes output mismatches between actual program output and expected output,
 * identifying the exact student misconception (e.g. conversational prompt, float precision, whitespace).
 */
export function analyzeOutputMismatch(actual: string = '', expected: string = ''): OutputMismatchAnalysis {
  const normActual = actual.trim();
  const normExpected = expected.trim();

  // 1. Empty Output
  if (!normActual && normExpected) {
    return {
      type: 'EMPTY_OUTPUT',
      title: 'No Output Generated',
      message: 'Your program finished without printing any output to standard output.',
      actionableTip: 'Ensure your printf statement is being executed and not skipped inside an if-statement condition.',
    };
  }

  // 2. Conversational Prompt Detected
  const promptKeywords = [
    'enter',
    'input',
    'please',
    'number',
    'value of',
    'give',
    'type',
    'the result is',
    'sum is',
    'answer is',
    'output is',
  ];
  const hasPromptKeyword = promptKeywords.some((kw) => normActual.toLowerCase().includes(kw));
  const expectedHasPrompt = promptKeywords.some((kw) => normExpected.toLowerCase().includes(kw));

  if (hasPromptKeyword && !expectedHasPrompt) {
    return {
      type: 'PROMPT_DETECTED',
      title: 'Conversational Input Prompt Detected',
      message: "You printed an interactive prompt (such as 'Enter a number:' or 'Result is:'). Automated test evaluators compare the raw output directly.",
      actionableTip: "Remove user prompts before scanf. For example: use 'scanf(\"%d\", &n);' directly instead of 'printf(\"Enter n: \"); scanf(\"%d\", &n);'.",
    };
  }

  // 3. Float Precision Mismatch (e.g. "15" vs "15.00", or "3.1415" vs "3.14")
  const actualNum = parseFloat(normActual);
  const expectedNum = parseFloat(normExpected);
  if (!isNaN(actualNum) && !isNaN(expectedNum) && Math.abs(actualNum - expectedNum) < 0.001) {
    const expectedDecimals = (normExpected.split('.')[1] || '').length;
    return {
      type: 'FLOAT_PRECISION',
      title: 'Decimal Precision Mismatch',
      message: `Your numerical answer is mathematically correct (${actualNum}), but the required format specifies exactly ${expectedDecimals} decimal place(s).`,
      actionableTip: `Use 'printf("%.${expectedDecimals}f\\n", result);' to format the output to exactly ${expectedDecimals} decimal places.`,
    };
  }

  // 4. Case Sensitivity Mismatch (e.g. "even" vs "EVEN", "Prime" vs "prime")
  if (normActual.toLowerCase() === normExpected.toLowerCase()) {
    return {
      type: 'CASE_MISMATCH',
      title: 'Letter Case Mismatch (UPPER / lower)',
      message: `Your output words match, but the letter case is different. You printed '${normActual}', but the test case expects '${normExpected}'.`,
      actionableTip: `Ensure exact uppercase or lowercase letters as given in the problem statement (e.g., '${normExpected}').`,
    };
  }

  // 5. Trailing Whitespace or Newline Difference
  if (actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '')) {
    return {
      type: 'TRAILING_WHITESPACE',
      title: 'Spacing or Newline Difference',
      message: 'The characters match, but there are extra or missing spaces or newlines (\\n).',
      actionableTip: "Check your printf statements for trailing spaces or verify if a newline '\\n' is required at the end.",
    };
  }

  // 6. Value Mismatch
  return {
    type: 'VALUE_MISMATCH',
    title: 'Output Mismatch',
    message: `Your program produced '${normActual}', but the expected answer is '${normExpected}'.`,
    actionableTip: 'Trace your calculation logic step-by-step with the input provided in the Use Case box.',
  };
}
