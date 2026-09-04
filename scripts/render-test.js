const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.PORT || 4173);
const PRESET = process.argv[2] === '1080p' ? '1080p' : '720p';

async function waitForServer(url, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Renderer server did not start at ${url}`);
}

(async () => {
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts/dev-server.js')], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'],
  });
  server.stdout.on('data', chunk => process.stdout.write(chunk));
  let browser;
  try {
    const url = `http://127.0.0.1:${PORT}/?brush=schematic&render=${PRESET}`;
    await waitForServer(url);
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      protocolTimeout: 20 * 60 * 1000,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    page.on('console', message => console.log(`[browser] ${message.text()}`));
    page.on('pageerror', error => console.error(`[browser] ${error.message}`));
    let finishExport;
    const exportDone = new Promise(resolve => { finishExport = resolve; });
    await page.exposeFunction('__onCezeriExportDone', result => finishExport(result));
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    // The export begins shortly after p5 setup and can keep the main thread
    // busy long enough to defeat Puppeteer's optional network-idle heuristic.
    // The load event is the correct readiness boundary for this static page.
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    let timeoutId;
    const timedOut = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Export exceeded 20 minutes.')), 20 * 60 * 1000);
    });
    const result = await Promise.race([exportDone, timedOut]);
    clearTimeout(timeoutId);
    if (result.error) throw new Error(result.error);
    console.log(`Saved ${result.frames} frames to ${result.path}`);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
