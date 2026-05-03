/**
 * Barrier - 区域间墙壁障碍门
 * Phase B: 门系统
 * 
 * 在区域边界放置墙壁阻挡，条件满足后自动打开
 * 视觉风格随主题变化（藤蔓/岩石/能量墙/冰墙/虚空墙）
 */
import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba, drawGlow } from './utils.js';
import { GATE_TYPE } from './zone-manager.js';

// 门视觉主题
const BARRIER_THEMES = {
    forest:  { color: '#4ecca3', wallColor: '#2d6b4f', particleColor: '#a8e6cf', label: '🌿 藤蔓墙' },
    cave:    { color: '#4dabf7', wallColor: '#2d4a6b', particleColor: '#74c0fc', label: '🪨 岩石墙' },
    crystal: { color: '#c77dff', wallColor: '#4a2d6b', particleColor: '#d0bfff', label: '💎 水晶墙' },
    lava:    { color: '#ff6b6b', wallColor: '#6b2d2d', particleColor: '#ffa8a8', label: '🔥 熔岩墙' },
    void:    { color: '#c7ceea', wallColor: '#2d2d4a', particleColor: '#e8e8ff', label: '🌀 能量墙' },
    final:   { color: '#ffe66d', wallColor: '#6b5a2d', particleColor: '#fff3a0', label: '⭐ 星光墙' },
    default: { color: '#4ecca3', wallColor: '#2d4a3a', particleColor: '#a8e6cf', label: '🔒 能量墙' },
};

export class Barrier {
    /**
     * @param {number} x - 门中心X
     * @param {number} y - 门中心Y
     * @param {number} width - 门宽度
     * @param {number} height - 门高度
     * @param {number} targetZoneId - 目标区域ID（门后面的区域）
     * @param {string} theme - 视觉主题
     * @param {string} gateType - 门条件类型
     * @param {number} gateThreshold - 条件阈值
     */
    constructor(x, y, width, height, targetZoneId, theme = 'default', gateType = GATE_TYPE.NONE, gateThreshold = 0) {
        this.pos = new Vector(x, y);
        this.width = width;
        this.height = height;
        this.targetZoneId = targetZoneId;
        this.theme = BARRIER_THEMES[theme] || BARRIER_THEMES.default;
        this.gateType = gateType;
        this.gateThreshold = gateThreshold;
        this.isOpen = false;
        this.openProgress = 0;  // 0~1 开门动画
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.particles = [];  // 粒子效果
        this.playerNear = false;
        this.hintAlpha = 0;  // 提示文字透明度（平滑过渡）
    }

    update(dt, playerState, zoneManager) {
        this.pulsePhase += dt * 2;

        // 平滑提示透明度
        const targetAlpha = this.playerNear ? 1 : 0;
        this.hintAlpha += (targetAlpha - this.hintAlpha) * Math.min(1, dt * 5);

        if (this.isOpen) {
            this.openProgress = Math.min(1, this.openProgress + dt * 0.5);
            // 开门后粒子消散
            this._updateParticles(dt);
            return;
        }

        // 检查开门条件
        const check = zoneManager ? zoneManager.canEnterNextZone(this.targetZoneId - 1, playerState) : { canEnter: true };
        if (check.canEnter) {
            this.isOpen = true;
        }

        // 粒子效果
        this._updateParticles(dt);
        // 生成新粒子
        if (Math.random() < dt * 3) {
            this.particles.push({
                x: this.pos.x + (Math.random() - 0.5) * this.width,
                y: this.pos.y + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 20,
                vy: -Math.random() * 30 - 10,
                life: 1.0,
                size: Math.random() * 3 + 1,
            });
        }
    }

    _updateParticles(dt) {
        let w = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life > 0) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                this.particles[w++] = p;
            }
        }
        this.particles.length = w;
    }

    /**
     * 检测是否阻挡某只虫虫
     */
    isBlocking(worm) {
        if (this.isOpen && this.openProgress >= 0.8) return false;
        if (!worm.head) return false;
        const dx = Math.abs(worm.head.x - this.pos.x);
        const dy = Math.abs(worm.head.y - this.pos.y);
        return dx < this.width / 2 + 12 && dy < this.height / 2 + 12;
    }

    /**
     * 检查玩家是否在附近
     */
    checkPlayerNear(player) {
        if (!player || !player.head) { this.playerNear = false; return; }
        this.playerNear = player.head.dist(this.pos) < 200;
    }

    draw(ctx, gameTime) {
        const x = this.pos.x;
        const y = this.pos.y;
        const hw = this.width / 2;
        const hh = this.height / 2;

        if (this.isOpen) {
            // 开门：两扇墙向两侧滑开
            const slide = this.openProgress * (hw + 20);
            ctx.save();
            ctx.globalAlpha = 1 - this.openProgress;

            // 左墙
            ctx.fillStyle = this.theme.wallColor;
            ctx.fillRect(x - hw - slide, y - hh, hw, this.height);
            // 右墙
            ctx.fillRect(x + slide, y - hh, hw, this.height);

            // 能量线
            const pulse = 0.5 + 0.3 * Math.sin(this.pulsePhase);
            ctx.strokeStyle = hexToRgba(this.theme.color, pulse * (1 - this.openProgress));
            ctx.lineWidth = 2;
            ctx.strokeRect(x - hw - slide, y - hh, hw, this.height);
            ctx.strokeRect(x + slide, y - hh, hw, this.height);

            ctx.globalAlpha = 1.0;
            ctx.restore();

            // 开门光柱
            if (this.openProgress < 0.5) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                drawGlow(ctx, x, y, 40 + (1 - this.openProgress) * 30, this.theme.color, (1 - this.openProgress * 2) * 15);
                ctx.restore();
            }
            return;
        }

        // 未开门：画墙壁
        const pulse = 0.5 + 0.2 * Math.sin(this.pulsePhase);

        ctx.save();

        // 墙体主体
        ctx.fillStyle = this.theme.wallColor;
        ctx.fillRect(x - hw, y - hh, this.width, this.height);

        // 能量边框
        ctx.strokeStyle = hexToRgba(this.theme.color, pulse);
        ctx.lineWidth = 2;
        ctx.strokeRect(x - hw, y - hh, this.width, this.height);

        // 中间能量线
        ctx.strokeStyle = hexToRgba(this.theme.color, pulse * 0.5);
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(x, y - hh);
        ctx.lineTo(x, y + hh);
        ctx.stroke();
        ctx.setLineDash([]);

        // 条件图标
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = hexToRgba(this.theme.color, 0.9);
        ctx.fillText(this.theme.label, x, y - 2);

        // 粒子
        for (const p of this.particles) {
            ctx.globalAlpha = p.life * 0.6;
            ctx.fillStyle = this.theme.particleColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }

    /**
     * 绘制靠近提示
     */
    drawHint(ctx, playerState, zoneManager) {
        if (this.hintAlpha < 0.01) return;
        if (this.isOpen) return;

        const x = this.pos.x;
        const y = this.pos.y - this.height / 2 - 30;

        ctx.save();
        ctx.globalAlpha = this.hintAlpha;

        // 背景
        const textWidth = 200;
        ctx.fillStyle = 'rgba(10, 15, 25, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x - textWidth / 2, y - 20, textWidth, 40, 6);
        ctx.fill();

        // 边框
        ctx.strokeStyle = hexToRgba(this.theme.color, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - textWidth / 2, y - 20, textWidth, 40, 6);
        ctx.stroke();

        // 条件文字
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.theme.color;

        const check = zoneManager ? zoneManager.canEnterNextZone(this.targetZoneId - 1, playerState) : { canEnter: true, reason: '' };
        ctx.fillText(this.theme.label, x, y - 4);
        ctx.fillStyle = check.canEnter ? '#44ff44' : 'rgba(200, 200, 200, 0.8)';
        ctx.fillText(check.reason, x, y + 12);

        ctx.restore();
    }
}

/**
 * 自动生成区域边界的 Barrier 列表
 * @param {ZoneManager} zoneManager
 * @returns {Barrier[]}
 */
export function generateBarriers(zoneManager) {
    const barriers = [];
    const zones = zoneManager.zones;

    for (let i = 0; i < zones.length - 1; i++) {
        const current = zones[i];
        const next = zones[i + 1];
        const theme = current.theme;

        // 只在有门条件的区域边界创建 Barrier
        if (next.gateType === GATE_TYPE.NONE) continue;
        // Phase E: 已通关区域的 Barrier 跳过（自动开启）
        if (next.status === 'completed') continue;

        // 计算两个区域之间的边界位置
        let bx, by, bw, bh;
        const dx = next.col - current.col;
        const dy = next.row - current.row;

        if (dx === 1) {
            // 右侧边界
            bx = current.x + current.width;
            by = current.y + current.height / 2;
            bw = 20;
            bh = 100;
        } else if (dx === -1) {
            // 左侧边界
            bx = current.x;
            by = current.y + current.height / 2;
            bw = 20;
            bh = 100;
        } else if (dy === 1) {
            // 下侧边界
            bx = current.x + current.width / 2;
            by = current.y + current.height;
            bw = 100;
            bh = 20;
        } else if (dy === -1) {
            // 上侧边界
            bx = current.x + current.width / 2;
            by = current.y;
            bw = 100;
            bh = 20;
        } else {
            continue; // 不相邻，跳过
        }

        barriers.push(new Barrier(
            bx, by, bw, bh,
            next.id,
            theme,
            next.gateType,
            next.gateThreshold
        ));
    }

    return barriers;
}
