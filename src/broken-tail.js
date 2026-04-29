import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba } from './utils.js';
import { Worm } from './worm.js';

export class BrokenTail {
    constructor(segments, originalColor, parentWorm) {
        this.segments = segments.map(s => new Vector(s.x, s.y));
        this.originalColor = originalColor;
        this.newColor = CONFIG.SPLIT_COLORS[Math.floor(Math.random() * CONFIG.SPLIT_COLORS.length)];
        this.parentWorm = parentWorm;  // 保存父代引用

        this.colorTimer = CONFIG.SPLIT_COLOR_DURATION;
        this.growHeadTimer = CONFIG.SPLIT_GROW_HEAD_TIME;
        this.totalTimer = CONFIG.SPLIT_INVINCIBLE_TIME;

        this.colorProgress = 0;
        this.hasNewHead = false;
        this.isFinished = false;
        this.flashPhase = 0;

        // 壁虎断尾正弦波跳动
        this.wavePhase = Math.random() * Math.PI * 2;  // 随机初始相位
        this.waveAmplitude = 3.5;  // 跳动幅度（像素）
        this.waveFrequency = 8;    // 跳动频率（适中，持续扭动）
        this.waveDecay = 0.9995;   // 衰减系数（极慢，9秒后仍有~77%幅度）
        this.originalPositions = segments.map(s => ({ x: s.x, y: s.y }));  // 保存原始位置
    }

    update(dt) {
        if (this.isFinished) return true;

        this.colorTimer -= dt;
        this.growHeadTimer -= dt;
        this.totalTimer -= dt;
        this.flashPhase += dt * 8;

        // 正弦波跳动：持续的横向扭动（壁虎断尾效果）
        this.wavePhase += dt * this.waveFrequency;
        this.waveAmplitude *= Math.pow(this.waveDecay, dt * 60);  // 按帧衰减
        // 每段施加不同相位的正弦偏移（从头到尾波浪传递）
        for (let i = 0; i < this.segments.length; i++) {
            const t = i / Math.max(1, this.segments.length - 1);  // 0→1
            const phaseOffset = t * Math.PI * 2;  // 尾部相位延迟（完整波长传递）
            // 主波 + 次波叠加，模拟有机扭动
            const mainWave = Math.sin(this.wavePhase + phaseOffset) * this.waveAmplitude;
            const subWave = Math.sin(this.wavePhase * 1.7 + phaseOffset * 0.6) * this.waveAmplitude * 0.4;
            const offset = (mainWave + subWave) * (0.2 + 0.8 * t);  // 尾部幅度更大
            // 垂直于原始连线方向偏移（简化：用x方向偏移模拟左右抖动）
            this.segments[i].x = this.originalPositions[i].x + offset;
            this.segments[i].y = this.originalPositions[i].y + Math.sin(this.wavePhase * 0.5 + phaseOffset) * this.waveAmplitude * 0.25 * t;
        }

        if (this.colorTimer <= 0) {
            this.colorProgress = 1;
        } else {
            this.colorProgress = 1 - (this.colorTimer / CONFIG.SPLIT_COLOR_DURATION);
        }

        if (!this.hasNewHead && this.growHeadTimer <= 0) {
            this.hasNewHead = true;
        }

        if (this.totalTimer <= 0) {
            this.isFinished = true;
        }

        return this.isFinished;
    }

    getCurrentColor() {
        return this.interpolateColor(this.originalColor, this.newColor, this.colorProgress);
    }

    interpolateColor(from, to, t) {
        const r1 = parseInt(from.slice(1, 3), 16);
        const g1 = parseInt(from.slice(3, 5), 16);
        const b1 = parseInt(from.slice(5, 7), 16);
        const r2 = parseInt(to.slice(1, 3), 16);
        const g2 = parseInt(to.slice(3, 5), 16);
        const b2 = parseInt(to.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }

    draw(ctx) {
        const color = this.getCurrentColor();
        const flashIntensity = Math.sin(this.flashPhase) * 0.5 + 0.5;
        const flashAlpha = 0.3 + flashIntensity * 0.7;

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const isHead = i === 0;
            const r = CONFIG.SEGMENT_RADIUS;  // 身体大小始终不变

            ctx.beginPath();
            ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);

            if (isHead && this.hasNewHead) {
                ctx.fillStyle = color;
            } else {
                ctx.fillStyle = hexToRgba(color, flashAlpha * 0.8);
            }

            ctx.fill();

            if (isHead && this.hasNewHead) {
                this.drawEyes(ctx, seg, color);
            }
        }
    }

    drawEyes(ctx, headPos, color) {
        const dir = this.segments.length > 1
            ? this.segments[0].sub(this.segments[1]).normalize()
            : new Vector(1, 0);

        const angle = Math.atan2(dir.y, dir.x);
        const eyeOffset = 3, eyeRadius = 2.5;
        const a1 = angle - 0.5, a2 = angle + 0.5;

        const e1 = new Vector(headPos.x + Math.cos(a1) * eyeOffset, headPos.y + Math.sin(a1) * eyeOffset);
        const e2 = new Vector(headPos.x + Math.cos(a2) * eyeOffset, headPos.y + Math.sin(a2) * eyeOffset);

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e1.x, e1.y, eyeRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2.x, e2.y, eyeRadius, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(e1.x, e1.y, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2.x, e2.y, 1, 0, Math.PI * 2); ctx.fill();
    }

    spawnWorm(parentWorm) {
        if (this.segments.length < 3) return null;

        const headPos = this.segments[0];
        const newLength = this.segments.length;

        const worm = new Worm(headPos.x, headPos.y, newLength, this.newColor, false);
        for (let i = 0; i < this.segments.length && i < worm.segments.length; i++) {
            worm.segments[i] = new Vector(this.segments[i].x, this.segments[i].y);
        }
        worm.targetLength = newLength;

        if (this.segments.length > 1) {
            worm.velocity = this.segments[0].sub(this.segments[1]).normalize();
        }

        worm.activationTimer = 10.0;
        worm.invincibleTimer = 10.0;

        // 设置为幼体
        worm.isJuvenile = true;
        worm.parentWorm = parentWorm;

        return worm;
    }
}
