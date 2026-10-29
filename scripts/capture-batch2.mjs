#!/usr/bin/env node
/**
 * 主动发现批次（EX-008 ~ EX-013）的截图采集。
 * 与 capture-shots.mjs 相同护栏：拦截非 GET、禁下载、禁弹窗、超时。
 * 这些目标由 scripts/discover.mjs 原创发现，均不在 OpenPhish / Phishing.Database 中。
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');

const TARGETS = [
  ['Exhibit-008-tokenpocket-web3', 'https://tokenpocket-web3.cn/'],
  ['Exhibit-009-tokenpocket-china', 'https://tokenpocket-china.com/'],
  ['Exhibit-010-coinbase-web3', 'https://coinbase-web3.com/'],
  ['Exhibit-011-binance-download', 'https://binance-download.com/'],
  ['Exhibit-012-binance-china', 'https://binance-china.com/'],
  ['Exhibit-013-trustwallet-net-cn', 'https://trustwallet.net.cn/'],
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
const stamp = () => new Date().toISOString();

const results = [];
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });

for (const [dir, url] of TARGETS) {
  const ctx = await browser.newContext({
    userAgent: UA, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: false,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  let blocked = 0;
  await page.route('**', (route) => {
    const req = route.request();
    if (req.method() !== 'GET') { blocked++; return route.abort(); }
    if (/\.(apk|exe|ipa|zip|rar|7z|dmg|msi)(\?|$)/i.test(req.url())) { blocked++; return route.abort(); }
    return route.continue();
  });
  page.on('popup', (p) => p.close().catch(() => {}));

  const rec = { dir, url, captured_at: stamp(), human_time: now() };
  const shotPath = path.join(EX, dir, 'screenshot.png');

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.http = resp ? resp.status() : null;
    await page.waitForTimeout(3500);

    const info = await page.evaluate(() => ({
      title: document.title,
      pwds: document.querySelectorAll('input[type="password"]').length,
      inputs: document.querySelectorAll('input').length,
      forms: document.querySelectorAll('form').length,
    }));
    Object.assign(rec, { title: info.title, password_inputs: info.pwds, inputs: info.inputs, forms: info.forms });

    // 若有 WAF 拦截 curl，则以浏览器渲染后的 DOM 作为 page.html 存证
    const htmlPath = path.join(EX, dir, 'page.html');
    const html = await page.content();
    if (html && html.length > 500) {
      fs.writeFileSync(htmlPath, html, 'utf8');
      rec.page_html = 'from-browser';
    }

    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    const composer = await ctx.newPage();
    await composer.setViewportSize({ width: 1440, height: 900 });
    await composer.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;font-family:"Microsoft YaHei"}
img{display:block;width:1440px}
.bar{width:1440px;background:#b00020;color:#fff;padding:14px 18px;font-size:15px;line-height:1.6}
.bar b{font-size:17px}.bar .u{font-family:Consolas,monospace;word-break:break-all;font-size:14px}
.bar .m{opacity:.9;font-size:13px;margin-top:4px}</style></head><body>
<img src="data:image/png;base64,${buf.toString('base64')}">
<div class="bar"><b>取证截图 / EVIDENCE CAPTURE</b><br>
<span class="u">URL: ${url}</span>
<div class="m">采集时间 ${now()} (UTC+8) · HTTP ${rec.http} · 原创发现（不在 OpenPhish / Phishing.Database 中） · Playwright Chromium 156 全页渲染 · 未经裁剪</div>
</div></body></html>`, { waitUntil: 'load' });
    await composer.waitForTimeout(600);
    await composer.screenshot({ path: shotPath, fullPage: true, type: 'png' });
    await composer.close();

    rec.screenshot = 'ok';
    rec.blocked = blocked;
    rec.bytes = fs.statSync(shotPath).size;
  } catch (e) {
    rec.error = String(e.message).split('\n')[0];
    rec.screenshot = 'failed';
  }
  results.push(rec);
  console.log(`${dir} -> http=${rec.http} shot=${rec.screenshot} bytes=${rec.bytes ?? 0} ${rec.error ?? ''}`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(EX, 'render-log-batch2.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('\nwrote render-log-batch2.json');
