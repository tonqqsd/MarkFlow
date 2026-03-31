import { exportMarkdown } from "./exporter.js";

export class Toolbar {
  constructor(editor, storage) {
    this.editor = editor;
    this.storage = storage;
    this.themeToggle = document.getElementById('theme-toggle');
    this.exportBtn = document.getElementById('export-btn');
    this.sourceToggle = document.getElementById('source-toggle');
    
    this.init();
  }

  init() {
    this.initTheme();
    
    // Bind formatting buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.handleAction(action);
      });
    });

    this.themeToggle?.addEventListener('click', () => this.toggleTheme());
    this.exportBtn?.addEventListener('click', () => this.handleExport());
    this.sourceToggle?.addEventListener('click', () => {
      const isSource = this.editor.toggleSourceMode();
      this.sourceToggle.classList.toggle('active', isSource);
    });
  }

  handleAction(action) {
    switch (action) {
      case 'h1': this.editor.insertLinePrefix('# '); break;
      case 'h2': this.editor.insertLinePrefix('## '); break;
      case 'h3': this.editor.insertLinePrefix('### '); break;
      case 'bold': this.editor.applyFormat('**', '**'); break;
      case 'italic': this.editor.applyFormat('*', '*'); break;
      case 'strikethrough': this.editor.applyFormat('~~', '~~'); break;
      case 'code': this.editor.applyFormat('`', '`'); break;
      case 'quote': this.editor.insertLinePrefix('> '); break;
      case 'ul': this.editor.insertLinePrefix('- '); break;
      case 'ol': this.editor.insertLinePrefix('1. '); break;
      case 'task': this.editor.insertLinePrefix('- [ ] '); break;
      case 'hr': this.editor.insertText('\n---\n'); break;
      case 'link': this.editor.applyFormat('[', '](https://)', '链接文字'); break;
      case 'table': this.editor.insertText('\n| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |\n'); break;
      default: return;
    }
  }

  handleExport() {
    if (window.electronAPI) {
      // In electron mode, export is just Save As with forced .md (or whatever format)
      // Actually we already have a Save button, but let's just trigger save if export is clicked
      if (window.appSaveFile) {
        window.appSaveFile();
      }
      return;
    }
    const id = this.storage.getActiveId();
    if (!id) return;
    const doc = this.storage.getDoc(id);
    if (doc) {
      exportMarkdown(doc.title, this.editor.getContent());
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem('markflow_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('markflow_theme', newTheme);
  }
}
