# AI 评委服务

基于 Next.js 开发的 AI 评估系统，支持本地摄像头视频采集、AI 自动评估和专家评估功能。

## 功能特性

- **摄像头管理**：获取本地摄像头信息，可选择指定摄像头进行视频采集
- **实时视频显示**：通过 WebSocket 实时传输视频数据，前端页面实时显示
- **AI 自动评估**：对采集的视频进行 AI 自动评分（0-100分）
- **专家评估**：支持专家输入参考分数进行评估
- **场次管理**：支持新建场次、加载历史场次
- **评估记录**：记录每次评估的场次、轮次、评估值和时间
- **数据存储**：使用 JSON 文件存储评估数据（`data/database.json`）

## 技术栈

- **框架**：Next.js 14.2.10
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **视频处理**：fluent-ffmpeg
- **摄像头**：node-webcam
- **实时通信**：WebSocket
- **数据库**：JSON 文件存储，数据持久化到 `data/database.json`

## 项目结构

```
ai_evaluator/
├── src/
│   ├── app/                    # Next.js 应用目录
│   │   ├── api/                # API 路由
│   │   │   ├── cameras/        # 摄像头接口
│   │   │   ├── capture/        # 视频采集接口（开始/停止）
│   │   │   ├── expert-evaluation/  # 专家评估接口
│   │   │   ├── regular-evaluation/ # 常规评估接口
│   │   │   └── sessions/       # 场次管理接口
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面
│   │   └── globals.css         # 全局样式
│   ├── components/             # React 组件
│   │   ├── EvaluationRecords.tsx   # 评估记录组件
│   │   ├── ExpertEvaluation.tsx    # 专家评估组件
│   │   └── RegularEvaluation.tsx   # 常规评估组件
│   ├── lib/                    # 工具库
│   │   ├── capture.js          # 视频采集逻辑
│   │   └── db.ts               # 数据库操作
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── hls/                        # HLS 视频流文件
├── log/                        # 日志文件
├── server.js                   # 自定义服务器（支持 WebSocket）
├── next.config.js              # Next.js 配置
├── tailwind.config.ts          # Tailwind CSS 配置
└── package.json
```

## 数据模型

### 场次表 (Session)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| name | string | 场名 |

### 常规评估列表 (RegularEvaluation)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| round | number | 轮次（从0开始） |
| score | number | 评估结果（0-100） |
| evaluated_at | string | 评估时间 |

### 专家评估列表 (ExpertEvaluation)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| round | number | 轮次（从0开始） |
| expert_score | number | 专家评估结果（0-100） |
| evaluated_at | string | 评估时间 |

## API 接口

### 摄像头接口
- `GET /api/cameras` - 获取本地摄像头列表

### 视频采集接口
- `POST /api/capture/start` - 开始采集（参数：cameraId）
- `POST /api/capture/stop` - 停止采集

### WebSocket 接口
- `ws://localhost:3000` - 视频数据实时传输

### 常规评估接口
- `POST /api/regular-evaluation` - 提交常规评估
- `GET /api/regular-evaluation` - 获取所有常规评估结果

### 专家评估接口
- `POST /api/expert-evaluation` - 提交专家评估
- `GET /api/expert-evaluation` - 获取所有专家评估结果

### 场次接口
- `GET /api/sessions` - 获取所有场次
- `GET /api/sessions/[sessionId]` - 获取指定场次详情

## 安装与运行

### 环境要求
- Node.js 18+
- Windows 系统
- FFmpeg（已包含在依赖中）

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

服务将启动在 http://localhost:3000

### 生产模式构建

```bash
npm run build
npm start
```

## 使用说明

1. **AI评估**：
   - 选择摄像头
   - 点击"开始采集"启动视频
   - 点击"新建场次"创建评估场次
   - 点击"开始评估"进行 AI 评分

2. **专家评估**：
   - 进入"专家评估"页面
   - 输入参考分数
   - 点击"开始评估"进行专家评分

3. **评估记录**：
   - 查看所有历史评估记录
   - 包含场编号、轮次、评估结果和时间

## 日志

服务器日志保存在 `log/server.log` 文件中。

## 安全设计

### 前后端分离的数据访问
- **前端组件**（`src/components/`）不直接访问数据库，所有数据操作通过 API 接口进行
- **后端 API**（`src/app/api/`）统一处理数据库操作，确保数据安全
- **数据库模块**（`src/lib/db.ts`）仅在服务端 API 路由中使用，不暴露给前端

### 数据流
```
前端组件 → API 路由 → 数据库模块 → SQLite 文件
```

### API 接口列表
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sessions` | GET/POST | 获取/创建场次 |
| `/api/sessions/[sessionId]` | GET/PUT | 获取/更新场次详情 |
| `/api/regular-evaluation` | GET/POST | 获取/提交常规评估 |
| `/api/expert-evaluation` | GET/POST | 获取/提交专家评估 |
| `/api/cameras` | GET | 获取摄像头列表 |
| `/api/capture/start` | POST | 开始视频采集 |
| `/api/capture/stop` | POST | 停止视频采集 |

## 许可证

私有项目
