#!/usr/bin/env node
/**
 * 主动发现：枚举品牌域名变体 → DNS 解析 → HTTP 实测 → 标题核验
 * 目标：找出**尚未被公开情报库收录**的仿冒站。
 *
 * 与 01-Exhibits 现有条目的区别：
 *  - 现有条目来自 OpenPhish / Phishing.Database（警方同样能查）
 *  - 本脚本产出的是原创新发现，并显式证明其不在那两个库中
 *
 * 用法: node scripts/discover.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

const OUT = path.resolve('01-Exhibits/_discovery');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 1. 载入公开库，用于证明"不在库里" ---------- */
const TMP = process.env.TEMP || '/tmp';
const FEED_CACHE = path.join(TMP, 'stele_openphish_feed.txt');
const DB_CACHE = path.join(TMP, 'stele_phishdb_active.txt');

async function ensureFeeds() {
  if (!fs.existsSync(FEED_CACHE)) {
    const r = await fetch('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt', { signal: AbortSignal.timeout(60000) });
    fs.writeFileSync(FEED_CACHE, await r.text(), 'utf8');
    console.log('downloaded OpenPhish feed');
  }
  if (!fs.existsSync(DB_CACHE)) {
    const r = await fetch('https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt', { signal: AbortSignal.timeout(180000) });
    fs.writeFileSync(DB_CACHE, await r.text(), 'utf8');
    console.log('downloaded Phishing.Database active list');
  }
}

function loadKnown() {
  const known = new Set();
  if (fs.existsSync(FEED_CACHE)) {
    for (const line of fs.readFileSync(FEED_CACHE, 'utf8').split(/\r?\n/)) {
      try { const u = new URL(line.trim()); known.add(u.hostname.toLowerCase()); } catch {}
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

/* ---------- 2. 生成候选域名 ---------- */
const BRANDS = [
  ['trustwallet', 'Trust Wallet'],
  ['imtoken', 'imToken'],
  ['metamask', 'MetaMask'],
  ['tokenpocket', 'TokenPocket'],
  ['coinbase', 'Coinbase'],
  ['binance', 'Binance'],
  ['alipay', '支付宝'],
  ['unionpay', '银联'],
  ['icbc', '工商银行'],
  ['abchina', '农业银行'],
];

const SUFFIXES = ['-cn', '-app', '-download', '-wallet', '-web3', '-pro', '-vip', '-hk', '-china', '-official'];
const TLDS = ['cn', 'com.cn', 'top', 'xyz', 'vip', 'cc', 'site', 'online', 'shop', 'ltd'];

// 官方域名白名单，永不列入候选
const OFFICIAL = new Set([
  'trustwallet.com', 'imtoken.org', 'token.im', 'metamask.io', 'tokenpocket.pro',
  'coinbase.com', 'binance.com', 'alipay.com', 'unionpay.com', 'icbc.com.cn', 'abchina.com',
]);

function candidates() {
  const set = new Set();
  for (const [b] of BRANDS) {
    for (const t of TLDS) set.add(`${b}.${t}`);
    for (const s of SUFFIXES) {
      set.add(`${b}${s}.cn`);
      set.add(`${b}${s}.com`);
      set.add(`${b}${s}.top`);
      set.add(`${b}${s}.xyz`);
    }
  }
  return [...set].filter((d) => !OFFICIAL.has(d));
}

/* ---------- 3. 并发池 ---------- */
async function pool(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ---------- 4. 探测 ---------- */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function probe(domain) {
  try {
    const addrs = await dns.lookup(domain, { all: true, timeout: 4000 });
    if (!addrs?.length) return null;
    const ip = addrs[0].address;

    const ctrl = AbortSignal.timeout(9000);
    const res = await fetch(`http://${domain}/`, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
      signal: ctrl,
    }).catch(() => null);

    if (!res) return { domain, ip, http: null };
    const body = await res.text().catch(() => '');
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();

    return { domain, ip, http: res.status, finalUrl: res.url, bytes: body.length, title };
  } catch {
    return null;
  }
}

/* ---------- 5. 主流程 ---------- */
await ensureFeeds();
const known = loadKnown();
console.log(`known domains in public feeds: ${known.size}`);

const cands = candidates();
console.log(`generated candidates: ${cands.length}`);

const results = (await pool(cands, 20, probe)).filter(Boolean);
const live = results.filter((r) => r.http && r.http < 500);
console.log(`resolved: ${results.length}, http-ok: ${live.length}`);

// 标题命中品牌词 = 强信号（域名声称是某品牌）
function brandHit(r) {
  const t = `${r.title} ${r.finalUrl || ''}`.toLowerCase();
  return BRANDS.some(([b, name]) =>
    t.includes(b) || (name !== b && t.includes(name.toLowerCase()))
  );
}

const suspicious = live.filter(brandHit);

const report = suspicious.map((r) => ({
  ...r,
  inOpenPhishOrPhishDB: known.has(r.domain),
}));

report.sort((a, b) => Number(a.inOpenPhishOrPhishDB) - Number(b.inOpenPhishOrPhishDB));

fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalCandidates: cands.length,
  resolved: results.length,
  httpOk: live.length,
  brandHit: suspicious.length,
  novel: report.filter((r) => !r.inOpenPhishOrPhishDB).length,
  results: report,
}, null, 2), 'utf8');

console.log('\n=== 品牌命中且 HTTP 可访问 ===');
for (const r of report) {
  console.log(`${r.inOpenPhishOrPhishDB ? '[KNOWN]' : '[NOVEL]'} ${r.domain} | http=${r.http} | ${r.title.slice(0, 70)}`);
}
console.log(`\nnovel (不在公开库): ${report.filter((r) => !r.inOpenPhishOrPhishDB).length}`);
console.log(`saved -> ${path.join(OUT, 'candidates.json')}`);
