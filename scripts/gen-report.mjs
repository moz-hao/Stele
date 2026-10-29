#!/usr/bin/env node
/**
 * 生成 report/12377.md。
 * 关键设计：真实网址放在 ``` 代码块内 —— GitHub 不会把代码块里的 URL 自动转成可点击链接，
 * 但用户可以整段复制去提交。既满足"零可点击链接"，又不牺牲可用性。
 */
import fs from 'node:fs';
import path from 'node:path';

const EX = path.resolve('01-Exhibits');

const DATA = [
  {
    dir: 'Exhibit-001-trust-web3',
    id: 'EX-001',
    site: 'trust-web3.cn',
    url: 'https://trust-web3.cn/',
    brand: 'Trust Wallet（官方域名 trustwallet.com）',
    payload: 'https://down.cryptowalletapp.cn/trustwallet.apk',
    fact: '该网站以"Trust Wallet官方下载安装 | 多币种数字货币钱包"为标题，冒充 Trust Wallet 官方下载站。页面同时放置指向官网 trustwallet.com 的链接以伪装正规，但实际下载按钮指向非官方域名 down.cryptowalletapp.cn 下的 trustwallet.apk。用户安装该 APK 后，所谓"钱包"实为仿冒程序，存在诱导用户输入助记词、盗取数字资产的风险。',
    extra: '',
  },
  {
    dir: 'Exhibit-002-metamaskwallet',
    id: 'EX-002',
    site: 'metamaskwallet.com.cn',
    url: 'https://metamaskwallet.com.cn/',
    brand: 'MetaMask（官方域名 metamask.io）',
    payload: 'https://crypto-wallet.im/MetaMask.apk',
    fact: '该网站以"MetaMask官网 - 全球领先的以太坊&Web3钱包"为标题，冒充 MetaMask 官方网站。MetaMask 官方域名为 metamask.io，而该站使用 metamaskwallet.com.cn，二者无关联。站内提供非官方 APK 下载地址 crypto-wallet.im/MetaMask.apk。',
    extra: '',
  },
  {
    dir: 'Exhibit-003-coinbasewallet',
    id: 'EX-003',
    site: 'coinbasewallet.com.cn',
    url: 'http://coinbasewallet.com.cn/',
    brand: 'Coinbase（官方域名 coinbase.com）',
    payload: 'https://app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk',
    fact: '该网站以"Coinbase - 安全加密钱包,购买和出售比特币、以太坊及其他可靠币种"为标题，冒充 Coinbase 钱包。Coinbase 官方域名为 coinbase.com，该站使用 coinbasewallet.com.cn，二者无关联。站内提供的 APK 托管于京东云对象存储（cn-north-1）桶中，属合法云服务被用于分发可疑安装包。',
    extra: '建议同步向云服务商（京东云）提交滥用投诉，请求下架该对象存储文件。',
  },
  {
    dir: 'Exhibit-004-trustwallllet',
    id: 'EX-004',
    site: 'trustwallllet.cn',
    url: 'http://trustwallllet.cn/',
    brand: 'Trust Wallet（官方域名 trustwallet.com）',
    payload: '',
    fact: '该域名 trustwallllet.cn 以三个连续字母 l 的方式拼写伪装"trust wallet"，属于典型域名抢注式仿冒（typo-squatting）。页面标题为"tp官方正版下载|TP官方下载安卓最新版本2025·(TPWallet)"，自称官方正版下载站，与 Trust Wallet 官方无关联。',
    extra: '',
  },
  {
    dir: 'Exhibit-005-token-imtoken',
    id: 'EX-005',
    site: 'token.hk.cn',
    url: 'http://token.hk.cn/',
    brand: 'imToken（官方域名 token.im）',
    payload: '',
    fact: '该网站以"imToken 官网｜以太坊和比特币钱包"为标题冒充 imToken 官方。imToken 官方域名为 token.im，该站使用 token.hk.cn，二者无关联，并外链至仿冒站 imtoken.fans。',
    extra: '',
  },
  {
    dir: 'Exhibit-006-tokenpocket',
    id: 'EX-006',
    site: 'tokenpocket.hk.cn',
    url: 'http://tokenpocket.hk.cn/',
    brand: 'TokenPocket（官方域名 tokenpocket.pro）',
    payload: '',
    fact: '该网站以"TokenPocket - 你的通用数字钱包"为标题冒充 TokenPocket 官方。页面同时混入真官网 tokenpocket.pro 与仿冒域名 tokenpocket.sbs 的链接，用于混淆用户对真伪的判断。',
    extra: '',
  },
  {
    dir: 'Exhibit-007-neteasepay',
    id: 'EX-007',
    site: 'neteasepay.cn',
    url: 'http://neteasepay.cn/',
    brand: '网易支付（官方域名 pay.163.com）',
    payload: '',
    fact: '该网站页面标题为"网易支付"，并在页面中直接使用"网易支付（杭州）有限公司版权所有"字样及 ICP 备案号"浙B2-20100458"。经核对，该备案号系网易支付真实备案信息，网易支付官方域名为 pay.163.com，与 neteasepay.cn 无关联，属冒用企业名称与备案号。',
    extra: '说明：该页为约 2KB 的静态仿冒页，采集时未观测到登录表单，故"正在收取用户凭据"这一情节尚无直接证据，仅就冒用企业名称与备案号的事实举报。',
  },
];

const HEADER_STEPS = `## 提交步骤

1. 打开 12377 违法和不良信息举报中心 → 选择「诈骗类」
   入口：https://www.12377.cn/jbxzxq/zpljbxzxq.html
2. 「举报网址」一栏，从下方代码块中复制完整地址粘贴
3. 「举报内容」一栏，复制下方"举报描述"全文粘贴
4. 上传本目录下的 \`screenshot.png\` 作为截图证据
5. 提交后记录受理编号
`;

let count = 0;
for (const d of DATA) {
  const lines = [];
  lines.push(`# 12377 举报词 — ${d.id}`);
  lines.push('');
  lines.push(`> 目标：\`${d.site.replace(/\./g, '[.]')}\`（域名已混淆展示；真实地址见下方代码块）`);
  lines.push('> 举报类别：**诈骗类**');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 涉事网址');
  lines.push('');
  lines.push('```text');
  lines.push(d.url);
  lines.push('```');
  lines.push('');
  lines.push('## 举报描述（可直接复制）');
  lines.push('');
  lines.push('```text');
  lines.push(`举报人反映，网站 ${d.url} 涉嫌仿冒知名数字钱包/支付平台实施诈骗。`);
  lines.push('');
  lines.push(d.fact);
  if (d.payload) {
    lines.push('');
    lines.push(`该站提供的下载地址为：${d.payload}`);
  }
  lines.push('');
  lines.push('上述行为涉嫌违反《中华人民共和国反电信网络诈骗法》相关规定，并可能构成《中华人民共和国刑法》第二百六十六条规定的诈骗罪。恳请依法核查处置，并对相关域名及下载链接予以拦截。');
  lines.push('```');
  lines.push('');
  lines.push('## 证据材料');
  lines.push('');
  lines.push('| 文件 | 内容 |');
  lines.push('| --- | --- |');
  lines.push('| `screenshot.png` | 页面全页截图，含完整网址与采集时间 |');
  lines.push('| `page.html` | 采集时的页面源码（可搜索到上述下载地址/仿冒内容） |');
  lines.push('| `meta.yaml` | 结构化证据记录（状态码、标题、核验时间、来源） |');
  lines.push('| `sha256.txt` | 全部文件的哈希，用于校验未被篡改 |');
  lines.push('');
  lines.push('## 法律依据');
  lines.push('');
  lines.push('- 《中华人民共和国刑法》第二百六十六条（诈骗罪）');
  lines.push('- 《中华人民共和国反电信网络诈骗法》第三十八条');
  lines.push('- 《中华人民共和国反不正当竞争法》第六条（擅自使用他人有一定影响的域名主体部分、网站名称等）');
  lines.push('');
  if (d.extra) {
    lines.push('## 补充说明');
    lines.push('');
    lines.push(d.extra);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push(HEADER_STEPS);
  lines.push('');
  lines.push('## 核验记录');
  lines.push('');
  lines.push(`- 仿冒对象：${d.brand}`);
  lines.push('- 采集方式：curl + 浏览器 UA，记录 HTTP 状态码与页面标题');
  lines.push('- 采集时间：2026-10-29（+08:00）');
  lines.push('- 交叉来源：OpenPhish 公开钓鱼情报源 / Phishing.Database（MIT）');
  lines.push('');
  lines.push('> 若该站点已下线，仍可提交：已下线的域名同样是有效线索，可防止其重新启用。');
  lines.push('');

  fs.mkdirSync(path.join(EX, d.dir, 'report'), { recursive: true });
  fs.writeFileSync(path.join(EX, d.dir, 'report', '12377.md'), lines.join('\n'), 'utf8');
  count++;
}
console.log('wrote', count, 'report/12377.md');
