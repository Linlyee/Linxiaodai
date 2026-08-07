# 🍜 林小呆 (Linxiaodai)

**AI 外卖决策助手** — 用自然语言对话帮你决定今天吃什么。

## 项目简介

饭小智是一个网页端 AI 外卖决策 Agent。用户通过自然语言对话描述需求（如"两个人吃，想吃辣，60元以内"），Agent 自动提取预算、口味、忌口等条件，智能推荐餐厅和餐品。支持外卖盲盒、购物车、订单追踪等完整外卖流程。

### 核心特色

- 🤖 **AI 对话驱动**：自然语言交互，多轮追问，持续优化需求
- 🎁 **外卖盲盒**：遵守用户约束的"可控随机"推荐
- 📋 **智能推荐**：基于预算、口味、评分、配送时间多维度排序
- 🛒 **完整下单流程**：购物车 → 确认 → 模拟支付 → 实时追踪
- 🔌 **Provider 模式**：Agent 和餐厅数据均可替换，无需真实 API Key 即可运行

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| 样式 | Tailwind CSS 4 |
| 数据库 | PostgreSQL + Prisma ORM 6 |
| 认证 | JWT (jose) |
| 实时通信 | Server-Sent Events (SSE) |
| 状态管理 | Zustand |
| 校验 | Zod |
| 测试 | Vitest |
| 容器化 | Docker Compose |

## 快速开始

### 环境要求

- Node.js 22+
- PostgreSQL 16+（或使用 Docker）

### 本地开发

```bash
# 1. 进入项目
cd fanxiaozhi

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，配置 DATABASE_URL 指向你的 PostgreSQL

# 4. 初始化数据库
npx prisma db push
npx prisma db seed

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

### Docker 启动（推荐）

```bash
docker compose up -d
```

自动启动 PostgreSQL 和应用，执行数据库迁移和种子数据。

### 演示账号

| 邮箱 | 密码 |
|------|------|
| demo@fanxiaozhi.com | demo123 |

## 项目结构

```
fanxiaozhi/
├── prisma/
│   ├── schema.prisma              # 数据库模型
│   └── seed.ts                    # 种子数据（24家餐厅 + 80+餐品）
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # 认证（注册/登录/登出/当前用户）
│   │   │   ├── chat/              # AI 对话
│   │   │   ├── restaurants/       # 餐厅查询
│   │   │   ├── menu-items/        # 餐品查询
│   │   │   ├── orders/            # 订单管理 + SSE 实时追踪
│   │   │   ├── blind-box/         # 外卖盲盒
│   │   │   └── user/              # 用户资料/地址/收藏
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 主页面（三栏布局）
│   │   └── globals.css            # 全局样式 + 设计 Token
│   ├── components/
│   │   ├── AppProvider.tsx         # 应用入口（认证检查）
│   │   ├── AuthModal.tsx          # 登录/注册
│   │   ├── Sidebar.tsx            # 左侧栏（对话/订单/收藏/我的）
│   │   ├── ChatArea.tsx           # 中间对话区
│   │   ├── ChatMessage.tsx        # 消息气泡
│   │   ├── RecommendationCard.tsx  # 推荐卡片
│   │   ├── BlindBoxButton.tsx     # 盲盒按钮
│   │   ├── RightPanel.tsx         # 右侧面板
│   │   ├── CartPanel.tsx          # 购物车 + 结算
│   │   └── OrderTracker.tsx       # 订单状态追踪
│   ├── lib/
│   │   ├── db.ts                  # Prisma 客户端
│   │   ├── auth.ts                # JWT 认证工具
│   │   ├── sse.ts                 # SSE 实时推送
│   │   └── providers/
│   │       ├── agent/             # Agent Provider 抽象层
│   │       │   ├── types.ts       # Agent 输入/输出接口
│   │       │   ├── mock.ts        # Mock Agent（正则+规则引擎）
│   │       │   ├── openai.ts      # OpenAI Provider
│   │       │   └── index.ts       # Provider 工厂
│   │       └── restaurant/        # Restaurant Provider 抽象层
│   │           ├── types.ts       # 查询接口
│   │           ├── mock.ts        # Mock 数据 Provider
│   │           └── index.ts       # Provider 工厂
│   ├── store/
│   │   ├── auth.ts                # 认证状态 (Zustand)
│   │   ├── chat.ts                # 对话状态 (Zustand)
│   │   └── cart.ts                # 购物车状态 (Zustand)
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   └── __tests__/
│       └── agent.test.ts          # 核心逻辑测试（34个用例）
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://fanxiaozhi:fanxiaozhi@localhost:5432/fanxiaozhi` |
| `JWT_SECRET` | JWT 签名密钥 | 生产环境必须更换 |
| `AGENT_PROVIDER` | Agent 提供商 (`mock` / `openai`) | `mock` |
| `OPENAI_API_KEY` | OpenAI API Key | - |
| `OPENAI_MODEL` | OpenAI 模型名 | `gpt-4o` |
| `RESTAURANT_PROVIDER` | 餐厅数据源 (`mock`) | `mock` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | `http://localhost:3000` |

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 (`{name, email, password}`) |
| POST | `/api/auth/login` | 登录 (`{email, password}`) |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户及偏好 |

### 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 发送消息 `{message, conversationId?}` |
| GET | `/api/chat` | 对话列表 |
| GET | `/api/chat?id=xxx` | 获取指定对话 |

### 餐厅 & 餐品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/restaurants` | 餐厅列表（支持 `categories`, `minRating`, `search`, `limit` 等参数） |
| GET | `/api/restaurants/:id` | 餐厅详情（含菜单） |
| GET | `/api/menu-items` | 餐品列表（支持 `restaurantId`, `minPrice`, `spiceLevel` 等） |

### 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders` | 订单列表（支持 `status` 筛选） |
| GET | `/api/orders/:id` | 订单详情 |
| POST | `/api/orders/:id` | 订单操作：`{action: "pay"|"cancel"|"feedback"}` |
| GET | `/api/orders/:id/sse` | 订单状态实时 SSE 推送 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/user/profile` | 更新资料或偏好 |
| GET/POST/DELETE | `/api/user/addresses` | 收货地址 CRUD |
| GET/POST/DELETE | `/api/user/favorites` | 收藏餐厅 |

### 盲盒

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/blind-box` | 开启外卖盲盒，支持 `{budget, spiceLevel, excludeIngredients, cuisines}` |

## 架构设计

### Provider 模式

```
Agent Provider (AGENT_PROVIDER)
├── mock    → MockAgentProvider（内置正则+规则引擎，无需任何API Key）
└── openai  → OpenAI Provider（需 OPENAI_API_KEY）

Restaurant Provider (RESTAURANT_PROVIDER)
├── mock    → MockRestaurantProvider（24家餐厅+80+餐品种子数据）
└── (预留)   → 美团/饿了么等真实外卖平台 API Provider
```

### Agent 工作流

```
用户消息 → 需求提取 → 条件合并 → 餐品筛选 → 智能排序 → 推荐回复
                ↓                        ↓
          缺失条件追问              盲盒随机选择
```

### 安全原则

- Agent/LLM **不直接操作数据库**，所有推荐必须经过业务规则校验
- 支付流程**不可自动扣款**，用户必须手动确认
- 支付接口预留 Provider 层，当前为模拟支付

## 测试

```bash
npm test          # 运行全部测试
npm run test:watch  # 监听模式
```

共 34 个测试用例，覆盖：

| 模块 | 内容 |
|------|------|
| 需求解析 | 预算、人数、辣度、忌口的正则提取 |
| 推荐筛选 | 预算/辣度/菜系/过敏原/配送时间/多条件组合 |
| 盲盒约束 | 预算限制、过敏原排除、食材排除、无匹配处理 |
| 订单状态 | 状态流转合法性、终态不可变、取消规则 |

## 运行命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm test` | 运行测试 |
| `npm run lint` | 代码检查 |
| `npm run db:push` | 同步数据库 Schema |
| `npm run db:seed` | 插入种子数据 |
| `npm run db:studio` | 打开 Prisma Studio |

## 未来接入真实平台

1. **外卖平台**：实现 `RestaurantProvider` 接口，接入美团/饿了么等 API
2. **真实支付**：替换订单支付接口中的模拟逻辑
3. **真实 LLM**：已内置 OpenAI Provider，也可扩展 Claude 等
4. **地图服务**：接入高德/百度地图 API 实现真实距离和路径

## 已知限制

1. 当前 Mock Agent 基于正则+规则引擎，复杂场景理解不如真实 LLM
2. 支付为模拟流程，生产需接入真实支付网关
3. 骑手位置为模拟数据
4. 仅支持中文，桌面端优先
5. 种子数据为静态数据，不实时更新

## License

MIT
