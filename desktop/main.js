/**
 * MineChat Electron 主进程
 * 启动内嵌后端服务 + 加载前端页面
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow = null;
let serverProcess = null;

const APP_NAME = 'MineChat';
const APP_USER_MODEL_ID = 'com.minechat.desktop';
const APP_ICON = path.join(__dirname, '..', 'build', 'icon.ico');

// Chromium 性能优化开关
const CHROMIUM_SWITCHES = [
  ['autoplay-policy', 'no-user-gesture-required'],
  ['ignore-gpu-blocklist'],
  ['enable-gpu-rasterization'],
  ['enable-oop-rasterization'],
  ['disable-background-timer-throttling'],
  ['disable-renderer-backgrounding'],
  ['disable-backgrounding-occluded-windows'],
  ['force_high_performance_gpu'],
  ['use-angle', 'd3d11'],
];

for (const [name, value] of CHROMIUM_SWITCHES) {
  app.commandLine.appendSwitch(name, value);
}

// 单实例锁
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/** 检测端口是否可用 */
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}

/** 启动内嵌后端服务 */
async function startEmbeddedServer() {
  const serverPath = path.join(__dirname, '..', 'server');
  
  // 设置环境变量
  process.env.PORT = '0'; // 让系统自动分配端口
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/minechat';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'minechat-desktop-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'minechat-desktop-refresh-secret';
  process.env.CLIENT_URL = 'minechat://localhost'; // 桌面版不需要CORS
  
  try {
    // 动态导入后端服务
    const serverModule = require(path.join(serverPath, 'dist', 'app.js'));
    // 后端会在内部自行启动
    return serverModule;
  } catch (err) {
    console.error('启动内嵌服务器失败:', err);
    return null;
  }
}

/** 创建主窗口 */
async function createMainWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  const windowWidth = Math.min(1200, screenWidth - 100);
  const windowHeight = Math.min(800, screenHeight - 100);
  const windowX = Math.floor((screenWidth - windowWidth) / 2);
  const windowY = Math.floor((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 600,
    x: windowX,
    y: windowY,
    title: APP_NAME,
    icon: APP_ICON,
    frame: false,        // 无边框，自定义标题栏
    transparent: false,
    backgroundColor: '#08090B',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 窗口准备好后显示（防止白屏闪烁）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 加载前端页面
  const isDev = process.env.MINECHAT_DEV === '1';
  if (isDev) {
    // 开发模式：加载 Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的前端文件
    const frontendPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    mainWindow.loadFile(frontendPath);
  }

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ────────── IPC 事件处理 ──────────

// 窗口控制
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false);

// ────────── App 生命周期 ──────────

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  
  // 启动内嵌服务器（生产模式）
  if (process.env.MINECHAT_DEV !== '1') {
    await startEmbeddedServer();
  }
  
  await createMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
