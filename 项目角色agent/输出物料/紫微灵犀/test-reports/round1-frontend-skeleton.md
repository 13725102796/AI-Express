# Round 1 QA 报告 — 前端项目骨架

> 日期：2026-04-17
> 模块：Round 1（M0 项目骨架 + 设计系统 + 共享组件 + 请求层 + Store）
> 工作目录：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/frontend/`
> 测试类型：代码编译验证 + Playwright 实操验证 + DOM/Console 检查

## QA PASS - Round 1 前端骨架

- **测试类型**：代码编译（H5 build + mp-weixin build）+ 浏览器实操（Playwright 1440×900 viewport + 390×844 移动 viewport）
- **测试总数**：8 通过 / 8 总计
- **控制台错误**：0
- **控制台警告**：0
- **页面错误**：0
- **请求失败**：0（除 Google Fonts 预连接，已排除）
- **截图证据**：/tmp/ziwei-home.png
- **判定**：✅ PASS

## 通过清单

| 检查项 | 结果 | 证据 |
|--------|------|------|
| `npm install` 成功 | ✅ | 998 包成功安装 + sass + pinia |
| `npx uni build`（H5）| ✅ | `DONE Build complete.` |
| `npx uni build -p mp-weixin` | ✅ | `DONE Build complete.` |
| 小程序主包体积 < 2MB | ✅ | 264 KB / 2048 KB（12.9%） |
| 3 个分包声明生效 | ✅ | sub-chart / sub-reading / sub-user + pages-admin |
| H5 首屏无 console error | ✅ | Playwright 检查 0 error |
| 设计系统零残留 | ✅ | grep #2D1B69/#D4A84B/--color-primary 无业务代码匹配 |
| AIGC 徽章可见 | ✅ | .aigc-badge-fixed DOM 存在并可视化 |

## 产物清单

### 根配置
- `package.json`（@dcloudio/uni-app 3.0.x + pinia 2.3.1 + sass + vue 3.4）
- `vite.config.ts`（@/ 别名 + port 5173）
- `tsconfig.json`（@dcloudio/types + paths）
- `.env.development` / `.env.production`（VITE_API_BASE 分离）
- `index.html`（Google Fonts 预加载）

### 双端配置
- `src/pages.json`
  - 主包 4 页（P01-P06 的 P01 首页/P04 本我/P05 登录/P06 生辰）
  - 4 个分包（sub-chart / sub-reading 4 页 / sub-user 4 页 / pages-admin 5 页）
  - tabBar `custom: true`（H5 端 BaseTabBar 接管，小程序端自定义 tabBar）
- `src/manifest.json`（mp-weixin + h5 双端；subpackages/optimization 开启）

### 设计系统
- `src/uni.scss`（30+ 设计变量 + Cinzel/Noto Serif SC 字体变量 + cubic-bezier 动效）
- `src/App.vue`（全局 page/:root CSS 变量 + H5 uni-tabbar 隐藏）

### 共享组件（8 个）
- `BaseStarfield.vue` — 星空 fixed 背景（SVG data-url）
- `BaseAmbient.vue` — 顶部金色径向光晕
- `BaseNav.vue` — 顶部导航（品牌/返回/subtitle/slot right）
- `BaseTabBar.vue` — 自定义 4-Tab 底部栏
- `BaseCornerDec.vue` — 四角金线装饰（4 位置）
- `BaseActionBtn.vue` — CTA 按钮（primary/ghost/danger × sm/md/lg × 药丸/方形）
- `BaseAigcBadge.vue` — 三层 AIGC 徽章（fixed-corner/inline/watermark）
- `PalaceCell.vue` — 宫位单格骨架（Round 3 填充）

### 请求 / Store / Services（19 个文件）
- `src/utils/request.ts`（uni.request 封装 + JWT 拦截器 + 401 自动跳登录 + 错误码映射）
- `src/utils/sse.ts`（H5 fetch+ReadableStream + 小程序 onChunkReceived，统一 openSSE API，**技术难点 2 的方案层**）
- `src/utils/storage.ts`（uni.setStorageSync 封装 + 常量 key）
- `src/utils/format.ts`（千分位/时辰名/手机号/日期）
- `src/stores/{user,chart,points,templates,reading}.ts`（5 个 Pinia store，含 SSE 状态机 + 退积分 toast 钩子）
- `src/services/{auth,user,chart,points,templates,reading,share,admin}.ts`（8 个 API 层）
- `src/types/api.ts`（**复刻自 shared-types.md 单一事实来源**，30+1 端点请求响应全覆盖）
- `src/types/errors.ts`（错误码 → 中文映射）

### 页面占位（18 张）
- 主包：pages/index/index.vue（含视觉验证卡）、pages/login/login.vue、pages/profile-setup/profile-setup.vue、pages/profile/profile.vue
- sub-chart：chart.vue
- sub-reading：reading / report / my-templates / my-reports
- sub-user：points / templates / template-detail / invite
- pages-admin：login / templates / users / points-config / stats

## 技术难点落位

| 难点 | Round 1 状态 | 实现位置 |
|------|--------------|---------|
| 1. P02 4×4+中宫 2×2 命盘 | 组件骨架就绪（PalaceCell.vue） | Round 3 会补 ChartGrid 容器 |
| 2. SSE 双端兼容 | 方案已实现（utils/sse.ts）| Round 4 P03 接入 |
| 3. AIGC 三层防护 | 组件已实现（BaseAigcBadge 三位置） | Round 4 P03/P09/P12/P13 使用 |
| 4. 积分事务前端联动 | store 明确不乐观更新 + error.refunded toast | Round 3 P10 + Round 4 P08 触发 |
| 5. 小程序分包 | 3 分包 + 1 admin 分包已配置 | 主包当前 264 KB 远低于 2MB |

## Round 1 修复的 1 个坑

- 初始移除 pages.json 的 tabBar 导致 uni-h5 `useShowTabBar` 抛 TypeError
- 修复：pages.json 保留 tabBar 字段但设 `custom: true`，并在 App.vue 加 `uni-tabbar { display: none }`（H5 端）避免双 Tab 叠加

## Round 2 待做

按 phase2-orchestrator 计划：主流程闭环（P05 login → P06 setup → P01 home 完整首页），对接真实后端（localhost:8000）。
