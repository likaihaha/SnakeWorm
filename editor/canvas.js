/**
 * 画布管理模块
 * 处理画布创建、缩放、平移、网格、参考线等
 */

class CanvasManager {
  constructor(editor) {
    this.editor = editor;
    this.canvas = editor.canvas;
    this.ctx = editor.ctx;
    
    // 缩放和平移状态
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // 网格和参考线
    this.showGrid = false;
    this.showGuides = false;
    this.gridSize = 20;
    this.gridColor = 'rgba(255,255,255,0.1)';
    this.guides = [];
    
    // 选择框
    this.selectionBox = null;
    this.isSelecting = false;
    
    this.init();
  }

  init() {
    this.setupCanvasEvents();
    this.setupZoomControls();
  }

  setupCanvasEvents() {
    // 鼠标滚轮缩放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, this.zoom * zoomFactor));
      
      // 调整平移以保持鼠标位置不变
      const zoomRatio = newZoom / this.zoom;
      this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
      this.panY = mouseY - (mouseY - this.panY) * zoomRatio;
      
      this.zoom = newZoom;
      this.updateTransform();
      this.updateZoomDisplay();
    });
    
    // 鼠标按下 - 开始平移或选择
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // 中键或Alt+左键 - 开始平移
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
      } else if (e.button === 0 && e.shiftKey) {
        // Shift+左键 - 开始框选
        this.startSelection(e);
      }
    });
    
    // 鼠标移动
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.panX += dx;
        this.panY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.updateTransform();
      } else if (this.isSelecting) {
        this.updateSelection(e);
      }
    });
    
    // 鼠标释放
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = 'crosshair';
      } else if (this.isSelecting) {
        this.endSelection();
      }
    });
    
    // 鼠标离开
    this.canvas.addEventListener('mouseleave', () => {
      this.isPanning = false;
      this.isSelecting = false;
      this.canvas.style.cursor = 'crosshair';
    });
  }

  setupZoomControls() {
    // 创建缩放控制UI
    const controls = document.createElement('div');
    controls.className = 'zoom-controls';
    controls.innerHTML = `
      <button class="zoom-btn" id="zoom-in">+</button>
      <span class="zoom-level" id="zoom-level">100%</span>
      <button class="zoom-btn" id="zoom-out">-</button>
      <button class="zoom-btn" id="zoom-fit">适应</button>
      <button class="zoom-btn" id="zoom-reset">重置</button>
    `;
    
    this.canvas.parentElement.appendChild(controls);
    
    // 绑定事件
    document.getElementById('zoom-in').addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => this.zoomOut());
    document.getElementById('zoom-fit').addEventListener('click', () => this.zoomToFit());
    document.getElementById('zoom-reset').addEventListener('click', () => this.resetZoom());
  }

  updateTransform() {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.canvas.style.transformOrigin = '0 0';
  }

  updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  zoomIn() {
    this.zoom = Math.min(10, this.zoom * 1.2);
    this.updateTransform();
    this.updateZoomDisplay();
  }

  zoomOut() {
    this.zoom = Math.max(0.1, this.zoom / 1.2);
    this.updateTransform();
    this.updateZoomDisplay();
  }

  zoomToFit() {
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    const canvasWidth = this.editor.config.canvas.width;
    const canvasHeight = this.editor.config.canvas.height;
    
    this.zoom = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight, 1);
    this.panX = (containerWidth - canvasWidth * this.zoom) / 2;
    this.panY = (containerHeight - canvasHeight * this.zoom) / 2;
    
    this.updateTransform();
    this.updateZoomDisplay();
  }

  resetZoom() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
    this.updateZoomDisplay();
  }

  // 网格功能
  toggleGrid() {
    this.showGrid = !this.showGrid;
    // 不需要rebuild，网格在动画循环中直接绘制
  }

  // 参考线功能
  toggleGuides() {
    this.showGuides = !this.showGuides;
    // 如果开启参考线但没有参考线，添加默认参考线
    if (this.showGuides && this.guides.length === 0) {
      const w = this.editor.canvas.width;
      const h = this.editor.canvas.height;
      this.guides = [
        { type: 'vertical', position: w * 0.25 },
        { type: 'vertical', position: w * 0.5 },
        { type: 'vertical', position: w * 0.75 },
        { type: 'horizontal', position: h * 0.25 },
        { type: 'horizontal', position: h * 0.5 },
        { type: 'horizontal', position: h * 0.75 }
      ];
    }
  }

  setGridSize(size) {
    this.gridSize = size;
    if (this.showGrid) {
      this.editor.rebuild();
    }
  }

  drawGrid(ctx, width, height) {
    if (!this.showGrid) return;
    
    ctx.save();
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    
    // 垂直线
    for (let x = 0; x <= width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // 水平线
    for (let y = 0; y <= height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // 参考线功能
  addGuide(type, position) {
    this.guides.push({ type, position });
    this.editor.rebuild();
  }

  removeGuide(index) {
    this.guides.splice(index, 1);
    this.editor.rebuild();
  }

  drawGuides(ctx, width, height) {
    if (!this.showGuides || this.guides.length === 0) return;
    
    ctx.save();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    this.guides.forEach(guide => {
      ctx.beginPath();
      if (guide.type === 'vertical') {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, height);
      } else {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(width, guide.position);
      }
      ctx.stroke();
    });
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 框选功能
  startSelection(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.selectionBox = {
      startX: (e.clientX - rect.left) * scaleX,
      startY: (e.clientY - rect.top) * scaleY,
      endX: (e.clientX - rect.left) * scaleX,
      endY: (e.clientY - rect.top) * scaleY
    };
    
    this.isSelecting = true;
  }

  updateSelection(e) {
    if (!this.selectionBox) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.selectionBox.endX = (e.clientX - rect.left) * scaleX;
    this.selectionBox.endY = (e.clientY - rect.top) * scaleY;
    
    this.editor.rebuild();
  }

  endSelection() {
    if (!this.selectionBox) return;
    
    // 计算选择框
    const box = {
      x: Math.min(this.selectionBox.startX, this.selectionBox.endX),
      y: Math.min(this.selectionBox.startY, this.selectionBox.endY),
      width: Math.abs(this.selectionBox.endX - this.selectionBox.startX),
      height: Math.abs(this.selectionBox.endY - this.selectionBox.startY)
    };
    
    // 选择框内的元素
    if (this.editor.bg) {
      const hits = this.editor.bg.hitTestBox(box);
      if (hits.length > 0) {
        const elementIds = hits.map(h => h.type);
        this.editor.selectMultipleElements(elementIds);
      }
    }
    
    this.selectionBox = null;
    this.isSelecting = false;
    this.editor.rebuild();
  }

  drawSelectionBox(ctx) {
    if (!this.selectionBox) return;
    
    const box = {
      x: Math.min(this.selectionBox.startX, this.selectionBox.endX),
      y: Math.min(this.selectionBox.startY, this.selectionBox.endY),
      width: Math.abs(this.selectionBox.endX - this.selectionBox.startX),
      height: Math.abs(this.selectionBox.endY - this.selectionBox.startY)
    };
    
    ctx.save();
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    ctx.fillStyle = 'rgba(88, 166, 255, 0.1)';
    ctx.fillRect(box.x, box.y, box.width, box.height);
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 坐标转换
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY
    };
  }

  canvasToScreen(canvasX, canvasY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    
    return {
      x: canvasX * scaleX + rect.left,
      y: canvasY * scaleY + rect.top
    };
  }

  // 对齐工具
  alignElements(direction) {
    const selected = this.editor.getSelectedElements();
    if (selected.length < 2) return;
    
    this.editor.saveToHistory();
    
    const bounds = selected.map(id => this.editor.getElementBounds(id));
    
    switch (direction) {
      case 'left':
        const left = Math.min(...bounds.map(b => b.x));
        selected.forEach((id, i) => {
          this.editor.moveElement(id, left - bounds[i].x, 0);
        });
        break;
      case 'right':
        const right = Math.max(...bounds.map(b => b.x + b.width));
        selected.forEach((id, i) => {
          this.editor.moveElement(id, right - (bounds[i].x + bounds[i].width), 0);
        });
        break;
      case 'top':
        const top = Math.min(...bounds.map(b => b.y));
        selected.forEach((id, i) => {
          this.editor.moveElement(id, 0, top - bounds[i].y);
        });
        break;
      case 'bottom':
        const bottom = Math.max(...bounds.map(b => b.y + b.height));
        selected.forEach((id, i) => {
          this.editor.moveElement(id, 0, bottom - (bounds[i].y + bounds[i].height));
        });
        break;
      case 'centerH':
        const centerX = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
        selected.forEach((id, i) => {
          this.editor.moveElement(id, centerX - (bounds[i].x + bounds[i].width / 2), 0);
        });
        break;
      case 'centerV':
        const centerY = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
        selected.forEach((id, i) => {
          this.editor.moveElement(id, 0, centerY - (bounds[i].y + bounds[i].height / 2));
        });
        break;
    }
    
    this.editor.rebuild();
    this.editor.markDirty();
  }

  // 吸附功能
  snapToGrid(x, y) {
    if (!this.showGrid) return { x, y };
    
    return {
      x: Math.round(x / this.gridSize) * this.gridSize,
      y: Math.round(y / this.gridSize) * this.gridSize
    };
  }

  snapToGuides(x, y, threshold = 5) {
    let snappedX = x;
    let snappedY = y;
    
    this.guides.forEach(guide => {
      if (guide.type === 'vertical') {
        if (Math.abs(x - guide.position) < threshold) {
          snappedX = guide.position;
        }
      } else {
        if (Math.abs(y - guide.position) < threshold) {
          snappedY = guide.position;
        }
      }
    });
    
    return { x: snappedX, y: snappedY };
  }

  // 清理
  destroy() {
    // 移除事件监听器
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
  }
}

export { CanvasManager };