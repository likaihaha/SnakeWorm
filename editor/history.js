/**
 * 历史管理模块
 * 提供撤销/重做功能
 */

class HistoryManager {
  constructor(editor, maxHistory = 50) {
    this.editor = editor;
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
    this.isRecording = true;
    this.batchDepth = 0;
    this.batchActions = [];
  }

  // 保存状态到历史
  saveState(description = '') {
    if (!this.isRecording) return;
    
    const state = {
      config: JSON.parse(JSON.stringify(this.editor.config)),
      timestamp: Date.now(),
      description: description
    };
    
    this.undoStack.push(state);
    
    // 限制历史长度
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
    // 清空重做栈
    this.redoStack = [];
    
    this.updateUI();
  }

  // 撤销
  undo() {
    if (this.undoStack.length === 0) return false;
    
    // 保存当前状态到重做栈
    const currentState = {
      config: JSON.parse(JSON.stringify(this.editor.config)),
      timestamp: Date.now(),
      description: '撤销前状态'
    };
    this.redoStack.push(currentState);
    
    // 恢复上一个状态
    const previousState = this.undoStack.pop();
    this.editor.config = previousState.config;
    this.editor.rebuild();
    this.editor.markDirty();
    
    this.updateUI();
    return true;
  }

  // 重做
  redo() {
    if (this.redoStack.length === 0) return false;
    
    // 保存当前状态到撤销栈
    const currentState = {
      config: JSON.parse(JSON.stringify(this.editor.config)),
      timestamp: Date.now(),
      description: '重做前状态'
    };
    this.undoStack.push(currentState);
    
    // 恢复下一个状态
    const nextState = this.redoStack.pop();
    this.editor.config = nextState.config;
    this.editor.rebuild();
    this.editor.markDirty();
    
    this.updateUI();
    return true;
  }

  // 开始批量操作
  beginBatch(description = '') {
    this.batchDepth++;
    if (this.batchDepth === 1) {
      this.batchActions = [];
      this.batchDescription = description;
    }
  }

  // 结束批量操作
  endBatch() {
    this.batchDepth--;
    if (this.batchDepth === 0 && this.batchActions.length > 0) {
      // 保存批量操作的最终状态
      this.saveState(this.batchDescription || `批量操作 (${this.batchActions.length} 步)`);
      this.batchActions = [];
    }
  }

  // 清空历史
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUI();
  }

  // 获取历史信息
  getHistoryInfo() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      lastAction: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].description : null
    };
  }

  // 获取撤销历史
  getUndoHistory() {
    return this.undoStack.map((state, index) => ({
      index,
      description: state.description,
      timestamp: state.timestamp
    }));
  }

  // 获取重做历史
  getRedoHistory() {
    return this.redoStack.map((state, index) => ({
      index,
      description: state.description,
      timestamp: state.timestamp
    }));
  }

  // 跳转到指定历史状态
  goToState(index, type = 'undo') {
    const stack = type === 'undo' ? this.undoStack : this.redoStack;
    if (index < 0 || index >= stack.length) return false;
    
    // 保存当前状态
    this.saveState(`跳转到历史状态 ${index}`);
    
    // 恢复目标状态
    const targetState = stack[index];
    this.editor.config = targetState.config;
    this.editor.rebuild();
    this.editor.markDirty();
    
    this.updateUI();
    return true;
  }

  // 更新UI
  updateUI() {
    // 更新撤销/重做按钮状态
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
      undoBtn.disabled = this.undoStack.length === 0;
      undoBtn.title = this.undoStack.length > 0 ? 
        `撤销: ${this.undoStack[this.undoStack.length - 1].description}` : 
        '无可撤销操作';
    }
    
    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
      redoBtn.title = this.redoStack.length > 0 ? 
        `重做: ${this.redoStack[this.redoStack.length - 1].description}` : 
        '无可重做操作';
    }
    
    // 更新历史面板
    this.updateHistoryPanel();
  }

  // 更新历史面板
  updateHistoryPanel() {
    const panel = document.getElementById('history-panel');
    if (!panel) return;
    
    panel.innerHTML = '';
    
    // 标题
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = '历史记录';
    panel.appendChild(title);
    
    // 撤销历史
    if (this.undoStack.length > 0) {
      const undoSection = document.createElement('div');
      undoSection.className = 'history-section';
      
      const undoTitle = document.createElement('div');
      undoTitle.className = 'history-section-title';
      undoTitle.textContent = '可撤销';
      undoSection.appendChild(undoTitle);
      
      this.undoStack.slice().reverse().forEach((state, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <span class="history-item-icon">↩️</span>
          <span class="history-item-text">${state.description || '未命名操作'}</span>
          <span class="history-item-time">${this.formatTime(state.timestamp)}</span>
        `;
        item.addEventListener('click', () => {
          this.goToState(this.undoStack.length - 1 - index, 'undo');
        });
        undoSection.appendChild(item);
      });
      
      panel.appendChild(undoSection);
    }
    
    // 当前状态
    const current = document.createElement('div');
    current.className = 'history-item current';
    current.innerHTML = `
      <span class="history-item-icon">📍</span>
      <span class="history-item-text">当前状态</span>
    `;
    panel.appendChild(current);
    
    // 重做历史
    if (this.redoStack.length > 0) {
      const redoSection = document.createElement('div');
      redoSection.className = 'history-section';
      
      const redoTitle = document.createElement('div');
      redoTitle.className = 'history-section-title';
      redoTitle.textContent = '可重做';
      redoSection.appendChild(redoTitle);
      
      this.redoStack.forEach((state, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
          <span class="history-item-icon">↪️</span>
          <span class="history-item-text">${state.description || '未命名操作'}</span>
          <span class="history-item-time">${this.formatTime(state.timestamp)}</span>
        `;
        item.addEventListener('click', () => {
          this.goToState(index, 'redo');
        });
        redoSection.appendChild(item);
      });
      
      panel.appendChild(redoSection);
    }
  }

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  // 自动保存
  enableAutoSave(interval = 30000) {
    this.autoSaveInterval = setInterval(() => {
      if (this.editor.isDirty) {
        this.saveState('自动保存');
        this.editor.saveToStorage();
      }
    }, interval);
  }

  // 禁用自动保存
  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // 导出历史记录
  exportHistory() {
    return {
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      maxHistory: this.maxHistory
    };
  }

  // 导入历史记录
  importHistory(historyData) {
    if (historyData.undoStack) {
      this.undoStack = historyData.undoStack;
    }
    if (historyData.redoStack) {
      this.redoStack = historyData.redoStack;
    }
    if (historyData.maxHistory) {
      this.maxHistory = historyData.maxHistory;
    }
    this.updateUI();
  }

  // 销毁
  destroy() {
    this.disableAutoSave();
    this.clear();
  }
}

export { HistoryManager };