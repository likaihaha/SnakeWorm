/**
 * BackgroundEditor 核心模块
 * 提供空白画布起步、配置管理、状态管理、撤销重做等核心功能
 */

import { EditableDynamicBG } from './renderer.js';

// 默认空白画布配置
const EMPTY_CONFIG = {
  canvas: { width: 960, height: 540 },
  background: {
    visible: true,
    gradientType: 'radial',
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.8,
    angle: 90,
    color0: '#1a1a2e',
    color1: '#16213e',
    color2: '#0f3460'
  },
  ambient: { visible: false },
  river: { visible: false },
  leftRock: { visible: false },
  rightRock: { visible: false },
  vents: { visible: false },
  fog: { visible: false },
  vignette: { visible: false },
  jellyfish: { visible: false },
  particles: { visible: false },
  magma: { visible: false },
  glints: { visible: false },
  mountains: { visible: false },
  shapes: [],
  layerOrder: ['background'],
  groups: []
};

// 预设模板
const PRESETS = {
  deepSea: { /* 深海场景配置 */ },
  forest: { /* 森林场景配置 */ },
  desert: { /* 沙漠场景配置 */ },
  space: { /* 太空场景配置 */ }
};

class BackgroundEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.config = JSON.parse(JSON.stringify(EMPTY_CONFIG));
    this.canvas = null;
    this.ctx = null;
    this.bg = null;
    this.selectedElement = null;
    this.selectedElements = []; // 多选元素ID列表
    this.layerOrder = [];
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    this.isDirty = false;
    this.animationId = null;
    this.lastTime = 0;
    this.transformState = null;
    this.controlPointState = null; // 控制点拖拽状态
    this.tangentHandleState = null; // 切线手柄拖拽状态
    this.controlPointEditMode = false; // 控制点编辑模式
    this.selectedControlPointIndex = -1; // 选中的控制点索引
    this.addPointMode = false; // 增加控制点模式
    this.drawMode = null; // null, 'polyline', 'path'
    this.drawPoints = []; // 正在绘制的点
    this.isDrawingPath = false;
    
    this.init();
  }

  init() {
    this.createCanvas();
    this.setupEventListeners();
    this.startAnimation();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'editor-canvas';
    this.canvas.style.cssText = `
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
      cursor: crosshair;
    `;
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    this.canvas.width = this.config.canvas.width;
    this.canvas.height = this.config.canvas.height;
    
    const container = this.canvas.parentElement;
    const maxW = container.clientWidth - 40;
    const maxH = container.clientHeight - 40;
    const scale = Math.min(maxW / this.canvas.width, maxH / this.canvas.height, 1);
    
    this.canvas.style.width = (this.canvas.width * scale) + 'px';
    this.canvas.style.height = (this.canvas.height * scale) + 'px';
    
    this.updateCanvasInfo();
  }

  updateCanvasInfo() {
    const info = document.getElementById('canvas-info');
    if (info) {
      const scale = this.canvas.clientWidth / this.canvas.width;
      info.textContent = `${this.canvas.width}×${this.canvas.height} @ ${(scale*100).toFixed(0)}%`;
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // 画布鼠标事件
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleCanvasRightClick(e);
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  // 设置绘制模式
  setDrawMode(mode) {
    this.drawMode = mode;
    this.drawPoints = [];
    this.isDrawingPath = false;
    if (mode) {
      this.canvas.style.cursor = mode === 'polyline' ? 'crosshair' : 'crosshair';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  _getCanvasMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cm = this.canvasManager;
    const zoom = cm ? cm.zoom : 1;
    const panX = cm ? cm.panX : 0;
    const panY = cm ? cm.panY : 0;
    return {
      x: (e.clientX - rect.left - panX) / zoom * scaleX,
      y: (e.clientY - rect.top - panY) / zoom * scaleY
    };
  }

  handleCanvasMouseDown(e) {
    if (e.button !== 0) return; // 只处理左键
    const { x, y } = this._getCanvasMouse(e);
    const relX = x / this.canvas.width;
    const relY = y / this.canvas.height;

    // 绘制模式处理
    if (this.drawMode === 'polyline') {
      this.drawPoints.push([relX, relY]);
      this.rebuild();
      return;
    }

    if (this.drawMode === 'path') {
      this.isDrawingPath = true;
      if (this.drawPoints.length === 0) {
        this.drawPoints.push([relX, relY]);
      }
      this.rebuild();
      return;
    }

    // 增加控制点模式
    if (this.addPointMode && this.selectedElement && this.selectedElement.startsWith('shape_')) {
      const shapeId = this.selectedElement.replace('shape_', '');
      const shape = this.config.shapes?.find(s => s.id === shapeId);
      if (shape && (shape.type === 'path' || shape.type === 'polyline') && shape.points) {
        this.insertControlPointAtPosition(shape, relX, relY);
        return;
      }
    }

    // 多选变换控制器检查（优先于单元素）
    const multiShapes = (this.selectedElements || [])
      .filter(id => id.startsWith('shape_'))
      .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
      .filter(s => s && s.visible !== false && !s.locked);

    if (multiShapes.length > 1 && this.bg) {
      const groupHandle = this.bg.getGroupTransformHandle(x, y, multiShapes);
      if (groupHandle) {
        const groupBounds = this.bg.getGroupBounds(multiShapes);
        this.transformState = {
          mode: groupHandle,
          isGroup: true,
          startX: x,
          startY: y,
          groupBounds: { ...groupBounds },
          startPropsMap: new Map(multiShapes.map(s => [s.id, { ...s }]))
        };
        this.canvas.style.cursor = this._getCursorForHandle(groupHandle);
        return;
      }
    }

    // 组变换控制器检查（选中组时，基于组中心变换）
    if (this.selectedElement && this.selectedElement.startsWith('group_') && this.bg) {
      const group = (this.config.groups || []).find(g => g.id === this.selectedElement);
      if (group) {
        const children = group.children
          .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
          .filter(s => s && s.visible !== false && !s.locked);
        if (children.length > 0) {
          const groupHandle = this.bg.getGroupTransformHandle(x, y, children);
          if (groupHandle) {
            const groupBounds = this.bg.getGroupBounds(children);
            this.transformState = {
              mode: groupHandle,
              isGroupTransform: true,
              startX: x,
              startY: y,
              groupBounds: { ...groupBounds },
              startPropsMap: new Map(children.map(s => [s.id, { ...s }]))
            };
            this.canvas.style.cursor = this._getCursorForHandle(groupHandle);
            return;
          }
        } else {
          console.warn('[组交互] 组找到但无有效子元素:', this.selectedElement);
        }
      } else {
        console.warn('[组交互] 未找到组:', this.selectedElement, 'groups:', (this.config.groups || []).map(g => g.id));
      }
    }

    // 检查是否点击了选中元素的 Transform 手柄
    if (this.selectedElement && this.selectedElement.startsWith('shape_') && this.bg) {
      const shapeId = this.selectedElement.replace('shape_', '');
      const shape = this.config.shapes?.find(s => s.id === shapeId);
      if (shape && !shape.locked) {
        // 控制点编辑模式：只允许控制点和切线手柄交互
        if (this.controlPointEditMode && (shape.type === 'polyline' || shape.type === 'path') && shape.points) {
          // 先检查切线手柄（path 类型）
          if (shape.type === 'path') {
            const tangentHandle = this.bg.getTangentHandleAt(shape, x, y, this.selectedControlPointIndex);
            if (tangentHandle) {
              this.tangentHandleState = {
                shapeId: shapeId,
                pointIndex: tangentHandle.pointIndex,
                handleType: tangentHandle.type,
                startX: x
              };
              this.canvas.style.cursor = 'move';
              return;
            }
          }
          const cpIdx = this.bg.getControlPointAt(shape, x, y);
          if (cpIdx >= 0) {
            this.selectedControlPointIndex = cpIdx;
            this.controlPointState = {
              shapeId: shapeId,
              pointIndex: cpIdx,
              startX: x,
              startY: y,
              startPoint: [...shape.points[cpIdx]]
            };
            this.canvas.style.cursor = 'move';
            this.markDirty();
            return;
          }
          // 在控制点编辑模式下，点击非控制点区域不做任何操作
          return;
        }
        
        // 普通模式：检查控制点，然后检查变换手柄
        if ((shape.type === 'polyline' || shape.type === 'path') && shape.points) {
          const cpIdx = this.bg.getControlPointAt(shape, x, y);
          if (cpIdx >= 0) {
            this.controlPointState = {
              shapeId: shapeId,
              pointIndex: cpIdx,
              startX: x,
              startY: y,
              startPoint: [...shape.points[cpIdx]]
            };
            this.canvas.style.cursor = 'move';
            return;
          }
        }
        
        const handle = this.bg.getTransformHandle(x, y, shape);
        if (handle) {
          this.transformState = {
            mode: handle,
            startX: x,
            startY: y,
            startProps: { ...shape }
          };
          this.canvas.style.cursor = this._getCursorForHandle(handle);
          return;
        }
      }
    }

    // 执行点击选择
    if (this.bg) {
      const hits = this.bg.hitTest(x, y);
      const unlockedHit = hits.find(h => {
        if (h.type && h.type.startsWith('shape_')) {
          const shapeId = h.type.replace('shape_', '');
          const shape = this.config.shapes?.find(s => s.id === shapeId);
          return shape && !shape.locked;
        }
        return true;
      });

      // 如果点击的元素属于某个组，选中该组
      let targetType = unlockedHit?.type || null;
      if (targetType && targetType.startsWith('shape_')) {
        const shapeId = targetType.replace('shape_', '');
        const parentGroup = (this.config.groups || []).find(g => g.children.includes(targetType));
        if (parentGroup) targetType = parentGroup.id;
      }

      // 如果没命中形状，检查是否点击在某个组的包围框内
      if ((!targetType || targetType === 'background') && this.bg) {
        for (const group of (this.config.groups || [])) {
          const children = group.children
            .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
            .filter(s => s && s.visible !== false && !s.locked);
          if (children.length > 0) {
            const bounds = this.bg.getGroupBounds(children);
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
              targetType = group.id;
              break;
            }
          }
        }
      }

      // Shift+点击：多选/取消选择
      if (e.shiftKey && targetType && targetType.startsWith('shape_')) {
        const idx = this.selectedElements.indexOf(targetType);
        if (idx >= 0) {
          this.selectedElements.splice(idx, 1);
          if (this.selectedElement === targetType) {
            this.selectedElement = this.selectedElements[0] || null;
          }
        } else {
          this.selectedElements.push(targetType);
          this.selectedElement = targetType;
        }
        this.updateUI();
        this.updatePropertyPanel();
      } else if (targetType) {
        this.selectElement(targetType);
      } else {
        this.selectElement(null);
      }
    }
  }

  // 缩放基于控制点的形状（折线、曲线）
  _resizePointsShape(shape, startProps, dx, dy, w, h, direction) {
    if (!startProps.points || startProps.points.length === 0) return;
    const pts = startProps.points;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 0.01;
    const rangeY = maxY - minY || 0.01;
    
    let scaleX = 1, scaleY = 1;
    if (direction.includes('e')) scaleX = 1 + dx / (w * rangeX);
    if (direction.includes('w')) scaleX = 1 - dx / (w * rangeX);
    if (direction.includes('s')) scaleY = 1 + dy / (h * rangeY);
    if (direction.includes('n')) scaleY = 1 - dy / (h * rangeY);
    scaleX = Math.max(0.1, Math.min(3, scaleX));
    scaleY = Math.max(0.1, Math.min(3, scaleY));
    
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    shape.points = pts.map(p => [
      Math.max(0, Math.min(1, cx + (p[0] - cx) * scaleX)),
      Math.max(0, Math.min(1, cy + (p[1] - cy) * scaleY))
    ]);
  }

  // 多选/组变换处理
  _handleGroupTransform(x, y) {
    const ts = this.transformState;
    const dx = x - ts.startX;
    const dy = y - ts.startY;
    const w = this.canvas.width, h = this.canvas.height;
    const gb = ts.groupBounds;
    const map = ts.startPropsMap;
    const fromCenter = ts.isGroupTransform === true; // 组模式：基于组中心

    if (ts.mode === 'move') {
      // 整体平移
      for (const [id, sp] of map) {
        const shape = this.config.shapes.find(s => s.id === id);
        if (!shape) continue;
        if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'particles') {
          shape.x = Math.max(0, Math.min(1, sp.x + dx / w));
          shape.y = Math.max(0, Math.min(1, sp.y + dy / h));
        } else if (shape.points && sp.points) {
          const offX = dx / w, offY = dy / h;
          shape.points = sp.points.map(p => [
            Math.max(0, Math.min(1, p[0] + offX)),
            Math.max(0, Math.min(1, p[1] + offY))
          ]);
        }
      }
    } else if (ts.mode.startsWith('resize-')) {
      const dir = ts.mode.replace('resize-', '');
      const gcx = gb.x + gb.width / 2, gcy = gb.y + gb.height / 2;

      // 缩放因子
      let sx = 1, sy = 1;
      if (dir.includes('e')) sx = (gb.width + dx) / gb.width;
      if (dir.includes('w')) sx = (gb.width - dx) / gb.width;
      if (dir.includes('s')) sy = (gb.height + dy) / gb.height;
      if (dir.includes('n')) sy = (gb.height - dy) / gb.height;
      sx = Math.max(0.1, Math.min(3, sx));
      sy = Math.max(0.1, Math.min(3, sy));

      for (const [id, sp] of map) {
        const shape = this.config.shapes.find(s => s.id === id);
        if (!shape) continue;

        if (fromCenter) {
          // 组模式：所有元素基于组中心缩放
          if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'particles') {
            const spx = sp.x * w, spy = sp.y * h;
            const newPx = gcx + (spx - gcx) * sx;
            const newPy = gcy + (spy - gcy) * sy;
            shape.x = Math.max(0, Math.min(1, newPx / w));
            shape.y = Math.max(0, Math.min(1, newPy / h));
            if (shape.type === 'rectangle') {
              shape.width = Math.max(0.01, sp.width * sx);
              shape.height = Math.max(0.01, sp.height * sy);
            } else if (shape.type === 'circle') {
              if (sp.radiusX !== undefined) shape.radiusX = Math.max(0.01, sp.radiusX * sx);
              if (sp.radiusY !== undefined) shape.radiusY = Math.max(0.01, sp.radiusY * sy);
              if (sp.radius !== undefined) shape.radius = Math.max(0.01, sp.radius * Math.max(sx, sy));
            } else if (shape.type === 'polygon') {
              shape.radius = Math.max(0.01, sp.radius * Math.max(sx, sy));
            } else if (shape.type === 'particles') {
              shape.spread = Math.max(0.01, sp.spread * Math.max(sx, sy));
            }
          } else if (shape.points && sp.points) {
            shape.points = sp.points.map(p => {
              const px = p[0] * w, py = p[1] * h;
              return [
                Math.max(0, Math.min(1, (gcx + (px - gcx) * sx) / w)),
                Math.max(0, Math.min(1, (gcy + (py - gcy) * sy) / h))
              ];
            });
          }
        } else {
          // 多选模式：每个元素基于自身中心缩放
          const bounds = this.bg.getShapeBounds(sp);
          if (bounds.width <= 0 && bounds.height <= 0) continue;
          const bcx = bounds.x + bounds.width / 2;
          const bcy = bounds.y + bounds.height / 2;
          const relX = gb.width > 0 ? (bcx - gcx) / gb.width : 0;
          const relY = gb.height > 0 ? (bcy - gcy) / gb.height : 0;

          if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'particles') {
            const newX = gcx / w + relX * sx * gb.width / w;
            const newY = gcy / h + relY * sy * gb.height / h;
            shape.x = Math.max(0, Math.min(1, newX));
            shape.y = Math.max(0, Math.min(1, newY));
            if (shape.type === 'rectangle') {
              shape.width = Math.max(0.01, sp.width * sx);
              shape.height = Math.max(0.01, sp.height * sy);
            } else if (shape.type === 'circle') {
              if (sp.radiusX !== undefined) shape.radiusX = Math.max(0.01, sp.radiusX * sx);
              if (sp.radiusY !== undefined) shape.radiusY = Math.max(0.01, sp.radiusY * sy);
              if (sp.radius !== undefined) shape.radius = Math.max(0.01, sp.radius * Math.max(sx, sy));
            } else if (shape.type === 'polygon') {
              shape.radius = Math.max(0.01, sp.radius * Math.max(sx, sy));
            } else if (shape.type === 'particles') {
              shape.spread = Math.max(0.01, sp.spread * Math.max(sx, sy));
            }
          } else if (shape.points && sp.points) {
            const pts = sp.points.map(p => ({ x: p[0], y: p[1] }));
            const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            shape.points = sp.points.map(p => [
              Math.max(0, Math.min(1, cx + (p[0] - cx) * sx)),
              Math.max(0, Math.min(1, cy + (p[1] - cy) * sy))
            ]);
          }
        }
      }
    } else if (ts.mode === 'rotate') {
      const gcx = gb.x + gb.width / 2, gcy = gb.y + gb.height / 2;
      const angle = Math.atan2(y - gcy, x - gcx) - Math.atan2(ts.startY - gcy, ts.startX - gcx);
      const deg = angle * 180 / Math.PI;
      const cos = Math.cos(angle), sin = Math.sin(angle);

      for (const [id, sp] of map) {
        const shape = this.config.shapes.find(s => s.id === id);
        if (!shape) continue;

        if (fromCenter) {
          // 组模式：围绕组中心旋转位置 + 自身旋转
          if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'particles') {
            const spx = sp.x * w, spy = sp.y * h;
            const rx = spx - gcx, ry = spy - gcy;
            shape.x = Math.max(0, Math.min(1, (gcx + rx * cos - ry * sin) / w));
            shape.y = Math.max(0, Math.min(1, (gcy + rx * sin + ry * cos) / h));
          } else if (shape.points && sp.points) {
            shape.points = sp.points.map(p => {
              const px = p[0] * w, py = p[1] * h;
              const rx = px - gcx, ry = py - gcy;
              return [
                Math.max(0, Math.min(1, (gcx + rx * cos - ry * sin) / w)),
                Math.max(0, Math.min(1, (gcy + rx * sin + ry * cos) / h))
              ];
            });
          }
          if (sp.rotation !== undefined) {
            shape.rotation = (sp.rotation + deg) % 360;
          }
        } else {
          // 多选模式：每个元素基于自身中心旋转
          if (sp.rotation !== undefined) {
            shape.rotation = (sp.rotation + deg) % 360;
          }
        }
      }
    }

    this.markDirty();
  }

  _getCursorForHandle(handle) {
    const map = {
      'move': 'move',
      'rotate': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z' fill='%2358a6ff'/%3E%3C/svg%3E") 12 12, crosshair`,
      'resize-nw': 'nwse-resize',
      'resize-se': 'nwse-resize',
      'resize-ne': 'nesw-resize',
      'resize-sw': 'nesw-resize',
      'resize-n': 'ns-resize',
      'resize-s': 'ns-resize',
      'resize-e': 'ew-resize',
      'resize-w': 'ew-resize'
    };
    return map[handle] || 'crosshair';
  }

  handleCanvasMouseMove(e) {
    const { x, y } = this._getCanvasMouse(e);
    const relX = x / this.canvas.width;
    const relY = y / this.canvas.height;

    // 路径绘制模式：拖动时添加点
    if (this.drawMode === 'path' && this.isDrawingPath) {
      const lastPt = this.drawPoints[this.drawPoints.length - 1];
      const dist = Math.hypot(relX - lastPt[0], relY - lastPt[1]);
      if (dist > 0.02) { // 最小距离阈值，避免点太密集
        this.drawPoints.push([relX, relY]);
        this.rebuild();
      }
      return;
    }

    // 处理切线手柄拖拽（自由方向）
    if (this.tangentHandleState) {
      const shape = this.config.shapes?.find(s => s.id === this.tangentHandleState.shapeId);
      if (shape && shape.points) {
        const idx = this.tangentHandleState.pointIndex;
        const pt = shape.points[idx];
        const relX = x / this.canvas.width;
        const relY = y / this.canvas.height;

        // 鼠标相对于锚点的偏移
        const dx = relX - pt[0];
        const dy = relY - pt[1];

        // 初始化 tangentHandles
        if (!shape.tangentHandles) {
          shape.tangentHandles = {};
        }

        if (this.tangentHandleState.handleType === 'outgoing') {
          // 出射手柄：直接使用鼠标偏移
          shape.tangentHandles[idx] = { dx, dy };
        } else {
          // 入射手柄：取反方向
          shape.tangentHandles[idx] = { dx: -dx, dy: -dy };
        }

        this.rebuild();
      }
      return;
    }

    // 处理控制点拖拽
    if (this.controlPointState) {
      const shape = this.config.shapes?.find(s => s.id === this.controlPointState.shapeId);
      if (shape && shape.points) {
        const relX = x / this.canvas.width;
        const relY = y / this.canvas.height;
        shape.points[this.controlPointState.pointIndex] = [
          Math.max(0, Math.min(1, relX)),
          Math.max(0, Math.min(1, relY))
        ];
        this.rebuild();
      }
      return;
    }

    // 更新鼠标样式（多选变换控制器）
    if (!this.transformState && this.bg) {
      const gShapes = (this.selectedElements || [])
        .filter(id => id.startsWith('shape_'))
        .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
        .filter(s => s && s.visible !== false && !s.locked);
      if (gShapes.length > 1) {
        const gh = this.bg.getGroupTransformHandle(x, y, gShapes);
        this.canvas.style.cursor = gh ? this._getCursorForHandle(gh) : 'default';
        if (gh) return;
      }
    }

    // 更新鼠标样式（组变换控制器）
    if (!this.transformState && this.selectedElement && this.selectedElement.startsWith('group_') && this.bg) {
      const group = (this.config.groups || []).find(g => g.id === this.selectedElement);
      if (group) {
        const children = group.children
          .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
          .filter(s => s && s.visible !== false && !s.locked);
        if (children.length > 0) {
          const gh = this.bg.getGroupTransformHandle(x, y, children);
          this.canvas.style.cursor = gh ? this._getCursorForHandle(gh) : 'default';
          if (gh) return;
        }
      }
    }

    // 更新鼠标样式
    if (!this.transformState && this.selectedElement && this.selectedElement.startsWith('shape_') && this.bg) {
      const shapeId = this.selectedElement.replace('shape_', '');
      const shape = this.config.shapes?.find(s => s.id === shapeId);
      if (shape && !shape.locked) {
        // 增加控制点模式
        if (this.addPointMode && (shape.type === 'path' || shape.type === 'polyline')) {
          this.canvas.style.cursor = 'crosshair';
          return;
        }
        // 控制点编辑模式
        if (this.controlPointEditMode && (shape.type === 'polyline' || shape.type === 'path') && shape.points) {
          // 检查切线手柄
          if (shape.type === 'path') {
            const th = this.bg.getTangentHandleAt(shape, x, y, this.selectedControlPointIndex);
            if (th) { this.canvas.style.cursor = 'move'; return; }
          }
          const cpIdx = this.bg.getControlPointAt(shape, x, y);
          this.canvas.style.cursor = cpIdx >= 0 ? 'move' : 'crosshair';
          return;
        }
        
        // 普通模式：检查是否悬停在控制点上
        if ((shape.type === 'polyline' || shape.type === 'path') && shape.points) {
          const cpIdx = this.bg.getControlPointAt(shape, x, y);
          if (cpIdx >= 0) {
            this.canvas.style.cursor = 'move';
            return;
          }
        }
        const handle = this.bg.getTransformHandle(x, y, shape);
        this.canvas.style.cursor = handle ? this._getCursorForHandle(handle) : 'crosshair';
      }
    }

    // 处理 Transform 拖拽
    if (!this.transformState) return;

    // 多选/组变换
    if (this.transformState.isGroup || this.transformState.isGroupTransform) {
      this._handleGroupTransform(x, y);
      return;
    }

    const shapeId = this.selectedElement.replace('shape_', '');
    const shape = this.config.shapes?.find(s => s.id === shapeId);
    if (!shape) return;

    const dx = x - this.transformState.startX;
    const dy = y - this.transformState.startY;
    const sp = this.transformState.startProps;
    const w = this.canvas.width, h = this.canvas.height;

    switch (this.transformState.mode) {
      case 'move':
        if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'polygon' || shape.type === 'particles') {
          shape.x = Math.max(0, Math.min(1, sp.x + dx / w));
          shape.y = Math.max(0, Math.min(1, sp.y + dy / h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          // 折线/曲线：偏移所有控制点
          if (sp.points) {
            const offsetX = dx / w;
            const offsetY = dy / h;
            shape.points = sp.points.map(p => [
              Math.max(0, Math.min(1, p[0] + offsetX)),
              Math.max(0, Math.min(1, p[1] + offsetY))
            ]);
          }
        }
        break;

      case 'resize-nw':
        if (shape.type === 'rectangle') {
          const newX = Math.max(0, Math.min(sp.x + sp.width - 0.01, sp.x + dx / w));
          const newY = Math.max(0, Math.min(sp.y + sp.height - 0.01, sp.y + dy / h));
          shape.width = Math.max(0.01, sp.width + sp.x - newX);
          shape.height = Math.max(0.01, sp.height + sp.y - newY);
          shape.x = newX;
          shape.y = newY;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) - dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) - dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius - Math.max(dx, dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'nw');
        }
        break;

      case 'resize-se':
        if (shape.type === 'rectangle') {
          shape.width = Math.max(0.01, sp.width + dx / w);
          shape.height = Math.max(0.01, sp.height + dy / h);
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(dx, dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'se');
        }
        break;

      case 'resize-ne':
        if (shape.type === 'rectangle') {
          const newY = Math.max(0, Math.min(sp.y + sp.height - 0.01, sp.y + dy / h));
          shape.width = Math.max(0.01, sp.width + dx / w);
          shape.height = Math.max(0.01, sp.height + sp.y - newY);
          shape.y = newY;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) - dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(dx, -dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'ne');
        }
        break;

      case 'resize-sw':
        if (shape.type === 'rectangle') {
          const newX = Math.max(0, Math.min(sp.x + sp.width - 0.01, sp.x + dx / w));
          shape.width = Math.max(0.01, sp.width + sp.x - newX);
          shape.height = Math.max(0.01, sp.height + dy / h);
          shape.x = newX;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) - dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(-dx, dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'sw');
        }
        break;

      case 'resize-n':
        if (shape.type === 'rectangle') {
          const newY = Math.max(0, Math.min(sp.y + sp.height - 0.01, sp.y + dy / h));
          shape.height = Math.max(0.01, sp.height + sp.y - newY);
          shape.y = newY;
        } else if (shape.type === 'circle') {
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) - dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius - dy / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'n');
        }
        break;

      case 'resize-s':
        if (shape.type === 'rectangle') {
          shape.height = Math.max(0.01, sp.height + dy / h);
        } else if (shape.type === 'circle') {
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + dy / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 's');
        }
        break;

      case 'resize-e':
        if (shape.type === 'rectangle') {
          shape.width = Math.max(0.01, sp.width + dx / w);
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + dx / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'e');
        }
        break;

      case 'resize-w':
        if (shape.type === 'rectangle') {
          const newX = Math.max(0, Math.min(sp.x + sp.width - 0.01, sp.x + dx / w));
          shape.width = Math.max(0.01, sp.width + sp.x - newX);
          shape.x = newX;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) - dx / w);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius - dx / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'w');
        }
        break;

      case 'resize-se':
        if (shape.type === 'rectangle') {
          shape.width = Math.max(0.01, sp.width + dx / w);
          shape.height = Math.max(0.01, sp.height + dy / h);
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(dx, dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'se');
        }
        break;

      case 'resize-ne':
        if (shape.type === 'rectangle') {
          const newY = Math.max(0, Math.min(sp.y + sp.height - 0.01, sp.y + dy / h));
          shape.width = Math.max(0.01, sp.width + dx / w);
          shape.height = Math.max(0.01, sp.height + sp.y - newY);
          shape.y = newY;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) - dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(dx, -dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'ne');
        }
        break;

      case 'resize-sw':
        if (shape.type === 'rectangle') {
          const newX = Math.max(0, Math.min(sp.x + sp.width - 0.01, sp.x + dx / w));
          shape.width = Math.max(0.01, sp.width + sp.x - newX);
          shape.height = Math.max(0.01, sp.height + dy / h);
          shape.x = newX;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) - dx / w);
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + Math.max(-dx, dy) / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'sw');
        }
        break;

      case 'resize-n':
        if (shape.type === 'rectangle') {
          const newY = Math.max(0, Math.min(sp.y + sp.height - 0.01, sp.y + dy / h));
          shape.height = Math.max(0.01, sp.height + sp.y - newY);
          shape.y = newY;
        } else if (shape.type === 'circle') {
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) - dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius - dy / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'n');
        }
        break;

      case 'resize-s':
        if (shape.type === 'rectangle') {
          shape.height = Math.max(0.01, sp.height + dy / h);
        } else if (shape.type === 'circle') {
          shape.radiusY = Math.max(0.01, (sp.radiusY || sp.radius) + dy / h);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + dy / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 's');
        }
        break;

      case 'resize-e':
        if (shape.type === 'rectangle') {
          shape.width = Math.max(0.01, sp.width + dx / w);
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) + dx / w);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius + dx / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'e');
        }
        break;

      case 'resize-w':
        if (shape.type === 'rectangle') {
          const newX = Math.max(0, Math.min(sp.x + sp.width - 0.01, sp.x + dx / w));
          shape.width = Math.max(0.01, sp.width + sp.x - newX);
          shape.x = newX;
        } else if (shape.type === 'circle') {
          shape.radiusX = Math.max(0.01, (sp.radiusX || sp.radius) - dx / w);
        } else if (shape.type === 'polygon') {
          shape.radius = Math.max(0.01, sp.radius - dx / Math.min(w, h));
        } else if (shape.type === 'polyline' || shape.type === 'path') {
          this._resizePointsShape(shape, sp, dx, dy, w, h, 'w');
        }
        break;

      case 'rotate':
        // 简单旋转：更新 rotation 属性（如果有）
        if (shape.rotation !== undefined) {
          const bounds = this.bg.getShapeBounds(shape);
          const cx = bounds.x + bounds.width / 2;
          const cy = bounds.y + bounds.height / 2;
          const startAngle = Math.atan2(this.transformState.startY - cy, this.transformState.startX - cx);
          const currentAngle = Math.atan2(y - cy, x - cx);
          shape.rotation = (sp.rotation || 0) + (currentAngle - startAngle) * 180 / Math.PI;
        }
        break;
    }

    this.rebuild();
  }

  handleCanvasMouseUp(e) {
    if (this.drawMode === 'path') {
      this.isDrawingPath = false;
      return;
    }
    if (this.controlPointState) {
      this.controlPointState = null;
      this.canvas.style.cursor = this.controlPointEditMode ? 'crosshair' : 'default';
      this.markDirty();
    }
    if (this.tangentHandleState) {
      this.tangentHandleState = null;
      this.canvas.style.cursor = this.controlPointEditMode ? 'crosshair' : 'default';
      this.markDirty();
    }
    if (this.transformState) {
      this.transformState = null;
      this.canvas.style.cursor = this.controlPointEditMode ? 'crosshair' : 'default';
      this.markDirty();
    }
  }

  handleCanvasRightClick(e) {
    // 右键完成绘制
    if (this.drawMode === 'polyline' || this.drawMode === 'path') {
      if (this.drawPoints.length >= 2) {
        const type = this.drawMode;
        let points = [...this.drawPoints];
        let tangentHandles = null;

        // 曲线模式：Schneider 拟合，生成稀疏锚点 + 切线手柄
        if (type === 'path' && points.length > 2) {
          const fitted = this._fitCurveSchneider(points, 0.008);
          points = fitted.points;
          tangentHandles = fitted.tangentHandles;
        }

        // 检查起点和终点是否靠近（10像素内）
        const startPt = points[0];
        const endPt = points[points.length - 1];
        const dx = (startPt[0] - endPt[0]) * this.canvas.width;
        const dy = (startPt[1] - endPt[1]) * this.canvas.height;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isNearby = dist <= 10;

        const createShape = (closed) => {
          const properties = {
            points: points,
            tangentHandles: tangentHandles,
            fill: closed ? 'rgba(88, 166, 255, 0.2)' : 'none',
            stroke: 'rgba(255, 255, 255, 0.8)',
            strokeWidth: 2,
            closed: closed,
            rotation: 0,
            blendMode: 'source-over'
          };
          this.addElement(type, properties);
          this.setDrawMode(null);
          this.rebuild();
        };

        // 检查是否设置了"不再询问"
        const skipCloseAsk = localStorage.getItem('editor_skipCloseAsk') === 'true';

        if (isNearby) {
          if (skipCloseAsk) {
            // 不再询问，自动闭合
            createShape(true);
          } else {
            // 显示闭合询问对话框
            this._showCloseDialog(createShape);
          }
        } else {
          createShape(false);
        }
      } else {
        this.setDrawMode(null);
        this.rebuild();
      }
    }
  }

  _showCloseDialog(callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.6); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #161b22; border: 1px solid #30363d; border-radius: 8px;
      padding: 20px; min-width: 280px; color: #c9d1d9;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #58a6ff;';
    title.textContent = '闭合图形';

    const msg = document.createElement('div');
    msg.style.cssText = 'font-size: 12px; margin-bottom: 16px; color: #8b949e;';
    msg.textContent = '起点和终点很接近，是否闭合图形？';

    const checkboxWrap = document.createElement('label');
    checkboxWrap.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 11px; color: #8b949e; margin-bottom: 16px; cursor: pointer;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', () => {
      localStorage.setItem('editor_skipCloseAsk', checkbox.checked ? 'true' : 'false');
    });
    checkboxWrap.appendChild(checkbox);
    checkboxWrap.appendChild(document.createTextNode('不再询问，自动闭合'));

    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

    const btnYes = document.createElement('button');
    btnYes.className = 'btn primary';
    btnYes.textContent = '闭合';
    btnYes.addEventListener('click', () => { overlay.remove(); callback(true); });

    const btnNo = document.createElement('button');
    btnNo.className = 'btn';
    btnNo.textContent = '不闭合';
    btnNo.addEventListener('click', () => { overlay.remove(); callback(false); });

    btnWrap.appendChild(btnNo);
    btnWrap.appendChild(btnYes);
    dialog.appendChild(title);
    dialog.appendChild(msg);
    dialog.appendChild(checkboxWrap);
    dialog.appendChild(btnWrap);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); callback(false); } });
    document.body.appendChild(overlay);
  }

  // Ramer-Douglas-Peucker 点简化算法
  _simplifyPoints(points, epsilon) {
    if (points.length <= 2) return points;

    // 找到距离首尾连线最远的点
    let maxDist = 0;
    let maxIdx = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this._pointLineDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    // 如果最大距离大于阈值，递归简化
    if (maxDist > epsilon) {
      const left = this._simplifyPoints(points.slice(0, maxIdx + 1), epsilon);
      const right = this._simplifyPoints(points.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }

    // 否则只保留首尾
    return [start, end];
  }

  /**
   * Schneider 曲线拟合：将手绘点转为稀疏锚点 + 切线手柄
   * @param {Array} rawPoints - 手绘采样点 [[x,y], ...]
   * @param {number} maxError - 最大允许拟合误差（归一化坐标）
   * @returns {{ points: Array, tangentHandles: Object }}
   */
  _fitCurveSchneider(rawPoints, maxError = 0.008) {
    if (rawPoints.length < 2) return { points: rawPoints, tangentHandles: {} };
    if (rawPoints.length === 2) return { points: rawPoints, tangentHandles: {} };

    // Step 1: RDP 找锚点
    const anchors = this._simplifyPoints(rawPoints, maxError);
    if (anchors.length < 2) return { points: rawPoints.slice(0, 2), tangentHandles: {} };

    // Step 2: 为每段拟合 Bezier，计算切线手柄
    const tangentHandles = {};
    const w = this.canvas ? this.canvas.width : 960;
    const h = this.canvas ? this.canvas.height : 540;

    // 建立锚点到原始点的索引映射
    const anchorIndices = anchors.map(a => {
      let minDist = Infinity, minIdx = 0;
      for (let i = 0; i < rawPoints.length; i++) {
        const d = Math.hypot(rawPoints[i][0] - a[0], rawPoints[i][1] - a[1]);
        if (d < minDist) { minDist = d; minIdx = i; }
      }
      return minIdx;
    });

    // 确保索引单调递增
    for (let i = 1; i < anchorIndices.length; i++) {
      if (anchorIndices[i] <= anchorIndices[i - 1]) {
        anchorIndices[i] = Math.min(anchorIndices[i - 1] + 1, rawPoints.length - 1);
      }
    }

    for (let seg = 0; seg < anchors.length - 1; seg++) {
      const startIdx = anchorIndices[seg];
      const endIdx = anchorIndices[seg + 1];
      const segPoints = rawPoints.slice(startIdx, endIdx + 1);

      if (segPoints.length < 2) continue;

      // 最小二乘拟合这段 Bezier
      const fit = this._fitBezierSegment(segPoints);
      if (!fit) continue;

      // 将控制点转为切线手柄（相对于锚点的偏移）
      const P0 = segPoints[0];
      const P3 = segPoints[segPoints.length - 1];

      // 起点的出射手柄 = P1 - P0
      if (!tangentHandles[seg]) {
        tangentHandles[seg] = {
          dx: fit.p1[0] - P0[0],
          dy: fit.p1[1] - P0[1]
        };
      }

      // 终点的入射手柄 = P3 - P2（取反方向存储）
      if (!tangentHandles[seg + 1]) {
        tangentHandles[seg + 1] = {
          dx: P3[0] - fit.p2[0],
          dy: P3[1] - fit.p2[1]
        };
      }
    }

    return { points: anchors, tangentHandles };
  }

  /**
   * 最小二乘法拟合单段 Bezier 曲线（Schneider 算法核心）
   * @param {Array} points - 该段的采样点
   * @returns {{ p1: [x,y], p2: [x,y] }} 控制点
   */
  _fitBezierSegment(points) {
    const n = points.length;
    if (n < 2) return null;

    const P0 = points[0];
    const P3 = points[n - 1];

    // 弦长参数化
    const params = new Array(n);
    params[0] = 0;
    let totalLen = 0;
    for (let i = 1; i < n; i++) {
      totalLen += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      params[i] = totalLen;
    }
    if (totalLen > 0) {
      for (let i = 0; i < n; i++) params[i] /= totalLen;
    }

    // 最小二乘求解 P1, P2
    // B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)t^2*P2 + t^3*P3
    // 令 A_i = 3(1-t)^2*t, B_i = 3(1-t)t^2
    // C_i = Q_i - (1-t)^3*P0 - t^3*P3
    // 求解 A_i*P1 + B_i*P2 = C_i

    let A2 = 0, AB = 0, B2 = 0;
    let ACx = 0, ACy = 0, BCx = 0, BCy = 0;

    for (let i = 0; i < n; i++) {
      const t = params[i];
      const mt = 1 - t;
      const Ai = 3 * mt * mt * t;
      const Bi = 3 * mt * t * t;
      const Cix = points[i][0] - mt * mt * mt * P0[0] - t * t * t * P3[0];
      const Ciy = points[i][1] - mt * mt * mt * P0[1] - t * t * t * P3[1];

      A2 += Ai * Ai;
      AB += Ai * Bi;
      B2 += Bi * Bi;
      ACx += Ai * Cix;
      ACy += Ai * Ciy;
      BCx += Bi * Cix;
      BCy += Bi * Ciy;
    }

    const det = A2 * B2 - AB * AB;
    if (Math.abs(det) < 1e-10) return null;

    return {
      p1: [(B2 * ACx - AB * BCx) / det, (B2 * ACy - AB * BCy) / det],
      p2: [(A2 * BCx - AB * ACx) / det, (A2 * BCy - AB * ACy) / det]
    };
  }

  // 点到直线的距离
  _pointLineDistance(point, lineStart, lineEnd) {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
    
    let t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    
    const projX = lineStart[0] + t * dx;
    const projY = lineStart[1] + t * dy;
    return Math.hypot(point[0] - projX, point[1] - projY);
  }

  handleKeyDown(e) {
    // 处理键盘快捷键
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 's':
          e.preventDefault();
          this.saveConfig();
          break;
        case 'c':
          if (this.selectedElement) {
            this.copyElement(this.selectedElement);
          }
          break;
        case 'v':
          this.pasteElement();
          break;
      }
    } else {
      switch(e.key) {
        case 'Delete':
        case 'Backspace':
          // 优先删除选中的控制点
          if (this.controlPointEditMode && this.selectedControlPointIndex >= 0) {
            this.deleteSelectedControlPoint();
          } else if (this.selectedElement) {
            this.deleteElement(this.selectedElement);
          }
          break;
        case 'Escape':
          if (this.addPointMode) {
            this.addPointMode = false;
            this.canvas.style.cursor = 'crosshair';
          } else if (this.drawMode) {
            this.setDrawMode(null);
          } else {
            this.selectElement(null);
          }
          break;
      }
    }
  }

  // 配置管理
  loadConfig(config) {
    this.saveToHistory();
    this.config = { ...EMPTY_CONFIG, ...config };
    this.rebuild();
    this.markDirty();
  }

  resetConfig() {
    if (confirm('确定重置为空白画布？未保存的修改将丢失。')) {
      this.saveToHistory();
      this.config = JSON.parse(JSON.stringify(EMPTY_CONFIG));
      this.rebuild();
      this.markDirty();
    }
  }

  saveConfig() {
    const blob = new Blob([JSON.stringify(this.config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'background-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
    this.markClean();
  }

  loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target.result);
          this.loadConfig(config);
        } catch (err) {
          alert('JSON 解析失败: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // 本地存储
  saveToStorage() {
    try {
      localStorage.setItem('bg-editor-config', JSON.stringify(this.config));
      this.markClean();
    } catch (e) {
      console.warn('保存到本地存储失败:', e);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('bg-editor-config');
      if (saved) {
        this.config = JSON.parse(saved);
        this.rebuild();
      }
    } catch (e) {
      console.warn('从本地存储加载失败:', e);
    }
  }

  // 撤销重做
  saveToHistory() {
    // 移除当前位置之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // 添加当前状态
    this.history.push(JSON.parse(JSON.stringify(this.config)));
    
    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.config = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.rebuild();
      this.markDirty();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.config = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.rebuild();
      this.markDirty();
    }
  }

  // 获取选中元素列表
  getSelectedElements() {
    return this.selectedElements || [];
  }

  // 元素管理
  selectElement(elementId) {
    this.selectedElement = elementId;
    this.selectedElements = elementId ? [elementId] : [];
    this.controlPointEditMode = false; // 切换元素时退出控制点编辑模式
    this.selectedControlPointIndex = -1; // 重置选中的控制点
    this.updateUI();
    this.updatePropertyPanel();
  }

  // 切换控制点编辑模式
  toggleControlPointEditMode() {
    if (!this.selectedElement || !this.selectedElement.startsWith('shape_')) return;

    const shapeId = this.selectedElement.replace('shape_', '');
    const shape = this.config.shapes?.find(s => s.id === shapeId);

    // 只有 polyline 和 path 类型支持控制点编辑
    if (!shape || (shape.type !== 'polyline' && shape.type !== 'path')) return;

    this.controlPointEditMode = !this.controlPointEditMode;
    if (!this.controlPointEditMode) {
      this.selectedControlPointIndex = -1; // 退出时重置选中
      this.addPointMode = false;
    }
    this.canvas.style.cursor = this.controlPointEditMode ? 'crosshair' : 'default';
    this.markDirty();
  }

  // 进入增加控制点模式
  enterAddPointMode() {
    if (!this.selectedElement || !this.selectedElement.startsWith('shape_')) return;
    const shapeId = this.selectedElement.replace('shape_', '');
    const shape = this.config.shapes?.find(s => s.id === shapeId);
    if (!shape || (shape.type !== 'path' && shape.type !== 'polyline')) return;

    this.controlPointEditMode = true;
    this.addPointMode = true;
    this.selectedControlPointIndex = -1;
    this.canvas.style.cursor = 'crosshair';
    this.markDirty();
  }

  // 在路径上最近位置插入控制点
  insertControlPointAtPosition(shape, clickX, clickY) {
    if (!shape.points || shape.points.length < 2) return;

    const pts = shape.points;
    let bestSegIdx = 0;
    let bestT = 0;
    let bestDist = Infinity;

    // 找到离点击位置最近的曲线段
    for (let seg = 0; seg < pts.length - 1; seg++) {
      // 采样曲线段找最近点
      for (let t = 0; t <= 1; t += 0.05) {
        const mt = 1 - t;
        // 简化：用线性插值近似（实际曲线是 Bezier）
        const x = pts[seg][0] * mt + pts[seg + 1][0] * t;
        const y = pts[seg][1] * mt + pts[seg + 1][1] * t;
        const dist = Math.hypot(clickX - x, clickY - y);
        if (dist < bestDist) {
          bestDist = dist;
          bestSegIdx = seg;
          bestT = t;
        }
      }
    }

    // 在最近位置插入新点
    const newPoint = [
      pts[bestSegIdx][0] * (1 - bestT) + pts[bestSegIdx + 1][0] * bestT,
      pts[bestSegIdx][1] * (1 - bestT) + pts[bestSegIdx + 1][1] * bestT
    ];

    this.saveToHistory();
    shape.points.splice(bestSegIdx + 1, 0, newPoint);

    // 更新 tangentHandles 索引
    if (shape.tangentHandles) {
      const newHandles = {};
      for (const [key, val] of Object.entries(shape.tangentHandles)) {
        const idx = parseInt(key);
        if (idx > bestSegIdx) {
          newHandles[idx + 1] = val;
        } else {
          newHandles[idx] = val;
        }
      }
      shape.tangentHandles = newHandles;
    }

    // 更新 tangentWeights 索引
    if (shape.tangentWeights) {
      shape.tangentWeights.splice(bestSegIdx + 1, 0, 0.5);
    }

    this.selectedControlPointIndex = bestSegIdx + 1;
    this.addPointMode = false;
    this.rebuild();
  }

  // 删除选中的控制点
  deleteSelectedControlPoint() {
    if (!this.selectedElement || !this.selectedElement.startsWith('shape_')) return;
    const shapeId = this.selectedElement.replace('shape_', '');
    const shape = this.config.shapes?.find(s => s.id === shapeId);
    if (!shape || !shape.points || this.selectedControlPointIndex < 0) return;

    // 至少保留 2 个点
    if (shape.points.length <= 2) return;

    const idx = this.selectedControlPointIndex;
    this.saveToHistory();
    shape.points.splice(idx, 1);

    // 更新 tangentHandles 索引
    if (shape.tangentHandles) {
      const newHandles = {};
      for (const [key, val] of Object.entries(shape.tangentHandles)) {
        const i = parseInt(key);
        if (i < idx) newHandles[i] = val;
        else if (i > idx) newHandles[i - 1] = val;
        // i === idx: 删除，不保留
      }
      shape.tangentHandles = newHandles;
    }

    // 更新 tangentWeights 索引
    if (shape.tangentWeights) {
      shape.tangentWeights.splice(idx, 1);
    }

    // 调整选中索引
    this.selectedControlPointIndex = Math.min(idx, shape.points.length - 1);
    this.rebuild();
  }

  // 多选元素（框选）
  selectMultipleElements(elementIds) {
    if (!elementIds || elementIds.length === 0) return;
    this.selectedElements = [...elementIds];
    // 单选第一个，用于属性面板显示
    this.selectedElement = elementIds[0];
    this.updateUI();
    this.updatePropertyPanel();
  }

  // 获取单个元素
  getElement(elementId) {
    if (!elementId) return null;
    if (elementId === 'background') {
      return { type: 'background', ...this.config.background };
    }
    if (elementId.startsWith('shape_')) {
      const shapeId = elementId.replace('shape_', '');
      return this.config.shapes?.find(s => s.id === shapeId) || null;
    }
    return null;
  }

  // 获取元素边界（委托给 elementFactory）
  getElementBounds(elementId) {
    if (this.elementFactory) {
      return this.elementFactory.getElementBounds(elementId);
    }
    return null;
  }

  // 移动元素（相对偏移）
  moveElement(elementId, dx, dy) {
    if (!elementId || !elementId.startsWith('shape_')) return;
    const shapeId = elementId.replace('shape_', '');
    const shape = this.config.shapes?.find(s => s.id === shapeId);
    if (!shape) return;
    
    if (shape.x !== undefined) shape.x += dx;
    if (shape.y !== undefined) shape.y += dy;
    if (shape.points) {
      shape.points = shape.points.map(p => [p[0] + dx, p[1] + dy]);
    }
  }

  // 全选元素
  selectAllElements() {
    const allIds = (this.config.layerOrder || []).filter(id => id !== 'background');
    if (allIds.length > 0) {
      this.selectMultipleElements(allIds);
    }
  }

  // 按索引选择图层
  selectLayerByIndex(index) {
    const order = this.config.layerOrder || [];
    if (index >= 0 && index < order.length) {
      this.selectElement(order[index]);
    }
  }

  // 切换工具（简易版）
  setTool(tool) {
    this.currentTool = tool;
    // 绘制模式
    if (tool === 'polyline' || tool === 'path') {
      this.setDrawMode(tool);
    } else {
      this.setDrawMode(null);
    }
    // 更新鼠标样式
    const cursorMap = {
      select: 'default',
      hand: 'grab',
      zoom: 'zoom-in',
      rectangle: 'crosshair',
      circle: 'crosshair',
      line: 'crosshair',
      pen: 'crosshair'
    };
    this.canvas.style.cursor = cursorMap[tool] || 'default';
  }

  // 切换预览模式
  togglePreview() {
    // 简易实现：隐藏/显示UI面板
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
    }
  }
  
  // 重命名选中的元素
  renameSelectedElement() {
    if (!this.selectedElement || !this.selectedElement.startsWith('shape_')) return;
    
    const shapeId = this.selectedElement.replace('shape_', '');
    const shape = this.config.shapes.find(s => s.id === shapeId);
    if (!shape || shape.locked) return;
    
    // 触发UI层的重命名
    if (this.triggerRename) {
      this.triggerRename(shape);
    }
  }

  addElement(type, properties = {}) {
    this.saveToHistory();

    const rawId = properties.id ? String(properties.id).replace('shape_', '') : `${Date.now()}`;
    const elementId = `shape_${rawId}`;
    const element = {
      id: rawId,
      type: type,
      visible: true,
      locked: false,
      opacity: 1,
      ...properties,
      id: rawId
    };
    
    if (!this.config.shapes) {
      this.config.shapes = [];
    }
    
    this.config.shapes.push(element);
    
    if (!this.config.layerOrder) {
      this.config.layerOrder = [];
    }
    this.config.layerOrder.push(elementId);
    
    // 保存变更后的状态到历史记录
    this.saveToHistory();
    
    this.rebuild();
    this.selectElement(elementId);
    this.markDirty();
    
    return elementId;
  }

  deleteElement(elementId) {
    if (elementId.startsWith('shape_')) {
      const shapeId = elementId.replace('shape_', '');
      const shape = this.config.shapes.find(s => s.id === shapeId);
      // 防止删除锁定的元素
      if (shape && shape.locked) return;
      
      this.saveToHistory();
      this.config.shapes = this.config.shapes.filter(s => s.id !== shapeId);
      this.config.layerOrder = this.config.layerOrder.filter(id => id !== elementId);
      
      // 保存变更后的状态到历史记录
      this.saveToHistory();
      
      if (this.selectedElement === elementId) {
        this.selectElement(null);
      }
      
      this.rebuild();
      this.markDirty();
    }
  }

  copyElement(elementId) {
    if (!elementId) return;
    
    let element;
    if (elementId.startsWith('shape_')) {
      const shapeId = elementId.replace('shape_', '');
      element = this.config.shapes.find(s => s.id === shapeId);
    }
    
    if (element) {
      this.clipboard = JSON.parse(JSON.stringify(element));
    }
  }

  pasteElement() {
    if (!this.clipboard) return;
    
    const newElement = {
      ...this.clipboard,
      id: `shape_${Date.now()}`,
      name: `${this.clipboard.name || '未命名'} (副本)`
    };
    
    this.addElement(newElement.type, newElement);
  }

  // 图层上移（快捷键用）
  moveElementForward(elementId) {
    this.moveElementUp(elementId || this.selectedElement);
  }

  // 图层下移（快捷键用）
  moveElementBackward(elementId) {
    this.moveElementDown(elementId || this.selectedElement);
  }

  // 图层上移
  moveElementUp(elementId) {
    if (!elementId) return;
    const order = this.config.layerOrder;
    const index = order.indexOf(elementId);
    if (index === -1 || index >= order.length - 1) return;
    
    this.saveToHistory();
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    this.rebuild();
    this.markDirty();
  }

  // 图层下移
  moveElementDown(elementId) {
    if (!elementId) return;
    const order = this.config.layerOrder;
    const index = order.indexOf(elementId);
    if (index <= 0) return;
    
    this.saveToHistory();
    [order[index], order[index - 1]] = [order[index - 1], order[index]];
    this.rebuild();
    this.markDirty();
  }

  // 图层移到顶层
  moveElementToFront(elementId) {
    if (!elementId) elementId = this.selectedElement;
    if (!elementId) return;
    const order = this.config.layerOrder;
    const index = order.indexOf(elementId);
    if (index === -1 || index === order.length - 1) return;
    
    this.saveToHistory();
    order.splice(index, 1);
    order.push(elementId);
    this.rebuild();
    this.markDirty();
  }

  // 图层移到底层
  moveElementToBack(elementId) {
    if (!elementId) elementId = this.selectedElement;
    if (!elementId) return;
    const order = this.config.layerOrder;
    const index = order.indexOf(elementId);
    if (index <= 0) return;
    
    this.saveToHistory();
    order.splice(index, 1);
    order.unshift(elementId);
    this.rebuild();
    this.markDirty();
  }

  // 打组：将选中的多个元素组合为一个组
  groupElements(elementIds) {
    if (!elementIds || elementIds.length < 2) return;
    
    this.saveToHistory();
    
    if (!this.config.groups) this.config.groups = [];
    
    const groupId = `group_${Date.now()}`;
    const group = {
      id: groupId,
      name: `组 ${this.config.groups.length + 1}`,
      children: [...elementIds]
    };
    
    this.config.groups.push(group);
    
    // 在 layerOrder 中替换：移除子元素，插入组
    const order = this.config.layerOrder;
    const firstIndex = Math.min(...elementIds.map(id => order.indexOf(id)).filter(i => i !== -1));
    
    // 移除子元素
    this.config.layerOrder = order.filter(id => !elementIds.includes(id));
    
    // 在第一个子元素位置插入组
    this.config.layerOrder.splice(firstIndex, 0, groupId);
    
    this.rebuild();
    this.selectElement(groupId);
    this.markDirty();
    
    return groupId;
  }

  // 取消打组
  ungroupElements(groupId) {
    if (!groupId || !groupId.startsWith('group_')) return;
    
    const group = (this.config.groups || []).find(g => g.id === groupId);
    if (!group) return;
    
    this.saveToHistory();
    
    const order = this.config.layerOrder;
    const groupIndex = order.indexOf(groupId);
    if (groupIndex === -1) return;
    
    // 移除组，插入子元素
    order.splice(groupIndex, 1, ...group.children);
    
    // 从 groups 中移除
    this.config.groups = this.config.groups.filter(g => g.id !== groupId);
    
    this.rebuild();
    this.selectElement(group.children[0]);
    this.markDirty();
  }

  // 获取组内的元素
  getGroupChildren(groupId) {
    const group = (this.config.groups || []).find(g => g.id === groupId);
    if (!group) return [];
    return group.children.map(childId => {
      if (childId.startsWith('shape_')) {
        const shapeId = childId.replace('shape_', '');
        return this.config.shapes.find(s => s.id === shapeId);
      }
      return null;
    }).filter(Boolean);
  }

  // 重建渲染
  rebuild() {
    this.resizeCanvas();
    
    if (this.bg) {
      this.bg = null;
    }
    
    // 创建新的渲染器
    this.bg = new EditableDynamicBG(this.config);
    
    this.updateUI();
  }

  // 动画循环
  startAnimation() {
    const animate = (ts) => {
      if (!this.lastTime) this.lastTime = ts;
      const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
      this.lastTime = ts;

      if (this.bg) {
        this.bg.update(dt);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.bg.draw(this.ctx);

        // 绘制网格和参考线
        if (this.canvasManager) {
          this.canvasManager.drawGrid(this.ctx, this.canvas.width, this.canvas.height);
          this.canvasManager.drawGuides(this.ctx, this.canvas.width, this.canvas.height);
        }

        // 绘制选中元素的 Transform 控制器
        const multiShapes = (this.selectedElements || [])
          .filter(id => id.startsWith('shape_'))
          .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
          .filter(s => s && s.visible !== false && !s.locked);

        if (multiShapes.length > 1) {
          this.bg.drawGroupTransform(this.ctx, multiShapes);
        } else if (this.selectedElement && this.selectedElement.startsWith('group_')) {
          const allGroups = this.config.groups || [];
          const group = allGroups.find(g => g.id === this.selectedElement);
          if (group) {
            const children = group.children
              .map(id => this.config.shapes?.find(s => s.id === id.replace('shape_', '')))
              .filter(s => s && s.visible !== false && !s.locked);
            if (children.length > 0) {
              this.bg.drawGroupTransform(this.ctx, children);
            }
          }
          // 调试：画布左上角显示组信息
          this.ctx.save();
          this.ctx.fillStyle = '#ff0';
          this.ctx.font = '14px monospace';
          this.ctx.fillText(`selected:${this.selectedElement} groups:${allGroups.length} g:${group?.id||'none'} ch:${group?.children?.length||0}`, 10, 20);
          this.ctx.restore();
        } else if (this.selectedElement && this.selectedElement.startsWith('shape_')) {
          const shapeId = this.selectedElement.replace('shape_', '');
          const shape = this.config.shapes?.find(s => s.id === shapeId);
          if (shape && shape.visible !== false && !shape.locked) {
            // 设置选中的控制点索引
            shape._selectedPointIndex = this.controlPointEditMode ? this.selectedControlPointIndex : -1;
            // 控制点编辑模式：只绘制控制点，不绘制变换框
            if (this.controlPointEditMode && (shape.type === 'polyline' || shape.type === 'path')) {
              this.bg.drawControlPoints(this.ctx, shape, this.selectedControlPointIndex);
            } else {
              this.bg.drawTransform(this.ctx, shape);
            }
          }
        }

        // 绘制框选区域
        if (this.canvasManager && this.canvasManager.selectionBox) {
          this.canvasManager.drawSelectionBox(this.ctx);
        }

        // 绘制过程中的临时路径
        if (this.drawMode && this.drawPoints.length >= 1) {
          this.ctx.save();
          this.ctx.strokeStyle = '#58a6ff';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          const pts = this.drawPoints;
          this.ctx.moveTo(pts[0][0] * this.canvas.width, pts[0][1] * this.canvas.height);
          for (let i = 1; i < pts.length; i++) {
            this.ctx.lineTo(pts[i][0] * this.canvas.width, pts[i][1] * this.canvas.height);
          }
          this.ctx.stroke();
          // 绘制点标记
          this.ctx.fillStyle = '#58a6ff';
          pts.forEach(pt => {
            this.ctx.beginPath();
            this.ctx.arc(pt[0] * this.canvas.width, pt[1] * this.canvas.height, 3, 0, Math.PI * 2);
            this.ctx.fill();
          });
          this.ctx.restore();
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // 状态管理
  markDirty() {
    this.isDirty = true;
    this.updateTitle();
    // 属性变化时重新渲染静态画布，确保实时更新
    if (this.bg && this.bg.refreshStatic) {
      this.bg.refreshStatic();
    }
  }

  markClean() {
    this.isDirty = false;
    this.updateTitle();
  }

  updateTitle() {
    document.title = `DynamicBG 编辑器 ${this.isDirty ? '(未保存)' : ''}`;
  }

  // UI 更新（需要子类或外部实现）
  updateUI() {
    // 由外部实现
  }

  updatePropertyPanel() {
    // 由外部实现
  }

  // 设置画布尺寸
  setCanvasSize(width, height) {
    this.saveToHistory();
    this.config.canvas.width = width;
    this.config.canvas.height = height;
    this.rebuild();
    this.markDirty();
  }

  // 导出功能
  exportPNG() {
    if (!this.bg) return;
    
    // 创建临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.config.canvas.width;
    tempCanvas.height = this.config.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 绘制当前帧
    this.bg.draw(tempCtx);
    
    // 下载
    const link = document.createElement('a');
    link.download = 'background.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  exportJSON() {
    return JSON.parse(JSON.stringify(this.config));
  }

  exportCode() {
    return `const CONFIG = ${JSON.stringify(this.config, null, 2)};\n\n// 将 CONFIG 传入 EditableDynamicBG 构造函数即可`;
  }

  // AI 接口
  getAIInterface() {
    return {
      // 获取当前配置
      getConfig: () => this.exportJSON(),
      
      // 设置配置
      setConfig: (config) => this.loadConfig(config),
      
      // 添加元素
      addElement: (type, props) => this.addElement(type, props),
      
      // 删除元素
      deleteElement: (id) => this.deleteElement(id),
      
      // 修改元素属性
      updateElement: (id, props) => {
        this.saveToHistory();
        if (id.startsWith('shape_')) {
          const shapeId = id.replace('shape_', '');
          const shape = this.config.shapes.find(s => s.id === shapeId);
          if (shape) {
            Object.assign(shape, props);
            this.rebuild();
            this.markDirty();
          }
        }
      },
      
      // 获取所有元素
      getElements: () => {
        return this.config.shapes || [];
      },
      
      // 获取选中元素
      getSelectedElement: () => this.selectedElement,
      
      // 选择元素
      selectElement: (id) => this.selectElement(id),
      
      // 撤销/重做
      undo: () => this.undo(),
      redo: () => this.redo(),
      
      // 导出
      exportPNG: () => this.exportPNG(),
      exportJSON: () => this.exportJSON(),
      
      // 画布尺寸
      setCanvasSize: (width, height) => {
        this.saveToHistory();
        this.config.canvas.width = width;
        this.config.canvas.height = height;
        this.rebuild();
        this.markDirty();
      },
      
      // 预设模板
      loadPreset: (presetName) => {
        if (PRESETS[presetName]) {
          this.loadConfig(PRESETS[presetName]);
        }
      }
    };
  }
}

// 导出
export { BackgroundEditor, EMPTY_CONFIG, PRESETS };