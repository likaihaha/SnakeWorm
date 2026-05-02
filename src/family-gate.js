/**
 * FamilyGate - 家族门系统
 * Phase 3: 羁绊深度
 * 特定位置的障碍门，需要 N 只成年后代靠近才能打开
 */
import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba, drawGlow } from './utils.js';

export class FamilyGate {
    /**
     * @param {number} x - 门的中心位置X
     * @param {number} y - 门的中心位置Y
     * @param {number} required - 需要的成年后代数量
     * @param {string} label - 门的名称
     */
    constructor(x, y, required = 2, label = '家族门') {
        this.pos = new Vector(x, y);
        this.required = required;
        this.label = label;
        this.isOpen = false;
        this.openProgress = 0; // 0~1 开门动画进度
        this.doorWidth = 60;
        this.doorHeight = 120;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.nearbyAdults = 0; // 附近成年后代数量
        this.unlockFlash = 0; // 解锁闪光
        this.discoveredByPlayer = false; // 玩家是否已发现此门
    }

    update(dt, allWorms) {
        this.pulsePhase += dt * 2;
        if (this.unlockFlash > 0) this.unlockFlash -= dt * 2;

        if (this.isOpen) {
            // 开门动画：缓缓打开
            this.openProgress = Math.min(1, this.openProgress + dt * 0.5);
            return;
        }

        // 统计附近的成年后代
        this.nearbyAdults = 0;
        for (const worm of allWorms) {
            if (!worm.isAlive) continue;
            if (!worm.isAdult) continue;
            const d = worm.head ? worm.head.dist(this.pos) : Infinity;
            if (d < CONFIG.FAMILY.FAMILY_GATE_RADIUS) {
                this.nearbyAdults++;
            }
        }

        // 检查是否达到开门条件
        if (this.nearbyAdults >= this.required) {
            this.isOpen = true;
            this.unlockFlash = 1.0;
        }
    }

    /**
     * 检测是否阻挡某只虫虫通过
     * @param {Worm} worm
     * @returns {boolean} true=被阻挡
     */
    isBlocking(worm) {
        if (this.isOpen) return false;
        if (!worm.head) return false;
        const dx = worm.head.x - this.pos.x;
        const dy = worm.head.y - this.pos.y;
        const halfW = this.doorWidth / 2;
        const halfH = this.doorHeight / 2;
        return Math.abs(dx) < halfW + 15 && Math.abs(dy) < halfH + 15;
    }

    /**
     * 检查玩家是否在门附近（用于显示提示）
     */
    isPlayerNearby(player) {
        if (!player || !player.head) return false;
        return player.head.dist(this.pos) < 150;
    }

    draw(ctx, gameTime) {
        const x = this.pos.x;
        const y = this.pos.y;
        const halfW = this.doorWidth / 2;
        const halfH = this.doorHeight / 2;

        if (this.isOpen) {
            // 开门动画：两扇门向两侧滑开
            const slide = this.openProgress * halfW;
            ctx.save();
            // 左门
            ctx.fillStyle = hexToRgba('#4dabf7', 0.3 * (1 - this.openProgress));
            ctx.fillRect(x - halfW - slide, y - halfH, halfW, this.doorHeight);
            // 右门
            ctx.fillRect(x + slide, y - halfH, halfW, this.doorHeight);
            // 光柱
            if (this.openProgress < 1) {
                ctx.globalCompositeOperation = 'screen';
                drawGlow(ctx, x, y, 50, '#4dabf7', (1 - this.openProgress) * 20);
            }
            ctx.restore();
            return;
        }

        // 未开门：画藤蔓/能量墙
        const pulse = 0.6 + 0.2 * Math.sin(this.pulsePhase);

        ctx.save();
        // 门框
        ctx.strokeStyle = `rgba(77, 171, 247, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - halfW, y - halfH, this.doorWidth, this.doorHeight);

        // 门体填充（半透明蓝）
        ctx.fillStyle = `rgba(77, 171, 247, ${pulse * 0.25})`;
        ctx.fillRect(x - halfW, y - halfH, this.doorWidth, this.doorHeight);

        // 门上的藤蔓纹理
        ctx.strokeStyle = `rgba(100, 200, 150, ${pulse * 0.4})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const vineY = y - halfH + 20 + i * 35;
            ctx.beginPath();
            ctx.moveTo(x - halfW, vineY);
            ctx.quadraticCurveTo(x, vineY + 15 * Math.sin(this.pulsePhase + i), x + halfW, vineY);
            ctx.stroke();
        }

        // 门上的锁图标和需求提示
        const iconSize = 8;
        const iconY = y - 5;
        ctx.fillStyle = `rgba(255, 230, 109, ${pulse})`;
        // 画锁形状
        ctx.beginPath();
        ctx.arc(x, iconY - 4, iconSize * 0.7, Math.PI, 0, false);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 230, 109, ${pulse})`;
        ctx.fillRect(x - iconSize * 0.7, iconY - 2, iconSize * 1.4, iconSize);

        // 需求数字
        const progressColor = this.nearbyAdults >= this.required ? '#44ff44' : '#ffe66d';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = progressColor;
        ctx.fillText(`${this.nearbyAdults}/${this.required}`, x, iconY + iconSize + 12);

        ctx.restore();

        // 解锁闪光
        if (this.unlockFlash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            drawGlow(ctx, x, y, 60 + this.unlockFlash * 40, '#ffe66d', this.unlockFlash * 25);
            ctx.restore();
        }
    }

    /**
     * 绘制门附近的提示文字
     */
    drawHint(ctx, player) {
        if (this.isOpen) return;
        if (!this.isPlayerNearby(player)) return;

        const x = this.pos.x;
        const y = this.pos.y - this.doorHeight / 2 - 25;

        ctx.save();
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
        ctx.fillText(this.label, x, y);
        ctx.fillStyle = 'rgba(255, 230, 109, 0.7)';
        ctx.fillText(`需要 ${this.required} 只成年后代`, x, y + 14);
        ctx.restore();
    }
}
