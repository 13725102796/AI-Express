# KnowBase Frontend

KnowBase 个人知识库前端项目，基于 Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 构建。

## 快速启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm type-check
```

访问 http://localhost:3000

## 目录说明

```
src/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/login/       # 登录/注册页 (P-01)
│   ├── (main)/             # 需登录的主应用
│   │   ├── chat/           # AI 问答页 (P-02)
│   │   ├── library/        # 知识库列表页 (P-03)
│   │   ├── library/[id]/   # 知识条目详情页 (P-04)
│   │   ├── search/         # 搜索结果页 (P-05)
│   │   └── settings/       # 设置页 (P-08) + 空间管理 (P-07)
│   └── layout.tsx          # 根布局
├── components/
│   ├── ui/                 # 基础 UI 组件 (Button, Input, Modal, Toast...)
│   ├── layout/             # 布局组件 (AppShell, TopBar, SideNav)
│   ├── chat/               # 聊天组件 (ChatBubble, CitationPill, ChatInput)
│   ├── knowledge/          # 知识库组件 (KnowledgeCard, ContentViewer)
│   ├── upload/             # 上传组件 (UploadModal, UploadDropzone)
│   ├── search/             # 搜索组件 (SearchResultCard)
│   ├── spaces/             # 空间组件 (SpaceCard)
│   └── settings/           # 设置组件 (ProfileSection, UsageBars)
├── hooks/                  # 自定义 Hooks
├── lib/                    # 工具库 (utils, auth)
├── services/               # API 调用层 (mock 数据)
├── stores/                 # Zustand 状态管理
└── styles/                 # 全局样式 + 设计令牌
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5.7
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **UI 基础**: Radix UI Primitives
- **数据请求**: @tanstack/react-query (预留)
- **AI 集成**: Vercel AI SDK (预留)

## 设计系统

设计令牌从 `demo.html` 提取，定义在 `src/styles/globals.css` 中：

- 色彩：Primary (#2563EB), Accent (#F59E0B), Success/Error
- 圆角：btn(8px), card(12px), modal(16px), pill(9999px)
- 阴影：card, card-hover, modal, focus
- 字体：Inter + Noto Sans SC (UI), JetBrains Mono (代码)

## 当前状态

所有 API 调用使用 mock 数据，后端完成后切换为真实接口。
修改 `src/services/` 目录下的文件即可对接真实 API。
