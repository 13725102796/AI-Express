# BTC/加密货币收款方案调研

> 调研日期：2026-03-25
> 目标：独立开发者卖数字产品（AI Skills、SaaS 订阅、浏览器插件）如何用 BTC/加密货币收款

---

## 1. ClawHub 原生支付支持情况

### 搜索结果

ClawHub 作为 OpenClaw 的官方 Skill 市场（截至 2026 年 3 月已托管 13,700+ skills），其支付体系如下：

- **创作者分成**：90% 归创作者，以 `$HUB` 代币为经济基础
- **收入潜力**：单个 Skill 可产生 $100-$1,000/月，3-5 个优质 Skill 可达 $500-$3,000/月
- **发布门槛**：需 GitHub 账号（至少一周账龄），通过 `clawhub publish ./my-skill` 发布
- **支付协议**：OpenClaw 生态支持 Machine Payments Protocol (MPP)，底层集成了 Stripe 卡支付、Tempo 稳定币支付、Lightning Bitcoin 支付
- **ClawPay**：有自动付款系统（ClawPay），但具体细节文档不充分
- **Claw Cash**：定位为 "Bitcoin for Agents"，agent 收到稳定币后可转换为 BTC 持有

### 信息缺口

- ClawHub 卖家具体提现流程（法币 or 加密货币）文档不够详细
- `$HUB` 代币的具体用途和流动性信息有限
- 注意：Peter Steinberger（OpenClaw 创始人）从未发行过任何代币，市面上与 OpenClaw 关联的代币均为诈骗

### 来源

- [Myclaw - AI Agent Payments](https://myclaw.ai/blog/ai-agent-payments-visa-stripe-mpp-openclaw)
- [OpenClawCash - ClawHub](https://clawhub.ai/macd2/open-claw-cash)
- [Claw Cash - Bitcoin for Agents](https://clw.cash/)
- [Superframeworks - OpenClaw Make Money Guide](https://superframeworks.com/articles/openclaw-make-money-guide)
- [MoltBook - Get paid automatically with ClawPay](https://www.moltbook.com/post/155e5007-3bfa-4dc0-8637-5ad6fe7cea85)
- [ClawHub Skills Marketplace Developer Guide 2026](https://www.digitalapplied.com/blog/clawhub-skills-marketplace-developer-guide-2026)

---

## 2. 加密支付网关对比

| 方案 | 支持币种 | 手续费 | KYC | 自托管 | 订阅支持 | 集成难度 | 适合场景 |
|------|---------|--------|-----|--------|---------|---------|---------|
| **BTCPay Server** | BTC（含 Lightning）、部分山寨币 | 0%（仅网络费） | 无需 | 是（完全自托管） | 需自行实现 | 中（需服务器） | 最大隐私、零手续费、技术能力强的开发者 |
| **Coinbase Commerce** | BTC, ETH, USDC, LTC, BCH, DAI | 1%（持币）；2-2.5%（转法币） | 是 | 否（托管） | 不原生支持 | 低（API 简单） | 想要品牌信任度、简单集成的开发者 |
| **NOWPayments** | 350+ 币种 | 0.5%（单币）；1%（换币） | 可选 | 非托管选项可用 | 是（原生支持） | 低（API + 插件） | 多币种需求、需要订阅功能 |
| **OpenNode** | 仅 BTC（链上 + Lightning） | 1% | 是 | 否 | 不原生支持 | 极低（<10 行代码） | BTC only、快速集成、Lightning 优先 |
| **CoinGate** | 70+ 币种 | 1% | 是 | 否 | 是（原生支持） | 低（API + 插件） | 需要法币结算、订阅功能 |
| **Speed** | BTC, USDT, USDC | 0%（前 0.5 BTC）；之后 1% | 是（MSB 牌照） | 否 | 不确定 | 低（API + 无代码） | Lightning 优先、BTC + 稳定币 |
| **ATLOS** | 多链代币 | 低（具体未公开） | 完全无需 | 非托管（直接到钱包） | 不确定 | 低 | 最大隐私、零 KYC |
| **Paymento** | 多币种 | 低 | 完全无需 | 非托管（自保管） | 不确定 | 低 | 匿名收款、自控资金 |
| **Stripe（加密功能）** | 稳定币 + Crypto.com 余额 | ~1.5% | 是（Stripe KYC） | 否 | 是（Stripe 原生） | 极低（已有 Stripe 集成） | 已用 Stripe 的开发者、法币+加密混合 |

### 来源

- [BTCPay Server](https://btcpayserver.org/) | [BTCPay Server Review 2026](https://blockfinances.fr/en/btcpay-server-review)
- [Coinbase Commerce](https://www.coinbase.com/commerce) | [Coinbase Commerce Review 2026](https://blockfinances.fr/en/coinbase-commerce-review-fees-guide)
- [NOWPayments Pricing](https://nowpayments.io/pricing) | [NOWPayments Review 2026](https://coingape.com/nowpayments-review/)
- [OpenNode](https://opennode.com/) | [OpenNode Pricing](https://opennode.com/pricing/)
- [CoinGate Pricing](https://coingate.com/pricing)
- [Speed](https://www.tryspeed.com/)
- [ATLOS](https://atlos.io/)
- [Paymento No KYC Gateway](https://paymento.io/crypto-payment-gateway-without-kyc/)
- [Stripe Crypto](https://docs.stripe.com/crypto) | [Stripe + Crypto.com](https://www.crowdfundinsider.com/2026/01/257155-fintech-stripe-teams-up-with-crypto-com-to-enable-cryptocurrency-payments/)

---

## 3. 推荐方案（按场景）

### 场景 A：卖 OpenClaw/ClawHub Skill

**推荐：使用 ClawHub 原生支付 + 独立官网补充**

- ClawHub 已内置支付系统（ClawPay），90% 分成比例极高
- 生态内支持 MPP 协议（Stripe + 稳定币 + Lightning BTC）
- **补充策略**：在 ClawHub 之外建独立官网，用 BTCPay Server 或 NOWPayments 接受直接加密货币付款，绕过平台抽成
- 可发布免费 Skill 引流到付费 SaaS API（freemium 模式）

### 场景 B：独立 SaaS / 数字产品

**推荐方案（按优先级）：**

1. **Stripe（法币） + NOWPayments（加密）混合方案**
   - Stripe 处理信用卡/法币（覆盖 95% 用户）
   - NOWPayments 处理加密货币（350+ 币种，0.5% 费率，原生订阅支持）
   - 两套并行，用户自选支付方式

2. **Stripe（法币） + Coinbase Commerce（加密）**
   - 更简单，品牌信任度更高
   - 缺点：Coinbase Commerce 不支持订阅

3. **纯 Lightning 方案：OpenNode**
   - 适合微支付场景（API 调用计费、按次收费）
   - 1% 手续费，10 行代码集成
   - 适合 BTC-only 的极简方案

### 场景 C：最大隐私（无 KYC）

**推荐方案（按优先级）：**

1. **BTCPay Server（自托管）**
   - 零手续费、零 KYC、完全自控
   - 支持 Lightning Network（亚秒级确认、亚分费用）
   - 需要自己的服务器（VPS $5-20/月）
   - 12,000+ 商家使用，成熟可靠

2. **ATLOS（非托管网关）**
   - 无需注册、无需邮箱、无需手机号
   - 只需一个 Web3 钱包（如 MetaMask）
   - 资金直接到你的钱包

3. **Paymento（自保管）**
   - 非托管、无 KYC
   - 商家完全控制资金

**法律提醒**：非托管网关通常合法（因为不接触用户资金，不触发货币传输许可），但各地法规不同，建议咨询当地法律。

---

## 4. 技术集成指南（最轻量方案）

### 方案 1：最快上手 — OpenNode（10 分钟）

```bash
# 1. 注册 OpenNode 账户 → 获取 API Key
# 2. 创建支付请求（仅需几行代码）
```

```javascript
// Node.js 示例
const opennode = require('opennode');
opennode.setCredentials('YOUR_API_KEY', 'live');

const charge = await opennode.createCharge({
  amount: 9.99,
  currency: 'USD',
  description: 'Premium Skill License',
  callback_url: 'https://yoursite.com/webhook'
});
// charge.lightning_invoice.payreq → Lightning 发票
// charge.chain_invoice.address → 链上地址
```

- 官方提供 PHP、Node.js SDK
- 支持 testnet 环境开发调试
- 来源：[OpenNode Developer Docs](https://developers.opennode.com/docs)

### 方案 2：零费用自托管 — BTCPay Server（1-2 小时）

```bash
# 一键部署（Docker）
# 前提：一台 VPS（推荐 2GB RAM，如 DigitalOcean $12/月）

# 1. SSH 到服务器
# 2. 运行官方部署脚本
wget -O btcpayserver-install.sh https://raw.githubusercontent.com/btcpayserver/btcpayserver-docker/master/btcpay-setup.sh
sudo bash btcpayserver-install.sh \
  --install --domain btcpay.yourdomain.com \
  --letsencrypt-email you@email.com \
  --lightning-implementation lnd

# 3. 访问 https://btcpay.yourdomain.com 完成配置
# 4. 创建 Store → 生成 API Key → 集成到你的应用
```

- 内置 WooCommerce、Shopify 插件
- 提供 Greenfield API（RESTful）
- 支持 Point-of-Sale、支付链接、打赏按钮、众筹
- 来源：[BTCPay Server Setup Guide](https://xtom.com/blog/how-to-setup-btcpay-crypto-payment-processing/) | [BTCPay Server Docs](https://docs.btcpayserver.org/Guide/)

### 方案 3：混合法币+加密 — Stripe + NOWPayments

```javascript
// 前端：用户选择支付方式
// 法币路径 → Stripe Checkout（已有方案）
// 加密路径 → NOWPayments API

// NOWPayments 创建支付
const response = await fetch('https://api.nowpayments.io/v1/payment', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_NOWPAYMENTS_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    price_amount: 29.99,
    price_currency: 'usd',
    pay_currency: 'btc',  // 或 eth, usdt 等
    order_id: 'order_123',
    ipn_callback_url: 'https://yoursite.com/crypto-webhook'
  })
});
// 返回支付地址和金额 → 展示给用户
```

- NOWPayments 还提供订阅 API，适合 SaaS
- 来源：[NOWPayments API Docs](https://nowpayments.io/pricing)

### 方案 4：Stripe 原生加密（最省事，如果已用 Stripe）

2026 年初 Stripe 与 Crypto.com 合作，Crypto.com 用户可用加密余额在 Stripe 商家付款，自动转换为法币入账。

- 无需额外集成，Stripe 自动处理
- 商家收到的是法币，无加密货币波动风险
- 局限：仅限 Crypto.com 用户
- 来源：[Stripe Crypto Docs](https://docs.stripe.com/crypto) | [Stripe + Crypto.com 合作](https://www.pymnts.com/cryptocurrency/2026/stripe-integrates-cryptocom-facilitate-crypto-payments/)

---

## 5. 法律/税务注意事项

### 美国（IRS 规则）

- 加密货币被视为**财产（property）**，收到加密货币付款时需按**收到时的公允市场价值（Fair Market Value）**报告为应税收入
- 自雇者（独立开发者）还需缴纳**自雇税**
- **2026 年新规**：从 2025 税年起，交易所必须签发 Form 1099-DA 报告数字资产交易总收入；从 2026 年 1 月 1 日起，经纪商需报告成本基础
- **CARF（全球加密资产报告框架）**：2026 年 1 月 1 日起生效，加密服务商需收集数据，2027 年起各国税务机关将自动交换信息

### 实操建议

1. **记录每笔加密货币收入的法币价值**（收到时的市场价）
2. **使用税务工具**追踪：如 [Koinly](https://koinly.io/)、CoinTracker 等
3. **考虑即时转换为稳定币或法币**以避免价格波动带来的额外资本利得/损失
4. **非托管网关通常不触发货币传输许可**（因为不接触用户资金），但各辖区规定不同
5. **中国大陆**：加密货币交易目前被禁止，需注意合规风险
6. 建议咨询本地税务/法律顾问

### 来源

- [IRS Digital Assets](https://www.irs.gov/filing/digital-assets)
- [IRS Virtual Currency FAQ](https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-virtual-currency-transactions)
- [Crypto Tax Updates 2026](https://www.taxplaniq.com/blog/crypto-tax-and-digital-asset-updates-what-you-need-to-know-in-2025)
- [Koinly Crypto Tax Guide 2026](https://koinly.io/guides/crypto-taxes/)
- [Bright Tax - Cryptocurrency Reporting 2026](https://brighttax.com/blog/bitcoin-cryptocurrency-tax-reporting-americans-expats/)

---

## 6. 实际案例和经验

### Indie Hackers 社区反馈

来自 [Indie Hackers 讨论帖](https://www.indiehackers.com/post/do-you-accept-crypto-as-payment-3f9cdcc2ce)：

- **手动处理可行**：有开发者收到 2 位客户要求 BTC 付款，手动设置账户完成交易，作为正式集成前的需求验证
- **核心洞察**："我想收加密货币的欲望远大于客户想用加密货币付款的欲望" — 实际需求可能低于预期
- **BTC 升值悖论**：客户不愿花升值资产，稳定币（USDT/USDC）更适合实际支付
- **建议**：先手动测试需求，再决定是否正式集成

### 行业趋势

- **Square 2026 年默认启用 Lightning 支付**：全球约 400 万商家将自动支持 BTC Lightning 付款，零手续费至 2027 年（之后 1%）— [来源](https://lightningnetwork.plus/posts/668)
- **BTCPay Server**：全球 12,000+ 商家使用，开源社区活跃 — [来源](https://github.com/btcpayserver/btcpayserver)
- **Stripe + Crypto.com 合作**（2026 年初）：标志着加密货币支付进入主流支付基础设施 — [来源](https://www.pymnts.com/cryptocurrency/2026/stripe-integrates-cryptocom-facilitate-crypto-payments/)

### ClawHub Skill 卖家收入案例

- 细分领域 Skill（房产分析、食谱生成、法律文档起草）定价 $99-$499 效果最好
- 关键：选择 "有钱且有痛点" 的细分市场
- 免费 Skill 引流到付费 SaaS API 是有效的 freemium 策略
- 来源：[OpenClaw Make Money Guide](https://superframeworks.com/articles/openclaw-make-money-guide)

---

## 7. 结论和建议

### 核心结论

1. **加密支付基础设施已经成熟**：2026 年是一个拐点，Stripe、Square 等主流支付商纷纷集成加密货币支持
2. **Lightning Network 是关键**：亚秒确认、亚分费用，体验可媲美信用卡
3. **但用户需求仍有限**：大多数消费者仍偏好法币，加密支付更多是 "nice to have" 而非 "must have"
4. **混合方案是最优解**：法币 + 加密并行，让用户自选

### 建议行动路线

#### 第一阶段：验证需求（1 天）
- 在产品页面添加 "支持 BTC 付款" 文案
- 用手动方式（发 BTC 地址）处理前几笔加密货币订单
- 统计有多少用户实际选择加密支付

#### 第二阶段：轻量集成（1-3 天）
- **如果已用 Stripe**：无需额外操作，Stripe 已原生支持 Crypto.com 余额支付
- **如果需要更广泛的加密支持**：集成 NOWPayments（0.5% 费率，350+ 币种，支持订阅）
- **如果只需 BTC**：集成 OpenNode（1% 费率，10 行代码）

#### 第三阶段：进阶优化（按需）
- 部署 BTCPay Server 自托管（零手续费、最大隐私）
- 实现 Lightning Network 微支付（适合 API 按次计费）
- 接入 Stripe + 加密网关的双通道结账页面

### 推荐技术栈

| 需求 | 推荐方案 | 成本 |
|------|---------|------|
| 最快上手 | OpenNode | 1% 手续费 |
| 最低成本 | BTCPay Server | $5-20/月 VPS |
| 多币种 + 订阅 | NOWPayments | 0.5-1% 手续费 |
| 品牌信任 | Coinbase Commerce | 1% 手续费 |
| 最大隐私 | BTCPay Server 或 ATLOS | 免费或极低 |
| 法币+加密混合 | Stripe + NOWPayments | Stripe 费率 + 0.5% |
