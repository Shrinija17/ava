const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('ava', {
  togglePanel: (isExpanded) => ipcRenderer.invoke('toggle-panel', isExpanded),
  resizeWindow: (w, h) => ipcRenderer.invoke('resize-window', w, h),
  chat: (message) => ipcRenderer.invoke('chat', message),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  executeControl: (action, args) => ipcRenderer.invoke('execute-control', action, args),
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  readFileForChat: (filePath) => ipcRenderer.invoke('read-file-for-chat', filePath),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  getFilePath: (file) => webUtils.getPathForFile(file),
  onHeartbeat: (callback) => ipcRenderer.on('heartbeat-tick', (_event, context) => callback(context)),
});
