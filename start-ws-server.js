// 启动WebSocket服务器的脚本
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// 动态导入WebSocket服务器
const startServer = async () => {
  try {
    await import('./src/websocket/server.js');
    console.log('WebSocket服务器启动脚本执行中...');
  } catch (error) {
    console.error('启动WebSocket服务器失败:', error);
    process.exit(1);
  }
};

startServer();
