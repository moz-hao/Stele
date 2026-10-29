#!/usr/bin/env node
/**
 * 由 capture-log.json + 人工核验表生成 7 份 meta.yaml。
 * 域名一律混淆为 [.] 形式；APK 载荷保留原样以便与 page.html 交叉校验。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const EX = path.join(ROOT, '01-Exhibits');
const log = JSON.parse(fs.readFileSync(path.join(EX, 'capture-log.json'), 'utf8').replace(/^\uFEFF/, ''));
const byName = new Map(log.map((r) => [r.Exhibit, r]));

const obf = (d) => d.replace(/\./g, '[.]');

const DATA = [
  {
    dir: 'Exhibit-001-trust-web3',
    id: 'EX-001',
    type: 'phishing-crypto-wallet',
    impersonates: 'Trust Wallet',
    official: 'trustwallet.com',
    domains: ['trust-web3.cn'],
    payload: ['https://down.cryptowalletapp.cn/trustwallet.apk'],
    decoy: ['trustwallet.com'],
    hosting: 'self-hosted (.cn)',
    evidence_note: '页面自称"Trust Wallet官方下载安装"，同时链向官网真地址作案伪装，实际下载指向非官方域名 cryptowalletapp.cn 的 APK。注意：HTML <title> 为中文，而浏览器渲染出的可见内容为英文（完整复刻官网视觉），同一站点在不同请求下返回不同语言版本，该差异本身即取证信息。',
    statutes: ['刑法第266条（诈骗罪）', '反电信网络诈骗法第38条'],
  },
  {
    dir: 'Exhibit-002-metamaskwallet',
    id: 'EX-002',
    type: 'phishing-crypto-wallet',
    impersonates: 'MetaMask',
    official: 'metamask.io',
    domains: ['metamaskwallet.com.cn'],
    payload: ['https://crypto-wallet.im/MetaMask.apk'],
    decoy: [],
    hosting: 'self-hosted (.com.cn)',
    evidence_note: '页面标题"MetaMask官网 - 全球领先的以太坊&Web3钱包"，域名 metamaskwallet.com.cn 非官方（官方为 metamask.io），并提供非官方 APK。',
    statutes: ['刑法第266条（诈骗罪）', '反电信网络诈骗法第38条'],
  },
  {
    dir: 'Exhibit-003-coinbasewallet',
    id: 'EX-003',
    type: 'phishing-crypto-wallet',
    impersonates: 'Coinbase',
    official: 'coinbase.com',
    domains: ['coinbasewallet.com.cn'],
    payload: ['https://app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk'],
    decoy: [],
    hosting: '京东云对象存储（托管恶意的 APK）',
    evidence_note: '仿冒 Coinbase 钱包页面，其 APK 托管在京东云 cn-north-1 对象存储桶中——属于合法云服务被滥用，可同步向云服务商提交 abuse 投诉。注意：该页在无头浏览器中渲染为空白（body 文本长度 0、DOM 约 1.6KB、纯黑背景），而 curl 静态抓取返回约 58KB 完整 HTML，判断其针对自动化环境做了差异化处理；页面实质内容以 page.html 为准。',
    statutes: ['刑法第266条（诈骗罪）', '反电信网络诈骗法第38条', '网络安全法第27条'],
  },
  {
    dir: 'Exhibit-004-trustwallllet',
    id: 'EX-004',
    type: 'phishing-crypto-wallet',
    impersonates: 'Trust Wallet（typo-squatting）',
    official: 'trustwallet.com',
    domains: ['trustwallllet.cn'],
    payload: [],
    decoy: [],
    hosting: 'self-hosted (.cn)',
    evidence_note: '域名 trustwallllet.cn 以三个连续 l 拼写伪装 trust wallet（typo-squatting），页面自称"TP官方正版下载|TP官方下载安卓最新版本"，属仿冒钱包下载站。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-005-token-imtoken',
    id: 'EX-005',
    type: 'phishing-crypto-wallet',
    impersonates: 'imToken',
    official: 'token.im',
    domains: ['token.hk.cn'],
    payload: [],
    decoy: ['imtoken.fans'],
    hosting: 'self-hosted (.hk.cn)',
    evidence_note: '页面标题"imToken 官网｜以太坊和比特币钱包"，域名 token.hk.cn 非官方（官方 token.im），并外链至仿冒站 imtoken.fans。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-006-tokenpocket',
    id: 'EX-006',
    type: 'phishing-crypto-wallet',
    impersonates: 'TokenPocket',
    official: 'tokenpocket.pro',
    domains: ['tokenpocket.hk.cn'],
    payload: [],
    decoy: ['www.tokenpocket.pro', 'tokenpocket.sbs'],
    hosting: 'self-hosted (.hk.cn)',
    evidence_note: '页面标题自称 TokenPocket 官方，同时混链真官网 tokenpocket.pro 与仿冒站 tokenpocket.sbs，用于混淆真伪。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条'],
  },
  {
    dir: 'Exhibit-007-neteasepay',
    id: 'EX-007',
    type: 'phishing-domestic-payment',
    impersonates: '网易支付',
    official: 'pay.163.com',
    domains: ['neteasepay.cn'],
    payload: [],
    decoy: [],
    hosting: 'self-hosted (.cn)',
    evidence_note: '页面标题"网易支付"，并直接盗用网易支付（杭州）有限公司名称与 ICP 备案号 浙B2-20100458。该页为约 2KB 静态仿冒页，未见登录表单，"正在收取凭据"这一环节未被直接观测到。',
    statutes: ['刑法第266条（诈骗罪）', '反不正当竞争法第6条', '互联网信息服务管理办法'],
  },
];

const now = '2026-10-29T15:00:00+08:00';
const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

for (const d of DATA) {
  const row = byName.get(d.dir) ?? {};
  const lines = [];
  lines.push('# 自动生成于 scripts/gen-meta.mjs，手工修改请同步更新生成器');
  lines.push(`id: ${d.id}`);
  lines.push(`dir: ${d.dir}`);
  lines.push(`type: ${d.type}`);
  lines.push(`status: active`);
  lines.push(`impersonates: ${q(d.impersonates)}`);
  lines.push(`official_domain: ${d.official}`);
  lines.push(`domains:`);
  for (const dm of d.domains) lines.push(`  - ${q(obf(dm))}`);
  if (d.payload.length) {
    lines.push('payload:');
    for (const p of d.payload) lines.push(`  - ${q(p)}`);
  } else {
    lines.push('payload: []');
  }
  if (d.decoy.length) {
    lines.push('decoy_links:');
    for (const x of d.decoy) lines.push(`  - ${q(x)}`);
  } else {
    lines.push('decoy_links: []');
  }
  lines.push(`hosting: ${q(d.hosting)}`);
  lines.push('verified:');
  lines.push(`  at: ${q(now)}`);
  lines.push(`  http_status: ${row.HTTP ?? 200}`);
  lines.push(`  page_title: ${q(row.Title ?? '')}`);
  lines.push(`  bytes: ${row.Bytes ?? 0}`);
  lines.push(`  method: curl + browser UA`);
  lines.push('source:');
  lines.push('  name: OpenPhish public feed');
  lines.push('  cross_check: Phishing.Database (MIT)');
  lines.push(`  verified_at: ${q(now)}`);
  // 说明文字里提到的目标域名同样必须混淆，否则校验会（正确地）判为泄漏
  let note = d.evidence_note;
  for (const dm of d.domains) note = note.split(dm).join(obf(dm));
  lines.push('evidence:');
  lines.push(`  note: ${q(note)}`);
  lines.push('legal:');
  lines.push('  classification: 诈骗类');
  lines.push('  statutes:');
  for (const s of d.statutes) lines.push(`    - ${q(s)}`);
  lines.push('report:');
  lines.push('  entry_12377: "https://www.12377.cn/jbxzxq/zpljbxzxq.html"');
  lines.push('  entry_12321: "https://www.12321.cn/"');
  lines.push('  entry_cyberpolice: "https://cyberpolice.mps.gov.cn/wfjb/"');
  if (d.payload.length) {
    lines.push('  abuse_targets:');
    lines.push(`    - ${q('云服务商/域名注册商：' + (d.payload[0].includes('jdcloud') ? '京东云' : '对应托管方'))}`);
  }
  lines.push(`  local: "report/12377.md"`);

  fs.writeFileSync(path.join(EX, d.dir, 'meta.yaml'), lines.join('\n') + '\n', 'utf8');
  console.log('wrote', d.dir);
}
