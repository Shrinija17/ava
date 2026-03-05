const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ava', {
  togglePanel: (isExpanded) => ipcRenderer.invoke('toggle-panel', isExpanded),
});
