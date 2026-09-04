const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const PRESET = process.argv[2] === '1080p' ? '1080p' : '720p';
const filename = PRESET === '1080p'
  ? 'cezeri-rectangle-1080p-persistent-sparks-24fps.webm'
  : 'cezeri-rectangle-720p-24fps.webm';
const VIDEO = path.join(ROOT, 'renders', filename);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(VIDEO).href, { waitUntil: 'load' });
    await page.waitForSelector('video');
    const metadata = await page.$eval('video', video => new Promise((resolve, reject) => {
      const done = () => resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      if (video.readyState >= 1) done();
      else {
        video.addEventListener('loadedmetadata', done, { once: true });
        video.addEventListener('error', () => reject(new Error('Video metadata failed to load.')), { once: true });
      }
    }));
    for (const [name, time] of [['start', 0], ['middle', 5], ['hold-a', 10.15], ['hold-b', 10.8]]) {
      await page.$eval('video', (video, t) => new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true });
        video.currentTime = Math.min(t, Math.max(0, video.duration - 0.001));
      }), time);
      const video = await page.$('video');
      await video.screenshot({ path: `/tmp/cezeri-${name}.png` });
    }
    console.log(JSON.stringify(metadata));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
