const { app, BrowserWindow, ipcMain, screen, desktopCapturer, systemPreferences, dialog } = require('electron');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { executeControl } = require('./computer-control');
const { getAgentContext, appendDailyLog } = require('./memory-system');
const { Heartbeat } = require('./heartbeat');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction:
    'You are Ava, a friendly desktop AI companion. Keep responses concise (2-3 sentences max). ' +
    'Be warm, casual, and helpful. Use natural language, not markdown.',
});
let chatSession = model.startChat();

const BUBBLE_SIZE = 70;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 580;

let mainWindow;
let heartbeat;

function createWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    x: screenWidth - BUBBLE_SIZE - 20,
    y: screenHeight - BUBBLE_SIZE - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Start the heartbeat daemon
  heartbeat = new Heartbeat({
    intervalMs: 15 * 60 * 1000, // 15 minutes
    onTick: async (context) => {
      // Send heartbeat event to renderer so Ava can act on it
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('heartbeat-tick', context);
      }
    },
  });
  heartbeat.start();
  appendDailyLog('Ava started');
}

// Window toggle
ipcMain.handle('toggle-panel', (_event, isExpanded) => {
  if (!mainWindow) return;

  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  if (isExpanded) {
    mainWindow.setSize(PANEL_WIDTH, PANEL_HEIGHT);
    mainWindow.setPosition(
      screenWidth - PANEL_WIDTH - 20,
      screenHeight - PANEL_HEIGHT - 20
    );
  } else {
    mainWindow.setSize(BUBBLE_SIZE, BUBBLE_SIZE);
    mainWindow.setPosition(
      screenWidth - BUBBLE_SIZE - 20,
      screenHeight - BUBBLE_SIZE - 20
    );
  }
});

// Custom resize (for menu state)
ipcMain.handle('resize-window', (_event, width, height) => {
  if (!mainWindow) return;
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setSize(width, height);
  mainWindow.setPosition(
    screenWidth - width - 20,
    screenHeight - height - 20
  );
});

// Open native file picker dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'doc', 'docx', 'csv', 'json', 'xml', 'yaml', 'yml'] },
      { name: 'Code', extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Read a dropped/selected file
ipcMain.handle('read-file-for-chat', async (_event, filePath) => {
  const fs = require('fs');
  const p = require('path');
  try {
    const ext = p.extname(filePath).toLowerCase();
    const name = p.basename(filePath);
    const stats = fs.statSync(filePath);

    // Image files — return as base64
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    if (imageExts.includes(ext)) {
      const data = fs.readFileSync(filePath).toString('base64');
      const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };
      return { type: 'image', name, mime: mimeMap[ext] || 'image/png', data, size: stats.size };
    }

    // PDF files — extract text
    if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const uint8 = new Uint8Array(buffer);
      const parser = new PDFParse(uint8);
      const result = await parser.getText();
      const text = result.pages.map(p => p.text).join('\n\n');
      return { type: 'text', name, content: text.slice(0, 50000), size: stats.size, ext, pages: result.pages.length };
    }

    // Text/code/doc files — return as text
    const content = fs.readFileSync(filePath, 'utf-8');
    return { type: 'text', name, content: content.slice(0, 50000), size: stats.size, ext };
  } catch (err) {
    return { type: 'error', error: err.message };
  }
});

// Text chat (fallback when voice is off)
ipcMain.handle('chat', async (_event, message) => {
  try {
    const result = await chatSession.sendMessage(message);
    return { text: result.response.text() };
  } catch (err) {
    return { text: "Hmm, couldn't process that. Try again?", error: err.message };
  }
});

// API key for renderer (Gemini Live WebSocket)
ipcMain.handle('get-api-key', () => {
  return process.env.GEMINI_API_KEY;
});

// Screen capture
ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
    });
    const primaryScreen = sources[0];
    if (!primaryScreen) return null;
    return primaryScreen.thumbnail.toJPEG(70).toString('base64');
  } catch (err) {
    console.error('Screen capture error:', err);
    return null;
  }
});

// Computer control (all tools dispatched through here)
ipcMain.handle('execute-control', async (_event, action, args) => {
  try {
    return executeControl(action, args);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Check accessibility permissions (needed for computer control on macOS)
ipcMain.handle('check-permissions', () => {
  if (process.platform === 'darwin') {
    const screenAccess = systemPreferences.getMediaAccessStatus('screen');
    return {
      screen: screenAccess === 'granted',
      accessibility: systemPreferences.isTrustedAccessibilityClient(false),
    };
  }
  return { screen: true, accessibility: true };
});

// Grant mic permissions automatically in Electron
app.whenReady().then(() => {
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    heartbeat?.stop();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  heartbeat?.stop();
  appendDailyLog('Ava stopped');
});
