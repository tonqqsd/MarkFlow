/* ============================================
   MarkFlow - LocalStorage Data Manager
   ============================================ */

const STORAGE_KEY = 'markflow_documents';
const ACTIVE_KEY = 'markflow_active_doc';

const DEFAULT_WELCOME_DOC = `# 欢迎使用 MarkFlow ✨

一个优雅的所见即所得 Markdown 编辑器。

## 功能特性

### 即时渲染
输入 Markdown 语法后，内容会**即时渲染**为格式化文本。将光标移至已渲染的行，即可看到原始 Markdown 语法。

### 格式化支持
- **粗体文本**
- *斜体文本*
- ~~删除线文本~~
- \`行内代码\`

### 任务列表
- [ ] 体验 MarkFlow 编辑器
- [ ] 尝试深色/浅色主题切换
- [x] 开始书写你的第一篇文档

### 代码块
\`\`\`javascript
function greet(name) {
  return \`你好, \${name}! 欢迎使用 MarkFlow 🚀\`;
}
\`\`\`

### 引用
> 好的工具让创作更加专注，好的编辑器让写作成为享受。

### 链接
访问 [GitHub](https://github.com) 了解更多开源项目。

---

开始编辑吧，尽情书写！🖊️
`;

export class Storage {
  constructor() {
    this._docs = this._load();
    if (Object.keys(this._docs).length === 0) {
      this.createDoc('欢迎使用 MarkFlow', DEFAULT_WELCOME_DOC);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._docs));
    } catch (e) {
      console.error('Storage save failed:', e);
    }
  }

  getAllDocs() {
    return Object.entries(this._docs)
      .map(([id, doc]) => ({ id, ...doc }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getDoc(id) {
    return this._docs[id] || null;
  }

  createDoc(title = '未命名文档', content = '') {
    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this._docs[id] = {
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this._save();
    this.setActiveId(id);
    return id;
  }

  updateDoc(id, updates) {
    if (!this._docs[id]) return;
    Object.assign(this._docs[id], updates, { updatedAt: Date.now() });
    this._save();
  }

  deleteDoc(id) {
    delete this._docs[id];
    this._save();
  }

  renameDoc(id, newTitle) {
    if (!this._docs[id]) return;
    this._docs[id].title = newTitle;
    this._docs[id].updatedAt = Date.now();
    this._save();
  }

  getActiveId() {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (id && this._docs[id]) return id;
    const docs = this.getAllDocs();
    return docs.length > 0 ? docs[0].id : null;
  }

  setActiveId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  }
}
