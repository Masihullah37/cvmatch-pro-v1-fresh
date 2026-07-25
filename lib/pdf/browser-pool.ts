let browserInstance: any = null;
let launching: Promise<any> | null = null;

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
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
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