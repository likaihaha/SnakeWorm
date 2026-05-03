/**
 * ZoneDecorations - 海底生态边界墙系统
 *
 * 功能：
 * 1. 顶部边界墙：密封无缺口，水母、珊瑚礁、海葵等生态元素，隔绝上下区域
 * 2. 侧边尖刺：col=0 全左边界 / col=4 全右边界，密布随机参差尖刺
 * 3. 互动沙层：第一层(row=4, zone 1-5)底部，碰沙喷粒子+沙形改变
 * 4. 原有主题装饰元素保留
 *
 * ★ 所有装饰造型集中在此文件，方便后续编辑器修改 ★
 * 配置区在文件顶部（DECOR_CONFIG / DECOR_THEMES / DECOR_SHAPES / DECOR_LAYOUT）
 * 渲染逻辑在下方 ZoneDecorations 类中
 */

import { CONFIG } from './config.js';
import { FloatingText, Particle } from './entities.js';

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     可编辑配置区域                                ║
// ╚══════════════════════════════════════════════════════════════════╝

/**
 * 全局参数 — 调整屏障尺寸、伤害等
 */
export const DECOR_CONFIG = {
    // --- 顶部屏障（密封无缺口，加厚） ---
    TOP_BARRIER_HEIGHT: 65,       // 顶部屏障高度（像素，加厚）
    TOP_GAP_WIDTH: 0,             // 通道宽度（0 = 密封无缺口）

    // --- 侧边尖刺 ---
    SIDE_SPIKE_WIDTH: 45,         // 侧边尖刺碰撞区域宽度（像素，加深）

    // --- 伤害参数 ---
    DAMAGE_INTERVAL: 0.8,         // 伤害间隔（秒）
    DAMAGE: 1,                    // 每次伤害（失去节数）
    PUSH_FORCE: 3,                // 推开力度（像素/帧）

    // --- col=0 左侧密布尖刺区域 ---
    LEFT_SPIKE_ZONES: [1, 6, 10, 11, 16, 20, 21],

    // --- col=4 右侧密布尖刺区域 ---
    RIGHT_SPIKE_ZONES: [5, 6, 10, 15, 16, 20, 25],

    // --- 沙层参数 ---
    SAND_HEIGHT: 35,              // 沙层高度（像素）
    SAND_PARTICLE_COUNT: 8,       // 碰撞时喷出粒子数
    SAND_PARTICLE_SPEED: 4,       // 粒子喷射速度
    SAND_PARTICLE_LIFE: 0.6,      // 粒子寿命（秒）
    SAND_PARTICLE_SIZE: 2.5,      // 粒子大小
    SAND_DEFORM_RADIUS: 40,      // 沙面形变半径
    SAND_DEFORM_DEPTH: 12,       // 沙面形变最大深度
    SAND_DEFORM_DECAY: 0.02,     // 形变恢复速度（每帧）

    // --- 第一层区域ID（row=4, zone 1-5） ---
    FIRST_LAYER_ZONES: [1, 2, 3, 4, 5],
};

/**
 * 主题颜色 — 每种区域主题的装饰配色
 * 编辑这里可以改变特定主题下所有装饰的颜色
 */
export const DECOR_THEMES = {
    forest: {
        reef: '#1a3a1a', coral: '#2d7a3d', anemone: '#4ecca3',
        jelly: '#7aff9d', urchin: '#3a6a2a',
        spike: '#3a5a2a', spikeTip: '#8aff6a', glow: '#4ecca3',
        sand: '#5a8a3a', sandLight: '#7aaa5a', sandDark: '#3a6a2a', sandParticle: '#8aff6a',
    },
    cave: {
        reef: '#1a1a2e', coral: '#3a3a6e', anemone: '#4dabf7',
        jelly: '#6b8aff', urchin: '#2a2a5e',
        spike: '#2a2a4e', spikeTip: '#7a6aff', glow: '#4dabf7',
        sand: '#3a3a5e', sandLight: '#5a5a7e', sandDark: '#2a2a4e', sandParticle: '#7a6aff',
    },
    crystal: {
        reef: '#2d1b4e', coral: '#6a3aae', anemone: '#c77dff',
        jelly: '#e0aaff', urchin: '#4a2a7e',
        spike: '#4a2a6e', spikeTip: '#da6aff', glow: '#c77dff',
        sand: '#4a2a7e', sandLight: '#6a4a9e', sandDark: '#3a1a5e', sandParticle: '#da6aff',
    },
    lava: {
        reef: '#3a1a1a', coral: '#8a3a2a', anemone: '#ff6b35',
        jelly: '#ffaa44', urchin: '#6a2a1a',
        spike: '#5a2a1a', spikeTip: '#ff6a3a', glow: '#ff6b35',
        sand: '#6a3a1a', sandLight: '#8a5a3a', sandDark: '#4a2a0a', sandParticle: '#ff6a3a',
    },
    void: {
        reef: '#0a0a15', coral: '#2a2a4e', anemone: '#c7ceea',
        jelly: '#8888cc', urchin: '#1a1a3e',
        spike: '#1a1a3e', spikeTip: '#aaaadd', glow: '#c7ceea',
        sand: '#1a1a3e', sandLight: '#3a3a5e', sandDark: '#0a0a2e', sandParticle: '#aaaadd',
    },
    final: {
        reef: '#1a0a2e', coral: '#5a2a5e', anemone: '#ff6b6b',
        jelly: '#ffd700', urchin: '#3a1a4e',
        spike: '#3a1a3e', spikeTip: '#ffaa00', glow: '#ffd700',
        sand: '#3a1a4e', sandLight: '#5a3a6e', sandDark: '#2a0a3e', sandParticle: '#ffaa00',
    },
    default: {
        reef: '#0f1923', coral: '#2a4a3a', anemone: '#4ecca3',
        jelly: '#6bffe8', urchin: '#2a3a2a',
        spike: '#2a3a2a', spikeTip: '#6affaa', glow: '#4ecca3',
        sand: '#2a4a3a', sandLight: '#4a6a5a', sandDark: '#1a3a2a', sandParticle: '#6affaa',
    },
};

/**
 * 装饰元素形状参数 — 调整这些值可以改变每种装饰的外观
 */
export const DECOR_SHAPES = {
    jellyfish: {
        bellW: 18, bellH: 12,       // 伞盖宽/高
        tentacleCount: 4,            // 触手数量
        tentacleLen: 22,             // 触手长度
        glowBlur: 8,                 // 发光模糊半径
    },
    coral: {
        height: 30,                  // 高度
        baseW: 10,                   // 底部宽度
        branchCount: 3,              // 分支数量
        branchAngle: 0.5,            // 分支角度（弧度）
    },
    anemone: {
        baseR: 8,                    // 底座半径
        tentacleCount: 7,            // 触手数量
        tentacleLen: 25,             // 触手长度
        waveSpeed: 1.5,              // 摆动速度
        waveAmp: 4,                  // 摆动幅度
    },
    seaUrchin: {
        radius: 10,                  // 半径
        spikeCount: 10,              // 尖刺数量
        spikeLen: 7,                 // 尖刺长度
    },
    spike: {
        baseW: 14,                   // 底部宽度（略小，更密集）
        barbCount: 2,                // 倒刺数量
        barbLen: 5,                  // 倒刺长度
    },
    denseSpike: {
        baseWMin: 6,                 // 密刺最小底部宽度
        baseWMax: 14,                // 密刺最大底部宽度
        heightMin: 18,               // 密刺最小高度
        heightMax: 55,               // 密刺最大高度（参差不齐）
    },
};

/**
 * 区域布局配置 — 每个区域的装饰元素分布
 */
export const DECOR_LAYOUT = {
    topBarrier: {
        elementCount: { min: 6, max: 12 },
        elementTypes: ['coral', 'anemone', 'jellyfish', 'seaUrchin'],
    },
    sideSpikes: {
        spikeCount: { min: 12, max: 20 },   // 密布更多尖刺
        heightRange: { min: 18, max: 55 },   // 高度范围更大（参差不齐）
    },
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     工具函数                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

/** 确定性伪随机（LCG，基于种子，保证同区域每次生成一样） */
function seededRandom(seed) {
    let s = Math.abs(seed) || 1;
    return () => {
        s = (s * 1664525 + 1013904223) & 0x7FFFFFFF;
        return s / 0x7FFFFFFF;
    };
}

function getThemeColors(theme) {
    return DECOR_THEMES[theme] || DECOR_THEMES.default;
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     沙层粒子                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

class SandParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
        const speed = DECOR_CONFIG.SAND_PARTICLE_SPEED * (0.5 + Math.random());
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 2;
        this.gravity = 18 + Math.random() * 12;
        this.life = DECOR_CONFIG.SAND_PARTICLE_LIFE * (0.6 + Math.random() * 0.4);
        this.maxLife = this.life;
        this.size = DECOR_CONFIG.SAND_PARTICLE_SIZE * (0.5 + Math.random());
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 8;
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        this.rotation += this.rotSpeed * dt;
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        const s = this.size * (0.5 + 0.5 * alpha);
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     互动沙层                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

class SandLayer {
    constructor(zoneId, zone, colors) {
        this.zoneId = zoneId;
        this.zone = zone;
        this.colors = colors;
        this.sandY = zone.y + zone.height - DECOR_CONFIG.SAND_HEIGHT;
        this.particles = [];
        this.deformations = [];     // { x, depth, age } — 沙面形变点
        this.sandPoints = [];       // 沙面上的固定采样点
        this._generateSurface();
    }

    _generateSurface() {
        const rand = seededRandom(this.zoneId * 777 + 333);
        const z = this.zone;
        const step = 12;
        this.sandPoints = [];
        for (let x = z.x; x <= z.x + z.width; x += step) {
            this.sandPoints.push({
                x,
                baseY: this.sandY + rand() * 6 - 3,
                offsetY: 0,
            });
        }
    }

    update(dt) {
        // 更新粒子
        let w = 0;
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].update(dt)) {
                this.particles[w++] = this.particles[i];
            }
        }
        this.particles.length = w;

        // 恢复形变
        for (const d of this.deformations) {
            d.depth *= (1 - DECOR_CONFIG.SAND_DEFORM_DECAY);
        }
        this.deformations = this.deformations.filter(d => d.depth > 0.5);

        // 计算每个采样点的形变偏移
        for (const pt of this.sandPoints) {
            let totalOff = 0;
            for (const d of this.deformations) {
                const dx = Math.abs(pt.x - d.x);
                if (dx < DECOR_CONFIG.SAND_DEFORM_RADIUS) {
                    const factor = 1 - dx / DECOR_CONFIG.SAND_DEFORM_RADIUS;
                    totalOff += d.depth * factor * factor;
                }
            }
            pt.offsetY = totalOff;
        }
    }

    /**
     * 检查虫虫是否碰到沙层并触发布料反应
     * @returns {{ hit: boolean, particles: SandParticle[] } | null}
     */
    checkWormCollision(worm) {
        if (!worm || !worm.isAlive || !worm.head) return null;
        const head = worm.head;
        const sr = CONFIG.SEGMENT_RADIUS;
        const z = this.zone;

        // 检查头部是否在沙层区域内
        if (head.x < z.x || head.x > z.x + z.width) return null;
        if (head.y < this.sandY - sr) return null;

        const hit = head.y + sr > this.sandY;
        if (!hit) return null;

        // 添加形变
        const deformDepth = Math.min(
            DECOR_CONFIG.SAND_DEFORM_DEPTH,
            (head.y + sr - this.sandY) * 0.8
        );
        this.deformations.push({
            x: head.x,
            depth: deformDepth,
            age: 0,
        });

        // 产生喷射粒子
        const newParticles = [];
        const pc = DECOR_CONFIG.SAND_PARTICLE_COUNT;
        const colors = this.colors;
        for (let i = 0; i < pc; i++) {
            newParticles.push(new SandParticle(
                head.x + (Math.random() - 0.5) * 20,
                this.sandY + (Math.random() - 0.5) * 5,
                Math.random() > 0.5 ? colors.sandParticle : colors.sandLight
            ));
        }
        this.particles.push(...newParticles);

        return { hit: true, particles: newParticles };
    }

    draw(ctx) {
        const cfg = DECOR_CONFIG;
        const z = this.zone;
        const c = this.colors;

        ctx.save();

        // 绘制沙面波浪线（带形变）
        ctx.fillStyle = c.sand;
        ctx.beginPath();
        ctx.moveTo(z.x, z.y + z.height);

        for (const pt of this.sandPoints) {
            ctx.lineTo(pt.x, pt.baseY + pt.offsetY);
        }

        ctx.lineTo(z.x + z.width, z.y + z.height);
        ctx.closePath();
        ctx.fill();

        // 沙面高光线
        ctx.strokeStyle = c.sandLight;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < this.sandPoints.length; i++) {
            const pt = this.sandPoints[i];
            if (i === 0) ctx.moveTo(pt.x, pt.baseY + pt.offsetY);
            else ctx.lineTo(pt.x, pt.baseY + pt.offsetY);
        }
        ctx.stroke();

        // 沙面深色阴影
        ctx.strokeStyle = c.sandDark;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        for (let i = 0; i < this.sandPoints.length; i++) {
            const pt = this.sandPoints[i];
            if (i === 0) ctx.moveTo(pt.x, pt.baseY + pt.offsetY + 3);
            else ctx.lineTo(pt.x, pt.baseY + pt.offsetY + 3);
        }
        ctx.stroke();

        ctx.globalAlpha = 1;

        // 沙面纹理（小点）
        const rand = seededRandom(this.zoneId * 555);
        ctx.fillStyle = c.sandDark;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 30; i++) {
            const sx = z.x + rand() * z.width;
            const sy = this.sandY + 5 + rand() * (cfg.SAND_HEIGHT - 10);
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + rand() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // 绘制沙粒粒子
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     ZoneDecorations 类                           ║
// ╚══════════════════════════════════════════════════════════════════╝

export class ZoneDecorations {
    constructor(zoneManager) {
        this.zm = zoneManager;
        this.cache = new Map();      // zoneId -> { topElements, leftSpikes, rightSpikes }
        this.time = 0;
        this.damageTimers = new Map(); // worm -> { key: timer }
        this.sandLayers = new Map();   // zoneId -> SandLayer
    }

    update(dt) {
        this.time += dt;
        for (const [, timers] of this.damageTimers) {
            for (const k in timers) {
                if (timers[k] > 0) timers[k] -= dt;
            }
        }
        // 更新沙层
        for (const [, sand] of this.sandLayers) {
            sand.update(dt);
        }
    }

    // ==================== 生成 ====================

    _ensureDecor(zoneId) {
        if (this.cache.has(zoneId)) return;
        const zone = this.zm.zones[zoneId - 1];
        if (!zone) return;

        const rand = seededRandom(zoneId * 137 + 42);
        const cfg = DECOR_CONFIG;
        const layout = DECOR_LAYOUT;
        const decor = { topElements: [], leftSpikes: [], rightSpikes: [] };

        // --- 顶部屏障元素（密封，铺满整个区域宽度） ---
        const topCfg = layout.topBarrier;
        const count = Math.floor(topCfg.elementCount.min + rand() * (topCfg.elementCount.max - topCfg.elementCount.min));

        for (let i = 0; i < count; i++) {
            const type = topCfg.elementTypes[Math.floor(rand() * topCfg.elementTypes.length)];
            const x = zone.x + 30 + rand() * (zone.width - 60);
            const y = zone.y + cfg.TOP_BARRIER_HEIGHT * (0.25 + rand() * 0.5);
            const size = 0.6 + rand() * 0.6;
            decor.topElements.push({ type, x, y, size, phase: rand() * Math.PI * 2 });
        }

        // --- 侧边密布尖刺（col=0 左侧 / col=4 右侧） ---
        const sideCfg = layout.sideSpikes;
        const makeDenseSpikes = () => {
            const n = Math.floor(sideCfg.spikeCount.min + rand() * (sideCfg.spikeCount.max - sideCfg.spikeCount.min));
            const arr = [];
            const startY = zone.y + cfg.TOP_BARRIER_HEIGHT + 10;
            const endY = zone.y + zone.height - (cfg.FIRST_LAYER_ZONES.includes(zoneId) ? cfg.SAND_HEIGHT + 10 : 10);
            const span = endY - startY;

            for (let i = 0; i < n; i++) {
                arr.push({
                    y: startY + (i / n) * span + rand() * (span / n) * 0.4,
                    height: sideCfg.heightRange.min + rand() * (sideCfg.heightRange.max - sideCfg.heightRange.min),
                    baseW: DECOR_SHAPES.denseSpike.baseWMin + rand() * (DECOR_SHAPES.denseSpike.baseWMax - DECOR_SHAPES.denseSpike.baseWMin),
                    phase: rand() * Math.PI * 2,
                });
            }
            return arr;
        };

        if (cfg.LEFT_SPIKE_ZONES.includes(zoneId)) decor.leftSpikes = makeDenseSpikes();
        if (cfg.RIGHT_SPIKE_ZONES.includes(zoneId)) decor.rightSpikes = makeDenseSpikes();

        this.cache.set(zoneId, decor);

        // --- 初始化第一层沙层 ---
        if (cfg.FIRST_LAYER_ZONES.includes(zoneId) && !this.sandLayers.has(zoneId)) {
            const colors = getThemeColors(zone.theme);
            this.sandLayers.set(zoneId, new SandLayer(zoneId, zone, colors));
        }
    }

    // ==================== 绘制 ====================

    /** 绘制所有可见区域的装饰（在世界坐标系下调用） */
    draw(ctx) {
        for (const zone of this.zm.zones) {
            this._ensureDecor(zone.id);
            const decor = this.cache.get(zone.id);
            if (!decor) continue;
            const colors = getThemeColors(zone.theme);
            this._drawZone(ctx, zone, decor, colors);
        }

        // 绘制沙层（在装饰之上）
        for (const [, sand] of this.sandLayers) {
            sand.draw(ctx);
        }
    }

    _drawZone(ctx, zone, decor, colors) {
        const t = this.time;

        // 顶部屏障（密封无缺口）
        this._drawTopBarrier(ctx, zone, decor, colors, t);

        // 侧边密布尖刺
        if (decor.leftSpikes.length > 0) this._drawDenseSpikes(ctx, zone, decor.leftSpikes, 'left', colors, t);
        if (decor.rightSpikes.length > 0) this._drawDenseSpikes(ctx, zone, decor.rightSpikes, 'right', colors, t);
    }

    // --- 顶部屏障（密封） ---
    _drawTopBarrier(ctx, zone, decor, colors, t) {
        const cfg = DECOR_CONFIG;
        const bh = cfg.TOP_BARRIER_HEIGHT;

        ctx.save();

        // 礁石基底（完整覆盖，无缺口）
        this._drawReefBase(ctx, zone.x, zone.y, zone.width, bh, colors, zone.id);

        // 装饰元素
        for (const e of decor.topElements) {
            this._drawElement(ctx, e, colors, t);
        }

        ctx.restore();
    }

    _drawReefBase(ctx, x, y, w, h, colors, seed) {
        if (w < 10) return;
        const rand = seededRandom(seed);

        // 主体
        ctx.fillStyle = colors.reef;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        const steps = Math.max(8, Math.floor(w / 12));
        for (let i = 0; i <= steps; i++) {
            const px = x + (i / steps) * w;
            const py = y + h * (0.2 + 0.5 * rand()) + Math.sin(i * 1.5) * 3;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();

        // 暗色底部（加厚效果）
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y + h * 0.55, w, h * 0.45);

        // 边缘纹理线
        ctx.strokeStyle = colors.coral;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 3; i++) {
            const ly = y + h * (0.15 + i * 0.2);
            ctx.beginPath();
            for (let j = 0; j <= steps; j++) {
                const px = x + (j / steps) * w;
                const py = ly + Math.sin(j * 2.1 + i) * 2;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // --- 密布侧边尖刺（参差不齐） ---
    _drawDenseSpikes(ctx, zone, spikes, side, colors, t) {
        const sc = DECOR_SHAPES.spike;
        const ds = DECOR_SHAPES.denseSpike;
        const baseX = side === 'left' ? zone.x : zone.x + zone.width;
        const dir = side === 'left' ? 1 : -1;

        ctx.save();
        for (const sp of spikes) {
            const sway = Math.sin(t * 0.5 + sp.phase) * 1.2;
            const h = sp.height;
            const bw = sp.baseW;

            ctx.save();
            ctx.translate(baseX, sp.y);

            // 主尖刺体
            ctx.fillStyle = colors.spike;
            ctx.beginPath();
            ctx.moveTo(0, -bw / 2);
            ctx.lineTo(dir * h + sway, 0);
            ctx.lineTo(0, bw / 2);
            ctx.closePath();
            ctx.fill();

            // 尖端高光
            ctx.fillStyle = colors.spikeTip;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(dir * h * 0.55, -bw * 0.25);
            ctx.lineTo(dir * h + sway, 0);
            ctx.lineTo(dir * h * 0.55, bw * 0.25);
            ctx.closePath();
            ctx.fill();

            // 小倒刺（每根都有）
            ctx.globalAlpha = 0.5;
            const barbCount = h > 30 ? 2 : 1;
            for (let b = 0; b < barbCount; b++) {
                const bx = dir * h * (0.3 + b * 0.2);
                const by = (b % 2 === 0 ? -1 : 1) * bw * 0.3;
                ctx.fillStyle = colors.spikeTip;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + dir * sc.barbLen, by + (b % 2 === 0 ? -sc.barbLen : sc.barbLen));
                ctx.lineTo(bx + dir * 2, by);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
        ctx.restore();
    }

    // --- 元素分发 ---
    _drawElement(ctx, e, colors, t) {
        switch (e.type) {
            case 'jellyfish': this._drawSmallJellyfish(ctx, e.x, e.y, e.size, t + e.phase, colors); break;
            case 'coral':     this._drawCoral(ctx, e.x, e.y, e.size, t + e.phase, colors); break;
            case 'anemone':   this._drawAnemone(ctx, e.x, e.y, e.size, t + e.phase, colors); break;
            case 'seaUrchin': this._drawSeaUrchin(ctx, e.x, e.y, e.size, t + e.phase, colors); break;
        }
    }

    // --- 小水母 ---
    _drawSmallJellyfish(ctx, x, y, size, t, c) {
        const s = DECOR_SHAPES.jellyfish;
        const bobY = Math.sin(t * 0.5) * 3;
        const br = 1 + Math.sin(t * 0.8) * 0.08;

        ctx.save();
        ctx.translate(x, y + bobY);
        ctx.scale(br * size, br * size);

        // 发光
        ctx.shadowColor = c.glow;
        ctx.shadowBlur = s.glowBlur;

        // 伞盖
        ctx.fillStyle = c.jelly;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.bellW / 2, s.bellH / 2, 0, Math.PI, 0);
        ctx.quadraticCurveTo(s.bellW / 2, s.bellH / 2 + 3, 0, s.bellH / 2 + 3);
        ctx.quadraticCurveTo(-s.bellW / 2, s.bellH / 2 + 3, -s.bellW / 2, 0);
        ctx.fill();

        // 触手
        ctx.shadowBlur = 0;
        ctx.strokeStyle = c.jelly;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.4;
        const half = Math.floor(s.tentacleCount / 2);
        for (let i = 0; i < s.tentacleCount; i++) {
            const tx = (i - half) * 4;
            const wave = Math.sin(t * 1.3 + i * 0.9) * 3;
            ctx.beginPath();
            ctx.moveTo(tx, s.bellH / 2 + 3);
            ctx.quadraticCurveTo(tx + wave, s.bellH / 2 + 12, tx + wave * 0.5, s.tentacleLen);
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- 珊瑚 ---
    _drawCoral(ctx, x, y, size, t, c) {
        const s = DECOR_SHAPES.coral;
        const sway = Math.sin(t * 0.4) * 1.5;

        ctx.save();
        ctx.translate(x + sway, y);
        ctx.scale(size, size);

        // 主干
        ctx.fillStyle = c.coral;
        ctx.beginPath();
        ctx.moveTo(-s.baseW / 2, 0);
        ctx.quadraticCurveTo(-s.baseW / 3, -s.height * 0.5, -2, -s.height);
        ctx.lineTo(2, -s.height);
        ctx.quadraticCurveTo(s.baseW / 3, -s.height * 0.5, s.baseW / 2, 0);
        ctx.closePath();
        ctx.fill();

        // 分支
        ctx.strokeStyle = c.coral;
        ctx.lineCap = 'round';
        for (let i = 0; i < s.branchCount; i++) {
            const by = -s.height * (0.3 + i * 0.22);
            const dir = i % 2 === 0 ? 1 : -1;
            const blen = s.height * 0.35;
            const ba = dir * s.branchAngle + Math.sin(t * 0.5 + i) * 0.1;

            ctx.lineWidth = 2.5 - i * 0.3;
            ctx.beginPath();
            ctx.moveTo(0, by);
            ctx.lineTo(Math.sin(ba) * blen, by - Math.cos(ba) * blen);
            ctx.stroke();

            // 分支顶端圆点
            ctx.fillStyle = c.anemone;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.arc(Math.sin(ba) * blen, by - Math.cos(ba) * blen, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = c.coral;
        }

        ctx.restore();
    }

    // --- 海葵 ---
    _drawAnemone(ctx, x, y, size, t, c) {
        const s = DECOR_SHAPES.anemone;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size, size);

        // 底座
        ctx.fillStyle = c.urchin;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.baseR, s.baseR * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 触手
        ctx.lineCap = 'round';
        for (let i = 0; i < s.tentacleCount; i++) {
            const angle = (i / s.tentacleCount) * Math.PI - Math.PI / 2;
            const wave = Math.sin(t * s.waveSpeed + i * 0.8) * s.waveAmp;
            const len = s.tentacleLen * (0.8 + 0.2 * Math.sin(i * 1.3));
            const tipX = Math.cos(angle) * len + wave;
            const tipY = Math.sin(angle) * len - len * 0.5;
            const cpX = Math.cos(angle) * len * 0.5 + wave * 0.5;
            const cpY = Math.sin(angle) * len * 0.5 - len * 0.3;

            ctx.strokeStyle = c.anemone;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * s.baseR * 0.5, Math.sin(angle) * s.baseR * 0.3);
            ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
            ctx.stroke();

            // 触手顶端亮点
            ctx.fillStyle = c.anemone;
            ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 2 + i);
            ctx.beginPath();
            ctx.arc(tipX, tipY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // --- 海胆 ---
    _drawSeaUrchin(ctx, x, y, size, t, c) {
        const s = DECOR_SHAPES.seaUrchin;
        const pulse = 1 + Math.sin(t * 1.2) * 0.05;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size * pulse, size * pulse);

        // 身体
        ctx.fillStyle = c.urchin;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // 尖刺
        ctx.strokeStyle = c.spikeTip;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < s.spikeCount; i++) {
            const a = (i / s.spikeCount) * Math.PI * 2 + t * 0.15;
            const len = s.spikeLen * (0.8 + 0.2 * Math.sin(t + i));
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * s.radius * 0.45, Math.sin(a) * s.radius * 0.45);
            ctx.lineTo(Math.cos(a) * (s.radius + len), Math.sin(a) * (s.radius + len));
            ctx.stroke();
        }

        ctx.restore();
    }

    // ==================== 碰撞检测 ====================

    /**
     * 检查虫虫与装饰屏障的碰撞
     * @returns {{ hit, damage, text, color } | null}
     */
    checkWormCollision(worm) {
        if (!worm || !worm.isAlive || !worm.head) return null;
        if (worm.invincibleTimer > 0) return null;

        const head = worm.head;
        const sr = CONFIG.SEGMENT_RADIUS;
        const cfg = DECOR_CONFIG;

        const zone = this.zm.getZoneAt(head.x, head.y);
        if (!zone) return null;

        this._ensureDecor(zone.id);
        const decor = this.cache.get(zone.id);
        if (!decor) return null;

        let hit = false;
        let pushX = 0, pushY = 0;
        let hitType = '';

        // --- 顶部屏障（密封无缺口） ---
        const bh = cfg.TOP_BARRIER_HEIGHT;

        if (head.y - sr < zone.y + bh && head.y > zone.y - 5) {
            const overlap = zone.y + bh - (head.y - sr);
            if (overlap > 0) {
                hit = true;
                pushY = Math.max(overlap, cfg.PUSH_FORCE);
                hitType = 'top';
            }
        }

        // --- 左侧密布尖刺 ---
        if (decor.leftSpikes.length > 0) {
            const sw = cfg.SIDE_SPIKE_WIDTH;
            if (head.x - sr < zone.x + sw && head.x > zone.x - 5) {
                const overlap = zone.x + sw - (head.x - sr);
                if (overlap > 0) {
                    hit = true;
                    pushX = Math.max(overlap, cfg.PUSH_FORCE);
                    hitType = 'left';
                }
            }
        }

        // --- 右侧密布尖刺 ---
        if (decor.rightSpikes.length > 0) {
            const sw = cfg.SIDE_SPIKE_WIDTH;
            const re = zone.x + zone.width;
            if (head.x + sr > re - sw && head.x < re + 5) {
                const overlap = (head.x + sr) - (re - sw);
                if (overlap > 0) {
                    hit = true;
                    pushX = -Math.max(overlap, cfg.PUSH_FORCE);
                    hitType = 'right';
                }
            }
        }

        if (!hit) return null;

        // 推开整个虫虫
        for (const seg of worm.segments) {
            seg.x += pushX;
            seg.y += pushY;
        }

        // 周期伤害
        if (!this.damageTimers.has(worm)) this.damageTimers.set(worm, {});
        const timers = this.damageTimers.get(worm);
        const key = hitType + zone.id;

        if (!timers[key] || timers[key] <= 0) {
            timers[key] = cfg.DAMAGE_INTERVAL;
            const colors = getThemeColors(zone.theme);
            const result = { hit: true, damage: true, text: '', color: '' };
            if (hitType === 'top') { result.text = '\u{1FAB8} \u7901\u77F3!'; result.color = colors.coral; }
            else { result.text = '\u26A1 \u5C16\u523A!'; result.color = colors.spikeTip; }
            return result;
        }

        return { hit: true, damage: false };
    }

    /**
     * 检查虫虫与沙层的碰撞（不造成伤害，只触发布料效果）
     * @returns {{ hit: boolean } | null}
     */
    checkSandCollision(worm) {
        if (!worm || !worm.isAlive || !worm.head) return null;
        const head = worm.head;
        const zone = this.zm.getZoneAt(head.x, head.y);
        if (!zone) return null;

        this._ensureDecor(zone.id);
        const sand = this.sandLayers.get(zone.id);
        if (!sand) return null;

        return sand.checkWormCollision(worm);
    }
}
