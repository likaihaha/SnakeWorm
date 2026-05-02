# DynamicBG 编辑器 v2.3

一个模块化的动态背景编辑器，支持从零开始构建背景，提供AI操作接口。

## 功能特性

### 核心功能
- **空白画布起步** - 从空白画布开始构建背景
- **多种内置元素** - 矩形、圆形、椭圆、多边形、折线、曲线等
- **环境效果** - 渐变背景、光晕、迷雾、暗角
- **自然元素** - 山脉、河流、岩石
- **动态元素** - 粒子系统、水母、热液喷口
- **撤销重做** - 完整的操作历史管理
- **键盘快捷键** - 丰富的快捷键支持
- **导出功能** - PNG、JPEG、WebP、SVG、JSON、JavaScript、HTML

### AI操作接口
- 自然语言命令处理
- 元素创建、删除、修改
- 批量操作
- 查询和统计

## 模块结构

```
editor/
├── core.js          # 核心编辑器类
├── canvas.js        # 画布管理（缩放、平移、网格）
├── elements.js      # 元素工厂和类型定义
├── history.js       # 撤销重做管理
├── export.js        # 导出功能
├── keyboard.js      # 键盘快捷键
├── ai.js            # AI操作接口
├── index.html       # 主编辑器界面
├── test.html        # 测试页面
└── README.md        # 本文档
```

## 快速开始

### 1. 打开编辑器
直接打开 `index.html` 文件即可使用编辑器。

### 2. 从空白画布开始
1. 点击"新建"按钮创建空白画布
2. 在左侧面板选择"元素"标签
3. 点击要添加的元素类型
4. 在右侧属性面板调整元素属性

### 3. 使用预设场景
1. 在左侧面板选择"预设"标签
2. 点击预设场景（深海、森林、太空等）
3. 根据需要调整元素

### 4. AI操作
在底部AI输入框中输入自然语言命令：
- "添加一个矩形"
- "创建圆形"
- "设置背景为蓝色"
- "创建深海场景"
- "删除选中的元素"

## 键盘快捷键

### 文件操作
- `Ctrl+N` - 新建空白画布
- `Ctrl+O` - 打开配置文件
- `Ctrl+S` - 保存配置
- `Ctrl+Shift+E` - 导出PNG
- `Ctrl+Shift+J` - 导出JSON

### 编辑操作
- `Ctrl+Z` - 撤销
- `Ctrl+Shift+Z` - 重做
- `Ctrl+C` - 复制元素
- `Ctrl+V` - 粘贴元素
- `Ctrl+D` - 复制元素
- `Delete` - 删除元素
- `Escape` - 取消选择

### 视图操作
- `Ctrl+=` - 放大
- `Ctrl+-` - 缩小
- `Ctrl+0` - 适应画布
- `Ctrl+'` - 切换网格
- `Ctrl+;` - 切换参考线

### 元素操作
- `Ctrl+]` - 上移一层
- `Ctrl+[` - 下移一层
- `Ctrl+Shift+]` - 移到顶层
- `Ctrl+Shift+[` - 移到底层

### 对齐操作
- `Ctrl+Shift+L` - 左对齐
- `Ctrl+Shift+R` - 右对齐
- `Ctrl+Shift+T` - 顶对齐
- `Ctrl+Shift+B` - 底对齐
- `Ctrl+Shift+H` - 水平居中
- `Ctrl+Shift+V` - 垂直居中

### 工具切换
- `V` - 选择工具
- `H` - 抓手工具
- `Z` - 缩放工具
- `R` - 矩形工具
- `C` - 圆形工具
- `L` - 直线工具
- `P` - 钢笔工具

## AI接口使用

### 命令格式
```javascript
// 获取编辑器状态
const state = aiInterface.getState();

// 执行命令
const result = await aiInterface.executeCommand({
  type: 'addElement',
  params: {
    type: 'rectangle',
    properties: {
      x: 0.3,
      y: 0.3,
      width: 0.4,
      height: 0.3,
      fill: 'rgba(88, 166, 255, 0.3)'
    }
  }
});

// 自然语言处理
const result = await aiInterface.processNaturalLanguage('添加一个矩形');

// 批量操作
const results = await aiInterface.executeCommand({
  type: 'batch',
  params: {
    commands: [
      { type: 'addElement', params: { type: 'rectangle' } },
      { type: 'addElement', params: { type: 'circle' } }
    ]
  }
});
```

### 支持的命令类型
- `getConfig` - 获取配置
- `setConfig` - 设置配置
- `addElement` - 添加元素
- `deleteElement` - 删除元素
- `updateElement` - 更新元素
- `moveElement` - 移动元素
- `resizeElement` - 调整大小
- `rotateElement` - 旋转元素
- `setLayerOrder` - 设置图层顺序
- `moveLayer` - 移动图层
- `setCanvasSize` - 设置画布大小
- `setBackground` - 设置背景
- `addPreset` - 添加预设
- `batch` - 批量操作
- `query` - 查询
- `export` - 导出
- `undo` - 撤销
- `redo` - 重做

## 开发指南

### 添加新元素类型
1. 在 `elements.js` 的 `ELEMENT_TYPES` 中添加新类型定义
2. 在 `ELEMENT_CATEGORIES` 中添加分类（如果需要）
3. 在 `getElementFields()` 方法中添加属性字段

### 添加新预设
1. 在 `elements.js` 的 `createPreset()` 方法中添加新预设
2. 在 `index.html` 的 `renderPresetsPanel()` 方法中添加预设按钮

### 添加新快捷键
1. 在 `keyboard.js` 的 `setupDefaultShortcuts()` 方法中添加新快捷键
2. 在 `showHelp()` 方法中更新帮助信息

### 添加新导出格式
1. 在 `export.js` 中添加新导出方法
2. 在 `index.html` 中添加导出按钮

## 测试

打开 `test.html` 文件运行功能测试：
- 模块加载测试
- 编辑器初始化测试
- 元素创建测试
- 撤销重做测试
- AI接口测试
- 导出功能测试

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

MIT License