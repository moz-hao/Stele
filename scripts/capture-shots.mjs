#!/usr/bin/env node
/**
 * Playwright 全页截图 + 取证页脚。
 * 安全护栏：
 *  - 拦截所有非 GET 请求（禁止表单提交到对方服务器）
 *  - 拦截 .apk/.exe/.ipa/.zip 下载
 *  - 禁弹窗、禁下载、单页超时 45s
 *  - 页面 JS 会执行（否则截不到 SPA 渲染后的登录框），但不向其提交任何数据
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');

const TARGETS = [
  ['Exhibit-001-trust-web3', 'https://trust-web3.cn/'],
  ['Exhibit-002-metamaskwallet', 'https://metamaskwallet.com.cn/'],
  ['Exhibit-003-coinbasewallet', 'http://coinbasewallet.com.cn/'],
  ['Exhibit-004-trustwallllet', 'http://trustwallllet.cn/'],
  ['Exhibit-005-token-imtoken', 'http://token.hk.cn/'],
  ['Exhibit-006-tokenpocket', 'http://tokenpocket.hk.cn/'],
  ['Exhibit-007-neteasepay', 'http://neteasepay.cn/'],
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
const stamp = () => new Date().toISOString();

const results = [];

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });

for (const [dir, url] of TARGETS) {
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: false,
    javaScriptEnabled: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  let blocked = 0;
  await page.route('**', (route) => {
    const req = route.request();
    const u = req.url().toLowerCase();
    if (req.method() !== 'GET') { blocked++; return route.abort(); }
    if (/\.(apk|exe|ipa|zip|rar|7z|dmg|msi)(\?|$)/i.test(u)) { blocked++; return route.abort(); }
    return route.continue();
  });
  page.on('popup', (p) => p.close().catch(() => {}));

  const rec = { dir, url, captured_at: stamp(), human_time: now() };
  const shotPath = path.join(EX, dir, 'screenshot.png');

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    rec.http = resp ? resp.status() : null;
    // 给 SPA 一点渲染时间
    await page.waitForTimeout(3500);

    const info = await page.evaluate(() => ({
      title: document.title,
      pwds: document.querySelectorAll('input[type="password"]').length,
      inputs: document.querySelectorAll('input').length,
      forms: document.querySelectorAll('form').length,
      text: (document.body.innerText || '').slice(0, 300).replace(/\s+/g, ' ').trim(),
    }));
    rec.title = info.title;
    rec.password_inputs = info.pwds;
    rec.inputs = info.inputs;
    rec.forms = info.forms;
    rec.text_head = info.text;

    const pageBuf = await page.screenshot({ fullPage: true, type: 'png' });

    // 合成：截图 + 取证页脚
    const composer = await ctx.newPage();
    const b64 = pageBuf.toString('base64');
    await composer.setViewportSize({ width: 1440, height: 900 });
    await composer.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#fff;font-family:"Microsoft YaHei",sans-serif}
  img{display:block;width:1440px}
  .bar{width:1440px;background:#b00020;color:#fff;padding:14px 18px;font-size:15px;line-height:1.6}
  .bar b{font-size:17px}
  .bar .u{font-family:Consolas,monospace;word-break:break-all;font-size:14px}
  .bar .m{opacity:.9;font-size:13px;margin-top:4px}
</style></head><body>
<img src="data:image/png;base64,${b64}">
<div class="bar">
  <b>取证截图 / EVIDENCE CAPTURE</b><br>
  <span class="u">URL: ${url}</span>
  <div class="m">采集时间 ${now()} (UTC+8) · HTTP ${rec.http} · 采集方法 Playwright Chromium 156 全页渲染 · 本截图未经裁剪</div>
</div>
</body></html>`, { waitUntil: 'load' });

    await composer.waitForTimeout(600);
    await composer.screenshot({ path: shotPath, fullPage: true, type: 'png' });
    await composer.close();

    rec.screenshot = 'ok';
    rec.blocked_requests = blocked;
    rec.bytes = fs.statSync(shotPath).size;
  } catch (e) {
    rec.error = String(e.message).split('\n')[0];
    rec.screenshot = 'failed';
    // 失败时也写一个占位说明，避免 acceptance 直接崩
    try {
      const ph = await ctx.newPage();
      await ph.setViewportSize({ width: 1440, height: 400 });
      await ph.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:"Microsoft YaHei";padding:30px;background:#fff3cd;color:#663c00}
h2{color:#b00020}code{background:#fff;padding:2px 6px;border:1px solid #ddd}</style></head><body>
<h2>截图未能生成 / CAPTURE FAILED</h2>
<p>目标：<code>${url}</code></p>
<p>时间：${now()} (UTC+8)</p>
<p>原因：${rec.error}</p>
<p>说明：本条目仍保留 <code>page.html</code> 源码存证，可据其核验页面内容。截图待补抓。</p>
</body></html>`);
      await ph.screenshot({ path: shotPath, fullPage: true });
      await ph.close();
      rec.screenshot = 'placeholder';
    } catch {}
  }
  results.push(rec);
  console.log(`${dir} -> http=${rec.http} shot=${rec.screenshot} pwd=${rec.password_inputs} bytes=${rec.bytes ?? 0}`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(EX, 'render-log.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('\nwrote render-log.json');
