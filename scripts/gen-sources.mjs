#!/usr/bin/env node
/**
 * 查询 Wayback 存档并生成 sources.md。
 * 429 限流时退避重试；仍失败则记 mirror: pending。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');

const WHU = [
  ['2023-10-12', '中国青年报', '武汉大学：关注到学生举报遭受性骚扰，成立工作组调查', 'http://news.cyol.com/gb/articles/2023-10/12/content_mOmEKWhVvx.html'],
  ['2023-10-12', '央广网', '网传武大男生在图书馆实施性骚扰 校方成立工作组调查', 'http://www.cnr.cn/hubei/yw/20231012/t20231012_526447894.shtml'],
  ['2023-10-13', '央广网', '武汉大学通报"学生举报在图书馆遭性骚扰"事件：给予肖某某记过处分', 'https://www.cnr.cn/hubei/yw/20231013/t20231013_526450383.shtml'],
  ['2025-07-26', '新浪财经', '驳回性骚扰指控！"武大图书馆性骚扰事件"一审宣判', 'https://finance.sina.cn/2025-07-26/detail-infhuqsw2203019.d.html'],
  ['2025-07-31', '澎湃新闻', '武汉大学校长张平文：正在处理"学生性骚扰指控被驳回"事件', 'https://m.thepaper.cn/newsDetail_forward_31277209'],
  ['2025-08-02', '中国青年报', '武大通报"图书馆性骚扰案"：已组建专班，全面复核相关情况', 'https://news.cyol.com/gb/articles/2025-08/02/content_77dK44seEN.html'],
  ['2025-09-20', '央视新闻（中国青年报转载）', '武汉大学通报图书馆事件调查复核情况', 'http://news.cyol.com/gb/articles/2025-09/20/content_PbnYa8fx9J.html'],
  ['2025-09-20', '央广网', '"武大图书馆事件"二审维持原判', 'http://www.cnr.cn/hubei/yw/20250920/t20250920_527369393.shtml'],
  ['2025-09', '济南时报 / 新黄河', '武汉大学杨某媛论文下架，校方和知网回应', 'https://www.jinantimes.com.cn/news-7-5135455.html'],
  ['2026-08', '12321 举报中心', '2026年7月被投诉钓鱼网站TOP10', 'http://www.12321.cn/arc?aid=12143.html'],
];

const DG = [
  ['2025-09-09', 'B站 BV1VeYAzYEJz', '锐评世界记忆冠军大卫哥，星星之火可以燎原（UP：小蓝瓶情感）', 'https://www.bilibili.com/video/BV1VeYAzYEJz'],
  ['2025-09-21', '微博「判难」', '评论：UP主举报杨同学视频下架后补发', 'https://www.sina.cn/news/detail/5345529405374608.html'],
  ['2025-09-24', '微博「a无小邪」', '销冠李老板全网封禁后续', 'https://www.sina.cn/news/detail/5346591208899291.html'],
  ['2025-11-13', 'B站 BV1RQCwBqEGJ', '【补档】大卫哥评价王思聪怼小米（UP：补档大卫哥下架视频）', 'https://www.bilibili.com/video/BV1RQCwBqEGJ'],
  ['2026-08-27', 'B站 BV1FPhc6EE7e', '大卫哥最尴尬的事【痛失女同学市场】（UP：世界记忆冠军大卫哥）', 'https://www.bilibili.com/video/BV1FPhc6EE7e'],
  ['2026-10-19', 'B站 BV1rmJ96BEpu', '接粉丝投稿中英文双语翻译 UC3M收到的杨景媛举报邮件4（UP：CNOCTAVE）', 'https://www.bilibili.com/video/BV1rmJ96BEpu'],
  ['2026-10-29', 'B站接口实测', 'BV11xnh6EE5J 返回 62002 稿件不可见（已删除）', 'https://api.bilibili.com/x/web-interface/view?bvid=BV11xnh6EE5J'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wayback(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`http://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
        headers: { 'User-Agent': 'Stele-Archiver/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 429) { await sleep(4000 * (i + 1)); continue; }
      const j = await r.json();
      const c = j?.archived_snapshots?.closest;
      if (c?.available) return { ok: true, ts: c.timestamp, link: c.url };
      return { ok: false, reason: 'no snapshot' };
    } catch (e) {
      await sleep(2500);
    }
  }
  return { ok: false, reason: 'rate-limited / unreachable' };
}

async function build(dir, title, rows) {
  const out = [];
  out.push(`# sources.md — 来源清单与存档`);
  out.push('');
  out.push(`> ${title}`);
  out.push(`> 采集时间：2026-10-29`);
  out.push('');
  out.push('| 日期 | 来源 | 标题 | 原文 | Wayback 存档 |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const [date, src, t, url] of rows) {
    const wb = await wayback(url);
    const mirror = wb.ok ? `[存档 ${wb.ts.slice(0, 8)}](${wb.link})` : '`pending`';
    out.push(`| ${date} | ${src} | ${t.replace(/\|/g, '\\|')} | \`${url}\` | ${mirror} |`);
    console.log(`${wb.ok ? 'OK ' : 'MISS'} ${url}`);
    await sleep(1600);
  }
  out.push('');
  out.push('## 说明');
  out.push('');
  out.push('- 原文 URL 以代码形式记录，非可点击链接，用于长期定位。');
  out.push('- `pending` 表示 Wayback 暂无快照或查询被限流，可稍后重跑 `node scripts/gen-sources.mjs` 补齐。');
  out.push('- 存档链接为 Internet Archive 第三方副本，其可用性不受本仓库控制。');
  out.push('');
  fs.writeFileSync(path.join(ROOT, dir, 'sources.md'), out.join('\n'), 'utf8');
  console.log(`\nwrote ${dir}/sources.md`);
}

await build('02-Annals/2025-WHU-Library', '武汉大学图书馆事件', WHU);
await build('02-Annals/2025-DavidGe', '"世界记忆冠军大卫哥"视频下架与补档', DG);
