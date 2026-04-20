# Phase 0 → Phase 1 过渡文档

> 项目：紫微灵犀
> 生成方：phase0-orchestrator
> 完成时间：2026-04-17

```xml
<phase-transition>
<from>phase0</from>
<to>phase1</to>
<completed-at>2026-04-17</completed-at>

<decisions>
- 产品定位：基于紫微斗数排盘引擎与 Gemini 2.5 Pro 大语言模型的 AI 国学文化解读平台（uni-app 多端：微信小程序主力 + H5 引流）
- 商业模式：积分制三阶段演进（阶段一免费体验 → 阶段二广告变现 → 阶段三订阅付费），个人主体起步
- 核心功能（P0）：
  1. 用户注册登录（手机号+密码，注册赠 100 积分）
  2. 生辰信息绑定（阳历/农历/13 时辰/性别/闰月）
  3. 紫微斗数排盘 + 十二宫可视化
  4. 积分系统（注册赠送 / 签到 / 分享 / 邀请 / 看广告 / 解锁消耗 / AI 解读消耗）
  5. 模板商城（积分解锁 7 个预设模板：2 免费 + 5 付费）
  6. 后台模板 CRUD
  7. AI 智能解读（Gemini 2.5 Pro SSE 流式输出 + AIGC 标识合规）
  8. 个人中心（积分中心 + 我的模板 + 我的报告）
  9. 签到系统（连续递增 5-20 积分循环）
- 次要功能（P1）：分享裂变（每日上限 30 积分）、邀请奖励 50 积分、广告奖励（阶段二开通）
- 风格方向：东方美学 + 现代极简（"古典智慧，Modern 解读"），紫金御阁配色（与 PRD 9.1 / research-design.md 方案 A 完全对齐）
- 配色方案（HEX 而非 OKLCH，因 PRD 9.1 已用 HEX 锁定）：主色 #2D1B69（深紫）/ 辅色 #5B4A99（紫微亮调）/ 强调色 #D4A84B（古金）/ 背景亮 #FFF8F0（暖宣纸白）/ 背景暗 #1A1025（紫黑）
- 字体方案：标题 思源宋体 Source Han Serif（Noto Serif SC）/ 正文 思源黑体 Source Han Sans（Noto Sans SC）/ 数字 Cormorant Garamond Italic 或 DIN Pro / 字体家族数 ≤ 3
- 动效基调：exponential easing（cubic-bezier(0.25, 1, 0.5, 1)）+ 入场 640ms / 状态变化 280ms / 即时反馈 150ms / 仅动 transform + opacity / 拒绝 bounce + elastic
- 页面数量（待 Phase 1 page-design-agent 拆分确认）：粗估 12-16 页（含登录、生辰完善、首页、命盘、模板商城、模板详情、AI 解读、解读结果、积分中心、个人中心、签到、分享、管理后台 5 页）
- 设计调性：专业可信 / 东方雅致 / 温暖亲近 / 科技赋能（PRD 9.3）
</decisions>

<file-manifest>
- PRD.md: v2.1 复核版（v2.0 终稿基础上 Edit 补充，未重组结构）— 11 章节（产品概述 / 用户画像 / 9 大功能需求 / 非功能需求 / 信息架构 / 9 张数据表模型 / 30 个 API / 多端适配 / 设计指引 9.1-9.7 / 范围边界 / 开放问题）— 992 行（v2.0 是 803 行，本版补充 189 行：6 项待决决策详情 + 9.4-9.7 完整设计系统 + AIGC 合规边界 + 首次免费解读边界 + User 表 free_reading_used 字段）
- demo.html: 1149 行单文件 / 完整 CSS 变量令牌（17 个色彩 + 7 级字号 + 8 级间距 + 5 级圆角 + 4 级阴影 + 4 级动效）/ 6 个组件样例（按钮三态 + 输入框 + 6 种 Badge + 积分卡 + 模板卡 + 解读卡）/ 命盘 4x4 完整十二宫可视化 + 中宫 2x2 合并展示 / 真实场景模拟（手机框首页 + AI 解读流式 + AIGC 标识）/ 5 个 section（hero + color + type + component + scene + motion）
- research-market.md: 含 5 大核心发现 — (1) 玄学市场约 1000 亿元/年，紫微细分 30-50 亿；(2) DeepSeek 引爆后 AI 命理重新升温，FateTell 半月付费翻 3 倍；(3) 文墨天机 UI 老旧 / 神机阁 AI 弱，"AI 深度解读 + 年轻化 UX" 是空白；(4) 用户反感强付费但接受看广告换积分，故积分制路径正确；(5) 网信办 2025-09 起强制 AIGC 标识，须三层合规防护
- research-design.md: 推荐方案 A "紫金御阁"（首选 5/5 星）与 PRD 9.1 完全对齐 — 主色 #2D1B69 + 辅色 #5B4A99 + 强调色 #D4A84B + 暖宣纸白 #FFF8F0；字体推荐思源宋体 + 思源黑体（免费商用 SIL OFL 协议）；设计红线含禁用项（廉价紫 / 大红 / 卡通 / 欧美渐变 / 太极八卦混用）
- phase0-review.md: Round 1 即通过 — 风格方向评分 39/40，4 项维度（调性 10 / 视觉层次 10 / 要素完整性 10 / 可落地性 9）；唯一减分项是字体 CDN 国内化（Phase 1 工程优化范畴，不属于风格方向问题）；未启用 Round 2/3
- PRD.v2.0.backup.md: PRD v2.0 原版备份（用于回溯对比）
</file-manifest>

<open-issues>
- Q15（v2.1 新增，阶段三再决策）：海外市场是否启动？参考 FateTell $39.9 起付费打法
- Q16（v2.1 新增，阶段二再决策）：是否引入"今日宜忌"日推送提升日活
- Q17（v2.1 新增，阶段二再决策）：提示词模板是否引入用户自定义提问能力（参考竞品测测 AI 问答）
- Phase 1 工程优化项：字体 CDN 国内化（Google Fonts → 字节 CDN 或子集化）；暗色模式全局演示（demo 仅在 motion section 局部展示）
- Phase 1 决策项：12-16 页面具体拆分清单需 page-design-agent 在 Phase 1 Step 1 确认
</open-issues>

<constraints-for-next-phase>
- 【硬约束 1：技术资产复用】后端必须扩展现有 FastAPI 服务 `紫薇/app.py`（绝对路径 /Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py），已实现 3 个端点：`GET /paipan`（农历文本）、`GET /paipan/solar`（阳历文本）、`GET /paipan/json`（农历 JSON）。基于 iztro-py v0.3.4 计算引擎。**禁止另建新项目或新服务**（PRD Q8 已锁死）
- 【硬约束 2：必须新增端点】`GET /paipan/solar/json` 阳历 JSON 排盘接口（PRD Q5 已决，但实际尚未实现），格式参考现有 `/paipan/json` 实现
- 【硬约束 3：所有业务 API 同服务扩展】PRD 7.2 中 30 个新增 API（认证 / 用户 / 排盘 / 积分 / 模板 / AI 解读 / 分享 / 管理后台）必须全部在同一 FastAPI app 内挂载（建议按模块创建 router，使用 APIRouter 分组），共享同一数据库连接池
- 【硬约束 4：AIGC 合规标识】所有 AI 解读结果必须三层防护：(1) 解读内容前缀免责声明强制注入（后端 prompt 拼接，前端不可关闭）；(2) 报告页底部固定标识条 + 分享卡片不可裁剪水印；(3) Gemini API prompt 加入"避免医疗诊断、法律建议、具体投资建议"硬性约束 + 返回内容做敏感词过滤
- 【硬约束 5：色彩 token 一致性】Phase 1 全部页面必须严格使用 PRD 9.4 定义的 17 个色彩 token（HEX 已锁定，不可改用 OKLCH 改值），design-agent 与 page-design-agent 共享同一份 design-tokens
- 【硬约束 6：字体许可】仅使用思源宋体 / 思源黑体（SIL OFL 免费商用），其他字体（如 DIN Pro / Cormorant Garamond）需在 Phase 1 重新评估许可后再决定是否引入；字体家族总数 ≤ 3
- 【硬约束 7：设计红线】Phase 1 所有页面禁用：纯白背景 / 大面积红色 / 卡通插画 / 廉价饱和紫 / 欧美紫粉渐变 / 太极八卦图 / 绿配紫 / Inter 等无辨识度字体（详见 PRD 9.7）
- 【硬约束 8：积分经济一致性】Phase 1 所有涉及积分的页面（积分卡 / 模板卡 cost / 签到日历 / 积分流水）必须使用相同的金币图标（金色径向渐变圆 + drift 漂浮动画 + ¤ 符号），demo.html 已示范
- 【硬约束 9：命盘可视化标准】Phase 1 命盘组件必须采用 4x4 网格 + 中宫 2x2 合并展示主星格局，宫位内分层显示"宫名+地支 → 主星（亮度+四化）→ 辅星 → 大限"，不允许改为圆形星盘或其他非传统排布（参考 demo.html chart-frame 实现）
- 【硬约束 10：禁止破坏 PRD 结构】Phase 1 如需补充 PRD，必须沿用 v2.1 复核模式（Edit 而非 Write），不重组章节、不修改已决策内容、不改变商业模式或技术选型
</constraints-for-next-phase>

<context-for-agents>
本项目是「紫微灵犀」— 基于紫微斗数排盘引擎与 Gemini 2.5 Pro 的 AI 国学文化解读平台。
目标平台：微信小程序（主力）+ H5（引流），uni-app 一套代码多端发布。
商业模式：积分制（注册送 100 积分 + 签到 + 分享 + 看广告获取 / 解锁模板和 AI 解读消耗）三阶段演进。
合规定位：传统文化知识服务 + AI 内容生成，所有解读内容标注"仅供娱乐参考"。

设计风格：东方美学 + 现代极简，"古典智慧，Modern 解读"。
配色：主色 #2D1B69（深紫）/ 辅色 #5B4A99 / 强调色 #D4A84B（古金）/ 背景 #FFF8F0（暖宣纸白）/ 暗背景 #1A1025（紫黑）。
字体：思源宋体（标题）+ 思源黑体（正文），数字使用 Cormorant Garamond Italic。
动效：exponential easing（cubic-bezier(0.25, 1, 0.5, 1)）+ 入场 640ms / 状态 280ms。

已存在技术资产：
- 后端 FastAPI 排盘服务在 /Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py
- 已实现端点：GET /paipan（农历文本）、GET /paipan/solar（阳历文本）、GET /paipan/json（农历 JSON）
- 计算引擎：iztro-py v0.3.4
- Phase 1 必须新增：GET /paipan/solar/json（阳历 JSON）— PRD Q5 待实施
- Phase 1 所有 30 个新业务 API 必须在同一服务、同一项目内扩展（PRD Q8 硬约束）

关键约束：
- 不可重写 PRD（v2.1 已是终稿基础上的复核版），如需补充走 Edit 不走 Write
- 所有 AI 解读输出必须含 AIGC 标识（依据网信办 2025-09 强制规定）
- 字体许可仅认思源系列 + 已商用许可字体
- 命盘可视化必须 4x4 + 中宫合并的传统正方形排布

【下游 phase1-orchestrator 重点提示 - Phase 1 → Phase 2 用户确认门】
phase1-orchestrator 已在流程中加固"Phase 1 完成后必须暂停等待用户确认"机制（Part C 暂停门）。
具体说明：Phase 1 输出页面设计稿后，用户可能选择用其他模型（如更高级的设计模型）重做设计稿，
然后再进入 Phase 2 开发实现阶段。phase1-orchestrator 在生成 phase1-to-phase2.md 之前，
必须显式输出"等待用户确认"提示，不可自动进入 Phase 2。本 Phase 0 编排不直接干预 Phase 1 流程，
此处仅做信息传递，便于 phase1-orchestrator 接手时确认执行此暂停门。
</context-for-agents>
</phase-transition>
```
