import fs from "fs";
import path from "path";
import puppeteer, { Browser, Page, ElementHandle } from "puppeteer-core";
import chrome from "@sparticuz/chromium";
import type { CookieParam } from "puppeteer-core";

const TEXTBOX_SELECTORS = [
  '[data-testid="tweetTextarea_0"]',
  'div[role="textbox"]',
  'div[contenteditable="true"]',
  'div[aria-label*="What\'s happening"]',
  'div[aria-label*="Quoi de neuf"]',
];

const TWEET_BUTTON_SELECTORS = [
  '[data-testid="tweetButton"]',
  '[data-testid="tweetButtonInline"]',
  'button[data-testid="tweetButton"]',
];

async function getExecutablePath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const override = process.env.PUPPETEER_EXECUTABLE_PATH.trim();
    if (override && fs.existsSync(override)) {
      return override;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return await chrome.executablePath();
  }

  const localPaths = process.platform === 'win32' 
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
      ];
  return localPaths.find((path) => fs.existsSync(path));
}

async function getBrowserInstance(): Promise<Browser | null> {
  const isProd = process.env.NODE_ENV === "production";
  const executablePath = await getExecutablePath();
  if (!executablePath) {
    console.error("Chrome not found.");
    return null;
  }

  const args = isProd
    ? [
        ...chrome.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-features=VizDisplayCompositor",
        "--disable-ipc-flooding-protection",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-plugins-discovery",
        "--disable-web-security",
        "--disable-accelerated-2d-canvas",
        "--memory-pressure-off",
      ]
    : [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
      ];

  return puppeteer.launch({
    args,
    executablePath,
    headless: true,
    defaultViewport: isProd
      ? { width: 1920, height: 1080 }
      : { width: 1366, height: 900 },
    timeout: 60000,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
}

async function closeBrowserInstance(browser: Browser | null) {
  if (browser) {
    try {
      const pages = await browser.pages();
      await Promise.all(
        pages.map((page) =>
          page.close().catch((e) => console.warn("Error closing page:", e))
        )
      );
      await browser.close();
      console.log("🧼 Browser closed.");
    } catch (e) {
      console.warn("⚠️ Error closing browser:", e);
    }
  }
}

function waitForTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(input: string): string {
  return (input || "").replace(/\s+/g, " ").trim();
}

async function getEditorText(page: Page): Promise<string> {
  return page.evaluate(() => {
    for (const sel of ['[data-testid="tweetTextarea_0"]', 'div[role="textbox"]', 'div[contenteditable="true"]']) {
      const el = document.querySelector(sel) as HTMLElement | HTMLTextAreaElement | null;
      if (el) {
        const text = (el as any).innerText ?? (el as any).value ?? "";
        if (text) return text;
      }
    }
    return "";
  });
}

async function diagnosticPage(page: Page): Promise<void> {
  console.log("🔍 Page diagnostics...");

  const url = page.url();
  console.log("📍 Current URL:", url);

  if (url.includes("login") || url.includes("auth")) {
    console.error("❌ Redirected to login page - expired cookies?");
    throw new Error("Session expired - invalid cookies");
  }

  console.log("🔍 Searching for available selectors...");
  for (const selector of TEXTBOX_SELECTORS) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ Selector found: ${selector}`);
        return;
      } else {
        console.log(`❌ Selector not found: ${selector}`);
      }
    } catch (e) {
      if (e instanceof Error) {
        console.log(`❌ Error with selector ${selector}:`, e.message);
      } else {
        console.log(`❌ Error with selector ${selector}:`, e);
      }
    }
  }

  const elements = await page.evaluate(() => {
    const textboxes = Array.from(document.querySelectorAll('[role="textbox"]'));
    const contentEditables = Array.from(
      document.querySelectorAll('[contenteditable="true"]')
    );
    const testids = Array.from(
      document.querySelectorAll('[data-testid*="tweet"]')
    );

    return {
      textboxes: textboxes.map((el) => ({
        tagName: (el as HTMLElement).tagName,
        role: (el as HTMLElement).getAttribute("role"),
        testid: (el as HTMLElement).getAttribute("data-testid"),
        ariaLabel: (el as HTMLElement).getAttribute("aria-label"),
      })),
      contentEditables: contentEditables.map((el) => ({
        tagName: (el as HTMLElement).tagName,
        testid: (el as HTMLElement).getAttribute("data-testid"),
        ariaLabel: (el as HTMLElement).getAttribute("aria-label"),
      })),
      testids: testids.map((el) => ({
        tagName: (el as HTMLElement).tagName,
        testid: (el as HTMLElement).getAttribute("data-testid"),
      })),
    };
  });

  console.log("🔍 Detected elements:", JSON.stringify(elements, null, 2));
}

async function findTextbox(page: Page): Promise<ElementHandle | null> {
  for (const selector of TEXTBOX_SELECTORS) {
    try {
      console.log(`🔍 Testing selector: ${selector}`);
      await page.waitForSelector(selector, { timeout: 5000 });
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ Textbox found with: ${selector}`);
        return element;
      }
    } catch (e) {
      if (e instanceof Error) {
        console.log(`❌ Selector ${selector} failed:`, e.message);
      } else {
        console.log(`❌ Selector ${selector} failed:`, String(e));
      }
      continue;
    }
  }
  return null;
}

async function waitForEditorReady(
  page: Page,
  editor: ElementHandle
): Promise<boolean> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await editor.focus();
      await editor.click();
      await waitForTimeout(200);

      await page.keyboard.type("_", { delay: 120 });
      await waitForTimeout(120);

      const testText = await getEditorText(page);

      if (testText.includes("_")) {
        await page.keyboard.press("Home");
        await page.keyboard.press("Delete");
        await waitForTimeout(100);
        return true;
      }

      console.warn(`Attempt ${attempt} to focus failed, retrying...`);
      await waitForTimeout(500);
    } catch (error) {
      console.warn(`Error during focus attempt ${attempt}:`, error);
      await waitForTimeout(500);
    }
  }
  return false;
}

interface TweetOptions {
  content: string;
  imagePaths?: string[];
}

export default class TwitterClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private debug: boolean;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor({
    debug = false,
    maxRetries = 3,
  }: { debug?: boolean; maxRetries?: number } = {}) {
    this.debug = debug;
    this.maxRetries = Math.max(1, Math.min(maxRetries, 5));
  }

  async init(): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🚀 Initialization attempt ${attempt}/${this.maxRetries}`);

        if (this.browser) {
          await closeBrowserInstance(this.browser);
          this.browser = null;
          this.page = null;
        }

        this.browser = await getBrowserInstance();
        if (!this.browser) {
          throw new Error("Failed to launch browser.");
        }

        if (!this.browser.isConnected()) {
          throw new Error("Browser not connected after launch.");
        }

        this.page = await this.browser.newPage();

        if (!this.page || this.page.isClosed()) {
          throw new Error("Page closed after creation.");
        }

        await this.page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        );

        if (this.debug) console.log("Debug mode enabled.");

        const cookies = await this.loadCookies();
        if (cookies.length) {
          await this.page.setCookie(...cookies);
          console.log("Cookies loaded.");
        }

        const twitterUrls = [
          "https://x.com/compose/tweet",
          "https://twitter.com/compose/tweet",
          "https://x.com/home",
          "https://twitter.com/home",
        ];

        let navigationSuccess = false;
        for (const url of twitterUrls) {
          try {
            console.log(`Navigating to: ${url}`);
            await this.page.goto(url, {
              waitUntil: "networkidle2",
              timeout: 45000,
            });

            await waitForTimeout(3000);

            if (
              this.page.url().includes("login") ||
              this.page.url().includes("auth")
            ) {
              console.log("Redirected to login, trying next URL...");
              continue;
            }

            navigationSuccess = true;
            console.log(`Navigation successful to: ${this.page.url()}`);
            break;
          } catch (navError) {
            console.warn(
              `Navigation failed to ${url}:`,
              navError instanceof Error ? navError.message : String(navError)
            );
            continue;
          }
        }

        if (!navigationSuccess) {
          throw new Error("Failed to navigate to all Twitter URLs.");
        }

        if (this.debug) {
          await diagnosticPage(this.page);
        }

        console.log("Initialization successful!");
        console.log("Page ready to tweet.");
        return;
      } catch (e) {
        lastError = e as Error;
        console.error(`❌ Attempt ${attempt} failed:`, e);

        try {
          await this.handleError();
        } catch (handleErrorError) {
          console.warn("Error during error handling:", handleErrorError);
        }

        await this.cleanup();

        if (attempt < this.maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Waiting ${backoffDelay}ms before retrying...`);
          await waitForTimeout(backoffDelay);
        }
      }
    }

    throw new Error(
      `Initialization failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page
          .close()
          .catch((e) => console.warn("Error closing page:", e));
      }
      if (this.browser && this.browser.isConnected()) {
        await closeBrowserInstance(this.browser);
      }
    } catch (e) {
      console.warn("⚠️ Error during cleanup:", e);
    }
    this.page = null;
    this.browser = null;
  }

  private async loadCookies(): Promise<CookieParam[]> {
    if (!process.env.COOKIES_BASE64) {
      if (process.env.NODE_ENV !== "production") {
        const localPath = path.resolve(process.cwd(), "cookies.json");
        if (fs.existsSync(localPath)) {
          try {
            const content = fs.readFileSync(localPath, "utf-8");
            const parsed = JSON.parse(content);
            return parsed as CookieParam[];
          } catch (e) {
            throw new Error("Error reading cookies.json: " + e);
          }
        }
      }
      throw new Error(
        "Missing COOKIES_BASE64 environment variable! Generate it from your cookies.json in base64 or place a cookies.json in development."
      );
    }

    try {
      return JSON.parse(
        Buffer.from(process.env.COOKIES_BASE64, "base64").toString("utf-8")
      );
    } catch (e) {
      throw new Error("Error decoding COOKIES_BASE64: " + e);
    }
  }

  async tweetWithImages({ content, imagePaths }: TweetOptions): Promise<void> {
    if (!content?.trim()) {
      throw new Error("Content is required and cannot be empty");
    }

    if (!this.page) throw new Error("Page not initialized");
    if (!this.browser || !this.browser.isConnected()) {
      throw new Error("Browser not connected");
    }

    try {
      if (this.page.isClosed()) {
        throw new Error("❌ Page closed before tweeting");
      }

      if (this.debug) {
        await diagnosticPage(this.page);
        
        try {
          const tmpDir = process.env.NODE_ENV === "production" ? "/tmp" : "./tmp";
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          
          const domContent = await this.page.content();
          const domPath = path.join(tmpDir, `compose_dom_${Date.now()}.html`);
          fs.writeFileSync(domPath, domContent);
          console.log("Compose page DOM captured:", domPath);
        } catch (e) {
          console.warn("Error capturing compose DOM:", e);
        }
      }

      console.log("Searching for the text area...");
      const editor = await findTextbox(this.page);

      if (!editor) {
        console.log("Textbox not found, navigating to /compose/tweet...");
        await this.page.goto("https://x.com/compose/tweet", {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await waitForTimeout(3000);

        const retryEditor = await findTextbox(this.page);
        if (!retryEditor) {
          throw new Error("❌ Unable to find the text area after retry");
        }
        console.log("Text area found after retry");
      } else {
        console.log("Text area found immediately");
      }

      const finalEditor = editor || (await findTextbox(this.page));
      if (!finalEditor) {
        throw new Error("Unable to find the text area");
      }

      const focusSuccess = await waitForEditorReady(this.page, finalEditor);
      if (!focusSuccess) {
        console.error("Focusing the text area failed after 5 attempts.");

        try {
          await this.page.focus(TEXTBOX_SELECTORS[0]);
        } catch (e) {
          console.warn("Fallback focus failed:", e);
        }
        throw new Error("Failed to focus the text area.");
      }

      console.log("Text area focused : OK");

      await this.typeContentWithRetry(content);

      if (imagePaths && imagePaths.length > 0) {
        console.log("Starting image upload process...");

        if (this.debug) {
          console.log("Analyzing current page upload elements...");
          const uploadElements = await this.page.evaluate(() => {
            const elements = {
              fileInputs: [] as Array<{
                index: number;
                testid: string | null;
                accept: string | null;
                multiple: boolean;
                visible: boolean;
                display: string;
                visibility: string;
                opacity: string;
              }>,
              mediaButtons: [] as Array<{
                selector: string;
                testid: string | null;
                ariaLabel: string | null;
                visible: boolean;
              }>,
              attachmentElements: [] as Array<{
                selector: string;
                count: number;
              }>,
            };
            
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach((input, i) => {
              const htmlInput = input as HTMLInputElement;
              elements.fileInputs.push({
                index: i,
                testid: htmlInput.getAttribute('data-testid'),
                accept: htmlInput.getAttribute('accept'),
                multiple: htmlInput.hasAttribute('multiple'),
                visible: htmlInput.offsetParent !== null,
                display: window.getComputedStyle(htmlInput).display,
                visibility: window.getComputedStyle(htmlInput).visibility,
                opacity: window.getComputedStyle(htmlInput).opacity
              });
            });
            
            const buttonSelectors = [
              '[data-testid="attachments"]',
              '[aria-label*="Media"]',
              '[aria-label*="Add photos"]',
              '[aria-label*="Add photo"]',
              'button[aria-label*="Add photos or videos"]',
              'div[role="button"][aria-label*="Add photos"]'
            ];
            
            buttonSelectors.forEach(selector => {
              const btn = document.querySelector(selector);
              if (btn) {
                const htmlBtn = btn as HTMLElement;
                elements.mediaButtons.push({
                  selector,
                  testid: htmlBtn.getAttribute('data-testid'),
                  ariaLabel: htmlBtn.getAttribute('aria-label'),
                  visible: htmlBtn.offsetParent !== null
                });
              }
            });
            
            const attachmentSelectors = [
              '[data-testid="attachments"]',
              '[data-testid="tweetPhoto"]',
              'img[src^="blob:"]'
            ];
            
            attachmentSelectors.forEach(selector => {
              const elements_found = document.querySelectorAll(selector);
              if (elements_found.length > 0) {
                elements.attachmentElements.push({
                  selector,
                  count: elements_found.length
                });
              }
            });
            
            return elements;
          });
        }
        
        const fileInputSelectors = [
          '[data-testid="fileInput"]',
          'input[type="file"][data-testid="fileInput"]',
          'input[accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"]',
          'input[accept*="image"]',
          'input[type="file"]',
          'input[multiple][accept*="image"]'
        ];
        
        let input: ElementHandle<HTMLInputElement> | null = null;
        
        for (const selector of fileInputSelectors) {
          try {
            console.log(`Trying file input selector: ${selector}`);
            await this.page.waitForSelector(selector, { timeout: 5000 });
            input = (await this.page.$(selector)) as ElementHandle<HTMLInputElement>;
            if (input) {
              console.log(`File input found with: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`File input selector failed: ${selector}`);
            continue;
          }
        }
        
        if (!input) {
          const mediaButtonSelectors = [
            'button[aria-label*="Ajoutez des photos ou une vidéo"]',
            'button[aria-label*="Add photos or videos"]',
            '[data-testid="attachments"]',
            '[aria-label*="Add photos"]',
            '[aria-label*="Add photo"]',
            '[aria-label*="Media"]',
            '[data-testid="toolBar"] [aria-label*="Media"]',
            'div[role="button"][aria-label*="Add photos"]',
            '[data-testid="tweetComposer"] [aria-label*="Media"]'
          ];
          
          for (const selector of mediaButtonSelectors) {
            try {
              console.log(`Trying to click media button: ${selector}`);
              const mediaButton = await this.page.$(selector);
              if (mediaButton) {
                await mediaButton.click();
                await waitForTimeout(1000);
                
                for (const fileSelector of fileInputSelectors) {
                  try {
                    await this.page.waitForSelector(fileSelector, { timeout: 3000 });
                    input = (await this.page.$(fileSelector)) as ElementHandle<HTMLInputElement>;
                    if (input) {
                      console.log(`File input found after clicking media button with: ${fileSelector}`);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                if (input) break;
              }
            } catch (e) {
              console.log(`Media button selector failed: ${selector}`);
              continue;
            }
          }
        }
        
        if (!input) throw new Error("File input not found after trying all methods");

        try {
          await this.page.evaluate((inputElement) => {
            if (inputElement) {
              inputElement.style.display = 'block';
              inputElement.style.visibility = 'visible';
              inputElement.style.opacity = '1';
              inputElement.style.position = 'static';
              inputElement.style.width = 'auto';
              inputElement.style.height = 'auto';
            }
          }, input);
          console.log("File input made visible");
        } catch (e) {
          console.warn("Could not modify file input visibility:", e);
        }

        console.log("Using drag & drop approach for image upload");
        
        const composeArea = await this.page.$('[data-testid="tweetTextarea_0"]');
        if (!composeArea) {
          throw new Error("Could not find compose text area for drag & drop");
        }
        
        for (const p of imagePaths) {
          try {
            if (!fs.existsSync(p)) {
              throw new Error(`File not found: ${p}`);
            }
            
            const fileStats = fs.statSync(p);
            console.log(`Drag & drop upload: ${path.basename(p)} (${fileStats.size} bytes)`);
            
            const fileBuffer = fs.readFileSync(p);
            const fileName = path.basename(p);
            const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 
                            fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                            fileName.toLowerCase().endsWith('.gif') ? 'image/gif' :
                            fileName.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';

            const dropResult = await this.page.evaluate(async (composeElement, buffer, name, type) => {
              try {
                const uint8Array = new Uint8Array(buffer);
                const file = new File([uint8Array], name, { type });
                
                console.log('Drag & drop: Created file', file.name, file.size, file.type);
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                const dragEnter = new DragEvent('dragenter', {
                  bubbles: true,
                  dataTransfer: dataTransfer
                });
                composeElement.dispatchEvent(dragEnter);
                
                const dragOver = new DragEvent('dragover', {
                  bubbles: true,
                  dataTransfer: dataTransfer
                });
                composeElement.dispatchEvent(dragOver);
                
                const dropEvent = new DragEvent('drop', {
                  bubbles: true,
                  dataTransfer: dataTransfer
                });
                composeElement.dispatchEvent(dropEvent);
                
                console.log('Drag & drop: Events dispatched');
                
                const clipboardData = new DataTransfer();
                clipboardData.items.add(file);
                
                const pasteEvent = new ClipboardEvent('paste', {
                  bubbles: true,
                  clipboardData: clipboardData
                });
                composeElement.dispatchEvent(pasteEvent);
                
                console.log('Drag & drop: Paste event also dispatched');
                
                return { success: true, fileName: name };
              } catch (err) {
                console.error('Drag & drop error:', err);
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: message };
              }
            }, composeArea, Array.from(fileBuffer), fileName, mimeType);
            
            console.log(`Drag & drop result:`, dropResult);
            
            if (!dropResult.success) {
              throw new Error(`Drag & drop failed: ${dropResult.error}`);
            }
            
            console.log(`Waiting 3 seconds for drag & drop processing...`);
            await waitForTimeout(3000);
            
          } catch (e) {
            console.error(`Drag & drop upload failed for ${p}:`, e);
            console.warn(`Continuing without image: ${path.basename(p)}`);
          }
        }

        await this.waitForImageUpload();
        console.log("Images uploaded and loaded.");
        
        console.log("Waiting for image processing to complete...");
        await waitForTimeout(3000);
      } else {
        console.log("No image files to upload.");
      }

      let tweetButton: ElementHandle | null = null;
      for (const selector of TWEET_BUTTON_SELECTORS) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          const btn = await this.page.$(selector);
          if (btn) {
            tweetButton = btn;
            console.log(`Tweet button found with: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }

      if (!tweetButton) {
        throw new Error("❌ Tweet button not found");
      }

      console.log("Waiting for tweet button to be enabled AND images to be processed...");
      try {
        await this.page.waitForFunction(
          (selectors: string[], hasImages?: boolean) => {
            let buttonReady = false;
            for (const s of selectors) {
              const el = document.querySelector(s) as HTMLButtonElement | null;
              if (el) {
                const aria = el.getAttribute("aria-disabled");
                const disabled = (el as any).disabled;
                if (aria !== "true" && !disabled) {
                  buttonReady = true;
                  break;
                }
              }
            }
            
            if (!buttonReady) {
              return false;
            }
            
            if (!hasImages) {
              console.log("✅ Tweet button enabled (no images)");
              return true;
            }
            
            const imageElements = [
              'div[data-testid="tweetPhoto"] img',
              'img[src^="blob:"]',
              '[data-testid="attachments"] img'
            ];
            
            let imagesProcessed = false;
            for (const imgSelector of imageElements) {
              const imgs = document.querySelectorAll(imgSelector);
              if (imgs.length > 0) {
                const allLoaded = Array.from(imgs).every(img => {
                  const htmlImg = img as HTMLImageElement;
                  return htmlImg.complete && htmlImg.naturalWidth > 0 && htmlImg.naturalHeight > 0;
                });
                if (allLoaded) {
                  imagesProcessed = true;
                  break;
                }
              }
            }
            
            if (imagesProcessed) {
              console.log("✅ Tweet button enabled AND images fully processed");
              return true;
            }
            
            console.log("⏳ Button ready but images still processing...");
            return false;
          },
          { timeout: 25000 },
          TWEET_BUTTON_SELECTORS,
          !!(imagePaths && imagePaths.length > 0)
        );
        console.log("✅ Tweet button and images ready to post");
      } catch (buttonWaitError) {
        console.warn("⚠️ Enhanced wait check failed, checking individual states:", buttonWaitError);
        
        const diagnostics = await this.page.evaluate((selectors) => {
          const result: {
            buttonState: 'unknown' | 'enabled' | 'disabled';
            imageCount: number;
            imageStates: Array<{ complete: boolean; naturalWidth: number; naturalHeight: number; src: string }>;
          } = {
            buttonState: 'unknown',
            imageCount: 0,
            imageStates: []
          };
          
          for (const s of selectors) {
            const el = document.querySelector(s) as HTMLButtonElement | null;
            if (el) {
              const aria = el.getAttribute("aria-disabled");
              const disabled = (el as any).disabled;
              result.buttonState = aria === "true" || disabled ? 'disabled' : 'enabled';
              break;
            }
          }

          const imgs = document.querySelectorAll('div[data-testid="tweetPhoto"] img, img[src^="blob:"]');
          result.imageCount = imgs.length;
          result.imageStates = Array.from(imgs).map(img => {
            const htmlImg = img as HTMLImageElement;
            return {
              complete: htmlImg.complete,
              naturalWidth: htmlImg.naturalWidth,
              naturalHeight: htmlImg.naturalHeight,
              src: htmlImg.src.substring(0, 50) + '...'
            };
          });
          
          return result;
        }, TWEET_BUTTON_SELECTORS);
        
        console.log("🔍 Fallback diagnostics:", JSON.stringify(diagnostics, null, 2));
        console.warn("⚠️ Proceeding with tweet despite wait timeout...");
      }

      await tweetButton.click();

      let sent = false;
      try {
        await this.page.waitForFunction(
          () => {
            const selectors = [
              'div[role="textbox"]',
              '[data-testid="tweetTextarea_0"]',
              'div[contenteditable="true"]',
              'div[aria-label*="What’s happening"]',
              'div[aria-label*="What\'s happening"]',
              'div[aria-label*="Quoi de neuf"]',
              "textarea[aria-label]",
            ];
            const getText = () => {
              for (const sel of selectors) {
                const el = document.querySelector(sel) as
                  | HTMLElement
                  | HTMLTextAreaElement
                  | null;
                if (el) {
                  const text = (el as any).innerText ?? (el as any).value ?? "";
                  if (text) return text;
                }
              }
              return "";
            };
            return getText().trim().length === 0;
          },
          { timeout: 15000 }
        );
        sent = true;
      } catch (waitError) {
        console.warn("Error waiting for tweet confirmation:", waitError);
      }

      if (!sent) {
        try {
          await this.page.waitForSelector(
            'div[role="alert"][data-testid="toast"]',
            { timeout: 8000 }
          );
          sent = true;
        } catch (toastWaitError) {
          console.warn("Error waiting for toast confirmation:", toastWaitError);
        }
      }

      if (!sent) {
        console.error("❌ Tweet was not confirmed.");
        throw new Error("Failed to send tweet - no confirmation signal.");
      }

      console.log("Tweet posted successfully!");
    } catch (err) {
      console.error("Error while tweeting:", err);
      await this.handleError();
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  private async typeContentWithRetry(content: string): Promise<void> {
    let success = false;
    let writtenText = "";

    const selectAll = async () => {
      const isMac = process.platform === "darwin";
      const mod = isMac ? "Meta" : "Control";
      await this.page!.keyboard.down(mod as any);
      await this.page!.keyboard.press("a");
      await this.page!.keyboard.up(mod as any);
    };

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await selectAll();
        await this.page!.keyboard.press("Delete");
        await waitForTimeout(200);

        await this.page!.keyboard.type(content, { delay: 50 });
        await waitForTimeout(300);

        writtenText = await getEditorText(this.page!);

        if (normalizeText(writtenText) === normalizeText(content)) {
          success = true;
          break;
        } else {
          console.warn(
            `⚠️ Typing attempt ${attempt} failed.\nExpected: "${content}" | Received: "${writtenText}". Retrying...`
          );
          await waitForTimeout(300);
        }
      } catch (error) {
        console.warn(`Error during attempt ${attempt}:`, error);
        await waitForTimeout(500);
      }
    }

    if (!success) {
      try {
        const tmpDir = process.env.NODE_ENV === "production" ? "/tmp" : "./tmp";
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const shotPath = path.join(
          tmpDir,
          `vercel_debug_typing_failed_${Date.now()}.png`
        );
        await this.page!.screenshot({ path: shotPath });
        console.log("Screenshot typing failure:", shotPath);
      } catch (screenshotError) {
        console.warn("Error taking failure screenshot:", screenshotError);
      }
      throw new Error(
        `Tweet text incorrect AFTER 5 ATTEMPTS!\nExpected: ${content}\nReceived: ${writtenText}`
      );
    }

    console.log("Content typed: OK");
  }

  private async waitForImageUpload(): Promise<void> {
    const IMAGE_SELECTORS = [
      'img[src^="blob:"]',
      'div[data-testid="tweetPhoto"] img',
      '[data-testid="attachments"] img',
      'img[alt*="Image"]',
      '[aria-label*="Image"] img',
      '.css-175oi2r img[src^="blob:"]',
      'div[role="img"] img',
      '[data-testid="tweetComposer"] img[src^="blob:"]',
      'div[aria-label*="Embedded image"] img'
    ];

    let imageFound = false;
    let imageProcessed = false;
    const maxAttempts = 20;
    const checkInterval = 1500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(
        `🔍 Checking for uploaded images (attempt ${attempt}/${maxAttempts})...`
      );

      for (const selector of IMAGE_SELECTORS) {
        try {
          await this.page!.waitForSelector(selector, {
            timeout: checkInterval,
          });
          console.log(`Image found with selector: ${selector}`);
          imageFound = true;
          
          const imageComplete = await this.page!.evaluate((sel) => {
            const img = document.querySelector(sel) as HTMLImageElement;
            return img && img.complete && img.naturalWidth > 0;
          }, selector);
          
          if (imageComplete) {
            console.log("Image is fully loaded and processed");
            imageProcessed = true;
            break;
          } else {
            console.log("Image found but still processing...");
            imageFound = true;
          }
          break;
        } catch (e) {
          continue;
        }
      }

      if (imageFound && imageProcessed) break;

      if (attempt === Math.floor(maxAttempts / 2)) {
        console.log("Images not found yet, checking page state...");
        try {
          const hasFileInput = await this.page!.$(
            'input[type="file"][data-testid="fileInput"]'
          );
          if (!hasFileInput) {
            console.log(
              "File input disappeared - images might be processing"
            );
          }

          const diagnosticInfo = await this.page!.evaluate(() => {
            const attachments = document.querySelector('[data-testid="attachments"]');
            const images = document.querySelectorAll('img[src^="blob:"]');
            const tweetPhotos = document.querySelectorAll('[data-testid="tweetPhoto"]');
            
            return {
              attachmentsExists: !!attachments,
              blobImagesCount: images.length,
              tweetPhotosCount: tweetPhotos.length,
              attachmentsHTML: attachments ? attachments.outerHTML.substring(0, 200) + '...' : 'Not found'
            };
          });
          
          console.log("Diagnostic info:", JSON.stringify(diagnosticInfo, null, 2));
        } catch (e) {
          console.warn("Error checking page state:", e);
        }
      }

      await waitForTimeout(500);
    }

    if (!imageFound) {
      console.warn(
        "Images not found with any selector, continuing anyway..."
      );
      await waitForTimeout(2000);
    } else if (!imageProcessed) {
      console.warn(
        "Images found but may not be fully processed. Adding extra wait..."
      );
      await waitForTimeout(5000);
    } else {
      console.log("Images are fully processed and ready");
    }
  }

  async testImageUploadSelectors(): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");
    
    console.log("Testing image upload selectors...");
    
    const fileInputSelectors = [
      '[data-testid="fileInput"]',
      'input[type="file"][data-testid="fileInput"]',
      'input[accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"]',
      'input[accept*="image"]',
      'input[type="file"]',
      'input[multiple][accept*="image"]'
    ];
    
    console.log("File input selectors:");
    for (const selector of fileInputSelectors) {
      try {
        const element = await this.page.$(selector);
        console.log(`  ${element ? '✅' : '❌'} ${selector}`);
      } catch (e) {
        console.log(`  ❌ ${selector} (error: ${e})`);
      }
    }
    
    const mediaButtonSelectors = [
      '[data-testid="attachments"]',
      '[data-testid="tweetButtonInline"] + div [aria-label*="Media"]',
      '[aria-label*="Add photos"]',
      '[aria-label*="Add photo"]',
      '[aria-label*="Media"]',
      '[data-testid="toolBar"] [aria-label*="Media"]',
      'button[aria-label*="Add photos or videos"]',
      'div[role="button"][aria-label*="Add photos"]',
      '[data-testid="tweetComposer"] [aria-label*="Media"]'
    ];
    
    console.log("Media button selectors:");
    for (const selector of mediaButtonSelectors) {
      try {
        const element = await this.page.$(selector);
        console.log(`  ${element ? '✅' : '❌'} ${selector}`);
      } catch (e) {
        console.log(`  ❌ ${selector} (error: ${e})`);
      }
    }
    
    const imageSelectors = [
      'img[src^="blob:"]',
      'div[data-testid="tweetPhoto"] img',
      '[data-testid="attachments"] img',
      'img[alt*="Image"]',
      '[aria-label*="Image"] img',
      '.css-175oi2r img[src^="blob:"]',
      'div[role="img"] img',
      '[data-testid="tweetComposer"] img[src^="blob:"]',
      'div[aria-label*="Embedded image"] img'
    ];
    
    console.log("Image display selectors:");
    for (const selector of imageSelectors) {
      try {
        const elements = await this.page.$$(selector);
        console.log(`  ${elements.length > 0 ? '✅' : '❌'} ${selector} (${elements.length} found)`);
      } catch (e) {
        console.log(`  ❌ ${selector} (error: ${e})`);
      }
    }
  }

  private async handleError(): Promise<void> {
    if (!this.page || this.page.isClosed()) return;

    const tmpDir = process.env.NODE_ENV === "production" ? "/tmp" : "./tmp";
    const screenshotPath = path.join(
      tmpDir,
      `error_screenshot_${Date.now()}.png`
    );

    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const oldScreenshots = fs
        .readdirSync(tmpDir)
        .filter(
          (f) =>
            f.startsWith("error_screenshot_") || f.startsWith("vercel_debug_")
        );

      oldScreenshots.forEach((f) => {
        try {
          fs.unlinkSync(path.join(tmpDir, f));
        } catch (deleteError) {
          console.warn(`Error deleting old screenshot ${f}:`, deleteError);
        }
      });

      if (oldScreenshots.length) {
        console.log(`Cleaned up ${oldScreenshots.length} old screenshots.`);
      }

      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: "png",
      });

      console.log("Error screenshot captured:", screenshotPath);

      const domContent = await this.page.content();
      const domPath = path.join(tmpDir, `error_dom_${Date.now()}.html`);
      fs.writeFileSync(domPath, domContent);
      console.log("DOM captured:", domPath);
    } catch (debugCaptureError) {
      console.warn("Error during debug capture:", debugCaptureError);
    }
  }
}
