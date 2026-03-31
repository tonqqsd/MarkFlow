export class Shortcuts {
  constructor(editor, toolbar) {
    this.editor = editor;
    this.toolbar = toolbar;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (!cmdKey) return;

      let action = null;
      switch (e.key.toLowerCase()) {
        case 'b': action = 'bold'; break;
        case 'i': action = 'italic'; break;
        case 'k': action = 'link'; break;
      }

      if (action) {
        e.preventDefault();
        if (action === 'open' && window.appOpenFile) {
           window.appOpenFile();
        } else if (action === 'save' && window.appSaveFile) {
           window.appSaveFile();
        } else {
           this.toolbar.handleAction(action);
        }
      }
    });
  }
}
