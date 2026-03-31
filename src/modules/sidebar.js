export class Sidebar {
  constructor(storage, editor, onSelected) {
    this.storage = storage;
    this.editor = editor;
    this.onSelected = onSelected;
    
    this.sidebarEl = document.getElementById('sidebar');
    this.fileListEl = document.getElementById('file-list');
    this.outlineListEl = document.getElementById('outline-list');
    this.tabs = document.querySelectorAll('.sidebar-tab');
    this.toggleBtn = document.getElementById('sidebar-toggle');
    this.newFileBtn = document.getElementById('new-file-btn');
    
    this.activeTab = 'files';
    this.isCollapsed = false;
    
    this.init();
  }

  init() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    this.toggleBtn?.addEventListener('click', () => this.toggleCollapse());
    this.newFileBtn?.addEventListener('click', () => this.createNewDoc());

    this.renderFileList();
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    
    document.querySelectorAll('.sidebar-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-list`)?.classList.add('active');
    
    if (tabName === 'outline') {
      this.updateOutline();
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarEl.classList.toggle('collapsed', this.isCollapsed);
    this.toggleBtn.classList.toggle('active', !this.isCollapsed);
  }

  createNewDoc() {
    const id = this.storage.createDoc('未命名文档', '# 新文档\n\n开始写点什么吧...');
    this.renderFileList();
    this.onSelected(id);
  }

  renderFileList() {
    const docs = this.storage.getAllDocs();
    const activeId = this.storage.getActiveId();
    
    this.fileListEl.innerHTML = '';
    
    if (docs.length === 0) {
      this.fileListEl.innerHTML = '<div class="sidebar-empty">暂无文档</div>';
      return;
    }

    docs.forEach(doc => {
      const el = document.createElement('div');
      el.className = `file-item ${doc.id === activeId ? 'active' : ''}`;
      
      const dateStr = new Date(doc.updatedAt).toLocaleDateString();
      
      el.innerHTML = `
        <svg class="file-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div class="file-info">
          <div class="file-name" title="${doc.title}">${doc.title}</div>
          <div class="file-date">${dateStr}</div>
        </div>
      `;
      
      el.addEventListener('click', () => {
        this.storage.setActiveId(doc.id);
        this.renderFileList();
        this.onSelected(doc.id);
      });
      
      // Context menu for delete/rename
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, doc.id);
      });

      this.fileListEl.appendChild(el);
    });
  }

  updateOutline() {
    if (this.activeTab !== 'outline') return;
    
    const content = this.editor.getContent();
    this.outlineListEl.innerHTML = '';
    
    const headings = [];
    const regex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        index: match.index
      });
    }
    
    if (headings.length === 0) {
      this.outlineListEl.innerHTML = '<div class="sidebar-empty">无大纲信息</div>';
      return;
    }
    
    headings.forEach(h => {
      const el = document.createElement('div');
      el.className = 'outline-item';
      el.setAttribute('data-level', h.level);
      el.textContent = h.text;
      el.title = h.text;
      this.outlineListEl.appendChild(el);
    });
  }

  showContextMenu(event, docId) {
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    menu.innerHTML = `
      <button class="context-menu-item" id="ctx-rename">重命名</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" id="ctx-delete">删除文档</button>
    `;

    document.body.appendChild(menu);

    document.getElementById('ctx-rename').addEventListener('click', () => {
      const doc = this.storage.getDoc(docId);
      const newName = prompt('重命名文档', doc.title);
      if (newName && newName.trim()) {
        this.storage.renameDoc(docId, newName.trim());
        this.renderFileList();
      }
      menu.remove();
    });

    document.getElementById('ctx-delete').addEventListener('click', () => {
      if (confirm('确定要删除这份文档吗？此操作不可恢复。')) {
        this.storage.deleteDoc(docId);
        
        const activeId = this.storage.getActiveId();
        if (activeId === docId) {
           const docs = this.storage.getAllDocs();
           if(docs.length > 0) {
              this.storage.setActiveId(docs[0].id);
              this.onSelected(docs[0].id);
           } else {
              this.createNewDoc();
           }
        }
        this.renderFileList();
      }
      menu.remove();
    });

    const closeMenu = () => {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }
}
