const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectDownloadDir: () => ipcRenderer.invoke('select-download-dir'),
  getDownloadDir: () => ipcRenderer.invoke('get-download-dir'),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  inspectMedia: (url) => ipcRenderer.invoke('inspect-media', url),
  startDownload: (options) => ipcRenderer.invoke('start-download', options),
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  }
});
