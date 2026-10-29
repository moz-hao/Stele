#!/usr/bin/env node
/**
 * 批次二（EX-008 ~ EX-013）meta.yaml 生成。
 * 这些目标由 scripts/discover.mjs 原创发现，均不在 OpenPhish / Phishing.Database 中。
 */
import fs from 'node:fs';
import path from 'node:path';

const EX = path.resolve('01-Exhibits');
const obf = (d) => d.replace(/\./g, '[.]');
const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
const NOW = '2026-10-29T17:00:00+08:00';

const DATA = [
  {
    dir: 'Exhibit-008-tokenpocket-web3', id: 'EX-008',
    type: 'phishing-crypto-wallet', impersonates: 'TokenPocket',
    official: 'tokenpocket.pro', domains: ['tokenpocket-web3.cn'],
    payload: [], decoy: [], hosting: 'self-hosted (.cn)',
    http: 200, bytes: 27579,
    title: 'TPwallet官方网站 - 领先的多链数字货币交易钱包平台',
    note: '域名 tokenpocket-web3[.]cn 非 TokenPocket 官方（官方为 tokenpocket.pro），页面自称"TPwallet官方网站"，属仿冒钱包官网引流。由证书/域名变体主动探测发现，不在公开钓鱼库中。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-009-tokenpocket-china', id: 'EX-009',
    type: 'phishing-crypto-wallet', impersonates: 'TokenPocket',
    official: 'tokenpocket.pro', domains: ['tokenpocket-china.com'],
    payload: [], decoy: ['www.tokenpocket-china.com', 'tokenpocket-gm.medium.com'],
    hosting: 'self-hosted (.com)',
    http: 200, bytes: 34773,
    title: 'TokenPocket 官网 - TP钱包(中文版)下载 | 全球领先的去中心化多链钱包',
    note: '标题直接自称"TokenPocket 官网(中文版)下载"，但域名为 tokenpocket-china[.]com，与官方 tokenpocket.pro 无关。站内将自身域名标为"官方"，并使用 Medium 账号 tokenpocket-gm 做信任背书。该站对无头 Chrome UA 返回 456，需用 Safari UA 才能获取内容，具反自动化特征。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-010-coinbase-web3', id: 'EX-010',
    type: 'phishing-crypto-wallet', impersonates: 'Coinbase',
    official: 'coinbase.com', domains: ['coinbase-web3.com'],
    payload: ['https://app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk'],
    decoy: [], hosting: '京东云对象存储（承载 APK）+ 自有域名',
    http: 200, bytes: 13418,
    title: 'Coinbase官网 - 购买、存储和出售数字货币',
    note: '★ 团伙关联证据：该站分发的 APK 与 EX-003（coinbasewallet[.]com[.]cn）指向**完全相同的 URL**（京东云 cn-north-1 对象存储桶内的 CoinbaseWallet.apk），可判定为同一投放方的多域名站群。该域名不在公开钓鱼库中，属原创发现。',
    statutes: ['刑法第266条（诈骗罪）', '反电信网络诈骗法第38条', '网络安全法第27条'],
  },
  {
    dir: 'Exhibit-011-binance-download', id: 'EX-011',
    type: 'phishing-crypto-exchange', impersonates: 'Binance（币安）',
    official: 'binance.com', domains: ['binance-download.com'],
    payload: [], decoy: ['binance-download.com'], hosting: 'self-hosted (.com)',
    http: 200, bytes: 19023,
    title: '币安Binance | 全球领先的加密货币交易平台 - 官方App下载与注册',
    note: '域名 binance-download[.]com 与币安官方 binance.com 无关，页面自称"官方App下载与注册"，并将自身域名标注为官方，属典型的下载站型仿冒。不在公开钓鱼库中。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-012-binance-china', id: 'EX-012',
    type: 'phishing-crypto-exchange', impersonates: 'Binance（币安）/ Trust Wallet',
    official: 'binance.com', domains: ['binance-china.com'],
    payload: ['https://down.dappstroe.net/trustwallet.apk'],
    decoy: ['www.trustwallet.net.cn'], hosting: '自建分发域名 + 关联站群',
    http: 200, bytes: 302398,
    title: 'Binance官网 | Binance钱包App 官方下载 | Binance Web3 去中心化探索',
    note: '冒充币安官网并提供 APK，下载地址托管于第三方域名 dappstroe[.]net；同时把 trustwallet.net.cn（另一仿冒站，见 EX-013）标为"官方"。页面体积 302KB，SEO 堆词明显，用于抢占搜索结果。对无头 Chrome UA 返回 456，具反自动化特征。',
    statutes: ['刑法第266条（诈骗罪）', '反电信网络诈骗法第38条', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-013-trustwallet-net-cn', id: 'EX-013',
    type: 'phishing-crypto-wallet', impersonates: 'Trust Wallet',
    official: 'trustwallet.com', domains: ['trustwallet.net.cn'],
    payload: [], decoy: [], hosting: 'self-hosted (.net.cn)',
    http: 200, bytes: 32339,
    title: 'Trust Wallet(信任钱包App) - 安全存储、发送接收BTC及BNB代币 | 币安Web3钱包',
    note: '域名 trustwallet[.]net[.]cn 与官方 trustwallet.com 分属不同注册体系，页面自称"信任钱包App"官方下载并借"币安Web3钱包"背书。被 EX-012 列为"官方"域名，二者构成互引站群。不在公开钓鱼库中。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
];

for (const d of DATA) {
  let note = d.note;
  for (const dm of d.domains) note = note.split(dm).join(obf(dm));

  const L = [];
  L.push('# 自动生成于 scripts/gen-meta2.mjs（原创发现批次）');
  L.push(`id: ${d.id}`);
  L.push(`dir: ${d.dir}`);
  L.push(`type: ${d.type}`);
  L.push('status: active');
  L.push(`impersonates: ${q(d.impersonates)}`);
  L.push(`official_domain: ${d.official}`);
  L.push('domains:');
  for (const dm of d.domains) L.push(`  - ${q(obf(dm))}`);
  if (d.payload.length) {
    L.push('payload:');
    for (const p of d.payload) L.push(`  - ${q(p)}`);
  } else L.push('payload: []');
  if (d.decoy.length) {
    L.push('decoy_links:');
    for (const x of d.decoy) L.push(`  - ${q(x)}`);
  } else L.push('decoy_links: []');
  L.push(`hosting: ${q(d.hosting)}`);
  L.push('discovery:');
  L.push('  method: 域名变体主动探测（scripts/discover.mjs）');
  L.push('  originality: 经比对，不在 OpenPhish 公开源与 Phishing.Database 活跃列表中');
  L.push('  compared_at: ' + q(NOW));
  L.push('  references_count: 2');
  L.push('verified:');
  L.push(`  at: ${q(NOW)}`);
  L.push(`  http_status: ${d.http}`);
  L.push(`  page_title: ${q(d.title)}`);
  L.push(`  bytes: ${d.bytes}`);
  L.push('  method: curl + 浏览器 UA / Playwright 渲染');
  L.push('evidence:');
  L.push(`  note: ${q(note)}`);
  L.push('legal:');
  L.push('  classification: 诈骗类');
  L.push('  statutes:');
  for (const s of d.statutes) L.push(`    - ${q(s)}`);
  L.push('report:');
  L.push('  entry_12377: "https://www.12377.cn/jbxzxq/zpljbxzxq.html"');
  L.push('  entry_12321: "https://www.12321.cn/"');
  L.push('  entry_cyberpolice: "https://cyberpolice.mps.gov.cn/wfjb/"');
  L.push('  local: "report/12377.md"');

  fs.writeFileSync(path.join(EX, d.dir, 'meta.yaml'), L.join('\n') + '\n', 'utf8');
  console.log('wrote', d.dir);
}
