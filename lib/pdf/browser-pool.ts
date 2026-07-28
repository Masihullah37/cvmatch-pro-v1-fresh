let browserInstance: any = null;
let launching: Promise<any> | null = null;

// Track last browser usage so we can close idle Chromium
let lastUsedAt = Date.now();
const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // close after 3 minutes idle

setInterval(async () => {
    if (browserInstance && Date.now() - lastUsedAt > IDLE_TIMEOUT_MS) {
        console.log("[PDF] Closing idle shared browser to free memory.");

        try {
            await browserInstance.close();
        } catch (e) {
            console.warn("[PDF] Error closing idle browser:", e);
        }

        browserInstance = null;
    }
}, 60 * 1000); // check every minute

async function launchBrowser() {
    if (process.env.NODE_ENV === "production") {
        const chromium = (await import("@sparticuz/chromium")).default as any;
        const puppeteerCore = (await import("puppeteer-core")) as any;
        return puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        const puppeteer = (await import("puppeteer")).default as any;
        return puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            timeout: 60000,
        });
    }
}

// One shared browser instance for the entire server process, launched
// once and reused for every request — not relaunched per-download.
export async function getSharedBrowser() {

    lastUsedAt = Date.now();
    if (browserInstance) {
        try {
            if (typeof browserInstance.isConnected === "function" && browserInstance.isConnected()) {
                return browserInstance;
            }
        } catch (e) {
            console.warn("[PDF] Error checking existing browser connection, relaunching:", e);
        }
        // Existing instance is unusable for any reason — discard it and relaunch below.
        browserInstance = null;
    }

    if (launching) return launching;

    launching = launchBrowser().then((b) => {
        browserInstance = b;
        launching = null;
        b.on("disconnected", () => {
            console.warn("[PDF] Shared browser disconnected — will relaunch on next request.");
            browserInstance = null;
        });
        return b;
    });
    return launching;
}

// Simple concurrency limiter — no new npm dependency needed.
// Caps how many PDFs can render at the exact same moment; everyone
// past that cap waits in a queue instead of piling on more load at once.
const MAX_CONCURRENT_RENDERS = 3;
let activeRenders = 0;
const queue: (() => void)[] = [];

export async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (activeRenders >= MAX_CONCURRENT_RENDERS) {
        await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeRenders++;
    try {
        return await fn();
    } finally {
        activeRenders--;
        const next = queue.shift();
        if (next) next();
    }
}