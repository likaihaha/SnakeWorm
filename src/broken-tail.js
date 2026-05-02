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
        this.birthMethod = 'self-bite';  // 诞生方式，默认自噬

        this.colorTimer = CONFIG.SPLIT_COLOR_DURATION;       // 3秒颜色渐变
        this.growHeadTimer = CONFIG.SPLIT_GROW_HEAD_TIME;    // 2秒长头
        this.totalTimer = CONFIG.SPLIT_INVINCIBLE_TIME;      // 9秒总时长

        this.colorProgress = 0;
        this.hasNewHead = false;
        this.isFinished = false;
        this.flashPhase = 0;

        // 壁虎断尾正弦波跳动
        this.wavePhase = Math.random() * Math.PI * 2;
        this.waveAmplitude = 3.5;
        this.waveFrequency = 8;
        this.waveDecay = 0.9995;
        this.originalPositions = segments.map(s => ({ x: s.x, y: s.y }));

        // === 孵化动画状态机 ===
        // Phase: waving → converging → hatching → recognizing → done
        this.hatchPhase = 'waving';  // 当前孵化阶段
        this.hatchTimer = 0;         // 当前阶段计时器
        this.convergeDuration = 2.0;  // 收缩成光球 2秒（3~5s）
        this.hatchDuration = 1.0;     // 裂开探头 1秒（5~6s）
        this.recognizeDuration = 1.0; // 认亲闪光 1秒（6~7s）
        // 7秒后 isFinished → spawnWorm

        // 收缩中心点（断尾头部位置）
        this.convergeCenter = new Vector(segments[0].x, segments[0].y);
        // 收缩前保存各段位置
        this.convergeStartPositions = null;
        // 光球脉冲
        this.orbPulse = 0;
        // 裂开动画进度
        this.crackProgress = 0;
        // 探头缩放（从0.3弹跳到1.0）
        this.headScale = 0;
        // 认亲闪光强度
        this.flashBrightness = 0;
        // 转向母体的方向
        this.recognizeDir = null;
    }

    update(dt) {
        if (this.isFinished) return true;

        this.flashPhase += dt * 8;
        this.orbPulse += dt * 3;
        this.hatchTimer += dt;

        // === 阶段状态机 ===
        switch (this.hatchPhase) {
            case 'waving':
                this._updateWaving(dt);
                break;
            case 'converging':
                this._updateConverging(dt);
                break;
            case 'hatching':
                this._updateHatching(dt);
                break;
            case 'recognizing':
                this._updateRecognizing(dt);
                break;
        }

        return this.isFinished;
    }

    /** 阶段1：断尾扭动 + 颜色渐变（0~3秒） */
    _updateWaving(dt) {
        this.colorTimer -= dt;
        this.totalTimer -= dt;

        // 正弦波跳动
        this.wavePhase += dt * this.waveFrequency;
        this.waveAmplitude *= Math.pow(this.waveDecay, dt * 60);
        for (let i = 0; i < this.segments.length; i++) {
            const t = i / Math.max(1, this.segments.length - 1);
            const phaseOffset = t * Math.PI * 2;
            const mainWave = Math.sin(this.wavePhase + phaseOffset) * this.waveAmplitude;
            const subWave = Math.sin(this.wavePhase * 1.7 + phaseOffset * 0.6) * this.waveAmplitude * 0.4;
            const offset = (mainWave + subWave) * (0.2 + 0.8 * t);
            this.segments[i].x = this.originalPositions[i].x + offset;
            this.segments[i].y = this.originalPositions[i].y + Math.sin(this.wavePhase * 0.5 + phaseOffset) * this.waveAmplitude * 0.25 * t;
        }

        // 颜色进度
        if (this.colorTimer <= 0) {
            this.colorProgress = 1;
        } else {
            this.colorProgress = 1 - (this.colorTimer / CONFIG.SPLIT_COLOR_DURATION);
        }

        // 3秒后进入收缩阶段
        if (this.colorTimer <= 0) {
            this.hasNewHead = true;
            this.hatchPhase = 'converging';
            this.hatchTimer = 0;
            // 保存收缩起点位置
            this.convergeStartPositions = this.segments.map(s => ({ x: s.x, y: s.y }));
        }
    }

    /** 阶段2：收缩成光球（3~5秒） */
    _updateConverging(dt) {
        this.totalTimer -= dt;
        const progress = Math.min(1, this.hatchTimer / this.convergeDuration);

        // 各段向中心点收缩
        if (this.convergeStartPositions) {
            for (let i = 0; i < this.segments.length; i++) {
                const start = this.convergeStartPositions[i];
                // easeInOut 缓动
                const ease = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                this.segments[i].x = start.x + (this.convergeCenter.x - start.x) * ease;
                this.segments[i].y = start.y + (this.convergeCenter.y - start.y) * ease;
            }
        }

        // 收缩完成后进入裂开阶段
        if (progress >= 1) {
            this.hatchPhase = 'hatching';
            this.hatchTimer = 0;
        }
    }

    /** 阶段3：光球裂开 + 小虫探头（5~6秒） */
    _updateHatching(dt) {
        this.totalTimer -= dt;
        this.crackProgress = Math.min(1, this.hatchTimer / this.hatchDuration);

        // 探头缩放：用弹性缓动从0到1
        const t = this.crackProgress;
        // 弹跳效果：overshoot然后回弹
        this.headScale = t < 0.7
            ? (t / 0.7) * 1.3  // 快速放大到1.3
            : 1.3 - (t - 0.7) / 0.3 * 0.3;  // 回弹到1.0

        if (this.crackProgress >= 1) {
            this.headScale = 1.0;
            this.hatchPhase = 'recognizing';
            this.hatchTimer = 0;
            // 计算转向母体的方向
            if (this.parentWorm && this.parentWorm.isAlive && this.parentWorm.head) {
                this.recognizeDir = this.parentWorm.head.sub(this.convergeCenter).normalize();
            } else {
                this.recognizeDir = new Vector(1, 0);
            }
        }
    }

    /** 阶段4：认亲闪光（6~7秒） */
    _updateRecognizing(dt) {
        this.totalTimer -= dt;
        const progress = Math.min(1, this.hatchTimer / this.recognizeDuration);

        // 闪光：先亮后暗
        if (progress < 0.3) {
            this.flashBrightness = progress / 0.3;  // 0→1 快速亮起
        } else {
            this.flashBrightness = 1 - (progress - 0.3) / 0.7;  // 1→0 缓慢消退
        }

        if (progress >= 1) {
            this.flashBrightness = 0;
            this.hatchPhase = 'done';
            this.isFinished = true;
        }
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
        switch (this.hatchPhase) {
            case 'waving':
                this._drawWaving(ctx);
                break;
            case 'converging':
                this._drawConverging(ctx);
                break;
            case 'hatching':
                this._drawHatching(ctx);
                break;
            case 'recognizing':
                this._drawRecognizing(ctx);
                break;
        }
    }

    /** 阶段1绘制：断尾扭动（原有逻辑） */
    _drawWaving(ctx) {
        const color = this.getCurrentColor();
        const flashIntensity = Math.sin(this.flashPhase) * 0.5 + 0.5;
        const flashAlpha = 0.3 + flashIntensity * 0.7;

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const isHead = i === 0;
            const r = CONFIG.SEGMENT_RADIUS;

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

    /** 阶段2绘制：收缩成光球 */
    _drawConverging(ctx) {
        const color = this.getCurrentColor();
        const progress = Math.min(1, this.hatchTimer / this.convergeDuration);

        // 绘制正在收缩的段
        const bodyAlpha = 1 - progress * 0.6;  // 段逐渐变透明
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const r = CONFIG.SEGMENT_RADIUS * (1 - progress * 0.5);  // 段逐渐缩小
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(color, bodyAlpha * 0.8);
            ctx.fill();
        }

        // 绘制呼吸脉冲光球
        const pulseScale = 1 + Math.sin(this.orbPulse) * 0.15;
        const orbRadius = CONFIG.SEGMENT_RADIUS * 2 * progress * pulseScale;
        const orbAlpha = progress * 0.5;

        // 外层光晕
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(this.convergeCenter.x, this.convergeCenter.y, orbRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, orbAlpha * 0.3);
        ctx.fill();

        // 内层光球
        ctx.beginPath();
        ctx.arc(this.convergeCenter.x, this.convergeCenter.y, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, orbAlpha * 0.6);
        ctx.fill();

        // 核心亮点
        ctx.beginPath();
        ctx.arc(this.convergeCenter.x, this.convergeCenter.y, orbRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${orbAlpha * 0.8})`;
        ctx.fill();
        ctx.restore();
    }

    /** 阶段3绘制：光球裂开 + 小虫探头 */
    _drawHatching(ctx) {
        const color = this.newColor;
        const cx = this.convergeCenter.x;
        const cy = this.convergeCenter.y;
        const t = this.crackProgress;

        // 绘制裂开的光球（两半圆弧）
        const orbRadius = CONFIG.SEGMENT_RADIUS * 2.5;
        const crackAngle = t * Math.PI;  // 裂开角度：0→π（完全分开）

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 左半球
        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius * (1 - t * 0.4), Math.PI / 2 + crackAngle * 0.3, Math.PI / 2 + crackAngle * 0.3 + Math.PI);
        ctx.fillStyle = hexToRgba(color, (1 - t) * 0.5);
        ctx.fill();

        // 右半球
        ctx.beginPath();
        ctx.arc(cx, cy, orbRadius * (1 - t * 0.4), -Math.PI / 2 - crackAngle * 0.3, -Math.PI / 2 - crackAngle * 0.3 + Math.PI);
        ctx.fillStyle = hexToRgba(color, (1 - t) * 0.5);
        ctx.fill();

        // 裂缝中的白光
        if (t > 0.1) {
            const lightAlpha = Math.min(1, t * 2) * (1 - t * 0.5);
            ctx.beginPath();
            ctx.arc(cx, cy, orbRadius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${lightAlpha * 0.8})`;
            ctx.fill();
        }

        ctx.restore();

        // 绘制探头的小虫（带缩放弹跳动画）
        if (this.headScale > 0) {
            const headR = CONFIG.SEGMENT_RADIUS * this.headScale;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(this.headScale, this.headScale);

            // 虫虫头部
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.SEGMENT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // 小眼睛（好奇地左右看）
            const lookAngle = Math.sin(this.hatchTimer * 4) * 0.3;  // 左右转头
            const eyeOffset = 3;
            const eyeRadius = 2;
            const a1 = lookAngle - 0.5;
            const a2 = lookAngle + 0.5;

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(Math.cos(a1) * eyeOffset, Math.sin(a1) * eyeOffset, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(Math.cos(a2) * eyeOffset, Math.sin(a2) * eyeOffset, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(Math.cos(a1) * eyeOffset + Math.cos(lookAngle) * 0.5, Math.sin(a1) * eyeOffset + Math.sin(lookAngle) * 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(Math.cos(a2) * eyeOffset + Math.cos(lookAngle) * 0.5, Math.sin(a2) * eyeOffset + Math.sin(lookAngle) * 0.5, 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    /** 阶段4绘制：认亲闪光 */
    _drawRecognizing(ctx) {
        const color = this.newColor;
        const cx = this.convergeCenter.x;
        const cy = this.convergeCenter.y;
        const b = this.flashBrightness;

        // 虫虫身体（完整大小）
        const headR = CONFIG.SEGMENT_RADIUS;
        ctx.beginPath();
        ctx.arc(cx, cy, headR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 认亲闪光：向外扩展的明亮光环
        if (b > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // 扩展光环
            const ringRadius = headR + b * 20;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${b * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // 身体整体发光
            ctx.beginPath();
            ctx.arc(cx, cy, headR * (1 + b * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${b * 0.4})`;
            ctx.fill();

            ctx.restore();
        }

        // 眼睛看向母体方向
        if (this.recognizeDir) {
            const angle = Math.atan2(this.recognizeDir.y, this.recognizeDir.x);
            const eyeOffset = 3;
            const eyeRadius = 2.5;
            const a1 = angle - 0.5;
            const a2 = angle + 0.5;

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a1) * eyeOffset, cy + Math.sin(a1) * eyeOffset, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a2) * eyeOffset, cy + Math.sin(a2) * eyeOffset, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            // 瞳孔看向母体
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a1) * eyeOffset + Math.cos(angle) * 0.8, cy + Math.sin(a1) * eyeOffset + Math.sin(angle) * 0.8, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a2) * eyeOffset + Math.cos(angle) * 0.8, cy + Math.sin(a2) * eyeOffset + Math.sin(angle) * 0.8, 1, 0, Math.PI * 2);
            ctx.fill();
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
