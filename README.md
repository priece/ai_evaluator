# AI 评委服务

基于 Next.js 开发的 AI 评估系统，支持本地摄像头视频采集、AI 自动评估和专家评估功能。

## 功能特性

- **摄像头管理**：获取本地摄像头信息，自动选择第一个可用摄像头
- **实时视频显示**：通过 HLS 流媒体技术实时显示视频（2秒切片）
- **AI 自动评估**：对采集的视频进行 AI 自动评分（0-100分）
- **专家评估**：支持专家输入参考分数进行评估
- **场次管理**：支持新建场次、加载历史场次，动态计算轮次数
- **演出管理**：支持创建演出、开始/结束演出、开始/结束评估、发布结果
- **发布功能**：评估结束后可直接发布结果，状态变为"已发布"
- **高亮显示**：当前操作的轮次高亮显示，点击轮次按钮自动更新高亮
- **评估记录**：记录每次评估的场次、轮次、评估值和时间
- **数据存储**：使用 JSON 文件存储评估数据（`data/database.json`）
- **自定义日志系统**：支持文件和内存日志，保留30条最新日志，支持增量获取
- **大屏显示**：支持独立大屏页面，显示 AI 评分和 PNG 序列动画，根据分数区间显示不同动画效果
- **生产部署**：支持一键打包部署

## 技术栈

- **框架**：Next.js 14.2.10
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **视频处理**：FFmpeg + fluent-ffmpeg
- **流媒体**：HLS (HTTP Live Streaming)
- **数据库**：JSON 文件存储
- **进程管理**：PM2（可选）

## 项目结构

```
ai_evaluator/
├── src/
│   ├── app/                    # Next.js 应用目录
│   │   ├── api/                # API 路由
│   │   │   ├── auth/           # 认证接口
│   │   │   ├── cameras/        # 摄像头接口
│   │   │   ├── capture/        # 视频采集接口
│   │   │   ├── expert-evaluation/  # 专家评估接口
│   │   │   ├── logs/           # 日志接口
│   │   │   ├── regular-evaluation/ # 常规评估接口
│   │   │   ├── rounds/         # 轮次接口
│   │   │   └── sessions/       # 场次管理接口
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面
│   │   ├── screen/             # 大屏页面
│   │   │   └── page.tsx        # 大屏显示组件
│   │   └── globals.css         # 全局样式
│   ├── components/             # React 组件
│   │   ├── BusinessPanel.tsx   # 业务面板组件
│   │   ├── EvaluationRecords.tsx   # 评估记录组件
│   │   ├── ExpertEvaluation.tsx    # 专家评估组件
│   │   ├── MainContent.tsx     # 主内容组件
│   │   ├── RegularEvaluation.tsx   # 常规评估组件
│   │   └── VideoMonitor.tsx    # 视频监看组件
│   ├── lib/                    # 工具库
│   │   ├── capture.js          # 视频采集状态管理
│   │   ├── db.ts               # 数据库操作
│   │   └── logger.ts           # 日志系统
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── data/                       # 数据存储目录（运行时生成）
├── hls/                        # HLS 视频流文件（运行时生成）
├── logs/                       # 日志文件（运行时生成）
├── .next/                      # 构建输出
├── server.js                   # 自定义服务器
├── next.config.js              # Next.js 配置
├── package.json                # 项目依赖
├── start-production.bat        # 生产环境启动脚本
├── package-production.bat      # 生产部署包打包脚本
├── ecosystem.config.js         # PM2 配置文件
└── deploy.md                   # 详细部署文档
```

## 数据模型

### 场次表 (Session)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| name | string | 场名 |
| created_at | string | 创建时间 |

### 轮次表 (Round)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| round_number | number | 轮次（从1开始） |
| status | number | 轮次状态（0-5） |
| created_at | string | 创建时间 |
| performance_start_time | string | 演出开始时间 |
| performance_end_time | string | 演出结束时间 |
| evaluation_start_time | string | 评估开始时间 |
| evaluation_end_time | string | 评估结束时间 |
| round_end_time | string | 轮次结束时间 |
| score | number | AI评估分数 |

> 注：`submit` 字段已废弃，发布状态通过 `status=5` 表示

### 常规评估列表 (RegularEvaluation)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| round | number | 轮次（从1开始） |
| score | number | AI评估结果（0-100） |
| evaluated_at | string | 评估时间 |

### 专家评估列表 (ExpertEvaluation)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| session_id | UUID | 场编号 |
| round | number | 轮次（从1开始） |
| expert_score | number | 专家评估结果（0-100） |
| evaluated_at | string | 评估时间 |

## API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/check` - 检查登录状态

### 摄像头接口
- `GET /api/cameras` - 获取本地摄像头列表

### 视频采集接口
- `POST /api/capture/start` - 开始采集（参数：cameraId, audioId）
- `POST /api/capture/stop` - 停止采集
- `POST /api/capture/rotate` - 旋转视频（参数：direction: 'left' | 'right'）

### HLS 视频流
- `/hls/stream.m3u8` - HLS 视频流播放地址
- `/hls/stream_*.ts` - 视频切片文件（2秒/片）

### 评估接口
- `POST /api/regular-evaluation` - 提交常规评估
- `POST /api/expert-evaluation` - 提交专家评估

### 场次接口
- `GET /api/sessions` - 获取所有场次
- `POST /api/sessions` - 创建新场次
- `GET /api/sessions/[sessionId]` - 获取指定场次详情及评估记录
- `PUT /api/sessions/[sessionId]` - 更新场次名称

### 轮次接口
- `GET /api/rounds?sessionId=xxx` - 获取指定场次的轮次列表
- `POST /api/rounds` - 创建或更新轮次（action: create/startPerformance/endPerformance/startEvaluation/publish）

### 轮次状态说明
| 状态值 | 说明 |
|--------|------|
| 0 | 未开始 |
| 1 | 演出中 |
| 2 | 演出结束 |
| 3 | 评估中 |
| 4 | 已评估 |
| 5 | 已发布 |

### 日志接口
- `GET /api/logs` - 获取日志（可选参数：from=时间戳，返回该时间点之后的日志）

### 大屏接口
- `GET /api/screen` - 获取大屏数据（已发布的轮次信息）
- `GET /api/screen/config` - 获取大屏配置（背景图、动画序列等）

#### 大屏动画配置
在 `config.json` 中配置：
```json
{
  "screen": {
    "background": "./public/background/background.png",
    "motions": [
      { "id": "motion_00", "image": "./public/motions/motion_00/" },
      { "id": "motion_01", "image": "./public/motions/motion_01/" },
      { "id": "motion_02", "image": "./public/motions/motion_02/" }
    ]
  }
}
```

每个 motion 文件夹下放置 PNG 序列图片（文件名为数字），系统会自动循环播放。

#### 分数区间动画
| 分数区间 | 动画 |
|---------|------|
| 0-39 | motion_00 |
| 40-79 | motion_01 |
| 80-100 | motion_02 |

## 安装与运行

### 环境要求
- Node.js 18+
- Windows 系统
- FFmpeg（需要单独安装并添加到 PATH）

### 安装 FFmpeg
1. 下载：https://ffmpeg.org/download.html
2. 解压到 `C:\ffmpeg`
3. 添加到系统 PATH：`C:\ffmpeg\bin`
4. 验证：`ffmpeg -version`

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
# 构建
npm run build

# 启动生产服务器
npm run start
```

## 生产部署

### 方式一：使用打包脚本（推荐）

```bash
# 一键打包生产部署包
package-production.bat
```

生成的 `ai-evaluator-production/` 目录包含所有必需文件。

### 方式二：手动部署

**必需文件：**
- `.next/` - 构建输出
- `src/lib/` - 后端代码
- `server.js`, `package.json`, `package-lock.json`
- `.env.production`, `next.config.js`
- `start-production.bat`, `ecosystem.config.js`

**部署步骤：**
1. 复制文件到服务器
2. 安装依赖：`npm ci --only=production`
3. 启动服务：`start-production.bat` 或 `pm2 start ecosystem.config.js`

详细部署说明见 [deploy.md](deploy.md)

## 使用说明

### 登录
1. 访问 http://localhost:3000
2. 输入用户名和密码（默认：admin/admin）

### 视频监看
1. 选择摄像头和音频源
2. 点击"开始采集"启动视频流
3. 支持左转/右转90度旋转视频

### 场次和演出管理
1. 点击"新建场次"创建评估场次
2. 选择场次后，点击"新建演出"创建新轮次
3. 点击轮次卡片可高亮选中当前轮次
4. 演出操作流程：
   - 点击"开始演出"开始录制
   - 点击"结束演出"停止录制
   - 点击"开始评估"进行 AI 评分
   - 评估完成后点击"发布"发布评估结果，状态变为"已发布"

### AI评估
1. 点击"新建场次"创建评估场次
2. 点击"开始评估"进行 AI 评分

### 专家评估
1. 进入"专家评估"页面
2. 输入专家评分（0-100）
3. 点击"提交评估"保存评分

### 评估记录
1. 进入"评估记录"页面
2. 查看所有历史评估记录
3. 包含场编号、轮次、评估结果和时间

### 系统日志
- 实时显示系统运行日志
- 自动轮询更新（每2秒）
- 支持滚动查看历史日志

## 配置说明

### 环境变量 (.env.production)
```
PORT=3000                    # 服务端口
DATA_DIR=./data              # 数据目录
HLS_DIR=./hls                # HLS视频目录
LOG_DIR=./logs               # 日志目录
LOG_LEVEL=info               # 日志级别
NODE_ENV=production          # 运行环境
```

### FFmpeg 配置
视频切片参数（`src/app/api/capture/start/route.ts`）：
- 切片时长：2秒
- 视频编码：H.264
- 音频编码：AAC
- 码率：1000kbps

### 日志配置
- 日志文件位置：`logs/` 目录
- 日志文件格式：`server-yyyyMMdd-hhmmss.log`
- 内存日志：保留30条最新日志
- 日志级别：INFO、WARN、ERROR、DEBUG

## 安全设计

### 前后端分离的数据访问
- **前端组件**不直接访问数据库，所有数据操作通过 API 接口进行
- **后端 API**统一处理数据库操作，确保数据安全
- **数据库模块**仅在服务端 API 路由中使用

### 数据流
```
前端组件 → API 路由 → 数据库模块 → JSON 文件
```

## 日志

服务器日志保存在 `logs/` 目录下，文件名格式为 `server-yyyyMMdd-hhmmss.log`。

## 许可证

私有项目
