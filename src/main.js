import './styles/index.css';

import { Storage } from './modules/storage.js';
import { Editor } from './modules/editor.js';
import { Sidebar } from './modules/sidebar.js';
import { Toolbar } from './modules/toolbar.js';
import { Shortcuts } from './modules/shortcuts.js';

let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('editor-container');
  const storage = new Storage();
  
  // UI Elements
  const statsChars = document.getElementById('stat-chars');
  const statsLines = document.getElementById('stat-lines');
  const cursorInfo = document.getElementById('cursor-info');
  const docStatus = document.getElementById('doc-status');
  
  let currentFilePath = null;
  let currentFileExt = 'md';

  // Expose methods for shortcuts
  window.appOpenFile = async () => {
    if (window.electronAPI) {
      try {
        const fileObj = await window.electronAPI.openFile();
        if (fileObj) {
          currentFilePath = fileObj.filePath;
          const ext = currentFilePath.split('.').pop() || 'txt';
          currentFileExt = ext;
          // Update Editor with new content and lang
          editor.init(fileObj.content, ext);
          
          docStatus.textContent = '已加载 ' + ext.toUpperCase();
          docStatus.className = '';
        }
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    }
  };

  window.appSaveFile = async () => {
     if (window.electronAPI) {
       docStatus.textContent = '保存中...';
       docStatus.className = 'unsaved';
       try {
         const content = editor.getContent();
         if (currentFilePath) {
           await window.electronAPI.saveFile(currentFilePath, content);
         } else {
           const savedPath = await window.electronAPI.saveFileAs(content, currentFileExt);
           if (savedPath) {
             currentFilePath = savedPath;
             const ext = currentFilePath.split('.').pop() || 'txt';
             if (ext !== currentFileExt) {
                currentFileExt = ext;
                editor.setLanguage(ext);
             }
           } else {
             docStatus.textContent = '未保存';
             return;
           }
         }
         docStatus.textContent = '已保存';
         docStatus.className = '';
       } catch (err) {
         console.error('Failed to save file:', err);
         docStatus.textContent = '保存失败';
       }
     }
  };

  // Handlers
  const handleContentChange = (content) => {
    if (window.electronAPI) {
      docStatus.textContent = '有修改';
      docStatus.className = 'unsaved';
      return; // Do not auto-save to disk, use Cmd+S
    }

    // Fallback block for browser storage ...
    const activeId = storage.getActiveId();
    if (!activeId) return;
    
    docStatus.textContent = '保存中...';
    docStatus.className = 'unsaved';
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      storage.updateDoc(activeId, { content });
      docStatus.textContent = '已保存';
      docStatus.className = '';
      sidebar.updateOutline();
    }, 500);
  };
  
  const handleCursorActivity = (stats) => {
    statsChars.textContent = `${stats.chars} 字符`;
    statsLines.textContent = `${stats.lines} 行`;
    cursorInfo.textContent = `行 ${stats.line}, 列 ${stats.col}`;
  };

  const handleDocSelected = (id) => {
    if (window.electronAPI) return; // Disable local storage list when electron is used for files
    const doc = storage.getDoc(id);
    if (!doc) return;
    editor.setContent(doc.content);
    editor.focus();
    sidebar.updateOutline();
    docStatus.textContent = '已保存';
    docStatus.className = '';
  };
  
  // Initialize Modules
  const editor = new Editor(container, handleContentChange, handleCursorActivity);
  const sidebar = new Sidebar(storage, editor, handleDocSelected);
  const toolbar = new Toolbar(editor, storage);
  new Shortcuts(editor, toolbar);
  
  if (window.electronAPI) {
     editor.init('# 欢迎使用大统一文档编辑器\n\n- 点击上方的 [打开文件] 或按 (Cmd+O) 打开任意文件\n- [保存文件] (Cmd+S) 快速落盘\n- 拖拽文档到窗口打开', 'md');
     
     // Hide sidebar inside electron mode since files are managed by macOS natively
     document.getElementById('sidebar').style.display = 'none';

     // Bind Native toolbar buttons
     document.getElementById('native-open-btn')?.addEventListener('click', window.appOpenFile);
     document.getElementById('native-save-btn')?.addEventListener('click', window.appSaveFile);
     
     // File drag and drop
     document.addEventListener('dragover', (e) => {
       e.preventDefault();
       e.stopPropagation();
     });

     document.addEventListener('drop', async (e) => {
       e.preventDefault();
       e.stopPropagation();
       if (e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          // Electron polyfills `path` on File object in webContents
          if (file.path) {
             try {
                const fileObj = await window.electronAPI.openFileByPath(file.path);
                if (fileObj) {
                   currentFilePath = fileObj.filePath;
                   const ext = currentFilePath.split('.').pop() || 'txt';
                   currentFileExt = ext;
                   editor.init(fileObj.content, ext);
                   
                   docStatus.textContent = '已加载 ' + ext.toUpperCase();
                   docStatus.className = '';
                }
             } catch(err) {
                console.error('Failed to drop read file:', err);
             }
          }
       }
     });
  } else {
    // Load initial active document
    const activeId = storage.getActiveId();
    if (activeId) {
      const doc = storage.getDoc(activeId);
      if (doc) {
        editor.init(doc.content);
        sidebar.updateOutline();
        return;
      }
    }
    editor.init('# 空白文档\n\n');
  }
});
