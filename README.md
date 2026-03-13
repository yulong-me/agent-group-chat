# AI Agent 协作群组系统

基于 Paperclip 理念，构建的多 Agent 协作对话系统，类似 QQ 群的多 Agent 协作平台。

## 特性

- 🤖 **多 Agent 协作**：PM、Developer、Tester、Designer 四种角色 Agent
- 💬 **群聊界面**：类似 QQ/Discord 的消息流界面
- @**任务分配**：通过 @提及分配任务给特定 Agent
- 📋 **任务追踪**：右侧任务面板查看任务进度
- 🔧 **双重调用**：支持 Claude Code CLI 或 Anthropic API

## 技术栈

- **前端**：Next.js + React + TailwindCSS
- **后端**：Next.js API Routes
- **Agent**：Claude Code CLI / Anthropic API

## 快速开始

### 1. 安装依赖

```bash
cd agent-group-chat
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 3. 配置 Claude

有两种调用方式可选：

#### 方式一：Claude Code CLI（推荐）

1. 安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
2. 运行 `claude login` 登录
3. 在设置页面选择 "Claude Code CLI" 方式

#### 方式二：Anthropic API

1. 获取 [API Key](https://console.anthropic.com/)
2. 在设置页面填写 API Key 和选择模型

## 使用方法

### 发送任务

在消息框输入任务描述，例如：
- "帮我写一个登录页面"
- "实现用户管理功能"
- "设计一个仪表盘界面"

### @提及特定 Agent

使用 @ 提及特定 Agent：
- @PM - 项目经理
- @Developer / @开发 - 开发者
- @Tester / @测试 - 测试工程师
- @Designer / @设计 - 设计师

### 任务协作流程

1. 用户发送任务
2. 系统自动创建任务
3. Agent 团队协作完成
4. 任务状态更新

## 项目结构

```
agent-group-chat/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/          # 聊天 API
│   │   │   ├── config/        # 配置 API
│   │   │   └── test-connection/ # 连接测试
│   │   ├── settings/          # 设置页面
│   │   └── page.tsx           # 主页面
│   ├── components/           # React 组件
│   │   ├── AgentList.tsx     # Agent 列表
│   │   ├── MessageList.tsx   # 消息列表
│   │   ├── MessageInput.tsx  # 消息输入
│   │   └── TaskPanel.tsx     # 任务面板
│   ├── lib/
│   │   └── claude-cli.ts     # Claude CLI 封装
│   ├── store/
│   │   └── index.ts          # Zustand 状态管理
│   └── types/
│       └── index.ts          # TypeScript 类型
├── .github/workflows/
│   └── ci.yml                # GitHub Actions
└── package.json
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API Key | - |

## 开发

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

## 部署

### Vercel

```bash
npm i -g vercel
vercel
```

### Docker

```bash
docker build -t agent-group-chat .
docker run -p 3000:3000 agent-group-chat
```

## License

MIT
