import { CompilerDiagnostic } from './judge.interface.js';

export interface DiagnosticReport {
  diagnostics: CompilerDiagnostic[];
  rawStderr: string;
  formattedOutput: string;
}

interface DiagnosticRule {
  pattern: RegExp;
  category: 'SYNTAX' | 'TYPE_MISMATCH' | 'POINTER_MEMORY' | 'FUNCTIONS_LINKER' | 'STANDARDS_SECURITY';
  ruleId: string;
  title: string;
  explanation: (match: RegExpExecArray) => string;
  actionableHint: (match: RegExpExecArray) => string;
  example?: {
    problematic: string;
    fixed: string;
    note?: string;
  };
}

const DIAGNOSTIC_RULES: DiagnosticRule[] = [
  // 1. Missing Semicolon
  {
    pattern: /expected\s+['"]?;['"]?\s+(?:before|at end of)/i,
    category: 'SYNTAX',
    ruleId: 'SYNTAX_MISSING_SEMICOLON',
    title: 'Missing Semicolon',
    explanation: () =>
      'In C, every statement must end with a semicolon (;). A semicolon is missing at the end of the previous statement.',
    actionableHint: () =>
      'Add a semicolon (;) at the end of the line immediately before this statement.',
    example: {
      problematic: 'int a = 10\nprintf("%d", a);',
      fixed: 'int a = 10;\nprintf("%d", a);',
    },
  },

  // 2. Missing & in scanf (address required)
  {
    pattern: /format\s+['"]%[a-zA-Z]['"]\s+expects argument of type\s+['"][^'"]*\*['"],\s+but argument \d+ has type\s+['"][^'"]*['"]/i,
    category: 'POINTER_MEMORY',
    ruleId: 'SCANF_MISSING_ADDRESS_OP',
    title: 'Missing Address-of Operator (&) in scanf',
    explanation: () =>
      'The scanf function requires the memory address (&) of the variable where the scanned input should be stored, not the value itself.',
    actionableHint: () =>
      "Add the address-of operator '&' before the variable in scanf (e.g., scanf(\"%d\", &variable);).",
    example: {
      problematic: 'int n;\nscanf("%d", n);',
      fixed: 'int n;\nscanf("%d", &n);',
    },
  },

  // 3. Format specifier mismatch (printf / scanf)
  {
    pattern: /format\s+['"]%[a-zA-Z]['"]\s+expects argument of type\s+['"][^'"]*['"],\s+but argument \d+ has type\s+['"][^'"]*['"]/i,
    category: 'TYPE_MISMATCH',
    ruleId: 'FORMAT_SPECIFIER_MISMATCH',
    title: 'Format Specifier Type Mismatch',
    explanation: (m) =>
      `The format string does not match the data type of the argument provided: ${m[0]}`,
    actionableHint: () =>
      'Ensure the format specifier corresponds to the variable type (%d for int, %f for float, %lf for double, %c for char, %s for string).',
    example: {
      problematic: 'char *msg = "hello";\nprintf("%d", msg);',
      fixed: 'char *msg = "hello";\nprintf("%s", msg);',
    },
  },

  // 4. Undeclared variable / identifier
  {
    pattern: /['"]([^'"]+)['"]\s+undeclared(?:\s+\(first use in this function\))?/i,
    category: 'SYNTAX',
    ruleId: 'UNDECLARED_IDENTIFIER',
    title: 'Undeclared Variable or Identifier',
    explanation: (m) =>
      `The variable or identifier '${m[1]}' is used without being declared in this scope. C requires all variables to be declared with a type before use.`,
    actionableHint: (m) =>
      `Declare '${m[1]}' with its type (e.g. 'int ${m[1]};') before using it, or verify you haven't misspelled the name.`,
    example: {
      problematic: 'count = 5;',
      fixed: 'int count = 5;',
    },
  },

  // 5. Missing return in non-void function
  {
    pattern: /(?:control reaches end of non-void function|return with no value, in function returning)/i,
    category: 'FUNCTIONS_LINKER',
    ruleId: 'MISSING_RETURN_VALUE',
    title: 'Missing Return Statement in Non-Void Function',
    explanation: () =>
      'The function was declared with a return type (such as int), but reaches the end without returning a value.',
    actionableHint: () =>
      "Add a 'return' statement returning a value of the declared return type (e.g., 'return 0;' in main()).",
    example: {
      problematic: 'int main() {\n    printf("Hello");\n}',
      fixed: 'int main() {\n    printf("Hello");\n    return 0;\n}',
    },
  },

  // 6. Unknown type name
  {
    pattern: /unknown type name\s+['"]([^'"]+)['"]/i,
    category: 'SYNTAX',
    ruleId: 'UNKNOWN_TYPE_NAME',
    title: 'Unknown Type Name',
    explanation: (m) =>
      `The type '${m[1]}' is not recognized. You may need to include a header or define a struct/typedef.`,
    actionableHint: (m) =>
      `Check if '${m[1]}' requires an #include (e.g. <stdbool.h> for bool, <stdint.h> for int64_t) or check for spelling errors.`,
  },

  // 7. Implicit declaration of function
  {
    pattern: /implicit declaration of function\s+['"]([^'"]+)['"]/i,
    category: 'FUNCTIONS_LINKER',
    ruleId: 'IMPLICIT_FUNCTION_DECLARATION',
    title: 'Implicit Function Declaration',
    explanation: (m) =>
      `The function '${m[1]}' is called before being declared or having its standard header included.`,
    actionableHint: (m) =>
      `Include the standard header containing '${m[1]}' (e.g. <stdio.h> for printf/scanf, <math.h> for pow/sqrt, <string.h> for strlen).`,
  },

  // 8. Assignment in condition (= vs ==)
  {
    pattern: /suggest parentheses around assignment used as truth value/i,
    category: 'SYNTAX',
    ruleId: 'ASSIGNMENT_IN_CONDITION',
    title: 'Accidental Assignment in Condition (= instead of ==)',
    explanation: () =>
      "A single '=' performs assignment, not equality comparison. In an 'if' or 'while' statement, you likely intended '=='.",
    actionableHint: () =>
      "Replace '=' with '==' to test for equality, or add parentheses if assignment was truly intended.",
    example: {
      problematic: 'if (x = 5) { ... }',
      fixed: 'if (x == 5) { ... }',
    },
  },

  // 9. Array subscript is not an integer
  {
    pattern: /array subscript is not an integer/i,
    category: 'TYPE_MISMATCH',
    ruleId: 'NON_INTEGER_ARRAY_SUBSCRIPT',
    title: 'Non-Integer Array Index',
    explanation: () =>
      'Array indices must evaluate to integer types. Using a float, double, or pointer as an array index is invalid in C.',
    actionableHint: () =>
      'Cast or ensure the array index expression evaluates to an integer (int, size_t, etc.).',
  },

  // 10. Dereferencing non-pointer
  {
    pattern: /invalid type argument of (?:unary )?['*']['"]?/i,
    category: 'POINTER_MEMORY',
    ruleId: 'DEREFERENCE_NON_POINTER',
    title: 'Dereferencing a Non-Pointer Variable',
    explanation: () =>
      "The '*' dereference operator can only be applied to pointer types, not regular non-pointer variables.",
    actionableHint: () =>
      'Ensure the variable being dereferenced is declared as a pointer (e.g. int *ptr).',
  },

  // 11. Subscripted value is neither array nor pointer
  {
    pattern: /subscripted value is neither array nor pointer/i,
    category: 'POINTER_MEMORY',
    ruleId: 'SUBSCRIPT_NON_ARRAY',
    title: 'Index Operator Used on Non-Array',
    explanation: () =>
      'The brackets [ ] can only be used on arrays or pointers.',
    actionableHint: () =>
      'Verify the variable being indexed is an array or pointer type.',
  },

  // 12. Security rejection in sandbox
  {
    pattern: /Security violation:\s+(.+)/i,
    category: 'STANDARDS_SECURITY',
    ruleId: 'SECURITY_VIOLATION',
    title: 'Sandbox Security Invariant Violation',
    explanation: (m) => m[1] || 'Sandbox security policy prevented compiling this operation.',
    actionableHint: () =>
      'Use only standard C11 library constructs. System calls, external sockets, and process manipulation are blocked.',
  },
];

/**
 * Maps raw GCC compiler output into structured beginner-friendly diagnostics
 * while preserving verbatim stderr.
 */
export function mapCompilerOutput(rawStderr: string = ''): DiagnosticReport {
  if (!rawStderr || !rawStderr.trim()) {
    return {
      diagnostics: [],
      rawStderr,
      formattedOutput: rawStderr,
    };
  }

  const diagnostics: CompilerDiagnostic[] = [];
  const lines = rawStderr.split('\n');

  // GCC diagnostic line regex: path:line:col: severity: message
  const gccLineRegex = /^(?:.*?):(\d+):(\d+):\s+(error|warning|note):\s+(.*)$/i;

  for (const line of lines) {
    const match = gccLineRegex.exec(line.trim());
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const colNum = parseInt(match[2], 10);
      const severity = match[3].toLowerCase() as 'error' | 'warning' | 'note';
      const rawMessage = match[4].trim();

      // Find matching educational rule
      let matchedRule: DiagnosticRule | undefined;
      let ruleMatch: RegExpExecArray | null = null;

      for (const rule of DIAGNOSTIC_RULES) {
        ruleMatch = rule.pattern.exec(rawMessage);
        if (ruleMatch) {
          matchedRule = rule;
          break;
        }
      }

      if (matchedRule && ruleMatch) {
        diagnostics.push({
          line: lineNum,
          column: colNum,
          severity,
          category: matchedRule.category,
          ruleId: matchedRule.ruleId,
          rawMessage,
          title: matchedRule.title,
          explanation: matchedRule.explanation(ruleMatch),
          actionableHint: matchedRule.actionableHint(ruleMatch),
          example: matchedRule.example,
        });
      } else {
        // Fallback diagnostic
        diagnostics.push({
          line: lineNum,
          column: colNum,
          severity,
          category: severity === 'error' ? 'SYNTAX' : 'STANDARDS_SECURITY',
          ruleId: 'COMPILER_DIAGNOSTIC',
          rawMessage,
          title: severity === 'error' ? 'Compilation Error' : 'Compiler Warning',
          explanation: rawMessage,
          actionableHint: `Inspect line ${lineNum}, column ${colNum} in your source code.`,
        });
      }
    }
  }

  // Format beginner-friendly summary prepended before raw stderr
  let formattedOutput = '';
  if (diagnostics.length > 0) {
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

    formattedOutput += `=== LogicQ Compiler Guidance ===\n`;
    formattedOutput += `Found ${errorCount} error(s) and ${warningCount} warning(s):\n\n`;

    diagnostics.forEach((d, idx) => {
      formattedOutput += `[${idx + 1}] Line ${d.line}:${d.column} [${d.severity.toUpperCase()}] ${d.title}\n`;
      formattedOutput += `    Hint: ${d.actionableHint}\n\n`;
    });

    formattedOutput += `=== Raw GCC Output ===\n`;
  }
  formattedOutput += rawStderr;

  return {
    diagnostics,
    rawStderr,
    formattedOutput,
  };
}
