# 载荷溯源（Payload Forensics）

> 对已收录证物中的**下载地址**做状态核查与归属分析。
> 采集时间：2026-10-29 17:50 (+08:00)
> **本仓库不下载、不托管任何 APK 文件本体**，仅记录 URL 与其响应状态。

---

## 一、四条载荷的当前状态

| 载荷 URL | 对应证物 | HTTP | 大小 | 判定 |
|---|---|---|---|---|
| `down.cryptowalletapp[.]cn/trustwallet.apk` | EX-001 | 000 | — | 已失效（无法连接） |
| `crypto-wallet[.]im/MetaMask.apk` | EX-002 | 000 | — | 已失效（无法连接） |
| `down.dappstroe[.]net/trustwallet.apk` | **EX-012** | **200** | **5,226,064 字节** | ⚠️ **仍在分发** |
| `app-store.s3.cn-north-1.jdcloud-oss.com/CoinbaseWallet.apk` | EX-003 / EX-010 | 403 | 210 | 账号被停用，文件不可取 |

---

## 二、京东云存储桶：一条可交给警方的归属线索

对存储桶发起列举请求时，服务端返回了完整的错误体：

```
GET https://app-store.s3.cn-north-1.jdcloud-oss.com/?list-type=2&max-keys=50
→ HTTP 403

<Error>
  <statusCode>403</statusCode>
  <Code>AccountProblem</Code>
  <Message>pin=[caishendao5918] is disabled</Message>
  <Resource>/app-store/</Resource>
  <RequestId>8D9359C28E784210</RequestId>
</Error>
```

**解读**：

| 字段 | 含义 |
|---|---|
| `app-store` | 存储桶名称，在京东云 cn-north-1 区域 |
| `pin=[caishendao5918]` | 该桶所属**京东云账号标识** |
| `is disabled` | 该账号已被停用 |
| `AccountProblem` | 账号层面的封禁，不是权限问题 |

**价值**：公开钓鱼库只告诉你"哪个域名是恶意的"，不会告诉你"背后的云账号是谁"。这条 `pin` 是平台侧的实名主体线索，举报时可直接提供给警方与云服务商，用于追溯注册人。

**注意**：`caishendao5918` 是账号标识，不等于真实姓名。本仓库不对其身份作任何推断。

---

## 三、团伙关联的实证

`CoinbaseWallet.apk` 这个存储桶路径，同时出现在两个互不相同的仿冒站中：

- EX-003 `coinbasewallet[.]com[.]cn`
- EX-010 `coinbase-web3[.]com`

两个域名 → 同一个 APK URL → **同一个投放方**。

这是公开情报库给不了的信息：库按域名记录，不按载荷聚类。**并案举报时，这类"同载荷多域名"的关联是最有分量的材料。**

---

## 四、仍然存活的载荷意味着什么

`down.dappstroe[.]net/trustwallet.apk`（5.2 MB）目前仍可下载，由 EX-012 `binance-china[.]com` 引用。

**处理优先级建议**：

1. 该 APK 是当前唯一仍在分发中的样本，应优先举报下架
2. `dappstroe[.]net` 的托管方（域名注册商 / 云服务商）应同步收到 abuse 投诉
3. 本仓库**不下载该文件**，因此无法给出其哈希与行为分析——这需要由有资质的安全机构或公安机关取证

---

## 五、复现命令

```powershell
# 仅查状态码与大小，不下载正文
curl.exe -s -o NUL -L -w "%{http_code} %{size_download}" "https://down.dappstroe.net/trustwallet.apk"

# 读取存储桶错误体（归属线索来源）
curl.exe -s "https://app-store.s3.cn-north-1.jdcloud-oss.com/?list-type=2&max-keys=50"
```

---

**边界**：本节所有结论仅基于 HTTP 响应头与错误体，未对 APK 本体做任何分析。
