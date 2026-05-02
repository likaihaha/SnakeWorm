/**
 * 元素工厂模块
 * 提供各种内置元素的创建和管理
 */

// 元素类型定义
const ELEMENT_TYPES = {
  // 基础形状
  rectangle: {
    name: '矩形',
    icon: '⬜',
    category: 'basic',
    defaultProperties: {
      x: 0.3,
      y: 0.3,
      width: 0.4,
      height: 0.3,
      fill: 'rgba(88, 166, 255, 0.3)',
      stroke: 'rgba(88, 166, 255, 0.8)',
      strokeWidth: 2,
      cornerRadius: 0,
      rotation: 0,
      blendMode: 'source-over',
      textureScaleX: 1,
      textureScaleY: 1,
      effects: []
    }
  },
  circle: {
    name: '圆形',
    icon: '⭕',
    category: 'basic',
    defaultProperties: {
      x: 0.5,
      y: 0.5,
      radiusX: 0.2,
      radiusY: 0.2,
      fill: 'rgba(77, 232, 214, 0.3)',
      stroke: 'rgba(77, 232, 214, 0.8)',
      strokeWidth: 2,
      rotation: 0,
      blendMode: 'source-over',
      textureScaleX: 1,
      textureScaleY: 1,
      effects: []
    }
  },
  
  // 基础形状
  polygon: {
    name: '多边形',
    icon: '⬟',
    category: 'basic',
    defaultProperties: {
      x: 0.5,
      y: 0.5,
      sides: 5,
      radius: 0.2,
      fill: 'rgba(88, 166, 255, 0.3)',
      stroke: 'rgba(88, 166, 255, 0.8)',
      strokeWidth: 2,
      rotation: 0,
      blendMode: 'source-over',
      textureScaleX: 1,
      textureScaleY: 1,
      effects: []
    }
  },
  polyline: {
    name: '折线',
    icon: '⌇',
    category: 'path',
    defaultProperties: {
      points: [[0.2,0.4],[0.4,0.3],[0.6,0.4],[0.8,0.35]],
      fill: 'none',
      stroke: 'rgba(255, 107, 44, 0.8)',
      strokeWidth: 2,
      closed: false,
      rotation: 0,
      blendMode: 'source-over',
      textureScaleX: 1,
      textureScaleY: 1,
      effects: [],
      startWidth: 1,
      endWidth: 1,
      taperStart: 0,
      taperEnd: 0,
      pathGradient: null
    }
  },
  path: {
    name: '曲线',
    icon: '∿',
    category: 'path',
    defaultProperties: {
      points: [[0.2,0.5],[0.4,0.3],[0.6,0.5],[0.8,0.4]],
      fill: 'none',
      stroke: 'rgba(77, 232, 214, 0.8)',
      strokeWidth: 3,
      closed: false,
      rotation: 0,
      blendMode: 'source-over',
      textureScaleX: 1,
      textureScaleY: 1,
      effects: [],
      startWidth: 1,
      endWidth: 1,
      taperStart: 0,
      taperEnd: 0,
      pathGradient: null
    }
  },
  
  // 自然元素
  mountain: {
    name: '山脉',
    icon: '⛰️',
    category: 'nature',
    defaultProperties: {
      baseY: 0.7,
      roughness: 60,
      opacity: 0.8,
      fill: '#0f222e',
      stroke: 'none',
      blendMode: 'source-over'
    }
  },
  rock: {
    name: '岩石',
    icon: '🪨',
    category: 'nature',
    defaultProperties: {
      x: 0.3,
      y: 0.7,
      width: 0.4,
      height: 0.3,
      roughness: 8,
      fill: '#1a2f3d',
      stroke: 'rgba(30,58,77,0.5)',
      strokeWidth: 1,
      blendMode: 'source-over'
    }
  },
  
  // 动态元素
  particles: {
    name: '粒子系统',
    icon: '✨',
    category: 'dynamic',
    defaultProperties: {
      x: 0.5,
      y: 0.5,
      spread: 0.5,
      count: 30,
      colors: ['#4de8d6', '#6bffe8', '#a8fff0'],
      speed: 0.5,
      fill: 'none',
      stroke: 'none',
      blendMode: 'screen',
      // 发射器属性
      emitterEnabled: true,
      emitterRate: 10,        // 每秒发射粒子数
      emitterLifetime: 2.0,   // 粒子生命周期（秒）
      emitterSize: 0.02,      // 发射器大小
      // 粒子属性
      particleSizeMin: 1,
      particleSizeMax: 3,
      particleAlphaMin: 0.3,
      particleAlphaMax: 0.8,
      // 速度范围
      vxMin: -0.5,
      vxMax: 0.5,
      vyMin: -1.0,
      vyMax: -0.3,
      // 物理属性
      gravity: 0.0,           // 重力加速度
      drag: 0.01,             // 空气阻力
      // 力场
      forceFields: []         // 力场数组
    }
  }
};

// 元素分类
const ELEMENT_CATEGORIES = {
  basic: { name: '基础形状', icon: '🔷' },
  path: { name: '路径形状', icon: '✏️' },
  nature: { name: '自然元素', icon: '🌿' },
  dynamic: { name: '动态元素', icon: '🎬' }
};

class ElementFactory {
  constructor(editor) {
    this.editor = editor;
    this.elementTypes = ELEMENT_TYPES;
    this.categories = ELEMENT_CATEGORIES;
  }

  // 获取所有元素类型
  getElementTypes() {
    return this.elementTypes;
  }

  // 获取元素分类
  getCategories() {
    return this.categories;
  }

  // 按分类获取元素
  getElementsByCategory(category) {
    return Object.entries(this.elementTypes)
      .filter(([_, type]) => type.category === category)
      .map(([key, type]) => ({ id: key, ...type }));
  }

  // 计算视口中心对应的 canvas 相对坐标
  _getCenterPosition() {
    let centerX = 0.5, centerY = 0.5;
    const editor = this.editor;
    if (editor && editor.canvas) {
      const container = editor.canvas.parentElement;
      const canvasRect = editor.canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scaleX = editor.canvas.width / canvasRect.width;
      const scaleY = editor.canvas.height / canvasRect.height;
      const relX = (containerRect.left + container.clientWidth / 2 - canvasRect.left) * scaleX;
      const relY = (containerRect.top + container.clientHeight / 2 - canvasRect.top) * scaleY;
      centerX = Math.max(0, Math.min(1, relX / editor.canvas.width));
      centerY = Math.max(0, Math.min(1, relY / editor.canvas.height));
    }
    return { x: centerX, y: centerY };
  }

  // 创建元素
  createElement(type, customProperties = {}) {
    const elementType = this.elementTypes[type];
    if (!elementType) {
      throw new Error(`未知的元素类型: ${type}`);
    }

    const properties = {
      ...elementType.defaultProperties,
      ...customProperties
    };

    const center = this._getCenterPosition();

    if (type === 'rectangle') {
      properties.x = center.x - (properties.width || 0.4) / 2;
      properties.y = center.y - (properties.height || 0.3) / 2;
    } else if (type === 'circle') {
      properties.x = center.x;
      properties.y = center.y;
    } else if (type === 'polygon') {
      properties.x = center.x;
      properties.y = center.y;
    } else if (type === 'polyline' || type === 'path') {
      if (properties.points && properties.points.length > 0) {
        const pts = properties.points;
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
        const offsetX = center.x - midX;
        const offsetY = center.y - midY;
        properties.points = pts.map(p => [Math.max(0, Math.min(1, p[0] + offsetX)), Math.max(0, Math.min(1, p[1] + offsetY))]);
      }
    } else if (type === 'mountain') {
      // 山脉生成随机点
      properties.points = this._generateMountainPoints(properties.baseY, properties.roughness);
      delete properties.baseY;
      delete properties.roughness;
    } else if (type === 'rock') {
      properties.x = center.x - (properties.width || 0.4) / 2;
      properties.y = center.y - (properties.height || 0.3) / 2;
      properties.points = this._generateRockPoints(properties.x, properties.y, properties.width, properties.height, properties.roughness);
      delete properties.roughness;
    } else if (type === 'particles') {
      properties.x = center.x;
      properties.y = center.y;
    }

    return this.editor.addElement(type, properties);
  }

  // 生成山脉点
  _generateMountainPoints(baseY, roughness) {
    const points = [];
    const steps = 20;
    points.push([0, 1]);
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const y = baseY - Math.random() * (roughness / 100) - (i % 3 === 0 ? 0.05 : 0);
      points.push([x, Math.max(0, Math.min(1, y))]);
    }
    points.push([1, 1]);
    return points;
  }

  // 生成岩石点
  _generateRockPoints(x, y, width, height, roughness) {
    const points = [];
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = 0.5 + (Math.random() - 0.5) * (roughness / 10);
      const px = x + width * (0.5 + Math.cos(angle) * r * 0.5);
      const py = y + height * (0.5 + Math.sin(angle) * r * 0.5);
      points.push([px, py]);
    }
    return points;
  }

  // 创建预设元素
  createPreset(presetName) {
    const presets = {
      // 基础背景
      basicBackground: () => {
        // 设置背景为径向渐变
        if (this.editor.config.background) {
          Object.assign(this.editor.config.background, {
            gradientType: 'radial',
            centerX: 0.5,
            centerY: 0.3,
            radius: 0.8,
            color0: '#164a63',
            color1: '#0d2f42',
            color2: '#061924'
          });
        }
        this.editor.rebuild();
        this.editor.markDirty();
      },
      
      // 深海场景
      deepSeaScene: () => {
        // 背景渐变
        if (this.editor.config.background) {
          Object.assign(this.editor.config.background, {
            gradientType: 'radial',
            centerX: 0.5,
            centerY: 0.3,
            radius: 0.8,
            color0: '#164a63',
            color1: '#0d2f42',
            color2: '#061924'
          });
        }
        
        // 光晕效果（用圆形+滤色混合模式）
        this.createElement('circle', {
          x: 0.65,
          y: 0.35,
          radiusX: 0.3,
          radiusY: 0.3,
          fill: 'rgba(30,107,122,0.35)',
          stroke: 'none',
          blendMode: 'screen'
        });
        
        // 岩石
        this.createElement('rock', {
          x: 0.1,
          y: 0.65,
          width: 0.3,
          height: 0.35,
          fill: '#0f222e'
        });
        
        // 粒子
        this.createElement('particles', {
          x: 0.5,
          y: 0.5,
          spread: 0.8,
          count: 30,
          colors: ['#4de8d6', '#6bffe8', '#a8fff0']
        });
      },
      
      // 森林场景
      forestScene: () => {
        // 天空渐变
        if (this.editor.config.background) {
          Object.assign(this.editor.config.background, {
            gradientType: 'linear',
            angle: 90,
            color0: '#87CEEB',
            color1: '#98D8C8',
            color2: '#2E8B57'
          });
        }
        
        // 远山
        this.createElement('mountain', {
          baseY: 0.6,
          roughness: 80,
          opacity: 0.8,
          fill: '#2E8B57'
        });
        
        // 近山
        this.createElement('mountain', {
          baseY: 0.75,
          roughness: 40,
          opacity: 0.9,
          fill: '#228B22'
        });
        
        // 树木（三角形）
        for (let i = 0; i < 5; i++) {
          this.createElement('polygon', {
            x: 0.15 + i * 0.18,
            y: 0.75,
            sides: 3,
            radius: 0.08,
            fill: '#006400',
            stroke: '#004d00',
            strokeWidth: 1
          });
        }
      },
      
      // 太空场景
      spaceScene: () => {
        // 深空背景
        if (this.editor.config.background) {
          Object.assign(this.editor.config.background, {
            gradientType: 'radial',
            centerX: 0.5,
            centerY: 0.5,
            radius: 1,
            color0: '#0a0a2e',
            color1: '#1a1a4e',
            color2: '#000010'
          });
        }
        
        // 星星（粒子）
        this.createElement('particles', {
          x: 0.5,
          y: 0.5,
          spread: 1,
          count: 100,
          colors: ['#ffffff', '#ffffcc', '#ccccff']
        });
        
        // 星云（圆形+滤色混合模式）
        this.createElement('circle', {
          x: 0.3,
          y: 0.4,
          radiusX: 0.25,
          radiusY: 0.25,
          fill: 'rgba(100,0,200,0.2)',
          stroke: 'none',
          blendMode: 'screen'
        });
        
        this.createElement('circle', {
          x: 0.7,
          y: 0.6,
          radiusX: 0.2,
          radiusY: 0.2,
          fill: 'rgba(0,100,200,0.15)',
          stroke: 'none',
          blendMode: 'screen'
        });
      }
    };
    
    if (presets[presetName]) {
      presets[presetName]();
    }
  }

  // 克隆元素
  cloneElement(elementId) {
    const element = this.editor.getElement(elementId);
    if (!element) return null;
    
    const newElement = {
      ...element,
      id: `shape_${Date.now()}`,
      name: `${element.name || '未命名'} (副本)`
    };
    
    // 偏移位置
    if (newElement.x !== undefined) newElement.x += 0.05;
    if (newElement.y !== undefined) newElement.y += 0.05;
    if (newElement.points) {
      newElement.points = newElement.points.map(p => [p[0] + 0.05, p[1] + 0.05]);
    }
    
    return this.editor.addElement(newElement.type, newElement);
  }

  // 调整元素大小
  resizeElement(elementId, scaleX, scaleY) {
    const element = this.editor.getElement(elementId);
    if (!element) return;
    
    this.editor.saveToHistory();
    
    if (element.width !== undefined) {
      element.width *= scaleX;
    }
    if (element.height !== undefined) {
      element.height *= scaleY;
    }
    if (element.radius !== undefined) {
      element.radius *= Math.min(scaleX, scaleY);
    }
    if (element.radiusX !== undefined) {
      element.radiusX *= scaleX;
    }
    if (element.radiusY !== undefined) {
      element.radiusY *= scaleY;
    }
    if (element.points) {
      element.points = element.points.map(p => [p[0] * scaleX, p[1] * scaleY]);
    }
    
    this.editor.rebuild();
    this.editor.markDirty();
  }

  // 旋转元素
  rotateElement(elementId, angle) {
    const element = this.editor.getElement(elementId);
    if (!element) return;
    
    this.editor.saveToHistory();
    
    if (element.rotation !== undefined) {
      element.rotation = (element.rotation + angle) % 360;
    } else {
      element.rotation = angle;
    }
    
    this.editor.rebuild();
    this.editor.markDirty();
  }

  // 获取元素边界
  getElementBounds(elementId) {
    const element = this.editor.getElement(elementId);
    if (!element) return null;
    
    return this._getBounds(element);
  }

  _getBounds(element) {
    const w = this.editor.canvas.width;
    const h = this.editor.canvas.height;
    
    switch (element.type) {
      case 'rectangle':
        return {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height
        };
      case 'circle':
        if (element.radiusX !== undefined && element.radiusY !== undefined) {
          return {
            x: element.x - element.radiusX,
            y: element.y - element.radiusY,
            width: element.radiusX * 2,
            height: element.radiusY * 2
          };
        }
        return {
          x: element.x - element.radius,
          y: element.y - element.radius,
          width: element.radius * 2,
          height: element.radius * 2
        };
      case 'polygon':
        return {
          x: element.x - element.radius,
          y: element.y - element.radius,
          width: element.radius * 2,
          height: element.radius * 2
        };
      case 'polyline':
      case 'path':
      case 'mountain':
      case 'rock':
        if (element.points && element.points.length > 0) {
          const xs = element.points.map(p => p[0]);
          const ys = element.points.map(p => p[1]);
          return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
          };
        }
        break;
    }
    
    return null;
  }

  // 元素属性验证
  validateElementProperties(type, properties) {
    const elementType = this.elementTypes[type];
    if (!elementType) return false;
    
    // 检查必需属性
    const required = Object.keys(elementType.defaultProperties);
    for (const prop of required) {
      if (properties[prop] === undefined) {
        return false;
      }
    }
    
    return true;
  }

  // 获取元素属性架构
  getElementSchema(type) {
    const elementType = this.elementTypes[type];
    if (!elementType) return null;
    
    return {
      type: type,
      name: elementType.name,
      icon: elementType.icon,
      category: elementType.category,
      properties: elementType.defaultProperties
    };
  }
}

export { ElementFactory, ELEMENT_TYPES, ELEMENT_CATEGORIES };
