#!/usr/bin/env node
/**
 * 第二批补充截图：使用 Safari UA（目标 WAF 对 Chrome 无头 UA 返回 456）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');
const TARGETS = [
  ['Exhibit-009-tokenpocket-china', 'https://tokenpocket-china.com/'],
  ['Exhibit-010-coinbase-web3', 'https://coinbase-web3.com/'],
  ['Exhibit-012-binance-china', 'https://binance-china.com/'],
  ['Exhibit-013-trustwallet-net-cn', 'https://trustwallet.net.cn/'],
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });

for (const [dir, url] of TARGETS) {
  const ctx = await browser.newContext({
    userAgent: UA, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: false,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);
  await page.route('**', (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.abort();
    if (/\.(apk|exe|ipa|zip|rar|7z|dmg|msi)(\?|$)/i.test(req.url())) return route.abort();
    return route.continue();
  });
  page.on('popup', (p) => p.close().catch(() => {}));

  let http = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    http = resp ? resp.status() : null;
    await page.waitForTimeout(4000);
    const title = await page.title();
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
<div class="m">采集时间 ${now()} (UTC+8) · HTTP ${http} · 原创发现（不在 OpenPhish / Phishing.Database 中） · Playwright Chromium 156 全页渲染 · 未经裁剪</div>
</div></body></html>`, { waitUntil: 'load' });
    await composer.waitForTimeout(600);
    await composer.screenshot({ path: path.join(EX, dir, 'screenshot.png'), fullPage: true, type: 'png' });
    await composer.close();

    console.log(`${dir} -> http=${http} ok bytes=${fs.statSync(path.join(EX, dir, 'screenshot.png')).size} title=${title.slice(0, 50)}`);
  } catch (e) {
    console.log(`${dir} -> FAILED ${String(e.message).split('\n')[0]}`);
  }
  await ctx.close();
  await new Promise((r) => setTimeout(r, 4000));
}
await browser.close();
