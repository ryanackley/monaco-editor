import type { languages } from 'monaco-editor';

export const LANGUAGE_ID = 'tsInline';

/**
 * Language configuration for bracket matching, auto-closing, etc.
 */
export const languageConfiguration: languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['${', '}']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
    { open: '${', close: '}' }
  ]
};

/**
 * Monarch tokenizer for template strings with JavaScript interpolation.
 * - Plain text outside ${} (unhighlighted)
 * - Full JavaScript syntax highlighting inside ${}
 * - Proper bracket counting for nested braces
 */
export const monarchTokensProvider: languages.IMonarchLanguage = {
  defaultToken: '', // Everything unhighlighted by default

  keywords: [
    'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case',
    'catch', 'class', 'const', 'constructor', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
    'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import',
    'in', 'instanceof', 'interface', 'let', 'new', 'null', 'number', 'of',
    'package', 'private', 'protected', 'public', 'return', 'set', 'static',
    'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
    'undefined', 'var', 'void', 'while', 'with', 'yield'
  ],

  operators: [
    '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**', '*', '/',
    '%', '++', '--', '<<', '>>', '>>>', '&', '|', '^', '!', '~', '&&', '||',
    '??', '?', ':', '=', '+=', '-=', '*=', '**=', '/=', '%=', '<<=', '>>=',
    '>>>=', '&=', '|=', '^=', '?.'
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"'`]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  tokenizer: {
    // Root state - plain text, looking for ${
    root: [
      [/\$\{/, { token: 'delimiter.bracket.interpolation', next: '@interpolation' }],
      [/./, ''] // Everything else is plain text (unhighlighted)
    ],

    // Inside ${...} - JavaScript with bracket counting
    interpolation: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket.interpolation', '@pop'],
      { include: '@jsCommon' }
    ],

    // Nested brace counting
    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: '@jsCommon' }
    ],

    // JavaScript tokenization rules
    jsCommon: [
      [/\s+/, ''],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@jsComment'],
      [
        /[a-zA-Z_$][\w$]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }
      ],
      // Numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)n?/, 'number.hex'],
      [/0[oO]?(@octaldigits)n?/, 'number.octal'],
      [/0[bB](@binarydigits)n?/, 'number.binary'],
      [/(@digits)n?/, 'number'],
      // Strings
      [/"/, 'string', '@jsStringDouble'],
      [/'/, 'string', '@jsStringSingle'],
      [/`/, 'string', '@jsStringBacktick'],
      // Brackets and operators
      [/[()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }
      ],
      [/[;,.]/, 'delimiter']
    ],

    jsComment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ],

    jsStringDouble: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ],

    jsStringSingle: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ],

    jsStringBacktick: [
      [/\$\{/, { token: 'delimiter.bracket', next: '@nestedInterpolation' }],
      [/[^\\`$]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/`/, 'string', '@pop']
    ],

    nestedInterpolation: [
      [/\{/, 'delimiter.bracket', '@nestedInterpolation'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: '@jsCommon' }
    ]
  }
};
