/**
 * Obstacle - 障碍物系统
 * Phase 3b: 5种障碍物，每种有独特外观和游戏效果
 *
 * 类型:
 *   rock         - 岩石，固体障碍，可被子弹击碎
 *   thorn        - 荆棘，减速+周期伤害，可通过
 *   crystalSpike - 水晶刺，固体障碍，反射子弹
 *   lavaPool     - 岩浆池，持续伤害区域
 *   voidRift     - 虚空裂隙，吸引+伤害
 */

import { Vector } from './vector.js';
import { CONFIG } from './config.js';

// 障碍物类型枚举
export const OBSTACLE_TYPE = {
    ROCK: 'rock',
    THORN: 'thorn',
    CRYSTAL_SPIKE: 'crystalSpike',
    LAVA_POOL: 'lavaPool',
    VOID_RIFT: 'voidRift',
};

/**
 * 根据区域主题获取可用障碍物类型列表
 */
function getTypesForTheme(theme) {
    switch (theme) {
        case 'forest':
            return [OBSTACLE_TYPE.ROCK, OBSTACLE_TYPE.THORN];
        case 'cave':
            return [OBSTACLE_TYPE.ROCK, OBSTACLE_TYPE.THORN, OBSTACLE_TYPE.CRYSTAL_SPIKE];
        case 'crystal':
            return [OBSTACLE_TYPE.CRYSTAL_SPIKE, OBSTACLE_TYPE.ROCK];
        case 'lava':
            return [OBSTACLE_TYPE.LAVA_POOL, OBSTACLE_TYPE.ROCK];
        case 'void':
        case 'final':
            return [OBSTACLE_TYPE.VOID_RIFT, OBSTACLE_TYPE.CRYSTAL_SPIKE];
        default:
            return [OBSTACLE_TYPE.ROCK];
    }
}

/**
 * 根据类型获取配置
 */
function getConfig(type) {
    const O = CONFIG.OBSTACLE;
    switch (type) {
        case OBSTACLE_TYPE.ROCK:          return O.ROCK;
        case OBSTACLE_TYPE.THORN:         return O.THORN;
        case OBSTACLE_TYPE.CRYSTAL_SPIKE: return O.CRYSTAL_SPIKE;
        case OBSTACLE_TYPE.LAVA_POOL:     return O.LAVA_POOL;
        case OBSTACLE_TYPE.VOID_RIFT:     return O.VOID_RIFT;
        default:                          return O.ROCK;
    }
}

export class Obstacle {
    /**
     * @param {number} x - 世界坐标X
     * @param {number} y - 世界坐标Y
     * @param {string} type - OBSTACLE_TYPE 枚举
     */
    constructor(x, y, type) {
        this.pos = new Vector(x, y);
        this.type = type;
        const cfg = getConfig(type);
        this.cfg = cfg;
        this.radius = cfg.RADIUS;
        this.isAlive = true;

        // 岩石HP（可破坏）
        this.health = cfg.HEALTH || 0;
        this.maxHealth = cfg.HEALTH || 0;
        this.hitTimer = 0;  // 被击中闪烁

        // 通用动画
        this.phase = Math.random() * Math.PI * 2;
        this.time = 0;

        // 岩石碎片（被击碎后的粒子）
        this.fragments = [];

        // 岩浆池气泡
        this.bubbles = [];
        if (type === OBSTACLE_TYPE.LAVA_POOL) {
            for (let i = 0; i < cfg.BUBBLE_COUNT; i++) {
                this.bubbles.push({
                    angle: Math.random() * Math.PI * 2,
                    dist: Math.random() * cfg.RADIUS * 0.7,
                    size: 2 + Math.random() * 3,
                    speed: 0.5 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        // 虚空裂隙粒子环
        this.riftParticles = [];
        if (type === OBSTACLE_TYPE.VOID_RIFT) {
            for (let i = 0; i < 12; i++) {
                this.riftParticles.push({
                    angle: (i / 12) * Math.PI * 2,
                    dist: cfg.RADIUS + 5 + Math.random() * 10,
                    speed: 0.8 + Math.random() * 1.0,
                    size: 1.5 + Math.random() * 2,
                });
            }
        }

        // 伤害计时器（每个虫虫独立跟踪）
        this.damageTimers = new Map();  // worm -> timer

        // 区域归属（用于缓存/恢复）
        this.homeZone = null;
    }

    update(dt) {
        this.time += dt;
        this.phase += dt * 2;
        if (this.hitTimer > 0) this.hitTimer -= dt;

        // 更新碎片动画
        if (this.fragments.length > 0) {
            let w = 0;
            for (let i = 0; i < this.fragments.length; i++) {
                const f = this.fragments[i];
                f.life -= dt;
                if (f.life > 0) {
                    f.x += f.vx * dt;
                    f.y += f.vy * dt;
                    f.vy += 120 * dt;  // 重力
                    this.fragments[w++] = f;
                }
            }
            this.fragments.length = w;
        }

        // 岩浆气泡动画
        if (this.type === OBSTACLE_TYPE.LAVA_POOL) {
            for (const b of this.bubbles) {
                b.phase += b.speed * dt;
            }
        }

        // 虚空裂隙粒子旋转
        if (this.type === OBSTACLE_TYPE.VOID_RIFT) {
            for (const p of this.riftParticles) {
                p.angle += p.speed * dt;
            }
        }
    }

    /**
     * 子弹击中检测
     * @returns {'hit'|'reflect'|'absorb'|null} - hit=造成伤害, reflect=反射, absorb=吸收无效果
     */
    checkBulletHit(bulletPos, bulletRadius) {
        const dist = this.pos.dist(bulletPos);
        if (dist > this.radius + bulletRadius) return null;

        switch (this.type) {
            case OBSTACLE_TYPE.ROCK:
                return 'hit';
            case OBSTACLE_TYPE.CRYSTAL_SPIKE:
                return 'reflect';
            default:
                return 'absorb';
        }
    }

    /**
     * 岩石受到伤害
     * @returns {boolean} 是否被摧毁
     */
    takeDamage() {
        if (this.type !== OBSTACLE_TYPE.ROCK) return false;
        this.health--;
        this.hitTimer = 0.2;
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    /**
     * 岩石死亡 - 生成碎片
     */
    die() {
        this.isAlive = false;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 60 + Math.random() * 80;
            this.fragments.push({
                x: this.pos.x,
                y: this.pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                size: 3 + Math.random() * 5,
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
            });
        }
    }

    /**
     * 检测虫虫段是否在此障碍物范围内
     * @param {Vector} segPos - 段位置
     * @param {number} segRadius - 段半径
     * @returns {boolean}
     */
    checkCollision(segPos, segRadius) {
        if (!this.isAlive) return false;
        return this.pos.dist(segPos) < this.radius + segRadius;
    }

    /**
     * 固体障碍碰撞检测（岩石/水晶刺）
     * 碰撞后返回推开方向和距离
     */
    checkSolidCollision(segPos, segRadius) {
        if (!this.isAlive) return null;
        if (this.type !== OBSTACLE_TYPE.ROCK && this.type !== OBSTACLE_TYPE.CRYSTAL_SPIKE) return null;

        const dx = segPos.x - this.pos.x;
        const dy = segPos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.radius + segRadius;

        if (dist < minDist && dist > 0) {
            // 推开方向和重叠距离
            return {
                nx: dx / dist,
                ny: dy / dist,
                overlap: minDist - dist,
            };
        }
        return null;
    }

    /**
     * 获取荆棘减速信息
     */
    getSlowInfo() {
        if (this.type !== OBSTACLE_TYPE.THORN) return null;
        return {
            factor: this.cfg.SLOW_FACTOR,
            duration: this.cfg.SLOW_DURATION,
        };
    }

    /**
     * 检查是否应该造成伤害（伤害计时器管理）
     * @param {object} worm - 虫虫对象（用作key）
     * @returns {boolean}
     */
    shouldDamage(worm) {
        if (!this.isAlive) return false;

        // 只有荆棘/岩浆/虚空有伤害
        if (this.type !== OBSTACLE_TYPE.THORN &&
            this.type !== OBSTACLE_TYPE.LAVA_POOL &&
            this.type !== OBSTACLE_TYPE.VOID_RIFT) return false;

        const timer = this.damageTimers.get(worm) || 0;
        if (timer <= 0) {
            this.damageTimers.set(worm, this.cfg.DAMAGE_INTERVAL);
            return true;
        }
        return false;
    }

    /**
     * 更新伤害计时器
     */
    updateDamageTimers(dt) {
        for (const [worm, timer] of this.damageTimers) {
            if (timer > 0) {
                this.damageTimers.set(worm, timer - dt);
            }
        }
    }

    /**
     * 获取虚空裂隙的拉扯力
     * @param {Vector} pos - 目标位置
     * @returns {{fx: number, fy: number}|null}
     */
    getPullForce(pos) {
        if (this.type !== OBSTACLE_TYPE.VOID_RIFT || !this.isAlive) return null;

        const dx = this.pos.x - pos.x;
        const dy = this.pos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.cfg.PULL_RADIUS || dist < 1) return null;

        // 越近拉力越强
        const strength = this.cfg.PULL_FORCE * (1 - dist / this.cfg.PULL_RADIUS);
        return {
            fx: (dx / dist) * strength,
            fy: (dy / dist) * strength,
        };
    }

    draw(ctx) {
        if (!this.isAlive) {
            // 绘制碎片
            this._drawFragments(ctx);
            return;
        }

        switch (this.type) {
            case OBSTACLE_TYPE.ROCK:          this._drawRock(ctx); break;
            case OBSTACLE_TYPE.THORN:         this._drawThorn(ctx); break;
            case OBSTACLE_TYPE.CRYSTAL_SPIKE: this._drawCrystal(ctx); break;
            case OBSTACLE_TYPE.LAVA_POOL:     this._drawLava(ctx); break;
            case OBSTACLE_TYPE.VOID_RIFT:     this._drawVoid(ctx); break;
        }
    }

    // ==================== 岩石 ====================
    _drawRock(ctx) {
        const { x, y } = this.pos;
        const r = this.radius;

        ctx.save();

        // 被击中闪烁
        if (this.hitTimer > 0) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.hitTimer * 30);
        }

        // 主体 - 不规则多边形
        ctx.fillStyle = this.cfg.COLOR;
        ctx.beginPath();
        const points = 7;
        for (let i = 0; i < points; i++) {
            const a = (i / points) * Math.PI * 2;
            const wobble = 0.8 + 0.2 * Math.sin(a * 3 + this.phase);
            const px = x + Math.cos(a) * r * wobble;
            const py = y + Math.sin(a) * r * wobble;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // 边框
        ctx.strokeStyle = this.cfg.BORDER_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 裂纹（根据HP损失程度）
        if (this.health < this.maxHealth) {
            ctx.strokeStyle = this.cfg.CRACK_COLOR;
            ctx.lineWidth = 1.5;
            const crackLevel = 1 - this.health / this.maxHealth;
            // 1条裂纹
            ctx.beginPath();
            ctx.moveTo(x - r * 0.3, y - r * 0.4);
            ctx.lineTo(x + r * 0.1, y + r * 0.2);
            ctx.stroke();
            if (crackLevel > 0.3) {
                ctx.beginPath();
                ctx.moveTo(x + r * 0.2, y - r * 0.3);
                ctx.lineTo(x - r * 0.15, y + r * 0.35);
                ctx.stroke();
            }
            if (crackLevel > 0.6) {
                ctx.beginPath();
                ctx.moveTo(x, y - r * 0.2);
                ctx.lineTo(x + r * 0.25, y + r * 0.1);
                ctx.stroke();
            }
        }

        // 高光
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.2, y - r * 0.2, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ==================== 荆棘 ====================
    _drawThorn(ctx) {
        const { x, y } = this.pos;
        const r = this.radius;

        ctx.save();

        // 灌木丛底座
        ctx.fillStyle = this.cfg.COLOR;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // 藤蔓线条
        ctx.strokeStyle = this.cfg.VINE_COLOR;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + this.phase * 0.3;
            const len = r * (0.6 + 0.2 * Math.sin(this.time * 1.5 + i));
            ctx.beginPath();
            ctx.moveTo(x, y);
            const cx1 = x + Math.cos(a + 0.3) * len * 0.5;
            const cy1 = y + Math.sin(a + 0.3) * len * 0.5;
            const ex = x + Math.cos(a) * len;
            const ey = y + Math.sin(a) * len;
            ctx.quadraticCurveTo(cx1, cy1, ex, ey);
            ctx.stroke();
        }

        // 刺尖
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + this.phase * 0.2;
            const dist = r * (0.5 + 0.3 * Math.sin(this.time + i * 0.7));
            const tx = x + Math.cos(a) * dist;
            const ty = y + Math.sin(a) * dist;

            ctx.fillStyle = this.cfg.THORN_COLOR;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(a + 0.4) * 4, ty + Math.sin(a + 0.4) * 4);
            ctx.lineTo(tx + Math.cos(a - 0.4) * 4, ty + Math.sin(a - 0.4) * 4);
            ctx.closePath();
            ctx.fill();
        }

        // 中心高光
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#6aff6a';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ==================== 水晶刺 ====================
    _drawCrystal(ctx) {
        const { x, y } = this.pos;
        const r = this.radius;

        ctx.save();

        const shimmer = 0.5 + 0.5 * Math.sin(this.time * this.cfg.SHIMMER_SPEED);

        // 外部光晕
        ctx.globalAlpha = 0.15 + shimmer * 0.1;
        ctx.fillStyle = this.cfg.CORE_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 水晶刺（3-4根）
        const spikeCount = 5;
        for (let i = 0; i < spikeCount; i++) {
            const a = (i / spikeCount) * Math.PI * 2 + this.phase * 0.1;
            const len = r * (0.8 + 0.3 * Math.sin(this.time * 1.2 + i * 1.5));

            ctx.fillStyle = i % 2 === 0 ? this.cfg.COLOR : this.cfg.CORE_COLOR;
            ctx.beginPath();
            const base1x = x + Math.cos(a + 0.35) * r * 0.25;
            const base1y = y + Math.sin(a + 0.35) * r * 0.25;
            const tipx = x + Math.cos(a) * len;
            const tipy = y + Math.sin(a) * len;
            const base2x = x + Math.cos(a - 0.35) * r * 0.25;
            const base2y = y + Math.sin(a - 0.35) * r * 0.25;
            ctx.moveTo(base1x, base1y);
            ctx.lineTo(tipx, tipy);
            ctx.lineTo(base2x, base2y);
            ctx.closePath();
            ctx.fill();

            // 晶体高光线
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3);
            ctx.lineTo(tipx, tipy);
            ctx.stroke();
        }

        // 中心核心
        ctx.fillStyle = this.cfg.CORE_COLOR;
        ctx.globalAlpha = 0.6 + shimmer * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ==================== 岩浆池 ====================
    _drawLava(ctx) {
        const { x, y } = this.pos;
        const r = this.radius;

        ctx.save();

        // 发光底色
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(this.time * 2);
        ctx.fillStyle = this.cfg.GLOW_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 岩浆主体（略带脉动）
        const pulse = r + 2 * Math.sin(this.time * 3);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulse);
        gradient.addColorStop(0, '#ffcc00');
        gradient.addColorStop(0.4, this.cfg.COLOR);
        gradient.addColorStop(0.8, '#cc3300');
        gradient.addColorStop(1, '#881100');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // 气泡
        for (const b of this.bubbles) {
            const bx = x + Math.cos(b.angle) * b.dist;
            const by = y + Math.sin(b.angle) * b.dist - Math.abs(Math.sin(b.phase)) * 8;
            const bs = b.size * (0.5 + 0.5 * Math.sin(b.phase));

            ctx.globalAlpha = 0.4 + 0.3 * Math.sin(b.phase);
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(bx, by, bs, 0, Math.PI * 2);
            ctx.fill();
        }

        // 危险标记（边缘虚线）
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 4);
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    // ==================== 虚空裂隙 ====================
    _drawVoid(ctx) {
        const { x, y } = this.pos;
        const r = this.radius;

        ctx.save();

        const pulse = 0.5 + 0.5 * Math.sin(this.time * this.cfg.PULSE_SPEED);

        // 吸引范围圈（半透明）
        ctx.globalAlpha = 0.05 + pulse * 0.05;
        ctx.fillStyle = this.cfg.RING_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, this.cfg.PULL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // 漩涡核心
        ctx.globalAlpha = 0.8;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, this.cfg.COLOR);
        gradient.addColorStop(1, 'rgba(26, 10, 46, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 旋转环
        ctx.globalAlpha = 0.4 + pulse * 0.3;
        ctx.strokeStyle = this.cfg.RING_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, this.time * 2, this.time * 2 + Math.PI * 1.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, r * 0.4, -this.time * 3, -this.time * 3 + Math.PI);
        ctx.stroke();

        // 旋转粒子
        for (const p of this.riftParticles) {
            const px = x + Math.cos(p.angle) * p.dist;
            const py = y + Math.sin(p.angle) * p.dist;
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.time * 3 + p.angle);
            ctx.fillStyle = this.cfg.RING_COLOR;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 核心亮点
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.fillStyle = '#c7ceea';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ==================== 碎片 ====================
    _drawFragments(ctx) {
        for (const f of this.fragments) {
            ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
            ctx.fillStyle = this.cfg.COLOR;
            ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        }
        ctx.globalAlpha = 1;
    }
}

/**
 * 为一个区域生成障碍物列表
 * @param {object} zone - 区域配置
 * @param {string[]} obstacleTypes - 该区域可用的障碍物类型
 * @param {number} count - 生成数量
 * @returns {Obstacle[]}
 */
export function generateObstacles(zone, obstacleTypes, count) {
    if (!obstacleTypes || obstacleTypes.length === 0) return [];

    const obstacles = [];
    const padding = CONFIG.OBSTACLE.SPAWN_PADDING;
    const minDist = 70;  // 障碍物之间最小间距

    for (let i = 0; i < count; i++) {
        const type = obstacleTypes[i % obstacleTypes.length];
        const cfg = getConfig(type);

        // 尝试找一个不重叠的位置（最多10次尝试）
        let x, y, valid;
        for (let attempt = 0; attempt < 10; attempt++) {
            x = zone.x + padding + Math.random() * (zone.width - padding * 2);
            y = zone.y + padding + Math.random() * (zone.height - padding * 2);

            valid = true;
            for (const existing of obstacles) {
                const dx = x - existing.pos.x;
                const dy = y - existing.pos.y;
                if (Math.sqrt(dx * dx + dy * dy) < minDist + existing.radius) {
                    valid = false;
                    break;
                }
            }
            // 也不要和区域中心太近（Boss/出生点）
            const dcx = x - zone.centerX;
            const dcy = y - zone.centerY;
            if (Math.sqrt(dcx * dcx + dcy * dcy) < 80) valid = false;

            if (valid) break;
        }

        if (valid) {
            const obs = new Obstacle(x, y, type);
            obs.homeZone = zone;
            obstacles.push(obs);
        }
    }

    return obstacles;
}
