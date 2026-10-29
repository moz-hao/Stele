#!/usr/bin/env node
/**
 * 为渲染空白的条目生成"诊断截图"：保留黑屏原始渲染 + 说明为何空白。
 * 用法: node scripts/annotate-blank.mjs <dir> <url> "<说明>"
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const EX = path.resolve('01-Exhibits');
const [dir, url, note] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const now = () => new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ userAgent: UA, locale: 'zh-CN', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

let http = null, diag = {};
try {
  const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  http = r ? r.status() : null;
} catch (e) { diag.goto_error = String(e.message).split('\n')[0]; }
await page.waitForTimeout(8000);
try {
  diag = await page.evaluate(() => ({
    title: document.title,
    body_text_len: (document.body?.innerText || '').length,
    dom_bytes: document.documentElement.outerHTML.length,
    body_bg: getComputedStyle(document.body).backgroundColor,
    scripts: document.querySelectorAll('script').length,
  }));
} catch {}

const blank = await page.screenshot({ fullPage: false, type: 'png' });

const composer = await ctx.newPage();
await composer.setViewportSize({ width: 1440, height: 900 });
await composer.setContent(`<!doctype html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei",sans-serif;background:#fff}
.hd{background:#212121;color:#fff;padding:22px 26px}
.hd h1{font-size:21px;margin-bottom:6px}
.hd .u{font-family:Consolas,monospace;font-size:14px;color:#ff8a80;word-break:break-all}
.panel{display:flex;gap:20px;padding:20px 26px;align-items:flex-start}
.shot{flex:0 0 660px;border:1px solid #ddd}
.shot img{display:block;width:660px}
.facts{flex:1;font-size:14px;line-height:1.9;color:#222}
.facts h2{font-size:16px;color:#b00020;margin-bottom:8px}
.facts table{border-collapse:collapse;width:100%;margin:10px 0}
.facts td{border:1px solid #e0e0e0;padding:6px 8px;font-size:13px}
.facts td:first-child{background:#fafafa;width:42%;color:#555}
.warn{background:#fff3cd;border-left:4px solid #ffc107;padding:12px 14px;margin-top:12px;font-size:13.5px;line-height:1.8}
.bar{background:#b00020;color:#fff;padding:14px 18px;font-size:14px;line-height:1.6}
.bar b{font-size:16px}
.bar .m{opacity:.92;font-size:12.5px;margin-top:4px}
</style></head><body>
<div class="hd">
  <h1>取证截图（诊断版）/ EVIDENCE CAPTURE — DIAGNOSTIC</h1>
  <div class="u">URL: ${url}</div>
</div>
<div class="panel">
  <div class="shot"><img src="data:image/png;base64,${blank.toString('base64')}"></div>
  <div class="facts">
    <h2>左侧为真实渲染结果：空白黑屏</h2>
    <table>
      <tr><td>HTTP 状态</td><td>${http ?? 'n/a'}</td></tr>
      <tr><td>document.title</td><td>${(diag.title || '').slice(0, 60)}</td></tr>
      <tr><td>渲染后 body 文本长度</td><td><b>${diag.body_text_len ?? 'n/a'}</b> 字符</td></tr>
      <tr><td>渲染后 DOM 大小</td><td>${diag.dom_bytes ?? 'n/a'} 字节</td></tr>
      <tr><td>body 背景色</td><td>${diag.body_bg ?? 'n/a'}</td></tr>
      <tr><td>script 数量</td><td>${diag.scripts ?? 'n/a'}</td></tr>
    </table>
    <div class="warn">${note}</div>
  </div>
</div>
<div class="bar">
  <b>取证说明</b><br>
  <div class="m">采集时间 ${now()} (UTC+8) · 采集方法 Playwright Chromium 156 无头渲染 · 等待 8 秒后取 DOM 快照 · 本截图未经裁剪，左图即浏览器实际所见</div>
</div>
</body></html>`, { waitUntil: 'load' });
await composer.waitForTimeout(500);
await composer.screenshot({ path: path.join(EX, dir, 'screenshot.png'), fullPage: true });
await composer.close();

console.log(`annotated ${dir} http=${http} diag=${JSON.stringify(diag)}`);
await browser.close();
