import type { Monaco } from '@monaco-editor/react';
import type { languages, Uri, editor } from 'monaco-editor';
import { LANGUAGE_ID } from './tokenizer';

/**
 * Check if the given offset is inside an interpolation block ${...}
 */
function isInsideInterpolation(source: string, offset: number): boolean {
  let depth = 0;

  for (let i = 0; i < offset && i < source.length; i++) {
    const char = source[i];

    if (char === '$' && source[i + 1] === '{') {
      depth++;
      i++; // Skip the {
    } else if (char === '{' && depth > 0) {
      depth++;
    } else if (char === '}' && depth > 0) {
      depth--;
    }
  }

  return depth > 0;
}

/**
 * Map TypeScript ScriptElementKind to Monaco CompletionItemKind
 */
function tsKindToMonacoKind(monaco: Monaco, kind: string): languages.CompletionItemKind {
  const map: Record<string, languages.CompletionItemKind> = {
    'primitive type': monaco.languages.CompletionItemKind.Keyword,
    'keyword': monaco.languages.CompletionItemKind.Keyword,
    'class': monaco.languages.CompletionItemKind.Class,
    'interface': monaco.languages.CompletionItemKind.Interface,
    'module': monaco.languages.CompletionItemKind.Module,
    'enum': monaco.languages.CompletionItemKind.Enum,
    'enum member': monaco.languages.CompletionItemKind.EnumMember,
    'function': monaco.languages.CompletionItemKind.Function,
    'method': monaco.languages.CompletionItemKind.Method,
    'property': monaco.languages.CompletionItemKind.Property,
    'getter': monaco.languages.CompletionItemKind.Property,
    'setter': monaco.languages.CompletionItemKind.Property,
    'constructor': monaco.languages.CompletionItemKind.Constructor,
    'variable': monaco.languages.CompletionItemKind.Variable,
    'let': monaco.languages.CompletionItemKind.Variable,
    'const': monaco.languages.CompletionItemKind.Constant,
    'local variable': monaco.languages.CompletionItemKind.Variable,
    'parameter': monaco.languages.CompletionItemKind.Variable,
    'type parameter': monaco.languages.CompletionItemKind.TypeParameter,
    'alias': monaco.languages.CompletionItemKind.Variable,
    'string': monaco.languages.CompletionItemKind.Value,
  };
  return map[kind] || monaco.languages.CompletionItemKind.Property;
}

export interface TsInlineProvidersOptions {
  /**
   * Extra type definitions to make available for completions.
   * These are passed to monaco.languages.typescript.javascriptDefaults.setExtraLibs()
   */
  extraLibs?: Array<{ content: string; filePath?: string }>;
}

/**
 * Set up completion and hover providers for the tsInline language.
 * Must be called after the language is registered.
 *
 * @param monaco - The monaco instance from useMonaco()
 * @param options - Configuration options
 * @returns Cleanup function to dispose providers
 */
export function setupTsInlineProviders(
  monaco: Monaco,
  options: TsInlineProvidersOptions = {}
): () => void {
  // Set up extra libs for JavaScript completions
  if (options.extraLibs) {
    monaco.languages.typescript.javascriptDefaults.setExtraLibs(options.extraLibs);
  }

  // Create a shadow JavaScript model for the JS worker
  const shadowUri = monaco.Uri.parse('file:///shadow.js');
  const shadowModel = monaco.editor.createModel('', 'javascript', shadowUri);

  // Completion provider
  const completionDisposable = monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ['.', '"', "'", '`', '/', '<', '@', '#'],

    async provideCompletionItems(model, position) {
      const offset = model.getOffsetAt(position);
      const source = model.getValue();

      if (!isInsideInterpolation(source, offset)) {
        return null;
      }

      try {
        // Sync content so worker sees the context
        shadowModel.setValue(source);

        const getWorker = await monaco.languages.typescript.getJavaScriptWorker();
        const worker = await getWorker(shadowUri);
        const info = await worker.getCompletionsAtPosition(shadowUri.toString(), offset);

        if (!info || !info.entries) return null;

        const wordInfo = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn
        };

        const suggestions: languages.CompletionItem[] = info.entries.map(entry => ({
          label: entry.name,
          kind: tsKindToMonacoKind(monaco, entry.kind),
          sortText: entry.sortText,
          insertText: entry.insertText || entry.name,
          range: range,
          data: {
            uri: shadowUri.toString(),
            offset: offset,
            name: entry.name,
            source: entry.source
          }
        } as languages.CompletionItem));

        return { suggestions };
      } catch (e) {
        console.error('tsInline completion error:', e);
        return null;
      }
    },

    async resolveCompletionItem(item) {
      const data = (item as any).data;
      if (!data) return item;

      try {
        const getWorker = await monaco.languages.typescript.getJavaScriptWorker();
        const worker = await getWorker(shadowUri);
        const details = await worker.getCompletionEntryDetails(
          data.uri,
          data.offset,
          data.name,
          undefined,
          data.source,
          undefined,
          undefined
        );

        if (details) {
          const documentation: string[] = [];

          if (details.displayParts && details.displayParts.length) {
            const signature = details.displayParts.map(p => p.text).join('');
            documentation.push('```typescript\n' + signature + '\n```');
          }

          if (details.documentation && details.documentation.length) {
            const docText = details.documentation.map(p => p.text).join('');
            documentation.push(docText);
          }

          if (details.tags && details.tags.length) {
            for (const tag of details.tags) {
              const tagText = tag.text ? tag.text.map(p => p.text).join('') : '';
              documentation.push(`*@${tag.name}* ${tagText}`);
            }
          }

          if (documentation.length) {
            item.documentation = {
              value: documentation.join('\n\n'),
              isTrusted: true
            } as languages.IMarkdownString;
          }

          if (details.displayParts && details.displayParts.length) {
            item.detail = details.displayParts.map(p => p.text).join('');
          }
        }
      } catch (e) {
        console.error('tsInline resolveCompletionItem error:', e);
      }

      return item;
    }
  });

  // Hover provider
  const hoverDisposable = monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    async provideHover(model, position) {
      const offset = model.getOffsetAt(position);
      const source = model.getValue();

      if (!isInsideInterpolation(source, offset)) {
        return null;
      }

      try {
        // Sync content so worker sees the context
        shadowModel.setValue(source);

        const getWorker = await monaco.languages.typescript.getJavaScriptWorker();
        const worker = await getWorker(shadowUri);
        const info = await worker.getQuickInfoAtPosition(shadowUri.toString(), offset);

        if (!info) return null;

        const contents: languages.IMarkdownString[] = [];
        if (info.displayParts) {
          const displayText = info.displayParts.map(p => p.text).join('');
          contents.push({ value: '```typescript\n' + displayText + '\n```' });
        }
        if (info.documentation && info.documentation.length > 0) {
          const docText = info.documentation.map(p => p.text).join('');
          contents.push({ value: docText });
        }

        if (contents.length === 0) return null;

        const wordInfo = model.getWordAtPosition(position);
        const range = wordInfo ? {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn
        } : undefined;

        return { contents, range };
      } catch (e) {
        console.error('tsInline hover error:', e);
        return null;
      }
    }
  });

  // Return cleanup function
  return () => {
    completionDisposable.dispose();
    hoverDisposable.dispose();
    shadowModel.dispose();
  };
}
