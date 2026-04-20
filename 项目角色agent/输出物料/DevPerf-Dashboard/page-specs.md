# DevPerf Dashboard 页面规格文档

> 基于 PRD v1.0 拆解
> 日期：2026-04-09
> 拆解范围：P0 + P1 功能模块，共 7 个独立页面

---

## 1. 页面清单总览

| 编号 | 页面名称 | 路由 | 优先级 | 关联功能模块 | 权限 |
|------|---------|------|--------|-------------|------|
| P01 | 登录页 | /login | P0 | 3.1 用户认证 | 公开 |
| P02 | 团队总览 | / | P0 | 3.2 团队总览页 | 全部角色 |
| P03 | 项目明细 | /projects/:id | P0 | 3.3 项目明细页 | 全部角色 |
| P04 | 个人产出 | /members/:id | P1 | 3.4 个人产出页 | admin/manager全部, developer仅自己, viewer下钻可查 |
| P05 | OKR 看板 | /okr | P0 | 3.5 OKR 看板页 | 全部角色（admin/manager可编辑） |
| P06 | Git 活动 | /git | P1 | 3.6 Git 活动页 | admin/manager, developer仅自己, viewer不可见 |
| P07 | 管理后台 | /admin | P0 | 3.7 管理后台页 | 仅 admin |

---

## 2. 全局共享组件

| 组件名 | 出现页面 | 描述 |
|--------|---------|------|
| AppSidebar | P02-P07 | 左侧固定侧边栏，包含导航菜单（根据角色动态显示/隐藏项目）、用户头像+角色标签、折叠按钮。宽度展开 240px / 折叠 64px。当前页面对应导航项高亮（左侧 3px 主色竖线 + 背景色加深），hover 态背景微亮。折叠/展开动画 300ms ease-out-quart，折叠后仅显示图标+tooltip。底部用户区：头像(40px 圆形) + 姓名 + 角色标签（admin蓝/manager绿/developer灰/viewer黄），点击展开下拉菜单（个人信息/退出登录） |
| AppHeader | P02-P07 | 顶部栏，包含面包屑导航、页面标题、全局搜索入口（未来预留）、通知铃铛（未来预留）。注：用户操作（个人信息/退出登录）统一放在 AppSidebar 底部用户区，AppHeader 不重复放置用户下拉 |
| FilterBar | P02, P05, P06 | 筛选栏组件，支持时间范围选择（本季度/上季度/自定义日期）+ 产品线多选下拉（Plane Project 列表）。筛选变更触发联动刷新 |
| EmptyState | P02-P07 | 空状态占位组件，包含插图区域 + 标题 + 描述文本 + 可选操作按钮。根据场景展示不同文案 |
| LoadingSkeleton | P02-P07 | 加载骨架屏组件，支持卡片型、表格型、图表型三种骨架形态 |
| ErrorState | P02-P07 | 错误状态组件，包含错误图标 + 错误描述 + "重试"按钮 |
| DataCard | P02, P03, P04, P06 | 数据面板卡片容器，包含卡片标题 + 数值摘要区 + 图表/内容区 + 右上角状态标识（如"数据同步中"） |
| ConfirmDialog | P05, P07 | 确认弹窗组件，包含标题 + 描述 + 确认按钮 + 取消按钮 |
| Toast | P01-P07 | 全局通知提示，支持 success/error/warning/info 四种类型，自动 3s 消失。固定在视口右上角，z-index 高于所有弹窗/抽屉（z-index: 9999），多条 Toast 垂直堆叠 |
| Breadcrumb | P03, P04 | 面包屑导航，展示当前页面层级路径，支持点击返回 |

---

## 3. 页面详细规格

---

### [P01] 登录页

**路由**：/login
**关联 PRD 功能**：3.1 用户认证
**页面定位**：系统入口，所有未认证用户的落地页。简洁专业，传达产品品牌调性。

#### 页面结构

- **区域 A（左侧 50%）**：品牌展示区 -- 产品 Logo + 产品名称 "DevPerf Dashboard" + 一句话描述"研发效能数据一目了然" + 背景装饰（靛蓝色调抽象数据图形）
- **区域 B（右侧 50%）**：登录表单区 -- 白色卡片居中，包含登录表单
- **响应式**：< 768px 时隐藏区域 A，区域 B 全屏居中

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 产品 Logo | 图标+文本 | DevPerf Dashboard 品牌标识 | 无 | 无 |
| 品牌标语 | 文本 | "研发效能数据一目了然" | 无 | 无 |
| 品牌描述 | 文本 | "基于 Plane + Gitea 的轻量级研发效能聚合仪表盘" | 无 | 无 |
| 登录卡片标题 | 文本 | "登录到 Dashboard" | 无 | 无 |
| 邮箱输入框 | 输入框 | placeholder: "请输入邮箱地址" | focus 高亮边框，blur 验证格式 | 正常/focus/error |
| 密码输入框 | 输入框 | placeholder: "请输入密码"，右侧眼睛图标 | focus 高亮边框，点击眼睛切换密码可见 | 正常/focus/error/密码可见/密码隐藏 |
| 登录按钮 | 按钮（主要） | "登录" | 点击提交表单 | default/hover/active/loading/disabled |
| 错误提示 | 文本 | "邮箱或密码错误" / "账号已锁定，请15分钟后重试" | 登录失败时出现 | 隐藏/显示 |
| 版权信息 | 文本 | "2026 DevPerf Dashboard. 内部使用" | 无 | 无 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 默认状态 | 首次加载 | 表单空白，登录按钮 enabled |
| 输入中 | 用户开始输入 | 输入框 focus 样式，实时格式校验 |
| 提交中 | 点击登录按钮 | 按钮变为 loading 状态（转圈+文字"登录中..."），表单禁用 |
| 登录成功 | API 返回 200 + JWT | Toast 提示"登录成功"，自动跳转到 / |
| 登录失败 | API 返回 401 | 表单上方出现红色错误提示"邮箱或密码错误"，密码框清空 |
| 账号锁定 | 连续 5 次失败 | 错误提示变为"账号已锁定，请 15 分钟后重试"，登录按钮禁用，显示倒计时 |
| Token 过期跳转 | 从其他页面被踢回 | URL 带 ?expired=true，表单上方展示信息提示"登录已过期，请重新登录" |

#### 假数据规格

```json
{
  "loginRequest": {
    "email": "zhang.wei@jasonqiyuan.com",
    "password": "SecurePass123!"
  },
  "loginResponse_success": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-001",
      "displayName": "张伟",
      "email": "zhang.wei@jasonqiyuan.com",
      "role": "admin"
    }
  },
  "loginResponse_failure": {
    "code": 401,
    "message": "邮箱或密码错误"
  },
  "loginResponse_locked": {
    "code": 423,
    "message": "账号已锁定，请 15 分钟后重试",
    "retryAfter": 900
  }
}
```

#### 交互逻辑

1. **邮箱格式校验**：blur 邮箱输入框时 -> 正则校验邮箱格式 -> 不合法时输入框下方显示"请输入有效邮箱地址"红色提示
2. **密码可见切换**：点击密码框右侧眼睛图标 -> 切换 input type 为 text/password -> 图标相应切换（睁眼/闭眼）
3. **表单提交**：点击登录按钮或 Enter 键 -> 前端校验（邮箱非空+格式合法，密码非空且 >= 6 位） -> 通过则调用 POST /api/auth/login -> 按钮进入 loading 态
4. **登录成功跳转**：API 返回成功 -> 将 JWT 存入 localStorage -> Toast "登录成功" -> router.push("/")
5. **登录失败处理**：API 返回 401 -> 表单上方显示红色错误条"邮箱或密码错误" -> 密码输入框清空并 focus -> 3s 后错误条淡出
6. **账号锁定处理**：API 返回 423 -> 错误条显示"账号已锁定，请 15 分钟后重试" -> 登录按钮禁用 -> 显示倒计时器
7. **过期Token处理**：URL query 包含 expired=true -> 表单上方显示蓝色信息条"登录已过期，请重新登录"

---

### [P02] 团队总览

**路由**：/
**关联 PRD 功能**：3.2 团队总览页
**页面定位**：默认落地页，CTO/管理层每日必访。6 个图表面板一屏展示全局研发状态，支持时间和项目维度筛选。

#### 页面结构

- **区域 A（左侧）**：AppSidebar 全局侧边栏
- **区域 B（顶部）**：AppHeader（面包屑"团队总览"）+ FilterBar（时间范围+产品线筛选）
- **区域 C（主内容区）**：2 列 x 3 行 Grid 图表面板布局，每个面板为一个 DataCard
  - 行 1：面板 1 Sprint 交付率趋势 | 面板 2 任务状态分布
  - 行 2：面板 3 产品线进度总览 | 面板 4 每周代码活动
  - 行 3：面板 5 OKR 完成进度 | 面板 6 PR 平均合入时间
- **响应式**：< 768px Grid 变为 1 列堆叠

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 时间范围选择器 | 下拉选择 | 本季度/上季度/自定义日期 | 选择后联动刷新全部 6 面板 | default/open/selected |
| 产品线筛选 | 多选下拉 | Plane Project 列表 | 选择/取消后联动刷新全部 6 面板 | default/open/selected |
| 面板 1：Sprint 交付率趋势 | DataCard + 柱状图 | 近 6 个 Cycle 的 plannedPoints vs completedPoints + 80% 目标虚线 | 点击柱子弹窗展示该 Sprint 任务列表 | 正常/hover柱子/弹窗展开 |
| 面板 2：任务状态分布 | DataCard + 环形图 | Todo/InProgress/Review/Done 各状态任务数 + 中心总数 | 点击扇区侧栏展示任务清单 | 正常/hover扇区/侧栏展开 |
| 面板 3：产品线进度总览 | DataCard + 横向进度条组 | 各 Project 当前活跃 Cycle 完成百分比 | 点击进度条跳转 /projects/:id | 正常/hover进度条高亮 |
| 面板 4：每周代码活动 | DataCard + 堆叠面积图 | 近 12 周每周 Commits+PRs（按成员堆叠） | Hover 显示各人贡献明细 tooltip | 正常/hover显示tooltip |
| 面板 5：OKR 完成进度 | DataCard + 水平进度条 | 各 Objective 加权进度百分比 | 点击展开显示 KR 明细列表 | 折叠/展开 |
| 面板 6：PR 平均合入时间 | DataCard + 折线图 | 近 12 周每周 PR avgMergeTimeHours + 48h 预警虚线 | Hover 显示该周 PR 列表 tooltip | 正常/hover显示tooltip |
| 同步状态标识 | 徽章 | 面板右上角"数据同步中"标识 | 无 | 同步中显示/完成隐藏 |
| Sprint 任务弹窗 | 弹窗 | 该 Sprint 的任务列表（标题/状态/指派人/故事点） | 点击面板 1 柱子触发，关闭按钮/点击外部关闭 | 隐藏/显示 |
| 任务清单侧栏 | 抽屉 | 对应状态的任务清单（标题/项目/指派人/优先级） | 点击面板 2 扇区触发，关闭按钮 | 隐藏/从右侧滑入 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面首次加载/筛选变更 | 6 个面板同时展示图表型 LoadingSkeleton |
| 正常状态 | 数据加载完成 | 所有面板展示数据和图表 |
| 空状态 | 首次部署无数据 | 6 个面板统一展示 EmptyState "暂无数据，请等待首次同步完成" |
| 筛选无结果 | 筛选条件无匹配数据 | 面板展示 EmptyState "该时间范围内无数据，请调整筛选条件" |
| 同步中 | 后台数据同步进行中 | 面板右上角展示蓝色"数据同步中"徽章 |
| 部分错误 | 某些面板 API 失败 | 失败面板展示 ErrorState + "重试"按钮，其他面板正常 |
| 全部错误 | 网络异常或服务器故障 | 全部面板展示 ErrorState |

#### 假数据规格

```json
{
  "overview": {
    "sprintDelivery": {
      "cycles": [
        { "name": "Sprint 2026-W10", "plannedPoints": 42, "completedPoints": 38, "deliveryRate": 90.5 },
        { "name": "Sprint 2026-W12", "plannedPoints": 48, "completedPoints": 35, "deliveryRate": 72.9 },
        { "name": "Sprint 2026-W14", "plannedPoints": 45, "completedPoints": 40, "deliveryRate": 88.9 },
        { "name": "Sprint 2026-W16", "plannedPoints": 50, "completedPoints": 42, "deliveryRate": 84.0 },
        { "name": "Sprint 2026-W18", "plannedPoints": 46, "completedPoints": 44, "deliveryRate": 95.7 },
        { "name": "Sprint 2026-W20", "plannedPoints": 52, "completedPoints": 39, "deliveryRate": 75.0 }
      ]
    },
    "taskDistribution": {
      "todo": 23,
      "inProgress": 18,
      "review": 7,
      "done": 156
    },
    "projectProgress": [
      { "projectId": "proj-001", "name": "Avatar 数字人平台", "identifier": "AVATAR", "currentCycleProgress": 78, "totalPoints": 50, "completedPoints": 39 },
      { "projectId": "proj-002", "name": "AirFlow 工作流引擎", "identifier": "AIRFLOW", "currentCycleProgress": 65, "totalPoints": 40, "completedPoints": 26 },
      { "projectId": "proj-003", "name": "DataHub 数据中台", "identifier": "DATAHUB", "currentCycleProgress": 92, "totalPoints": 36, "completedPoints": 33 },
      { "projectId": "proj-004", "name": "SmartDoc 智能文档", "identifier": "SMARTDOC", "currentCycleProgress": 55, "totalPoints": 44, "completedPoints": 24 },
      { "projectId": "proj-005", "name": "DevOps 自动化平台", "identifier": "DEVOPS", "currentCycleProgress": 83, "totalPoints": 30, "completedPoints": 25 },
      { "projectId": "proj-006", "name": "客户管理系统", "identifier": "CRM", "currentCycleProgress": 71, "totalPoints": 28, "completedPoints": 20 },
      { "projectId": "proj-007", "name": "内部培训平台", "identifier": "LEARN", "currentCycleProgress": 45, "totalPoints": 22, "completedPoints": 10 },
      { "projectId": "proj-008", "name": "财务报表系统", "identifier": "FIN", "currentCycleProgress": 88, "totalPoints": 16, "completedPoints": 14 }
    ],
    "weeklyCodeActivity": {
      "weeks": [
        { "weekStart": "2026-01-05", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 20, "prs": 3 },
          { "userId": "usr-003", "name": "王芳", "commits": 15, "prs": 2 },
          { "userId": "usr-004", "name": "陈浩", "commits": 12, "prs": 2 },
          { "userId": "usr-005", "name": "赵丽", "commits": 10, "prs": 1 },
          { "userId": "usr-006", "name": "刘洋", "commits": 6, "prs": 1 }
        ]},
        { "weekStart": "2026-01-12", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 22, "prs": 4 },
          { "userId": "usr-003", "name": "王芳", "commits": 17, "prs": 3 },
          { "userId": "usr-004", "name": "陈浩", "commits": 14, "prs": 2 },
          { "userId": "usr-005", "name": "赵丽", "commits": 11, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 9, "prs": 1 }
        ]},
        { "weekStart": "2026-01-19", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 18, "prs": 3 },
          { "userId": "usr-003", "name": "王芳", "commits": 20, "prs": 4 },
          { "userId": "usr-004", "name": "陈浩", "commits": 16, "prs": 3 },
          { "userId": "usr-005", "name": "赵丽", "commits": 8, "prs": 1 },
          { "userId": "usr-006", "name": "刘洋", "commits": 11, "prs": 2 }
        ]},
        { "weekStart": "2026-01-26", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 15, "prs": 2 },
          { "userId": "usr-003", "name": "王芳", "commits": 12, "prs": 2 },
          { "userId": "usr-004", "name": "陈浩", "commits": 10, "prs": 1 },
          { "userId": "usr-005", "name": "赵丽", "commits": 14, "prs": 3 },
          { "userId": "usr-006", "name": "刘洋", "commits": 7, "prs": 1 }
        ]},
        { "weekStart": "2026-02-02", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 23, "prs": 4 },
          { "userId": "usr-003", "name": "王芳", "commits": 18, "prs": 3 },
          { "userId": "usr-004", "name": "陈浩", "commits": 15, "prs": 2 },
          { "userId": "usr-005", "name": "赵丽", "commits": 12, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 8, "prs": 1 }
        ]},
        { "weekStart": "2026-02-09", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 19, "prs": 3 },
          { "userId": "usr-003", "name": "王芳", "commits": 21, "prs": 5 },
          { "userId": "usr-004", "name": "陈浩", "commits": 11, "prs": 2 },
          { "userId": "usr-005", "name": "赵丽", "commits": 16, "prs": 3 },
          { "userId": "usr-006", "name": "刘洋", "commits": 10, "prs": 2 }
        ]},
        { "weekStart": "2026-02-16", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 25, "prs": 5 },
          { "userId": "usr-003", "name": "王芳", "commits": 14, "prs": 2 },
          { "userId": "usr-004", "name": "陈浩", "commits": 20, "prs": 4 },
          { "userId": "usr-005", "name": "赵丽", "commits": 9, "prs": 1 },
          { "userId": "usr-006", "name": "刘洋", "commits": 13, "prs": 2 }
        ]},
        { "weekStart": "2026-02-23", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 21, "prs": 4 },
          { "userId": "usr-003", "name": "王芳", "commits": 16, "prs": 3 },
          { "userId": "usr-004", "name": "陈浩", "commits": 18, "prs": 3 },
          { "userId": "usr-005", "name": "赵丽", "commits": 13, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 11, "prs": 2 }
        ]},
        { "weekStart": "2026-03-02", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 24, "prs": 5 },
          { "userId": "usr-003", "name": "王芳", "commits": 19, "prs": 4 },
          { "userId": "usr-004", "name": "陈浩", "commits": 13, "prs": 2 },
          { "userId": "usr-005", "name": "赵丽", "commits": 15, "prs": 3 },
          { "userId": "usr-006", "name": "刘洋", "commits": 9, "prs": 1 }
        ]},
        { "weekStart": "2026-03-09", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 17, "prs": 3 },
          { "userId": "usr-003", "name": "王芳", "commits": 22, "prs": 4 },
          { "userId": "usr-004", "name": "陈浩", "commits": 19, "prs": 3 },
          { "userId": "usr-005", "name": "赵丽", "commits": 11, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 14, "prs": 2 }
        ]},
        { "weekStart": "2026-03-16", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 26, "prs": 5 },
          { "userId": "usr-003", "name": "王芳", "commits": 15, "prs": 3 },
          { "userId": "usr-004", "name": "陈浩", "commits": 21, "prs": 4 },
          { "userId": "usr-005", "name": "赵丽", "commits": 10, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 12, "prs": 2 }
        ]},
        { "weekStart": "2026-03-23", "members": [
          { "userId": "usr-002", "name": "李明", "commits": 20, "prs": 4 },
          { "userId": "usr-003", "name": "王芳", "commits": 18, "prs": 3 },
          { "userId": "usr-004", "name": "陈浩", "commits": 16, "prs": 3 },
          { "userId": "usr-005", "name": "赵丽", "commits": 14, "prs": 2 },
          { "userId": "usr-006", "name": "刘洋", "commits": 10, "prs": 2 }
        ]}
      ]
    },
    "okrProgress": [
      { "id": "obj-001", "title": "提升研发交付效率 30%", "ownerName": "张伟", "progress": 72, "keyResults": [
        { "title": "Sprint 平均交付率达到 85%", "current": 82, "target": 85, "unit": "%" },
        { "title": "PR 平均合入时间降至 24h", "current": 31, "target": 24, "unit": "h" },
        { "title": "Bug 密度降低至 0.3/功能点", "current": 0.42, "target": 0.3, "unit": "个/功能点" }
      ]},
      { "id": "obj-002", "title": "完成 Q2 产品路线图", "ownerName": "李明", "progress": 58, "keyResults": [
        { "title": "Avatar 平台 V2 上线", "current": 65, "target": 100, "unit": "%" },
        { "title": "AirFlow 引擎核心功能完成", "current": 50, "target": 100, "unit": "%" },
        { "title": "DataHub 数据接入 10 个数据源", "current": 7, "target": 10, "unit": "个" }
      ]},
      { "id": "obj-003", "title": "建设 DevOps 自动化体系", "ownerName": "陈浩", "progress": 85, "keyResults": [
        { "title": "CI/CD 流水线覆盖率 100%", "current": 95, "target": 100, "unit": "%" },
        { "title": "部署频率提升至每日 2 次", "current": 1.8, "target": 2, "unit": "次/日" }
      ]},
      { "id": "obj-004", "title": "提升团队工程文化", "ownerName": "张伟", "progress": 45, "keyResults": [
        { "title": "Code Review 参与率达到 80%", "current": 62, "target": 80, "unit": "%" },
        { "title": "技术分享会每月 2 次", "current": 1, "target": 2, "unit": "次/月" },
        { "title": "新人 30 天独立交付首个需求", "current": 35, "target": 30, "unit": "天" }
      ]}
    ],
    "prMergeTime": {
      "weeks": [
        { "weekStart": "2026-01-05", "avgHours": 36.2, "prCount": 12 },
        { "weekStart": "2026-01-12", "avgHours": 42.8, "prCount": 15 },
        { "weekStart": "2026-01-19", "avgHours": 28.5, "prCount": 10 },
        { "weekStart": "2026-01-26", "avgHours": 51.3, "prCount": 8 },
        { "weekStart": "2026-02-02", "avgHours": 33.7, "prCount": 14 },
        { "weekStart": "2026-02-09", "avgHours": 45.1, "prCount": 11 },
        { "weekStart": "2026-02-16", "avgHours": 29.6, "prCount": 16 },
        { "weekStart": "2026-02-23", "avgHours": 38.4, "prCount": 13 },
        { "weekStart": "2026-03-02", "avgHours": 25.9, "prCount": 18 },
        { "weekStart": "2026-03-09", "avgHours": 31.2, "prCount": 14 },
        { "weekStart": "2026-03-16", "avgHours": 27.8, "prCount": 17 },
        { "weekStart": "2026-03-23", "avgHours": 34.5, "prCount": 15 }
      ]
    }
  }
}
```

#### 交互逻辑

1. **时间范围筛选**：选择时间范围下拉（本季度/上季度/自定义） -> 全部 6 个面板进入 loading 态 -> 并行请求 API（带时间参数）-> 面板依次渲染新数据（按加载完成顺序，不等全部完成）
2. **产品线筛选**：勾选/取消产品线多选下拉 -> 同上联动逻辑 -> 支持全选/清空快捷操作
3. **Sprint 柱状图交互**：hover 柱子 -> tooltip 显示该 Sprint 名称+计划点数+完成点数+交付率 -> 点击柱子 -> 弹出模态窗，展示该 Sprint 的任务列表表格（任务标题/状态/指派人/故事点）
4. **任务状态环形图交互**：hover 扇区 -> tooltip 显示状态名+任务数+占比 -> 点击扇区 -> 右侧抽屉滑入展示该状态下的任务清单（任务标题/所属项目/指派人/优先级）
5. **产品线进度条交互**：hover 进度条 -> 进度条颜色加深+显示项目名和百分比 -> 点击进度条 -> router.push(`/projects/${projectId}`)
6. **代码活动面积图交互**：hover 图表区域 -> tooltip 显示该周各成员 commits 和 PRs 明细
7. **OKR 进度条交互**：点击 Objective 行 -> 展开/折叠该 Objective 下的 KR 明细列表 -> KR 行展示进度条（currentValue/targetValue）+ 百分比
8. **PR 合入时间折线图交互**：hover 数据点 -> tooltip 显示该周平均合入时间 + PR 数量 + 超过 48h 红色标注 -> 48h 预警线以上区域淡红色填充
9. **弹窗/抽屉关闭**：点击关闭按钮 / 点击遮罩层 / 按 Esc 键 -> 弹窗/抽屉关闭并恢复焦点

---

### [P03] 项目明细

**路由**：/projects/:id
**关联 PRD 功能**：3.3 项目明细页
**页面定位**：单个项目的深度数据展示页，组长站会前的核心工具页面。从团队总览页"产品线进度"下钻进入。

#### 页面结构

- **区域 A（左侧）**：AppSidebar
- **区域 B（顶部）**：AppHeader（面包屑"团队总览 > Avatar 数字人平台"）+ 项目概要信息栏（项目名称 + 标识符 + 当前 Sprint 名称+进度）
- **区域 C（主内容区上半部 1x2 Grid）**：
  - 左：燃尽图 DataCard
  - 右：里程碑时间线 DataCard
- **区域 D（主内容区下半部 1x2 Grid）**：
  - 左：任务分配矩阵 DataCard（宽占 60%）
  - 右：项目 Git 活动概览 DataCard（宽占 40%）
- **响应式**：< 768px Grid 变为 1 列堆叠

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 面包屑 | Breadcrumb | "团队总览 > [项目名称]" | 点击"团队总览"返回 / | 无 |
| 项目概要栏 | 信息栏 | 项目名称 + 标识符徽章(如AVATAR) + 当前 Sprint 名称 + 交付率百分比 | 无 | 无 |
| 燃尽图 | DataCard + 折线图 | 理想线(虚线) vs 实际线(实线)，X轴=日期，Y轴=剩余故事点 | hover 显示当天理想值 vs 实际值 | 正常/hover tooltip |
| 里程碑时间线 | DataCard + 时间线 | 各里程碑节点：已完成(绿) / 进行中(蓝) / 即将到期(橙) / 已逾期(红) | hover 显示里程碑名称+目标日期+完成进度 | 正常/hover tooltip |
| 任务分配矩阵 | DataCard + 表格 | 行=成员姓名，列=Todo/InProgress/Review/Done，单元格=任务数（热力着色），末列=总故事点 | 点击成员名跳转 /members/:id，hover 单元格显示该成员该状态下的任务标题 | 正常/hover单元格高亮/点击跳转 |
| 项目 Git 概览 | DataCard + 数字+趋势图 | 近期 Commit 数（如 "128"）、PR 数（如 "24"）、周趋势迷你折线图 | hover 趋势图显示周数据 | 正常/hover tooltip |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面加载 | 4 个面板展示 LoadingSkeleton |
| 正常状态 | 数据加载完成 | 所有面板展示数据 |
| 空状态 | 项目无 Sprint 数据 | 燃尽图展示"该项目尚无 Sprint 数据"，其他面板正常或空 |
| 项目不存在 | :id 无效 | 全页展示 ErrorState "未找到该项目" + "返回总览"按钮 |
| 错误状态 | API 请求失败 | 失败面板展示 ErrorState + "重试" |

#### 假数据规格

```json
{
  "project": { "id": "proj-001", "name": "Avatar 数字人平台", "identifier": "AVATAR" },
  "currentCycle": {
    "name": "Sprint 2026-W20",
    "startDate": "2026-03-16",
    "endDate": "2026-03-29",
    "deliveryRate": 78,
    "burndown": [
      { "date": "2026-03-16", "ideal": 50, "actual": 50 },
      { "date": "2026-03-17", "ideal": 46.4, "actual": 48 },
      { "date": "2026-03-18", "ideal": 42.9, "actual": 45 },
      { "date": "2026-03-19", "ideal": 39.3, "actual": 42 },
      { "date": "2026-03-20", "ideal": 35.7, "actual": 38 },
      { "date": "2026-03-21", "ideal": 32.1, "actual": 36 },
      { "date": "2026-03-22", "ideal": 28.6, "actual": 33 },
      { "date": "2026-03-23", "ideal": 25.0, "actual": 28 },
      { "date": "2026-03-24", "ideal": 21.4, "actual": 24 },
      { "date": "2026-03-25", "ideal": 17.9, "actual": 20 },
      { "date": "2026-03-26", "ideal": 14.3, "actual": 16 },
      { "date": "2026-03-27", "ideal": 10.7, "actual": 13 },
      { "date": "2026-03-28", "ideal": 7.1, "actual": 11 },
      { "date": "2026-03-29", "ideal": 0, "actual": 11 }
    ]
  },
  "milestones": [
    { "id": "ms-001", "name": "V2.0 需求评审", "status": "completed", "targetDate": "2026-02-28", "progress": 100, "totalIssues": 12, "completedIssues": 12 },
    { "id": "ms-002", "name": "V2.0 核心功能开发", "status": "active", "targetDate": "2026-04-15", "progress": 68, "totalIssues": 35, "completedIssues": 24 },
    { "id": "ms-003", "name": "V2.0 集成测试", "status": "upcoming", "targetDate": "2026-04-30", "progress": 0, "totalIssues": 18, "completedIssues": 0 },
    { "id": "ms-004", "name": "V1.5 安全加固", "status": "overdue", "targetDate": "2026-03-15", "progress": 75, "totalIssues": 8, "completedIssues": 6 },
    { "id": "ms-005", "name": "V2.0 性能优化", "status": "upcoming", "targetDate": "2026-05-15", "progress": 10, "totalIssues": 14, "completedIssues": 1 }
  ],
  "taskMatrix": {
    "members": [
      { "userId": "usr-002", "name": "李明", "todo": 2, "inProgress": 3, "review": 1, "done": 8, "totalPoints": 21 },
      { "userId": "usr-003", "name": "王芳", "todo": 1, "inProgress": 2, "review": 2, "done": 6, "totalPoints": 16 },
      { "userId": "usr-004", "name": "陈浩", "todo": 3, "inProgress": 1, "review": 0, "done": 5, "totalPoints": 13 },
      { "userId": "usr-005", "name": "赵丽", "todo": 0, "inProgress": 2, "review": 1, "done": 7, "totalPoints": 15 },
      { "userId": "usr-008", "name": "黄强", "todo": 4, "inProgress": 1, "review": 0, "done": 3, "totalPoints": 11 },
      { "userId": "usr-009", "name": "周婷", "todo": 1, "inProgress": 1, "review": 1, "done": 4, "totalPoints": 10 }
    ]
  },
  "gitActivity": {
    "recentCommits": 128,
    "recentPRs": 24,
    "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 35, "prs": 7 },
      { "weekStart": "2026-03-09", "commits": 42, "prs": 8 },
      { "weekStart": "2026-03-16", "commits": 28, "prs": 5 },
      { "weekStart": "2026-03-23", "commits": 23, "prs": 4 }
    ]
  }
}
```

#### 交互逻辑

1. **面包屑导航**：点击"团队总览" -> router.push("/")
2. **燃尽图 hover**：鼠标移动到图表区域 -> tooltip 显示当天日期 + 理想剩余点数 + 实际剩余点数 + 偏差值（实际 - 理想，正数红色表示落后）
3. **里程碑 hover**：hover 里程碑节点 -> tooltip 显示名称 + 目标日期 + 完成任务数/总任务数 + 状态标签（颜色编码：绿=已完成/蓝=进行中/橙=即将到期(距截止<7天)/红=已逾期）
4. **任务矩阵成员点击**：点击成员姓名 -> router.push(`/members/${userId}?from=${projectId}`) -> 权限不足时显示 Toast "无权查看该成员数据"
5. **任务矩阵单元格 hover**：hover 数字单元格 -> tooltip 展示该成员该状态下的任务标题列表（最多 5 条，超出显示 "+N 项"）
6. **Git 概览趋势图 hover**：hover 迷你折线图数据点 -> tooltip 显示该周 commits 数和 PRs 数

---

### [P04] 个人产出

**路由**：/members/:id
**关联 PRD 功能**：3.4 个人产出页
**页面定位**：个人维度的产出数据展示，组长 1:1 面谈的辅助工具。从项目明细页的任务矩阵成员名下钻进入。

#### 页面结构

- **区域 A（左侧）**：AppSidebar
- **区域 B（顶部）**：AppHeader（面包屑"团队总览 > Avatar 数字人平台 > 李明"）+ 成员概要信息栏（头像 + 姓名 + 角色标签 + 邮箱）
- **区域 C（主内容区 2x2 Grid）**：
  - 行 1 左：Sprint 交付率趋势 DataCard（折线图）
  - 行 1 右：KPI 综合评分卡 DataCard（雷达图）
  - 行 2 左（跨 2 列）：Git 贡献热力图 DataCard（GitHub 风格热力图）
- **区域 D（下方全宽）**：当前进行中任务列表（表格）
- **响应式**：< 768px Grid 变为 1 列堆叠

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 面包屑 | Breadcrumb | "团队总览 > [来源项目名] > [成员名]"（如从项目明细下钻）或 "团队总览 > [成员名]"（如直接导航） | 点击可返回上级。来源项目通过 URL query ?from=proj-001 传递，无 from 参数时省略项目层级 | 无 |
| 成员概要栏 | 信息栏 | 头像(圆形) + 姓名 + 角色徽章(admin/manager/developer) + 邮箱 | 无 | 无 |
| Sprint 交付率趋势 | DataCard + 折线图 | 近 6 个 Sprint 个人 assignedPoints vs completedPoints 折线 + 交付率百分比 | hover 显示各 Sprint 数据详情 | 正常/hover tooltip |
| KPI 评分卡 | DataCard + 雷达图 | 5 项指标: Sprint交付率/平均交付周期/Bug密度/PR合入时间/Review参与率 | hover 显示各指标具体数值和目标值 | 正常/hover tooltip |
| Git 贡献热力图 | DataCard + 热力图 | GitHub 风格，按天着色（浅绿→深绿），近 6 个月，X轴=周，Y轴=周一到周日 | hover 显示日期 + commits数 + PRs数 + 任务完成数 | 正常/hover tooltip |
| 当前任务列表 | 表格 | 列: 项目/任务标题/状态标签/优先级标签/Story Points/截止日期 | 点击行可查看任务详情弹窗(标题+描述+标签) | 正常/hover行高亮/弹窗 |
| KPI 数值卡片组 | 卡片组 | 6 个小卡片: Sprint交付率/平均交付周期/Bug密度/PR合入时间/Review参与率/连续活跃天数 | 无 | 达标绿色/预警琥珀色/异常红色 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面加载 | 骨架屏 |
| 正常状态 | 数据加载完成 | 所有区域展示数据 |
| 空状态 | 新成员无历史数据 | 图表区展示"暂无历史数据"，任务列表展示"当前无进行中任务" |
| 权限不足 | developer 访问非自己的页面 | 全页展示"无权查看该成员数据" + "返回"按钮 |
| 成员不存在 | :id 无效 | 全页展示 ErrorState "未找到该成员" |
| 错误状态 | API 请求失败 | ErrorState + "重试" |

#### 假数据规格

```json
{
  "member": { "id": "usr-002", "displayName": "李明", "email": "li.ming@jasonqiyuan.com", "role": "developer" },
  "deliveryTrend": {
    "cycles": [
      { "name": "Sprint W10", "assignedPoints": 13, "completedPoints": 12, "rate": 92.3 },
      { "name": "Sprint W12", "assignedPoints": 15, "completedPoints": 11, "rate": 73.3 },
      { "name": "Sprint W14", "assignedPoints": 12, "completedPoints": 11, "rate": 91.7 },
      { "name": "Sprint W16", "assignedPoints": 14, "completedPoints": 13, "rate": 92.9 },
      { "name": "Sprint W18", "assignedPoints": 16, "completedPoints": 15, "rate": 93.8 },
      { "name": "Sprint W20", "assignedPoints": 13, "completedPoints": 10, "rate": 76.9 }
    ]
  },
  "contributionHeatmap": {
    "_note": "完整数据应包含近 6 个月（约 180 天）的每日记录，此处仅展示最近 7 天作为结构示例。page-design-agent 生成时应填充完整 6 个月数据用于热力图渲染",
    "days": [
      { "date": "2026-03-28", "commits": 5, "prsCreated": 1, "prsMerged": 0, "tasksCompleted": 2 },
      { "date": "2026-03-27", "commits": 3, "prsCreated": 0, "prsMerged": 1, "tasksCompleted": 1 },
      { "date": "2026-03-26", "commits": 7, "prsCreated": 2, "prsMerged": 1, "tasksCompleted": 3 },
      { "date": "2026-03-25", "commits": 0, "prsCreated": 0, "prsMerged": 0, "tasksCompleted": 0 },
      { "date": "2026-03-24", "commits": 4, "prsCreated": 1, "prsMerged": 2, "tasksCompleted": 1 },
      { "date": "2026-03-23", "commits": 6, "prsCreated": 1, "prsMerged": 0, "tasksCompleted": 2 },
      { "date": "2026-03-22", "commits": 0, "prsCreated": 0, "prsMerged": 0, "tasksCompleted": 0 }
    ]
  },
  "currentTasks": [
    { "id": "task-101", "title": "实现数字人表情引擎 V2", "projectName": "Avatar 数字人平台", "status": "in_progress", "priority": "high", "storyPoints": 5, "dueDate": "2026-04-02" },
    { "id": "task-102", "title": "优化语音合成延迟", "projectName": "Avatar 数字人平台", "status": "in_progress", "priority": "urgent", "storyPoints": 3, "dueDate": "2026-03-30" },
    { "id": "task-103", "title": "编写数字人 API 文档", "projectName": "Avatar 数字人平台", "status": "review", "priority": "medium", "storyPoints": 2, "dueDate": "2026-04-05" },
    { "id": "task-104", "title": "修复口型同步偏移 Bug", "projectName": "Avatar 数字人平台", "status": "todo", "priority": "high", "storyPoints": 3, "dueDate": "2026-04-08" },
    { "id": "task-105", "title": "集成 AirFlow 触发接口", "projectName": "AirFlow 工作流引擎", "status": "todo", "priority": "medium", "storyPoints": 2, "dueDate": "2026-04-10" }
  ],
  "kpiScorecard": {
    "sprintDeliveryRate": 86.8,
    "avgDeliveryDays": 4.2,
    "bugDensity": 0.35,
    "prMergeTimeAvg": 28.5,
    "reviewParticipation": 65,
    "activityStreak": 12
  }
}
```

#### 交互逻辑

1. **面包屑导航**：点击"团队总览" -> router.push("/")；点击"[项目名]" -> router.push(`/projects/${projectId}`)
2. **Sprint 交付率 hover**：hover 折线图数据点 -> tooltip 显示 Sprint 名称 + 分配点数 + 完成点数 + 交付率百分比
3. **KPI 雷达图 hover**：hover 雷达图各顶点 -> tooltip 显示指标名称 + 当前值 + 目标值 + 状态（达标/预警/异常）
4. **热力图 hover**：hover 单日色块 -> tooltip 显示日期 + commits数 + PRs创建数 + PRs合入数 + 任务完成数
5. **任务列表行 hover**：hover 任务行 -> 行背景高亮 -> 显示优先级颜色条（urgent红/high橙/medium蓝/low灰）
6. **任务详情弹窗**：点击任务行 -> 弹窗展示任务标题 + 完整描述 + 标签列表 + 所属项目 + 创建时间

---

### [P05] OKR 看板

**路由**：/okr
**关联 PRD 功能**：3.5 OKR 看板页
**页面定位**：OKR 树形展示页，季度评审核心工具。admin/manager 可内联编辑 KR 进度，developer/viewer 只读。

#### 页面结构

- **区域 A（左侧）**：AppSidebar
- **区域 B（顶部）**：AppHeader（面包屑"OKR 看板"）+ FilterBar（期间筛选：2026-Q1/Q2/Q3/Q4）+ 操作按钮区（"新增 Objective" -- 仅 admin/manager 可见）
- **区域 C（主内容区）**：OKR 树形列表，每个 Objective 是一个可展开卡片，展开后显示 KR 列表
- **响应式**：卡片全宽适应

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 期间筛选器 | 下拉选择 | 2026-Q1/Q2/Q3/Q4 | 选择后刷新 OKR 列表 | default/open/selected |
| 新增 Objective 按钮 | 按钮（主要） | "+ 新增目标" | 点击弹出创建 Objective 表单弹窗 | default/hover/active（仅admin/manager可见） |
| Objective 卡片 | 可展开卡片 | 标题 + 负责人 + 所属项目 + 进度条(百分比) + 展开/折叠箭头 | 点击展开/折叠 KR 列表 | 折叠/展开 |
| Objective 进度条 | 进度条 | 加权平均进度百分比 | 无（自动计算） | 0-100% 颜色渐变（红<30%/橙30-60%/蓝60-80%/绿>80%） |
| KR 行 | 列表项 | KR 标题 + 进度条(currentValue/targetValue) + 单位 + 权重标签 | hover 高亮 | 正常/hover/编辑中 |
| KR 进度编辑 | 内联编辑 | currentValue 数字输入框 | 点击数值 -> 变为编辑输入框 -> Enter/blur 提交 | 只读/编辑中/提交中/更新成功闪绿/提交失败闪红 |
| KR 进度条 | 进度条 | currentValue / targetValue 百分比 | 编辑 currentValue 后实时更新 | 动态百分比 |
| 新增 Objective 弹窗 | 弹窗表单 | 标题输入 + 负责人选择 + 所属项目选择 + 期间选择 | 填写后点击"创建" | 隐藏/显示/提交中 |
| 新增 KR 按钮 | 按钮（次要） | "+ 添加关键结果" | 点击在 Objective 下方新增 KR 行 | default/hover（仅admin/manager） |
| 新增 KR 内联表单 | 内联表单 | KR 标题 + 目标值 + 单位 + 权重 | 填写后 Enter 或点击确认提交 | 隐藏/显示/提交中 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面加载/期间切换 | LoadingSkeleton |
| 正常状态 | 数据加载完成 | OKR 树形列表展示 |
| 空状态 | 该期间无 OKR | EmptyState "该季度暂无 OKR 目标" + "新增目标"按钮（admin/manager可见） |
| 编辑中 | 用户点击 KR 数值 | 该 KR 行 currentValue 变为输入框，带保存/取消操作 |
| 只读模式 | developer/viewer 角色 | 隐藏所有编辑入口和新增按钮 |
| 保存中 | 提交 KR 进度更新 | KR 进度条显示微 loading，提交成功后 Objective 进度自动重算并动画过渡 |
| 错误状态 | API 失败 | ErrorState + "重试" |

#### 假数据规格

```json
{
  "objectives": [
    {
      "id": "obj-001",
      "title": "提升研发交付效率 30%",
      "ownerName": "张伟",
      "projectName": "全局",
      "period": "2026-Q2",
      "progress": 72,
      "keyResults": [
        { "id": "kr-001", "title": "Sprint 平均交付率达到 85%", "targetValue": 85, "currentValue": 82, "unit": "%", "weight": 3, "progress": 96.5 },
        { "id": "kr-002", "title": "PR 平均合入时间降至 24h", "targetValue": 24, "currentValue": 31, "unit": "h", "weight": 2, "progress": 77.4 },
        { "id": "kr-003", "title": "Bug 密度降低至 0.3/功能点", "targetValue": 0.3, "currentValue": 0.42, "unit": "个/功能点", "weight": 2, "progress": 71.4 }
      ]
    },
    {
      "id": "obj-002",
      "title": "完成 Q2 产品路线图",
      "ownerName": "李明",
      "projectName": "Avatar 数字人平台",
      "period": "2026-Q2",
      "progress": 58,
      "keyResults": [
        { "id": "kr-004", "title": "Avatar 平台 V2 上线", "targetValue": 100, "currentValue": 65, "unit": "%", "weight": 5, "progress": 65 },
        { "id": "kr-005", "title": "AirFlow 引擎核心功能完成", "targetValue": 100, "currentValue": 50, "unit": "%", "weight": 3, "progress": 50 },
        { "id": "kr-006", "title": "DataHub 数据接入 10 个数据源", "targetValue": 10, "currentValue": 7, "unit": "个", "weight": 2, "progress": 70 }
      ]
    },
    {
      "id": "obj-003",
      "title": "建设 DevOps 自动化体系",
      "ownerName": "陈浩",
      "projectName": "DevOps 自动化平台",
      "period": "2026-Q2",
      "progress": 85,
      "keyResults": [
        { "id": "kr-007", "title": "CI/CD 流水线覆盖率 100%", "targetValue": 100, "currentValue": 95, "unit": "%", "weight": 3, "progress": 95 },
        { "id": "kr-008", "title": "部署频率提升至每日 2 次", "targetValue": 2, "currentValue": 1.8, "unit": "次/日", "weight": 2, "progress": 90 }
      ]
    },
    {
      "id": "obj-004",
      "title": "提升团队工程文化",
      "ownerName": "张伟",
      "projectName": "全局",
      "period": "2026-Q2",
      "progress": 45,
      "keyResults": [
        { "id": "kr-009", "title": "Code Review 参与率达到 80%", "targetValue": 80, "currentValue": 62, "unit": "%", "weight": 3, "progress": 77.5 },
        { "id": "kr-010", "title": "技术分享会每月 2 次", "targetValue": 2, "currentValue": 1, "unit": "次/月", "weight": 1, "progress": 50 },
        { "id": "kr-011", "title": "新人 30 天独立交付首个需求", "targetValue": 30, "currentValue": 35, "unit": "天", "weight": 2, "progress": 85.7 }
      ]
    },
    {
      "id": "obj-005",
      "title": "优化客户管理流程",
      "ownerName": "赵丽",
      "projectName": "客户管理系统",
      "period": "2026-Q2",
      "progress": 62,
      "keyResults": [
        { "id": "kr-012", "title": "客户响应时间降至 4h", "targetValue": 4, "currentValue": 5.2, "unit": "h", "weight": 3, "progress": 76.9 },
        { "id": "kr-013", "title": "客户满意度达到 90%", "targetValue": 90, "currentValue": 82, "unit": "%", "weight": 2, "progress": 91.1 }
      ]
    }
  ]
}
```

#### 交互逻辑

1. **期间筛选**：选择季度 -> OKR 列表刷新 -> 加载对应季度的 Objective 和 KR 数据
2. **Objective 展开/折叠**：点击 Objective 卡片标题区或箭头 -> 切换展开/折叠状态 -> 展开时显示 KR 列表，折叠时隐藏
3. **KR 进度内联编辑（仅 admin/manager）**：点击 KR 行的 currentValue 数值 -> 数值变为输入框（预填当前值，全选）-> 修改数值后 Enter 或 blur -> 调用 PATCH /api/okr/key-results/:id -> 成功后 KR 进度条动画更新 + Objective 进度自动重算并动画过渡 -> 失败时恢复原值并 Toast 报错
4. **新增 Objective（仅 admin/manager）**：点击"+ 新增目标" -> 弹窗显示创建表单（标题/负责人下拉/项目下拉/期间选择）-> 填写后点击"创建" -> POST /api/okr/objectives -> 成功后刷新列表 + Toast "创建成功"
5. **新增 KR（仅 admin/manager）**：点击 Objective 下方"+ 添加关键结果" -> 内联表单出现（标题输入/目标值输入/单位选择/权重输入）-> 前端校验（标题非空且 >= 2 字符，目标值 > 0 为数字，权重 > 0 为数字）-> 校验失败时对应输入框红色边框+错误提示 -> 校验通过后 Enter 或确认按钮提交 -> POST /api/okr/objectives/:id/key-results -> 成功后 KR 列表刷新 + Objective 进度重算
6. **新增 Objective 表单校验**：标题非空且 >= 2 字符，负责人必选，期间必选 -> 校验失败时对应字段红色提示 -> 校验通过后提交
7. **删除 KR（仅 admin/manager）**：hover KR 行时右侧出现删除图标（垃圾桶） -> 点击 -> ConfirmDialog "确定删除关键结果 [KR标题]？" -> 确认后 DELETE 请求 -> 成功后 KR 从列表移除 + Objective 进度重算
8. **只读模式切换**：developer/viewer 角色 -> 自动隐藏"新增目标"按钮、"添加关键结果"按钮、KR 内联编辑入口、KR 删除图标

---

### [P06] Git 活动

**路由**：/git
**关联 PRD 功能**：3.6 Git 活动页
**页面定位**：团队整体 Git 贡献统计页，帮助 CTO/组长识别代码审查瓶颈和贡献分布。developer 角色仅可见自己数据。

#### 页面结构

- **区域 A（左侧）**：AppSidebar
- **区域 B（顶部）**：AppHeader（面包屑"Git 活动"）+ FilterBar（时间范围+成员筛选 -- admin/manager 可筛选全部成员，developer 锁定为自己）
- **区域 C（主内容区）**：
  - 行 1（全宽）：团队整体贡献热力图 DataCard
  - 行 2（1x2 Grid）：左 PR 指标表格 DataCard | 右 仓库维度统计 DataCard
- **响应式**：< 768px Grid 变为 1 列堆叠

#### 页面元素清单

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 时间范围选择 | 下拉选择 | 近 4 周/近 12 周/近 6 个月/自定义 | 选择后联动刷新全部 | default/open/selected |
| 成员筛选 | 下拉选择 | 全部成员/单个成员（developer 锁定为自己） | 选择后联动刷新 | default/open/selected/locked(developer) |
| 团队贡献热力图 | DataCard + 热力图 | GitHub 风格热力图，X=周，Y=周一-周日，色深=活跃度（commits+PRs） | hover 显示日期+commits+additions+deletions | 正常/hover tooltip |
| PR 指标表格 | DataCard + 表格 | 列: 成员/PR 总数/已合入数/平均合入时间(h)/Review 参与率(%) | 点击成员名跳转 /members/:id，表头可排序 | 正常/hover行高亮/排序升降 |
| 仓库维度统计 | DataCard + 柱状图组 | 每个仓库的近期 Commit 趋势（按周折线），仓库名标签 | hover 显示该仓库该周的 commit 详情 | 正常/hover tooltip |
| 汇总指标栏 | 卡片组 | 4 个小 KPI 卡: 总 PR 数/已合入 PR 数/平均合入时间/团队 Review 参与率 | 无 | 达标绿/预警琥珀/异常红 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面加载 | LoadingSkeleton |
| 正常状态 | 数据加载完成 | 所有区域展示数据 |
| 空状态 | 无 Git 数据 | EmptyState "暂无 Git 活动数据，请确认 Gitea 同步已配置" |
| Developer 模式 | developer 角色访问 | 成员筛选锁定为自己，热力图只显示自己数据，PR 表格只有自己一行 |
| 权限不足 | viewer 角色访问 | 全页展示"无权访问 Git 活动页" + "返回总览"按钮 |
| 错误状态 | API 失败 | ErrorState + "重试" |

#### 假数据规格

```json
{
  "heatmap": [
    { "date": "2026-03-28", "commits": 45, "additions": 1230, "deletions": 420 },
    { "date": "2026-03-27", "commits": 38, "additions": 980, "deletions": 350 },
    { "date": "2026-03-26", "commits": 52, "additions": 1560, "deletions": 580 },
    { "date": "2026-03-25", "commits": 12, "additions": 340, "deletions": 120 },
    { "date": "2026-03-24", "commits": 41, "additions": 1100, "deletions": 390 },
    { "date": "2026-03-23", "commits": 35, "additions": 890, "deletions": 310 },
    { "date": "2026-03-22", "commits": 8, "additions": 210, "deletions": 80 }
  ],
  "prMetrics": [
    { "userId": "usr-002", "name": "李明", "totalPRs": 18, "mergedPRs": 15, "avgMergeTimeHours": 28.5, "reviewParticipation": 65 },
    { "userId": "usr-003", "name": "王芳", "totalPRs": 22, "mergedPRs": 20, "avgMergeTimeHours": 18.3, "reviewParticipation": 82 },
    { "userId": "usr-004", "name": "陈浩", "totalPRs": 15, "mergedPRs": 14, "avgMergeTimeHours": 24.1, "reviewParticipation": 71 },
    { "userId": "usr-005", "name": "赵丽", "totalPRs": 12, "mergedPRs": 10, "avgMergeTimeHours": 35.2, "reviewParticipation": 55 },
    { "userId": "usr-006", "name": "刘洋", "totalPRs": 8, "mergedPRs": 7, "avgMergeTimeHours": 42.8, "reviewParticipation": 40 },
    { "userId": "usr-008", "name": "黄强", "totalPRs": 10, "mergedPRs": 8, "avgMergeTimeHours": 52.3, "reviewParticipation": 30 },
    { "userId": "usr-009", "name": "周婷", "totalPRs": 14, "mergedPRs": 12, "avgMergeTimeHours": 22.6, "reviewParticipation": 78 }
  ],
  "repoStats": [
    { "repoName": "avatar-platform", "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 35 },
      { "weekStart": "2026-03-09", "commits": 42 },
      { "weekStart": "2026-03-16", "commits": 28 },
      { "weekStart": "2026-03-23", "commits": 31 }
    ]},
    { "repoName": "airflow-engine", "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 22 },
      { "weekStart": "2026-03-09", "commits": 18 },
      { "weekStart": "2026-03-16", "commits": 25 },
      { "weekStart": "2026-03-23", "commits": 20 }
    ]},
    { "repoName": "datahub-core", "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 15 },
      { "weekStart": "2026-03-09", "commits": 20 },
      { "weekStart": "2026-03-16", "commits": 18 },
      { "weekStart": "2026-03-23", "commits": 12 }
    ]},
    { "repoName": "smartdoc-api", "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 8 },
      { "weekStart": "2026-03-09", "commits": 12 },
      { "weekStart": "2026-03-16", "commits": 10 },
      { "weekStart": "2026-03-23", "commits": 14 }
    ]},
    { "repoName": "devops-pipeline", "weeklyTrend": [
      { "weekStart": "2026-03-02", "commits": 18 },
      { "weekStart": "2026-03-09", "commits": 15 },
      { "weekStart": "2026-03-16", "commits": 22 },
      { "weekStart": "2026-03-23", "commits": 19 }
    ]}
  ],
  "summary": {
    "totalPRs": 99,
    "mergedPRs": 86,
    "avgMergeTimeHours": 31.8,
    "teamReviewParticipation": 60.1
  }
}
```

#### 交互逻辑

1. **时间范围筛选**：选择时间范围 -> 全部数据区域联动刷新
2. **成员筛选**：admin/manager 可选择全部或单个成员 -> 热力图+PR表格+仓库统计联动更新 -> developer 角色此下拉不可操作（锁定为自己）
3. **热力图 hover**：hover 日期色块 -> tooltip 显示日期 + commits 数 + 新增行数 + 删除行数
4. **PR 表格排序**：点击表头"平均合入时间" -> 切换升序/降序排列 -> 点击"Review 参与率"同理
5. **PR 表格成员点击**：点击成员姓名 -> router.push(`/members/${userId}`)
6. **仓库统计 hover**：hover 仓库趋势图数据点 -> tooltip 显示仓库名 + 该周 commits 数

---

### [P07] 管理后台

**路由**：/admin
**关联 PRD 功能**：3.7 管理后台页
**页面定位**：系统管理功能集合，仅 admin 可访问。包含用户管理、Git 作者映射、同步日志三个 Tab。

#### 页面结构

- **区域 A（左侧）**：AppSidebar
- **区域 B（顶部）**：AppHeader（面包屑"管理后台"）
- **区域 C（主内容区）**：Tab 切换栏（用户管理 | 作者映射 | 同步日志）
  - Tab 1 用户管理：用户列表表格 + "创建用户"按钮
  - Tab 2 作者映射：未关联 Git 作者列表 + 已关联映射列表
  - Tab 3 同步日志：同步日志表格 + "手动触发同步"按钮组

#### 页面元素清单

**Tab 1：用户管理**

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| "创建用户"按钮 | 按钮（主要） | "+ 创建用户" | 点击弹出创建用户表单弹窗 | default/hover/active |
| 用户列表表格 | 表格 | 列: 姓名/邮箱/角色徽章/Git用户名/创建时间/操作(编辑\|删除) | 表头可排序 | 正常/hover行高亮 |
| 编辑按钮 | 图标按钮 | 铅笔图标 | 点击弹出编辑用户表单弹窗（预填数据） | default/hover |
| 删除按钮 | 图标按钮 | 垃圾桶图标（红色） | 点击弹出确认弹窗"确定删除用户 XXX？" | default/hover |
| 创建/编辑用户弹窗 | 弹窗表单 | 姓名输入+邮箱输入+密码输入(创建时)+角色下拉(admin/manager/developer/viewer)+Git用户名输入(可选) | 填写后点击"保存" | 隐藏/显示/提交中/验证错误 |
| 角色筛选 | 下拉筛选 | 全部/admin/manager/developer/viewer | 选择后表格筛选 | default/open/selected |

**Tab 2：作者映射**

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| 未关联作者列表 | 卡片列表 | 每张卡片: Git 作者名+Git 邮箱+最近 commit 时间+"关联到用户"下拉 | 选择用户后自动提交关联 | 未关联/选择中/已关联(卡片消失,移入下方) |
| 已关联映射表格 | 表格 | 列: Git作者名/Git邮箱/关联用户/关联时间/操作(取消关联) | 点击"取消关联"弹出确认 | 正常/hover |
| 未关联数量徽章 | 徽章 | Tab 标题旁红色数字徽章，如 "作者映射 (3)" | 无 | 有未关联时显示/全部关联后隐藏 |

**Tab 3：同步日志**

| 元素 | 类型 | 内容/数据 | 交互行为 | 状态变化 |
|------|------|----------|---------|---------|
| "触发 Plane 同步"按钮 | 按钮（次要） | "同步 Plane 数据" | 点击后按钮进入 loading 态 -> POST 触发同步 | default/hover/loading/success/error |
| "触发 Gitea 同步"按钮 | 按钮（次要） | "同步 Gitea 数据" | 同上 | default/hover/loading/success/error |
| 最近同步状态卡片 | 信息卡片 | Plane 最近同步时间+状态 / Gitea 最近同步时间+状态 | 无 | 成功(绿)/失败(红)/同步中(蓝+旋转) |
| 同步日志表格 | 表格 | 列: 时间/数据源(Plane/Gitea)/状态(成功绿/失败红)/处理记录数/消息 | 表头可排序，支持分页 | 正常/hover行高亮 |
| 分页器 | 分页组件 | 页码+每页条数选择(10/20/50) | 点击翻页/切换条数 | 当前页高亮 |

#### 页面状态

| 状态 | 触发条件 | 页面表现 |
|------|---------|---------|
| 加载中 | 页面加载/Tab 切换 | 对应 Tab 内容区 LoadingSkeleton |
| 正常状态 | 数据加载完成 | 表格和列表正常展示 |
| 空状态-用户 | 无用户数据（不太可能） | "暂无用户" + 创建按钮 |
| 空状态-映射 | 无未关联作者 | "所有 Git 作者已关联" 成功状态 |
| 空状态-日志 | 无同步日志 | "暂无同步记录，请先触发同步" |
| 同步进行中 | 手动触发同步后 | 触发按钮 loading 态 + 最近同步卡片显示蓝色旋转图标 |
| 同步完成 | 同步任务结束 | Toast 通知结果 + 日志表格自动刷新 + 最近同步卡片更新 |
| 权限不足 | 非 admin 角色访问 | 全页展示"您无权访问管理后台" + "返回总览"按钮 |
| 错误状态 | API 失败 | 对应区域 ErrorState + "重试" |

#### 假数据规格

```json
{
  "users": [
    { "id": "usr-001", "displayName": "张伟", "email": "zhang.wei@jasonqiyuan.com", "role": "admin", "gitUsername": "zhangwei", "createdAt": "2026-01-15T08:00:00Z" },
    { "id": "usr-002", "displayName": "李明", "email": "li.ming@jasonqiyuan.com", "role": "developer", "gitUsername": "liming", "createdAt": "2026-01-15T08:00:00Z" },
    { "id": "usr-003", "displayName": "王芳", "email": "wang.fang@jasonqiyuan.com", "role": "developer", "gitUsername": "wangfang", "createdAt": "2026-01-16T09:00:00Z" },
    { "id": "usr-004", "displayName": "陈浩", "email": "chen.hao@jasonqiyuan.com", "role": "manager", "gitUsername": "chenhao", "createdAt": "2026-01-16T09:00:00Z" },
    { "id": "usr-005", "displayName": "赵丽", "email": "zhao.li@jasonqiyuan.com", "role": "developer", "gitUsername": "zhaoli", "createdAt": "2026-01-20T10:00:00Z" },
    { "id": "usr-006", "displayName": "刘洋", "email": "liu.yang@jasonqiyuan.com", "role": "developer", "gitUsername": "liuyang", "createdAt": "2026-02-01T08:00:00Z" },
    { "id": "usr-007", "displayName": "杰森代表 A", "email": "jason.rep.a@jasongroup.com", "role": "viewer", "gitUsername": null, "createdAt": "2026-02-10T10:00:00Z" },
    { "id": "usr-008", "displayName": "黄强", "email": "huang.qiang@jasonqiyuan.com", "role": "developer", "gitUsername": "huangqiang", "createdAt": "2026-02-15T09:00:00Z" },
    { "id": "usr-009", "displayName": "周婷", "email": "zhou.ting@jasonqiyuan.com", "role": "developer", "gitUsername": "zhouting", "createdAt": "2026-03-01T08:00:00Z" }
  ],
  "unmappedAuthors": [
    { "gitEmail": "intern01@gmail.com", "gitUsername": "intern-01", "lastCommitAt": "2026-03-25T14:30:00Z", "recentRepo": "avatar-platform" },
    { "gitEmail": "contractor@external.com", "gitUsername": "ext-dev", "lastCommitAt": "2026-03-20T11:00:00Z", "recentRepo": "datahub-core" },
    { "gitEmail": "old-email@company.com", "gitUsername": "liming-old", "lastCommitAt": "2026-02-15T09:00:00Z", "recentRepo": "airflow-engine" }
  ],
  "mappedAuthors": [
    { "id": "map-001", "gitEmail": "li.ming@gmail.com", "gitUsername": "liming-gh", "userId": "usr-002", "userName": "李明", "mappedAt": "2026-01-20T10:00:00Z" },
    { "id": "map-002", "gitEmail": "wang.fang@outlook.com", "gitUsername": "wf-dev", "userId": "usr-003", "userName": "王芳", "mappedAt": "2026-01-21T11:00:00Z" },
    { "id": "map-003", "gitEmail": "chen.hao@personal.com", "gitUsername": "ch-coder", "userId": "usr-004", "userName": "陈浩", "mappedAt": "2026-01-22T09:00:00Z" }
  ],
  "syncLogs": [
    { "id": "log-001", "source": "plane", "status": "success", "message": "同步完成", "recordsProcessed": 156, "syncedAt": "2026-03-28T10:15:00Z" },
    { "id": "log-002", "source": "gitea", "status": "success", "message": "同步完成", "recordsProcessed": 89, "syncedAt": "2026-03-28T10:30:00Z" },
    { "id": "log-003", "source": "plane", "status": "error", "message": "Plane API 超时：连接 plane:8082 超时 30s", "recordsProcessed": 0, "syncedAt": "2026-03-28T09:15:00Z" },
    { "id": "log-004", "source": "plane", "status": "success", "message": "同步完成", "recordsProcessed": 142, "syncedAt": "2026-03-28T08:15:00Z" },
    { "id": "log-005", "source": "gitea", "status": "success", "message": "同步完成", "recordsProcessed": 67, "syncedAt": "2026-03-28T08:30:00Z" },
    { "id": "log-006", "source": "plane", "status": "success", "message": "同步完成", "recordsProcessed": 138, "syncedAt": "2026-03-27T22:15:00Z" },
    { "id": "log-007", "source": "gitea", "status": "error", "message": "Gitea API 认证失败：token 已过期", "recordsProcessed": 0, "syncedAt": "2026-03-27T22:30:00Z" },
    { "id": "log-008", "source": "plane", "status": "success", "message": "手动触发同步完成", "recordsProcessed": 145, "syncedAt": "2026-03-27T16:00:00Z" }
  ],
  "lastSync": {
    "plane": { "lastSyncedAt": "2026-03-28T10:15:00Z", "status": "success" },
    "gitea": { "lastSyncedAt": "2026-03-28T10:30:00Z", "status": "success" }
  }
}
```

#### 交互逻辑

**Tab 切换**
0. **Tab 导航**：点击 Tab 标题（用户管理/作者映射/同步日志）-> 切换显示对应内容区 -> URL hash 更新为 #users/#mappings/#logs 以支持直接链接和刷新保持 -> 切换时目标 Tab 内容区淡入（200ms）

**Tab 1：用户管理**
1. **创建用户**：点击"+ 创建用户" -> 弹窗表单（姓名/邮箱/初始密码/角色下拉/Git用户名(可选)）-> 邮箱实时格式校验 -> 初始密码 >= 8 位且含字母+数字校验 -> 点击"保存" -> POST /api/admin/users -> 成功后关闭弹窗+刷新列表+Toast "用户创建成功，初始密码已设置"
2. **编辑用户**：点击行操作栏铅笔图标 -> 弹窗预填现有数据（密码字段为空，标注"留空则不修改密码"）-> 可修改姓名/邮箱/角色/Git用户名/密码 -> 修改后点击"保存" -> PATCH /api/admin/users/:id -> 成功后关闭弹窗+刷新列表+Toast "用户信息已更新"
3. **删除用户**：点击行操作栏垃圾桶图标 -> ConfirmDialog "确定删除用户 [姓名]？此操作不可撤销" -> 确认后 DELETE -> 成功后刷新列表+Toast
4. **角色筛选**：选择角色 -> 表格筛选显示对应角色用户

**Tab 2：作者映射**
5. **关联 Git 作者**：未关联卡片中点击"关联到用户"下拉 -> 选择本地用户 -> POST /api/admin/author-mappings -> 成功后卡片淡出消失，映射出现在已关联表格 + 未关联数量徽章 -1
6. **取消关联**：点击已关联表格行的"取消关联" -> ConfirmDialog "确定取消 [Git作者] 与 [用户名] 的关联？" -> 确认后删除映射 -> 该作者回到未关联列表

**Tab 3：同步日志**
7. **手动触发 Plane 同步**：点击"同步 Plane 数据" -> 按钮进入 loading("同步中...")  -> POST /api/admin/sync/trigger -> 按钮恢复 -> 同步完成后日志表格自动追加新记录 + 最近同步时间更新 + Toast 结果
8. **手动触发 Gitea 同步**：同上逻辑
9. **日志表格分页**：点击页码/切换每页条数 -> 表格刷新对应页数据
10. **日志表格排序**：点击"时间"表头 -> 切换升序/降序

---

## 4. 页面间跳转关系

```
Login (/login)
  |-- 登录成功 --> 团队总览 (/)
  
团队总览 (/)
  |-- 面板3 产品线进度条点击 --> 项目明细 (/projects/:id)
  |-- 面板5 OKR 展开后点击 --> (暂无，仅展示KR摘要)
  |-- 侧边栏"OKR 看板" --> OKR 看板 (/okr)
  |-- 侧边栏"Git 活动" --> Git 活动 (/git) [仅 admin/manager/developer 可见]
  |-- 侧边栏"管理后台" --> 管理后台 (/admin) [仅 admin 可见]
  
项目明细 (/projects/:id)
  |-- 面包屑"团队总览" --> 团队总览 (/)
  |-- 任务矩阵成员名点击 --> 个人产出 (/members/:id)
  
个人产出 (/members/:id)
  |-- 面包屑"团队总览" --> 团队总览 (/)
  |-- 面包屑"[项目名]" --> 项目明细 (/projects/:id)
  
OKR 看板 (/okr)
  |-- 侧边栏导航回其他页面
  
Git 活动 (/git)
  |-- PR 表格成员名点击 --> 个人产出 (/members/:id)
  |-- 侧边栏导航回其他页面
  
管理后台 (/admin)
  |-- 侧边栏导航回其他页面

所有已认证页面 (P02-P07)
  |-- Token 过期 --> 登录页 (/login?expired=true)
  |-- AppSidebar 用户区"退出登录" --> 登录页 (/login)
```

### 侧边栏导航项（按角色可见性）

| 导航项 | admin | manager | developer | viewer |
|--------|-------|---------|-----------|--------|
| 团队总览 | 显示 | 显示 | 显示 | 显示 |
| OKR 看板 | 显示 | 显示 | 显示 | 显示 |
| Git 活动 | 显示 | 显示 | 显示 | 隐藏 |
| 管理后台 | 显示 | 隐藏 | 隐藏 | 隐藏 |

> **注意**："项目明细"和"个人产出"不在侧边栏直接暴露，通过页面内下钻访问。
