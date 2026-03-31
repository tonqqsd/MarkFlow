import { EditorView, keymap, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxHighlighting, defaultHighlightStyle, syntaxTree } from "@codemirror/language";
import { Decoration, ViewPlugin } from "@codemirror/view";

// --- WYSIWYG Decoration Plugin ---
// A simplified approach: hide markdown syntax markers when the cursor is NOT on their line.
// Add specific line classes for headings, blockquotes, etc.

const wysiwygPlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = this.buildDecorations(view);
  }

  update(update) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view) {
    const builder = [];
    const selection = view.state.selection.main;
    const activeLine = view.state.doc.lineAt(selection.head);
    
    // We only hide syntax if we are not in "source mode"
    // For now, let's assume always true, and toggle class on parent for source mode
    if (view.dom.classList.contains('source-mode')) {
       return Decoration.none;
    }

    for (let {from, to} of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from, to,
        enter: (node) => {
          const isCurrentLine = (node.from >= activeLine.from && node.from <= activeLine.to) ||
                                (node.to >= activeLine.from && node.to <= activeLine.to) ||
                                (activeLine.from >= node.from && activeLine.to <= node.to);

          const name = node.name;

          // Line Decorations (Headings, Blockquotes)
          if (name.startsWith('ATXHeading')) {
            const level = name.slice(-1);
            if (node.from === view.state.doc.lineAt(node.from).from) {
               builder.push(Decoration.line({class: `cm-wysiwyg-h${level}`}).range(node.from));
            }
          } else if (name === 'Blockquote') {
            if (node.from === view.state.doc.lineAt(node.from).from) {
               builder.push(Decoration.line({class: `cm-wysiwyg-blockquote`}).range(node.from));
            }
          }

          // Inline Formatting - hiding markers
          if (['HeaderMark', 'EmphasisMark', 'QuoteMark', 'CodeMark'].includes(name)) {
             const isCursorOnMark = selection.from <= node.to && selection.to >= node.from;
             
             if (!isCursorOnMark) {
                builder.push(Decoration.replace({}).range(node.from, node.to));
             } else {
                builder.push(Decoration.mark({class: 'cm-syntax-hidden-active'}).range(node.from, node.to));
             }
          }
          
          // Style content
          if (name === 'StrongEmphasis') {
             builder.push(Decoration.mark({class: 'cm-wysiwyg-bold'}).range(node.from, node.to));
          } else if (name === 'Emphasis') {
             builder.push(Decoration.mark({class: 'cm-wysiwyg-italic'}).range(node.from, node.to));
          } else if (name === 'Strikethrough') {
             builder.push(Decoration.mark({class: 'cm-wysiwyg-strikethrough'}).range(node.from, node.to));
          } else if (name === 'InlineCode') {
             builder.push(Decoration.mark({class: 'cm-wysiwyg-inline-code'}).range(node.from, node.to));
          } else if (name === 'Link') {
             builder.push(Decoration.mark({class: 'cm-wysiwyg-link'}).range(node.from, node.to));
          }
        }
      });
    }

    // Sort is required for CodeMirror decorations
    builder.sort((a, b) => a.from - b.from || a.startSide - b.startSide);
    return Decoration.set(builder, true);
  }
}, {
  decorations: v => v.decorations
});


import { Compartment } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";

const languageConf = new Compartment();

export class Editor {
  constructor(container, onChange, onCursorActivity) {
    this.container = container;
    this.onChange = onChange;
    this.onCursorActivity = onCursorActivity;
    this.sourceMode = false;
    this.view = null;
    this.currentExt = 'md';
  }

  init(initialContent, ext = 'md') {
    this.currentExt = ext;
    const langExt = this.getLanguageExtension(ext);
    
    // Ensure container is empty before initializing (in case of re-init)
    this.container.innerHTML = '';
    
    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        history(),
        drawSelection(),
        highlightSpecialChars(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab
        ]),
        languageConf.of(langExt),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        wysiwygPlugin,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
             this.onChange(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
             this.updateStats(update.state);
          }
        }),
        EditorView.lineWrapping
      ]
    });

    this.view = new EditorView({
      state,
      parent: this.container
    });
    
    this.updateStats(state);
  }

  getLanguageExtension(ext) {
    switch(ext.toLowerCase()) {
      case 'json': return json();
      case 'html': return html();
      case 'sh': return StreamLanguage.define(shell);
      case 'txt': return []; // No specific highlighting for plain text
      default: return markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true });
    }
  }

  setLanguage(ext) {
    if (this.currentExt === ext || !this.view) return;
    this.currentExt = ext;
    this.view.dispatch({
      effects: languageConf.reconfigure(this.getLanguageExtension(ext))
    });
  }

  setContent(content) {
    if (!this.view) return;
    const currentObj = this.view.state.doc;
    const currentContent = currentObj.toString();
    if (content !== currentContent) {
      this.view.dispatch({
        changes: {from: 0, to: currentObj.length, insert: content}
      });
    }
  }

  getContent() {
    return this.view ? this.view.state.doc.toString() : '';
  }

  updateStats(state) {
    if (!this.onCursorActivity) return;
    const text = state.doc.toString();
    const chars = text.length;
    const lines = state.doc.lines;
    const selection = state.selection.main;
    const line = state.doc.lineAt(selection.head);
    const col = selection.head - line.from + 1;
    
    this.onCursorActivity({ chars, lines, line: line.number, col });
  }

  toggleSourceMode() {
    this.sourceMode = !this.sourceMode;
    if (this.sourceMode) {
      this.view.dom.classList.add('source-mode');
    } else {
      this.view.dom.classList.remove('source-mode');
    }
    // Force decoration update
    this.view.dispatch({ effects: [] });
    return this.sourceMode;
  }
  
  applyFormat(prefix, suffix = '') {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    const selectedText = this.view.state.sliceDoc(from, to);
    
    if (selectedText.length > 0) {
      this.view.dispatch({
        changes: { from, to, insert: prefix + selectedText + suffix },
        selection: { anchor: from + prefix.length, head: from + prefix.length + selectedText.length }
      });
    } else {
      this.view.dispatch({
        changes: { from, to: from, insert: prefix + suffix },
        selection: { anchor: from + prefix.length }
      });
    }
    this.view.focus();
  }

  insertLinePrefix(prefix) {
    if (!this.view) return;
    const { from, to } = this.view.state.selection.main;
    const lineInfo = this.view.state.doc.lineAt(from);
    
    this.view.dispatch({
      changes: { from: lineInfo.from, to: lineInfo.from, insert: prefix },
      selection: { anchor: from + prefix.length, head: to + prefix.length }
    });
    this.view.focus();
  }

  insertText(text) {
     if(!this.view) return;
     const {head} = this.view.state.selection.main;
     this.view.dispatch({
        changes: {from: head, to: head, insert: text},
        selection: {anchor: head + text.length}
     });
     this.view.focus();
  }

  focus() {
    this.view?.focus();
  }
}
