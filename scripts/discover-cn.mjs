#!/usr/bin/env node
/**
 * 主动发现 · 第二批：国内银行 / 支付 / 运营商 / 电商 / 政务仿冒
 * 目标：找出不在 OpenPhish 与 Phishing.Database 中的仿冒站。
 *
 * 与第一批（scripts/discover.mjs）的区别：
 *  - 品牌表换成国内主体，含官方域名白名单，避免误伤
 *  - 增加拼音变体与客服号变体（95588 等）
 *  - 后缀表偏中文语境（-cn / -kefu / -service / -vip / -login）
 */
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

const OUT = path.resolve('01-Exhibits/_discovery');
fs.mkdirSync(OUT, { recursive: true });

const TMP = process.env.TEMP || '/tmp';
const FEED_CACHE = path.join(TMP, 'stele_openphish_feed.txt');
const DB_CACHE = path.join(TMP, 'stele_phishdb_active.txt');

/* ---------- 公开库（用于证明不在库中） ---------- */
function loadKnown() {
  const known = new Set();
  if (fs.existsSync(FEED_CACHE)) {
    for (const line of fs.readFileSync(FEED_CACHE, 'utf8').split(/\r?\n/)) {
      try { known.add(new URL(line.trim()).hostname.toLowerCase()); } catch {}
    }
  }
  if (fs.existsSync(DB_CACHE)) {
    for (const line of fs.readFileSync(DB_CACHE, 'utf8').split(/\r?\n/)) {
      const d = line.trim().toLowerCase();
      if (d) known.add(d);
    }
  }
  return known;
}

/* ---------- 品牌表：[探测词, 展示名, 官方域名] ---------- */
const BRANDS = [
  ['icbc', '工商银行', 'icbc.com.cn'],
  ['ccb', '建设银行', 'ccb.com'],
  ['abchina', '农业银行', 'abchina.com'],
  ['bankofchina', '中国银行', 'boc.cn'],
  ['cmbchina', '招商银行', 'cmbchina.com'],
  ['bankcomm', '交通银行', 'bankcomm.com'],
  ['psbc', '邮储银行', 'psbc.com'],
  ['citicbank', '中信银行', 'citicbank.com'],
  ['alipay', '支付宝', 'alipay.com'],
  ['tenpay', '财付通/微信支付', 'tenpay.com'],
  ['unionpay', '银联', 'unionpay.com'],
  ['chinamobile', '中国移动', '10086.cn'],
  ['chinaunicom', '中国联通', '10010.com'],
  ['chinatelecom', '中国电信', '189.cn'],
  ['taobao', '淘宝', 'taobao.com'],
  ['jd', '京东', 'jd.com'],
  ['12306', '铁路12306', '12306.cn'],
];

/* 拼音变体：中文钓鱼常用全拼 */
const PINYIN = [
  ['gongshangyinhang', '工商银行'],
  ['jiansheyinhang', '建设银行'],
  ['nongyeyinhang', '农业银行'],
  ['zhongguoyinhang', '中国银行'],
  ['zhaoshangyinhang', '招商银行'],
  ['zhifubao', '支付宝'],
  ['weixinzhifu', '微信支付'],
];

/* 客服号变体 */
const HOTLINES = ['95588', '95533', '95599', '95566', '95555', '95516', '10086', '10010'];

const SUFFIXES = ['-cn', '-app', '-download', '-kefu', '-service', '-vip', '-login', '-web', '-china', '-gw', '-zx'];
const TLDS = ['cn', 'com', 'com.cn', 'net.cn', 'org.cn', 'top', 'xyz', 'vip', 'cc', 'site', 'online', 'shop'];

/* 官方域名白名单：永不列入候选 */
const OFFICIAL = new Set(BRANDS.map(([, , o]) => o));

function candidates() {
  const set = new Set();
  const add = (d) => { if (!OFFICIAL.has(d)) set.add(d); };

  for (const [b] of BRANDS) {
    for (const t of TLDS) add(`${b}.${t}`);
    for (const s of SUFFIXES) {
      add(`${b}${s}.cn`);
      add(`${b}${s}.com`);
      add(`${b}${s}.top`);
    }
  }
  for (const [p] of PINYIN) {
    for (const t of ['cn', 'com', 'com.cn', 'top', 'vip', 'cc']) add(`${p}.${t}`);
  }
  for (const h of HOTLINES) {
    for (const t of ['cn', 'com', 'com.cn', 'top', 'vip']) add(`${h}.${t}`);
    add(`${h}kf.cn`);
    add(`${h}-kf.com`);
  }
  return [...set];
}

/* ---------- 并发池 ---------- */
async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function probe(domain) {
  try {
    const addrs = await dns.lookup(domain, { all: true, timeout: 4000 });
    if (!addrs?.length) return null;
    const ip = addrs[0].address;

    const res = await fetch(`http://${domain}/`, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
      signal: AbortSignal.timeout(9000),
    }).catch(() => null);

    if (!res) return { domain, ip, http: null };
    const body = await res.text().catch(() => '');
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
    return { domain, ip, http: res.status, finalUrl: res.url, bytes: body.length, title };
  } catch { return null; }
}

/* ---------- 主流程 ---------- */
const known = loadKnown();
console.log(`public-feed domains: ${known.size}`);

const cands = candidates();
console.log(`candidates: ${cands.length}`);

const results = (await pool(cands, 25, probe)).filter(Boolean);
const live = results.filter((r) => r.http && r.http < 500);
console.log(`resolved: ${results.length}, http-ok: ${live.length}`);

const NAME_MAP = [...BRANDS.map(([b, n]) => [b, n]), ...PINYIN.map(([p, n]) => [p, n])];

function brandHit(r) {
  const hay = `${r.title} ${r.finalUrl || ''}`.toLowerCase();
  return NAME_MAP.some(([b, n]) => hay.includes(b) || hay.includes(n.toLowerCase()));
}

const suspicious = live.filter(brandHit);
const report = suspicious.map((r) => ({ ...r, known: known.has(r.domain) }));
report.sort((a, b) => Number(a.known) - Number(b.known));

fs.writeFileSync(path.join(OUT, 'candidates-cn.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'CN banks / payment / telecom / ecommerce / railway',
  totalCandidates: cands.length,
  resolved: results.length,
  httpOk: live.length,
  brandHit: suspicious.length,
  novel: report.filter((r) => !r.known).length,
  results: report,
}, null, 2), 'utf8');

console.log('\n=== 品牌命中 ===');
for (const r of report) {
  console.log(`${r.known ? '[KNOWN]' : '[NOVEL]'} ${r.domain} | ${r.http} | ${r.title.slice(0, 60)}`);
}
console.log(`\nnovel: ${report.filter((r) => !r.known).length}`);
