<user-approval>
  <status>approved</status>
  <approved-at>2026-04-17T14:35:00+08:00</approved-at>
  <approval-message>[A] 通过 — 进入 Phase 2 开发</approval-message>
  <design-source>user-replaced</design-source>
  <replaced-files>
    - pages/P01-home.html
    - pages/P02-paipan.html
    - pages/P03-reading.html
    - pages/P04-profile.html
    - pages/P05-login.html
    - pages/P06-setup.html
  </replaced-files>
  <notes>
    设计系统已从 Phase 0 demo.html「紫金御阁」（暖白底 #FFF8F0 + 深紫 #2D1B69 + 古金 #D4A84B）
    切换为用户提供的「黑金奢华星空风」（纯黑底 #000000 + 经典金 #D4AF37 + 星空背景 + Cinzel/Noto Serif SC）。
    Phase 2 前端代码必须以 pages/ 目录下 18 张 HTML 为视觉基准，严禁回退到 demo.html 的紫金变量。
    page-specs.md 第 0 节已固化「设计系统基线」(CSS 变量、字体栈、布局规范、共享组件)，作为 Phase 2 前端开发的硬约束源。

    P01-P06 由用户外部模型生成；P07-P13 + A01-A05（共 12 张）由 page-design-agent 基于该基线补齐。
    Phase 2 前端代码（uni-app）必须能 1:1 还原 18 张 HTML 的视觉与交互。
  </notes>
</user-approval>

<phase-transition>
<from>phase1</from>
<to>phase2</to>
<completed-at>2026-04-17T14:30:00+08:00</completed-at>

<decisions>
- 最终页面列表（18 张）：
  - 前端 13 张：P01 首页 / P02 命盘（4x4+中宫2x2）/ P03 AI 解读 / P04 个人中心 / P05 登录注册 / P06 生辰完善 / P07 模板商城 / P08 模板详情 / P09 报告详情 / P10 积分中心 / P11 我的模板 / P12 我的报告 / P13 邀请好友
  - 管理后台 5 张：A01 管理员登录 / A02 模板 CRUD / A03 用户管理 / A04 积分配置 / A05 数据概览
- 共享组件（uni-app 实现时建议抽出）：
  - `.starfield` SVG 星空底
  - `.bg-ambient` 顶部径向光晕
  - `.nav` 顶部 sticky 导航
  - `.tab-bar` 底部 4 Tab（首页/命盘/解盘/本我）
  - `.corner-dec` 四角金色装饰
  - `.action-btn` 主 CTA（金线 + hover 发光）
  - `.form-input` / `.native-select` 透明输入 / 原生下拉
  - `.points-card` 积分卡（金币 icon + 大数字）
  - `.aigc-badge` AIGC 标识徽章（页面右下 fixed + 卡片底部声明 + 分享水印 三层）
  - `.palace-cell` 12 宫单元格（4x4 + 中宫 2x2 命盘核心）
- 设计令牌摘要（与 page-specs.md 第 0 节一致）：
  - 主色（金）：#D4AF37 ｜ var(--c-gold)
  - 半透金：rgba(212, 175, 55, 0.4) ｜ var(--c-gold-dim)
  - 背景（纯黑）：#000000 ｜ var(--c-bg)
  - 主文字：rgba(255, 255, 255, 0.9) ｜ var(--text-main)
  - 表单/卡片底（毛玻璃）：rgba(10, 10, 15, 0.8) ｜ var(--form-bg)
  - 错误警示：#ff3333（仅 P04/P05/A 系页面切断/危险动作处使用，禁滥用）
  - 标题字体：Noto Serif SC（拉丁场景用 Cinzel，仅 LOGO/英文徽章）
  - 正文字体：Noto Serif SC，weight 300/400/600
  - 基础间距：8px 网格，常用 8 / 16 / 24 / 32 / 40
  - 标准圆角：卡片 8-12px ｜ 按钮 99px(药丸)/4px(方形)
  - 标准动效：cubic-bezier(0.16, 1, 0.3, 1) ｜ 时长 0.4s
  - hover 发光：box-shadow 0 0 30px rgba(212,175,55,0.2) + inset 0 0 20px rgba(212,175,55,0.2)
- 审查中的设计调整：
  - P02 命盘从原圆形星盘**重写为 4x4 + 中宫 2x2** 传统正方形排布（PRD 硬约束 9）
  - P03 / P09 / P12 / P13 强制加入 AIGC 三层水印（PRD Q7 决策、phase0-to-phase1.md 硬约束 9）
  - 管理后台 5 页全部保持黑金调性（不偏离为普通后台风格）
  - 文案统一为东方感词汇：灵犀点数 / 缘主 / 乾造-坤造 / 凝结命盘 / 神谕推演 / 神谕印记 / 引灵结缘
- Phase 0 紫金御阁系统已被用户替换为黑金风：所有页面验证 `#2D1B69` / `#D4A84B` / `--color-primary` 残留 = 0 处
</decisions>

<file-manifest>
- page-specs.md: 18 页规格 + 设计系统基线 + AIGC DOM 模板 + 文案调性表 + 全局跳转矩阵 — 715 行
- pages/P01-home.html: 首页/终端主脑（已签到/未签到/未排盘）— PASS
- pages/P02-paipan.html: 命盘 4x4+中宫2x2（加载/加载中/错误/未排盘）— PASS（已重写）
- pages/P03-reading.html: AI 解读（流式中/完成/错误退积分）— PASS（含 AIGC 三层水印）
- pages/P04-profile.html: 个人中心 — PASS（含 5 项菜单 + 退出）
- pages/P05-login.html: 登录注册（登录/注册/错误）— PASS
- pages/P06-setup.html: 生辰完善（阳历/农历/提交中）— PASS
- pages/P07-templates.html: 模板商城（正常/加载/空）— PASS（7 个 PRD 预设）
- pages/P08-template-detail.html: 模板详情（未解锁/已解锁/积分不足）— PASS
- pages/P09-report-detail.html: 报告详情（正常/加载/不存在）— PASS（含 AIGC 三层水印）
- pages/P10-points.html: 积分中心（正常/空流水/加载）— PASS
- pages/P11-my-templates.html: 我的模板（有/空）— PASS
- pages/P12-my-reports.html: 我的报告（有/空）— PASS
- pages/P13-invite.html: 邀请好友（有邀请/空）— PASS（含 AIGC 水印）
- pages/A01-admin-login.html: 管理员登录 — PASS
- pages/A02-admin-templates.html: 模板 CRUD（列表/新建/编辑）— PASS（Drawer + 占位符提示 + 上下架 + 软删）
- pages/A03-admin-users.html: 用户管理 — PASS（8 行表格 + 分页）
- pages/A04-admin-points-config.html: 积分配置 — PASS（4 分区 + 编辑 modal）
- pages/A05-admin-stats.html: 数据概览 — PASS（6 数字卡 + Top 5 排行）
- demo.html: Phase 0 紫金御阁版仍保留在目录，但**事实已被 user-replaced**，仅作历史归档，Phase 2 不引用
</file-manifest>

<quality-gate-results>
- 审查总轮次：6 轮（Part A 拆解 3 轮 + Part B 双轨设计 3 轮）
- 整体综合得分：9.47 / 10
  - Part A 拆解审查（3 轮平均）：9.53 / 10
  - Part B 设计审查（3 轮平均）：9.41 / 10
- 所有页面最终状态：18 / 18 全部 PASS
- 紫金变量残留检查：0 处（已严格清除）
- 黑金主色 #D4AF37 应用率：18 / 18
- AIGC 标识三层防护覆盖：P03 / P09 / P12 / P13 全部就位
- 遗留问题（Phase 2 解决）：
  1. P02 命盘**移动端触摸缩放手势** — uni-app Vue 组件实现
  2. P03 流式 SSE **真实逐 token 渲染** — 当前 HTML 为静态预览，需后端 SSE + 前端 EventSource 联调
  3. P05 密码显隐切换 — uni-app `<input type="password">` 配合 toggle
  4. A03 表格 sticky 首列 — uni-app 表格组件特性
  5. 部分新生成页面用了硬编码 `#D4AF37` 而非 `var(--c-gold)` 变量名 — 转 uni-app 时统一抽 token
</quality-gate-results>

<constraints-for-next-phase>
**Phase 2 必须遵守的硬约束（来自 PRD + Phase 0 过渡 + 用户确认门）**：

1. 【后端服务复用，不可另建】后端 FastAPI 业务 API 必须扩展现有服务 `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py`（PRD Q8 已锁死）。已实现 3 个端点：`GET /paipan`（农历文本）、`GET /paipan/solar`（阳历文本）、`GET /paipan/json`（农历 JSON），基于 iztro-py v0.3.4。新业务 API（约 30 个，PRD 第 7.2 节）全部追加到同一服务/同一项目内，禁止另起后端。

2. 【必须新增端点】`GET /paipan/solar/json` 阳历 JSON 排盘接口（PRD Q5 已决但未实现），格式参考现有 `/paipan/json` 实现。

3. 【前端框架】uni-app（Vue 3 + Vite），编译目标：微信小程序（主力）+ H5（引流）双端。状态管理 Pinia，UI 组件库 uni-ui / uv-ui 按需。

4. 【设计系统硬约束】Phase 2 前端代码必须 1:1 还原 pages/ 下 18 张 HTML 的视觉与交互：
   - 主色 `#D4AF37` ｜ 背景 `#000000` ｜ 字体 Noto Serif SC（拉丁 Cinzel）
   - 共享组件抽为 uni-app 公共组件（见 decisions 列表）
   - 严禁引入 demo.html 紫金变量（`#2D1B69` / `#D4A84B`）

5. 【小程序分包策略】（来自 PRD 8.2）：
   - 主包 < 2MB：index/login/profile-setup + 4 个 tabbar 页
   - sub-chart：命盘相关（P02 + 宫位详情）
   - sub-reading：AI 解读 + 报告（P03 / P09）
   - sub-user：积分中心 / 我的模板 / 我的报告（P10 / P11 / P12）

6. 【AIGC 合规】所有 AI 解读输出必须含 AIGC 标识（依据网信办 2025-09 强制规定）：
   - 页面右下角 fixed 徽章
   - 报告卡片底部声明
   - 分享卡水印
   覆盖 P03 / P09 / P12 / P13 + 任何动态生成 AI 内容的页面。

7. 【命盘可视化硬约束】P02 命盘必须 4x4 + 中宫 2x2 合并的传统正方形排布，禁止圆形/其他异形。

8. 【字体许可】仅认思源系列 + 已商用许可字体（Noto Serif SC / Cinzel 已合规）。

9. 【字体 CDN P2 优化】当前 pages/ 用 Google Fonts CDN，国内访问慢，Phase 2 工程化时建议改为字节 CDN 或子集化。

10. 【Gemini API】使用 gemini-2.5-pro（PRD Q1 决策），SSE 流式输出（PRD 7.3 流程），API Key 服务端环境变量存储不暴露前端。

11. 【积分事务一致性】所有积分变动（注册赠送 / 签到 / 分享 / 广告 / 邀请 / 解锁模板 / AI 解读消耗 / 退回）必须服务端事务校验，前端禁止直接改积分；积分扣除与业务动作（如解锁模板、生成报告）必须同事务原子完成（PRD 3.3 边界条件 + 7.3 异常退积分流程）。

12. 【AI 解读异常退积分】Gemini API 超时（>60s）/ 返回空 / 格式异常 时，已扣的 10 积分必须原路退回并写流水（type=refund）；流式输出过程中用户主动关闭页面则不退（已消耗 AI 资源）。

13. 【首次免费解读】PRD v2.1 新增 `User.free_reading_used` 字段：每个新注册用户首次 AI 解读免积分（即使积分余额为 0 也可解读一次），后续按 reading_cost 配置（默认 10）扣费。

14. 【模板占位符】PromptTemplate.prompt_content 支持占位符 `{{排盘数据}}` `{{用户性别}}` `{{用户出生信息}}`，调用 Gemini 前由后端在服务端做替换。

15. 【数据加密】用户 phone 字段必须 AES-256（或同等强度）加密存储；password 用 bcrypt 哈希；JWT Token 有效期 7 天，支持 refresh。

16. 【管理后台隔离】管理后台仅 H5 路由 `/admin`（PRD 5.1），不在小程序中暴露。管理员账号与前端 User 表完全隔离（PRD 6 Admin 表）。

17. 【pages/ 与 P10/P11 跳转】Phase 2 前端路由建议：
   - 已解锁未付费的模板 → P08 模板详情（解锁按钮）
   - 已解锁的模板 → 直接跳 P03 AI 解读
   - 报告条目点击 → P09 报告详情
   - 积分余额点击 → P10 积分中心
   完整跳转矩阵见 page-specs.md 第 4 节。

**架构师 Step 1 必须输出的关键决策**：
- 数据库选型（PRD 推荐 PostgreSQL）+ ORM 选型（建议 SQLAlchemy 2.0 异步 + Alembic）
- 用户认证方案（JWT 实现库选型 + Token 续期机制）
- SSE 在 FastAPI 的实现方式（StreamingResponse + Gemini stream）
- 积分事务的并发安全方案（数据库行锁 / Redis 分布式锁）
- uni-app 的 API 调用层封装（请求拦截器 + Token 注入 + 错误统一处理）
</constraints-for-next-phase>

<context-for-agents>
本项目是「紫微灵犀」— 基于紫微斗数排盘引擎与 Gemini 2.5 Pro 的 AI 国学文化解读平台。
平台：uni-app（Vue 3 + Vite）→ 微信小程序（主力）+ H5（引流）双端，外加独立 H5 管理后台 `/admin`。
商业模式：积分制三阶段（注册送 100 积分 + 首次免费解读，签到/分享/广告/邀请获取，解锁模板 + AI 解读消耗）。

页面（18 张）：
- 前端 13 张：首页 / 命盘 / AI 解读 / 个人中心 / 登录 / 生辰完善 / 模板商城 / 模板详情 / 报告详情 / 积分中心 / 我的模板 / 我的报告 / 邀请好友
- 后台 5 张：管理员登录 / 模板 CRUD / 用户管理 / 积分配置 / 数据概览

设计系统（user-replaced 黑金奢华星空风，已锁定）：
- 主色 #D4AF37（金）｜ 背景 #000000（纯黑）｜ 字体 Noto Serif SC + Cinzel（拉丁场景）
- 共享组件：starfield 星空底 / bg-ambient 光晕 / nav / tab-bar / corner-dec / action-btn / aigc-badge / palace-cell
- 标准动效 cubic-bezier(0.16, 1, 0.3, 1) 0.4s ｜ hover 发光 30px gold-dim

技术约束（硬性，不可绕过）：
- 后端必须扩展 `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py`（FastAPI + iztro-py），不可另建
- 必须新增 `GET /paipan/solar/json` 端点
- 数据库 PostgreSQL，30 个新业务 API（认证 / 用户 / 排盘 / 积分 / 模板 / AI 解读 / 分享 / 管理后台）
- AIGC 三层标识强制（页面徽章 + 卡片声明 + 分享水印）
- 命盘 4x4 + 中宫 2x2 排布
- AI 解读异常必须退积分（事务一致性）
- 首次免费解读（free_reading_used 字段）
- 用户手机号 AES-256 加密，密码 bcrypt，JWT 7 天
- Gemini 2.5 Pro + SSE 流式
- 小程序分包：主包 < 2MB + sub-chart / sub-reading / sub-user

PRD 完整路径：/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/PRD.md（v2.1，992 行）
页面规格完整路径：/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/page-specs.md（715 行，含设计基线第 0 节）
现有后端代码：/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py（271 行，3 个排盘端点）
</context-for-agents>
</phase-transition>
