const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// 导入 capture 模块，用于管理 ffmpeg 进程
const capture = require('./src/lib/capture.js');

// 确保 log 目录存在
const logDir = path.join(process.cwd(), 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志文件
const logFile = path.join(logDir, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// 重定向控制台输出到日志文件
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}\n`;
  logStream.write(message);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}\n`;
  logStream.write(message);
  originalConsoleError.apply(console, args);
};

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// 停止 ffmpeg 进程的函数
function stopFFmpeg() {
  if (capture.ffmpegProcess) {
    console.log('服务器退出，停止 ffmpeg 进程...');
    try {
      if (process.platform === 'win32') {
        // 在 Windows 上使用 taskkill
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${capture.ffmpegProcess.pid} /T /F`);
        console.log('ffmpeg 进程已通过 taskkill 停止');
      } else {
        // 在 Linux/Mac 上使用 kill
        capture.ffmpegProcess.kill('SIGTERM');
        console.log('ffmpeg 进程已停止');
      }
      capture.ffmpegProcess = null;
    } catch (error) {
      console.error('停止 ffmpeg 进程失败:', error);
    }
  }
}

// 监听进程退出事件
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，准备退出...');
  stopFFmpeg();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，准备退出...');
  stopFFmpeg();
  process.exit(0);
});

process.on('exit', (code) => {
  console.log(`进程退出，退出码: ${code}`);
  stopFFmpeg();
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // 处理 hls 目录的静态文件
    if (parsedUrl.pathname.startsWith('/hls/')) {
      const filePath = path.join(process.cwd(), parsedUrl.pathname);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('File not found');
        } else {
          // 设置正确的 MIME 类型
          if (parsedUrl.pathname.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          } else if (parsedUrl.pathname.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/MP2T');
          }
          res.end(data);
        }
      });
    } else {
      // 处理其他请求
      handle(req, res, parsedUrl);
    }
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
