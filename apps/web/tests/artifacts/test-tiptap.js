import { chromium } from 'playwright';

async function testTipTapEditor() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the local development server
    await page.goto('http://localhost:5173/');
    console.log('✅ Successfully loaded the homepage');

    // Wait for the app to load
    await page.waitForTimeout(2000);

    // Try to navigate to a post creation page
    // Look for login or board links
    const loginButton = await page.$('text=로그인');
    if (loginButton) {
      console.log('📝 Found login button - need to authenticate first');
      await loginButton.click();
      await page.waitForTimeout(1000);
    }

    // Check if we can find any editor-related elements
    const editorElements = await page.$$('[class*="ProseMirror"], [data-testid*="editor"], .tiptap-editor, .ql-editor');
    
    if (editorElements.length > 0) {
      console.log(`✅ Found ${editorElements.length} editor element(s)`);
      
      for (let i = 0; i < editorElements.length; i++) {
        const element = editorElements[i];
        const className = await element.getAttribute('class');
        const tagName = await element.evaluate(el => el.tagName);
        console.log(`   Editor ${i + 1}: ${tagName} with class="${className}"`);
      }
    } else {
      console.log('❌ No editor elements found');
    }

    // Check for TipTap specific elements
    const proseMirrorElements = await page.$$('.ProseMirror');
    if (proseMirrorElements.length > 0) {
      console.log(`🎯 Found ${proseMirrorElements.length} ProseMirror element(s) - TipTap is active!`);
    }

    // Check for Quill editor elements
    const quillElements = await page.$$('.ql-editor');
    if (quillElements.length > 0) {
      console.log(`📝 Found ${quillElements.length} Quill element(s) - Quill editor is active`);
    }

    // Check for our sticky toolbar
    const stickyToolbar = await page.$('[class*="fixed"][class*="bottom-0"]');
    if (stickyToolbar) {
      console.log('🛠️ Found sticky toolbar!');
    }

    // Take a screenshot
    await page.screenshot({ path: 'editor-test.png', fullPage: true });
    console.log('📸 Screenshot saved as editor-test.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('🔍 Browser will remain open for manual inspection. Close it when done.');
    // await browser.close();
  }
}

testTipTapEditor();