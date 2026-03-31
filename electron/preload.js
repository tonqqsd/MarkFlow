import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFileByPath: (path) => ipcRenderer.invoke('fs:openFileByPath', path),
  saveFile: (filePath, content) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  saveFileAs: (content, defaultExtension) => ipcRenderer.invoke('dialog:saveFileAs', content, defaultExtension),
});
