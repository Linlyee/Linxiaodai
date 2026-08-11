# 林小呆

面向真实落地持续建设的 AI 点餐与商家订单协作平台。

## 当前能力

- 顾客注册、登录与安全会话
- 依据人数、预算、口味、忌口与配送时间推荐餐厅和菜品
- 持久化对话、订单、订单事件与菜品库存
- 下单、模拟支付、取消订单
- 商家工作台：查看今日经营数据，接单并推进制作、配送、完成状态
- SQLite 本地数据库，使用 `DATABASE_URL` 可迁移至 PostgreSQL

## 本地运行

首次安装后端依赖：

```bash
python -m venv .venv
.venv\\Scripts\\python -m pip install -r backend/requirements.txt
```

启动后端：

```bash
.venv\\Scripts\\python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

另开一个终端启动前端：

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:5173`。首次启动会创建 `backend/linxiaodai.db` 并写入演示餐厅与菜品。

顾客账号：`demo@linxiaodai.com` / `demo123`

商家账号：`merchant@linxiaodai.com` / `demo123`

## Docker 运行

```bash
docker compose up --build
```

前端为 `http://127.0.0.1:5173`，API 文档为 `http://127.0.0.1:8000/docs`。

## 生产落地的下一步

接入 PostgreSQL、对象存储、短信验证码与真实支付前，需要先完成主体、商户和支付渠道签约。代码层面下一优先级是地址簿、配送调度、退款和管理员审核后台。
