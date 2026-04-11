import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  port: 8080,
  host: '0.0.0.0' // 监听所有网络接口，允许局域网内其他设备连接
});

console.log('WebSocket服务器启动，监听端口8080');
console.log('局域网内设备可通过 ws://服务器IP:8080 连接');

wss.on('connection', (ws) => {
  console.log('新的客户端连接');
  
  ws.on('message', (message) => {
    console.log('收到客户端消息:', message.toString());
    
    try {
      const data = JSON.parse(message.toString());
      
      if (data.method === 'startScan') {
        console.log('执行开始扫描方法');
        // 模拟第一个方法执行成功
        ws.send(JSON.stringify({
          success: true,
          method: 'startScan',
          message: '开始扫描成功'
        }));
      } else if (data.method === 'loadImages') {
        console.log('执行加载图片方法');
        // 模拟第二个方法执行成功
        ws.send(JSON.stringify({
          success: true,
          method: 'loadImages',
          message: '加载图片成功'
        }));
      }
    } catch (error) {
      console.error('消息处理错误:', error);
      ws.send(JSON.stringify({
        success: false,
        message: '消息格式错误'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('客户端连接关闭');
  });
  
  ws.on('error', (error) => {
    console.error('连接错误:', error);
  });
});

// 处理服务器错误
wss.on('error', (error) => {
  console.error('服务器错误:', error);
});
