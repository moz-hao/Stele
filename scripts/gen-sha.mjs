#!/usr/bin/env node
/**
 * 为每个 Exhibit 生成 sha256.txt，并汇总 INDEX.csv。
 * 哈希覆盖：page.html / meta.yaml / report/12377.md / screenshot.png（存在时）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EX = path.resolve('01-Exhibits');
const dirs = fs.readdirSync(EX, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith('Exhibit-'))
  .map((e) => e.name)
  .sort();

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows = [];

for (const d of dirs) {
  const base = path.join(EX, d);
  const candidates = ['page.html', 'meta.yaml', 'report/12377.md', 'screenshot.png'];
  const lines = [];
  for (const rel of candidates) {
    const abs = path.join(base, rel);
    if (fs.existsSync(abs)) {
      lines.push(`${sha(abs)}  ${rel.replace(/\\/g, '/')}`);
    }
  }
  fs.writeFileSync(path.join(base, 'sha256.txt'), lines.join('\n') + '\n', 'utf8');

  const meta = fs.readFileSync(path.join(base, 'meta.yaml'), 'utf8');
  // 注意：page_title / http_status 位于 verified: 下，带缩进
  const get = (k) => {
    const m = meta.match(new RegExp(`^\\s*${k}:\\s*(.*)$`, 'm'));
    if (!m) return '';
    return m[1].trim().replace(/^"|"$/g, '').replace(/\\"/g, '"');
  };
  rows.push({
    id: get('id'),
    dir: d,
    impersonates: get('impersonates'),
    domain: (meta.match(/^\s*-\s*"([^"]+)"/m) || [, ''])[1],
    title: get('page_title'),
    status: get('status'),
    http: get('http_status'),
    payload: /\.apk/.test(meta) ? 'yes' : 'no',
  });
  console.log('hashed', d, `(${lines.length} files)`);
}

const header = 'id,dir,impersonates,domain_obfuscated,page_title,status,http,has_apk';
const csv = [header, ...rows.map((r) =>
  [r.id, r.dir, r.impersonates, r.domain, `"${r.title.replace(/"/g, '""')}"`, r.status, r.http, r.payload].join(',')
)].join('\n');
fs.writeFileSync(path.join(EX, 'INDEX.csv'), csv + '\n', 'utf8');
console.log('\nwrote INDEX.csv');
