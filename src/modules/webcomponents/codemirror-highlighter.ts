import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';

// Define a minimal light theme compatible with the app's design
const lightTheme = EditorView.theme({
  '.cm-content': {
    color: '#333',
    caretColor: '#333',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: '#999',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftColor: '#333',
  },
});

/**
 * Map of language IDs to CodeMirror language support functions
 */
const languageMap: Record<string, () => any> = {
  // JavaScript family
  'js': () => javascript(),
  'javascript': () => javascript(),
  'jsx': () => javascript({ jsx: true }),
  'ts': () => javascript({ typescript: true }),
  'typescript': () => javascript({ typescript: true }),
  'tsx': () => javascript({ typescript: true, jsx: true }),
  
  // Python
  'py': () => python(),
  'python': () => python(),
  
  // Web languages
  'html': () => html(),
  'htm': () => html(),
  'css': () => css(),
  'json': () => json(),
  
  // Markup
  'xml': () => xml(),
  'svg': () => xml(),
  'md': () => markdown(),
  'markdown': () => markdown(),
  
  // Systems languages
  'c': () => cpp(),
  'cpp': () => cpp(),
  'cc': () => cpp(),
  'cxx': () => cpp(),
  'java': () => java(),
  'sql': () => sql(),
  'php': () => php(),
  'rust': () => rust(),
  'rs': () => rust(),
  'go': () => go(),
};

/**
 * Creates a CodeMirror editor instance for syntax highlighting
 * @param code The code content to highlight
 * @param language The language identifier (e.g., 'javascript', 'python')
 * @param container The DOM container element to mount the editor
 * @returns The created EditorView instance, or null if language is not supported
 */
export function createCodeMirrorHighlighter(
  code: string,
  language: string,
  container: HTMLElement
): EditorView | null {
  try {
    const normalizedLang = language.toLowerCase().trim();
    const languageSupport = languageMap[normalizedLang]?.();

    if (!languageSupport) {
      // Return null for unsupported languages, they will use default rendering
      return null;
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        languageSupport,
        lightTheme,
        EditorState.readOnly.of(true),
        lineNumbers(),
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });

    return view;
  } catch (error) {
    console.error(`Failed to create CodeMirror highlighter for language "${language}":`, error);
    return null;
  }
}

/**
 * Checks if a language is supported by CodeMirror
 * @param language The language identifier
 * @returns true if the language is supported, false otherwise
 */
export function isSupportedLanguage(language: string): boolean {
  return language.toLowerCase().trim() in languageMap;
}

/**
 * Get the list of all supported languages
 * @returns Array of supported language identifiers
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageMap);
}

/**
 * Cleanup function to destroy the CodeMirror editor
 * @param view The EditorView instance to destroy
 */
export function destroyCodeMirrorHighlighter(view: EditorView | null): void {
  if (view) {
    try {
      view.destroy();
    } catch (error) {
      console.error('Failed to destroy CodeMirror highlighter:', error);
    }
  }
}
