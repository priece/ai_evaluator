# AI Evaluator 生产部署包清单

## 打包方法

### 方法一：使用打包脚本（推荐）
```cmd
package-production.bat
```

### 方法二：手动复制
复制以下文件到部署目录：

## 必需文件清单

### 1. 构建输出（核心）
```
.next/                          # 整个目录，包含编译后的代码
├── server/                     # 服务端代码
│   ├── app/                    # App Router 页面和 API
│   └── pages/                  # Pages Router（兼容）
├── static/                     # 静态资源（JS、CSS）
└── *.json                      # 构建清单文件
```

### 2. 静态资源
```
public/                         # 静态文件目录
```

### 3. 后端代码
```
src/lib/
├── capture.js                  # 视频捕获状态管理
└── db.ts                       # 数据库操作
```

### 4. 启动和配置文件
```
server.js                       # 服务器启动脚本
package.json                    # 依赖配置
package-lock.json               # 版本锁定
.env.production                 # 生产环境变量
next.config.js                  # Next.js 配置
```

### 5. 部署辅助文件（可选但推荐）
```
start-production.bat            # Windows 一键启动脚本
ecosystem.config.js             # PM2 进程管理配置
deploy.md                       # 详细部署文档
```

## 不需要打包的文件

### 开发依赖（不要复制）
```
node_modules/                   # 生产环境重新安装依赖
src/app/                        # 源代码（已编译到 .next）
src/components/                 # React 组件（已编译）
*.ts, *.tsx                     # TypeScript 源文件（已编译）
```

### 运行时生成的目录（不要复制，自动创建）
```
data/                           # 数据库文件（运行时生成）
hls/                            # 视频流文件（运行时生成）
logs/                           # 日志文件（运行时生成）
```

### 其他不需要的文件
```
.git/                           # Git 仓库
.gitignore                      # Git 忽略配置
README.md                       # 项目说明（可选）
*.log                           # 日志文件
*.tmp                           # 临时文件
```

## 目录结构示例

部署包应该是这样的结构：

```
ai-evaluator-production/
├── .next/                      # 构建输出（必需）
│   ├── server/
│   ├── static/
│   └── ...
├── public/                     # 静态资源（必需）
├── src/lib/                    # 后端代码（必需）
│   ├── capture.js
│   └── db.ts
├── data/                       # 数据目录（自动创建）
├── hls/                        # 视频流目录（自动创建）
├── logs/                       # 日志目录（自动创建）
├── server.js                   # 启动脚本（必需）
├── package.json                # 依赖配置（必需）
├── package-lock.json           # 版本锁定（必需）
├── .env.production             # 环境变量（必需）
├── next.config.js              # Next.js 配置（必需）
├── start-production.bat        # 启动脚本（推荐）
├── ecosystem.config.js         # PM2 配置（推荐）
└── deploy.md                   # 部署文档（推荐）
```

## 部署步骤

### 1. 复制文件到服务器
将上述文件复制到服务器的目标目录，例如：
```
D:\app\ai-evaluator\
```

### 2. 安装依赖（首次部署）
```cmd
cd D:\app\ai-evaluator
npm ci --only=production
```

### 3. 创建必要目录
```cmd
mkdir data
mkdir hls
mkdir logs
```

### 4. 启动服务

#### 方式一：使用启动脚本
```cmd
start-production.bat
```

#### 方式二：使用 npm
```cmd
npm run start
```

#### 方式三：使用 PM2
```cmd
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 验证部署
访问 http://服务器IP:3000 验证服务是否正常

## 更新部署

更新时只需要替换以下文件：
```
.next/                          # 新的构建输出
src/lib/                        # 如果有更新
package.json                    # 如果有依赖变化
```

**注意：** 更新前备份 `data/database.json` 文件！

## 文件大小参考

- `.next/` 目录：约 50-100 MB
- `node_modules/`：约 200-300 MB（服务器上安装）
- 部署包总大小：约 50-100 MB（不含 node_modules）
