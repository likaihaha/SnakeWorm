/**
 * boss.js - Phase 3a Boss系统
 * 5种Boss对应5个Boss关卡（Zone 5/10/15/20/25）
 *
 * 每种Boss有：独特外观、多阶段行为、攻击模式
 * Boss在进入Boss区域时自动召唤，击杀后区域通关
 */
import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { FloatingText, Particle } from './entities.js';

// Boss类型枚举
export const BOSS_TYPE = {
    GIANT_WORM: 'giantWorm',       // Zone 5 巨型蚯蚓
    SPIDER: 'spider',              // Zone 10 暗影蛛母
    CRYSTAL_GUARDIAN: 'crystal',   // Zone 15 晶石守卫
    LAVA_LIZARD: 'lizard',         // Zone 20 炎龙蜥
    QUEEN: 'queen',                // Zone 25 虫后
};

// Boss状态枚举
export const BOSS_STATE = {
    SPAWNING: 'spawning',   // 出场动画
    IDLE: 'idle',           // 待机（短暂）
    MOVING: 'moving',       // 移动
    ATTACKING: 'attacking', // 攻击中
    SPECIAL: 'special',     // 特殊技能
    HIT: 'hit',             // 被击中硬直
    PHASE_SHIFT: 'phaseShift', // 阶段转换动画
    DYING: 'dying',         // 死亡动画
    DEAD: 'dead',           // 已死亡
};

// ===================== Boss基类 =====================

export class Boss {
    constructor(x, y, type) {
        this.pos = new Vector(x, y);
        this.velocity = new Vector(0, 0);
        this.type = type;
        this.state = BOSS_STATE.SPAWNING;
        this.phase = 1;          // 当前阶段（1-3）
        this.maxPhase = 2;       // 最大阶段数
        this.health = 1;         // 子类设置
        this.maxHealth = 1;
        this.size = 20;
        this.color = '#ff0000';
        this.hitTimer = 0;
        this.hitFlashTimer = 0;
        this.invincibleTimer = 0;
        this.knockbackVelocity = null;
        this.knockbackTimer = 0;
        this.isAlive = true;
        this.isBoss = true;

        // 出场动画
        this.spawnTimer = 2.0;
        this.spawnScale = 0;

        // 死亡动画
        this.deathTimer = 0;
        this.deathDuration = CONFIG.BOSS.DEATH_DURATION;

        // 阶段转换
        this.phaseShiftTimer = 0;

        // 动画时间
        this.animTime = 0;

        // 所属区域
        this.homeZone = null;

        // 攻击冷却
        this.attackCooldown = 0;
        this.specialCooldown = 0;
    }

    update(dt, playerPos) {
        if (!this.isAlive) return;

        this.animTime += dt;
        this.hitFlashTimer -= dt;
        this.invincibleTimer -= dt;
        this.attackCooldown -= dt;
        this.specialCooldown -= dt;

        // 击退效果
        if (this.knockbackVelocity && this.knockbackTimer > 0) {
            this.pos.x += this.knockbackVelocity.x * dt * 60;
            this.pos.y += this.knockbackVelocity.y * dt * 60;
            this.knockbackVelocity.x *= CONFIG.BOSS.KNOCKBACK_DECAY;
            this.knockbackVelocity.y *= CONFIG.BOSS.KNOCKBACK_DECAY;
            this.knockbackTimer -= dt;
            this.clampToZone();
            return;
        }
        this.knockbackVelocity = null;

        // 出场动画
        if (this.state === BOSS_STATE.SPAWNING) {
            this.spawnTimer -= dt;
            this.spawnScale = Math.min(1, (2.0 - this.spawnTimer) / 1.5);
            if (this.spawnTimer <= 0) {
                this.state = BOSS_STATE.IDLE;
                this.attackCooldown = 1.0;
            }
            return;
        }

        // 阶段转换
        if (this.state === BOSS_STATE.PHASE_SHIFT) {
            this.phaseShiftTimer -= dt;
            if (this.phaseShiftTimer <= 0) {
                this.state = BOSS_STATE.IDLE;
                this.attackCooldown = 1.5;
            }
            return;
        }

        // 被击中硬直
        if (this.state === BOSS_STATE.HIT) {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) {
                this.state = BOSS_STATE.IDLE;
            }
            return;
        }

        // 死亡动画
        if (this.state === BOSS_STATE.DYING) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.state = BOSS_STATE.DEAD;
                this.isAlive = false;
            }
            return;
        }

        // 子类实现具体行为
        this.updateBehavior(dt, playerPos);

        // 保持在区域内
        this.clampToZone();
    }

    /** 子类重写：具体AI行为 */
    updateBehavior(dt, playerPos) {
        // 默认：缓慢移向玩家
        if (playerPos) {
            const dir = playerPos.sub(this.pos).normalize();
            this.velocity = dir.mult(1.0);
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        }
    }

    /** 保持在区域内 */
    clampToZone() {
        if (!this.homeZone) return;
        const z = this.homeZone;
        const pad = CONFIG.ZONE.ZONE_PADDING + this.size;
        this.pos.x = Math.max(z.x + pad, Math.min(z.x + z.width - pad, this.pos.x));
        this.pos.y = Math.max(z.y + pad, Math.min(z.y + z.height - pad, this.pos.y));
    }

    /** 受到伤害 */
    takeDamage(hitDir) {
        if (this.invincibleTimer > 0) return false;
        if (this.state === BOSS_STATE.DYING || this.state === BOSS_STATE.DEAD) return false;

        this.health--;
        this.hitFlashTimer = CONFIG.BOSS.HIT_FLASH_DURATION;
        this.invincibleTimer = CONFIG.BOSS.INVINCIBLE_TIME;
        this.state = BOSS_STATE.HIT;
        this.hitTimer = 0.15;  // 硬直时间

        // 击退
        if (hitDir) {
            const hd = Math.sqrt(hitDir.x * hitDir.x + hitDir.y * hitDir.y);
            const kspeed = CONFIG.BOSS.KNOCKBACK_SPEED;
            this.knockbackVelocity = new Vector(hd > 0 ? hitDir.x / hd * kspeed : 0, hd > 0 ? hitDir.y / hd * kspeed : 0);
            this.knockbackTimer = CONFIG.BOSS.KNOCKBACK_DURATION;
        }

        // 受击粒子
        if (typeof game !== 'undefined' && game.particles) {
            for (let k = 0; k < 6; k++) {
                game.particles.push(Particle.acquire(this.pos.x, this.pos.y, this.color));
            }
        }

        // 检查阶段转换
        this.checkPhaseShift();

        // 检查死亡
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    /** 检查是否需要阶段转换 */
    checkPhaseShift() {
        const healthPercent = this.health / this.maxHealth;
        // 阶段2: HP降到50%
        if (this.phase === 1 && healthPercent <= 0.5) {
            this.phase = 2;
            this.state = BOSS_STATE.PHASE_SHIFT;
            this.phaseShiftTimer = 1.5;
            this.onPhaseShift(2);
            return;
        }
        // 阶段3: HP降到25%（仅虫后）
        if (this.phase === 2 && healthPercent <= 0.25 && this.maxPhase >= 3) {
            this.phase = 3;
            this.state = BOSS_STATE.PHASE_SHIFT;
            this.phaseShiftTimer = 2.0;
            this.onPhaseShift(3);
        }
    }

    /** 阶段转换回调，子类重写 */
    onPhaseShift(newPhase) {
        if (typeof game !== 'undefined' && game.triggerScreenShake) {
            game.triggerScreenShake(6, 0.5);
        }
        if (typeof game !== 'undefined' && game.particles) {
            for (let k = 0; k < 20; k++) {
                game.particles.push(Particle.acquire(this.pos.x, this.pos.y, this.color));
            }
        }
        if (typeof game !== 'undefined' && game.floatingTexts) {
            const label = newPhase === 2 ? '!! 狂暴 !!' : '!!! 终极 !!!';
            game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 40, label, '#ff0000'));
        }
    }

    /** Boss死亡 */
    die() {
        this.state = BOSS_STATE.DYING;
        this.deathTimer = this.deathDuration;
        this.velocity = new Vector(0, 0);
        if (typeof game !== 'undefined' && game.triggerScreenShake) {
            game.triggerScreenShake(10, 1.0);
        }
        if (typeof game !== 'undefined' && game.floatingTexts) {
            game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 30, 'BOSS KILL!', '#ffd700'));
        }
    }

    /** 碰撞检测 - 与玩家子弹 */
    checkBulletCollision(bulletPos, bulletRadius) {
        const dist = this.pos.dist(bulletPos);
        return dist < this.size + bulletRadius;
    }

    /** 碰撞检测 - 与玩家虫虫 */
    checkPlayerCollision(segmentPos, segRadius) {
        const dist = this.pos.dist(segmentPos);
        return dist < this.size + segRadius;
    }

    /** 绘制Boss */
    draw(ctx) {
        if (!this.isAlive && this.state !== BOSS_STATE.DYING) return;

        ctx.save();

        // 阶段转换闪烁
        if (this.state === BOSS_STATE.PHASE_SHIFT) {
            const flash = Math.sin(this.animTime * 15) > 0;
            if (!flash) {
                ctx.globalAlpha = 0.3;
            }
        }

        // 死亡动画
        if (this.state === BOSS_STATE.DYING) {
            const progress = 1 - (this.deathTimer / this.deathDuration);
            ctx.globalAlpha = 1 - progress;
            // 死亡爆炸粒子
            if (Math.random() < 0.3) {
                const ox = (Math.random() - 0.5) * this.size * 2;
                const oy = (Math.random() - 0.5) * this.size * 2;
                if (typeof game !== 'undefined' && game.particles) {
                    game.particles.push(Particle.acquire(this.pos.x + ox, this.pos.y + oy, this.color));
                }
            }
        }

        // 被击中闪烁
        const flash = this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer * 15) % 2 === 0;

        // 出场缩放
        if (this.state === BOSS_STATE.SPAWNING) {
            ctx.translate(this.pos.x, this.pos.y);
            ctx.scale(this.spawnScale, this.spawnScale);
            ctx.translate(-this.pos.x, -this.pos.y);
        }

        // 子类绘制具体外观
        this.drawBody(ctx, flash);

        // 血条
        this.drawHealthBar(ctx);

        ctx.restore();
    }

    /** 子类重写：绘制Boss具体外观 */
    drawBody(ctx, flash) {
        ctx.fillStyle = flash ? '#FF0000' : this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 绘制血条 */
    drawHealthBar(ctx) {
        const barWidth = this.size * 2.5;
        const barHeight = 6;
        const barX = this.pos.x - barWidth / 2;
        const barY = this.pos.y - this.size - 18;
        const healthPercent = this.health / this.maxHealth;

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血量（渐变色：绿→黄→红）
        let barColor;
        if (healthPercent > 0.5) barColor = '#44ff44';
        else if (healthPercent > 0.25) barColor = '#ffcc00';
        else barColor = '#ff4444';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // 边框
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Boss名字
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.bossName || 'BOSS', this.pos.x, barY - 4);
    }

    /** 绘制方向指示器（当Boss在屏幕外时） */
    drawDirectionIndicator(ctx, cameraX, cameraY, viewW, viewH) {
        // 如果Boss在视野内就不画
        const sx = this.pos.x - cameraX;
        const sy = this.pos.y - cameraY;
        if (sx > -this.size && sx < viewW + this.size && sy > -this.size && sy < viewH + this.size) return;

        // 计算屏幕边缘位置
        const cx = viewW / 2;
        const cy = viewH / 2;
        const dx = sx - cx;
        const dy = sy - cy;
        const angle = Math.atan2(dy, dx);
        const margin = 30;
        const edgeX = cx + Math.cos(angle) * (viewW / 2 - margin);
        const edgeY = cy + Math.sin(angle) * (viewH / 2 - margin);

        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.7)';
        ctx.beginPath();
        ctx.translate(edgeX, edgeY);
        ctx.rotate(angle);
        ctx.moveTo(12, 0);
        ctx.lineTo(-6, -8);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// ===================== Zone 5: 巨型蚯蚓 =====================

export class GiantWormBoss extends Boss {
    constructor(x, y) {
        super(x, y, BOSS_TYPE.GIANT_WORM);
        const cfg = CONFIG.BOSS.WORM;
        this.bossName = '巨型蚯蚓';
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.size = cfg.SIZE;
        this.color = cfg.COLOR;
        this.eyeColor = cfg.EYE_COLOR;

        // 身体节段
        this.segments = [];
        this.segmentCount = cfg.SEGMENTS;
        this.segmentSpacing = cfg.SEG_SPACING;
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push(new Vector(x - i * this.segmentSpacing, y));
        }

        // 行为状态
        this.behaviorState = 'idle';  // idle, charge, burrow
        this.behaviorTimer = 2.0;

        // 冲锋
        this.chargeTarget = null;
        this.chargeSpeed = cfg.CHARGE_SPEED;

        // 潜地
        this.isBurrowed = false;
        this.burrowTimer = 0;
        this.burrowSurfacePos = null;
        this.burrowWarnTimer = 0;
        this.isSurfacing = false;
    }

    updateBehavior(dt, playerPos) {
        this.behaviorTimer -= dt;

        // 潜地状态
        if (this.isBurrowed) {
            this.burrowTimer -= dt;
            if (this.isSurfacing) {
                this.burrowWarnTimer -= dt;
                if (this.burrowWarnTimer <= 0) {
                    // 冲出地面！
                    this.isBurrowed = false;
                    this.isSurfacing = false;
                    this.state = BOSS_STATE.ATTACKING;
                    this.behaviorTimer = 1.5;

                    // 冲出时造成范围伤害（通过game.js检测）
                    if (typeof game !== 'undefined' && game.triggerScreenShake) {
                        game.triggerScreenShake(8, 0.4);
                    }
                    if (typeof game !== 'undefined' && game.particles) {
                        for (let k = 0; k < 15; k++) {
                            game.particles.push(Particle.acquire(this.pos.x, this.pos.y, '#8B6914'));
                        }
                    }
                }
                return;
            }
            if (this.burrowTimer <= 0) {
                // 移到玩家位置准备冲出
                if (playerPos) {
                    this.pos = playerPos.clone ? playerPos.clone() : new Vector(playerPos.x, playerPos.y);
                }
                this.isSurfacing = true;
                this.burrowWarnTimer = CONFIG.BOSS.WORM.BURROW_WARN_TIME;
            }
            return;
        }

        const speedMult = this.phase >= 2 ? CONFIG.BOSS.WORM.PHASE2_SPEED_MULT : 1;
        const cfg = CONFIG.BOSS.WORM;

        // 选择行为
        if (this.behaviorTimer <= 0 || this.behaviorState === 'idle') {
            const roll = Math.random();
            if (roll < 0.5) {
                // 冲锋
                this.behaviorState = 'charge';
                if (playerPos) {
                    this.chargeTarget = playerPos.clone ? playerPos.clone() : new Vector(playerPos.x, playerPos.y);
                    const dir = this.chargeTarget.sub(this.pos).normalize();
                    this.velocity = dir.mult(cfg.CHARGE_SPEED * (this.phase >= 2 ? cfg.PHASE2_CHARGE_MULT : 1));
                }
                this.behaviorTimer = cfg.CHARGE_DISTANCE / (cfg.CHARGE_SPEED * 60) + 0.5;
                this.state = BOSS_STATE.ATTACKING;
            } else if (this.phase >= 2 && roll < 0.8) {
                // 潜地突袭（仅阶段2）
                this.behaviorState = 'burrow';
                this.isBurrowed = true;
                this.burrowTimer = cfg.BURROW_DURATION;
                this.state = BOSS_STATE.SPECIAL;
                this.behaviorTimer = cfg.BURROW_DURATION + cfg.BURROW_WARN_TIME + 1.0;
            } else {
                // 移动追击
                this.behaviorState = 'move';
                this.behaviorTimer = 2.0 + Math.random();
                this.state = BOSS_STATE.MOVING;
            }
        }

        // 行为执行
        switch (this.behaviorState) {
            case 'charge':
                // 冲锋中保持速度
                this.pos = this.pos.add(this.velocity.mult(dt * 60));
                break;
            case 'move':
                if (playerPos) {
                    const dir = playerPos.sub(this.pos).normalize();
                    this.velocity = dir.mult(cfg.SPEED * speedMult);
                    this.pos = this.pos.add(this.velocity.mult(dt * 60));
                }
                break;
        }

        // 更新身体节段
        this.updateSegments();
    }

    updateSegments() {
        if (this.segments.length > 0) {
            this.segments[0] = new Vector(this.pos.x, this.pos.y);
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dx = prev.x - curr.x, dy = prev.y - curr.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) {
                    curr.x = prev.x - dx / d * this.segmentSpacing;
                    curr.y = prev.y - dy / d * this.segmentSpacing;
                }
            }
        }
    }

    onPhaseShift(newPhase) {
        super.onPhaseShift(newPhase);
        // 阶段2：速度提升，解锁潜地
        if (newPhase === 2) {
            this.speed = CONFIG.BOSS.WORM.SPEED * CONFIG.BOSS.WORM.PHASE2_SPEED_MULT;
        }
    }

    drawBody(ctx, flash) {
        // 潜地时只画警告标记
        if (this.isBurrowed && this.isSurfacing) {
            const alpha = Math.sin(this.animTime * 20) * 0.3 + 0.7;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            const warnSize = 30;
            // 画X形警告
            ctx.beginPath();
            ctx.moveTo(this.pos.x - warnSize, this.pos.y - warnSize);
            ctx.lineTo(this.pos.x + warnSize, this.pos.y + warnSize);
            ctx.moveTo(this.pos.x + warnSize, this.pos.y - warnSize);
            ctx.lineTo(this.pos.x - warnSize, this.pos.y + warnSize);
            ctx.stroke();
            // 警告圆圈
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, warnSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }
        if (this.isBurrowed) return;  // 完全潜地不绘制

        const headAngle = Math.atan2(this.velocity.y, this.velocity.x);

        // 绘制身体节段（从尾到头）
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const t = i / this.segments.length;
            const radius = this.size * (1 - t * 0.5);

            ctx.fillStyle = flash ? '#FF0000' : this.color;
            ctx.beginPath();
            ctx.ellipse(seg.x, seg.y, radius, radius * 0.6,
                headAngle, 0, Math.PI * 2);
            ctx.fill();

            // 环纹
            if (i % 2 === 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(seg.x, seg.y, radius, radius * 0.6,
                    headAngle, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // 头部
        const head = this.segments[0];
        if (head) {
            ctx.fillStyle = flash ? '#FF0000' : '#3a6b47';
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // 嘴巴（圆形，暗色）
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            const mouthX = head.x + Math.cos(headAngle) * this.size * 0.5;
            const mouthY = head.y + Math.sin(headAngle) * this.size * 0.5;
            ctx.arc(mouthX, mouthY, this.size * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛
            const eyeOffset = this.size * 0.5;
            const eyeSize = this.size * 0.2;
            const leftEyeX = head.x + Math.cos(headAngle + 0.6) * eyeOffset;
            const leftEyeY = head.y + Math.sin(headAngle + 0.6) * eyeOffset;
            const rightEyeX = head.x + Math.cos(headAngle - 0.6) * eyeOffset;
            const rightEyeY = head.y + Math.sin(headAngle - 0.6) * eyeOffset;

            ctx.fillStyle = this.eyeColor;
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ===================== Zone 10: 暗影蛛母 =====================

export class SpiderBoss extends Boss {
    constructor(x, y) {
        super(x, y, BOSS_TYPE.SPIDER);
        const cfg = CONFIG.BOSS.SPIDER;
        this.bossName = '暗影蛛母';
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.size = cfg.SIZE;
        this.color = cfg.COLOR;
        this.eyeColor = cfg.EYE_COLOR;
        this.legCount = cfg.LEG_COUNT;
        this.legLength = cfg.LEG_LENGTH;

        // 腿动画
        this.legPhase = 0;

        // 蛛网攻击
        this.webCooldown = 0;
        this.webs = [];  // {pos, radius, timer}
        this.webTarget = null;

        // 召唤幼蛛
        this.spawnCooldown = 5.0;
        this.spawnedSpiders = [];  // {pos, health, velocity, timer}

        // 移动模式
        this.moveAngle = Math.random() * Math.PI * 2;
        this.moveTimer = 0;
    }

    updateBehavior(dt, playerPos) {
        const cfg = CONFIG.BOSS.SPIDER;
        const speedMult = this.phase >= 2 ? 1.3 : 1;

        // 腿动画
        this.legPhase += dt * 4;

        // 更新蛛网
        this.webCooldown -= dt;
        for (let i = this.webs.length - 1; i >= 0; i--) {
            this.webs[i].timer -= dt;
            if (this.webs[i].timer <= 0) {
                this.webs.splice(i, 1);
            }
        }

        // 更新幼蛛
        this.spawnCooldown -= dt;
        for (let i = this.spawnedSpiders.length - 1; i >= 0; i--) {
            const sp = this.spawnedSpiders[i];
            sp.timer -= dt;
            sp.pos = sp.pos.add(sp.velocity.mult(dt * 60));
            // 边界反弹
            if (this.homeZone) {
                const z = this.homeZone;
                if (sp.pos.x < z.x + 30 || sp.pos.x > z.x + z.width - 30) sp.velocity.x *= -1;
                if (sp.pos.y < z.y + 30 || sp.pos.y > z.y + z.height - 30) sp.velocity.y *= -1;
            }
            if (sp.timer <= 0) {
                this.spawnedSpiders.splice(i, 1);
            }
        }

        // 移动：8字形绕圈
        this.moveTimer += dt;
        this.moveAngle += dt * 1.5 * speedMult;
        const moveRadius = 80;
        if (playerPos) {
            const targetX = playerPos.x + Math.cos(this.moveAngle) * moveRadius;
            const targetY = playerPos.y + Math.sin(this.moveAngle * 2) * moveRadius * 0.5;
            const dir = new Vector(targetX - this.pos.x, targetY - this.pos.y);
            const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (dist > 5) {
                this.velocity = new Vector(dir.x / dist * cfg.SPEED * speedMult, dir.y / dist * cfg.SPEED * speedMult);
                this.pos = this.pos.add(this.velocity.mult(dt * 60));
            }
        }

        // 攻击：吐蛛网
        if (this.webCooldown <= 0 && playerPos && this.state !== BOSS_STATE.SPAWNING) {
            const dist = this.pos.dist(playerPos);
            if (dist < cfg.WEB_RANGE) {
                this.webCooldown = cfg.WEB_COOLDOWN / (this.phase >= 2 ? 1.5 : 1);
                this.webs.push({
                    pos: new Vector(playerPos.x, playerPos.y),
                    radius: 50,
                    timer: cfg.WEB_SLOW_DURATION,
                });
                this.state = BOSS_STATE.ATTACKING;
                // 攻击状态短暂
                setTimeout(() => { if (this.state === BOSS_STATE.ATTACKING) this.state = BOSS_STATE.MOVING; }, 300);
            }
        }

        // 召唤幼蛛
        const spawnMax = this.phase >= 2 ? cfg.SPAWN_COUNT * cfg.PHASE2_SPAWN_MULT : cfg.SPAWN_COUNT;
        if (this.spawnCooldown <= 0 && this.spawnedSpiders.length < spawnMax) {
            this.spawnCooldown = cfg.SPAWN_INTERVAL / (this.phase >= 2 ? 1.5 : 1);
            const count = this.phase >= 2 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.spawnedSpiders.push({
                    pos: new Vector(this.pos.x + Math.cos(angle) * 30, this.pos.y + Math.sin(angle) * 30),
                    health: cfg.SPAWN_HEALTH,
                    velocity: new Vector(Math.cos(angle) * 2, Math.sin(angle) * 2),
                    timer: 15,  // 15秒后消失
                });
            }
            this.state = BOSS_STATE.SPECIAL;
        }
    }

    /** 检测玩家是否在蛛网上 */
    checkWebSlow(playerPos) {
        for (const web of this.webs) {
            const dist = playerPos.dist(web.pos);
            if (dist < web.radius) {
                return CONFIG.BOSS.SPIDER.WEB_SLOW_FACTOR;
            }
        }
        return 1.0;  // 无减速
    }

    drawBody(ctx, flash) {
        const cfg = CONFIG.BOSS.SPIDER;

        // 绘制蛛网
        for (const web of this.webs) {
            const alpha = web.timer / cfg.WEB_SLOW_DURATION * 0.3;
            ctx.strokeStyle = `rgba(200,200,255,${alpha})`;
            ctx.lineWidth = 1;
            // 蛛网图案
            for (let r = 0; r < 3; r++) {
                ctx.beginPath();
                ctx.arc(web.pos.x, web.pos.y, web.radius * (r + 1) / 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            for (let a = 0; a < 8; a++) {
                const angle = a * Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(web.pos.x, web.pos.y);
                ctx.lineTo(web.pos.x + Math.cos(angle) * web.radius, web.pos.y + Math.sin(angle) * web.radius);
                ctx.stroke();
            }
        }

        // 绘制幼蛛
        for (const sp of this.spawnedSpiders) {
            ctx.fillStyle = '#4a2d6e';
            ctx.beginPath();
            ctx.arc(sp.pos.x, sp.pos.y, cfg.SPAWN_SIZE, 0, Math.PI * 2);
            ctx.fill();
            // 幼蛛眼睛
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(sp.pos.x - 3, sp.pos.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sp.pos.x + 3, sp.pos.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制腿
        ctx.strokeStyle = flash ? '#FF0000' : '#4a2d6e';
        ctx.lineWidth = 3;
        for (let i = 0; i < this.legCount; i++) {
            const baseAngle = (i / this.legCount) * Math.PI * 2;
            const legSwing = Math.sin(this.legPhase + i * 0.8) * 0.4;
            const angle = baseAngle + legSwing;
            const midDist = this.legLength * 0.6;
            const endDist = this.legLength;

            const midX = this.pos.x + Math.cos(angle) * midDist + Math.cos(angle + Math.PI / 2) * Math.sin(this.legPhase + i) * 8;
            const midY = this.pos.y + Math.sin(angle) * midDist + Math.sin(angle + Math.PI / 2) * Math.sin(this.legPhase + i) * 8;
            const endX = this.pos.x + Math.cos(angle) * endDist;
            const endY = this.pos.y + Math.sin(angle) * endDist;

            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        }

        // 身体（椭圆形腹部）
        ctx.fillStyle = flash ? '#FF0000' : this.color;
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y + 5, this.size * 0.9, this.size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 头部
        ctx.fillStyle = flash ? '#FF0000' : '#3d2266';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y - this.size * 0.5, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // 8只眼睛
        for (let i = 0; i < 4; i++) {
            const eyeAngle = -Math.PI / 2 + (i - 1.5) * 0.35;
            const eyeDist = this.size * 0.4;
            const ex = this.pos.x + Math.cos(eyeAngle) * eyeDist;
            const ey = this.pos.y - this.size * 0.5 + Math.sin(eyeAngle) * eyeDist;

            ctx.fillStyle = this.eyeColor;
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fill();
            // 对称的眼睛
            const ex2 = this.pos.x - (ex - this.pos.x);
            ctx.beginPath();
            ctx.arc(ex2, ey, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ===================== Zone 15: 晶石守卫 =====================

export class CrystalGuardian extends Boss {
    constructor(x, y) {
        super(x, y, BOSS_TYPE.CRYSTAL_GUARDIAN);
        const cfg = CONFIG.BOSS.CRYSTAL;
        this.bossName = '晶石守卫';
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.size = cfg.SIZE;
        this.color = cfg.COLOR;
        this.coreColor = cfg.CORE_COLOR;
        this.shardColor = cfg.SHARD_COLOR;

        // 旋转水晶护盾
        this.shards = [];
        this.shardCount = cfg.SHARD_COUNT;
        this.shardRadius = cfg.SHARD_RADIUS;
        this.orbitAngle = 0;
        this.orbitSpeed = cfg.ORBIT_SPEED;
        for (let i = 0; i < this.shardCount; i++) {
            this.shards.push({
                angle: (i / this.shardCount) * Math.PI * 2,
                health: 2,  // 每块水晶需要2次击中
                active: true,
            });
        }

        // 弹幕
        this.projectiles = [];  // {pos, velocity, timer}
        this.projCooldown = 0;

        // 移动
        this.moveTarget = null;
        this.moveTimer = 0;
    }

    updateBehavior(dt, playerPos) {
        const cfg = CONFIG.BOSS.CRYSTAL;
        const speedMult = this.phase >= 2 ? 1.4 : 1;

        // 旋转护盾
        this.orbitAngle += this.orbitSpeed * (this.phase >= 2 ? cfg.PHASE2_ORBIT_MULT : 1) * dt;

        // 更新弹幕
        this.projCooldown -= dt;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.pos = p.pos.add(p.velocity.mult(dt * 60));
            p.timer -= dt;
            if (p.timer <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        // 移动：在区域内随机移动
        this.moveTimer -= dt;
        if (this.moveTimer <= 0 || !this.moveTarget) {
            this.moveTimer = 2 + Math.random() * 2;
            if (this.homeZone) {
                const z = this.homeZone;
                const pad = 80;
                this.moveTarget = new Vector(
                    z.x + pad + Math.random() * (z.width - pad * 2),
                    z.y + pad + Math.random() * (z.height - pad * 2)
                );
            }
        }
        if (this.moveTarget) {
            const dir = this.moveTarget.sub(this.pos);
            const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (dist > 10) {
                this.velocity = new Vector(dir.x / dist * cfg.SPEED * speedMult, dir.y / dist * cfg.SPEED * speedMult);
                this.pos = this.pos.add(this.velocity.mult(dt * 60));
            }
        }

        // 攻击：发射弹幕
        if (this.projCooldown <= 0 && playerPos && this.state !== BOSS_STATE.SPAWNING) {
            this.projCooldown = cfg.PROJECTILE_COOLDOWN / (this.phase >= 2 ? 1.5 : 1);
            const projCount = this.phase >= 2 ? cfg.PROJECTILE_COUNT * cfg.PHASE2_PROJ_MULT : cfg.PROJECTILE_COUNT;

            // 向玩家方向发射扇形弹幕
            const baseAngle = Math.atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
            const spread = Math.PI / 3;  // 60度扇形

            for (let i = 0; i < projCount; i++) {
                const angle = baseAngle - spread / 2 + (spread / (projCount - 1)) * i;
                this.projectiles.push({
                    pos: new Vector(this.pos.x, this.pos.y),
                    velocity: new Vector(Math.cos(angle) * cfg.PROJECTILE_SPEED, Math.sin(angle) * cfg.PROJECTILE_SPEED),
                    timer: 4.0,
                });
            }
            this.state = BOSS_STATE.ATTACKING;
        }
    }

    /** 检测弹幕与玩家碰撞 */
    checkProjectileCollision(playerPos, playerRadius) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dist = p.pos.dist(playerPos);
            if (dist < playerRadius + 6) {
                this.projectiles.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /** 检测子弹是否击中护盾水晶 */
    checkShieldHit(bulletPos, bulletRadius) {
        for (const shard of this.shards) {
            if (!shard.active) continue;
            const sx = this.pos.x + Math.cos(this.orbitAngle + shard.angle) * this.shardRadius;
            const sy = this.pos.y + Math.sin(this.orbitAngle + shard.angle) * this.shardRadius;
            const dist = Math.sqrt((bulletPos.x - sx) ** 2 + (bulletPos.y - sy) ** 2);
            if (dist < bulletRadius + CONFIG.BOSS.CRYSTAL.SHARD_SIZE) {
                shard.health--;
                if (shard.health <= 0) {
                    shard.active = false;
                    // 水晶破碎特效
                    if (typeof game !== 'undefined' && game.particles) {
                        for (let k = 0; k < 8; k++) {
                            game.particles.push(Particle.acquire(sx, sy, this.shardColor));
                        }
                    }
                }
                return true;  // 子弹被护盾挡住
            }
        }
        return false;  // 没击中护盾
    }

    drawBody(ctx, flash) {
        const cfg = CONFIG.BOSS.CRYSTAL;

        // 绘制弹幕
        for (const p of this.projectiles) {
            ctx.fillStyle = '#c77dff';
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            // 发光
            ctx.fillStyle = 'rgba(199,125,255,0.3)';
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制旋转护盾水晶
        for (const shard of this.shards) {
            if (!shard.active) continue;
            const sx = this.pos.x + Math.cos(this.orbitAngle + shard.angle) * this.shardRadius;
            const sy = this.pos.y + Math.sin(this.orbitAngle + shard.angle) * this.shardRadius;

            // 水晶形状（菱形）
            ctx.fillStyle = flash ? '#FF0000' : this.shardColor;
            ctx.beginPath();
            const ss = cfg.SHARD_SIZE;
            ctx.moveTo(sx, sy - ss);
            ctx.lineTo(sx + ss * 0.6, sy);
            ctx.lineTo(sx, sy + ss);
            ctx.lineTo(sx - ss * 0.6, sy);
            ctx.closePath();
            ctx.fill();

            // 水晶高光
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(sx, sy - ss * 0.6);
            ctx.lineTo(sx + ss * 0.2, sy - ss * 0.1);
            ctx.lineTo(sx, sy + ss * 0.2);
            ctx.lineTo(sx - ss * 0.2, sy - ss * 0.1);
            ctx.closePath();
            ctx.fill();
        }

        // 核心（六边形）
        const coreSize = cfg.CORE_SIZE;
        ctx.fillStyle = flash ? '#FF0000' : this.coreColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + this.animTime * 0.5;
            const px = this.pos.x + Math.cos(angle) * coreSize;
            const py = this.pos.y + Math.sin(angle) * coreSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // 核心发光
        const glowAlpha = 0.2 + Math.sin(this.animTime * 3) * 0.1;
        ctx.fillStyle = `rgba(224,170,255,${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, coreSize * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 核心眼睛
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ===================== Zone 20: 炎龙蜥 =====================

export class LavaLizard extends Boss {
    constructor(x, y) {
        super(x, y, BOSS_TYPE.LAVA_LIZARD);
        const cfg = CONFIG.BOSS.LIZARD;
        this.bossName = '炎龙蜥';
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.size = cfg.SIZE;
        this.color = cfg.COLOR;
        this.eyeColor = cfg.EYE_COLOR;

        // 蛇形身体
        this.segments = [];
        this.segmentCount = cfg.SEGMENTS;
        this.segmentSpacing = cfg.SEG_SPACING;
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push(new Vector(x - i * this.segmentSpacing, y));
        }

        // 火焰吐息
        this.isBreathing = false;
        this.breathTimer = 0;
        this.breathAngle = 0;
        this.breathCooldown = 3.0;

        // 岩浆路径
        this.lavaTrail = [];  // {pos, timer}

        // 移动
        this.moveAngle = 0;
        this.moveTimer = 0;
    }

    updateBehavior(dt, playerPos) {
        const cfg = CONFIG.BOSS.LIZARD;
        const speedMult = this.phase >= 2 ? cfg.PHASE2_SPEED_MULT : 1;

        // 更新岩浆路径
        for (let i = this.lavaTrail.length - 1; i >= 0; i--) {
            this.lavaTrail[i].timer -= dt;
            if (this.lavaTrail[i].timer <= 0) {
                this.lavaTrail.splice(i, 1);
            }
        }

        // 留下岩浆路径
        if (this.state === BOSS_STATE.MOVING || this.state === BOSS_STATE.ATTACKING) {
            if (Math.random() < 0.3) {
                this.lavaTrail.push({
                    pos: new Vector(this.pos.x + (Math.random() - 0.5) * 10, this.pos.y + (Math.random() - 0.5) * 10),
                    timer: cfg.LAVA_DURATION,
                });
            }
        }

        // 火焰吐息
        this.breathCooldown -= dt;
        if (this.isBreathing) {
            this.breathTimer -= dt;
            if (this.breathTimer <= 0) {
                this.isBreathing = false;
                this.breathCooldown = cfg.BREATH_COOLDOWN / (this.phase >= 2 ? cfg.PHASE2_BREATH_MULT : 1);
                this.state = BOSS_STATE.MOVING;
            }
            return;
        }

        // 移动：环绕玩家
        this.moveTimer += dt;
        this.moveAngle += dt * 1.2 * speedMult;
        const orbitRadius = 120;
        if (playerPos) {
            const targetX = playerPos.x + Math.cos(this.moveAngle) * orbitRadius;
            const targetY = playerPos.y + Math.sin(this.moveAngle) * orbitRadius;
            const dir = new Vector(targetX - this.pos.x, targetY - this.pos.y);
            const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            if (dist > 10) {
                this.velocity = new Vector(dir.x / dist * cfg.SPEED * speedMult, dir.y / dist * cfg.SPEED * speedMult);
                this.pos = this.pos.add(this.velocity.mult(dt * 60));
            }
        }

        // 发射火焰吐息
        if (this.breathCooldown <= 0 && playerPos) {
            this.isBreathing = true;
            this.breathTimer = cfg.BREATH_DURATION;
            this.breathAngle = Math.atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
            this.state = BOSS_STATE.ATTACKING;
        }

        // 更新身体节段
        this.updateSegments();
    }

    updateSegments() {
        if (this.segments.length > 0) {
            this.segments[0] = new Vector(this.pos.x, this.pos.y);
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dx = prev.x - curr.x, dy = prev.y - curr.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) {
                    curr.x = prev.x - dx / d * this.segmentSpacing;
                    curr.y = prev.y - dy / d * this.segmentSpacing;
                }
            }
        }
    }

    /** 检测火焰吐息碰撞 */
    checkBreathCollision(playerPos, playerRadius) {
        if (!this.isBreathing) return false;
        const cfg = CONFIG.BOSS.LIZARD;
        const dx = playerPos.x - this.pos.x;
        const dy = playerPos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cfg.BREATH_RANGE + playerRadius) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.breathAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) < cfg.BREATH_ANGLE / 2;
    }

    /** 检测岩浆路径碰撞 */
    checkLavaCollision(playerPos, playerRadius) {
        for (const lava of this.lavaTrail) {
            const dist = playerPos.dist(lava.pos);
            if (dist < playerRadius + 15) {
                return true;
            }
        }
        return false;
    }

    drawBody(ctx, flash) {
        const cfg = CONFIG.BOSS.LIZARD;
        const headAngle = Math.atan2(this.velocity.y, this.velocity.x);

        // 绘制岩浆路径
        for (const lava of this.lavaTrail) {
            const alpha = lava.timer / cfg.LAVA_DURATION * 0.5;
            const pulse = Math.sin(this.animTime * 5 + lava.pos.x) * 0.2 + 0.8;
            ctx.fillStyle = `rgba(255,107,53,${alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(lava.pos.x, lava.pos.y, 15, 0, Math.PI * 2);
            ctx.fill();
            // 岩浆核心
            ctx.fillStyle = `rgba(255,200,0,${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(lava.pos.x, lava.pos.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制火焰吐息
        if (this.isBreathing) {
            const breathProgress = 1 - (this.breathTimer / cfg.BREATH_DURATION);
            const breathLength = cfg.BREATH_RANGE * breathProgress;
            const halfAngle = cfg.BREATH_ANGLE / 2;

            // 多层火焰
            for (let layer = 0; layer < 3; layer++) {
                const layerAlpha = (3 - layer) / 3 * 0.6;
                const layerSpread = halfAngle * (1 + layer * 0.3);
                const layerLength = breathLength * (1 - layer * 0.2);

                ctx.fillStyle = layer === 0 ? `rgba(255,255,100,${layerAlpha})` :
                    layer === 1 ? `rgba(255,150,0,${layerAlpha})` :
                        `rgba(255,50,0,${layerAlpha * 0.5})`;

                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.arc(this.pos.x, this.pos.y, layerLength, this.breathAngle - layerSpread, this.breathAngle + layerSpread);
                ctx.closePath();
                ctx.fill();
            }
        }

        // 绘制身体节段（从尾到头）
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const t = i / this.segments.length;
            const radius = this.size * (1 - t * 0.6);

            // 渐变色：头部深橙→尾部暗红
            const r = 255 - t * 80;
            const g = 69 - t * 40;
            const b = 0;
            ctx.fillStyle = flash ? '#FF0000' : `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.ellipse(seg.x, seg.y, radius, radius * 0.5,
                headAngle, 0, Math.PI * 2);
            ctx.fill();

            // 鳞片纹理
            if (i % 3 === 0 && i > 0) {
                ctx.strokeStyle = 'rgba(255,200,0,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(seg.x, seg.y, radius * 0.8, radius * 0.4,
                    headAngle, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // 头部
        const head = this.segments[0];
        if (head) {
            ctx.fillStyle = flash ? '#FF0000' : '#cc3300';
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.size * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // 角
            ctx.fillStyle = '#8B4513';
            const hornLen = this.size * 0.8;
            const leftHornX = head.x + Math.cos(headAngle + 0.8) * hornLen;
            const leftHornY = head.y + Math.sin(headAngle + 0.8) * hornLen;
            const rightHornX = head.x + Math.cos(headAngle - 0.8) * hornLen;
            const rightHornY = head.y + Math.sin(headAngle - 0.8) * hornLen;

            ctx.lineWidth = 4;
            ctx.strokeStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(head.x + Math.cos(headAngle + 0.5) * this.size * 0.6, head.y + Math.sin(headAngle + 0.5) * this.size * 0.6);
            ctx.lineTo(leftHornX, leftHornY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(head.x + Math.cos(headAngle - 0.5) * this.size * 0.6, head.y + Math.sin(headAngle - 0.5) * this.size * 0.6);
            ctx.lineTo(rightHornX, rightHornY);
            ctx.stroke();

            // 眼睛（发光）
            const eyeOffset = this.size * 0.5;
            const eyeSize = this.size * 0.22;
            const leftEyeX = head.x + Math.cos(headAngle + 0.5) * eyeOffset;
            const leftEyeY = head.y + Math.sin(headAngle + 0.5) * eyeOffset;
            const rightEyeX = head.x + Math.cos(headAngle - 0.5) * eyeOffset;
            const rightEyeY = head.y + Math.sin(headAngle - 0.5) * eyeOffset;

            // 眼睛发光
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = this.eyeColor;
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // 竖瞳
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(leftEyeX, leftEyeY, eyeSize * 0.3, eyeSize * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(rightEyeX, rightEyeY, eyeSize * 0.3, eyeSize * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ===================== Zone 25: 虫后（终极Boss） =====================

export class QueenBoss extends Boss {
    constructor(x, y) {
        super(x, y, BOSS_TYPE.QUEEN);
        const cfg = CONFIG.BOSS.QUEEN;
        this.bossName = '虫后';
        this.health = cfg.HEALTH;
        this.maxHealth = cfg.HEALTH;
        this.size = cfg.SIZE;
        this.color = cfg.COLOR;
        this.eyeColor = cfg.EYE_COLOR;
        this.queenColor = cfg.QUEEN_COLOR;
        this.maxPhase = 3;  // 三阶段

        // 阶段1：冲锋+召唤
        this.chargeTarget = null;
        this.chargeCooldown = 2.0;
        this.spawnCooldown = 3.0;
        this.spawnedMinions = [];

        // 阶段2：弹幕+护盾
        this.shards = [];
        this.shardCount = cfg.PHASE2_SHARD_COUNT;
        this.shardRadius = cfg.PHASE2_SHARD_RADIUS;
        this.orbitAngle = 0;
        this.orbitSpeed = cfg.PHASE2_ORBIT_SPEED;
        for (let i = 0; i < this.shardCount; i++) {
            this.shards.push({ angle: (i / this.shardCount) * Math.PI * 2, active: true });
        }
        this.projectiles = [];
        this.projCooldown = 0;

        // 阶段3：狂暴
        this.rageBreathTimer = 0;
        this.isBreathing = false;
        this.breathAngle = 0;

        // 翅膀动画
        this.wingPhase = 0;

        // 光环
        this.auraRadius = 80;
    }

    updateBehavior(dt, playerPos) {
        const cfg = CONFIG.BOSS.QUEEN;
        this.wingPhase += dt * 3;

        // 更新小兵
        for (let i = this.spawnedMinions.length - 1; i >= 0; i--) {
            const m = this.spawnedMinions[i];
            m.timer -= dt;
            m.pos = m.pos.add(m.velocity.mult(dt * 60));
            // 追踪玩家
            if (playerPos && m.timer > 2) {
                const dir = playerPos.sub(m.pos).normalize();
                m.velocity = m.velocity.add(dir.mult(0.1));
                const speed = Math.sqrt(m.velocity.x * m.velocity.x + m.velocity.y * m.velocity.y);
                if (speed > 3) {
                    m.velocity = m.velocity.normalize().mult(3);
                }
            }
            if (m.timer <= 0) {
                this.spawnedMinions.splice(i, 1);
            }
        }

        // 更新弹幕
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.pos = p.pos.add(p.velocity.mult(dt * 60));
            p.timer -= dt;
            if (p.timer <= 0) this.projectiles.splice(i, 1);
        }

        // 旋转护盾
        this.orbitAngle += this.orbitSpeed * dt;

        // 根据阶段切换行为
        if (this.phase === 1) {
            this.updatePhase1(dt, playerPos, cfg);
        } else if (this.phase === 2) {
            this.updatePhase2(dt, playerPos, cfg);
        } else {
            this.updatePhase3(dt, playerPos, cfg);
        }
    }

    /** 阶段1：冲锋+召唤 */
    updatePhase1(dt, playerPos, cfg) {
        // 移动追击
        if (playerPos) {
            const dir = playerPos.sub(this.pos).normalize();
            this.velocity = dir.mult(cfg.SPEED);
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        }

        // 冲锋攻击
        this.chargeCooldown -= dt;
        if (this.chargeCooldown <= 0 && playerPos) {
            this.chargeCooldown = cfg.PHASE1_CHARGE_COOLDOWN;
            const dir = playerPos.sub(this.pos).normalize();
            this.velocity = dir.mult(cfg.PHASE1_CHARGE_SPEED);
            this.state = BOSS_STATE.ATTACKING;
            // 冲锋持续一小段时间
            const chargeTime = 0.5;
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        }

        // 召唤小兵
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0 && this.spawnedMinions.length < cfg.PHASE1_SPAWN_COUNT) {
            this.spawnCooldown = 6.0;
            const angle = Math.random() * Math.PI * 2;
            this.spawnedMinions.push({
                pos: new Vector(this.pos.x + Math.cos(angle) * 40, this.pos.y + Math.sin(angle) * 40),
                velocity: new Vector(Math.cos(angle) * 2, Math.sin(angle) * 2),
                timer: 20,
            });
            this.state = BOSS_STATE.SPECIAL;
        }
    }

    /** 阶段2：弹幕+护盾（类似水晶守卫） */
    updatePhase2(dt, playerPos, cfg) {
        // 缓慢移动
        if (playerPos) {
            const dist = this.pos.dist(playerPos);
            if (dist > 150) {
                const dir = playerPos.sub(this.pos).normalize();
                this.velocity = dir.mult(cfg.SPEED * 0.7);
                this.pos = this.pos.add(this.velocity.mult(dt * 60));
            }
        }

        // 弹幕攻击
        this.projCooldown -= dt;
        if (this.projCooldown <= 0 && playerPos) {
            this.projCooldown = cfg.PHASE2_PROJECTILE_COOLDOWN;
            const baseAngle = Math.atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
            const count = cfg.PHASE2_PROJECTILE_COUNT;
            const spread = Math.PI / 2;

            for (let i = 0; i < count; i++) {
                const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
                this.projectiles.push({
                    pos: new Vector(this.pos.x, this.pos.y),
                    velocity: new Vector(Math.cos(angle) * cfg.PHASE2_PROJECTILE_SPEED, Math.sin(angle) * cfg.PHASE2_PROJECTILE_SPEED),
                    timer: 5.0,
                });
            }
            this.state = BOSS_STATE.ATTACKING;
        }
    }

    /** 阶段3：全机制+狂暴 */
    updatePhase3(dt, playerPos, cfg) {
        const speedMult = cfg.PHASE3_SPEED_MULT;

        // 移动
        if (playerPos) {
            const dir = playerPos.sub(this.pos).normalize();
            this.velocity = dir.mult(cfg.SPEED * speedMult);
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        }

        // 快速冲锋
        this.chargeCooldown -= dt;
        if (this.chargeCooldown <= 0 && playerPos) {
            this.chargeCooldown = cfg.PHASE1_CHARGE_COOLDOWN / cfg.PHASE3_CHARGE_MULT;
            const dir = playerPos.sub(this.pos).normalize();
            this.velocity = dir.mult(cfg.PHASE1_CHARGE_SPEED * cfg.PHASE3_CHARGE_MULT);
            this.state = BOSS_STATE.ATTACKING;
        }

        // 更快弹幕
        this.projCooldown -= dt;
        if (this.projCooldown <= 0 && playerPos) {
            this.projCooldown = cfg.PHASE2_PROJECTILE_COOLDOWN / cfg.PHASE3_PROJ_MULT;
            const count = Math.round(cfg.PHASE2_PROJECTILE_COUNT * cfg.PHASE3_PROJ_MULT);
            const baseAngle = Math.atan2(playerPos.y - this.pos.y, playerPos.x - this.pos.x);
            for (let i = 0; i < count; i++) {
                const angle = baseAngle - Math.PI / 3 + (Math.PI * 2 / 3 / (count - 1)) * i;
                this.projectiles.push({
                    pos: new Vector(this.pos.x, this.pos.y),
                    velocity: new Vector(Math.cos(angle) * cfg.PHASE2_PROJECTILE_SPEED * cfg.PHASE3_PROJ_MULT, Math.sin(angle) * cfg.PHASE2_PROJECTILE_SPEED * cfg.PHASE3_PROJ_MULT),
                    timer: 5.0,
                });
            }
        }

        // 持续召唤
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0 && this.spawnedMinions.length < cfg.PHASE1_SPAWN_COUNT * 2) {
            this.spawnCooldown = cfg.PHASE3_SPAWN_INTERVAL;
            for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.spawnedMinions.push({
                    pos: new Vector(this.pos.x + Math.cos(angle) * 50, this.pos.y + Math.sin(angle) * 50),
                    velocity: new Vector(Math.cos(angle) * 3, Math.sin(angle) * 3),
                    timer: 20,
                });
            }
        }
    }

    /** 检测弹幕碰撞 */
    checkProjectileCollision(playerPos, playerRadius) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dist = p.pos.dist(playerPos);
            if (dist < playerRadius + 6) {
                this.projectiles.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /** 检测护盾碰撞 */
    checkShieldHit(bulletPos, bulletRadius) {
        if (this.phase < 2) return false;
        for (const shard of this.shards) {
            if (!shard.active) continue;
            const sx = this.pos.x + Math.cos(this.orbitAngle + shard.angle) * this.shardRadius;
            const sy = this.pos.y + Math.sin(this.orbitAngle + shard.angle) * this.shardRadius;
            const dist = Math.sqrt((bulletPos.x - sx) ** 2 + (bulletPos.y - sy) ** 2);
            if (dist < bulletRadius + 10) {
                shard.active = false;
                if (typeof game !== 'undefined' && game.particles) {
                    for (let k = 0; k < 8; k++) {
                        game.particles.push(Particle.acquire(sx, sy, '#ff1493'));
                    }
                }
                return true;
            }
        }
        return false;
    }

    onPhaseShift(newPhase) {
        super.onPhaseShift(newPhase);
        // 阶段转换时重置护盾
        if (newPhase === 2) {
            this.shards.forEach(s => s.active = true);
        }
        if (newPhase === 3) {
            this.shards.forEach(s => s.active = true);
            if (typeof game !== 'undefined' && game.floatingTexts) {
                game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 50, '虫后暴怒了！', '#ff0000'));
            }
        }
    }

    drawBody(ctx, flash) {
        const cfg = CONFIG.BOSS.QUEEN;

        // 绘制小兵
        for (const m of this.spawnedMinions) {
            ctx.fillStyle = '#cc3366';
            ctx.beginPath();
            ctx.arc(m.pos.x, m.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.arc(m.pos.x - 2, m.pos.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(m.pos.x + 2, m.pos.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制弹幕
        for (const p of this.projectiles) {
            ctx.fillStyle = '#ff1493';
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,20,147,0.3)';
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制护盾水晶（阶段2+）
        if (this.phase >= 2) {
            for (const shard of this.shards) {
                if (!shard.active) continue;
                const sx = this.pos.x + Math.cos(this.orbitAngle + shard.angle) * this.shardRadius;
                const sy = this.pos.y + Math.sin(this.orbitAngle + shard.angle) * this.shardRadius;

                ctx.fillStyle = flash ? '#FF0000' : '#ff1493';
                ctx.beginPath();
                const ss = 10;
                ctx.moveTo(sx, sy - ss);
                ctx.lineTo(sx + ss * 0.6, sy);
                ctx.lineTo(sx, sy + ss);
                ctx.lineTo(sx - ss * 0.6, sy);
                ctx.closePath();
                ctx.fill();
            }
        }

        // 光环
        const auraAlpha = 0.1 + Math.sin(this.animTime * 2) * 0.05;
        const auraColor = this.phase === 1 ? `rgba(139,0,0,${auraAlpha})` :
            this.phase === 2 ? `rgba(255,20,147,${auraAlpha})` :
                `rgba(255,215,0,${auraAlpha})`;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 翅膀
        const wingSpread = 0.3 + Math.sin(this.wingPhase) * 0.2;
        ctx.fillStyle = flash ? '#FF0000' : `${this.queenColor}88`;
        // 左翅
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.quadraticCurveTo(
            this.pos.x - this.size * 2, this.pos.y - this.size * (1 + wingSpread),
            this.pos.x - this.size * 0.5, this.pos.y + this.size * 0.5
        );
        ctx.fill();
        // 右翅
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.quadraticCurveTo(
            this.pos.x + this.size * 2, this.pos.y - this.size * (1 + wingSpread),
            this.pos.x + this.size * 0.5, this.pos.y + this.size * 0.5
        );
        ctx.fill();

        // 身体（椭圆腹部 + 花纹）
        ctx.fillStyle = flash ? '#FF0000' : this.color;
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y + 5, this.size * 0.8, this.size * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 腹部花纹
        ctx.strokeStyle = this.queenColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const stripeY = this.pos.y - this.size * 0.3 + i * this.size * 0.35;
            ctx.beginPath();
            ctx.moveTo(this.pos.x - this.size * 0.6, stripeY);
            ctx.lineTo(this.pos.x + this.size * 0.6, stripeY);
            ctx.stroke();
        }

        // 头部（皇冠）
        ctx.fillStyle = flash ? '#FF0000' : '#660033';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y - this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // 皇冠
        const crownY = this.pos.y - this.size * 1.1;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(this.pos.x - this.size * 0.5, crownY + 8);
        ctx.lineTo(this.pos.x - this.size * 0.4, crownY - 8);
        ctx.lineTo(this.pos.x - this.size * 0.2, crownY);
        ctx.lineTo(this.pos.x, crownY - 12);
        ctx.lineTo(this.pos.x + this.size * 0.2, crownY);
        ctx.lineTo(this.pos.x + this.size * 0.4, crownY - 8);
        ctx.lineTo(this.pos.x + this.size * 0.5, crownY + 8);
        ctx.closePath();
        ctx.fill();

        // 皇冠宝石
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.pos.x, crownY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛
        const eyeOffset = this.size * 0.3;
        const eyeSize = this.size * 0.15;
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath();
        ctx.arc(this.pos.x - eyeOffset, this.pos.y - this.size * 0.6, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.pos.x + eyeOffset, this.pos.y - this.size * 0.6, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛发光（狂暴阶段更明显）
        if (this.phase >= 3) {
            ctx.fillStyle = 'rgba(255,215,0,0.4)';
            ctx.beginPath();
            ctx.arc(this.pos.x - eyeOffset, this.pos.y - this.size * 0.6, eyeSize * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.pos.x + eyeOffset, this.pos.y - this.size * 0.6, eyeSize * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ===================== Boss工厂 =====================

/**
 * 根据区域ID创建对应的Boss
 * @param {number} zoneId - 区域ID (5/10/15/20/25)
 * @param {number} x - Boss生成X坐标
 * @param {number} y - Boss生成Y坐标
 * @returns {Boss|null}
 */
export function createBoss(zoneId, x, y) {
    switch (zoneId) {
        case 5: return new GiantWormBoss(x, y);
        case 10: return new SpiderBoss(x, y);
        case 15: return new CrystalGuardian(x, y);
        case 20: return new LavaLizard(x, y);
        case 25: return new QueenBoss(x, y);
        default: return null;
    }
}
