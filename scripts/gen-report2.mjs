#!/usr/bin/env node
/**
 * 批次二（EX-008~013）举报词生成。
 * 真实网址置于代码块内（GitHub 不会自动链接），便于用户整段复制提交。
 */
import fs from 'node:fs';
import path from 'node:path';

const EX = path.resolve('01-Exhibits');

const DATA = [
  {
    dir: 'Exhibit-008-tokenpocket-web3', id: 'EX-008',
    site: 'tokenpocket-web3.cn', url: 'https://tokenpocket-web3.cn/',
    brand: 'TokenPocket（官方域名 tokenpocket.pro）', payload: '',
    fact: '该网站以"TPwallet官方网站 - 领先的多链数字货币交易钱包平台"为标题，冒充 TokenPocket 官方站点。TokenPocket 官方域名为 tokenpocket.pro，该站使用 tokenpocket-web3.cn，二者无关联，属仿冒钱包官网引流。',
    extra: '',
  },
  {
    dir: 'Exhibit-009-tokenpocket-china', id: 'EX-009',
    site: 'tokenpocket-china.com', url: 'https://tokenpocket-china.com/',
    brand: 'TokenPocket（官方域名 tokenpocket.pro）', payload: '',
    fact: '该网站标题为"TokenPocket 官网 - TP钱包(中文版)下载"，直接自称官方中文站。TokenPocket 官方域名为 tokenpocket.pro，该站使用 tokenpocket-china.com，二者无关联。站内将自身域名标注为"官方"，并使用 Medium 账号 tokenpocket-gm 作信任背书。另有反自动化特征：对常见采集工具返回 456 异常码，须伪装浏览器才能访问。',
    extra: '该站存在反自动化检测，说明其运营者有意规避监督取证。',
  },
  {
    dir: 'Exhibit-010-coinbase-web3', id: 'EX-010',
    site: 'coinbase-web3.com', url: 'https://coinbase-web3.com/',
    brand: 'Coinbase（官方域名 coinbase.com）',
    payload: 'https://app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk',
    fact: '该网站以"Coinbase官网 - 购买、存储和出售数字货币"为标题冒充 Coinbase 官方。Coinbase 官方域名为 coinbase.com，该站使用 coinbase-web3.com，二者无关联。站内提供的安装包托管于京东云对象存储（cn-north-1）桶中。',
    extra: '重要关联线索：该站分发的 APK 与另一仿冒站 coinbasewallet[.]com[.]cn（本仓库 EX-003）指向完全相同的文件地址，可判定为同一投放方的多域名站群。建议并案核查。',
  },
  {
    dir: 'Exhibit-011-binance-download', id: 'EX-011',
    site: 'binance-download.com', url: 'https://binance-download.com/',
    brand: 'Binance 币安（官方域名 binance.com）', payload: '',
    fact: '该网站以"币安Binance | 全球领先的加密货币交易平台 - 官方App下载与注册"为标题，冒充币安官方下载站。币安官方域名为 binance.com，该站使用 binance-download.com，二者无关联，并将自身域名标注为官方。',
    extra: '',
  },
  {
    dir: 'Exhibit-012-binance-china', id: 'EX-012',
    site: 'binance-china.com', url: 'https://binance-china.com/',
    brand: 'Binance 币安（官方域名 binance.com）',
    payload: 'https://down.dappstroe.net/trustwallet.apk',
    fact: '该网站以"Binance官网 | Binance钱包App 官方下载 | Binance Web3 去中心化探索"为标题冒充币安官网。币安官方域名为 binance.com，该站使用 binance-china.com，二者无关联。站内提供的安装包托管于第三方域名 dappstroe.net，同时把 trustwallet.net.cn（另一仿冒站，本仓库 EX-013）标注为"官方"，构成互引站群。',
    extra: '该站存在反自动化检测（对常见采集工具返回 456），并大量堆砌关键词抢占搜索结果。',
  },
  {
    dir: 'Exhibit-013-trustwallet-net-cn', id: 'EX-013',
    site: 'trustwallet.net.cn', url: 'https://trustwallet.net.cn/',
    brand: 'Trust Wallet（官方域名 trustwallet.com）', payload: '',
    fact: '该网站以"Trust Wallet(信任钱包App) - 安全存储、发送接收BTC及BNB代币 | 币安Web3钱包"为标题，冒充 Trust Wallet 中文站。Trust Wallet 官方域名为 trustwallet.com，该站使用 trustwallet.net.cn，分属不同注册体系且无关联。该域名被另一仿冒站 binance-china.com（EX-012）标注为"官方"。',
    extra: '',
  },
];

for (const d of DATA) {
  const L = [];
  L.push(`# 12377 举报词 — ${d.id}`);
  L.push('');
  L.push(`> 目标：\`${d.site.replace(/\./g, '[.]')}\`（域名已混淆展示；真实地址见下方代码块）`);
  L.push('> 举报类别：**诈骗类**');
  L.push('> 发现方式：**原创发现**，该域名不在 OpenPhish、Phishing.Database 等公开钓鱼库中');
  L.push('');
  L.push('---');
  L.push('');
  L.push('## 涉事网址');
  L.push('');
  L.push('```text');
  L.push(d.url);
  L.push('```');
  L.push('');
  L.push('## 举报描述（可直接复制）');
  L.push('');
  L.push('```text');
  L.push(`举报人反映，网站 ${d.url} 涉嫌仿冒知名数字资产平台实施诈骗。`);
  L.push('');
  L.push(d.fact);
  if (d.payload) {
    L.push('');
    L.push(`该站提供的下载地址为：${d.payload}`);
  }
  L.push('');
  L.push('上述行为涉嫌违反《中华人民共和国反电信网络诈骗法》相关规定，并可能构成《中华人民共和国刑法》第二百六十六条规定的诈骗罪。恳请依法核查处置，并对相关域名及下载链接予以拦截。');
  L.push('```');
  L.push('');
  L.push('## 证据材料');
  L.push('');
  L.push('| 文件 | 内容 |');
  L.push('| --- | --- |');
  L.push('| `screenshot.png` | 页面全页截图，含完整网址与采集时间 |');
  L.push('| `page.html` | 采集时的页面源码（可检索到上述下载地址/仿冒内容） |');
  L.push('| `meta.yaml` | 结构化记录（状态码、标题、核验时间、原创发现比对结果） |');
  L.push('| `sha256.txt` | 文件哈希，用于校验未被篡改 |');
  L.push('');
  L.push('## 法律依据');
  L.push('');
  L.push('- 《中华人民共和国刑法》第二百六十六条（诈骗罪）');
  L.push('- 《中华人民共和国反电信网络诈骗法》第三十八条');
  L.push('- 《中华人民共和国反不正当竞争法》第六条（擅自使用他人有一定影响的域名主体部分、网站名称等）');
  L.push('');
  if (d.extra) {
    L.push('## 补充说明');
    L.push('');
    L.push(d.extra);
    L.push('');
  }
  L.push('---');
  L.push('');
  L.push('## 提交步骤');
  L.push('');
  L.push('1. 打开 12377 违法和不良信息举报中心 → 选择「诈骗类」');
  L.push('   入口：https://www.12377.cn/jbxzxq/zpljbxzxq.html');
  L.push('2. 「举报网址」一栏，从上方代码块复制完整地址粘贴');
  L.push('3. 「举报内容」一栏，复制下方"举报描述"全文粘贴');
  L.push('4. 上传本目录下的 `screenshot.png`');
  L.push('5. 提交后记录受理编号');
  L.push('');
  L.push('## 核验记录');
  L.push('');
  L.push(`- 仿冒对象：${d.brand}`);
  L.push('- 采集时间：2026-10-29（+08:00）');
  L.push('- 原创性比对：已比对 OpenPhish 公开源与 Phishing.Database 活跃列表（392,164 条），均未收录');
  L.push('');
  L.push('> 该域名不在公开钓鱼库中，意味着常规的库查询无法发现它——这正是本次举报的价值所在。');
  L.push('');

  fs.mkdirSync(path.join(EX, d.dir, 'report'), { recursive: true });
  fs.writeFileSync(path.join(EX, d.dir, 'report', '12377.md'), L.join('\n'), 'utf8');
  console.log('wrote', d.dir, 'report');
}
