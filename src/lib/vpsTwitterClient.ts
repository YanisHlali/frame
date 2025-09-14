import puppeteer, { Browser, Page } from "puppeteer-core";
import fs from "fs";

export class VPSTwitterClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized && this.browser?.isConnected()) {
      console.log("Using existing browser session");
      return;
    }

    console.log("Initializing VPS Twitter client...");

    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--display=:1',
      ],
      defaultViewport: { width: 1920, height: 1080 },
      timeout: 120000,
      ignoreDefaultArgs: ['--enable-automation'],
    });

    this.page = await this.browser.newPage();

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await this.page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    if (process.env.COOKIES_BASE64) {
      const cookies = JSON.parse(Buffer.from(process.env.COOKIES_BASE64, 'base64').toString());
      await this.page.setCookie(...cookies);
      console.log("Cookies loaded");
    }

    this.isInitialized = true;
    console.log("VPS Twitter client initialized");
  }

  async tweetWithImage(content: string, imagePath: string): Promise<void> {
    await this.init();

    await this.takeDebugScreenshot('before-navigation');

    await this.page!.goto('https://x.com/compose/tweet', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await this.takeDebugScreenshot('after-navigation');

    const textArea = await this.findTextArea();
    if (!textArea) {
      throw new Error("Text area not found");
    }

    await textArea.click();
    await this.page!.keyboard.type(content, { delay: 50 });

    const fileInput = await this.page!.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(imagePath);
      console.log("Image uploaded");
      
      await this.page!.waitForSelector('img[src^="blob:"]', { timeout: 30000 });
    }

    await this.takeDebugScreenshot('before-tweet');

    const tweetButton = await this.page!.$('[data-testid="tweetButton"]');
    if (tweetButton) {
      await tweetButton.click();
      console.log("Tweet sent");
    } else {
      throw new Error("Tweet button not found");
    }

    await new Promise(res => setTimeout(res, 3000));
    await this.takeDebugScreenshot('after-tweet');
  }

  private async findTextArea(): Promise<any> {
    const selectors = [
      '[role="textbox"]',
      '[contenteditable="true"]',
      '[data-testid="tweetTextarea_0"]',
      '[aria-label*="What"]',
      '[aria-label*="Post"]'
    ];

    for (const selector of selectors) {
      try {
        await this.page!.waitForSelector(selector, { timeout: 5000 });
        const element = await this.page!.$(selector);
        if (element) {
          console.log(`Text area found with: ${selector}`);
          return element;
        }
      } catch (e) {
        console.log(`Selector failed: ${selector}`);
      }
    }

    const html = await this.page!.content();
    fs.writeFileSync('./debug/page-dump.html', html);
    
    return null;
  }

  private async takeDebugScreenshot(name: string): Promise<void> {
    if (process.env.DEBUG_SCREENSHOTS === 'true') {
      const screenshotPath = `./screenshots/${name}-${Date.now()}.png`;
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot: ${screenshotPath}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
    }
    this.isInitialized = false;
  }
}