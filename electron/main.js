const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

const BUBBLE_SIZE = 70;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 580;

let mainWindow;

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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
