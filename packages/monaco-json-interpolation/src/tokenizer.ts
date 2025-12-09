/*---------------------------------------------------------------------------------------------
 *  JSON with Interpolation - Monarch Tokenizer
 *  Supports ${...} interpolation with embedded JavaScript highlighting
 *--------------------------------------------------------------------------------------------*/

import type * as monaco from 'monaco-editor';

export const conf: monaco.languages.LanguageConfiguration = {
	wordPattern: /(-?\d*\.\d\w*)|([^\[\{\]\}\:\"\,\s]+)/g,

	comments: {
		lineComment: '//',
		blockComment: ['/*', '*/']
	},

	brackets: [
		['{', '}'],
		['[', ']'],
		['${', '}']
	],

	autoClosingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '"', close: '"', notIn: ['string'] },
		{ open: '${', close: '}' }
	],

	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '"', close: '"' }
	],

	folding: {
		markers: {
			start: /^\s*\/\/\s*#?region\b/,
			end: /^\s*\/\/\s*#?endregion\b/
		}
	}
};

export const language: monaco.languages.IMonarchLanguage = {
	defaultToken: '',
	tokenPostfix: '.json-interpolation',

	escapes: /\\(?:["\\/bfnrt]|u[0-9A-Fa-f]{4})/,

	tokenizer: {
		root: [
			{ include: '@whitespace' },
			[/[{]/, 'delimiter.bracket', '@objectKey'],
			[/\[/, 'delimiter.bracket', '@array']
		],

		whitespace: [
			[/[ \t\r\n]+/, ''],
			[/\/\/.*$/, 'comment'],
			[/\/\*/, 'comment', '@comment']
		],

		comment: [
			[/[^/*]+/, 'comment'],
			[/\*\//, 'comment', '@pop'],
			[/[/*]/, 'comment']
		],

		// After { or , in object - expecting a key or closing }
		objectKey: [
			{ include: '@whitespace' },
			[/"/, 'string.key', '@stringKey'],
			[/\}/, 'delimiter.bracket', '@pop']
		],

		// Inside a key string
		stringKey: [
			[/[^"\\]+/, 'string.key'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/"/, 'string.key', '@objectColon']
		],

		// After key - expecting colon
		objectColon: [
			{ include: '@whitespace' },
			[/:/, 'delimiter', '@objectValue']
		],

		// After colon - expecting a value
		objectValue: [
			{ include: '@whitespace' },
			// Standalone interpolation as value
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationValue',
					nextEmbedded: 'javascript'
				}
			],
			// String value
			[/"/, 'string.value', '@stringValue'],
			// Number
			[/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number', '@objectNext'],
			// Keywords
			[/true|false/, 'keyword', '@objectNext'],
			[/null/, 'keyword', '@objectNext'],
			// Nested object
			[/\{/, 'delimiter.bracket', '@objectKey'],
			// Nested array
			[/\[/, 'delimiter.bracket', '@arrayValue'],
			// Handle comma/close after nested structures pop back here
			[/,/, 'delimiter', '@objectKey'],
			[/\}/, 'delimiter.bracket', '@pop']
		],

		// String value (can contain interpolation)
		stringValue: [
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationInString',
					nextEmbedded: 'javascript'
				}
			],
			[/[^"\\$]+/, 'string.value'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/\$(?!\{)/, 'string.value'],
			[/"/, 'string.value', '@objectNext']
		],

		// After a value in object - expecting comma or closing }
		objectNext: [
			{ include: '@whitespace' },
			[/,/, 'delimiter', '@objectKey'],
			[/\}/, 'delimiter.bracket', '@pop']
		],

		// Array - can contain values
		array: [
			{ include: '@whitespace' },
			[/\]/, 'delimiter.bracket', '@pop'],
			// Standalone interpolation
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationArray',
					nextEmbedded: 'javascript'
				}
			],
			// String
			[/"/, 'string.value', '@stringArray'],
			// Number
			[/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
			// Keywords
			[/true|false/, 'keyword'],
			[/null/, 'keyword'],
			// Nested object
			[/\{/, 'delimiter.bracket', '@objectKey'],
			// Nested array
			[/\[/, 'delimiter.bracket', '@array'],
			// Comma between elements
			[/,/, 'delimiter']
		],

		// Array when entered from objectValue - pops to objectNext
		arrayValue: [
			{ include: '@whitespace' },
			[/\]/, 'delimiter.bracket', '@objectNext'],
			// Standalone interpolation
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationArrayValue',
					nextEmbedded: 'javascript'
				}
			],
			// String
			[/"/, 'string.value', '@stringArrayValue'],
			// Number
			[/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
			// Keywords
			[/true|false/, 'keyword'],
			[/null/, 'keyword'],
			// Nested object
			[/\{/, 'delimiter.bracket', '@objectKey'],
			// Nested array
			[/\[/, 'delimiter.bracket', '@arrayValue'],
			// Comma
			[/,/, 'delimiter']
		],

		// String in array
		stringArray: [
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationInStringArray',
					nextEmbedded: 'javascript'
				}
			],
			[/[^"\\$]+/, 'string.value'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/\$(?!\{)/, 'string.value'],
			[/"/, 'string.value', '@pop']
		],

		// String in arrayValue context
		stringArrayValue: [
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationInStringArrayValue',
					nextEmbedded: 'javascript'
				}
			],
			[/[^"\\$]+/, 'string.value'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/\$(?!\{)/, 'string.value'],
			[/"/, 'string.value', '@pop']
		],

		// Standalone interpolation as object value - goes to objectNext after
		interpolationValue: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@objectNext',
					nextEmbedded: '@pop'
				}
			]
		],

		// Interpolation inside string in object value
		interpolationInString: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@stringValue',
					nextEmbedded: '@pop'
				}
			]
		],

		// Standalone interpolation in array
		interpolationArray: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@pop',
					nextEmbedded: '@pop'
				}
			]
		],

		// Standalone interpolation in arrayValue
		interpolationArrayValue: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@pop',
					nextEmbedded: '@pop'
				}
			]
		],

		// Interpolation inside string in array
		interpolationInStringArray: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@stringArray',
					nextEmbedded: '@pop'
				}
			]
		],

		// Interpolation inside string in arrayValue
		interpolationInStringArrayValue: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@stringArrayValue',
					nextEmbedded: '@pop'
				}
			]
		]
	}
};
