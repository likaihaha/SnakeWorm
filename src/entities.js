import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba, drawGlow, drawTextGlow } from './utils.js';

/* ========== 粒子类 ========== */
export class Particle {
    static _pool = [];
    static acquire(x, y, color) {
        if (Particle._pool.length > 0) {
            const p = Particle._pool.pop();
            p._reset(x, y, color);
            return p;
        }
        return new Particle(x, y, color);
    }
    static release(p) {
        Particle._pool.push(p);
    }

    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.velocity = Vector.randomDir().mult(CONFIG.PARTICLE.SPEED_MIN + Math.random() * CONFIG.PARTICLE.SPEED_SPREAD);
        this.color = color;
        this.life = CONFIG.PARTICLE.LIFE;
        this.maxLife = CONFIG.PARTICLE.LIFE;
        this.size = CONFIG.PARTICLE.SIZE_MIN + Math.random() * CONFIG.PARTICLE.SIZE_SPREAD;
    }
    // 对象池重置
    _reset(x, y, color) {
        this.pos.x = x;
        this.pos.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = CONFIG.PARTICLE.SPEED_MIN + Math.random() * CONFIG.PARTICLE.SPEED_SPREAD;
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
        this.color = color;
        this.life = CONFIG.PARTICLE.LIFE;
        this.maxLife = CONFIG.PARTICLE.LIFE;
        this.size = CONFIG.PARTICLE.SIZE_MIN + Math.random() * CONFIG.PARTICLE.SIZE_SPREAD;
    }
    update(dt) {
        // 热路径：标量运算，不创建临时Vector
        this.pos.x += this.velocity.x * dt * 60;
        this.pos.y += this.velocity.y * dt * 60;
        this.life -= dt;
        return this.life > 0;
    }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = hexToRgba(this.color, alpha);
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

/* ========== 子弹类 ========== */
export class Bullet {
    constructor(x, y, direction) {
        this.pos = new Vector(x, y);
        // normalize+mult就地计算，避免创建临时Vector
        const mag = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        this.velocity = new Vector(
            (direction.x / mag) * CONFIG.FIRE.BULLET_SPEED,
            (direction.y / mag) * CONFIG.FIRE.BULLET_SPEED
        );
        this.radius = CONFIG.BULLET_RADIUS;
        this.life = CONFIG.FIRE.BULLET_LIFE;
        this.hitTargets = [];  // 已击中的目标（避免重复击中）
    }

    update(dt) {
        // 热路径：就地修改，不创建临时Vector
        this.pos.x += this.velocity.x * dt * 60;
        this.pos.y += this.velocity.y * dt * 60;
        this.life -= dt;

        // 超出边界或时间到则消失
        if (this.life <= 0 ||
            this.pos.x < 0 || this.pos.x > CONFIG.MAP_WIDTH ||
            this.pos.y < 0 || this.pos.y > CONFIG.MAP_HEIGHT) {
            return false;
        }
        return true;
    }

    draw(ctx) {
        // 子弹外观：蓝色发光球（用径向渐变替代shadowBlur，性能更好）
        ctx.globalCompositeOperation = 'screen';

        // 外层光晕（替代 shadowBlur）
        const grd = ctx.createRadialGradient(
            this.pos.x, this.pos.y, this.radius * 0.3,
            this.pos.x, this.pos.y, this.radius * 2.5
        );
        grd.addColorStop(0, 'rgba(77, 171, 247, 0.6)');
        grd.addColorStop(1, 'rgba(77, 171, 247, 0)');
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // 主体
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(77, 171, 247, 0.9)';
        ctx.fill();

        // 内核高光
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }

    // 检测是否击中宝珠
    checkFoodHit(food) {
        const dist = this.pos.dist(food.pos);
        return dist < this.radius + food.type.radius;
    }

    // 检测是否击中虫虫
    checkWormHit(worm) {
        for (let i = 0; i < worm.segments.length; i++) {
            const dist = this.pos.dist(worm.segments[i]);
            if (dist < this.radius + CONFIG.SEGMENT_RADIUS) {
                return true;
            }
        }
        return false;
    }
}

/* ========== 浮动文字类 ========== */
export class FloatingText {
    static _pool = [];
    static acquire(x, y, text, color = '#ffe66d') {
        if (FloatingText._pool.length > 0) {
            const ft = FloatingText._pool.pop();
            ft._reset(x, y, text, color);
            return ft;
        }
        return new FloatingText(x, y, text, color);
    }
    static release(ft) {
        FloatingText._pool.push(ft);
    }

    constructor(x, y, text, color = '#ffe66d') {
        this.pos = new Vector(x, y);
        this.text = text;
        this.color = color;
        this.life = 0.8;  // 文字存活 0.8 秒
        this.maxLife = 0.8;
        this.velocity = new Vector(0, -1.5);  // 向上飘动
    }
    // 对象池重置
    _reset(x, y, text, color = '#ffe66d') {
        this.pos.x = x;
        this.pos.y = y;
        this.text = text;
        this.color = color;
        this.life = 0.8;
        this.maxLife = 0.8;
        this.velocity.x = 0;
        this.velocity.y = -1.5;
    }
    update(dt) {
        // 热路径：就地修改，不创建临时Vector
        this.pos.x += this.velocity.x * dt * 60;
        this.pos.y += this.velocity.y * dt * 60;
        this.life -= dt;
        return this.life > 0;
    }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const scale = 0.8 + 0.4 * (1 - alpha);  // 开始时小，然后放大
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(14 * scale)}px 'Microsoft YaHei'`;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        // 用偏移文字替代shadowBlur
        drawTextGlow(ctx, this.text, this.pos.x, this.pos.y, this.color, 8);
        ctx.fillText(this.text, this.pos.x, this.pos.y);
        ctx.globalAlpha = 1;
    }
}

/* ========== 食物类（重力宝珠） ========== */
export class Food {
    constructor(x, y, type) {
        this.pos = new Vector(x, y);
        this.type = type;  // 宝珠类型配置
        this.radius = type.radius;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.movePhase = Math.random() * Math.PI * 2;
        this.velocity = new Vector(0, 0);  // 掉落速度
        this.trail = [];  // 拖尾
        this.bounces = 0;  // 弹跳次数
        this.maxBounces = type.wobble > 0 ? 2 : 1;  // 有摆动的宝珠可以弹跳 2 次
        this.inactiveTimer = 0;  // 初生冷却计时器（尸体转化的宝珠需要散布后才能被互动）
        // 宝珠初生动画系统：白点 → 变形 → 启用互动
        this.birthPhase = 'none';  // 'none' | 'white' | 'morphing' | 'active'
        this.birthTimer = 0;
        this.morphTimer = 0;
        this.morphDuration = 0.6;  // 变形动画持续0.6秒
        // 颜色缓存（避免每帧parseInt）
        this._cr = parseInt(type.color.slice(1, 3), 16);
        this._cg = parseInt(type.color.slice(3, 5), 16);
        this._cb = parseInt(type.color.slice(5, 7), 16);
    }

    static weightedRandom() {
        const totalWeight = CONFIG.FOOD_TYPES.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        for (const type of CONFIG.FOOD_TYPES) {
            random -= type.weight;
            if (random <= 0) return type;
        }
        return CONFIG.FOOD_TYPES[0];
    }

    static random(type = null) {
        // 使用地图边界边距，确保宝珠不会在边界外生成
        const margin = CONFIG.BORDER_MARGIN + CONFIG.SEGMENT_RADIUS;
        const foodType = type || Food.weightedRandom();
        // 在地图范围内均匀随机出生
        const x = margin + Math.random() * (CONFIG.MAP_WIDTH - margin * 2);
        const y = margin + Math.random() * (CONFIG.MAP_HEIGHT - margin * 2);
        const food = new Food(x, y, foodType);
        // 如果在下半部分出生，给一点向上初速度，避免马上落出底部
        if (y > CONFIG.MAP_HEIGHT / 2) {
            food.velocity.y = -(0.3 + Math.random() * 0.5);  // 向上初速度
        }
        return food;
    }

    update(dt) {
        // 初生冷却倒计时
        if (this.inactiveTimer > 0) {
            this.inactiveTimer -= dt;
        }

        // 宝珠初生动画阶段管理
        if (this.birthPhase === 'white') {
            this.birthTimer -= dt;
            if (this.birthTimer <= 0) {
                this.birthPhase = 'morphing';
                this.morphTimer = this.morphDuration;
            }
        } else if (this.birthPhase === 'morphing') {
            this.morphTimer -= dt;
            if (this.morphTimer <= 0) {
                this.birthPhase = 'active';
            }
        }

        this.pulsePhase += dt * 3;
        this.movePhase += dt * 2;

        // 重力掉落 + 水平速度
        this.velocity.y += this.type.gravity * dt * 60;
        this.pos.y += this.velocity.y;
        this.pos.x += this.velocity.x;

        // 水平摆动（如果有 wobble 配置）
        if (this.type.wobble > 0) {
            this.pos.x += Math.sin(this.movePhase) * this.type.wobble * dt * 60;
        }

        // 底部：不反弹，让宝珠自然掉落（由Game类处理消散特效）
    }

    draw(ctx) {
        ctx.globalCompositeOperation = 'source-over';
        const pulse = Math.sin(this.pulsePhase) * 2;
        const r = this.radius + pulse;

        // === 初生动画：白点阶段 ===
        if (this.birthPhase === 'white') {
            // 小白点 + 白色拖尾
            const whiteR = 3;
            // 白色拖尾
            if (this.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            // 白色光点
            drawGlow(ctx, this.pos.x, this.pos.y, whiteR, '#ffffff', 8);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, whiteR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        // === 初生动画：变形阶段（白点→宝珠） ===
        if (this.birthPhase === 'morphing') {
            const t = 1 - (this.morphTimer / this.morphDuration);  // 0→1
            const easeT = t * t * (3 - 2 * t);  // smoothstep
            const morphR = 3 + (r - 3) * easeT;  // 从3px渐变到正常半径

            // 拖尾：白色渐变到宝珠颜色
            if (this.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                const trailAlpha = 0.2 + 0.1 * easeT;
                ctx.strokeStyle = easeT < 0.5
                    ? `rgba(255, 255, 255, ${trailAlpha})`
                    : hexToRgba(this.type.color, trailAlpha);
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 变形中的球体：白色与宝珠颜色混合
            drawGlow(ctx, this.pos.x, this.pos.y, morphR, this.type.color, 10);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, morphR, 0, Math.PI * 2);
            // 颜色从白色渐变到宝珠色（使用缓存的RGB值）
            const mixR = Math.round(255 + (this._cr - 255) * easeT);
            const mixG = Math.round(255 + (this._cg - 255) * easeT);
            const mixB = Math.round(255 + (this._cb - 255) * easeT);
            ctx.fillStyle = `rgba(${mixR}, ${mixG}, ${mixB}, ${0.6 + 0.4 * easeT})`;
            ctx.fill();

            // 高光
            ctx.beginPath();
            ctx.arc(this.pos.x - 2, this.pos.y - 2, morphR * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.2 * easeT})`;
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        // === 正常态渲染 ===
        // 拖尾效果
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = hexToRgba(this.type.color, 0.3);
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 光环效果（根据稀有度，减少数量让颜色更鲜艳）
        const ringCount = this.type.score >= 120 ? 2 :
                         this.type.score >= 30 ? 1 : 0;

        for (let i = 0; i < ringCount; i++) {
            const ringRadius = r + 3 + i * 3;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(this.type.color, 0.4 - i * 0.1);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // 叠加发光效果（闪烁）
        const glowR = this.type.score >= 120 ? r * 1.6 : r * 1.4;
        // 闪烁效果：使用pulsePhase产生呼吸般的明暗变化
        const flashIntensity = 0.4 + 0.6 * Math.sin(this.pulsePhase * 2);
        const grd = ctx.createRadialGradient(
            this.pos.x, this.pos.y, r * 0.6,
            this.pos.x, this.pos.y, glowR
        );
        grd.addColorStop(0, hexToRgba(this.type.color, flashIntensity));
        grd.addColorStop(0.7, hexToRgba(this.type.color, 0.4 * flashIntensity));
        grd.addColorStop(1, hexToRgba(this.type.color, 0));
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // 实心球体
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
        // 初生冷却中的宝珠半透明，提示玩家还不能互动
        ctx.fillStyle = this.inactiveTimer > 0
            ? hexToRgba(this.type.color, 0.5)
            : this.type.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.pos.x - 2, this.pos.y - 2, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
    }
}
