export function sanitizeMathInStatement(text) {
  if (!text) return '';

  const toSuperscript = (str) => {
    const map = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'i': 'ⁱ'
    };
    return str.split('').map((c) => map[c] || c).join('');
  };

  const toSubscript = (str) => {
    const map = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'n': 'ₙ', 'm': 'ₘ'
    };
    return str.split('').map((c) => map[c] || c).join('');
  };

  let result = text;

  // First handle multi-word text tags and macros
  result = result
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\to\b|\\rightarrow\b/g, '→')
    .replace(/\\le\b|\\leq\b/g, '≤')
    .replace(/\\ge\b|\\geq\b/g, '≥')
    .replace(/\\ne\b|\\neq\b/g, '≠')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\pm\b/g, '±')
    .replace(/\\dots\b|\\cdots\b|\\ldots\b/g, '...')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\log\b/g, 'log')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\{/g, '{')
    .replace(/\\right\}/g, '}')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');

  // Handle $...$ inline math blocks
  result = result.replace(/\$([^$]+)\$/g, (_, mathContent) => {
    let m = mathContent;
    m = m.replace(/\\text\{([^}]+)\}/g, '$1');
    m = m.replace(/\\to\b|\\rightarrow\b/g, '→');
    m = m.replace(/\\le\b|\\leq\b/g, '≤');
    m = m.replace(/\\ge\b|\\geq\b/g, '≥');
    m = m.replace(/\\ne\b|\\neq\b/g, '≠');
    m = m.replace(/\\times\b/g, '×');
    m = m.replace(/\\cdot\b/g, '·');
    m = m.replace(/\\pm\b/g, '±');
    m = m.replace(/\\log\b/g, 'log');
    m = m.replace(/\\in\b/g, '∈');
    // Negative signs before digits in math: -10 -> −10
    m = m.replace(/(^|[\s(,])-(?=\d)/g, '$1−');
    // Exponents: 10^9, 10^{18}, 2^{31}-1
    m = m.replace(/\^\{([0-9+\-ni]+)\}/g, (_, exp) => toSuperscript(exp));
    m = m.replace(/\^([0-9ni])/g, (_, exp) => toSuperscript(exp));
    // Subscripts: A_i, A_{i}, \log_5 -> log₅
    m = m.replace(/_\{([0-9ijkmn]+)\}/g, (_, sub) => toSubscript(sub));
    m = m.replace(/_([0-9ijkmn])/g, (_, sub) => toSubscript(sub));
    // Remove leftover backslashes
    m = m.replace(/\\([a-zA-Z≤≥≠×·±∈∞→]+)/g, '$1');
    m = m.replace(/\\/g, '');
    return m.trim();
  });

  // Handle exponents outside math blocks if any: 10^9 -> 10⁹
  result = result.replace(/10\^\{?(\d+)\}?/g, (_, exp) => `10${toSuperscript(exp)}`);
  result = result.replace(/2\^\{?(\d+)\}?/g, (_, exp) => `2${toSuperscript(exp)}`);

  // Strip stray backslashes before unicode math symbols or words
  result = result
    .replace(/\\([≤≥≠×·±∈∞→])/g, '$1')
    .replace(/\\([a-zA-Z]+)/g, '$1');

  return result;
}
