/**
 * DynamicBG - 动态背景渲染器（配置驱动版）
 * 将 BG1.png 的视觉元素重构为程序化的 Canvas 动态场景
 * 支持：水母脉动漂浮、热液喷发、河流微光、荧光微粒、远景视差
 */
export class DynamicBG {
    constructor(width, height, config = null) {
        this.w = width;
        this.h = height;
        this.t = 0; // 全局时间
        this.cfg = config || this._defaultConfig();
        this._init();
    }

    /** 应用外部配置并重新初始化 */
    applyConfig(cfg) {
        this.cfg = cfg;
        this._init();
    }

    _init() {
        // === 预渲染静态层（offscreen canvas） ===
        this.staticCanvas = document.createElement('canvas');
        this.staticCanvas.width = this.w;
        this.staticCanvas.height = this.h;
        this.sCtx = this.staticCanvas.getContext('2d');
        this._renderStatic();

        // === 动态元素 ===
        this.jellyfish = this._createJellyfish();
        this.particles = this._createParticles();
        this.magmaParticles = this._createMagmaParticles();
        this.riverGlints = this._createRiverGlints();
        this.mountains = this._createMountains();
    }

    _defaultConfig() {
        return {
            canvas: { width: 960, height: 540 },
            background: { visible: true, centerX: 0.5, centerY: 0.3, radius: 0.8, color0: '#164a63', color1: '#0d2f42', color2: '#061924' },
            ambient: { visible: true, centerX: 0.65, centerY: 0.35, radius: 0.5, color0: 'rgba(30, 107, 122, 0.35)', color1: 'rgba(13, 47, 66, 0)' },
            river: { visible: true, shadowColor: '#4de8d6', shadowBlur: 12, stroke0: 'rgba(45, 212, 191, 0.25)', width0: 35, stroke1: 'rgba(107, 255, 232, 0.4)', width1: 8, path: [[-0.052,0.486],[0.078,0.472],[0.156,0.583],[0.279,0.534],[0.390,0.601],[0.469,0.625],[0.586,0.597],[0.703,0.569],[0.781,0.667],[0.898,0.639],[0.938,0.625],[0.977,0.653],[1.039,0.625]] },
            leftRock: { visible: true, fill: { mode: 'solid', color: '#0f222e' }, highlight: { visible: true, color: 'rgba(30, 58, 77, 0.5)', width: 2, points: [[0.062,0.625],[0.117,0.681],[0.172,0.639],[0.219,0.722],[0.273,0.667]] }, points: [[0,1],[0,0.667],[0.111,0.619],[0.194,0.669],[0.252,0.656],[0.297,0.677],[0.327,0.747],[0.315,0.814],[0.295,0.871],[0.264,0.947],[0.219,1]] },
            rightRock: { visible: true, fill: { mode: 'solid', color: '#0a1c26' }, points: [[0.664,1],[0.703,0.833],[0.766,0.764],[0.820,0.806],[0.875,0.722],[0.938,0.778],[1,0.694],[1,1]] },
            vents: { visible: true, pipeGrad: ['#1a2b38','#2d3e4a','#1e303d','#0f1f2a'], topFill: '#0f1f2a', crackColor: 'rgba(255, 107, 44, 0.67)', crackGlow: '#ff6b2c', crackWidth: 3, crack2Color: 'rgba(255, 154, 60, 0.9)', pipes: [{x:0.113,y:0.521,wTop:0.013,wBot:0.013,h:0.174},{x:0.193,y:0.562,wTop:0.011,wBot:0.011,h:0.153}], cracks: [[0.062,0.764],[0.094,0.806],[0.117,0.778],[0.156,0.833],[0.195,0.806],[0.234,0.861]], cracks2: [[0.158,0.706],[0.186,0.740],[0.216,0.731]] },
            fog: { visible: true, color0: 'rgba(10, 31, 46, 0.85)', color1: 'rgba(13, 47, 66, 0.4)', color2: 'rgba(13, 47, 66, 0)' },
            vignette: { visible: true, color0: 'rgba(2, 10, 16, 0.5)', color1: 'rgba(2, 10, 16, 0)' },
            jellyfish: { visible: true, x: 0.65, y: 0.22, radiusX: 70, radiusY: 55, bobSpeed: 0.4, bobAmp: 12, breatheSpeed: 0.8, breatheAmp: 0.06, glowColor: '#6bffe8', glowBlur: 20, bodyGrad: ['rgba(168, 255, 240, 0.85)','rgba(107, 255, 232, 0.6)','rgba(77, 232, 214, 0.2)'], tentacleCount: 5, tentacleSpacing: 14, tentacleLenMin: 90, tentacleLenMax: 130, tentacleWaveFreqMin: 0.8, tentacleWaveFreqMax: 1.4, tentacleWaveAmpMin: 6, tentacleWaveAmpMax: 10 },
            particles: { visible: true, count: 30, vxMin: -0.075, vxMax: 0.075, vyMin: -0.1, vyMax: 0, rMin: 0.8, rMax: 2.6, alphaMin: 0.2, alphaMax: 0.7, blinkFreqMin: 0.3, blinkFreqMax: 1.8, colors: ['#4de8d6','#6bffe8','#a8fff0'] },
            magma: { visible: true, countPerVent: 25, vxMin: -0.2, vxMax: 0.2, vyMin: -1.1, vyMax: -0.3, rMin: 0.5, rMax: 1.5, maxRMin: 2, maxRMax: 5, decayMin: 0.003, decayMax: 0.005, ventIntensity: [1, 0.7] },
            glints: { visible: true, count: 40, rMin: 1.5, rMax: 4, alphaMin: 0.3, alphaMax: 0.7, freqMin: 0.5, freqMax: 1.5 },
            mountains: { visible: true, farBaseY: 0.5, farRoughness: 80, farOpacity: 0.6, midBaseY: 0.58, midRoughness: 60, midOpacity: 0.8, steps: 20, swaySpeed: 0.15, swayAmp: 2, farPoints: [[0.001,0.381],[0.078,0.377],[0.121,0.429],[0.150,0.444],[0.200,0.472],[0.250,0.435],[0.302,0.414],[0.359,0.382],[0.411,0.436],[0.483,0.371],[0.513,0.310],[0.553,0.327],[0.600,0.398],[0.628,0.358],[0.699,0.355],[0.755,0.406],[0.800,0.370],[0.850,0.333],[0.900,0.356],[0.950,0.319],[1,0.347]], midPoints: [[0,0.636],[0.05,0.546],[0.1,0.569],[0.15,0.528],[0.2,0.550],[0.25,0.514],[0.3,0.536],[0.35,0.495],[0.4,0.517],[0.45,0.476],[0.5,0.498],[0.55,0.458],[0.6,0.480],[0.65,0.439],[0.7,0.462],[0.75,0.421],[0.8,0.443],[0.85,0.403],[0.9,0.425],[0.95,0.384],[1,0.407]] },
            layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
        };
    }

    // ==================== 辅助：从配置获取绝对坐标 ====================
    _px(rx) { return rx * this.w; }
    _py(ry) { return ry * this.h; }
    _point(pt) { return { x: pt[0] * this.w, y: pt[1] * this.h }; }

    // ==================== 动态元素创建 ====================
    _createJellyfish() {
        const c = this.cfg.jellyfish;
        const tc = c.tentacleCount;
        const half = Math.floor(tc / 2);
        return {
            x: this._px(c.x),
            y: this._py(c.y),
            baseY: this._py(c.y),
            radiusX: c.radiusX,
            radiusY: c.radiusY,
            phase: 0,
            tentacles: Array.from({ length: tc }, (_, i) => ({
                offsetX: (i - half) * c.tentacleSpacing,
                length: c.tentacleLenMin + Math.random() * (c.tentacleLenMax - c.tentacleLenMin),
                waveFreq: c.tentacleWaveFreqMin + Math.random() * (c.tentacleWaveFreqMax - c.tentacleWaveFreqMin),
                waveAmp: c.tentacleWaveAmpMin + Math.random() * (c.tentacleWaveAmpMax - c.tentacleWaveAmpMin),
                phase: Math.random() * Math.PI * 2,
            })),
        };
    }

    _createParticles() {
        const c = this.cfg.particles;
        return Array.from({ length: c.count }, () => ({
            x: Math.random() * this.w,
            y: Math.random() * this.h,
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
        const c = this.cfg.magma;
        const pipes = this.cfg.vents.pipes;
        const particles = [];
        pipes.forEach((pipe, idx) => {
            const ventX = this._px(pipe.x);
            const ventY = this._py(pipe.y);
            const intensity = c.ventIntensity[idx] ?? 1;
            for (let i = 0; i < c.countPerVent; i++) {
                particles.push({
                    ventX, ventY,
                    x: ventX + (Math.random() - 0.5) * 10,
                    y: ventY + Math.random() * 5,
                    vx: c.vxMin + Math.random() * (c.vxMax - c.vxMin),
                    vy: c.vyMin + Math.random() * (c.vyMax - c.vyMin),
                    life: Math.random(),
                    decay: c.decayMin + Math.random() * (c.decayMax - c.decayMin),
                    r: c.rMin + Math.random() * (c.rMax - c.rMin),
                    maxR: c.maxRMin + Math.random() * (c.maxRMax - c.maxRMin),
                    intensity,
                });
            }
        });
        return particles;
    }

    _getRiverPath() {
        return this.cfg.river.path.map(pt => this._point(pt));
    }

    _createRiverGlints() {
        const c = this.cfg.glints;
        const path = this._getRiverPath();
        const glints = [];
        for (let i = 0; i < c.count; i++) {
            const t = Math.random();
            const pos = this._getPointOnPath(path, t);
            glints.push({
                t,
                offsetY: (Math.random() - 0.5) * 20,
                r: c.rMin + Math.random() * (c.rMax - c.rMin),
                phase: Math.random() * Math.PI * 2,
                freq: c.freqMin + Math.random() * (c.freqMax - c.freqMin),
                alpha: c.alphaMin + Math.random() * (c.alphaMax - c.alphaMin),
            });
        }
        return glints;
    }

    _getPointOnPath(path, t) {
        const idx = t * (path.length - 1);
        const i = Math.floor(idx);
        const f = idx - i;
        if (i >= path.length - 1) return path[path.length - 1];
        const a = path[i], b = path[i + 1];
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }

    _createMountains() {
        const c = this.cfg.mountains;
        return {
            far: this._generateMountainLine(c.farBaseY, c.farRoughness, c.farOpacity, c.farPoints),
            mid: this._generateMountainLine(c.midBaseY, c.midRoughness, c.midOpacity, c.midPoints),
        };
    }

    _generateMountainLine(baseY, roughness, opacity, pointsCfg) {
        if (pointsCfg && pointsCfg.length > 0) {
            const points = pointsCfg.map(pt => ({
                x: this._px(pt[0]),
                y: this._py(pt[1]),
            }));
            return { points, opacity };
        }
        // fallback random
        const points = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            points.push({
                x: (i / steps) * this.w,
                y: this._py(baseY) - Math.random() * roughness - (i % 3 === 0 ? 30 : 0),
            });
        }
        return { points, opacity };
    }

    // ==================== 静态层渲染（只执行一次） ====================
    _renderStatic() {
        const ctx = this.sCtx;
        const w = this.w, h = this.h;

        // 1. 深海背景
        const bg = this.cfg.background;
        if (bg.visible) {
            const bgGrad = ctx.createRadialGradient(this._px(bg.centerX), this._py(bg.centerY), 0, this._px(bg.centerX), this._py(bg.centerY), h * bg.radius);
            bgGrad.addColorStop(0, bg.color0);
            bgGrad.addColorStop(0.4, bg.color1);
            bgGrad.addColorStop(1, bg.color2);
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. 环境光晕
        const amb = this.cfg.ambient;
        if (amb.visible) {
            const ambGrad = ctx.createRadialGradient(this._px(amb.centerX), this._py(amb.centerY), 0, this._px(amb.centerX), this._py(amb.centerY), h * amb.radius);
            ambGrad.addColorStop(0, amb.color0);
            ambGrad.addColorStop(1, amb.color1);
            ctx.fillStyle = ambGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // 3. 发光河流（静态基底）
        const rv = this.cfg.river;
        if (rv.visible) {
            ctx.save();
            ctx.shadowColor = rv.shadowColor;
            ctx.shadowBlur = rv.shadowBlur;
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
            ctx.strokeStyle = rv.stroke0;
            ctx.lineWidth = rv.width0;
            ctx.stroke();
            ctx.strokeStyle = rv.stroke1;
            ctx.lineWidth = rv.width1;
            ctx.stroke();
            ctx.restore();
        }

        // 4. 左侧岩石 + 热液烟囱
        if (this.cfg.leftRock.visible) this._drawLeftRock(ctx);
        if (this.cfg.vents.visible) this._drawVents(ctx);

        // 5. 右侧前景岩石
        if (this.cfg.rightRock.visible) this._drawRightRock(ctx);

        // 6. 迷雾层
        const fog = this.cfg.fog;
        if (fog.visible) {
            const fogGrad = ctx.createLinearGradient(0, h, 0, 0);
            fogGrad.addColorStop(0, fog.color0);
            fogGrad.addColorStop(0.4, fog.color1);
            fogGrad.addColorStop(1, fog.color2);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // 7. 顶部暗角
        const vig = this.cfg.vignette;
        if (vig.visible) {
            const vigGrad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
            vigGrad.addColorStop(0, vig.color0);
            vigGrad.addColorStop(1, vig.color1);
            ctx.fillStyle = vigGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // 8. 自定义形状（编辑器导出的 shapes）
        const shapes = this.cfg.shapes;
        if (shapes && shapes.length > 0) {
            for (const s of shapes) {
                if (s.visible === false) continue;
                this._drawShape(ctx, s);
            }
        }
    }

    // ==================== 自定义形状渲染 ====================
    _drawShape(ctx, s) {
        const w = this.w, h = this.h;
        ctx.save();
        if (s.opacity !== undefined && s.opacity < 1) {
            ctx.globalAlpha = s.opacity;
        }
        if (s.blendMode && s.blendMode !== 'source-over') {
            ctx.globalCompositeOperation = s.blendMode;
        }

        // 填充和描边
        if (s.fill && s.fill !== 'none') {
            ctx.fillStyle = s.fill;
        }
        if (s.stroke && s.stroke !== 'none') {
            ctx.strokeStyle = s.stroke;
            ctx.lineWidth = s.strokeWidth || 1;
        }

        // 应用 glow 特效（通过 shadow 实现）
        if (s.effects && s.effects.length > 0) {
            const glow = s.effects.find(e => e.type === 'glow');
            if (glow) {
                ctx.shadowColor = glow.color || '#4a9ede';
                ctx.shadowBlur = glow.blur || 20;
            }
        }

        // 旋转
        if (s.rotation && s.rotation !== 0) {
            const bounds = this._getShapeBounds(s);
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate(s.rotation * Math.PI / 180);
            ctx.translate(-cx, -cy);
        }

        switch (s.type) {
            case 'path':
            case 'polyline':
                this._drawPathShape(ctx, s);
                break;
            case 'polygon':
                this._drawPolygonShape(ctx, s);
                break;
            case 'rectangle':
                this._drawRectShape(ctx, s);
                break;
            case 'circle':
                this._drawCircleShape(ctx, s);
                break;
            case 'mountain':
            case 'rock':
                this._drawPointsShape(ctx, s);
                break;
            case 'particles':
                this._drawParticlesShape(ctx, s);
                break;
            default:
                // 兼容旧 data 格式
                if (s.data && s.data.length > 0) {
                    ctx.beginPath();
                    s.data.forEach((pt, i) => {
                        const px = pt[0] * w, py = pt[1] * h;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    });
                    if (s.closed) ctx.closePath();
                    if (s.fill && s.fill !== 'none' && s.closed) ctx.fill();
                    if (s.stroke && s.stroke !== 'none') ctx.stroke();
                }
                break;
        }
        ctx.restore();
    }

    _drawPathShape(ctx, s) {
        const pts = s.points || s.data;
        if (!pts || pts.length < 2) return;
        const w = this.w, h = this.h;

        ctx.beginPath();
        ctx.moveTo(pts[0][0] * w, pts[0][1] * h);

        if (pts.length === 2) {
            // 只有两个点，直线连接
            ctx.lineTo(pts[1][0] * w, pts[1][1] * h);
        } else {
            // 多个点，使用贝塞尔曲线
            const tw = s.tangentWeights;
            const th = s.tangentHandles;
            for (let i = 1; i < pts.length; i++) {
                const x0 = pts[i - 1][0] * w, y0 = pts[i - 1][1] * h;
                const x1 = pts[i][0] * w, y1 = pts[i][1] * h;

                let cp1x, cp1y, cp2x, cp2y;

                // 优先使用 tangentHandles（自由方向）
                if (th && th[i - 1]) {
                    cp1x = x0 + th[i - 1].dx * w;
                    cp1y = y0 + th[i - 1].dy * h;
                } else {
                    // 回退到 Catmull-Rom + weight
                    const w1 = (tw && tw[i - 1] !== undefined) ? tw[i - 1] : 0.5;
                    let tdx, tdy;
                    if (i - 2 >= 0) {
                        tdx = (pts[i][0] - pts[i - 2][0]) * w;
                        tdy = (pts[i][1] - pts[i - 2][1]) * h;
                    } else {
                        tdx = x1 - x0; tdy = y1 - y0;
                    }
                    cp1x = x0 + tdx * w1 / 2;
                    cp1y = y0 + tdy * w1 / 2;
                }

                if (th && th[i]) {
                    cp2x = x1 - th[i].dx * w;
                    cp2y = y1 - th[i].dy * h;
                } else {
                    const w2 = (tw && tw[i] !== undefined) ? tw[i] : 0.5;
                    let tdx2, tdy2;
                    if (i + 1 < pts.length) {
                        tdx2 = (pts[i + 1][0] - pts[i - 1][0]) * w;
                        tdy2 = (pts[i + 1][1] - pts[i - 1][1]) * h;
                    } else {
                        tdx2 = x1 - x0; tdy2 = y1 - y0;
                    }
                    cp2x = x1 - tdx2 * w2 / 2;
                    cp2y = y1 - tdy2 * w2 / 2;
                }

                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1, y1);
            }
        }

        if (s.closed) ctx.closePath();
        if (s.fill && s.fill !== 'none' && s.closed) ctx.fill();
        if (s.stroke && s.stroke !== 'none') ctx.stroke();
    }

    _drawPolygonShape(ctx, s) {
        const w = this.w, h = this.h;
        const pts = s.points || s.data;

        // 支持参数化多边形 (x, y, sides, radius)
        if ((!pts || pts.length === 0) && s.sides) {
            const cx = (s.x || 0.5) * w, cy = (s.y || 0.5) * h;
            const r = (s.radius || 0.2) * Math.min(w, h);
            const sides = s.sides || 6;
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            if (s.fill && s.fill !== 'none') ctx.fill();
            if (s.stroke && s.stroke !== 'none') ctx.stroke();
            return;
        }

        if (!pts || pts.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
        }
        ctx.closePath();
        if (s.fill && s.fill !== 'none') ctx.fill();
        if (s.stroke && s.stroke !== 'none') ctx.stroke();
    }

    _drawRectShape(ctx, s) {
        const w = this.w, h = this.h;
        const x = (s.x || 0) * w, y = (s.y || 0) * h;
        const rw = (s.rectW || s.width || 0.1) * w, rh = (s.rectH || s.height || 0.1) * h;
        const cr = s.cornerRadius || 0;
        ctx.beginPath();
        if (cr > 0) {
            ctx.roundRect(x, y, rw, rh, cr);
        } else {
            ctx.rect(x, y, rw, rh);
        }
        if (s.fill && s.fill !== 'none') ctx.fill();
        if (s.stroke && s.stroke !== 'none') ctx.stroke();
    }

    _drawCircleShape(ctx, s) {
        const w = this.w, h = this.h;
        const cx = (s.cx || s.x || 0.5) * w, cy = (s.cy || s.y || 0.5) * h;

        // 支持椭圆（radiusX/radiusY）和正圆（radius）
        const rx = s.radiusX ? s.radiusX * w : (s.radius || 0.05) * Math.min(w, h);
        const ry = s.radiusY ? s.radiusY * h : rx;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (s.fill && s.fill !== 'none') ctx.fill();
        if (s.stroke && s.stroke !== 'none') ctx.stroke();
    }

    _drawPointsShape(ctx, s) {
        const pts = s.points || s.data;
        if (!pts || pts.length === 0) return;
        const w = this.w, h = this.h;
        ctx.beginPath();
        ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
        }
        if (s.closed !== false) ctx.closePath();
        if (s.fill && s.fill !== 'none') ctx.fill();
        if (s.stroke && s.stroke !== 'none') ctx.stroke();
    }

    _drawParticlesShape(ctx, s) {
        const w = this.w, h = this.h;
        const cx = (s.x || 0.5) * w, cy = (s.y || 0.5) * h;
        const spread = (s.spread || 0.5) * Math.min(w, h);
        const count = s.count || 30;
        const colors = s.colors || ['#4de8d6'];

        // 使用固定伪随机（基于形状ID）确保渲染稳定
        const seed = (s.id || '0').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const rand = (i) => {
            const x = Math.sin(seed + i * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        ctx.save();
        if (s.blendMode) {
            ctx.globalCompositeOperation = s.blendMode;
        } else {
            ctx.globalCompositeOperation = 'screen';
        }

        for (let i = 0; i < count; i++) {
            const angle = rand(i) * Math.PI * 2;
            const dist = rand(i + 100) * spread;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            const r = (s.particleSizeMin || 1) + rand(i + 200) * ((s.particleSizeMax || 3) - (s.particleSizeMin || 1));
            const alpha = (s.particleAlphaMin || 0.3) + rand(i + 300) * ((s.particleAlphaMax || 0.7) - (s.particleAlphaMin || 0.3));
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

    _getShapeBounds(s) {
        const pts = s.points || s.data || [];
        if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pt of pts) {
            const px = pt[0] * this.w, py = pt[1] * this.h;
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    _drawLeftRock(ctx) {
        const w = this.w, h = this.h;
        const c = this.cfg.leftRock;
        // 填充
        if (c.fill.mode === 'radial') {
            const grad = ctx.createRadialGradient(w * c.fill.cx, h * c.fill.cy, 0, w * c.fill.cx, h * c.fill.cy, w * c.fill.r);
            c.fill.stops.forEach(s => grad.addColorStop(s.pos, s.color));
            ctx.fillStyle = grad;
        } else if (c.fill.mode === 'linear') {
            const angle = (c.fill.angle || 0) * Math.PI / 180;
            const x0 = w * 0.5 - Math.cos(angle) * w * 0.5;
            const y0 = h * 0.5 - Math.sin(angle) * h * 0.5;
            const x1 = w * 0.5 + Math.cos(angle) * w * 0.5;
            const y1 = h * 0.5 + Math.sin(angle) * h * 0.5;
            const grad = ctx.createLinearGradient(x0, y0, x1, y1);
            c.fill.stops.forEach(s => grad.addColorStop(s.pos, s.color));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = c.fill.color || '#0f222e';
        }
        ctx.beginPath();
        const pts = c.points.map(pt => this._point(pt));
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fill();

        // 高光边缘
        const hi = c.highlight;
        if (hi && hi.visible !== false && hi.points && hi.points.length > 0) {
            ctx.strokeStyle = hi.color;
            ctx.lineWidth = hi.width || 2;
            ctx.beginPath();
            const hpts = hi.points.map(pt => this._point(pt));
            ctx.moveTo(hpts[0].x, hpts[0].y);
            for (let i = 1; i < hpts.length; i++) ctx.lineTo(hpts[i].x, hpts[i].y);
            ctx.stroke();
        }
    }

    _drawVents(ctx) {
        const w = this.w, h = this.h;
        const c = this.cfg.vents;
        c.pipes.forEach(pipe => {
            const x = this._px(pipe.x);
            const y = this._py(pipe.y);
            const wTop = this._px(pipe.wTop);
            const wBot = this._px(pipe.wBot);
            const hh = this._py(pipe.h);
            const grad = ctx.createLinearGradient(x - wTop, 0, x + wTop, 0);
            c.pipeGrad.forEach((col, i) => grad.addColorStop(i / (c.pipeGrad.length - 1), col));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x - wBot, y + hh);
            ctx.lineTo(x - wTop, y);
            ctx.lineTo(x + wTop, y);
            ctx.lineTo(x + wBot, y + hh);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = c.topFill;
            ctx.beginPath();
            ctx.ellipse(x, y, wTop, h * 0.008, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // 岩浆裂缝
        if (c.cracks && c.cracks.length > 0) {
            ctx.save();
            ctx.shadowColor = c.crackGlow;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = c.crackColor;
            ctx.lineWidth = c.crackWidth || 2;
            ctx.beginPath();
            const cp = c.cracks.map(pt => this._point(pt));
            ctx.moveTo(cp[0].x, cp[0].y);
            for (let i = 1; i < cp.length; i++) ctx.lineTo(cp[i].x, cp[i].y);
            ctx.stroke();
            if (c.cracks2 && c.cracks2.length > 0) {
                ctx.strokeStyle = c.crack2Color;
                ctx.lineWidth = (c.crackWidth || 2) * 0.75;
                ctx.beginPath();
                const cp2 = c.cracks2.map(pt => this._point(pt));
                ctx.moveTo(cp2[0].x, cp2[0].y);
                for (let i = 1; i < cp2.length; i++) ctx.lineTo(cp2[i].x, cp2[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    _drawRightRock(ctx) {
        const c = this.cfg.rightRock;
        const pts = c.points.map(pt => this._point(pt));
        if (c.fill.mode === 'linear') {
            const angle = (c.fill.angle || 0) * Math.PI / 180;
            const x0 = this.w * 0.5 - Math.cos(angle) * this.w * 0.5;
            const y0 = this.h * 0.5 - Math.sin(angle) * this.h * 0.5;
            const x1 = this.w * 0.5 + Math.cos(angle) * this.w * 0.5;
            const y1 = this.h * 0.5 + Math.sin(angle) * this.h * 0.5;
            const grad = ctx.createLinearGradient(x0, y0, x1, y1);
            c.fill.stops.forEach(s => grad.addColorStop(s.pos, s.color));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = c.fill.color || '#0a1c26';
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fill();
    }

    // ==================== 动态渲染（每帧调用） ====================
    update(dt) {
        this.t += dt;
        const cj = this.cfg.jellyfish;
        if (cj.visible) {
            const j = this.jellyfish;
            j.y = j.baseY + Math.sin(this.t * cj.bobSpeed) * cj.bobAmp;
            j.phase += dt * 1.2;
        }

        const cp = this.cfg.particles;
        if (cp.visible) {
            for (const p of this.particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) p.x = this.w + 10;
                if (p.x > this.w + 10) p.x = -10;
                if (p.y < -10) p.y = this.h + 10;
                if (p.y > this.h + 10) p.y = -10;
            }
        }

        const cm = this.cfg.magma;
        if (cm.visible) {
            for (const p of this.magmaParticles) {
                p.x += p.vx + Math.sin(this.t * 2 + p.life * 10) * 0.3;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) {
                    p.life = 1;
                    p.x = p.ventX + (Math.random() - 0.5) * 8;
                    p.y = p.ventY;
                    p.vx = cm.vxMin + Math.random() * (cm.vxMax - cm.vxMin);
                    p.vy = cm.vyMin + Math.random() * (cm.vyMax - cm.vyMin);
                }
            }
        }

        const cg = this.cfg.glints;
        if (cg.visible) {
            for (const g of this.riverGlints) {
                g.phase += dt * g.freq;
            }
        }
    }

    draw(ctx) {
        // 1. 绘制静态层
        ctx.drawImage(this.staticCanvas, 0, 0);

        // 2. 远景山脉微视差
        if (this.cfg.mountains.visible) this._drawMountains(ctx);

        // 3. 河流微光流动
        if (this.cfg.glints.visible) this._drawRiverGlints(ctx);

        // 4. 热液喷发
        if (this.cfg.magma.visible) this._drawMagmaParticles(ctx);

        // 5. 水母
        if (this.cfg.jellyfish.visible) this._drawJellyfish(ctx);

        // 6. 深海荧光微粒
        if (this.cfg.particles.visible) this._drawParticles(ctx);
    }

    _drawMountains(ctx) {
        const c = this.cfg.mountains;
        const sway = Math.sin(this.t * c.swaySpeed) * c.swayAmp;
        ctx.save();
        ctx.translate(sway, 0);
        ctx.fillStyle = `rgba(10, 31, 46, ${this.mountains.far.opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, this.h);
        this.mountains.far.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.w, this.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawRiverGlints(ctx) {
        const path = this._getRiverPath();
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const g of this.riverGlints) {
            const pos = this._getPointOnPath(path, g.t);
            const alpha = g.alpha * (0.5 + 0.5 * Math.sin(g.phase));
            const r = g.r * (0.8 + 0.2 * Math.sin(g.phase * 1.3));
            ctx.fillStyle = `rgba(168, 255, 240, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y + g.offsetY, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawMagmaParticles(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const p of this.magmaParticles) {
            const alpha = p.life * p.intensity;
            const r = p.r + (1 - p.life) * (p.maxR - p.r);
            const warm = Math.floor(255 * p.life);
            ctx.fillStyle = `rgba(255, ${Math.floor(100 + warm * 0.6)}, ${Math.floor(60 * p.life)}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawJellyfish(ctx) {
        const j = this.jellyfish;
        const c = this.cfg.jellyfish;
        const breathe = 1 + Math.sin(this.t * c.breatheSpeed) * c.breatheAmp;
        ctx.save();
        ctx.translate(j.x, j.y);
        ctx.scale(breathe, breathe);

        // 外发光
        ctx.save();
        ctx.shadowColor = c.glowColor;
        ctx.shadowBlur = c.glowBlur;
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, j.radiusX);
        glowGrad.addColorStop(0, 'rgba(168, 255, 240, 0.4)');
        glowGrad.addColorStop(0.5, 'rgba(107, 255, 232, 0.15)');
        glowGrad.addColorStop(1, 'rgba(77, 232, 214, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, j.radiusX, j.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 触手
        for (let i = 0; i < j.tentacles.length; i++) {
            const t = j.tentacles[i];
            ctx.save();
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(107, 255, 232, 0.45)' : 'rgba(168, 255, 240, 0.55)';
            ctx.lineWidth = i % 2 === 0 ? 2.5 : 2;
            ctx.beginPath();
            ctx.moveTo(t.offsetX, 15);
            const segs = 8;
            for (let s = 1; s <= segs; s++) {
                const sy = 15 + (t.length * s) / segs;
                const wave = Math.sin(this.t * t.waveFreq + t.phase + s * 0.5) * t.waveAmp * (s / segs);
                ctx.lineTo(t.offsetX + wave, sy);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 触手微光点
        for (let i = 0; i < j.tentacles.length; i++) {
            const t = j.tentacles[i];
            const sy = 15 + t.length * 0.6;
            const wave = Math.sin(this.t * t.waveFreq + t.phase + 3) * t.waveAmp * 0.6;
            ctx.fillStyle = 'rgba(168, 255, 240, 0.6)';
            ctx.beginPath();
            ctx.arc(t.offsetX + wave, sy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 伞盖
        const bodyGrad = ctx.createLinearGradient(0, -j.radiusY, 0, 22);
        c.bodyGrad.forEach((col, i) => bodyGrad.addColorStop(i / (c.bodyGrad.length - 1), col));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.bezierCurveTo(-35, -35, -20, -55, 0, -55);
        ctx.bezierCurveTo(20, -55, 35, -35, 35, 0);
        ctx.bezierCurveTo(35, 10, 20, 22, 0, 22);
        ctx.bezierCurveTo(-20, 22, -35, 10, -35, 0);
        ctx.closePath();
        ctx.fill();

        // 伞盖纹理
        ctx.strokeStyle = 'rgba(168, 255, 240, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-20, -10);
        ctx.quadraticCurveTo(-10, -25, 0, -30);
        ctx.quadraticCurveTo(10, -25, 20, -10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(-5, -15, 0, -20);
        ctx.quadraticCurveTo(5, -15, 15, 0);
        ctx.stroke();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(-10, -35, 8, 4, -0.26, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawParticles(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (const p of this.particles) {
            const alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(this.t * p.blinkFreq + p.blinkPhase));
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
