/**
 * 渲染器模块
 * 提供 EditableDynamicBG 类，用于在编辑器画布上渲染动态背景
 */

// ===================== 渐变色辅助 =====================
function isGradient(v) { return v && typeof v === 'object' && v.mode && v.stops; }

function resolveColor(ctx, value, w, h, bounds) {
  if (typeof value === 'string') return value;
  if (!isGradient(value) || value.stops.length < 2) return '#000';
  if (value.mode === 'linear') {
    const angle = (value.angle || 0) * Math.PI / 180;
    let cx, cy, len;
    if (bounds) {
      cx = (bounds.x0 + bounds.x1) / 2; cy = (bounds.y0 + bounds.y1) / 2;
      len = Math.hypot(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0) / 2;
    } else { cx = w / 2; cy = h / 2; len = Math.max(w, h) / 2; }
    const grad = ctx.createLinearGradient(
      cx - Math.cos(angle) * len, cy - Math.sin(angle) * len,
      cx + Math.cos(angle) * len, cy + Math.sin(angle) * len
    );
    value.stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color));
    return grad;
  }
  if (value.mode === 'radial') {
    const cx = w * (value.cx != null ? value.cx : 0.5);
    const cy = h * (value.cy != null ? value.cy : 0.5);
    const r = Math.max(w, h) * (value.r != null ? value.r : 0.5);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    value.stops.forEach(s => grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color));
    return grad;
  }
  return '#000';
}

function primaryColor(value) {
  if (typeof value === 'string') return value;
  if (isGradient(value) && value.stops.length > 0) return value.stops[0].color;
  return '#000';
}

// ===================== 贴图缓存 =====================
const _textureCache = {};
function _loadTexture(url) {
  if (_textureCache[url]) return _textureCache[url];
  const img = new Image();
  img.src = url;
  _textureCache[url] = img;
  return img;
}

// ===================== 默认配置 =====================
const DEFAULT_ELEMENT_CONFIGS = {
  jellyfish: {
    x: 0.5, y: 0.5, radiusX: 40, radiusY: 30,
    bobSpeed: 1.5, bobAmp: 15, breatheSpeed: 2, breatheAmp: 0.08,
    glowColor: '#4de8d6', glowBlur: 20,
    bodyGrad: ['rgba(77,232,214,0.6)', 'rgba(107,255,232,0.3)', 'rgba(168,255,240,0.1)'],
    tentacleCount: 6, tentacleSpacing: 12,
    tentacleLenMin: 40, tentacleLenMax: 70,
    tentacleWaveFreqMin: 1.5, tentacleWaveFreqMax: 3,
    tentacleWaveAmpMin: 8, tentacleWaveAmpMax: 15
  },
  particles: {
    count: 30,
    vxMin: -0.3, vxMax: 0.3, vyMin: -0.5, vyMax: -0.1,
    rMin: 1, rMax: 3, alphaMin: 0.3, alphaMax: 0.8,
    blinkFreqMin: 1, blinkFreqMax: 3,
    colors: ['#4de8d6', '#a8fff0', '#6bffe8']
  },
  magma: {
    countPerVent: 15, ventIntensity: [0.8, 0.6],
    vxMin: -0.5, vxMax: 0.5, vyMin: -2, vyMax: -0.5,
    decayMin: 0.005, decayMax: 0.015,
    rMin: 2, rMax: 4, maxRMin: 6, maxRMax: 12
  },
  glints: {
    count: 20, rMin: 1, rMax: 3,
    freqMin: 1, freqMax: 3, alphaMin: 0.3, alphaMax: 0.7
  },
  mountains: {
    farBaseY: 0.7, farRoughness: 60, farOpacity: 0.4,
    midBaseY: 0.8, midRoughness: 40, midOpacity: 0.3,
    steps: 20, swaySpeed: 0.3, swayAmp: 5,
    farPoints: [], midPoints: []
  },
  river: {
    path: [[0, 0.6], [0.3, 0.5], [0.5, 0.55], [0.7, 0.45], [1, 0.5]],
    width0: 8, width1: 4,
    stroke0: '#4de8d6', stroke1: '#a8fff0',
    shadowColor: '#4de8d6', shadowBlur: 15
  }
};

// ===================== EditableDynamicBG 类 =====================
class EditableDynamicBG {
  constructor(cfg) {
    this.cfg = cfg;
    this.w = cfg.canvas.width;
    this.h = cfg.canvas.height;
    this.t = 0;

    // 确保 shapes 和 layerOrder 存在
    if (!this.cfg.shapes) this.cfg.shapes = [];
    if (!this.cfg.layerOrder) this.cfg.layerOrder = ['background'];

    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.w;
    this.staticCanvas.height = this.h;
    this.sCtx = this.staticCanvas.getContext('2d');
    this._renderStatic();

    // 初始化动态元素（如果可见）
    this.jellyfish = this.cfg.jellyfish?.visible ? this._createJellyfish() : null;
    this.particles = this.cfg.particles?.visible ? this._createParticles(this.cfg.particles.count || DEFAULT_ELEMENT_CONFIGS.particles.count) : [];
    this.magmaParticles = this.cfg.magma?.visible ? this._createMagmaParticles() : [];
    this.riverGlints = (this.cfg.glints?.visible && this.cfg.river?.visible) ? this._createRiverGlints() : [];
    this.mountains = this.cfg.mountains?.visible ? this._createMountains() : null;
  }

  _getDefaults(key) {
    return DEFAULT_ELEMENT_CONFIGS[key] || {};
  }

  _val(cfg, key, defaultVal) {
    return cfg[key] !== undefined ? cfg[key] : defaultVal;
  }

  _createJellyfish() {
    const defaults = this._getDefaults('jellyfish');
    const c = { ...defaults, ...this.cfg.jellyfish };
    return {
      x: this.w * c.x, y: this.h * c.y, baseY: this.h * c.y,
      radiusX: c.radiusX, radiusY: c.radiusY,
      phase: 0,
      tentacles: Array.from({ length: c.tentacleCount }, (_, i) => ({
        offsetX: (i - (c.tentacleCount - 1) / 2) * c.tentacleSpacing,
        length: c.tentacleLenMin + Math.random() * (c.tentacleLenMax - c.tentacleLenMin),
        waveFreq: c.tentacleWaveFreqMin + Math.random() * (c.tentacleWaveFreqMax - c.tentacleWaveFreqMin),
        waveAmp: c.tentacleWaveAmpMin + Math.random() * (c.tentacleWaveAmpMax - c.tentacleWaveAmpMin),
        phase: Math.random() * Math.PI * 2,
      })),
      config: c
    };
  }

  _createParticles(count) {
    const defaults = this._getDefaults('particles');
    const c = { ...defaults, ...this.cfg.particles };
    return Array.from({ length: count }, () => ({
      x: Math.random() * this.w, y: Math.random() * this.h,
      vx: c.vxMin + Math.random() * (c.vxMax - c.vxMin),
      vy: c.vyMin + Math.random() * (c.vyMax - c.vyMin),
      r: c.rMin + Math.random() * (c.rMax - c.rMin),
      baseAlpha: c.alphaMin + Math.random() * (c.alphaMax - c.alphaMin),
      blinkFreq: c.blinkFreqMin + Math.random() * (c.blinkFreqMax - c.blinkFreqMin),
      blinkPhase: Math.random() * Math.PI * 2,
      color: c.colors[Math.floor(Math.random() * c.colors.length)],
    }));
  }

  _createMagmaParticles() {
    const defaults = this._getDefaults('magma');
    const c = { ...defaults, ...this.cfg.magma };
    const vents = [
      { x: this.w * 0.113, y: this.h * 0.535, intensity: c.ventIntensity[0] },
      { x: this.w * 0.193, y: this.h * 0.57, intensity: c.ventIntensity[1] },
    ];
    const particles = [];
    vents.forEach((vent) => {
      for (let i = 0; i < c.countPerVent; i++) {
        particles.push({
          ventX: vent.x, ventY: vent.y,
          x: vent.x + (Math.random() - 0.5) * 10,
          y: vent.y + Math.random() * 5,
          vx: c.vxMin + Math.random() * (c.vxMax - c.vxMin),
          vy: c.vyMin + Math.random() * (c.vyMax - c.vyMin),
          life: Math.random(),
          decay: c.decayMin + Math.random() * (c.decayMax - c.decayMin),
          r: c.rMin + Math.random() * (c.rMax - c.rMin),
          maxR: c.maxRMin + Math.random() * (c.maxRMax - c.maxRMin),
          intensity: vent.intensity,
        });
      }
    });
    return particles;
  }

  _createRiverGlints() {
    const path = this._getRiverPath();
    const defaults = this._getDefaults('glints');
    const c = { ...defaults, ...this.cfg.glints };
    const glints = [];
    for (let i = 0; i < c.count; i++) {
      const t = Math.random();
      glints.push({
        t, offsetY: (Math.random() - 0.5) * 20,
        r: c.rMin + Math.random() * (c.rMax - c.rMin),
        phase: Math.random() * Math.PI * 2,
        freq: c.freqMin + Math.random() * (c.freqMax - c.freqMin),
        alpha: c.alphaMin + Math.random() * (c.alphaMax - c.alphaMin),
      });
    }
    return glints;
  }

  _getRiverPath() {
    const defaults = this._getDefaults('river');
    const path = this.cfg.river?.path || defaults.path;
    return path.map(p => ({ x: p[0] * this.w, y: p[1] * this.h }));
  }

  _getPointOnPath(path, t) {
    const idx = t * (path.length - 1);
    const i = Math.floor(idx); const f = idx - i;
    if (i >= path.length - 1) return path[path.length - 1];
    const a = path[i], b = path[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  _createMountains() {
    const defaults = this._getDefaults('mountains');
    const c = { ...defaults, ...this.cfg.mountains };
    if (!c.farPoints || c.farPoints.length === 0) {
      c.farPoints = this._generateMountainLineRel(c.farBaseY, c.farRoughness);
    }
    if (!c.midPoints || c.midPoints.length === 0) {
      c.midPoints = this._generateMountainLineRel(c.midBaseY, c.midRoughness);
    }
    return {
      far: { points: c.farPoints.map(p => ({ x: p[0] * this.w, y: p[1] * this.h })), opacity: c.farOpacity },
      mid: { points: c.midPoints.map(p => ({ x: p[0] * this.w, y: p[1] * this.h })), opacity: c.midOpacity },
      config: c
    };
  }

  _generateMountainLineRel(baseYRel, roughness) {
    const h = this.h;
    const baseY = h * baseYRel;
    const defaults = this._getDefaults('mountains');
    const steps = this.cfg.mountains?.steps || defaults.steps;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const xRel = i / steps;
      const yPx = baseY - Math.random() * roughness - (i % 3 === 0 ? 30 : 0);
      points.push([xRel, Math.max(0, Math.min(1, yPx / h))]);
    }
    return points;
  }

  // ===================== 静态渲染 =====================
  // 公开方法：重新渲染静态画布（属性变化时调用）
  refreshStatic() {
    this._renderStatic();
  }

  _renderStatic() {
    const ctx = this.sCtx; const w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    const order = this.cfg.layerOrder || [];
    const orderSet = new Set(order);
    for (const id of order) {
      this._renderStaticLayer(ctx, id);
    }
    // 渲染不在 layerOrder 中的 shapes
    const shapes = this.cfg.shapes || [];
    for (const s of shapes) {
      const sid = 'shape_' + s.id;
      if (!orderSet.has(sid) && s.visible !== false) {
        // 这些形状不需要data属性
        const noDataNeeded = ['rectangle', 'circle', 'polygon', 'polyline', 'path', 'mountain', 'rock', 'particles'].includes(s.type);
        if (noDataNeeded || (s.data && s.data.length > 0)) {
          this._drawSingleShape(ctx, s, false);
        }
      }
    }
  }

  _renderStaticLayer(ctx, id) {
    const w = this.w, h = this.h; const c = this.cfg;
    switch (id) {
      case 'background':
        if (c.background?.visible) {
          const bgCfg = c.background;
          const gt = bgCfg.gradientType || 'radial';
          let grad;
          if (gt === 'solid') {
            ctx.fillStyle = primaryColor(bgCfg.color0 || '#1a1a2e');
          } else if (gt === 'linear') {
            const angle = (bgCfg.angle || 90) * Math.PI / 180;
            const len = Math.max(w, h) / 2;
            const cx = w / 2, cy = h / 2;
            grad = ctx.createLinearGradient(
              cx - Math.cos(angle) * len, cy - Math.sin(angle) * len,
              cx + Math.cos(angle) * len, cy + Math.sin(angle) * len
            );
            grad.addColorStop(0, primaryColor(bgCfg.color0 || '#1a1a2e'));
            grad.addColorStop(0.5, primaryColor(bgCfg.color1 || '#16213e'));
            grad.addColorStop(1, primaryColor(bgCfg.color2 || '#0f3460'));
            ctx.fillStyle = grad;
          } else {
            // radial
            grad = ctx.createRadialGradient(
              w * (bgCfg.centerX || 0.5), h * (bgCfg.centerY || 0.5), 0,
              w * (bgCfg.centerX || 0.5), h * (bgCfg.centerY || 0.5), h * (bgCfg.radius || 0.8)
            );
            grad.addColorStop(0, primaryColor(bgCfg.color0 || '#1a1a2e'));
            grad.addColorStop(0.4, primaryColor(bgCfg.color1 || '#16213e'));
            grad.addColorStop(1, primaryColor(bgCfg.color2 || '#0f3460'));
            ctx.fillStyle = grad;
          }
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        }
        break;
      case 'ambient':
        if (c.ambient?.visible) {
          const amb = ctx.createRadialGradient(
            w * (c.ambient.centerX || 0.5), h * (c.ambient.centerY || 0.5), 0,
            w * (c.ambient.centerX || 0.5), h * (c.ambient.centerY || 0.5), h * (c.ambient.radius || 0.5)
          );
          amb.addColorStop(0, resolveColor(ctx, c.ambient.color0 || '#4de8d6', w, h));
          amb.addColorStop(1, resolveColor(ctx, c.ambient.color1 || 'transparent', w, h));
          ctx.fillStyle = amb; ctx.fillRect(0, 0, w, h);
        }
        break;
      case 'river':
        if (c.river?.visible) {
          const defaults = this._getDefaults('river');
          ctx.save();
          ctx.shadowColor = primaryColor(c.river.shadowColor || defaults.shadowColor);
          ctx.shadowBlur = c.river.shadowBlur || defaults.shadowBlur;
          const riverPath = this._getRiverPath();
          ctx.beginPath();
          ctx.moveTo(riverPath[0].x, riverPath[0].y);
          for (let i = 1; i < riverPath.length; i++) {
            const cp1x = riverPath[i - 1].x + (riverPath[i].x - riverPath[i - 1].x) * 0.5;
            const cp1y = riverPath[i - 1].y;
            const cp2x = riverPath[i].x - (riverPath[i].x - riverPath[i - 1].x) * 0.5;
            const cp2y = riverPath[i].y;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, riverPath[i].x, riverPath[i].y);
          }
          ctx.strokeStyle = resolveColor(ctx, c.river.stroke0 || defaults.stroke0, w, h);
          ctx.lineWidth = c.river.width0 || defaults.width0; ctx.stroke();
          ctx.strokeStyle = resolveColor(ctx, c.river.stroke1 || defaults.stroke1, w, h);
          ctx.lineWidth = c.river.width1 || defaults.width1; ctx.stroke();
          ctx.restore();
        }
        break;
      case 'fog':
        if (c.fog?.visible) {
          const fog = ctx.createLinearGradient(0, h, 0, 0);
          fog.addColorStop(0, resolveColor(ctx, c.fog.color0 || '#0a0a1a', w, h));
          fog.addColorStop(0.4, resolveColor(ctx, c.fog.color1 || '#0a0a1a80', w, h));
          fog.addColorStop(1, resolveColor(ctx, c.fog.color2 || 'transparent', w, h));
          ctx.fillStyle = fog; ctx.fillRect(0, 0, w, h);
        }
        break;
      case 'vignette':
        if (c.vignette?.visible) {
          const vig = ctx.createLinearGradient(0, 0, 0, h * 0.3);
          vig.addColorStop(0, resolveColor(ctx, c.vignette.color0 || 'rgba(0,0,0,0.6)', w, h));
          vig.addColorStop(1, resolveColor(ctx, c.vignette.color1 || 'transparent', w, h));
          ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
        }
        break;
      default:
        if (id.startsWith('shape_')) {
          const shapeId = id.split('_')[1];
          const shape = (c.shapes || []).find(s => String(s.id) === shapeId);
          if (shape && shape.visible !== false) {
            // 这些形状不需要data属性
            const noDataNeeded = ['rectangle', 'circle', 'polygon', 'polyline', 'path', 'mountain', 'rock', 'particles'].includes(shape.type);
            if (noDataNeeded || (shape.data && shape.data.length > 0)) {
              this._drawSingleShape(ctx, shape, false);
            }
          }
        } else if (id.startsWith('group_')) {
          const group = (c.groups || []).find(g => g.id === id);
          if (group) {
            ctx.save();
            const gx = (group.x || 0.5) * this.w;
            const gy = (group.y || 0.5) * this.h;
            const gr = (group.rotation || 0) * Math.PI / 180;
            const gs = group.scale || 1;
            // 绕组中心旋转+缩放（不影响组中心的世界位置）
            ctx.translate(gx, gy);
            if (gr) ctx.rotate(gr);
            if (gs !== 1) ctx.scale(gs, gs);
            ctx.translate(-gx, -gy);
            for (const childId of group.children) {
              this._renderStaticLayer(ctx, childId);
            }
            ctx.restore();
          }
        }
        break;
    }
  }

  _drawSingleShape(ctx, s, isHighlight = false) {
    const w = this.w, h = this.h;
    ctx.save();
    if (s.opacity !== undefined && s.opacity < 1) {
      ctx.globalAlpha = s.opacity;
    }
    // 应用混合模式
    if (s.blendMode && s.blendMode !== 'source-over') {
      ctx.globalCompositeOperation = s.blendMode;
    }
    
    // 应用特效（发光、阴影等）
    if (s.effects && s.effects.length > 0) {
      this._applyEffects(ctx, s.effects);
    }
    
    if (isHighlight) {
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
    } else {
      // 计算形状边界用于渐变定位
      const shapeBounds = this.getShapeBounds(s);
      const gradBounds = { x0: shapeBounds.x, y0: shapeBounds.y, x1: shapeBounds.x + shapeBounds.width, y1: shapeBounds.y + shapeBounds.height };

      // 填充优先级：贴图 > 渐变 > 纯色
      if (s.texture && s.texture !== '') {
        const img = _loadTexture(s.texture);
        if (img.complete && img.naturalWidth > 0) {
          const pattern = ctx.createPattern(img, 'repeat');
          if (pattern) {
            // 贴图跟随图形位置，默认适配图形大小
            const scaleX = s.textureScaleX || 1;
            const scaleY = s.textureScaleY || 1;
            const bounds = this.getShapeBounds(s);
            // 计算默认缩放：使贴图适配图形大小
            const defaultScaleX = bounds.width / img.naturalWidth;
            const defaultScaleY = bounds.height / img.naturalHeight;
            const finalScaleX = defaultScaleX * scaleX;
            const finalScaleY = defaultScaleY * scaleY;
            // 使用矩阵变换将贴图定位到图形位置
            const matrix = new DOMMatrix()
              .translate(bounds.x, bounds.y)
              .scale(finalScaleX, finalScaleY);
            pattern.setTransform(matrix);
            ctx.fillStyle = pattern;
          }
        } else if (s.fillGradient && isGradient(s.fillGradient)) {
          ctx.fillStyle = resolveColor(ctx, s.fillGradient, w, h, gradBounds);
        } else if (s.fill && s.fill !== 'none') {
          ctx.fillStyle = resolveColor(ctx, s.fill, w, h);
        }
      } else if (s.fillGradient && isGradient(s.fillGradient)) {
        ctx.fillStyle = resolveColor(ctx, s.fillGradient, w, h, gradBounds);
      } else if (s.fill && s.fill !== 'none') {
        ctx.fillStyle = resolveColor(ctx, s.fill, w, h);
      }
      if (s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) {
        ctx.strokeStyle = resolveColor(ctx, s.stroke, w, h);
        ctx.lineWidth = s.strokeWidth || 1;
      }
    }

    // 应用旋转变换
    if (s.rotation && s.rotation !== 0) {
      const bounds = this.getShapeBounds(s);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(s.rotation * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }

    if (s.type === 'rectangle') {
      this._drawRectangle(ctx, s, w, h, isHighlight);
    } else if (s.type === 'circle') {
      this._drawCircle(ctx, s, w, h, isHighlight);
    } else if (s.type === 'polygon') {
      this._drawPolygon(ctx, s, w, h, isHighlight);
    } else if (s.type === 'polyline') {
      this._drawPolyline(ctx, s, w, h, isHighlight);
    } else if (s.type === 'path') {
      this._drawCurve(ctx, s, w, h, isHighlight);
    } else if (s.type === 'mountain' || s.type === 'rock') {
      this._drawPointsShape(ctx, s, w, h, isHighlight);
    } else if (s.type === 'particles') {
      this._drawParticlesShape(ctx, s, w, h);
    } else if (s.data && s.data.length > 0) {
      // 兼容旧data格式
      ctx.beginPath();
      s.data.forEach((pt, i) => {
        const cx = pt[0] * w, cy = pt[1] * h;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      if (s.closed && s.type !== 'polyline') ctx.closePath();
      if (!isHighlight && s.fill && s.fill !== 'none' && (s.closed || s.type === 'polygon')) ctx.fill();
      if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
      else if (isHighlight) ctx.stroke();
    }
    ctx.restore();
  }
  
  /**
   * 应用特效（发光、阴影等）
   */
  _applyEffects(ctx, effects) {
    effects.forEach(effect => {
      switch (effect.type) {
        case 'glow':
          // 发光效果：使用shadowBlur模拟
          ctx.shadowColor = effect.color || 'rgba(88, 166, 255, 0.8)';
          ctx.shadowBlur = effect.blur || 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          break;
        case 'shadow':
          // 阴影效果
          ctx.shadowColor = effect.color || 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = effect.blur || 10;
          ctx.shadowOffsetX = effect.offsetX || 5;
          ctx.shadowOffsetY = effect.offsetY || 5;
          break;
        case 'outerGlow':
          // 外发光：多次绘制模拟更强效果
          ctx.shadowColor = effect.color || 'rgba(88, 166, 255, 0.6)';
          ctx.shadowBlur = effect.blur || 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          break;
        case 'innerShadow':
          // 内阴影（简化实现）
          ctx.shadowColor = effect.color || 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = effect.blur || 8;
          ctx.shadowOffsetX = -(effect.offsetX || 3);
          ctx.shadowOffsetY = -(effect.offsetY || 3);
          break;
      }
    });
  }

  _drawRectangle(ctx, s, w, h, isHighlight) {
    const x = s.x * w, y = s.y * h, sw = s.width * w, sh = s.height * h;
    ctx.beginPath();
    if (s.cornerRadius > 0) {
      ctx.roundRect(x, y, sw, sh, s.cornerRadius);
    } else {
      ctx.rect(x, y, sw, sh);
    }
    if (!isHighlight && s.fill && s.fill !== 'none') ctx.fill();
    if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
    else if (isHighlight) ctx.stroke();
  }

  _drawCircle(ctx, s, w, h, isHighlight) {
    const cx = s.x * w, cy = s.y * h;
    // 使用统一缩放使圆形不变形为椭圆
    const scale = Math.min(w, h);
    const rx = (s.radiusX !== undefined ? s.radiusX : s.radius) * scale;
    const ry = (s.radiusY !== undefined ? s.radiusY : s.radius) * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (!isHighlight && s.fill && s.fill !== 'none') ctx.fill();
    if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
    else if (isHighlight) ctx.stroke();
  }

  _drawPolygon(ctx, s, w, h, isHighlight) {
    // 兼容旧格式：如果定义了points但没有sides/x/y/radius
    if (s.points && s.points.length >= 3 && !s.sides) {
      ctx.beginPath();
      s.points.forEach((pt, i) => {
        const px = pt[0] * w, py = pt[1] * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      if (!isHighlight && s.fill && s.fill !== 'none') ctx.fill();
      if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
      else if (isHighlight) ctx.stroke();
      return;
    }
    const cx = (s.x || 0.5) * w, cy = (s.y || 0.5) * h;
    const r = (s.radius || 0.2) * Math.min(w, h);
    const sides = s.sides || 6;
    // 旋转已在 _drawSingleShape 中通过 ctx.rotate 应用，此处不再重复
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (!isHighlight && s.fill && s.fill !== 'none') ctx.fill();
    if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
    else if (isHighlight) ctx.stroke();
  }

  _drawPolyline(ctx, s, w, h, isHighlight) {
    if (!s.points || s.points.length < 2) return;

    const hasWidthNodes = s.widthNodes && s.widthNodes.length >= 2 && s.widthNodes.some(n => n.width < 0.999);
    const hasPathGradient = s.pathGradient && s.pathGradient.stops && s.pathGradient.stops.length >= 2;

    if (hasWidthNodes && !isHighlight) {
      // 绘制可变宽度折线
      this._drawVariableWidthPolyline(ctx, s, w, h);
    } else if (hasPathGradient && !isHighlight) {
      // 绘制路径渐变的折线
      this._drawPathGradientPolyline(ctx, s, w, h);
    } else {
      ctx.beginPath();
      s.points.forEach((pt, i) => {
        const px = pt[0] * w, py = pt[1] * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      if (s.closed) ctx.closePath();
      if (!isHighlight && s.fill && s.fill !== 'none' && s.closed) ctx.fill();
      if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
      else if (isHighlight) ctx.stroke();
    }
  }

  /**
   * 绘制可变宽度折线（使用 widthNodes）
   */
  _drawVariableWidthPolyline(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const pts = s.points;
    const baseWidth = s.strokeWidth || 2;
    const widthNodes = s.widthNodes;
    const N = pts.length;

    // 计算总长度
    let totalLength = 0;
    const segLens = [];
    for (let i = 1; i < N; i++) {
      const dx = (pts[i][0] - pts[i - 1][0]) * w;
      const dy = (pts[i][1] - pts[i - 1][1]) * h;
      segLens.push(Math.sqrt(dx * dx + dy * dy));
      totalLength += segLens[segLens.length - 1];
    }
    if (totalLength === 0) return;

    const hasPathGrad = s.pathGradient && s.pathGradient.stops && s.pathGradient.stops.length >= 2;
    const pathStops = hasPathGrad ? s.pathGradient.stops : null;
    const numSub = 20;
    let currentLength = 0;

    // 绘制每段细分梯形
    for (let i = 0; i < segLens.length; i++) {
      const segLen = segLens[i];
      const segStartRatio = currentLength / totalLength;
      const segEndRatio = (currentLength + segLen) / totalLength;
      const widthAtSegStart = this._getWidthAtRatio(widthNodes, segStartRatio, baseWidth);
      const widthAtSegEnd = this._getWidthAtRatio(widthNodes, segEndRatio, baseWidth);

      if (widthAtSegStart < 0.01 && widthAtSegEnd < 0.01) {
        currentLength += segLen;
        continue;
      }

      const p1x = pts[i][0] * w, p1y = pts[i][1] * h;
      const p2x = pts[i + 1][0] * w, p2y = pts[i + 1][1] * h;

      for (let j = 0; j < numSub; j++) {
        const t0 = j / numSub;
        const t1 = (j + 1) / numSub;
        const r0 = segStartRatio + (segEndRatio - segStartRatio) * t0;
        const r1 = segStartRatio + (segEndRatio - segStartRatio) * t1;
        const w0 = this._getWidthAtRatio(widthNodes, r0, baseWidth);
        const w1 = this._getWidthAtRatio(widthNodes, r1, baseWidth);

        if (w0 < 0.01 && w1 < 0.01) continue;

        const color = pathStops ? this._getGradientColor(pathStops, (r0 + r1) / 2) : (s.stroke || '#fff');
        const subP1 = { x: p1x + (p2x - p1x) * t0, y: p1y + (p2y - p1y) * t0 };
        const subP2 = { x: p1x + (p2x - p1x) * t1, y: p1y + (p2y - p1y) * t1 };
        const isEdge = i === 0 && j === 0 || i === segLens.length - 1 && j === numSub - 1;
        this._drawTaperedSegment(ctx, subP1, subP2, w0, w1, color, isEdge ? 0 : 0.5);
      }
      currentLength += segLen;
    }

    // 补拐角三角形：填满两条线段梯形在外角处的缺口
    const sharp = s.sharpCorners === true;
    for (let i = 1; i < N - 1; i++) {
      const cornerRatio = this._getCornerRatio(segLens, totalLength, i);
      const wCorner = this._getWidthAtRatio(widthNodes, cornerRatio, baseWidth);
      if (wCorner < 0.01) continue;

      // 前一段方向 (pts[i-1] -> pts[i])
      const dx0 = (pts[i][0] - pts[i - 1][0]) * w;
      const dy0 = (pts[i][1] - pts[i - 1][1]) * h;
      const len0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
      // 后一段方向 (pts[i] -> pts[i+1])
      const dx1 = (pts[i + 1][0] - pts[i][0]) * w;
      const dy1 = (pts[i + 1][1] - pts[i][1]) * h;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;

      // 用叉积判断拐角朝向，只补外角
      const cross = dx0 * dy1 - dy0 * dx1;
      if (Math.abs(cross) < 0.001) continue; // 共线，无缺口

      const cornerX = pts[i][0] * w;
      const cornerY = pts[i][1] * h;
      const half = wCorner / 2;

      // 计算外侧法线
      let n0x, n0y, n1x, n1y;
      if (cross > 0) {
        // 路径左转 → 右侧是外角
        n0x = dy0 / len0; n0y = -dx0 / len0;
        n1x = dy1 / len1; n1y = -dx1 / len1;
      } else {
        // 路径右转 → 左侧是外角
        n0x = -dy0 / len0; n0y = dx0 / len0;
        n1x = -dy1 / len1; n1y = dx1 / len1;
      }

      // 外侧角点（前段末端、后段首端各自的梯形外角）
      const ax = cornerX + n0x * half, ay = cornerY + n0y * half;
      const bx = cornerX + n1x * half, by = cornerY + n1y * half;

      // 圆角三角形：始终绘制，填满靠近拐角的缺口
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cornerX, cornerY);
      ctx.closePath();
      const color = pathStops ? this._getGradientColor(pathStops, cornerRatio) : (s.stroke || '#fff');
      ctx.fillStyle = color;
      ctx.fill();

      // 尖角三角形：额外绘制，外侧边缘延长线相交形成尖角
      if (sharp) {
        const det = dx0 * dy1 - dy0 * dx1;
        if (Math.abs(det) > 0.001) {
          const t = ((bx - ax) * dy1 - (by - ay) * dx1) / det;
          if (t > 0) {
            const ix = ax + t * dx0, iy = ay + t * dy0;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ix, iy);
            ctx.lineTo(bx, by);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  /** 计算顶点 i 处的路径比例（累计长度 / 总长度） */
  _getCornerRatio(segLens, totalLength, i) {
    let len = 0;
    for (let k = 0; k < i; k++) len += segLens[k];
    return len / totalLength;
  }

  _drawTaperedPolyline(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const pts = s.points;
    const baseWidth = s.strokeWidth || 2;
    const startWidth = (s.startWidth || 1) * baseWidth;
    const endWidth = (s.endWidth || 1) * baseWidth;
    const taperStart = s.taperStart || 0;
    const taperEnd = s.taperEnd || 0;
    
    // 计算总长度
    let totalLength = 0;
    const segments = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i][0] - pts[i-1][0]) * w;
      const dy = (pts[i][1] - pts[i-1][1]) * h;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push(len);
      totalLength += len;
    }
    
    if (totalLength === 0) return;
    
    // 绘制每段
    let currentLength = 0;
    for (let i = 0; i < segments.length; i++) {
      const segLen = segments[i];
      const startRatio = currentLength / totalLength;
      const endRatio = (currentLength + segLen) / totalLength;
      
      // 计算起点和终点的宽度
      let widthAtStart = this._getTaperedWidth(startRatio, startWidth, endWidth, taperStart, taperEnd);
      let widthAtEnd = this._getTaperedWidth(endRatio, startWidth, endWidth, taperStart, taperEnd);
      
      // 绘制梯形段（重叠消除缝隙）
      const p1 = { x: pts[i][0] * w, y: pts[i][1] * h };
      const p2 = { x: pts[i+1][0] * w, y: pts[i+1][1] * h };

      this._drawTaperedSegment(ctx, p1, p2, widthAtStart, widthAtEnd, s.stroke, 0.5);
      
      currentLength += segLen;
    }
  }
  
  _getTaperedWidth(ratio, startWidth, endWidth, taperStart, taperEnd) {
    const baseWidth = Math.max(startWidth, endWidth);
    const minWidthStart = baseWidth * (1 - Math.min(1, taperStart || 0));
    const minWidthEnd = baseWidth * (1 - Math.min(1, taperEnd || 0));
    const smoothstep = (t) => t * t * (3 - 2 * t);

    if (ratio <= taperStart && taperStart > 0) {
      const t = smoothstep(ratio / taperStart);
      return minWidthStart + (baseWidth - minWidthStart) * t;
    } else if (ratio >= 1 - taperEnd && taperEnd > 0) {
      const t = smoothstep((ratio - (1 - taperEnd)) / taperEnd);
      return baseWidth + (minWidthEnd - baseWidth) * t;
    }
    return baseWidth;
  }
  
  _drawTaperedSegment(ctx, p1, p2, width1, width2, color, overlap = 0) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // 法线方向
    const nx = -dy / len;
    const ny = dx / len;

    // 延伸端点以消除缝隙
    const ex = overlap > 0 ? (dx / len) * overlap : 0;
    const ey = overlap > 0 ? (dy / len) * overlap : 0;
    const ax = p1.x - ex, ay = p1.y - ey;
    const bx = p2.x + ex, by = p2.y + ey;

    // 计算四个角点
    const tl = { x: ax + nx * width1 / 2, y: ay + ny * width1 / 2 };
    const tr = { x: ax - nx * width1 / 2, y: ay - ny * width1 / 2 };
    const bl = { x: bx + nx * width2 / 2, y: by + ny * width2 / 2 };
    const br = { x: bx - nx * width2 / 2, y: by - ny * width2 / 2 };

    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  
  _drawPathGradientPolyline(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const pts = s.points;
    const gradient = s.pathGradient;
    const stops = gradient.stops;
    const baseWidth = s.strokeWidth || 2;
    
    // 计算总长度
    let totalLength = 0;
    const segments = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i][0] - pts[i-1][0]) * w;
      const dy = (pts[i][1] - pts[i-1][1]) * h;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push(len);
      totalLength += len;
    }
    
    if (totalLength === 0) return;

    // 绘制每段（重叠绘制避免缝隙）
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let currentLength = 0;
    for (let i = 0; i < segments.length; i++) {
      const segLen = segments[i];
      const startRatio = currentLength / totalLength;
      const endRatio = (currentLength + segLen) / totalLength;

      // 计算起点和终点的颜色
      const colorAtStart = this._getGradientColor(stops, startRatio);
      const colorAtEnd = this._getGradientColor(stops, endRatio);

      // 绘制渐变段
      const p1 = { x: pts[i][0] * w, y: pts[i][1] * h };
      const p2 = { x: pts[i+1][0] * w, y: pts[i+1][1] * h };

      // 使用线性渐变模拟路径渐变
      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, colorAtStart);
      grad.addColorStop(1, colorAtEnd);

      // 向两端稍微延伸，确保与相邻段重叠
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len, ny = dy / len;
      const overlap = baseWidth * 0.6;

      ctx.beginPath();
      ctx.moveTo(p1.x - nx * overlap, p1.y - ny * overlap);
      ctx.lineTo(p2.x + nx * overlap, p2.y + ny * overlap);
      ctx.strokeStyle = grad;
      ctx.lineWidth = baseWidth;
      ctx.stroke();

      currentLength += segLen;
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }
  
  _getGradientColor(stops, ratio) {
    if (stops.length === 0) return '#000000';
    if (stops.length === 1) return stops[0].color;
    
    // 找到ratio所在的两个色标
    let startStop = stops[0];
    let endStop = stops[stops.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
      if (ratio >= stops[i].pos && ratio <= stops[i + 1].pos) {
        startStop = stops[i];
        endStop = stops[i + 1];
        break;
      }
    }
    
    // 线性插值
    const range = endStop.pos - startStop.pos;
    const t = range > 0 ? (ratio - startStop.pos) / range : 0;
    
    return this._interpolateColor(startStop.color, endStop.color, t);
  }
  
  _interpolateColor(color1, color2, t) {
    // 解析颜色
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // 插值
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 计算贝塞尔曲线控制点
   * 支持两种模式：
   * 1. tangentHandles[i] = {dx, dy} - 自由方向控制
   * 2. tangentWeights[i] = scalar - Catmull-Rom 方向 + 权重
   */
  _getBezierControlPoints(pts, tw, segIndex, w, h, tangentHandles) {
    const i = segIndex;
    const p0 = pts[i];
    const p3 = pts[i + 1];

    const handles = tangentHandles || (pts._tangentHandles);

    let cp1, cp2;

    if (handles && handles[i]) {
      // 使用自由方向切线手柄
      cp1 = { x: p0[0] * w + handles[i].dx * w, y: p0[1] * h + handles[i].dy * h };
    } else {
      // 回退到 Catmull-Rom + weight
      const w1 = (tw && tw[i] !== undefined) ? tw[i] : 0.5;
      let tdx, tdy;
      if (i > 0) {
        tdx = (p3[0] - pts[i - 1][0]) * w;
        tdy = (p3[1] - pts[i - 1][1]) * h;
      } else {
        tdx = (p3[0] - p0[0]) * w;
        tdy = (p3[1] - p0[1]) * h;
      }
      cp1 = { x: p0[0] * w + tdx * w1 / 2, y: p0[1] * h + tdy * w1 / 2 };
    }

    if (handles && handles[i + 1]) {
      // 使用自由方向切线手柄
      cp2 = { x: p3[0] * w - handles[i + 1].dx * w, y: p3[1] * h - handles[i + 1].dy * h };
    } else {
      // 回退到 Catmull-Rom + weight
      const w2 = (tw && tw[i + 1] !== undefined) ? tw[i + 1] : 0.5;
      let tdx, tdy;
      if (i + 2 < pts.length) {
        tdx = (pts[i + 2][0] - p0[0]) * w;
        tdy = (pts[i + 2][1] - p0[1]) * h;
      } else {
        tdx = (p3[0] - p0[0]) * w;
        tdy = (p3[1] - p0[1]) * h;
      }
      cp2 = { x: p3[0] * w - tdx * w2 / 2, y: p3[1] * h - tdy * w2 / 2 };
    }

    return { cp1, cp2 };
  }

  /**
   * 获取指定控制点的切线手柄位置
   * @param {Object} shape - 形状对象
   * @param {number} pointIndex - 控制点索引，-1 表示不返回任何手柄
   * @param {number} w - 画布宽度
   * @param {number} h - 画布高度
   * @returns {Array} 手柄数组
   */
  _getTangentHandles(shape, pointIndex, w, h) {
    if (shape.type !== 'path' || !shape.points || pointIndex < 0 || pointIndex >= shape.points.length) return [];
    const handles = [];
    const pts = shape.points;
    const th = shape.tangentHandles;

    const i = pointIndex;
    const px = pts[i][0] * w;
    const py = pts[i][1] * h;

    if (th && th[i]) {
      // 使用自由方向切线手柄
      handles.push({
        pointIndex: i, type: 'outgoing',
        x: px + th[i].dx * w, y: py + th[i].dy * h
      });
      handles.push({
        pointIndex: i, type: 'incoming',
        x: px - th[i].dx * w, y: py - th[i].dy * h
      });
    } else {
      // 回退到 Catmull-Rom + weight
      const tw = shape.tangentWeights;
      const weight = (tw && tw[i] !== undefined) ? tw[i] : 0.5;

      // 出射手柄
      if (i < pts.length - 1) {
        let tdx, tdy;
        if (i > 0) {
          tdx = (pts[i + 1][0] - pts[i - 1][0]) * w;
          tdy = (pts[i + 1][1] - pts[i - 1][1]) * h;
        } else {
          tdx = (pts[i + 1][0] - pts[i][0]) * w;
          tdy = (pts[i + 1][1] - pts[i][1]) * h;
        }
        handles.push({ pointIndex: i, type: 'outgoing', x: px + tdx * weight / 2, y: py + tdy * weight / 2 });
      }
      // 入射手柄
      if (i > 0) {
        let tdx, tdy;
        if (i < pts.length - 1) {
          tdx = (pts[i + 1][0] - pts[i - 1][0]) * w;
          tdy = (pts[i + 1][1] - pts[i - 1][1]) * h;
        } else {
          tdx = (pts[i][0] - pts[i - 1][0]) * w;
          tdy = (pts[i][1] - pts[i - 1][1]) * h;
        }
        handles.push({ pointIndex: i, type: 'incoming', x: px - tdx * weight / 2, y: py - tdy * weight / 2 });
      }
    }

    return handles;
  }

  /**
   * 根据宽度节点插值计算曲线某位置的宽度
   * @param {Array} widthNodes - [{width, position}, ...]
   * @param {number} ratio - 曲线上的位置 (0-1)
   * @param {number} baseWidth - 基础宽度
   * @returns {number} 插值后的宽度
   */
  _getWidthAtRatio(widthNodes, ratio, baseWidth) {
    if (!widthNodes || widthNodes.length === 0) return baseWidth;
    if (widthNodes.length === 1) return baseWidth * widthNodes[0].width;

    // 确保按位置排序
    const nodes = [...widthNodes].sort((a, b) => a.position - b.position);

    // 位置超出范围
    if (ratio <= nodes[0].position) return baseWidth * nodes[0].width;
    if (ratio >= nodes[nodes.length - 1].position) return baseWidth * nodes[nodes.length - 1].width;

    // 找到包围的两个节点
    for (let i = 0; i < nodes.length - 1; i++) {
      if (ratio >= nodes[i].position && ratio <= nodes[i + 1].position) {
        const t = (nodes[i + 1].position - nodes[i].position);
        if (t < 0.0001) return baseWidth * nodes[i].width;
        const blend = (ratio - nodes[i].position) / t;
        // smoothstep 插值
        const s = blend * blend * (3 - 2 * blend);
        const w = nodes[i].width + (nodes[i + 1].width - nodes[i].width) * s;
        return baseWidth * w;
      }
    }
    return baseWidth;
  }

  _drawCurve(ctx, s, w, h, isHighlight) {
    if (!s.points || s.points.length < 2) return;

    const hasWidthNodes = s.widthNodes && s.widthNodes.length >= 2 && s.widthNodes.some(n => n.width < 0.999);
    const hasPathGradient = s.pathGradient && s.pathGradient.stops && s.pathGradient.stops.length >= 2;

    if (hasWidthNodes && !isHighlight) {
      // 绘制可变宽度曲线
      this._drawVariableWidthCurve(ctx, s, w, h);
    } else if (hasPathGradient && !isHighlight) {
      // 绘制路径渐变的曲线
      this._drawPathGradientCurve(ctx, s, w, h);
    } else {
      const pts = s.points;
      const tw = s.tangentWeights;
      const th = s.tangentHandles;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (let i = 1; i < pts.length; i++) {
        const { cp1, cp2 } = this._getBezierControlPoints(pts, tw, i - 1, w, h, th);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pts[i][0] * w, pts[i][1] * h);
      }
      if (s.closed) ctx.closePath();
      if (!isHighlight && s.fill && s.fill !== 'none' && s.closed) ctx.fill();
      if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
      else if (isHighlight) ctx.stroke();
    }
  }
  
  // 贝塞尔曲线上的点计算
  _getPointOnBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  _drawPathGradientCurve(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const rawPts = s.points;
    const tw = s.tangentWeights;
    const th = s.tangentHandles;
    const gradient = s.pathGradient;
    const stops = gradient.stops;
    const baseWidth = s.strokeWidth || 2;

    // 使用贝塞尔曲线细分（与 _drawCurve 相同的逻辑）
    const numSegments = 20;
    const curvePoints = [];

    for (let i = 0; i < rawPts.length - 1; i++) {
      const p0 = { x: rawPts[i][0] * w, y: rawPts[i][1] * h };
      const p1 = { x: rawPts[i + 1][0] * w, y: rawPts[i + 1][1] * h };
      const { cp1, cp2 } = this._getBezierControlPoints(rawPts, tw, i, w, h, th);

      for (let t = 0; t < numSegments; t++) {
        const ratio = t / numSegments;
        const pt = this._getPointOnBezier(p0, cp1, cp2, p1, ratio);
        curvePoints.push(pt);
      }
    }
    const lastPt = rawPts[rawPts.length - 1];
    curvePoints.push({ x: lastPt[0] * w, y: lastPt[1] * h });
    
    // 计算总长度
    let totalLength = 0;
    const segments = [];
    for (let i = 1; i < curvePoints.length; i++) {
      const dx = curvePoints[i].x - curvePoints[i-1].x;
      const dy = curvePoints[i].y - curvePoints[i-1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push(len);
      totalLength += len;
    }
    
    if (totalLength === 0) return;

    // 绘制每段（重叠绘制避免缝隙）
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let currentLength = 0;
    for (let i = 0; i < segments.length; i++) {
      const segLen = segments[i];
      const startRatio = currentLength / totalLength;
      const endRatio = (currentLength + segLen) / totalLength;

      const colorAtStart = this._getGradientColor(stops, startRatio);
      const colorAtEnd = this._getGradientColor(stops, endRatio);

      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];

      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, colorAtStart);
      grad.addColorStop(1, colorAtEnd);

      // 向两端稍微延伸，确保与相邻段重叠
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len, ny = dy / len;
      const overlap = baseWidth * 0.6;

      ctx.beginPath();
      ctx.moveTo(p1.x - nx * overlap, p1.y - ny * overlap);
      ctx.lineTo(p2.x + nx * overlap, p2.y + ny * overlap);
      ctx.strokeStyle = grad;
      ctx.lineWidth = baseWidth;
      ctx.stroke();

      currentLength += segLen;
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  /**
   * 绘制可变宽度曲线（使用 widthNodes）
   */
  _drawVariableWidthCurve(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const rawPts = s.points;
    const tw = s.tangentWeights;
    const th = s.tangentHandles;
    const baseWidth = s.strokeWidth || 2;
    const widthNodes = s.widthNodes;

    // 细分曲线
    const numSegments = 30;
    const curvePoints = [];

    for (let i = 0; i < rawPts.length - 1; i++) {
      const p0 = { x: rawPts[i][0] * w, y: rawPts[i][1] * h };
      const p1 = { x: rawPts[i + 1][0] * w, y: rawPts[i + 1][1] * h };
      const { cp1, cp2 } = this._getBezierControlPoints(rawPts, tw, i, w, h, th);
      for (let t = 0; t < numSegments; t++) {
        const ratio = t / numSegments;
        curvePoints.push(this._getPointOnBezier(p0, cp1, cp2, p1, ratio));
      }
    }
    const lastPt = rawPts[rawPts.length - 1];
    curvePoints.push({ x: lastPt[0] * w, y: lastPt[1] * h });

    // 计算总长度
    let totalLength = 0;
    const segLens = [];
    for (let i = 1; i < curvePoints.length; i++) {
      const dx = curvePoints[i].x - curvePoints[i - 1].x;
      const dy = curvePoints[i].y - curvePoints[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segLens.push(len);
      totalLength += len;
    }
    if (totalLength === 0) return;

    // 绘制每段（用梯形近似可变宽度）
    const hasPathGrad = s.pathGradient && s.pathGradient.stops && s.pathGradient.stops.length >= 2;
    const pathStops = hasPathGrad ? s.pathGradient.stops : null;
    let currentLength = 0;
    for (let i = 0; i < segLens.length; i++) {
      const segLen = segLens[i];
      const startRatio = currentLength / totalLength;
      const endRatio = (currentLength + segLen) / totalLength;

      const widthAtStart = this._getWidthAtRatio(widthNodes, startRatio, baseWidth);
      const widthAtEnd = this._getWidthAtRatio(widthNodes, endRatio, baseWidth);

      // 跳过宽度为 0 的段
      if (widthAtStart < 0.01 && widthAtEnd < 0.01) {
        currentLength += segLen;
        continue;
      }

      const color = pathStops ? this._getGradientColor(pathStops, (startRatio + endRatio) / 2) : (s.stroke || '#fff');
      this._drawTaperedSegment(ctx, curvePoints[i], curvePoints[i + 1], widthAtStart, widthAtEnd, color, 0.5);
      currentLength += segLen;
    }
  }

  _drawTaperedCurve(ctx, s, w, h) {
    if (s.strokeWidth === 0) return;
    const rawPts = s.points;
    const tw = s.tangentWeights;
    const th = s.tangentHandles;
    const baseWidth = s.strokeWidth || 2;
    const startWidth = (s.startWidth || 1) * baseWidth;
    const endWidth = (s.endWidth || 1) * baseWidth;
    const taperStart = s.taperStart || 0;
    const taperEnd = s.taperEnd || 0;

    // 使用贝塞尔曲线细分（与 _drawCurve 相同的逻辑）
    const numSegments = 20;
    const curvePoints = [];

    for (let i = 0; i < rawPts.length - 1; i++) {
      const p0 = { x: rawPts[i][0] * w, y: rawPts[i][1] * h };
      const p1 = { x: rawPts[i + 1][0] * w, y: rawPts[i + 1][1] * h };
      const { cp1, cp2 } = this._getBezierControlPoints(rawPts, tw, i, w, h, th);

      for (let t = 0; t < numSegments; t++) {
        const ratio = t / numSegments;
        const pt = this._getPointOnBezier(p0, cp1, cp2, p1, ratio);
        curvePoints.push(pt);
      }
    }
    const lastPt = rawPts[rawPts.length - 1];
    curvePoints.push({ x: lastPt[0] * w, y: lastPt[1] * h });
    
    // 计算总长度
    let totalLength = 0;
    const segments = [];
    for (let i = 1; i < curvePoints.length; i++) {
      const dx = curvePoints[i].x - curvePoints[i-1].x;
      const dy = curvePoints[i].y - curvePoints[i-1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push(len);
      totalLength += len;
    }
    
    if (totalLength === 0) return;
    
    // 绘制每段
    let currentLength = 0;
    for (let i = 0; i < segments.length; i++) {
      const segLen = segments[i];
      const startRatio = currentLength / totalLength;
      const endRatio = (currentLength + segLen) / totalLength;
      
      let widthAtStart = this._getTaperedWidth(startRatio, startWidth, endWidth, taperStart, taperEnd);
      let widthAtEnd = this._getTaperedWidth(endRatio, startWidth, endWidth, taperStart, taperEnd);
      
      this._drawTaperedSegment(ctx, curvePoints[i], curvePoints[i+1], widthAtStart, widthAtEnd, s.stroke, 0.5);
      
      currentLength += segLen;
    }
  }

  _drawPointsShape(ctx, s, w, h, isHighlight) {
    if (!s.points || s.points.length < 3) return;
    ctx.beginPath();
    s.points.forEach((pt, i) => {
      const px = pt[0] * w, py = pt[1] * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    if (!isHighlight && s.fill && s.fill !== 'none') ctx.fill();
    if (!isHighlight && s.stroke && s.stroke !== 'none' && s.strokeWidth !== 0) ctx.stroke();
    else if (isHighlight) ctx.stroke();
  }

  _drawParticlesShape(ctx, s, w, h) {
    // 如果启用发射器，使用动态粒子系统
    if (s.emitterEnabled) {
      this._drawEmitterParticles(ctx, s, w, h);
      return;
    }
    
    // 否则使用静态伪随机渲染（向后兼容）
    const cx = s.x * w, cy = s.y * h;
    const spread = s.spread * Math.min(w, h);
    const count = s.count || 30;
    const colors = s.colors || ['#4de8d6'];
    // 使用固定伪随机（基于形状ID）确保渲染稳定
    const seed = (s.id || '0').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const rand = (i) => {
      const x = Math.sin(seed + i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < count; i++) {
      const angle = rand(i) * Math.PI * 2;
      const dist = rand(i + 100) * spread;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const r = 1 + rand(i + 200) * 2;
      const alpha = 0.3 + rand(i + 300) * 0.4;
      const color = colors[Math.floor(rand(i + 400) * colors.length)];
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  
  // 初始化粒子发射器状态
  _initParticleEmitter(s) {
    if (!s._emitterState) {
      s._emitterState = {
        particles: [],
        emitAccumulator: 0,
        lastTime: 0
      };
    }
  }
  
  // 更新粒子发射器
  _updateParticleEmitter(s, dt, w, h) {
    this._initParticleEmitter(s);
    const state = s._emitterState;
    const cx = s.x * w, cy = s.y * h;
    const spread = s.spread * Math.min(w, h);
    
    // 发射新粒子
    const rate = s.emitterRate || 10;
    state.emitAccumulator += rate * dt;
    
    while (state.emitAccumulator >= 1) {
      state.emitAccumulator -= 1;
      
      // 创建新粒子
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const colors = s.colors || ['#4de8d6'];
      const sizeMin = s.particleSizeMin || 1;
      const sizeMax = s.particleSizeMax || 3;
      const alphaMin = s.particleAlphaMin || 0.3;
      const alphaMax = s.particleAlphaMax || 0.8;
      const vxMin = s.vxMin || -0.5;
      const vxMax = s.vxMax || 0.5;
      const vyMin = s.vyMin || -1.0;
      const vyMax = s.vyMax || -0.3;
      
      const particle = {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: vxMin + Math.random() * (vxMax - vxMin),
        vy: vyMin + Math.random() * (vyMax - vyMin),
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        alpha: alphaMin + Math.random() * (alphaMax - alphaMin),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: s.emitterLifetime || 2.0
      };
      
      state.particles.push(particle);
    }
    
    // 更新现有粒子
    const gravity = s.gravity || 0;
    const drag = s.drag || 0.01;
    const forceFields = s.forceFields || [];
    
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      
      // 应用力场
      for (const field of forceFields) {
        const fx = this._calculateForceField(field, p.x, p.y, cx, cy);
        p.vx += fx.x * dt;
        p.vy += fx.y * dt;
      }
      
      // 应用重力
      p.vy += gravity * dt;
      
      // 应用阻力
      p.vx *= (1 - drag);
      p.vy *= (1 - drag);
      
      // 更新位置
      p.x += p.vx * w * dt;
      p.y += p.vy * h * dt;
      
      // 更新生命
      p.life += dt;
      
      // 移除死亡粒子
      if (p.life >= p.maxLife) {
        state.particles.splice(i, 1);
      }
    }
  }
  
  // 计算力场影响
  _calculateForceField(field, px, py, cx, cy) {
    let fx = 0, fy = 0;
    
    switch (field.type) {
      case 'radial': {
        // 径向力场（吸引或排斥）
        const dx = px - (field.x || cx);
        const dy = py - (field.y || cy);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const strength = field.strength || 1;
        const falloff = field.falloff || 2;
        const force = strength / Math.pow(dist, falloff - 1);
        fx = -dx / dist * force;
        fy = -dy / dist * force;
        break;
      }
      case 'directional': {
        // 方向力场（风）
        fx = field.forceX || 0;
        fy = field.forceY || 0;
        break;
      }
      case 'vortex': {
        // 漩涡力场
        const dx = px - (field.x || cx);
        const dy = py - (field.y || cy);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const strength = field.strength || 1;
        fx = -dy / dist * strength;
        fy = dx / dist * strength;
        break;
      }
      case 'turbulence': {
        // 湍流力场
        const scale = field.scale || 0.01;
        const strength = field.strength || 1;
        fx = (Math.sin(px * scale + this.t) + Math.sin(py * scale * 1.3)) * strength * 0.5;
        fy = (Math.cos(py * scale + this.t * 0.7) + Math.cos(px * scale * 0.9)) * strength * 0.5;
        break;
      }
    }
    
    return { x: fx, y: fy };
  }
  
  // 绘制发射器粒子
  _drawEmitterParticles(ctx, s, w, h) {
    this._initParticleEmitter(s);
    const state = s._emitterState;
    
    ctx.save();
    ctx.globalCompositeOperation = s.blendMode || 'screen';
    
    for (const p of state.particles) {
      // 计算基于生命的透明度
      const lifeRatio = p.life / p.maxLife;
      const alpha = p.alpha * (1 - lifeRatio);
      
      if (alpha <= 0) continue;
      
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ===================== 动态更新 =====================
  update(dt) {
    this.t += dt;

    // 水母动画
    if (this.jellyfish) {
      const c = this.jellyfish.config;
      const j = this.jellyfish;
      j.y = j.baseY + Math.sin(this.t * c.bobSpeed) * c.bobAmp;
      j.phase += dt * 1.2;
    }

    // 粒子动画
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = this.w + 10; if (p.x > this.w + 10) p.x = -10;
      if (p.y < -10) p.y = this.h + 10; if (p.y > this.h + 10) p.y = -10;
    }

    // 岩浆粒子动画
    const magmaDefaults = this._getDefaults('magma');
    for (const p of this.magmaParticles) {
      p.x += p.vx + Math.sin(this.t * 2 + p.life * 10) * 0.3;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        p.life = 1;
        p.x = p.ventX + (Math.random() - 0.5) * 8;
        p.y = p.ventY;
        p.vx = magmaDefaults.vxMin + Math.random() * (magmaDefaults.vxMax - magmaDefaults.vxMin);
        p.vy = magmaDefaults.vyMin + Math.random() * (magmaDefaults.vyMax - magmaDefaults.vyMin);
      }
    }

    // 河流闪光动画
    for (const g of this.riverGlints) g.phase += dt * g.freq;
    
    // 更新自定义形状的粒子发射器
    const shapes = this.cfg.shapes || [];
    for (const s of shapes) {
      if (s.type === 'particles' && s.emitterEnabled && s.visible !== false) {
        this._updateParticleEmitter(s, dt, this.w, this.h);
      }
    }
  }

  // ===================== 绘制 =====================
  draw(ctx) {
    ctx.drawImage(this.staticCanvas, 0, 0);
    const order = this.cfg.layerOrder || [];
    for (const id of order) {
      this._renderDynamicLayer(ctx, id);
    }
  }

  // 组变换专用：直接修改形状位置绘制（不依赖ctx变换）
  drawGroupDirect(ctx, group) {
    const gx = (group.x || 0.5) * this.w;
    const gy = (group.y || 0.5) * this.h;
    const gr = (group.rotation || 0) * Math.PI / 180;
    const gs = group.scale || 1;
    const cos = Math.cos(gr), sin = Math.sin(gr);

    for (const childId of group.children) {
      const sid = childId.replace('shape_', '');
      const s = (this.cfg.shapes || []).find(sh => sh.id === sid);
      if (!s || s.visible === false) continue;

      // 保存原始位置
      const origX = s.x, origY = s.y, origPoints = s.points;
      const origRotation = s.rotation;

      // 计算变换后的位置
      if (s.x !== undefined && s.y !== undefined) {
        // 以组中心为原点，缩放+旋转
        const dx = (s.x * this.w - gx) * gs;
        const dy = (s.y * this.h - gy) * gs;
        s.x = (gx + dx * cos - dy * sin) / this.w;
        s.y = (gy + dx * sin + dy * cos) / this.h;
      }
      if (s.points) {
        s.points = s.points.map(p => {
          const dx = (p[0] * this.w - gx) * gs;
          const dy = (p[1] * this.h - gy) * gs;
          return [
            (gx + dx * cos - dy * sin) / this.w,
            (gy + dx * sin + dy * cos) / this.h
          ];
        });
      }
      if (s.rotation !== undefined && gr) {
        s.rotation = s.rotation + gr * 180 / Math.PI;
      }

      this._drawSingleShape(ctx, s, false);

      // DEBUG: 变换后位置画黄色边框
      ctx.save();
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const tb = this.getShapeBounds(s);
      ctx.strokeRect(tb.x, tb.y, tb.width, tb.height);
      ctx.setLineDash([]);
      ctx.restore();

      // 恢复原始位置
      s.x = origX;
      s.y = origY;
      s.points = origPoints;
      s.rotation = origRotation;
    }
  }

  // ===================== Transform 控制器 =====================
  getShapeBounds(s) {
    const w = this.w, h = this.h;
    switch (s.type) {
      case 'rectangle':
        return { x: s.x * w, y: s.y * h, width: s.width * w, height: s.height * h };
      case 'circle': {
        const rx = (s.radiusX !== undefined ? s.radiusX : s.radius) * w;
        const ry = (s.radiusY !== undefined ? s.radiusY : s.radius) * h;
        return { x: s.x * w - rx, y: s.y * h - ry, width: rx * 2, height: ry * 2 };
      }
      case 'polygon': {
        const r = s.radius * Math.min(w, h);
        return { x: s.x * w - r, y: s.y * h - r, width: r * 2, height: r * 2 };
      }
      case 'particles': {
        const spread = s.spread * Math.min(w, h);
        return { x: s.x * w - spread, y: s.y * h - spread, width: spread * 2, height: spread * 2 };
      }
      default:
        if (s.points && s.points.length > 0) {
          const pts = s.points.map(p => ({ x: p[0] * w, y: p[1] * h }));
          const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
          return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        }
        if (s.data && s.data.length > 0) {
          const pts = s.data.map(p => ({ x: p[0] * w, y: p[1] * h }));
          const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
          return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  getTransformHandle(mx, my, shape) {
    const bounds = this.getShapeBounds(shape);
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const handleSize = 12;

    // 将鼠标坐标转换到形状的局部坐标系（考虑旋转）
    const rotation = shape.rotation || 0;
    let lx = mx, ly = my;
    if (rotation !== 0) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const rad = -rotation * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const dx = mx - cx, dy = my - cy;
      lx = cx + dx * cos - dy * sin;
      ly = cy + dx * sin + dy * cos;
    }

    // 旋转手柄
    const rotX = bounds.x + bounds.width / 2;
    const rotY = bounds.y - 25;
    if (Math.abs(lx - rotX) <= handleSize / 2 + 2 && Math.abs(ly - rotY) <= handleSize / 2 + 2) {
      return 'rotate';
    }

    // 8个缩放手柄
    const handles = [
      { x: bounds.x, y: bounds.y, name: 'resize-nw' },
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'resize-n' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'resize-ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'resize-e' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'resize-se' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 'resize-s' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'resize-sw' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'resize-w' },
    ];

    for (const h of handles) {
      if (Math.abs(lx - h.x) <= handleSize / 2 && Math.abs(ly - h.y) <= handleSize / 2) {
        return h.name;
      }
    }

    // 内部移动
    if (lx >= bounds.x && lx <= bounds.x + bounds.width && ly >= bounds.y && ly <= bounds.y + bounds.height) {
      return 'move';
    }

    return null;
  }

  drawTransform(ctx, shape) {
    const bounds = this.getShapeBounds(shape);
    if (bounds.width <= 0 || bounds.height <= 0) return;

    ctx.save();

    // 应用旋转变换，使控制器跟随形状旋转
    const rotation = shape.rotation || 0;
    if (rotation !== 0) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }

    // 外框
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);

    // 8个控制点
    const handleSize = 8;
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width / 2, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height / 2 },
    ];

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;

    handles.forEach(h => {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    });

    // 旋转手柄
    const rotX = bounds.x + bounds.width / 2;
    const rotY = bounds.y - 25;
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
    ctx.lineTo(rotX, rotY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rotX, rotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    
    // 为polyline/path形状绘制控制点
    if (shape.type === 'polyline' || shape.type === 'path') {
      this.drawControlPoints(ctx, shape, shape._selectedPointIndex);
    }
  }

  // ===== 多选变换控制器 =====

  getGroupBounds(shapes, group) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of shapes) {
      const b = this.getShapeBounds(s);
      if (b.width <= 0 && b.height <= 0) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };

    // 如果有组变换，对4个角应用旋转+缩放后重新计算AABB
    if (group && (group.rotation || group.scale !== 1)) {
      const gx = (group.x || 0.5) * this.w;
      const gy = (group.y || 0.5) * this.h;
      const gr = (group.rotation || 0) * Math.PI / 180;
      const gs = group.scale || 1;
      const cos = Math.cos(gr), sin = Math.sin(gr);
      const corners = [
        { x: minX, y: minY }, { x: maxX, y: minY },
        { x: maxX, y: maxY }, { x: minX, y: maxY }
      ];
      minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
      for (const c of corners) {
        const rx = (c.x - gx) * gs, ry = (c.y - gy) * gs;
        const wx = gx + rx * cos - ry * sin;
        const wy = gy + rx * sin + ry * cos;
        minX = Math.min(minX, wx); minY = Math.min(minY, wy);
        maxX = Math.max(maxX, wx); maxY = Math.max(maxY, wy);
      }
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  drawGroupTransform(ctx, shapes, group) {
    const bounds = this.getGroupBounds(shapes, group);
    if (bounds.width <= 0 && bounds.height <= 0) return;

    ctx.save();

    // 外框（绿色虚线区分多选）
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.setLineDash([]);

    // 8个缩放手柄
    const handleSize = 8;
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width / 2, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height / 2 },
    ];

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 1;
    handles.forEach(h => {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    });

    // 旋转手柄
    const rotX = bounds.x + bounds.width / 2;
    const rotY = bounds.y - 25;
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
    ctx.lineTo(rotX, rotY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rotX, rotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  getGroupTransformHandle(mx, my, shapes, group) {
    const bounds = this.getGroupBounds(shapes, group);
    if (bounds.width <= 0 && bounds.height <= 0) return null;
    const handleSize = 12;

    // 旋转手柄
    const rotX = bounds.x + bounds.width / 2;
    const rotY = bounds.y - 25;
    if (Math.abs(mx - rotX) <= handleSize / 2 + 2 && Math.abs(my - rotY) <= handleSize / 2 + 2) {
      return 'rotate';
    }

    // 8个缩放手柄
    const hs = [
      { x: bounds.x, y: bounds.y, name: 'resize-nw' },
      { x: bounds.x + bounds.width / 2, y: bounds.y, name: 'resize-n' },
      { x: bounds.x + bounds.width, y: bounds.y, name: 'resize-ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, name: 'resize-e' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, name: 'resize-se' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, name: 'resize-s' },
      { x: bounds.x, y: bounds.y + bounds.height, name: 'resize-sw' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, name: 'resize-w' },
    ];
    for (const h of hs) {
      if (Math.abs(mx - h.x) <= handleSize / 2 && Math.abs(my - h.y) <= handleSize / 2) {
        return h.name;
      }
    }

    // 内部 = 移动
    if (mx >= bounds.x && mx <= bounds.x + bounds.width &&
        my >= bounds.y && my <= bounds.y + bounds.height) {
      return 'move';
    }

    return null;
  }
  /**
   * 绘制polyline/path形状的控制点
   */
  drawControlPoints(ctx, shape, selectedPointIndex = -1) {
    if (!shape.points || shape.points.length === 0) return;

    const cw = this.canvas ? this.canvas.width : ctx.canvas.width;
    const ch = this.canvas ? this.canvas.height : ctx.canvas.height;

    ctx.save();

    // 应用旋转变换
    const bounds = this.getShapeBounds(shape);
    const rotation = shape.rotation || 0;
    if (rotation !== 0) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }

    const handleSize = 8;

    // 绘制切线手柄（仅 path 类型，且仅选中的控制点）
    if (shape.type === 'path' && selectedPointIndex >= 0) {
      const handles = this._getTangentHandles(shape, selectedPointIndex, cw, ch);
      for (const h of handles) {
        const anchor = shape.points[h.pointIndex];
        const ax = anchor[0] * cw;
        const ay = anchor[1] * ch;

        // 绘制手柄连线
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(h.x, h.y);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 绘制手柄圆点
        ctx.beginPath();
        ctx.arc(h.x, h.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    shape.points.forEach((pt, idx) => {
      const px = pt[0] * cw;
      const py = pt[1] * ch;

      // 绘制控制点
      ctx.beginPath();
      ctx.arc(px, py, handleSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#ff6b2c' : (idx === shape.points.length - 1 ? '#4de8d6' : '#fff');
      ctx.fill();
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 绘制点序号
      ctx.fillStyle = '#000';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(idx.toString(), px, py);
    });

    ctx.restore();
  }
  
  /**
   * 获取控制点位置（用于命中测试）
   */
  getControlPointAt(shape, x, y) {
    if (!shape.points || shape.points.length === 0) return -1;

    const cw = this.w;
    const ch = this.h;
    const handleSize = 10; // 命中区域稍大
    
    // 应用旋转变换
    const bounds = this.getShapeBounds(shape);
    const rotation = shape.rotation || 0;
    
    // 如果有旋转，需要将点击坐标转换到旋转后的空间
    let testX = x, testY = y;
    if (rotation !== 0) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const rad = -rotation * Math.PI / 180;
      const dx = x - cx;
      const dy = y - cy;
      testX = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
      testY = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
    }
    
    for (let i = 0; i < shape.points.length; i++) {
      const px = shape.points[i][0] * cw;
      const py = shape.points[i][1] * ch;
      
      const dist = Math.sqrt((testX - px) ** 2 + (testY - py) ** 2);
      if (dist <= handleSize) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * 获取切线手柄命中测试（仅检测选中点的手柄）
   * @returns {{pointIndex: number, type: 'incoming'|'outgoing'} | null}
   */
  getTangentHandleAt(shape, x, y, selectedPointIndex = -1) {
    if (shape.type !== 'path' || !shape.points || selectedPointIndex < 0) return null;

    const cw = this.w;
    const ch = this.h;
    const handleSize = 10;

    const handles = this._getTangentHandles(shape, selectedPointIndex, cw, ch);

    // 应用旋转变换
    const bounds = this.getShapeBounds(shape);
    const rotation = shape.rotation || 0;
    let testX = x, testY = y;
    if (rotation !== 0) {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const rad = -rotation * Math.PI / 180;
      const dx = x - cx, dy = y - cy;
      testX = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
      testY = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
    }

    for (const h of handles) {
      const dist = Math.sqrt((testX - h.x) ** 2 + (testY - h.y) ** 2);
      if (dist <= handleSize) {
        return { pointIndex: h.pointIndex, type: h.type };
      }
    }
    return null;
  }

  _renderDynamicLayer(ctx, id) {
    const c = this.cfg;
    switch (id) {
      case 'mountains': if (this.mountains) this._drawMountains(ctx); break;
      case 'jellyfish': if (this.jellyfish) this._drawJellyfish(ctx); break;
      case 'particles': if (this.particles.length > 0) this._drawParticles(ctx); break;
      case 'magma': if (this.magmaParticles.length > 0) this._drawMagmaParticles(ctx); break;
      case 'glints': if (this.riverGlints.length > 0) this._drawRiverGlints(ctx); break;
      default:
        if (id.startsWith('group_')) {
          const group = (c.groups || []).find(g => g.id === id);
          if (group) {
            ctx.save();
            const gx = (group.x || 0.5) * this.w;
            const gy = (group.y || 0.5) * this.h;
            const gr = (group.rotation || 0) * Math.PI / 180;
            const gs = group.scale || 1;
            ctx.translate(gx, gy);
            if (gr) ctx.rotate(gr);
            if (gs !== 1) ctx.scale(gs, gs);
            ctx.translate(-gx, -gy);
            for (const childId of group.children) {
              this._renderDynamicLayer(ctx, childId);
            }
            ctx.restore();
          }
        }
        break;
    }
  }

  _drawMountains(ctx) {
    if (!this.mountains) return;
    const defaults = this._getDefaults('mountains');
    const c = { ...defaults, ...this.cfg.mountains };
    const sway = Math.sin(this.t * c.swaySpeed) * c.swayAmp;
    ctx.save(); ctx.translate(sway, 0);
    ctx.fillStyle = `rgba(10, 31, 46, ${this.mountains.far.opacity})`;
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    this.mountains.far.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(this.w, this.h); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  _drawJellyfish(ctx) {
    if (!this.jellyfish) return;
    const j = this.jellyfish;
    const c = j.config;
    const breathe = 1 + Math.sin(this.t * c.breatheSpeed) * c.breatheAmp;
    ctx.save(); ctx.translate(j.x, j.y); ctx.scale(breathe, breathe);

    // 光晕
    ctx.save();
    ctx.shadowColor = primaryColor(c.glowColor); ctx.shadowBlur = c.glowBlur;
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, j.radiusX);
    gg.addColorStop(0, 'rgba(168, 255, 240, 0.4)');
    gg.addColorStop(0.5, 'rgba(107, 255, 232, 0.15)');
    gg.addColorStop(1, 'rgba(77, 232, 214, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(0, 0, j.radiusX, j.radiusY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 触手
    for (let i = 0; i < j.tentacles.length; i++) {
      const t = j.tentacles[i];
      ctx.save();
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(107, 255, 232, 0.45)' : 'rgba(168, 255, 240, 0.55)';
      ctx.lineWidth = i % 2 === 0 ? 2.5 : 2;
      ctx.beginPath(); ctx.moveTo(t.offsetX, 15);
      const segs = 8;
      for (let s = 1; s <= segs; s++) {
        const sy = 15 + (t.length * s) / segs;
        const wave = Math.sin(this.t * t.waveFreq + t.phase + s * 0.5) * t.waveAmp * (s / segs);
        ctx.lineTo(t.offsetX + wave, sy);
      }
      ctx.stroke(); ctx.restore();
    }

    // 触手末端光点
    for (let i = 0; i < j.tentacles.length; i++) {
      const t = j.tentacles[i];
      const sy = 15 + t.length * 0.6;
      const wave = Math.sin(this.t * t.waveFreq + t.phase + 3) * t.waveAmp * 0.6;
      ctx.fillStyle = 'rgba(168, 255, 240, 0.6)';
      ctx.beginPath(); ctx.arc(t.offsetX + wave, sy, 2, 0, Math.PI * 2); ctx.fill();
    }

    // 身体
    const bg = ctx.createLinearGradient(0, -j.radiusY, 0, 22);
    c.bodyGrad.forEach((col, i) => bg.addColorStop(i / (c.bodyGrad.length - 1), col));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.bezierCurveTo(-35, -35, -20, -55, 0, -55);
    ctx.bezierCurveTo(20, -55, 35, -35, 35, 0);
    ctx.bezierCurveTo(35, 10, 20, 22, 0, 22);
    ctx.bezierCurveTo(-20, 22, -35, 10, -35, 0);
    ctx.closePath(); ctx.fill();

    // 身体装饰线
    ctx.strokeStyle = 'rgba(168, 255, 240, 0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-20, -10); ctx.quadraticCurveTo(-10, -25, 0, -30); ctx.quadraticCurveTo(10, -25, 20, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.quadraticCurveTo(-5, -15, 0, -20); ctx.quadraticCurveTo(5, -15, 15, 0); ctx.stroke();

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath(); ctx.ellipse(-10, -35, 8, 4, -0.26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawParticles(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const p of this.particles) {
      const alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(this.t * p.blinkFreq + p.blinkPhase));
      ctx.fillStyle = primaryColor(p.color); ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  _drawMagmaParticles(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const p of this.magmaParticles) {
      const alpha = p.life * p.intensity;
      const r = p.r + (1 - p.life) * (p.maxR - p.r);
      const warm = Math.floor(255 * p.life);
      ctx.fillStyle = `rgba(255, ${Math.floor(100 + warm * 0.6)}, ${Math.floor(60 * p.life)}, ${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawRiverGlints(ctx) {
    const path = this._getRiverPath();
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const g of this.riverGlints) {
      const pos = this._getPointOnPath(path, g.t);
      const alpha = g.alpha * (0.5 + 0.5 * Math.sin(g.phase));
      const r = g.r * (0.8 + 0.2 * Math.sin(g.phase * 1.3));
      ctx.fillStyle = `rgba(168, 255, 240, ${alpha})`;
      ctx.beginPath(); ctx.arc(pos.x, pos.y + g.offsetY, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ===================== 点击检测 =====================
  hitTest(mx, my) {
    const x = mx, y = my;
    const hits = [];
    const c = this.cfg;

    // 自定义几何体和基础形状
    const shapes = c.shapes || [];
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (!s.visible || s.locked) continue;
      let hit = false;

      if (s.type === 'rectangle') {
        const rx = s.x * this.w, ry = s.y * this.h, rw = s.width * this.w, rh = s.height * this.h;
        hit = (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
      } else if (s.type === 'circle') {
        const cx = s.x * this.w, cy = s.y * this.h;
        const rx = (s.radiusX !== undefined ? s.radiusX : s.radius) * this.w;
        const ry = (s.radiusY !== undefined ? s.radiusY : s.radius) * this.h;
        hit = ((x - cx) ** 2) / (rx * rx + 0.001) + ((y - cy) ** 2) / (ry * ry + 0.001) <= 1;
      } else if (s.type === 'polygon') {
        const cx = s.x * this.w, cy = s.y * this.h;
        const r = s.radius * Math.min(this.w, this.h);
        const sides = s.sides || 6;
        const rotation = (s.rotation || 0) * Math.PI / 180;
        const poly = [];
        for (let i = 0; i < sides; i++) {
          const angle = rotation + (i * 2 * Math.PI / sides) - Math.PI / 2;
          poly.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
        hit = this._pointInPolygon(x, y, poly);
      } else if (s.type === 'polyline' || s.type === 'path') {
        if (s.points && s.points.length >= 2) {
          hit = this._pointNearPolyline(x, y, s.points, 15);
        }
      } else if (s.type === 'mountain' || s.type === 'rock') {
        if (s.points && s.points.length >= 3) {
          hit = this._pointInPolygon(x, y, s.points.map(p => [p[0] * this.w, p[1] * this.h]));
        }
      } else if (s.type === 'particles') {
        const cx = s.x * this.w, cy = s.y * this.h;
        const spread = s.spread * Math.min(this.w, this.h);
        hit = (x - cx) ** 2 + (y - cy) ** 2 <= spread * spread;
      } else if (s.data && s.data.length > 0) {
        hit = this._pointNearPolyline(x, y, s.data, 20);
      }

      if (hit) {
        hits.push({ type: 'shape_' + s.id, label: s.name || '未命名形状', path: 'shapes.' + i });
        break;
      }
    }

    // 背景（总是可点击）
    hits.push({ type: 'background', label: '背景', path: 'background' });

    return hits;
  }

  hitTestBox(box) {
    const hits = [];
    const shapes = this.cfg.shapes || [];
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (!s.visible || s.locked) continue;
      
      // 获取形状的边界框
      const bounds = this.getShapeBounds(s);
      if (bounds.width <= 0 || bounds.height <= 0) continue;
      
      // 检查边界框是否与选择框相交
      const intersects = !(
        bounds.x + bounds.width < box.x ||
        bounds.x > box.x + box.width ||
        bounds.y + bounds.height < box.y ||
        bounds.y > box.y + box.height
      );
      
      if (intersects) {
        hits.push({ type: 'shape_' + s.id, label: s.name || '未命名形状', path: 'shapes.' + i });
      }
    }
    return hits;
  }

  _pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
        inside = !inside;
    }
    return inside;
  }

  _pointNearPath(x, y, path, threshold) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (len2 === 0) {
        if ((x - a.x) ** 2 + (y - a.y) ** 2 <= threshold ** 2) return true;
        continue;
      }
      let t = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = x - (a.x + t * (b.x - a.x));
      const dy = y - (a.y + t * (b.y - a.y));
      if (dx * dx + dy * dy <= threshold * threshold) return true;
    }
    return false;
  }

  _pointNearPolyline(x, y, points, threshold) {
    const pts = points.map(p => ({ x: p[0] * this.w, y: p[1] * this.h }));
    return this._pointNearPath(x, y, pts, threshold);
  }

  _pointNearSegment(px, py, x1, y1, x2, y2, threshold) {
    const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (len2 === 0) return (px - x1) ** 2 + (py - y1) ** 2 <= threshold ** 2;
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len2;
    t = Math.max(0, Math.min(1, t));
    const dx = px - (x1 + t * (x2 - x1));
    const dy = py - (y1 + t * (y2 - y1));
    return dx * dx + dy * dy <= threshold * threshold;
  }
}

export { EditableDynamicBG, resolveColor, primaryColor, isGradient };
