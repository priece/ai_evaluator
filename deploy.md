# AI Evaluator 生产环境部署指南

## 一、环境准备

### 1. 系统要求
- Windows Server 2019/2022 或 Windows 10/11
- Node.js 18+ LTS
- FFmpeg（用于视频处理）
- 至少 4GB RAM
- 有摄像头的设备

### 2. 安装 Node.js
1. 下载 Node.js 18+ LTS: https://nodejs.org/
2. 安装并验证:
   ```cmd
   node -v
   npm -v
   ```

### 3. 安装 FFmpeg
1. 下载 FFmpeg: https://ffmpeg.org/download.html
2. 解压到 `C:\ffmpeg`
3. 添加到系统 PATH:
   - 右键"此电脑" → 属性 → 高级系统设置 → 环境变量
   - 编辑 Path，添加 `C:\ffmpeg\bin`
4. 验证安装:
   ```cmd
   ffmpeg -version
   ```

## 二、部署步骤

### 1. 复制项目文件
将以下文件复制到生产服务器:
```
ai_evaluator/
├── .next/              # 构建后的文件
├── src/
│   └── lib/
│       ├── capture.js
│       └── db.ts
├── public/             # 静态资源
├── data/               # 数据目录（可空）
├── hls/                # HLS 视频流目录（可空）
├── logs/               # 日志目录（可空）
├── server.js
├── next.config.js
├── package.json
├── package-lock.json
├── .env.production
└── start-production.bat
```

### 2. 安装依赖
```cmd
cd ai_evaluator
npm ci --only=production
```

### 3. 构建（如果 .next 目录不存在）
```cmd
npm run build
```

### 4. 启动服务

#### 方式一：使用启动脚本（推荐）
```cmd
start-production.bat
```

#### 方式二：使用 npm
```cmd
npm run prod
```

#### 方式三：使用 PM2（需要安装 PM2）
```cmd
# 安装 PM2
npm install -g pm2

# 启动
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

## 三、访问服务

- 本地访问: http://localhost:3000
- 局域网访问: http://服务器IP:3000

## 四、常用命令

### PM2 管理
```cmd
# 查看状态
pm2 status

# 查看日志
pm2 logs ai-evaluator

# 重启
pm2 restart ai-evaluator

# 停止
pm2 stop ai-evaluator

# 删除
pm2 delete ai-evaluator
```

### 手动管理
```cmd
# 启动
npm run start

# 开发模式
npm run dev
```

## 五、故障排查

### 1. 端口被占用
修改 `.env.production` 中的 PORT 为其他端口，如 8080

### 2. 摄像头无法识别
- 确保摄像头已连接并启用
- 检查 Windows 设备管理器
- 尝试使用虚拟摄像头（如 OBS Virtual Camera）测试

### 3. FFmpeg 报错
- 检查 FFmpeg 是否正确安装
- 检查 FFmpeg 是否在 PATH 中
- 查看 logs/server.log 获取详细错误

### 4. 数据丢失
- 定期备份 data/database.json
- 配置自动备份脚本

## 六、安全配置（可选）

### 1. 配置防火墙
```cmd
# 开放 3000 端口
netsh advfirewall firewall add rule name="AI Evaluator" dir=in action=allow protocol=tcp localport=3000
```

### 2. 使用 Nginx 反向代理
参考 nginx.conf 配置 HTTPS 和域名访问

### 3. 设置服务账户
创建一个专用 Windows 账户运行服务，限制权限

## 七、备份策略

### 自动备份脚本 backup.bat
```batch
@echo off
set BACKUP_DIR=D:\Backup\ai-evaluator
set DATA_DIR=D:\app\ai-evaluator\data
set DATE=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set DATE=%DATE: =0%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

copy %DATA_DIR%\database.json %BACKUP_DIR%\database_%DATE%.json

# 保留最近 30 天的备份
forfiles /P %BACKUP_DIR% /S /M *.json /D -30 /C "cmd /c del @path"
```

添加到任务计划程序，每天凌晨 2 点执行。

## 八、更新部署

```cmd
# 1. 停止服务
pm2 stop ai-evaluator

# 2. 备份数据
copy data\database.json data\database.json.backup

# 3. 更新代码（复制新文件）

# 4. 重新安装依赖
npm ci --only=production

# 5. 重新构建
npm run build

# 6. 启动服务
pm2 start ecosystem.config.js
```

## 九、性能优化

### 1. 调整切片时长
编辑 `src/app/api/capture/start/route.ts`:
```javascript
'-hls_time', '2',  // 改为 2 秒
```

### 2. 调整视频码率
```javascript
'-b:v', '1000k',     // 视频码率
'-b:a', '128k',      // 音频码率
```

### 3. 清理旧切片
系统会自动清理，也可手动清理:
```cmd
del hls\*.ts
```

## 十、联系方式

如有问题，请查看日志文件 `logs/server.log` 或联系技术支持。
