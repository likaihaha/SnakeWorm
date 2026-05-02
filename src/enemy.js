import { Vector } from './vector.js';
import { CONFIG, ENEMY_STATE } from './config.js';
import { FloatingText, Particle } from './entities.js';
import { DeadBody } from './dead-body.js';

export { ENEMY_STATE };

export class Enemy {
    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.velocity = Vector.randomDir().mult(CONFIG.FAMILY.ENEMY_SPEED);
        this.size = CONFIG.FAMILY.ENEMY_SIZE;
        this.color = '#8B4513';  // 棕色
        this.eyeColor = '#FF4444';  // 红色眼睛
        this.segments = [];  // 身体节段
        this.segmentCount = CONFIG.FAMILY.ENEMY_SEGMENTS;
        this.phase = Math.random() * Math.PI * 2;  // 动画相位
        this.isAlive = true;
        this.state = ENEMY_STATE.WANDERING;  // 当前状态
        this.hitTimer = 0;  // 被击中闪烁计时器
        this.health = CONFIG.FAMILY.ENEMY_HEALTH;  // 生命值
        this.maxHealth = CONFIG.FAMILY.ENEMY_HEALTH;  // 最大生命值
        this.knockbackVelocity = null;  // 击退速度
        this.knockbackTimer = 0;  // 击退计时器
        this.chaseTarget = null;  // 追击目标
        this.wanderTimer = 0;
        this.wanderDir = Vector.randomDir();

        // 死亡下沉相关
        this.isDying = false;  // 是否正在死亡下沉
        this.deathTimer = 0;  // 死亡动画计时器
        this.deathDuration = CONFIG.FAMILY.ENEMY_DEATH_DURATION;  // 死亡动画持续时间
        this.sinkSpeed = 0;  // 下沉速度
        this.bounceVelocity = null;  // 弹开速度

        // 咬住幼体相关
        this.latchedJuvenile = null;  // 咬住的幼体引用
        this.latchedSegmentIndex = -1;  // 咬住的段索引
        this.biteDamageTimer = 0;  // 伤害计时器

        // 绕圈观察相关
        this.isCircling = false;  // 是否正在绕圈
        this.circleTarget = null;  // 绕圈目标（幼体）
        this.circleAngle = 0;  // 当前绕圈角度
        this.circleRadius = CONFIG.FAMILY.ENEMY_CIRCLE_RADIUS;  // 绕圈半径
        this.circleSpeed = CONFIG.FAMILY.ENEMY_CIRCLE_SPEED;  // 绕圈速度（弧度/秒）
        this.circleCount = 0;  // 已绕圈数
        this.circlesBeforeAttack = CONFIG.FAMILY.ENEMY_CIRCLES_BEFORE_ATTACK + Math.random();  // 攻击前绕2-3圈

        // 觅食相关
        this.feedingTarget = null;  // 觅食目标（shrinkingSegment或白色宝珠）
        this.feedingTimer = 0;  // 觅食计时器
        this.feedingCooldown = 0;  // 觅食冷却时间

        // 咬成功后冷却（见好就收，不再追幼体）
        this.biteCooldown = 0;  // 咬成功后冷却计时器

        // 初始化身体节段
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push(new Vector(x - i * CONFIG.FAMILY.ENEMY_SEG_SPACING, y));
        }
    }

    update(dt, juveniles, player) {
        if (!this.isAlive) return;

        // 死亡下沉动画
        if (this.isDying) {
            this.state = ENEMY_STATE.DYING;
            this.updateDying(dt);
            return;
        }

        this.phase += dt * CONFIG.FAMILY.ENEMY_BOB_SPEED;
        this.hitTimer -= dt;
        this.wanderTimer -= dt;
        this.knockbackTimer -= dt;

        // 击退效果（就地修改，不创建临时Vector）
        if (this.knockbackVelocity && this.knockbackTimer > 0) {
            this.pos.x += this.knockbackVelocity.x * dt * 60;
            this.pos.y += this.knockbackVelocity.y * dt * 60;
            this.knockbackVelocity.x *= CONFIG.FAMILY.ENEMY_KNOCKBACK_DECAY;
            this.knockbackVelocity.y *= CONFIG.FAMILY.ENEMY_KNOCKBACK_DECAY;
            this.updateBodySegments();
            return;  // 击退期间不进行其他行为
        }
        this.knockbackVelocity = null;

        // 如果咬住了幼体
        if (this.latchedJuvenile) {
            this.state = ENEMY_STATE.LATCHED;
            this.updateLatched(dt);
            this.updateBodySegments();
            return;
        }

        // 觅食冷却
        if (this.feedingCooldown > 0) {
            this.feedingCooldown -= dt;
        }

        // 咬成功冷却（见好就收，清除绕圈状态）
        if (this.biteCooldown > 0) {
            this.biteCooldown -= dt;
            if (this.isCircling) {
                this.isCircling = false;
                this.circleTarget = null;
            }
        }

        // 如果正在觅食
        if (this.feedingTarget && this.state === ENEMY_STATE.FEEDING) {
            this.updateFeeding(dt);
            this.updateBodySegments();
            return;
        }

        // 寻找最近的幼体（咬成功冷却期间不追幼体，见好就收）
        let nearestJuvenile = null;
        if (this.biteCooldown <= 0) {
            let minDist = CONFIG.FAMILY.ENEMY_CHASE_RADIUS;

            for (const worm of juveniles) {
                if (!worm.isAlive || !worm.isJuvenile || !worm.head) continue;
                const d = this.pos.dist(worm.head);
                if (d < minDist) {
                    minDist = d;
                    nearestJuvenile = worm;
                }
            }
        }

        // 移动逻辑：优先追击幼体 > 觅食 > 漫游
        if (this.isCircling && this.circleTarget && this.biteCooldown <= 0) {
            this.state = ENEMY_STATE.CIRCLING;
            this.updateCircling(dt);
        } else if (nearestJuvenile) {
            this.state = ENEMY_STATE.CHASING;
            this.updateChasing(nearestJuvenile);
        } else if (this.feedingCooldown <= 0 && this.findFeedingTarget()) {
            this.state = ENEMY_STATE.FEEDING;
            this.updateFeeding(dt);
        } else {
            this.state = ENEMY_STATE.WANDERING;
            this.updateWandering();
        }

        // 更新位置
        this.pos = this.pos.add(this.velocity.mult(dt * 60));

        // 边界反弹
        const margin = CONFIG.WALL_MARGIN * 2 + CONFIG.SEGMENT_RADIUS * 2;
        if (this.pos.x < margin || this.pos.x > CONFIG.CANVAS_WIDTH - margin) {
            this.velocity.x *= -1;
            this.wanderDir.x *= -1;
            this.pos.x = Math.max(margin, Math.min(CONFIG.CANVAS_WIDTH - margin, this.pos.x));
        }
        if (this.pos.y < margin || this.pos.y > CONFIG.CANVAS_HEIGHT - margin) {
            this.velocity.y *= -1;
            this.wanderDir.y *= -1;
            this.pos.y = Math.max(margin, Math.min(CONFIG.CANVAS_HEIGHT - margin, this.pos.y));
        }

        // 更新身体节段位置
        this.updateBodySegments();
    }

    // 更新死亡下沉动画
    updateDying(dt) {
        this.deathTimer -= dt;
        this.sinkSpeed += CONFIG.FAMILY.ENEMY_SINK_GRAVITY * dt;

        if (this.bounceVelocity) {
            this.pos = this.pos.add(this.bounceVelocity.mult(dt * 60));
            this.bounceVelocity = this.bounceVelocity.mult(CONFIG.FAMILY.ENEMY_KNOCKBACK_DECAY);
        }

        this.pos.y += this.sinkSpeed * dt;

        if (this.segments.length > 0) {
            this.segments[0] = this.pos;
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dir = prev.sub(curr).normalize();
                this.segments[i] = prev.sub(dir.mult(CONFIG.FAMILY.ENEMY_SEG_SPACING));
            }
        }

        if (this.deathTimer <= 0) {
            this.isAlive = false;
            this.state = ENEMY_STATE.DEAD;
        }
    }

    // 更新咬住幼体状态
    updateLatched(dt) {
        if (!this.latchedJuvenile.isAlive || !this.latchedJuvenile.isJuvenile) {
            this.release();
            return;
        }

        const targetSeg = this.latchedJuvenile.segments[this.latchedSegmentIndex];
        if (!targetSeg) {
            this.release();
            return;
        }

        // 移向被咬的身体段
        const dir = targetSeg.sub(this.pos);
        if (dir.mag() > this.size) {
            this.velocity = dir.normalize().mult(CONFIG.FAMILY.ENEMY_CHASE_SPEED);
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        }

        // 咬中一次就造成伤害并撤离
        this.biteDamageTimer -= dt;
        if (this.biteDamageTimer <= 0) {
            this.biteDamageTimer = CONFIG.FAMILY.ENEMY_BITE_DAMAGE_DELAY;  // 咬中后撤离延迟

            const juv = this.latchedJuvenile;

            // 幼体痛苦挣扎效果
            juv.isStruggling = true;
            juv.strugglePhase = 0;
            juv.juvenileHitCount++;

            // 掉落一节身体（类似成年体消耗尾巴）
            if (juv.segments.length > 3) {
                const lostSegment = juv.segments.pop();
                juv.targetLength = juv.segments.length;

                // 生成掉落的身体碎片粒子
                if (typeof game !== 'undefined' && game.particles) {
                    for (let k = 0; k < 4; k++) {
                        game.particles.push(Particle.acquire(lostSegment.x, lostSegment.y, juv.color));
                    }
                }
                // 显示伤害提示
                if (typeof game !== 'undefined' && game.floatingTexts) {
                    game.floatingTexts.push(FloatingText.acquire(lostSegment.x, lostSegment.y - 15, 'OUCH!', '#ff6b6b'));
                }
                // 调试日志
                if (typeof game !== 'undefined' && game.debugLogger) {
                    game.debugLogger.logEnemyBiteDamage(this, juv, game.gameTime);
                }
            } else {
                // 身体太短，变灰色沉底（而非瞬间消失）
                const deathX = juv.head ? juv.head.x : this.pos.x;
                const deathY = juv.head ? juv.head.y : this.pos.y;
                if (typeof game !== 'undefined' && game.debugLogger) {
                    game.debugLogger.logJuvenileDeath(juv, '被敌人咬死', game.gameTime);
                }
                // 创建灰色尸体下沉动画
                if (juv.segments.length > 0 && typeof game !== 'undefined' && game.deadBodies) {
                    const deadSegments = juv.segments.map(s => ({ x: s.x, y: s.y }));
                    game.deadBodies.push(new DeadBody(deadSegments, juv.color));
                }
                juv.isAlive = false;
                juv.segments = [];
                if (typeof game !== 'undefined' && game.floatingTexts) {
                    game.floatingTexts.push(FloatingText.acquire(deathX, deathY - 20, 'EATEN!', '#ff0000'));
                }
            }

            // 敌人吃幼体后恢复一节身体（如果受过伤，身体段数 < 初始段数）
            if (this.segments.length < this.segmentCount) {
                const lastSeg = this.segments[this.segments.length - 1];
                this.segments.push(new Vector(lastSeg.x, lastSeg.y));
                // 恢复特效
                if (typeof game !== 'undefined' && game.particles) {
                    for (let k = 0; k < 3; k++) {
                        game.particles.push(Particle.acquire(this.pos.x, this.pos.y, this.color));
                    }
                }
                if (typeof game !== 'undefined' && game.floatingTexts) {
                    game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 15, 'HEAL!', '#44ff44'));
                }
            }

            // 三叶虫击退撤离（从幼体方向弹开）— 标量运算
            // 幼体可能已死亡（segments被清空），此时head为undefined，跳过击退
            if (juv.head) {
                const bdx = this.pos.x - juv.head.x;
                const bdy = this.pos.y - juv.head.y;
                const bmag = Math.sqrt(bdx * bdx + bdy * bdy);
                this.knockbackVelocity = new Vector(bmag > 0 ? bdx / bmag * 6 : 0, bmag > 0 ? bdy / bmag * 6 : 0);
                this.knockbackTimer = CONFIG.FAMILY.ENEMY_KNOCKBACK_DURATION;
            }

            // 释放幼体并切换到漫游状态
            this.release();
            this.state = ENEMY_STATE.WANDERING;
            this.wanderTimer = 2.0 + Math.random() * 2.0;  // 漫游2-4秒后才能再次追击
            this.biteCooldown = CONFIG.FAMILY.ENEMY_BITE_COOLDOWN;  // 见好就收，冷却期间不再追幼体
        }
    }

    // 更新绕圈观察状态
    updateCircling(dt) {
        if (!this.circleTarget.isAlive || !this.circleTarget.isJuvenile || !this.circleTarget.head) {
            this.isCircling = false;
            this.circleTarget = null;
            return;
        }

        const targetPos = this.circleTarget.head;
        this.circleAngle += this.circleSpeed * dt;

        if (this.circleAngle >= Math.PI * 2) {
            this.circleAngle -= Math.PI * 2;
            this.circleCount++;
        }

        if (this.circleCount >= this.circlesBeforeAttack) {
            this.isCircling = false;
            this.circleTarget = null;
            this.circleCount = 0;
            this.circlesBeforeAttack = 2 + Math.random();
        } else {
            const circleX = targetPos.x + Math.cos(this.circleAngle) * this.circleRadius;
            const circleY = targetPos.y + Math.sin(this.circleAngle) * this.circleRadius;
            // 热路径：标量运算，不创建临时Vector
            const dx = circleX - this.pos.x;
            const dy = circleY - this.pos.y;
            const mag = Math.sqrt(dx * dx + dy * dy);
            const speed = CONFIG.FAMILY.ENEMY_CHASE_SPEED * 0.8;
            this.velocity.x = (dx / mag) * speed;
            this.velocity.y = (dy / mag) * speed;
        }
    }

    // 更新追击幼体状态
    updateChasing(nearestJuvenile) {
        if (!nearestJuvenile.head) return;  // 幼体已死亡，跳过
        if (!this.isCircling) {
            this.isCircling = true;
            this.circleTarget = nearestJuvenile;
            this.circleAngle = Math.atan2(this.pos.y - nearestJuvenile.head.y, this.pos.x - nearestJuvenile.head.x);
            this.circleCount = 0;
        }
        this.chaseTarget = nearestJuvenile;
        // 热路径：标量运算，不创建临时Vector
        const dx = nearestJuvenile.head.x - this.pos.x;
        const dy = nearestJuvenile.head.y - this.pos.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const speed = CONFIG.FAMILY.ENEMY_CHASE_SPEED;
        this.velocity.x = (dx / mag) * speed;
        this.velocity.y = (dy / mag) * speed;
    }

    // 更新随机巡逻状态
    updateWandering() {
        this.chaseTarget = null;
        this.isCircling = false;
        this.circleTarget = null;
        if (this.wanderTimer <= 0) {
            this.wanderTimer = 2 + Math.random() * 3;
            this.wanderDir = Vector.randomDir();
        }
        this.velocity = this.wanderDir.mult(CONFIG.FAMILY.ENEMY_SPEED);
    }

    /**
     * 寻找觅食目标（shrinkingSegments或白色初生宝珠）
     * @returns {boolean} 是否找到目标
     */
    findFeedingTarget() {
        if (typeof game === 'undefined') return false;

        let nearestTarget = null;
        let nearestDist = 200;  // 觅食范围200像素

        // 1. 寻找最近的shrinkingSegments（灰色下沉尾巴）
        if (game.worms) {
            for (const worm of game.worms) {
                if (!worm.isAlive || !worm.shrinkingSegments) continue;
                for (const shrink of worm.shrinkingSegments) {
                    if (!shrink.pos) continue;
                    const dist = this.pos.dist(shrink.pos);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestTarget = { type: 'shrink', pos: shrink.pos, ref: shrink, worm: worm };
                    }
                }
            }
        }

        // 2. 寻找最近的白色初生宝珠
        if (game.foods) {
            for (const food of game.foods) {
                if (food.birthPhase !== 'white') continue;
                const dist = this.pos.dist(food.pos);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestTarget = { type: 'whiteOrb', pos: food.pos, ref: food };
                }
            }
        }

        if (nearestTarget) {
            this.feedingTarget = nearestTarget;
            return true;
        }
        return false;
    }

    /**
     * 更新觅食状态
     */
    updateFeeding(dt) {
        if (!this.feedingTarget) {
            this.state = ENEMY_STATE.WANDERING;
            return;
        }

        const targetPos = this.feedingTarget.pos;
        const dist = this.pos.dist(targetPos);

        // 移向目标
        if (dist > this.size * 2) {
            const dir = targetPos.sub(this.pos).normalize();
            this.velocity = dir.mult(CONFIG.FAMILY.ENEMY_SPEED * 1.2);  // 觅食时速度稍快
            this.pos = this.pos.add(this.velocity.mult(dt * 60));
        } else {
            // 到达目标，开始进食
            this.feedingTimer += dt;
            if (this.feedingTimer >= 0.3) {  // 0.3秒吃完
                this.consumeFeedingTarget();
                this.feedingTimer = 0;
                this.feedingTarget = null;
                this.feedingCooldown = 1.0 + Math.random() * 2.0;  // 觅食后冷却1-3秒
                this.state = ENEMY_STATE.WANDERING;
            }
        }
    }

    /**
     * 消耗觅食目标
     */
    consumeFeedingTarget() {
        if (!this.feedingTarget || typeof game === 'undefined') return;

        if (this.feedingTarget.type === 'shrink') {
            // 消耗shrinkingSegment
            const worm = this.feedingTarget.worm;
            const shrink = this.feedingTarget.ref;
            if (worm && worm.shrinkingSegments) {
                const index = worm.shrinkingSegments.indexOf(shrink);
                if (index !== -1) {
                    worm.shrinkingSegments.splice(index, 1);
                }
            }
            // 恢复1点生命
            this.health = Math.min(this.health + 1, this.maxHealth);
            // 吃到特效
            if (game.particles) {
                for (let k = 0; k < 3; k++) {
                    game.particles.push(Particle.acquire(this.pos.x, this.pos.y, '#888888'));
                }
            }
            if (game.floatingTexts) {
                game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 15, 'YUM!', '#888888'));
            }
        } else if (this.feedingTarget.type === 'whiteOrb') {
            // 消耗白色初生宝珠
            const food = this.feedingTarget.ref;
            if (game.foods) {
                const index = game.foods.indexOf(food);
                if (index !== -1) {
                    game.foods.splice(index, 1);
                }
            }
            // 恢复1点生命
            this.health = Math.min(this.health + 1, this.maxHealth);
            // 吃到特效
            if (game.particles) {
                for (let k = 0; k < 3; k++) {
                    game.particles.push(Particle.acquire(this.pos.x, this.pos.y, '#ffffff'));
                }
            }
            if (game.floatingTexts) {
                game.floatingTexts.push(FloatingText.acquire(this.pos.x, this.pos.y - 15, 'YUM!', '#ffffff'));
            }
        }
    }

    // 更新身体节段位置
    updateBodySegments() {
        if (this.segments.length > 0) {
            this.segments[0] = this.pos;
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dx = prev.x - curr.x, dy = prev.y - curr.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) { curr.x = prev.x - dx / d * CONFIG.FAMILY.ENEMY_SEG_SPACING; curr.y = prev.y - dy / d * CONFIG.FAMILY.ENEMY_SEG_SPACING; }
            }
        }
    }

    draw(ctx) {
        if (!this.isAlive) return;

        // 死亡下沉动画效果
        if (this.isDying) {
            const progress = 1 - (this.deathTimer / this.deathDuration);
            const alpha = 1 - progress;  // 逐渐透明
            ctx.globalAlpha = alpha;

            // 绘制下沉的敌人
            this.drawBody(ctx, true);

            ctx.globalAlpha = 1;
            return;
        }

        this.drawBody(ctx, false);
    }

    drawBody(ctx, isSinking) {
        const flash = this.hitTimer > 0 && Math.floor(this.hitTimer * 10) % 2 === 0;

        // 绘制身体节段（从尾到头）
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const t = i / this.segments.length;
            const radius = this.size * (1 - t * CONFIG.FAMILY.ENEMY_TAIL_TAPER);  // 越往后越小

            // 身体颜色（被击中时闪烁）
            ctx.fillStyle = flash ? '#FF0000' : this.color;
            ctx.beginPath();
            ctx.ellipse(seg.x, seg.y, radius, radius * 0.7,
                Math.atan2(this.velocity.y, this.velocity.x), 0, Math.PI * 2);
            ctx.fill();

            // 节段纹理（三叶虫特征）
            if (i > 0 && i < this.segments.length - 1) {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(seg.x - radius, seg.y);
                ctx.lineTo(seg.x + radius, seg.y);
                ctx.stroke();
            }
        }

        // 绘制头部
        const head = this.segments[0];
        if (head) {
            // 头部形状（半圆形）
            const headAngle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.fillStyle = flash ? '#FF0000' : '#654321';
            ctx.beginPath();
            ctx.arc(head.x, head.y, this.size, headAngle - Math.PI / 2, headAngle + Math.PI / 2);
            ctx.fill();

            // 复眼（三叶虫特征）
            const eyeOffset = this.size * 0.4;
            const eyeSize = this.size * 0.3;

            // 左眼
            const leftEyeX = head.x + Math.cos(headAngle + 0.5) * eyeOffset;
            const leftEyeY = head.y + Math.sin(headAngle + 0.5) * eyeOffset;
            ctx.fillStyle = this.eyeColor;
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // 右眼
            const rightEyeX = head.x + Math.cos(headAngle - 0.5) * eyeOffset;
            const rightEyeY = head.y + Math.sin(headAngle - 0.5) * eyeOffset;
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();

            // 眼睛高光
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(leftEyeX - 1, leftEyeY - 1, eyeSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX - 1, rightEyeY - 1, eyeSize * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // 腿（三叶虫特征）
            ctx.strokeStyle = flash ? '#FF0000' : '#654321';
            ctx.lineWidth = 2;
            for (let i = 1; i < this.segments.length - 1; i++) {
                const seg = this.segments[i];
                const legAngle = Math.sin(this.phase + i * 0.5) * 0.3;
                const legLength = this.size * 0.8;

                // 左腿
                ctx.beginPath();
                ctx.moveTo(seg.x, seg.y);
                ctx.lineTo(
                    seg.x + Math.cos(headAngle + Math.PI / 2 + legAngle) * legLength,
                    seg.y + Math.sin(headAngle + Math.PI / 2 + legAngle) * legLength
                );
                ctx.stroke();

                // 右腿
                ctx.beginPath();
                ctx.moveTo(seg.x, seg.y);
                ctx.lineTo(
                    seg.x + Math.cos(headAngle - Math.PI / 2 - legAngle) * legLength,
                    seg.y + Math.sin(headAngle - Math.PI / 2 - legAngle) * legLength
                );
                ctx.stroke();
            }
        }
    }

    checkCollisionWithJuvenile(juvenile) {
        if (!this.isAlive || !juvenile.isAlive || !juvenile.isJuvenile) return -1;
        if (this.latchedJuvenile) return -1;  // 已经咬住了一个
        const head = this.segments[0];
        if (!head) return -1;

        // 检查所有身体段，跳过已被其他敌人咬住的段
        for (let i = 0; i < juvenile.segments.length; i++) {
            if (juvenile.bittenSegments && juvenile.bittenSegments.has(i)) continue;
            const dist = head.dist(juvenile.segments[i]);
            if (dist < this.size + CONFIG.SEGMENT_RADIUS) {
                return i;
            }
        }
        return -1;
    }

    checkCollisionWithPlayer(player) {
        if (!this.isAlive || !player.isAlive) return false;
        const head = this.segments[0];
        if (!head) return false;
        const dist = head.dist(player.head);
        return dist < this.size + CONFIG.SEGMENT_RADIUS;
    }

    hit() {
        this.hitTimer = CONFIG.FAMILY.ENEMY_HIT_FLASH_BULLET;
    }

    /**
     * 受到伤害 - 减少生命值并掉落一节身体
     * @param {Vector} hitDir - 击中方向（用于击退效果）
     * @returns {boolean} 是否死亡
     */
    takeDamage(hitDir) {
        if (this.isDying) return false;
        this.health--;
        this.hitTimer = CONFIG.FAMILY.ENEMY_HIT_FLASH_DAMAGE;

        // 击退效果
        if (hitDir) {
            const hd = Math.sqrt(hitDir.x * hitDir.x + hitDir.y * hitDir.y);
            const kspeed = CONFIG.FAMILY.ENEMY_KNOCKBACK_SPEED;
            this.knockbackVelocity = new Vector(hd > 0 ? hitDir.x / hd * kspeed : 0, hd > 0 ? hitDir.y / hd * kspeed : 0);
            this.knockbackTimer = CONFIG.FAMILY.ENEMY_KNOCKBACK_TAKE;
        }

        // 掉落最后一节身体
        if (this.segments.length > 1) {
            const lostSegment = this.segments.pop();
            // 生成掉落的身体碎片粒子
            if (typeof game !== 'undefined' && game.particles) {
                for (let k = 0; k < 4; k++) {
                    game.particles.push(Particle.acquire(lostSegment.x, lostSegment.y, this.color));
                }
            }
        }

        // 生命值归零则死亡
        if (this.health <= 0) {
            this.die(hitDir);
            return true;
        }
        return false;
    }

    die(bounceDir) {
        this.release();  // 释放咬住的幼体段
        this.isDying = true;
        this.deathTimer = this.deathDuration;
        this.sinkSpeed = 30;  // 初始下沉速度
        // 弹开方向（从玩家方向弹开）
        if (bounceDir) {
            this.bounceVelocity = bounceDir.mult(5);
        } else {
            this.bounceVelocity = this.velocity.mult(-2);
        }
    }

    /**
     * 咬住幼体的某个身体段
     */
    latch(juvenile, segmentIndex) {
        this.latchedJuvenile = juvenile;
        this.latchedSegmentIndex = segmentIndex;
        if (!juvenile.bittenSegments) juvenile.bittenSegments = new Set();
        juvenile.bittenSegments.add(segmentIndex);
    }

    /**
     * 释放咬住的幼体段
     */
    release() {
        if (this.latchedJuvenile && this.latchedSegmentIndex >= 0) {
            if (this.latchedJuvenile.bittenSegments) {
                this.latchedJuvenile.bittenSegments.delete(this.latchedSegmentIndex);
            }
        }
        this.latchedJuvenile = null;
        this.latchedSegmentIndex = -1;
        this.biteDamageTimer = 0;
    }
}
