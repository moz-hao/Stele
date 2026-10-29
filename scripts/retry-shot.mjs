#!/usr/bin/env node
/**
 * 容忍式重抓：不适合快速 load 的目标（挂起/慢响应）。
 * 策略：waitUntil:'commit' + 短超时 + 失败也截图当前状态。
 * 用法: node scripts/retry-shot.mjs <dir> <url> [url2...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');
const [dir, ...urls] = process.argv.slice(2);
if (!dir) { console.error('usage: node retry-shot.mjs <dir> <url...>'); process.exit(2); }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  userAgent: UA, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: false,
});
const page = await ctx.newPage();
await page.route('**', (route) => {
  const req = route.request();
  if (req.method() !== 'GET') return route.abort();
  if (/\.(apk|exe|ipa|zip|rar|7z|dmg|msi)(\?|$)/i.test(req.url())) return route.abort();
  return route.continue();
});
page.on('popup', (p) => p.close().catch(() => {}));

let usedUrl = urls[0];
let http = null;
let err = null;

for (const u of urls) {
  try {
    const resp = await page.goto(u, { waitUntil: 'commit', timeout: 25000 });
    http = resp ? resp.status() : null;
    usedUrl = u;
    err = null;
    break;
  } catch (e) {
    err = String(e.message).split('\n')[0];
    console.log(`try ${u} -> ${err}`);
  }
}

await page.waitForTimeout(6000);

let info = { title: '', pwds: 0, inputs: 0, text: '' };
try {
  info = await page.evaluate(() => ({
    title: document.title,
    pwds: document.querySelectorAll('input[type="password"]').length,
    inputs: document.querySelectorAll('input').length,
    text: (document.body?.innerText || '').slice(0, 200).replace(/\s+/g, ' ').trim(),
  }));
} catch {}

let pageBuf = null;
try { pageBuf = await page.screenshot({ fullPage: true, type: 'png' }); } catch (e) { console.log('shot err', e.message.split('\n')[0]); }

if (!pageBuf) { console.log('NO SCREENSHOT'); await browser.close(); process.exit(1); }

const composer = await ctx.newPage();
await composer.setViewportSize({ width: 1440, height: 900 });
await composer.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;font-family:"Microsoft YaHei"}
img{display:block;width:1440px}
.bar{width:1440px;background:#b00020;color:#fff;padding:14px 18px;font-size:15px;line-height:1.6}
.bar b{font-size:17px}.bar .u{font-family:Consolas,monospace;word-break:break-all;font-size:14px}
.bar .m{opacity:.9;font-size:13px;margin-top:4px}</style></head><body>
<img src="data:image/png;base64,${pageBuf.toString('base64')}">
<div class="bar"><b>取证截图 / EVIDENCE CAPTURE</b><br>
<span class="u">URL: ${usedUrl}</span>
<div class="m">采集时间 ${now()} (UTC+8) · HTTP ${http ?? 'n/a'} · 渲染方式 Playwright Chromium 容忍式捕获（目标响应缓慢，未等待完全加载）· 本截图未经裁剪</div>
</div></body></html>`, { waitUntil: 'load' });
await composer.waitForTimeout(600);
await composer.screenshot({ path: path.join(EX, dir, 'screenshot.png'), fullPage: true, type: 'png' });
await composer.close();

console.log(`OK ${dir} url=${usedUrl} http=${http} title=${info.title} pwd=${info.pwds} inputs=${info.inputs}`);
console.log(`bytes=${fs.statSync(path.join(EX, dir, 'screenshot.png')).size}`);
await browser.close();
