#!/usr/bin/env node
/**
 * 对挂起型目标：禁用 JS 与 XHR（死循环/长轮询是挂起元凶），保留 document/css/img/font，
 * 只截首屏（fullPage 在超大页面上会超时）。
 * 用法: node scripts/retry-shot2.mjs <dir> <url...>
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');
const [dir, ...urls] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({
  userAgent: UA, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
  viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1,
  acceptDownloads: false, javaScriptEnabled: false,
});
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

const ALLOW = new Set(['document', 'stylesheet', 'image', 'font']);
await page.route('**', (route) => {
  const req = route.request();
  if (req.method() !== 'GET') return route.abort();
  if (!ALLOW.has(req.resourceType())) return route.abort();   // 切断 script / xhr / websocket / media
  return route.continue();
});
page.on('popup', (p) => p.close().catch(() => {}));

let usedUrl = urls[0], http = null;
for (const u of urls) {
  try {
    const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
    http = resp ? resp.status() : null; usedUrl = u; break;
  } catch (e) { console.log(`try ${u} -> ${String(e.message).split('\n')[0]}`); }
}

try { await page.evaluate(() => window.stop()); } catch {}
await page.waitForTimeout(1500);

let info = { title: '', inputs: 0 };
try {
  info = await page.evaluate(() => ({
    title: document.title,
    inputs: document.querySelectorAll('input').length,
  }));
} catch {}

const buf = await page.screenshot({ fullPage: false, type: 'png', animations: 'disabled', timeout: 20000 });

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
<span class="u">URL: ${usedUrl}</span>
<div class="m">采集时间 ${now()} (UTC+8) · HTTP ${http ?? 'n/a'} · 首屏截图 · 目标站点脚本挂起，已禁用 JS/XHR 后捕获，样式与图片正常 · 未经裁剪</div>
</div></body></html>`, { waitUntil: 'load' });
await composer.waitForTimeout(500);
await composer.screenshot({ path: path.join(EX, dir, 'screenshot.png'), fullPage: true });
await composer.close();

console.log(`OK ${dir} url=${usedUrl} http=${http} title=${info.title} inputs=${info.inputs} bytes=${fs.statSync(path.join(EX, dir, 'screenshot.png')).size}`);
await browser.close();
