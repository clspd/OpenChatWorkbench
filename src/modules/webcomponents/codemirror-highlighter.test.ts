import { createCodeMirrorHighlighter, isSupportedLanguage, getSupportedLanguages } from './codemirror-highlighter';

// Test function to verify CodeMirror integration
export function testCodeMirrorHighlighter() {
  console.log('=== CodeMirror Highlighter Test ===\n');

  // Test 1: Check supported languages
  const supportedLangs = getSupportedLanguages();
  console.log('Supported languages:', supportedLangs);
  console.log('Total supported languages:', supportedLangs.length);

  // Test 2: Test specific language support
  const testLanguages = ['javascript', 'python', 'unknown', 'js', 'py'];
  console.log('\nTesting language support:');
  testLanguages.forEach(lang => {
    console.log(`  ${lang}: ${isSupportedLanguage(lang) ? '✓' : '✗'}`);
  });

  // Test 3: Create a test container and test CodeMirror instance
  console.log('\nTesting CodeMirror instance creation:');
  const container = document.createElement('div');
  const testCode = 'const hello = "world";\nconsole.log(hello);';

  const view = createCodeMirrorHighlighter(testCode, 'javascript', container);
  if (view) {
    console.log('  ✓ Successfully created CodeMirror editor for JavaScript');
    console.log('  Container has children:', container.children.length > 0);
    console.log('  DOM structure valid:', container.querySelector('.cm-editor') !== null);
    view.destroy();
    console.log('  ✓ Successfully destroyed editor');
  } else {
    console.error('  ✗ Failed to create CodeMirror editor');
  }

  // Test 4: Test with unsupported language
  const testContainer2 = document.createElement('div');
  const view2 = createCodeMirrorHighlighter('some code', 'unsupported-lang', testContainer2);
  if (!view2) {
    console.log('  ✓ Correctly returns null for unsupported language');
  } else {
    console.error('  ✗ Should return null for unsupported language');
  }

  console.log('\n=== Test Complete ===');
}

// Run test if this module is imported
if (typeof window !== 'undefined') {
  (window as any).__testCodeMirrorHighlighter = testCodeMirrorHighlighter;
}
