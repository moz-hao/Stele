#!/usr/bin/env node
/**
 * Stele 验收脚本 —— 对应 doublecheck spec 的 9 条验收标准。
 * 用法: node scripts/verify.mjs [root]
 * 退出码 0 = 全绿；1 = 有失败项。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(process.argv[2] ?? '.');
const fails = [];
const pass = [];

const ok = (m) => pass.push(m);
const bad = (m) => fails.push(m);
const check = (cond, m) => (cond ? ok(m) : bad(m));

const exists = (p) => fs.existsSync(path.join(ROOT, p));

/* ---------- 验收 1：双板块 ---------- */
check(exists('01-Exhibits'), '存在 01-Exhibits/');
check(exists('02-Annals'), '存在 02-Annals/');
check(exists('README.md'), '存在顶层 README.md');
if (exists('README.md')) {
  const r = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  check(/Stele/.test(r), 'README 提及项目名 Stele');
  check(/Exhibits/.test(r) && /Annals/.test(r), 'README 解释两个板块');
  check(/στήλη|石碑/.test(r), 'README 解释 Stele 词源');
}

/* ---------- 验收 2：7 条证物与必需文件 ---------- */
const EXHIBITS = [
  'Exhibit-001-trust-web3',
  'Exhibit-002-metamaskwallet',
  'Exhibit-003-coinbasewallet',
  'Exhibit-004-trustwallllet',
  'Exhibit-005-token-imtoken',
  'Exhibit-006-tokenpocket',
  'Exhibit-007-neteasepay',
];
const REQUIRED = ['meta.yaml', 'page.html', 'screenshot.png', 'sha256.txt', 'report/12377.md'];

const payloadByExhibit = new Map();

for (const ex of EXHIBITS) {
  const dir = path.join('01-Exhibits', ex);
  check(exists(dir), `存在 ${dir}`);
  for (const f of REQUIRED) {
    check(exists(path.join(dir, f)), `${ex}: 存在 ${f}`);
  }
  const metaPath = path.join(ROOT, dir, 'meta.yaml');
  if (fs.existsSync(metaPath)) {
    const meta = fs.readFileSync(metaPath, 'utf8');
    check(/^id:\s*\S+/m.test(meta), `${ex}: meta 有 id`);
    check(/^status:\s*(active|offline)\b/m.test(meta), `${ex}: meta 有 status(active|offline)`);
    check(/^impersonates:/m.test(meta), `${ex}: meta 有 impersonates`);
    check(/^verified:/m.test(meta), `${ex}: meta 有 verified 段`);
    // 收集 payload 中的 APK 地址
    const apks = [...meta.matchAll(/https?:\/\/[^\s"'\]\)]+?\.apk/gi)].map((m) => m[0]);
    payloadByExhibit.set(ex, apks);
  }
}

/* ---------- 验收 2 后半：payload 能在 page.html 中 grep 到 ---------- */
for (const [ex, apks] of payloadByExhibit) {
  const pagePath = path.join(ROOT, '01-Exhibits', ex, 'page.html');
  if (apks.length === 0) continue;
  if (!fs.existsSync(pagePath)) { bad(`${ex}: 缺 page.html，无法校验 payload`); continue; }
  const page = fs.readFileSync(pagePath, 'utf8');
  for (const apk of apks) {
    check(page.includes(apk), `${ex}: payload ${apk} 可在 page.html 中检索到`);
  }
}

/* ---------- 验收 4/5：Annals 四层与时间线 ---------- */
const LAYERS = ['01-facts.md', '02-reports.md', '03-claims.md', '04-debunked.md'];
for (const l of LAYERS) {
  check(exists(path.join('02-Annals', '2025-WHU-Library', l)), `武大档案存在 ${l}`);
}
const debunkedPath = path.join(ROOT, '02-Annals', '2025-WHU-Library', '04-debunked.md');
if (fs.existsSync(debunkedPath)) {
  const d = fs.readFileSync(debunkedPath, 'utf8');
  const rows = [...d.matchAll(/^\|\s*\d+\s*\|/gm)].length;
  check(rows >= 8, `04-debunked 至少列出 8 条辟谣（当前 ${rows}）`);
  check(/核查结论|核查结果/.test(d), '04-debunked 采用「传言 → 核查结论」格式');
}
const timelinePath = path.join(ROOT, '02-Annals', '2025-WHU-Library', 'timeline.yaml');
if (fs.existsSync(timelinePath)) {
  const t = fs.readFileSync(timelinePath, 'utf8');
  check(/2023/.test(t), '时间线覆盖 2023 年起点');
  check(/2025-09-20/.test(t), '时间线覆盖 2025-09-20 通报');
  const nodes = (t.match(/^\s*-\s*date:/gm) || []).length;
  check(nodes >= 8, `时间线节点 ≥ 8（当前 ${nodes}）`);
  check(/source:/.test(t), '时间线节点带来源');
}

/* ---------- 验收 6：大卫哥档案仅元数据 ---------- */
check(exists('02-Annals/2025-DavidGe'), '存在 2025-DavidGe/');
if (exists('02-Annals/2025-DavidGe')) {
  const dgDir = path.join(ROOT, '02-Annals', '2025-DavidGe');
  const vids = fs.readdirSync(dgDir).filter((f) => /\.(mp4|flv|mkv|webm|m4a|mp3)$/i.test(f));
  check(vids.length === 0, `大卫哥档案无音视频本体（发现 ${vids.length} 个）`);
  check(exists(path.join('02-Annals', '2025-DavidGe', 'video-archive.md')), '存在 video-archive.md');
}

/* ---------- 验收 7：混淆自检（仅 md/yaml，page.html 为隔离证据豁免） ---------- */
const TARGET_DOMAINS = [
  'trust-web3.cn',
  'metamaskwallet.com.cn',
  'coinbasewallet.com.cn',
  'trustwallllet.cn',
  'token.hk.cn',
  'tokenpocket.hk.cn',
  'neteasepay.cn',
];
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const textFiles = files.filter((f) => /\.(md|ya?ml|csv|txt)$/i.test(f) && !f.includes(`${path.sep}node_modules${path.sep}`));
let leaks = 0;
for (const f of textFiles) {
  const rel = path.relative(ROOT, f);
  const rawBody = fs.readFileSync(f, 'utf8');
  // 代码块内的真实 URL 不算可点击链接（GitHub 不会自动链接反引号围栏内的内容），
  // 举报词必须给用户可用地址，故对 ``` 围栏内容豁免；围栏外仍然严格禁止。
  const body = rawBody.replace(/```[\s\S]*?```/g, '');
  for (const d of TARGET_DOMAINS) {
    // 未混淆形式：域名前后不是 [ 且不是被 [.] 拆开
    const re = new RegExp(`(?<!\\[)${d.replace(/\./g, '\\.')}(?!\\])`, 'i');
    if (re.test(body) && !rel.startsWith('scripts')) {
      bad(`未混淆域名 ${d} 出现在 ${rel}`);
      leaks++;
    }
  }
  // 裸 http(s) 指向上述域名的可点击链接
  for (const d of TARGET_DOMAINS) {
    const linkRe = new RegExp(`\\]\\(https?:\\/\\/[^)]*${d.replace(/\./g, '\\.')}`, 'i');
    if (linkRe.test(body)) { bad(`可点击链接指向 ${d} 于 ${rel}`); leaks++; }
  }
}
check(leaks === 0, `混淆自检零命中（当前 ${leaks} 处）`);

/* ---------- 验收 8：sha256 可校验 ---------- */
let shaChecked = 0;
for (const ex of EXHIBITS) {
  const shaPath = path.join(ROOT, '01-Exhibits', ex, 'sha256.txt');
  if (!fs.existsSync(shaPath)) continue;
  const lines = fs.readFileSync(shaPath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (!m) continue;
    const [, digest, rel] = m;
    const target = path.join(ROOT, '01-Exhibits', ex, rel.trim());
    if (!fs.existsSync(target)) { bad(`${ex}: sha256 引用的文件不存在 ${rel}`); continue; }
    const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (actual !== digest.toLowerCase()) bad(`${ex}: 哈希不匹配 ${rel}`);
    else shaChecked++;
  }
}
check(shaChecked > 0, `至少校验通过 1 个哈希（当前 ${shaChecked}）`);

/* ---------- 验收 9：缺口标注 ---------- */
const pendingHits = textFiles.filter((f) => {
  if (path.relative(ROOT, f).startsWith('scripts')) return false;
  return /pending-source/.test(fs.readFileSync(f, 'utf8'));
}).length;
ok(`含 pending-source 标注的文件数: ${pendingHits}`);

/* ---------- 输出 ---------- */
console.log('PASS:');
for (const p of pass) console.log('  ✓ ' + p);
if (fails.length) {
  console.log('\nFAIL:');
  for (const f of fails) console.log('  ✗ ' + f);
  console.log(`\n结果: ${pass.length} passed, ${fails.length} failed`);
  process.exit(1);
} else {
  console.log(`\n结果: ${pass.length} passed, 0 failed — GREEN`);
}
