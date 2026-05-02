/**
 * AI接口模块
 * 提供AI操作背景编辑器的接口
 */

class AIInterface {
  constructor(editor) {
    this.editor = editor;
    this.commandQueue = [];
    this.isProcessing = false;
    this.history = [];
    this.maxHistory = 100;
    
    // LLM API 配置
    this.llmConfig = {
      enabled: false,
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      maxTokens: 500
    };
  }

  // 配置 LLM API
  configureLLM(config) {
    Object.assign(this.llmConfig, config);
    return { success: true, enabled: this.llmConfig.enabled };
  }

  // 调用 LLM API
  async callLLM(userInput) {
    if (!this.llmConfig.enabled || !this.llmConfig.apiKey) {
      throw new Error('LLM API 未配置');
    }

    const systemPrompt = `你是一个动态背景编辑器的AI助手。用户会用自然语言描述想要的操作，你需要将其转换为JSON命令。

可用的命令格式：
1. 添加元素: {"type":"addElement","params":{"type":"形状类型","properties":{...}}}
   形状类型: rectangle, circle, polygon, particles
   properties可选: x, y, width, height, color, opacity, rotation等

2. 删除元素: {"type":"deleteElement","params":{"elementId":"shape_xxx"}}

3. 更新元素: {"type":"updateElement","params":{"elementId":"shape_xxx","properties":{...}}}

4. 设置背景: {"type":"setBackground","params":{"properties":{"color0":"#hex","color1":"#hex","color2":"#hex"}}}

5. 添加预设场景: {"type":"addPreset","params":{"presetName":"场景名"}}
   预设: deepSeaScene, forestScene, spaceScene

6. 撤销/重做: {"type":"undo"} 或 {"type":"redo"}

7. 设置画布大小: {"type":"setCanvasSize","params":{"width":800,"height":600}}

8. 批量操作: {"type":"batch","params":{"commands":[...]}}

请只返回一个JSON对象，不要有其他文字。如果用户意图不明确，返回 {"error":"无法理解","suggestions":["建议1","建议2"]}`;

    const response = await fetch(this.llmConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmConfig.apiKey}`
      },
      body: JSON.stringify({
        model: this.llmConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        max_tokens: this.llmConfig.maxTokens,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      const error = new Error(`LLM API 错误: ${response.status} - ${err}`);
      error.llmResponse = err;
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('LLM 返回为空');
    }

    // 尝试解析JSON
    try {
      // 提取JSON部分（可能被```json```包裹）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        const error = new Error('未找到JSON');
        error.llmResponse = content;
        throw error;
      }
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      if (e.llmResponse) throw e;
      const error = new Error(`LLM返回格式错误: ${content}`);
      error.llmResponse = content;
      throw error;
    }
  }

  // 获取编辑器状态
  getState() {
    return {
      config: this.editor.exportJSON(),
      selectedElement: this.editor.selectedElement,
      canvasSize: {
        width: this.editor.config.canvas.width,
        height: this.editor.config.canvas.height
      },
      elements: this.editor.config.shapes || [],
      layerOrder: this.editor.config.layerOrder || [],
      historyInfo: this.editor.historyManager.getHistoryInfo()
    };
  }

  // 执行AI命令
  async executeCommand(command) {
    const startTime = Date.now();
    
    try {
      // 记录命令
      this.history.push({
        command,
        timestamp: startTime,
        status: 'executing'
      });
      
      // 限制历史长度
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      // 执行命令
      const result = await this.processCommand(command);
      
      // 更新历史
      const historyEntry = this.history[this.history.length - 1];
      historyEntry.status = 'completed';
      historyEntry.result = result;
      historyEntry.duration = Date.now() - startTime;
      
      return {
        success: true,
        result,
        duration: historyEntry.duration
      };
      
    } catch (error) {
      // 更新历史
      const historyEntry = this.history[this.history.length - 1];
      historyEntry.status = 'failed';
      historyEntry.error = error.message;
      historyEntry.duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        duration: historyEntry.duration
      };
    }
  }

  // 处理命令
  async processCommand(command) {
    const { type, params } = command;
    
    switch (type) {
      case 'getConfig':
        return this.getConfig();
        
      case 'setConfig':
        return this.setConfig(params.config);
        
      case 'addElement':
        return this.addElement(params.type, params.properties);
        
      case 'deleteElement':
        return this.deleteElement(params.elementId);
        
      case 'updateElement':
        return this.updateElement(params.elementId, params.properties);
        
      case 'moveElement':
        return this.moveElement(params.elementId, params.x, params.y);
        
      case 'resizeElement':
        return this.resizeElement(params.elementId, params.width, params.height);
        
      case 'rotateElement':
        return this.rotateElement(params.elementId, params.angle);
        
      case 'setLayerOrder':
        return this.setLayerOrder(params.order);
        
      case 'moveLayer':
        return this.moveLayer(params.elementId, params.direction);
        
      case 'setCanvasSize':
        return this.setCanvasSize(params.width, params.height);
        
      case 'setBackground':
        return this.setBackground(params.properties);
        
      case 'addPreset':
        return this.addPreset(params.presetName);
        
      case 'batch':
        return this.executeBatch(params.commands);
        
      case 'query':
        return this.executeQuery(params.query);
        
      case 'export':
        return this.export(params.format);
        
      case 'undo':
        return this.undo();
        
      case 'redo':
        return this.redo();
        
      default:
        throw new Error(`未知的命令类型: ${type}`);
    }
  }

  // 获取配置
  getConfig() {
    return this.editor.exportJSON();
  }

  // 设置配置
  setConfig(config) {
    this.editor.saveToHistory();
    this.editor.loadConfig(config);
    return { success: true };
  }

  // 添加元素
  addElement(type, properties = {}) {
    // 使用 ElementFactory 创建元素，确保有合理的位置和大小
    if (this.editor.elementFactory) {
      const elementId = this.editor.elementFactory.createElement(type, properties);
      return { elementId };
    }
    // 回退到直接添加
    const elementId = this.editor.addElement(type, properties);
    return { elementId };
  }

  // 删除元素
  deleteElement(elementId) {
    this.editor.deleteElement(elementId);
    return { success: true };
  }

  // 更新元素
  updateElement(elementId, properties) {
    this.editor.saveToHistory();
    
    if (elementId.startsWith('shape_')) {
      const shapeId = elementId.replace('shape_', '');
      const shape = this.editor.config.shapes.find(s => s.id === shapeId);
      if (shape) {
        Object.assign(shape, properties);
        this.editor.rebuild();
        this.editor.markDirty();
        return { success: true };
      }
    }
    
    throw new Error(`元素不存在: ${elementId}`);
  }

  // 移动元素
  moveElement(elementId, x, y) {
    return this.updateElement(elementId, { x, y });
  }

  // 调整元素大小
  resizeElement(elementId, width, height) {
    return this.updateElement(elementId, { width, height });
  }

  // 旋转元素
  rotateElement(elementId, angle) {
    return this.updateElement(elementId, { rotation: angle });
  }

  // 设置图层顺序
  setLayerOrder(order) {
    this.editor.saveToHistory();
    this.editor.config.layerOrder = order;
    this.editor.rebuild();
    this.editor.markDirty();
    return { success: true };
  }

  // 移动图层
  moveLayer(elementId, direction) {
    const order = this.editor.config.layerOrder;
    const index = order.indexOf(elementId);
    
    if (index === -1) {
      throw new Error(`图层不存在: ${elementId}`);
    }
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) {
      throw new Error(`无法移动图层: 方向 ${direction} 超出范围`);
    }
    
    this.editor.saveToHistory();
    
    // 交换位置
    [order[index], order[newIndex]] = [order[newIndex], order[index]];
    
    this.editor.rebuild();
    this.editor.markDirty();
    
    return { success: true, newIndex };
  }

  // 设置画布大小
  setCanvasSize(width, height) {
    this.editor.saveToHistory();
    this.editor.config.canvas.width = width;
    this.editor.config.canvas.height = height;
    this.editor.rebuild();
    this.editor.markDirty();
    return { success: true };
  }

  // 设置背景
  setBackground(properties) {
    this.editor.saveToHistory();
    
    if (!this.editor.config.background) {
      this.editor.config.background = {};
    }
    
    Object.assign(this.editor.config.background, properties);
    this.editor.rebuild();
    this.editor.markDirty();
    
    return { success: true };
  }

  // 添加预设
  addPreset(presetName) {
    this.editor.elementFactory.createPreset(presetName);
    return { success: true };
  }

  // 批量执行命令
  async executeBatch(commands) {
    const results = [];
    
    this.editor.historyManager.beginBatch('批量操作');
    
    for (const command of commands) {
      try {
        const result = await this.processCommand(command);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    this.editor.historyManager.endBatch();
    
    return results;
  }

  // 执行查询
  executeQuery(query) {
    const { type, params } = query;
    
    switch (type) {
      case 'getElements':
        return this.getElements(params.filter);
        
      case 'getElement':
        return this.getElement(params.elementId);
        
      case 'getSelectedElement':
        return this.getSelectedElement();
        
      case 'getLayerOrder':
        return this.getLayerOrder();
        
      case 'getCanvasSize':
        return this.getCanvasSize();
        
      case 'getBackground':
        return this.getBackground();
        
      case 'searchElements':
        return this.searchElements(params.query);
        
      case 'getHistory':
        return this.getHistory(params.limit);
        
      case 'getStats':
        return this.getStats();
        
      default:
        throw new Error(`未知的查询类型: ${type}`);
    }
  }

  // 获取元素列表
  getElements(filter = {}) {
    let elements = this.editor.config.shapes || [];
    
    if (filter.type) {
      elements = elements.filter(e => e.type === filter.type);
    }
    
    if (filter.visible !== undefined) {
      elements = elements.filter(e => e.visible === filter.visible);
    }
    
    if (filter.name) {
      const nameLower = filter.name.toLowerCase();
      elements = elements.filter(e => 
        e.name && e.name.toLowerCase().includes(nameLower)
      );
    }
    
    return elements;
  }

  // 获取单个元素
  getElement(elementId) {
    if (elementId.startsWith('shape_')) {
      const shapeId = elementId.replace('shape_', '');
      return this.editor.config.shapes.find(s => s.id === shapeId);
    }
    return null;
  }

  // 获取选中的元素
  getSelectedElement() {
    return this.editor.selectedElement;
  }

  // 获取图层顺序
  getLayerOrder() {
    return this.editor.config.layerOrder || [];
  }

  // 获取画布大小
  getCanvasSize() {
    return {
      width: this.editor.config.canvas.width,
      height: this.editor.config.canvas.height
    };
  }

  // 获取背景配置
  getBackground() {
    return this.editor.config.background;
  }

  // 搜索元素
  searchElements(query) {
    const queryLower = query.toLowerCase();
    const elements = this.editor.config.shapes || [];
    
    return elements.filter(element => {
      // 搜索名称
      if (element.name && element.name.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // 搜索类型
      if (element.type && element.type.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // 搜索属性值
      for (const [key, value] of Object.entries(element)) {
        if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
          return true;
        }
      }
      
      return false;
    });
  }

  // 获取历史记录
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  // 获取统计信息
  getStats() {
    const elements = this.editor.config.shapes || [];
    
    const stats = {
      totalElements: elements.length,
      visibleElements: elements.filter(e => e.visible !== false).length,
      elementTypes: {},
      canvasSize: this.getCanvasSize(),
      historyCount: this.history.length
    };
    
    // 统计各类型元素数量
    elements.forEach(element => {
      const type = element.type || 'unknown';
      stats.elementTypes[type] = (stats.elementTypes[type] || 0) + 1;
    });
    
    return stats;
  }

  // 导出
  export(format) {
    switch (format) {
      case 'png':
        return this.editor.exportManager.exportPNG();
      case 'json':
        return this.editor.exportManager.exportJSON();
      case 'svg':
        return this.editor.exportManager.exportSVG();
      case 'js':
        return this.editor.exportManager.exportJavaScript();
      case 'html':
        return this.editor.exportManager.exportHTML();
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  // 撤销
  undo() {
    const success = this.editor.undo();
    return { success };
  }

  // 重做
  redo() {
    const success = this.editor.redo();
    return { success };
  }

  // 自然语言处理
  async processNaturalLanguage(input) {
    const inputLower = input.toLowerCase().trim();
    
    // 优先尝试 LLM
    if (this.llmConfig.enabled && this.llmConfig.apiKey) {
      try {
        const llmResult = await this.callLLM(input);
        
        // 如果LLM返回错误
        if (llmResult.error) {
          return { success: false, error: llmResult.error, suggestions: llmResult.suggestions };
        }
        
        // 如果LLM返回的是有效命令，执行它
        if (llmResult.type) {
          const result = await this.executeCommand(llmResult);
          return { ...result, source: 'llm' };
        }
        
        // 批量命令
        if (llmResult.type === 'batch') {
          const result = await this.executeCommand(llmResult);
          return { ...result, source: 'llm' };
        }
      } catch (error) {
        console.warn('LLM调用失败，回退到本地匹配:', error.message);
        // 返回LLM错误信息，由调用方决定是否显示
        return { 
          success: false, 
          error: `LLM调用失败: ${error.message}`,
          llmError: true,
          llmResponse: error.llmResponse || null
        };
      }
    }
    
    // 帮助/命令列表
    if (inputLower === '帮助' || inputLower === 'help' || inputLower === '?') {
      return {
        success: true,
        result: {
          commands: [
            '添加矩形/圆形/多边形/粒子',
            '删除元素',
            '设置背景为蓝色/红色/绿色',
            '创建深海/森林/太空场景',
            '撤销/重做'
          ]
        }
      };
    }
    
    // 撤销
    if (inputLower.includes('撤销') || inputLower === 'undo') {
      return await this.executeCommand({ type: 'undo' });
    }
    
    // 重做
    if (inputLower.includes('重做') || inputLower === 'redo') {
      return await this.executeCommand({ type: 'redo' });
    }
    
    // 添加元素（更灵活的匹配）
    const addKeywords = ['添加', '创建', '新建', '画', '放', '加', '来个', '来一个'];
    const hasAddIntent = addKeywords.some(k => inputLower.includes(k));
    
    // 直接匹配形状名称（不需要动词）
    const shapeMap = {
      '矩形': 'rectangle', '方形': 'rectangle', '正方形': 'rectangle',
      '圆形': 'circle', '圆': 'circle', '圆圈': 'circle',
      '多边形': 'polygon', '六边形': 'polygon',
      '粒子': 'particles', '星星': 'particles', '星': 'particles'
    };
    
    for (const [keyword, type] of Object.entries(shapeMap)) {
      if (inputLower.includes(keyword) && (hasAddIntent || inputLower.length <= keyword.length + 2)) {
        return await this.executeCommand({
          type: 'addElement',
          params: { type }
        });
      }
    }
    
    // 删除元素
    if (inputLower.includes('删除') || inputLower.includes('移除') || inputLower.includes('去掉') || inputLower === 'delete') {
      if (this.editor.selectedElement) {
        return await this.executeCommand({
          type: 'deleteElement',
          params: { elementId: this.editor.selectedElement }
        });
      } else {
        return { success: false, error: '请先选中一个元素再删除' };
      }
    }
    
    // 修改背景
    const colorMap = {
      '蓝色': { color0: '#0000ff', color1: '#0000cc', color2: '#000099' },
      '红色': { color0: '#ff0000', color1: '#cc0000', color2: '#990000' },
      '绿色': { color0: '#00ff00', color1: '#00cc00', color2: '#009900' },
      '黑色': { color0: '#000000', color1: '#111111', color2: '#222222' },
      '白色': { color0: '#ffffff', color1: '#eeeeee', color2: '#dddddd' },
      '紫色': { color0: '#800080', color1: '#660066', color2: '#4d004d' },
      '橙色': { color0: '#ff8800', color1: '#cc6600', color2: '#994400' }
    };
    
    if (inputLower.includes('背景') || inputLower.includes('底色') || inputLower.includes('背景色')) {
      for (const [colorName, colors] of Object.entries(colorMap)) {
        if (inputLower.includes(colorName)) {
          return await this.executeCommand({
            type: 'setBackground',
            params: { properties: colors }
          });
        }
      }
    }
    
    // 预设场景
    const presetMap = {
      '深海': 'deepSeaScene', '海底': 'deepSeaScene', '海洋': 'deepSeaScene',
      '森林': 'forestScene', '树林': 'forestScene',
      '太空': 'spaceScene', '星空': 'spaceScene', '宇宙': 'spaceScene'
    };
    
    for (const [keyword, preset] of Object.entries(presetMap)) {
      if (inputLower.includes(keyword)) {
        return await this.executeCommand({
          type: 'addPreset',
          params: { presetName: preset }
        });
      }
    }
    
    // 无法理解的命令
    return {
      success: false,
      error: '无法理解该命令',
      suggestions: [
        '添加矩形', '画一个圆', '创建粒子',
        '删除', '设置背景为蓝色',
        '创建深海场景', '帮助'
      ]
    };
  }

  // 获取命令建议
  getCommandSuggestions(context = {}) {
    const suggestions = [];
    
    // 基于当前状态的建议
    if (!this.editor.selectedElement) {
      suggestions.push({
        command: '添加矩形',
        description: '在画布上添加一个矩形'
      });
      suggestions.push({
        command: '创建圆形',
        description: '在画布上创建一个圆形'
      });
      suggestions.push({
        command: '创建深海场景',
        description: '使用预设创建深海场景'
      });
    } else {
      suggestions.push({
        command: '删除选中的元素',
        description: '删除当前选中的元素'
      });
      suggestions.push({
        command: '复制选中的元素',
        description: '复制当前选中的元素'
      });
    }
    
    // 通用建议
    suggestions.push({
      command: '设置背景为蓝色',
      description: '将背景颜色改为蓝色'
    });
    suggestions.push({
      command: '添加粒子效果',
      description: '添加粒子系统效果'
    });
    suggestions.push({
      command: '导出PNG',
      description: '将当前背景导出为PNG图片'
    });
    
    return suggestions;
  }

  // 清空历史
  clearHistory() {
    this.history = [];
  }

  // 获取接口状态
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      historyCount: this.history.length,
      lastCommand: this.history.length > 0 ? this.history[this.history.length - 1] : null
    };
  }
}

export { AIInterface };