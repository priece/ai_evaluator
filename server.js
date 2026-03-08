const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HLS_DIR = process.env.HLS_DIR || './hls';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const hlsDir = path.resolve(HLS_DIR);

let logger = null;

function getLogger() {
  if (!logger) {
    try {
      logger = require('./src/lib/logger');
    } catch (e) {
      logger = {
        logInfo: (msg) => console.log(msg),
        logError: (msg) => console.error(msg)
      };
    }
  }
  return logger;
}

async function stopFFmpeg() {
  const log = getLogger();
  try {
    const { stopCapture } = require('./src/lib/cameraManager');
    await stopCapture();
    log.logInfo('服务器退出，ffmpeg 进程已停止');
  } catch (error) {
    log.logError(`停止 ffmpeg 进程失败: ${error}`);
  }
}

process.on('SIGINT', async () => {
  const log = getLogger();
  log.logInfo('收到 SIGINT 信号，准备退出...');
  await stopFFmpeg();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const log = getLogger();
  log.logInfo('收到 SIGTERM 信号，准备退出...');
  await stopFFmpeg();
  process.exit(0);
});

process.on('exit', (code) => {
  const log = getLogger();
  log.logInfo(`进程退出，退出码: ${code}`);
});

app.prepare().then(() => {
  const log = getLogger();
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname.startsWith('/hls/')) {
      const filePath = path.join(hlsDir, parsedUrl.pathname.replace('/hls/', ''));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('File not found');
        } else {
          if (parsedUrl.pathname.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          } else if (parsedUrl.pathname.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/MP2T');
          }
          res.end(data);
        }
      });
    } else {
      handle(req, res, parsedUrl);
    }
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    log.logInfo(`服务器启动: http://localhost:${PORT}`);
  });
});
