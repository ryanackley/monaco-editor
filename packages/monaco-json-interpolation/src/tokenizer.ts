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
			{ include: '@value' }
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

		// Value can be: string, number, bool, null, object, array, or interpolation
		value: [
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolation',
					nextEmbedded: 'javascript'
				}
			],
			[/"/, 'string', '@string'],
			[/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
			[/true|false/, 'keyword'],
			[/null/, 'keyword'],
			[/[{]/, 'delimiter.bracket', '@object'],
			[/\[/, 'delimiter.bracket', '@array']
		],

		// Object: handles keys (strings), colons, commas, values
		object: [
			{ include: '@whitespace' },
			[/:/, 'delimiter'],
			[/,/, 'delimiter'],
			{ include: '@value' },
			[/\}/, 'delimiter.bracket', '@pop']
		],

		// Array: handles commas and values
		array: [
			{ include: '@whitespace' },
			[/,/, 'delimiter'],
			{ include: '@value' },
			[/\]/, 'delimiter.bracket', '@pop']
		],

		// String with interpolation support
		string: [
			[
				/\$\{/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@interpolationInString',
					nextEmbedded: 'javascript'
				}
			],
			[/[^"\\$]+/, 'string'],
			[/@escapes/, 'string.escape'],
			[/\\./, 'string.escape.invalid'],
			[/\$(?!\{)/, 'string'],
			[/"/, 'string', '@pop']
		],

		// Standalone interpolation (as a value)
		interpolation: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@pop',
					nextEmbedded: '@pop'
				}
			]
		],

		// Interpolation inside a string
		interpolationInString: [
			[
				/\}/,
				{
					token: 'delimiter.bracket.interpolation',
					next: '@pop',
					nextEmbedded: '@pop'
				}
			]
		]
	}
};
