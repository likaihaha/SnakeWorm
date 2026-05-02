/**
 * 键盘快捷键模块
 * 提供键盘快捷键管理
 */

class KeyboardManager {
  constructor(editor) {
    this.editor = editor;
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.modifierKeys = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false
    };
    
    this.init();
  }

  init() {
    this.setupDefaultShortcuts();
    this.setupEventListeners();
  }

  setupDefaultShortcuts() {
    // 文件操作
    this.addShortcut('ctrl+s', 'save', '保存配置', () => this.editor.saveConfig());
    this.addShortcut('ctrl+shift+s', 'saveAs', '另存为', () => this.editor.saveConfig());
    this.addShortcut('ctrl+o', 'open', '打开配置', () => this.editor.loadFromFile());
    this.addShortcut('ctrl+n', 'new', '新建空白', () => this.editor.resetConfig());
    this.addShortcut('ctrl+shift+e', 'exportPNG', '导出PNG', () => this.editor.exportManager.exportPNG());
    this.addShortcut('ctrl+shift+j', 'exportJSON', '导出JSON', () => this.editor.exportManager.exportJSON());
    
    // 编辑操作
    this.addShortcut('ctrl+z', 'undo', '撤销', () => this.editor.undo());
    this.addShortcut('ctrl+shift+z', 'redo', '重做', () => this.editor.redo());
    this.addShortcut('ctrl+y', 'redoAlt', '重做', () => this.editor.redo());
    this.addShortcut('ctrl+c', 'copy', '复制', () => this.editor.copyElement(this.editor.selectedElement));
    this.addShortcut('ctrl+v', 'paste', '粘贴', () => this.editor.pasteElement());
    this.addShortcut('ctrl+x', 'cut', '剪切', () => {
      this.editor.copyElement(this.editor.selectedElement);
      this.editor.deleteElement(this.editor.selectedElement);
    });
    this.addShortcut('ctrl+d', 'duplicate', '复制元素', () => {
      if (this.editor.selectedElement) {
        this.editor.elementFactory.cloneElement(this.editor.selectedElement);
      }
    });
    this.addShortcut('ctrl+a', 'selectAll', '全选', () => this.editor.selectAllElements());
    this.addShortcut('escape', 'deselect', '取消选择', () => this.editor.selectElement(null));
    
    // 删除操作
    this.addShortcut('delete', 'delete', '删除', () => {
      if (this.editor.selectedElement) {
        this.editor.deleteElement(this.editor.selectedElement);
      }
    });
    this.addShortcut('backspace', 'deleteAlt', '删除', () => {
      if (this.editor.selectedElement) {
        this.editor.deleteElement(this.editor.selectedElement);
      }
    });
    
    // 视图操作
    this.addShortcut('ctrl+=', 'zoomIn', '放大', () => this.editor.canvasManager.zoomIn());
    this.addShortcut('ctrl+-', 'zoomOut', '缩小', () => this.editor.canvasManager.zoomOut());
    this.addShortcut('ctrl+0', 'zoomFit', '适应画布', () => this.editor.canvasManager.zoomToFit());
    this.addShortcut('ctrl+shift+0', 'zoomReset', '重置缩放', () => this.editor.canvasManager.resetZoom());
    this.addShortcut('ctrl+\'', 'toggleGrid', '切换网格', () => this.editor.canvasManager.toggleGrid());
    this.addShortcut('ctrl+;', 'toggleGuides', '切换参考线', () => this.editor.canvasManager.toggleGuides());
    
    // 元素操作
    this.addShortcut('ctrl+]', 'bringForward', '上移一层', () => this.editor.moveElementForward());
    this.addShortcut('ctrl+[', 'sendBackward', '下移一层', () => this.editor.moveElementBackward());
    this.addShortcut('ctrl+shift+]', 'bringToFront', '移到顶层', () => this.editor.moveElementToFront());
    this.addShortcut('ctrl+shift+[', 'sendToBack', '移到底层', () => this.editor.moveElementToBack());
    this.addShortcut('f2', 'rename', '重命名', () => this.editor.renameSelectedElement());
    
    // 对齐操作
    this.addShortcut('ctrl+shift+l', 'alignLeft', '左对齐', () => this.editor.canvasManager.alignElements('left'));
    this.addShortcut('ctrl+shift+r', 'alignRight', '右对齐', () => this.editor.canvasManager.alignElements('right'));
    this.addShortcut('ctrl+shift+t', 'alignTop', '顶对齐', () => this.editor.canvasManager.alignElements('top'));
    this.addShortcut('ctrl+shift+b', 'alignBottom', '底对齐', () => this.editor.canvasManager.alignElements('bottom'));
    this.addShortcut('ctrl+shift+h', 'alignCenterH', '水平居中', () => this.editor.canvasManager.alignElements('centerH'));
    this.addShortcut('ctrl+shift+v', 'alignCenterV', '垂直居中', () => this.editor.canvasManager.alignElements('centerV'));
    
    // 工具切换
    this.addShortcut('v', 'selectTool', '选择工具', () => this.editor.setTool('select'));
    this.addShortcut('h', 'handTool', '抓手工具', () => this.editor.setTool('hand'));
    this.addShortcut('z', 'zoomTool', '缩放工具', () => this.editor.setTool('zoom'));
    this.addShortcut('r', 'rectangleTool', '矩形工具', () => this.editor.setTool('rectangle'));
    this.addShortcut('c', 'circleTool', '圆形工具', () => this.editor.setTool('circle'));
    this.addShortcut('l', 'lineTool', '直线工具', () => this.editor.setTool('line'));
    this.addShortcut('p', 'penTool', '钢笔工具', () => this.editor.setTool('pen'));
    
    // 数字键快速选择图层
    for (let i = 1; i <= 9; i++) {
      this.addShortcut(`${i}`, `selectLayer${i}`, `选择图层${i}`, () => {
        this.editor.selectLayerByIndex(i - 1);
      });
    }
    
    // 功能键
    this.addShortcut('f1', 'help', '帮助', () => this.showHelp());
    this.addShortcut('f2', 'rename', '重命名', () => this.editor.renameSelectedElement());
    this.addShortcut('f5', 'preview', '预览', () => this.editor.togglePreview());
    this.addShortcut('f11', 'fullscreen', '全屏', () => this.toggleFullscreen());
  }

  addShortcut(keys, id, description, callback) {
    this.shortcuts.set(keys, {
      id,
      description,
      callback,
      keys: this.parseKeys(keys)
    });
  }

  removeShortcut(keys) {
    this.shortcuts.delete(keys);
  }

  parseKeys(keys) {
    const parts = keys.toLowerCase().split('+');
    return {
      ctrl: parts.includes('ctrl'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      meta: parts.includes('meta'),
      key: parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p))
    };
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // 窗口失去焦点时重置修饰键
    window.addEventListener('blur', () => {
      this.modifierKeys = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false
      };
    });
  }

  handleKeyDown(e) {
    if (!this.isEnabled) return;
    
    // 更新修饰键状态
    this.modifierKeys.ctrl = e.ctrlKey;
    this.modifierKeys.shift = e.shiftKey;
    this.modifierKeys.alt = e.altKey;
    this.modifierKeys.meta = e.metaKey;
    
    // 检查是否在输入框中
    if (this.isInputFocused()) {
      // 只处理特定快捷键
      if (!this.isGlobalShortcut(e)) {
        return;
      }
    }
    
    // 查找匹配的快捷键
    const shortcut = this.findMatchingShortcut(e);
    if (shortcut) {
      e.preventDefault();
      e.stopPropagation();
      shortcut.callback();
    }
  }

  handleKeyUp(e) {
    // 更新修饰键状态
    this.modifierKeys.ctrl = e.ctrlKey;
    this.modifierKeys.shift = e.shiftKey;
    this.modifierKeys.alt = e.altKey;
    this.modifierKeys.meta = e.metaKey;
  }

  findMatchingShortcut(e) {
    const key = e.key.toLowerCase();
    
    for (const [keys, shortcut] of this.shortcuts) {
      const parsed = shortcut.keys;
      
      if (parsed.ctrl === e.ctrlKey &&
          parsed.shift === e.shiftKey &&
          parsed.alt === e.altKey &&
          parsed.meta === e.metaKey &&
          parsed.key === key) {
        return shortcut;
      }
    }
    
    return null;
  }

  isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           activeElement.contentEditable === 'true';
  }

  isGlobalShortcut(e) {
    // 这些快捷键即使在输入框中也应该生效
    const globalShortcuts = [
      'ctrl+s',
      'ctrl+z',
      'ctrl+shift+z',
      'ctrl+y',
      'ctrl+c',
      'ctrl+v',
      'ctrl+x',
      'ctrl+a'
    ];
    
    const key = e.key.toLowerCase();
    const keys = [];
    if (e.ctrlKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    if (e.metaKey) keys.push('meta');
    keys.push(key);
    
    const shortcutKey = keys.join('+');
    return globalShortcuts.includes(shortcutKey);
  }

  // 启用/禁用快捷键
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
  }

  // 获取所有快捷键
  getAllShortcuts() {
    const shortcuts = [];
    for (const [keys, shortcut] of this.shortcuts) {
      shortcuts.push({
        keys,
        id: shortcut.id,
        description: shortcut.description
      });
    }
    return shortcuts;
  }

  // 按分类获取快捷键
  getShortcutsByCategory() {
    const categories = {
      file: { name: '文件操作', shortcuts: [] },
      edit: { name: '编辑操作', shortcuts: [] },
      view: { name: '视图操作', shortcuts: [] },
      element: { name: '元素操作', shortcuts: [] },
      align: { name: '对齐操作', shortcuts: [] },
      tool: { name: '工具切换', shortcuts: [] },
      other: { name: '其他', shortcuts: [] }
    };
    
    for (const [keys, shortcut] of this.shortcuts) {
      let category = 'other';
      
      if (['save', 'saveAs', 'open', 'new', 'exportPNG', 'exportJSON'].includes(shortcut.id)) {
        category = 'file';
      } else if (['undo', 'redo', 'redoAlt', 'copy', 'paste', 'cut', 'duplicate', 'selectAll', 'deselect', 'delete', 'deleteAlt'].includes(shortcut.id)) {
        category = 'edit';
      } else if (['zoomIn', 'zoomOut', 'zoomFit', 'zoomReset', 'toggleGrid', 'toggleGuides'].includes(shortcut.id)) {
        category = 'view';
      } else if (['bringForward', 'sendBackward', 'bringToFront', 'sendToBack'].includes(shortcut.id)) {
        category = 'element';
      } else if (shortcut.id.startsWith('align')) {
        category = 'align';
      } else if (shortcut.id.endsWith('Tool')) {
        category = 'tool';
      }
      
      categories[category].shortcuts.push({
        keys,
        id: shortcut.id,
        description: shortcut.description
      });
    }
    
    return categories;
  }

  // 显示帮助
  showHelp() {
    const shortcuts = this.getShortcutsByCategory();
    
    let helpContent = '键盘快捷键帮助\n\n';
    
    for (const [category, data] of Object.entries(shortcuts)) {
      if (data.shortcuts.length === 0) continue;
      
      helpContent += `${data.name}:\n`;
      data.shortcuts.forEach(shortcut => {
        helpContent += `  ${shortcut.keys.padEnd(20)} ${shortcut.description}\n`;
      });
      helpContent += '\n';
    }
    
    alert(helpContent);
  }

  // 切换全屏
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // 导出快捷键配置
  exportShortcuts() {
    const shortcuts = {};
    for (const [keys, shortcut] of this.shortcuts) {
      shortcuts[keys] = {
        id: shortcut.id,
        description: shortcut.description
      };
    }
    return shortcuts;
  }

  // 导入快捷键配置
  importShortcuts(shortcutsConfig) {
    for (const [keys, config] of Object.entries(shortcutsConfig)) {
      if (this.shortcuts.has(keys)) {
        const existing = this.shortcuts.get(keys);
        existing.description = config.description;
      }
    }
  }

  // 重置为默认快捷键
  resetToDefaults() {
    this.shortcuts.clear();
    this.setupDefaultShortcuts();
  }

  // 自定义快捷键
  customizeShortcut(keys, id, description, callback) {
    this.addShortcut(keys, id, description, callback);
  }

  // 销毁
  destroy() {
    this.shortcuts.clear();
  }
}

export { KeyboardManager };