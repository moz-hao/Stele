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
| **EX-008** | TokenPocket | `tokenpocket-web3[.]cn` | 200 | TPwallet官方网站 | — |
| **EX-009** | TokenPocket | `tokenpocket-china[.]com` | 200 | TokenPocket 官网(中文版) | — |
| **EX-010** | Coinbase | `coinbase-web3[.]com` | 200 | Coinbase官网 | ✅ **与 EX-003 同一文件** |
| **EX-011** | 币安 Binance | `binance-download[.]com` | 200 | 币安官方App下载 | — |
| **EX-012** | 币安 Binance | `binance-china[.]com` | 200 | Binance官网 | ✅ `dappstroe[.]net` |
| **EX-013** | Trust Wallet | `trustwallet[.]net[.]cn` | 200 | Trust Wallet(信任钱包App) | — |

机器可读版本：[`INDEX.csv`](INDEX.csv)

---

## 两批证据的区别（重要）

| | EX-001 ~ 007 | **EX-008 ~ 013** |
|---|---|---|
| 来源 | OpenPhish / Phishing.Database 公开情报库 | **原创主动发现** |
| 警方能否自行查到 | 能，查库即可 | **查库查不到** |
| 发现方法 | 读公开 feed | 域名变体枚举 + DNS 解析 + HTTP 实测 + 标题核验 |
| 复用价值 | 低（库里有） | **高（库里没有）** |

### 原创批次的发现方法

见 [`scripts/discover.mjs`](../scripts/discover.mjs)：

1. 以品牌词（trustwallet / imtoken / metamask / tokenpocket / coinbase / binance / alipay / unionpay / icbc / abchina）生成域名变体
2. 逐个 DNS 解析，仅对解析成功的发起 HTTP 请求
3. 抓取 `<title>`，保留**标题中出现品牌名**的（即页面自称是该品牌）
4. 与 OpenPhish 公开 feed、Phishing.Database 活跃列表（**392,164 条**）逐条比对
5. 输出**两边都没有**的条目

**这 6 个域名在比对时均不在上述任意一个库中。** 每条 `meta.yaml` 的 `discovery.originality` 字段记录了比对结论与时间。

### 误报是怎么排除的

枚举会碰到大量无关结果，本批次已剔除：

| 域名 | 实际是什么 | 处理 |
|---|---|---|
| `icbc[.]site` | International Event & Marketing Agency（会展公司） | 剔除 |
| `abchina[.]online` | ABChina 俄语中文学校 | 剔除 |
| `binance[.]online` | 域名待售页 | 剔除 |
| `trustwallet[.]shop` | 域名停放 | 剔除 |
| `alipay[.]cn` | 331 字节占位页，权属不明 | 剔除，不臆断 |

**收录门槛**：页面标题必须明确自称是某品牌官方，且域名与该品牌官方域名无关联。

---

## 一条跨条目的团伙线索

`EX-003`（`coinbasewallet[.]com[.]cn`）与 `EX-010`（`coinbase-web3[.]com`）分发的安装包**指向完全相同的 URL**：

```text
app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk
```

两个域名互不相同、注册时间可能不同，但下载同一个文件——**同一投放方、多域名站群**。

类似地，`EX-012`（`binance-china[.]com`）把 `EX-013`（`trustwallet[.]net[.]cn`）标注为"官方"，构成互引站群。

**这类关联是公开库给不了的**：库只记录单个域名，不告诉你它们同源。并案举报时这是最有分量的材料。

---

## 载荷溯源与国内主体扫描

两份过程记录，都放在 [`_discovery/`](_discovery/)：

| 文件 | 内容 |
|---|---|
| [`payload-forensics.md`](_discovery/payload-forensics.md) | 四条下载地址的当前状态；京东云存储桶的**账号归属线索** |
| [`findings-cn.md`](_discovery/findings-cn.md) | 国内银行/支付/运营商/电商的扫描结果——**阴性**，含原因分析 |

### 两条值得单独看的结论

**一、存储桶暴露了投放方的云账号**

对承载 `CoinbaseWallet.apk` 的京东云存储桶发起列举请求，服务端返回：

```text
<Code>AccountProblem</Code>
<Message>pin=[caishendao5918] is disabled</Message>
```

`pin` 是该桶所属的京东云账号标识，状态为已停用。公开钓鱼库只记录"哪个域名恶意"，不会给出"背后哪个云账号"——这条线索可直接交给警方和云服务商追溯实名主体。

**二、唯一仍在分发的安装包**

| 载荷 | 状态 |
|---|---|
| `down.cryptowalletapp[.]cn/trustwallet.apk` | 已失效 |
| `crypto-wallet[.]im/MetaMask.apk` | 已失效 |
| `down.dappstroe[.]net/trustwallet.apk`（EX-012） | ⚠️ **200 / 5,226,064 字节，仍在分发** |
| 京东云 `CoinbaseWallet.apk` | 403，账号停用 |

**本仓库不下载该文件**，只记录其可用状态。下架它应作为优先事项。

### 国内主体扫描：没抓到，但值得记录

对 17 个国内品牌（8 家银行、支付、3 家运营商、电商、12306）生成 700+ 变体，60 个命中品牌词，逐个核查后**没有一条达到收录门槛**——全是域名出售页、企业自有保护域名、SEO 引流站（如 `12306[.]org[.]cn`，无凭据收集）或跳转劫持页。

原因写在 [`findings-cn.md`](_discovery/findings-cn.md)：国内大品牌的域名变体被域名投资人占满，而真正的短信钓鱼用随机域名（如本仓库早期排除的 `wcnv20[.]cn`），**枚举法对这类目标无效**。

阴性结果照样记录——否则下一个人会以为没跑过。

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
