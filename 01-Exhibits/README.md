# 01-Exhibits — 呈堂证物

> 法庭上证据按 Exhibit A、B、C 编号呈堂。这里每个仿冒站就是一件物证。

**7 个条目，全部于 2026-10-29 实测存活（HTTP 200）。**
每个条目都满足四要素：情报源标记为钓鱼 → 实测 200 → 页面自称是某品牌 → 域名不属于该品牌。

---

## 索引

| 编号 | 仿冒对象 | 站点（已混淆） | 状态 | 页面标题 | 假 APK |
|---|---|---|---|---|---|
| EX-001 | Trust Wallet | `trust-web3[.]cn` | 200 | Trust Wallet官方下载安装 | ✅ |
| EX-002 | MetaMask | `metamaskwallet[.]com[.]cn` | 200 | MetaMask官网 | ✅ |
| EX-003 | Coinbase | `coinbasewallet[.]com[.]cn` | 200 | Coinbase 安全加密钱包 | ✅ |
| EX-004 | Trust Wallet（typо-squatting） | `trustwallllet[.]cn` | 200 | tp官方正版下载 | — |
| EX-005 | imToken | `token[.]hk[.]cn` | 200 | imToken 官网 | — |
| EX-006 | TokenPocket | `tokenpocket[.]hk[.]cn` | 200 | TokenPocket 你的通用数字钱包 | — |
| EX-007 | 网易支付 | `neteasepay[.]cn` | 200 | 网易支付 | — |

机器可读版本：[`INDEX.csv`](INDEX.csv)

---

## 这批目标为什么构成"违法"

两个层面的问题叠加：

**一、仿冒知名钱包/支付平台**
域名与官方毫无关联，页面却自称"官方下载"。Trust Wallet 官方是 `trustwallet.com`、MetaMask 是 `metamask.io`、imToken 是 `token.im`、TokenPocket 是 `tokenpocket.pro`、Coinbase 是 `coinbase.com`、网易支付是 `pay.163.com`。

**二、分发非官方安装包**
EX-001/002/003 提供 APK 下载，全部指向非官方域名：

| 编号 | 假 APK 托管位置 |
|---|---|
| EX-001 | `down.cryptowalletapp[.]cn` |
| EX-002 | `crypto-wallet[.]im` |
| EX-003 | **京东云对象存储** `app-store.s3.cn-north-1.jdcloud-oss.com` |

加密钱包类 App 一旦被替换为仿冒版，攻击者即可获取用户助记词，直接转走资产——这是纯粹的财产犯罪。

---

## 怎么用这些材料去举报

### 三分钟流程

1. 进入某一编号目录，例如 [`Exhibit-002-metamaskwallet/`](Exhibit-002-metamaskwallet/)
2. 打开 `report/12377.md`，里面有填好的举报词
3. 到 [12377 诈骗类入口](https://www.12377.cn/jbxzxq/zpljbxzxq.html) 填表
4. 举报网址从代码块复制（代码块里的地址是完整的真实地址）
5. 上传同目录的 `screenshot.png`
6. 提交，记下受理编号

### 还可以同时投给平台方

平台 abuse 通道通常比走司法程序处理更快：

- EX-001 `trust-web3[.]cn` — 域名注册商 abuse
- EX-002 `metamaskwallet[.]com[.]cn` — 域名注册商 abuse
- EX-003 `coinbasewallet[.]com[.]cn` — **京东云**（承载 APK 的对象存储）+ 域名注册商
- EX-004/005/006 — 域名注册商 abuse
- EX-007 `neteasepay[.]cn` — 网易品牌保护通道 + 域名注册商

---

## 每件证物里有什么

```
Exhibit-XXX/
├─ meta.yaml        # 结构化记录：状态码、标题、载荷、来源、法条
├─ page.html        # 采集时的页面源码（可 grep 到假 APK 地址）
├─ screenshot.png   # 全页截图，底部红条含完整 URL + 采集时间
├─ sha256.txt       # 四个文件的哈希，用于校验未被篡改
└─ report/
   └─ 12377.md      # 可直接粘贴的举报词
```

**校验完整性**：

```powershell
Get-Content .\01-Exhibits\Exhibit-001-trust-web3\sha256.txt
Get-FileHash .\01-Exhibits\Exhibit-001-trust-web3\page.html -Algorithm SHA256
```

两个哈希一致，说明文件自采集后未被改动。

---

## 关于取证的真实性

| 可能的疑问 | 说明 |
|---|---|
| 会不会是正常网站？ | 页面自称品牌 A，域名却不属于 A，且下载包来自第三个域名。三者互不相关，仿冒成立。 |
| 会不会截图造假？ | 截图底部红条含完整 URL 与精确到秒的时间；`page.html` 与 `sha256.txt` 可交叉校验。 |
| EX-003 截图怎么是黑的？ | 该站在无头浏览器中渲染为空白（body 文本长度 0、DOM 约 1.6KB），而静态抓取返回 58KB 完整 HTML——判断其针对自动化做了差异化处理。已如实标注，内容以 `page.html` 为准。 |
| EX-001 标题是中文、截图是英文？ | 同一站点在不同请求下返回不同语言版本。该差异已记入 `meta.yaml`，属取证信息而非矛盾。 |

---

## 复现命令

```powershell
# 重新抓取页面源码
node scripts/capture-shots.mjs
# 重新生成 meta.yaml
node scripts/gen-meta.mjs
# 重新生成举报词
node scripts/gen-report.mjs
# 重算哈希与索引
node scripts/gen-sha.mjs
# 跑验收
node scripts/verify.mjs .
```

---

← 返回 [仓库首页](../README.md)
