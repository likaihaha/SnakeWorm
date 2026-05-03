import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba, drawGlow } from './utils.js';
import { SpatialGrid } from './spatial-grid.js';
import { Food, Particle, FloatingText } from './entities.js';

export class Worm {
    constructor(x, y, length, color = '#4ecca3', isPlayer = true) {
        this.segments = [];
        this.color = color;
        // 缓存颜色 RGB 分量（避免每帧 parseInt 解析）
        if (color.startsWith('#') && color.length >= 7) {
            this._colorR = parseInt(color.slice(1, 3), 16);
            this._colorG = parseInt(color.slice(3, 5), 16);
            this._colorB = parseInt(color.slice(5, 7), 16);
            this._grayColor = `rgb(${Math.round(this._colorR * 0.299 + this._colorG * 0.587 + this._colorB * 0.114)}, ${Math.round(this._colorR * 0.299 + this._colorG * 0.587 + this._colorB * 0.114)}, ${Math.round(this._colorR * 0.299 + this._colorG * 0.587 + this._colorB * 0.114)})`;
        } else {
            this._colorR = this._colorG = this._colorB = 128;
            this._grayColor = 'rgb(128, 128, 128)';
        }
        this.targetLength = length;
        this.isPlayer = isPlayer;
        this.isAlive = true;
        this.velocity = new Vector(1, 0);
        this.speed = isPlayer ? CONFIG.BASE_SPEED : CONFIG.AI_BASE_SPEED;
        this.invincibleTimer = 0;
        this.activationTimer = 0;
        this.headEnlarged = false;  // 头部是否变大
        this.headEnlargedTimer = 0;  // 头部变大计时器
        this.headScale = 1.0;  // 头部缩放比例（1.0正常，2.0变大）
        this.headScaleTarget = 1.0;  // 头部缩放目标值
        this.purpleParticleTimer = 0;  // 紫色粒子特效计时器
        this.tailYellowDash = true;  // 尾部黄色虚线是否显示
        this.tailYellowDashTimer = 0;  // 尾部虚线消失计时器

        // 出场动画相关
        this.isEntering = isPlayer;  // 玩家虫虫需要出场动画
        this.enterPhase = 0;  // 动画阶段：0= 等待，1= 正弦波移动入框，2= 游向鼠标，3= 完成
        this.enterStartTime = 0;
        this.enterDuration1 = 2.0;  // 动画第一阶段：从框外游到中央（2 秒）
        this.enterDuration2 = 1.5;  // 动画第二阶段：从中央游向鼠标（1.5 秒）
        this.enterStartPos = new Vector(-50, y);  // 从框外左边开始
        this.enterMidPos = new Vector(x, y);  // 画面中央
        this.enterTargetPos = new Vector(x, y);  // 最终目标位置

        for (let i = 0; i < length; i++) {
            this.segments.push(new Vector(x - i * CONFIG.SEGMENT_SPACING, y));
        }

        this.aiTarget = null;
        this.aiWanderTimer = 0;
        this.aiWanderDir = Vector.randomDir();

        // 嘴巴动画状态
        this.mouthCloseTimer = 0;  // 闭嘴计时器（吃宝珠时触发）
        this.isMoving = false;  // 是否在移动
        this.isDigging = false;  // 是否在挖掘墙壁

        // 空闲波动动画（静止时的生命感）
        this.idleWavePhase = Math.random() * Math.PI * 2;  // 波动相位

        // 碰撞区域 Set 缓存（仅在 segments.length 变化时重建）
        this._cachedSegCount = -1;
        this._cachedTailSet = new Set();
        this._cachedNeckSet = new Set();
        this._cachedAbdomenSet = new Set();
        this._cachedHeadSet = new Set([0]);

        // 黄光效果状态（吃到黄色宝珠时触发）
        this.yellowGlowTimer = 0;  // 黄光计时器
        this.yellowGlowIndex = 0;  // 当前闪光的段索引（从嘴部开始）
        this.yellowGlowStepTimer = 0;  // 步进计时器（控制每个段闪光的间隔）
        this.pendingGrowCount = 0;  // 等待黄光结束后生长的节数
        this.growStepTimer = 0;  // 逐节生长的计时器

        // 击退效果
        this.knockbackVelocity = null;  // 击退速度
        this.knockbackTimer = 0;  // 击退计时器
        this.grownCount = 0;  // 已生长的节数

        // 尾部生长动画
        this.growingSegments = [];  // 正在生长的新节 [{targetPos, progress, direction}]
        this.shrinkingSegments = [];  // 尾巴缩小动画 [{pos, progress, duration}]

        // 预警闪烁
        this.warningFlashTimer = 0;  // 预警闪烁计时器

        // 磁力效果（橙色宝珠触发）
        this.magnetTimer = 0;  // 磁力计时器
        this.magnetCombo = 0;  // 磁力连击数

        // 射击系统
        this.bulletCount = 0;  // 弹舱子弹数

        // 蓝色腹部效果（蓝色宝珠触发）
        this.blueSegments = 0;  // 蓝色段的数量
        this.blueStrengths = [];  // 每个蓝色段的强度数组（每个元素0-5）
        this.bulletFiredCount = 0;  // 已发射的子弹计数

        // AI射击相关
        this.aiShootTimer = 0;  // AI射击冷却计时器
        this.aiShootInterval = 2.0 + Math.random() * 2;  // AI射击间隔（2-4秒随机）

        // 减速叠加系统
        this.slowStacks = 0;  // 减速层数（可叠加）
        this.slowTimer = 0;   // 减速计时器

        // 亲子关系系统
        this.isJuvenile = false;  // 是否是幼体
        this.parentWorm = null;  // 父代引用
        this.juvenileHitCount = 0;  // 幼体被击中次数
        this.adultHitCount = 0;  // 成年体被击中次数
        this.comboCooldown = 0;  // 成年后代合击冷却
        this.juvenileFearTimer = 0;  // 幼体害怕状态计时器
        this.juvenileFollowTarget = null;  // 幼体跟随目标
        this.juvenileOrbitPhase = Math.random() * Math.PI * 2;  // 幼体环绕尾部的角度
        this.bittenSegments = new Set();  // 被敌人咬住的段索引集合
        this.isStruggling = false;  // 是否在挣扎
        this.feedCooldown = 0;  // 吃食物冷却（吃一节后游出去一圈再吃下一节）
        this.strugglePhase = 0;  // 挣扎动画相位
        this.protectingTimer = 0;  // 保护幼体计时器（成年体）

        // === Phase 1 亲子情感：撒娇系统 ===
        this.sulkTimer = 0;           // 远离母体累计时间
        this.isSulking = false;       // 是否在撒娇状态
        this.sulkGlow = 1.0;          // 身体发光强度（1.0正常，0.3暗淡）
        this.celebrateTimer = 0;      // 靠近母体庆祝计时器
        this.isCelebrating = false;   // 是否在庆祝

        // === Phase 1 亲子情感：死亡动画 ===
        this.deathPhase = 'none';     // 死亡阶段：none → flashing → turning → sinking → gone
        this.deathTimer = 0;          // 死亡动画计时器

        // === Phase 2 幼体性格系统 ===
        this.personality = null;      // 'brave' | 'gentle' | 'curious' | 'naughty' | null
        this.guardCooldown = 0;       // 勇敢：护卫挡刀冷却
        this.isGuarding = false;      // 勇敢：是否正在挡刀
        // === Phase 2 护理恢复系统 ===
        this.injuredLevel = 0;        // 受伤等级 0=健康 1=轻伤 2=重伤
        this.injuredGrayAlpha = 0;    // 灰色覆盖透明度 0~1
        this.recoveryTimer = 0;       // 恢复计时器（母体靠近时累加）
        this.isRecovering = false;    // 是否正在恢复中
        this.guardTargetEnemy = null; // 勇敢：挡刀目标敌人
        this.healPulseTimer = 0;      // 温柔：治疗脉冲计时器
        this.isHealing = false;       // 温柔：是否正在治疗
        this.scoutTarget = null;      // 好奇：侦察目标位置
        this.isScouting = false;      // 好奇：是否正在侦察
        this.scoutFlashTimer = 0;     // 好奇：发现宝珠闪烁计时器
        this.mimicryData = { rushes: 0, dodges: 0, totalSamples: 0 }; // 模仿机制数据
        this.mimicryResolved = false;  // 模仿机制是否已触发（只触发一次）

        // === Phase 3 羁绊深度：成年后代与驻守系统 ===
        this.isAdult = false;           // 是否已进化为成年后代
        this.isGuardingPosition = false; // 是否在驻守模式
        this.guardPosition = null;       // 驻守位置 {x, y}
        this.guardOrbitPhase = 0;        // 驻守巡逻相位
        this.evolveAnimation = 0;        // 进化动画进度 (0~1)

        // 冰晶覆盖效果
        this.iceOverlays = [];  // [{segmentIndex, timer, maxTimer}]

        // 饥饿消耗系统
        this.hungerTimer = 0;  // 饥饿计时器
        this.hungerRateIdle = 1.0;  // 不动时消耗速率（1秒/节）
        this.hungerRateMoving = 0.5;  // 运动时消耗速率（0.5秒/节，即1秒2节）
    }

    get head() { return this.segments[0]; }
    get length() { return this.segments.length; }

    /**
     * 身体缩短后，同步弹舱状态
     * 蓝色段位于身体索引 1 ~ blueSegments（头部是索引 0）
     * 如果身体缩短到比蓝色段还短，裁剪多余的蓝色段
     */
    syncBlueToBody() {
        const maxBlue = Math.max(0, this.segments.length - 1);  // 减去头部
        while (this.blueSegments > maxBlue) {
            this.blueSegments--;
            if (this.blueStrengths.length > 0) {
                this.blueStrengths.pop();
            }
        }
        // 重新计算子弹数（蓝色段 × 5 - 已消耗的）
        this.bulletCount = this.blueSegments * 5;
        // 重算已消耗：累计 blueStrengths 中被用掉的
        for (let i = 0; i < this.blueStrengths.length; i++) {
            // blueStrengths[i] 是剩余强度（0~5），已消耗 = 5 - 剩余
            // 但 bulletCount 已经按 blueSegments*5 算了总弹药
            // 实际可发射 = 所有剩余强度之和
        }
        // 实际可用子弹 = 各段剩余强度之和
        let total = 0;
        for (let i = 0; i < this.blueStrengths.length; i++) {
            total += this.blueStrengths[i];
        }
        this.bulletCount = total;
    }

    updateSpeed() {
        const speedReduction = (this.length - CONFIG.WORM_INITIAL_LENGTH) * CONFIG.SPEED_DECAY;
        const base = this.isPlayer ? CONFIG.BASE_SPEED : CONFIG.AI_BASE_SPEED;
        let newSpeed = Math.max(CONFIG.MIN_SPEED, base - speedReduction);

        // 幼体速度打折
        if (this.isJuvenile) {
            newSpeed *= CONFIG.FAMILY.JUVENILE_SPEED_RATIO;
            // Phase 2: 淘气性格加速
            if (this.personality === 'naughty') {
                newSpeed *= CONFIG.PERSONALITY.TYPES.naughty.speedBonus;
            }
            // Phase 2: 受伤减速（受伤等级越高越慢）
            if (this.injuredLevel > 0) {
                const injuredSlowdown = 1.0 - this.injuredLevel * 0.2; // 轻伤0.8倍，重伤0.6倍
                newSpeed *= Math.max(0.4, injuredSlowdown);
            }
        }

        // 如果有减速叠加，应用减速效果
        if (this.slowStacks > 0) {
            const slowRatio = Math.pow(0.6, this.slowStacks);  // 每层减速到60%
            newSpeed = Math.max(CONFIG.MIN_SPEED * 0.5, newSpeed * slowRatio);
        }

        // 保护幼体时加速50%
        if (this.protectingTimer > 0) {
            newSpeed *= 1.5;
        }

        this.speed = newSpeed;
    }

    grow(amount) {
        // 检查是否达到最大长度
        if (this.segments.length >= CONFIG.MAX_SEGMENT_LENGTH) {
            return;  // 已达到最大长度，不再生长
        }

        // 限制生长数量，不超过最大长度
        const canGrow = Math.min(amount, CONFIG.MAX_SEGMENT_LENGTH - this.segments.length);

        // 添加生长动画，而不是直接增加长度
        for (let i = 0; i < canGrow; i++) {
            // 计算尾部方向（参考旧身体曲率）
            let direction = new Vector(0, 0);
            if (this.segments.length >= 3) {
                // 用最后3节计算曲率：当前方向 + 曲率偏移
                const tail = this.segments[this.segments.length - 1];
                const beforeTail = this.segments[this.segments.length - 2];
                const beforeBeforeTail = this.segments[this.segments.length - 3];

                // 当前方向：从倒数第二节到倒数第一节
                const currentDir = tail.sub(beforeTail).normalize();
                // 之前方向：从倒数第三节到倒数第二节
                const prevDir = beforeTail.sub(beforeBeforeTail).normalize();

                // 计算曲率角度（当前方向相对于之前方向的偏转）
                const currentAngle = Math.atan2(currentDir.y, currentDir.x);
                const prevAngle = Math.atan2(prevDir.y, prevDir.x);
                let curvature = currentAngle - prevAngle;

                // 限制曲率范围，避免过度弯曲
                curvature = Math.max(-0.5, Math.min(0.5, curvature));

                // 应用曲率到新方向
                const newAngle = currentAngle + curvature;
                direction = new Vector(Math.cos(newAngle), Math.sin(newAngle));
            } else if (this.segments.length === 2) {
                const tail = this.segments[this.segments.length - 1];
                const beforeTail = this.segments[this.segments.length - 2];
                direction = tail.sub(beforeTail).normalize();
            } else if (this.segments.length === 1) {
                direction = this.velocity.clone();
            }

            // 考虑已在生长队列中的节，找到真正的"末端"位置
            let basePos;
            if (this.growingSegments.length > 0) {
                // 从最后一个正在生长的节的目标位置继续
                basePos = this.growingSegments[this.growingSegments.length - 1].targetPos;
            } else {
                // 从当前尾部位置开始
                basePos = this.segments.length > 0
                    ? this.segments[this.segments.length - 1]
                    : new Vector(0, 0);
            }

            // 目标位置：在基础位置后方一个间距的位置
            const targetPos = basePos.add(direction.mult(CONFIG.SEGMENT_SPACING));

            // 添加到生长队列（startPos 设为 null，会在开始绘制时动态获取当前位置）
            this.growingSegments.push({
                targetPos: targetPos,
                progress: 0,
                direction: direction,
                startPos: null,  // 动态获取
                basePos: new Vector(basePos.x, basePos.y)  // 用于计算目标位置
            });
        }
        this.targetLength += amount;
    }

    /**
     * 获取头部段索引（仅第0节 = 嘴部）
     */
    get headSegmentIndices() {
        return [0];
    }

    /**
     * 获取颈部段索引范围（第1节到身体1/3）
     */
    get neckSegmentIndices() {
        this._rebuildRegionCache();
        return this._cachedNeckIndices;
    }

    /**
     * 获取腹部段索引范围（身体1/3到2/3）
     */
    get abdomenSegmentIndices() {
        this._rebuildRegionCache();
        return this._cachedAbdomenIndices;
    }

    /**
     * 获取尾巴段索引范围（最后 1/3 段，从2/3到末尾）
     */
    get tailSegmentIndices() {
        this._rebuildRegionCache();
        return this._cachedTailIndices;
    }

    /**
     * 重建碰撞区域缓存（仅在 segments.length 变化时执行）
     */
    _rebuildRegionCache() {
        const len = this.segments.length;
        if (len === this._cachedSegCount) return;
        this._cachedSegCount = len;

        const neckEnd = Math.max(1, Math.floor(len / 3));
        const abdStart = Math.max(1, Math.floor(len / 3));
        const abdEnd = Math.floor(len * 2 / 3);
        const tailStart = Math.floor(len * 2 / 3);

        this._cachedNeckIndices = [];
        this._cachedAbdomenIndices = [];
        this._cachedTailIndices = [];
        this._cachedHeadIndices = [0];
        this._cachedNeckSet.clear();
        this._cachedAbdomenSet.clear();
        this._cachedTailSet.clear();
        this._cachedHeadSet.clear();
        this._cachedHeadSet.add(0);

        for (let i = 1; i <= neckEnd && i < len; i++) {
            this._cachedNeckIndices.push(i);
            this._cachedNeckSet.add(i);
        }
        for (let i = abdStart; i <= abdEnd && i < len; i++) {
            this._cachedAbdomenIndices.push(i);
            this._cachedAbdomenSet.add(i);
        }
        for (let i = tailStart; i < len; i++) {
            this._cachedTailIndices.push(i);
            this._cachedTailSet.add(i);
        }
    }

    /**
     * 获取碰撞区域的缓存 Set（避免每帧重复创建）
     */
    get _regionSets() {
        this._rebuildRegionCache();
        return { head: this._cachedHeadSet, tail: this._cachedTailSet, neck: this._cachedNeckSet, abdomen: this._cachedAbdomenSet };
    }

    update(targetPos, dt, allFoods = [], allWorms = []) {
        // 空指针保护：如果segments为空，直接返回
        if (this.segments.length === 0) return;

        // === Phase 1 亲子情感：幼体死亡动画更新 ===
        if (this.isJuvenile && this.deathPhase && this.deathPhase !== 'none') {
            this.deathTimer += dt;
            // 状态机推进
            if (this.deathPhase === 'flashing' && this.deathTimer >= 1.5) {
                this.deathPhase = 'turning';
            } else if (this.deathPhase === 'turning' && this.deathTimer >= 2.5) {
                this.deathPhase = 'sinking';
            } else if (this.deathPhase === 'sinking' && this.deathTimer >= 4.0) {
                this.deathPhase = 'gone';
                // 标记死亡，game.js会处理清理（创建尸体+光点粒子）
                this.isAlive = false;
            }
            // 死亡动画期间不做任何移动/AI，只更新死亡计时器
            return;
        }

        // === Phase 3 成年进化检测 ===
        if (this.isJuvenile && !this.isAdult && this.segments.length >= CONFIG.FAMILY.ADULT_EVOLVE_LENGTH) {
            this.isAdult = true;
            this.isJuvenile = false;
            this.evolveAnimation = 1.0; // 触发进化动画
            // 进化特效
            if (typeof game !== 'undefined' && game.particles) {
                for (let k = 0; k < 12; k++) {
                    game.particles.push(Particle.acquire(this.head.x, this.head.y, '#ffe66d'));
                }
            }
            if (typeof game !== 'undefined' && game.floatingTexts) {
                game.floatingTexts.push(FloatingText.acquire(this.head.x, this.head.y - 30, 'EVOLVE!', '#ffe66d'));
            }
            if (typeof game !== 'undefined' && game.musicSystem) {
                game.musicSystem.playBirthChime(this.head.x);
            }
            if (typeof game !== 'undefined' && game.debugLogger) {
                game.debugLogger.logEvent('evolve', `幼体进化为成年后代 (${this.personality || '无性格'})`, game.gameTime);
            }
        }

        // === Phase 3 进化动画衰减 ===
        if (this.evolveAnimation > 0) {
            this.evolveAnimation = Math.max(0, this.evolveAnimation - dt * 0.5);
        }

        // === Phase 3 驻守模式：成年后代巡逻 ===
        if (this.isAdult && this.isGuardingPosition && this.guardPosition && !this.isPlayer) {
            this.guardOrbitPhase += dt * CONFIG.FAMILY.GUARD_ORBIT_SPEED;
            const orbitR = 30 + Math.sin(this.guardOrbitPhase * 0.7) * 15;
            const gx = this.guardPosition.x + Math.cos(this.guardOrbitPhase) * orbitR;
            const gy = this.guardPosition.y + Math.sin(this.guardOrbitPhase) * orbitR;
            // 驻守者主动攻击附近敌人
            if (this._enemies) {
                for (const enemy of this._enemies) {
                    if (!enemy.isAlive || enemy.isDying) continue;
                    const d = this.head.dist(enemy.pos);
                    if (d < CONFIG.FAMILY.GUARD_DETECT_RADIUS) {
                        // 冲向敌人
                        return this._juvenileAvoidWalls(enemy.pos);
                    }
                }
            }
            return this._juvenileAvoidWalls(new Vector(gx, gy));
        }

        // 更新计时器
        this.updateTimers(dt);

        // 击退效果处理
        if (this.knockbackVelocity && this.knockbackTimer > 0) {
            this.knockbackTimer -= dt;
            // 热路径：就地修改，不创建临时Vector
            this.segments[0].x += this.knockbackVelocity.x * dt * 60;
            this.segments[0].y += this.knockbackVelocity.y * dt * 60;
            this.knockbackVelocity.x *= 0.85;
            this.knockbackVelocity.y *= 0.85;
            // 更新身体跟随
            const spacing = CONFIG.SEGMENT_SPACING;
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dx = prev.x - curr.x, dy = prev.y - curr.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) { curr.x = prev.x - dx / d * spacing; curr.y = prev.y - dy / d * spacing; }
            }
            return;  // 击退期间不进行其他移动
        }
        this.knockbackVelocity = null;

        // 更新黄光效果和生长逻辑
        this.updateGrowth(dt, allFoods);

       this.updateSpeed();

        let moveTarget = targetPos;

        if (!this.isPlayer && this.isAlive) {
            moveTarget = this.aiThink(allFoods, allWorms, dt, this._enemies, this._brokenTails);
        }

        const head = this.segments[0];

        if (!moveTarget) {
            return;
        }

        const dx = moveTarget.x - head.x;
        const dy = moveTarget.y - head.y;
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

        // 如果已经到达目标附近，停止移动（身体正弦波波动已提供生命感）
        if (distanceToTarget < CONFIG.STOP_DISTANCE) {
            if (distanceToTarget < CONFIG.LERP_STOP_THRESHOLD) {
                this.isMoving = false;
            } else {
                const lerpFactor = CONFIG.LERP_MOVE_FACTOR;
                head.x += (moveTarget.x - head.x) * lerpFactor;
                head.y += (moveTarget.y - head.y) * lerpFactor;
                this.isMoving = false;
            }
        } else {
            if (distanceToTarget > 0) {
                this.velocity.x = dx / distanceToTarget;
                this.velocity.y = dy / distanceToTarget;
            }

            const speedDt = this.speed * dt * 60;
            const newX = head.x + this.velocity.x * speedDt;
            const newY = head.y + this.velocity.y * speedDt;

            // Phase 3: 家族门 + Phase B: Barrier 门 + Phase 3b: 障碍物 + Phase 3c: 可挖掘墙 阻挡检测
            if (this._familyGates || this._barriers || this._obstacles || this._diggableWalls) {
                let blocked = false;
                if (this._familyGates) {
                    for (const gate of this._familyGates) {
                        if (gate.isBlocking(this)) { blocked = true; break; }
                    }
                }
                if (!blocked && this._barriers) {
                    for (const barrier of this._barriers) {
                        if (barrier.isBlocking(this)) { blocked = true; break; }
                    }
                }
                // Phase 3b: 固体障碍物阻挡
                if (!blocked && this._obstacles) {
                    for (const obs of this._obstacles) {
                        if (!obs.isAlive) continue;
                        if (obs.type === 'rock' || obs.type === 'crystalSpike') {
                            const dx = newX - obs.pos.x;
                            const dy = newY - obs.pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < obs.radius + 10) {
                                blocked = true;
                                break;
                            }
                        }
                    }
                }
                // Phase 3c: 可挖掘墙壁阻挡（挖穿后不再阻挡）
                if (!blocked && this._diggableWalls) {
                    for (const wall of this._diggableWalls) {
                        if (!wall.active) continue;
                        if (wall.isBlocked(newX, newY)) {
                            blocked = true;
                            this.isDigging = true;
                            break;
                        }
                    }
                }
                if (blocked) {
                    this.isMoving = false;
                } else {
                    head.x = newX;
                    head.y = newY;
                    this.isMoving = true;
                }
            } else {
                head.x = newX;
                head.y = newY;
                this.isMoving = true;
            }
        }

        // 更新饥饿系统
        this.updateHunger(dt);
        if (!this.isAlive) return;

        // 更新减速和冰晶效果
        this.updateEffects(dt);

        // 更新身体段跟随
        this.updateBodyFollowing();

        // 更新生长动画
        this.updateGrowingSegments(dt);

        // 更新缩小动画
        this.updateShrinkingSegments(dt, allFoods);
    }

    // 更新各种计时器
    updateTimers(dt) {
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.activationTimer > 0) this.activationTimer -= dt;
        if (this.mouthCloseTimer > 0) this.mouthCloseTimer -= dt;
        if (this.warningFlashTimer > 0) this.warningFlashTimer -= dt;
        if (this.magnetTimer > 0) this.magnetTimer -= dt;
        if (this.purpleParticleTimer > 0) this.purpleParticleTimer -= dt;
        if (this.protectingTimer > 0) this.protectingTimer -= dt;
        if (this._obstacleSlowTimer > 0) this._obstacleSlowTimer -= dt;
        if (this.comboCooldown > 0) this.comboCooldown -= dt;  // 合击冷却

        // 更新空闲波动相位（始终保持生命感波动）
        this.idleWavePhase += dt * 4;
        if (this.headEnlargedTimer > 0) {
            this.headEnlargedTimer -= dt;
            if (this.headEnlargedTimer <= 0) {
                this.headEnlarged = false;
                this.headScaleTarget = 1.0;
            }
        }
        if (this.tailYellowDashTimer > 0) {
            this.tailYellowDashTimer -= dt;
            if (this.tailYellowDashTimer <= 0) {
                this.tailYellowDash = true;
            }
        }

        // 头部缩放平滑过渡
        const scaleSpeed = 5.0;
        if (Math.abs(this.headScale - this.headScaleTarget) > 0.01) {
            this.headScale += (this.headScaleTarget - this.headScale) * scaleSpeed * dt;
        } else {
            this.headScale = this.headScaleTarget;
        }
    }

    // 更新黄光效果和生长逻辑
    updateGrowth(dt, allFoods) {
        // 更新黄光效果：从嘴部到尾部逐个闪光
        if (this.yellowGlowTimer > 0) {
            this.yellowGlowTimer -= dt;
            this.yellowGlowStepTimer -= dt;

            if (this.yellowGlowStepTimer <= 0) {
                this.yellowGlowIndex++;
                this.yellowGlowStepTimer = 0.1;
            }

            if (this.yellowGlowTimer <= 0 && this.pendingGrowCount > 0) {
                this.growStepTimer = 0;
            }
        }

        // 逐节生长逻辑：每隔 0.4 秒长一节
        if (this.pendingGrowCount > 0 && this.grownCount < this.pendingGrowCount) {
            this.growStepTimer -= dt;
            if (this.growStepTimer <= 0) {
                if (this.segments.length >= CONFIG.MAX_SEGMENT_LENGTH) {
                    this.pendingGrowCount = 0;
                    this.grownCount = 0;
                } else {
                    let direction = new Vector(0, 0);
                    if (this.segments.length >= 2) {
                        const tail = this.segments[this.segments.length - 1];
                        const beforeTail = this.segments[this.segments.length - 2];
                        direction = tail.sub(beforeTail).normalize();
                    } else if (this.segments.length === 1) {
                        direction = this.velocity.clone();
                    }

                    this.growingSegments.push({
                        targetPos: new Vector(0, 0),
                        progress: 0,
                        direction: direction,
                        startPos: null,
                        basePos: null
                    });

                    this.targetLength++;
                    this.grownCount++;
                    this.growStepTimer = 0.4;

                    if (typeof musicSystem !== 'undefined') {
                        const song = musicSystem.songs['水晶序曲'];
                        if (song) {
                            const noteIndex = (this.grownCount - 1) % song.length;
                            const headX = this.segments[0] ? this.segments[0].x : 400;
                            musicSystem.playNote(song[noteIndex].freq, song[noteIndex].duration, undefined, undefined, headX);
                        }
                    }

                    if (this.grownCount >= this.pendingGrowCount) {
                        this.pendingGrowCount = 0;
                        this.grownCount = 0;
                    }
                }
            }
        }
    }

    // 更新饥饿系统
    updateHunger(dt) {
        this.hungerTimer += dt;
        const baseRate = this.isMoving ? this.hungerRateMoving : this.hungerRateIdle;
        const length = this.segments.length;
        let hungerRate = baseRate * CONFIG.HUNGER.BASE_MULTIPLIER * Math.exp(CONFIG.HUNGER.DECAY_RATE * length);
        if (length < CONFIG.HUNGER.LOW_BODY_THRESHOLD) {
            hungerRate *= CONFIG.HUNGER.LOW_BODY_MULTIPLIER;
        }

        if (this.hungerTimer >= hungerRate) {
            this.hungerTimer -= hungerRate;
            if (this.segments.length > 2) {
                const tailPos = this.segments[this.segments.length - 1];
                const actualVelocity = this.velocity.mult(this.speed * 60);
                this.shrinkingSegments.push({
                    pos: new Vector(tailPos.x, tailPos.y),
                    progress: 0,
                    duration: 0.3,
                    color: this.color,
                    showDash: true,
                    dashProgress: 0,
                    sinking: false,
                    velocity: new Vector(0, 0),
                    initialVelocity: actualVelocity.clone(),
                    emitted: false
                });

                const normalSegments = this.segments.length - 1 - this.blueSegments;

                if (normalSegments > 0) {
                    this.segments.pop();
                    this.targetLength--;
                } else {
                    this.segments.pop();
                    this.targetLength--;
                }
                this.syncBlueToBody();  // 同步弹舱状态
            } else if (this.segments.length <= 2) {
                this.isAlive = false;
                return;
            }
        }
    }

    // 更新减速和冰晶效果
    updateEffects(dt) {
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowStacks = Math.max(0, this.slowStacks - 1);
                this.updateSpeed();
                if (this.slowStacks > 0) {
                    this.slowTimer = 3.0;
                }
            }
        }

        {
            let w = 0;
            for (let i = 0; i < this.iceOverlays.length; i++) {
                this.iceOverlays[i].timer -= dt;
                if (this.iceOverlays[i].timer > 0) {
                    this.iceOverlays[w++] = this.iceOverlays[i];
                }
            }
            this.iceOverlays.length = w;
        }
    }

    // 更新身体段跟随
    updateBodyFollowing() {
        const spacing = CONFIG.SEGMENT_SPACING;
        const lerpFactor = CONFIG.LERP_BODY_FACTOR;
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > spacing) {
                const invDist = 1 / dist;
                const nx = dx * invDist;
                const ny = dy * invDist;
                const targetX = prev.x - nx * spacing;
                const targetY = prev.y - ny * spacing;
                curr.x += (targetX - curr.x) * lerpFactor;
                curr.y += (targetY - curr.y) * lerpFactor;
            }
        }
    }

    // 更新生长动画
    updateGrowingSegments(dt) {
        for (let i = this.growingSegments.length - 1; i >= 0; i--) {
            const growing = this.growingSegments[i];

            if (growing.startPos === null) {
                let currentTailPos;
                if (this.growingSegments.length > 1 && i > 0) {
                    currentTailPos = this.growingSegments[i - 1].targetPos;
                } else {
                    currentTailPos = this.segments.length > 0
                        ? this.segments[this.segments.length - 1]
                        : new Vector(0, 0);
                }

                growing.startPos = new Vector(currentTailPos.x, currentTailPos.y);

                let direction = growing.direction;
                if (direction.mag() === 0) {
                    if (this.segments.length >= 3) {
                        const tail = this.segments[this.segments.length - 1];
                        const beforeTail = this.segments[this.segments.length - 2];
                        const beforeBeforeTail = this.segments[this.segments.length - 3];

                        const currentDir = tail.sub(beforeTail).normalize();
                        const prevDir = beforeTail.sub(beforeBeforeTail).normalize();

                        const currentAngle = Math.atan2(currentDir.y, currentDir.x);
                        const prevAngle = Math.atan2(prevDir.y, prevDir.x);
                        let curvature = currentAngle - prevAngle;
                        curvature = Math.max(-0.5, Math.min(0.5, curvature));

                        const newAngle = currentAngle + curvature;
                        direction = new Vector(Math.cos(newAngle), Math.sin(newAngle));
                    } else if (this.segments.length >= 2) {
                        const tail = this.segments[this.segments.length - 1];
                        const beforeTail = this.segments[this.segments.length - 2];
                        direction = tail.sub(beforeTail).normalize();
                    }
                }
                growing.targetPos = currentTailPos.add(direction.mult(CONFIG.SEGMENT_SPACING));
            }

            growing.progress += dt * 4;

            if (growing.progress >= 1) {
                this.segments.push(growing.targetPos);
                this.growingSegments.splice(i, 1);
            }
        }
    }

    // 更新缩小动画
    updateShrinkingSegments(dt, allFoods) {
        for (let i = this.shrinkingSegments.length - 1; i >= 0; i--) {
            const shrinking = this.shrinkingSegments[i];

            if (shrinking.progress < 1) {
                shrinking.progress += dt / shrinking.duration;
                shrinking.dashProgress = shrinking.progress;

                if (shrinking.progress >= 1) {
                    shrinking.showDash = false;
                    shrinking.sinking = true;
                    const initialVx = shrinking.initialVelocity ? shrinking.initialVelocity.x : 0;
                    const initialVy = shrinking.initialVelocity ? shrinking.initialVelocity.y : 0;
                    shrinking.velocity = new Vector(
                        initialVx * CONFIG.DEAD_BODY.INITIAL_VX_INHERIT + (Math.random() - 0.5) * CONFIG.DEAD_BODY.INITIAL_VX_RANDOM,
                        CONFIG.DEAD_BODY.INITIAL_VY_MIN + Math.random() * CONFIG.DEAD_BODY.INITIAL_VY_SPREAD + initialVy * 0.05
                    );
                }
            }

            if (shrinking.sinking) {
                shrinking.velocity.y += CONFIG.DEAD_BODY.SINK_GRAVITY * dt;
                shrinking.velocity.x += (Math.random() - 0.5) * CONFIG.DEAD_BODY.SINK_SWAY * dt;
                shrinking.velocity.x *= CONFIG.DEAD_BODY.SINK_DAMPING;

                shrinking.pos.x += shrinking.velocity.x * dt;
                shrinking.pos.y += shrinking.velocity.y * dt;

                if (shrinking.pos.y >= CONFIG.MAP_HEIGHT - CONFIG.BORDER_MARGIN && !shrinking.emitted) {
                    shrinking.emitted = true;

                    const roll = Math.random();
                    let type;
                    if (roll < CONFIG.DEAD_BODY.EMIT_PROB_GREEN) {
                        type = CONFIG.FOOD_TYPES[0];
                    } else if (roll < CONFIG.DEAD_BODY.EMIT_PROB_BLUE) {
                        type = CONFIG.FOOD_TYPES[3];
                    } else if (roll < CONFIG.DEAD_BODY.EMIT_PROB_YELLOW) {
                        type = CONFIG.FOOD_TYPES[1];
                    } else {
                        type = CONFIG.FOOD_TYPES[2];
                    }

                    const food = new Food(shrinking.pos.x, shrinking.pos.y, type);
                    const angle = (CONFIG.DEAD_BODY.EMIT_ANGLE_MIN + Math.random() * CONFIG.DEAD_BODY.EMIT_ANGLE_SPREAD) * Math.PI / 180;
                    const speed = CONFIG.DEAD_BODY.EMIT_SPEED_MIN + Math.random() * CONFIG.DEAD_BODY.EMIT_SPEED_SPREAD;
                    food.velocity.x = speed * Math.cos(angle);
                    food.velocity.y = -speed * Math.sin(angle);
                    food.inactiveTimer = CONFIG.DEAD_BODY.EMIT_INACTIVE_TIME;
                    food.birthPhase = 'white';
                    food.birthTimer = CONFIG.DEAD_BODY.EMIT_BIRTH_TIME;
                    allFoods.push(food);

                    if (!this.pendingParticles) this.pendingParticles = [];
                    for (let j = 0; j < CONFIG.DEAD_BODY.EMIT_PARTICLE_COUNT; j++) {
                        this.pendingParticles.push(Particle.acquire(shrinking.pos.x, shrinking.pos.y, type.color));
                    }
                }

                if (shrinking.pos.y > CONFIG.MAP_HEIGHT + 50 ||
                    shrinking.pos.x < -50 || shrinking.pos.x > CONFIG.MAP_WIDTH + 50) {
                    this.shrinkingSegments.splice(i, 1);
                }
            }
        }
    }

    aiThink(foods, allWorms, dt, enemies, brokenTails) {
        // 空指针保护：如果segments为空，直接返回
        if (!this.head) return null;

        // 幼体AI行为
        if (this.isJuvenile) {
            return this.juvenileThink(foods, allWorms, dt, enemies, brokenTails);
        }

        // 保护幼体：如果有自己的幼体正被敌人威胁、咬住或最近被攻击
        if (allWorms && enemies && !this.isPlayer) {
            let targetEnemy = null;
            let minDist = Infinity;
            let foundThreat = false;

            for (const worm of allWorms) {
                if (!worm.isJuvenile || worm.parentWorm !== this || !worm.isAlive) continue;

                for (const enemy of enemies) {
                    if (!enemy.isAlive || enemy.isDying) continue;

                    // 敌人正咬住幼体：最高优先级
                    if (enemy.latchedJuvenile === worm) {
                        foundThreat = true;
                        const d = this.head.dist(enemy.pos);
                        if (d < minDist) {
                            minDist = d;
                            targetEnemy = enemy;
                        }
                    }
                    // 敌人正在追击/绕圈这个幼体
                    else if (enemy.circleTarget === worm || enemy.chaseTarget === worm) {
                        foundThreat = true;
                        const d = this.head.dist(enemy.pos);
                        if (d < minDist) {
                            minDist = d;
                            targetEnemy = enemy;
                        }
                    }
                    // 敌人在幼体附近（恐惧半径内）
                    else {
                        const distToJuv = worm.head.dist(enemy.pos);
                        if (distToJuv < CONFIG.FAMILY.JUVENILE_FEAR_RADIUS) {
                            foundThreat = true;
                            const d = this.head.dist(enemy.pos);
                            if (d < minDist) {
                                minDist = d;
                                targetEnemy = enemy;
                            }
                        }
                    }
                }
            }

            if (foundThreat && targetEnemy) {
                this.protectingTimer = 3.0;  // 保护状态持续3秒
                return targetEnemy.pos;
            }
        }

        this.aiWanderTimer -= dt;
        if (this.aiWanderTimer <= 0) {
            this.aiWanderTimer = CONFIG.AI_WANDER_CHANGE + Math.random() * 2;
            this.aiWanderDir = Vector.randomDir();
        }

        let nearestFood = null;
        let minDist = Infinity;
        for (const food of foods) {
            if (!food || !food.pos) continue;  // 跳过无效食物
            const d = this.head.dist(food.pos);
            if (d < minDist) {
                minDist = d;
                nearestFood = food;
            }
        }

        if (nearestFood && minDist < 300) {
            return nearestFood.pos;
        }

        return this.head.add(this.aiWanderDir.mult(100));
    }

    // 幼体AI思考
    juvenileThink(foods, allWorms, dt, enemies, brokenTails) {
        this._allWorms = allWorms;  // 保存引用供findFoodTarget使用
        this.juvenileFearTimer -= dt;

        // === Phase 2 性格行为：每次调用采样母体行为（用于模仿机制） ===
        if (this.parentWorm && this.parentWorm.isAlive && this.mimicryData.totalSamples < 100) {
            this.mimicryData.totalSamples++;
            if (this.parentWorm.isMoving) {
                const speed = this.parentWorm.speed || 0;
                if (speed > 4) this.mimicryData.rushes++;
                else if (speed < 3) this.mimicryData.dodges++;
            }
        }

        // === Phase 2 性格模仿机制：采样足够后判断母体行为倾向 ===
        if (!this.mimicryResolved && this.mimicryData.totalSamples >= CONFIG.PERSONALITY.MIMICRY_THRESHOLD) {
            this.mimicryResolved = true;
            const { rushes, dodges } = this.mimicryData;
            let parentStyle = null; // 母体行为倾向
            if (rushes > dodges * 1.5) {
                parentStyle = 'brave';   // 冲锋型 → 勇敢
            } else if (dodges > rushes * 1.5) {
                parentStyle = 'gentle';  // 躲闪型 → 温柔
            } else if (rushes < 3 && dodges < 3) {
                parentStyle = 'curious'; // 静止多 → 好奇（爱观察）
            } else {
                parentStyle = 'naughty'; // 混合型 → 淘气
            }
            // 如果母体行为倾向与当前性格不同，有 60% 概率切换
            if (parentStyle && parentStyle !== this.personality && Math.random() < 0.6) {
                const oldLabel = this.personality ? CONFIG.PERSONALITY.TYPES[this.personality]?.label : '无';
                const newLabel = CONFIG.PERSONALITY.TYPES[parentStyle]?.label || parentStyle;
                this.personality = parentStyle;
                // 浮动文字提示
                if (typeof game !== 'undefined' && game.floatingTexts) {
                    game.floatingTexts.push(FloatingText.acquire(
                        this.head.x, this.head.y - 30,
                        `${CONFIG.PERSONALITY.TYPES[parentStyle]?.emoji || ''} 性格模仿→${newLabel}`,
                        CONFIG.PERSONALITY.TYPES[parentStyle]?.color || '#ffe66d'
                    ));
                }
                if (typeof game !== 'undefined' && game.debugLogger) {
                    game.debugLogger.logEvent('mimicry', `幼体模仿母体：${oldLabel}→${newLabel}（冲锋${rushes}/躲闪${dodges}）`, game.gameTime);
                }
            }
        }

        // === Phase 2 性格行为：更新冷却和状态计时器 ===
        if (this.guardCooldown > 0) this.guardCooldown -= dt;
        if (this.healPulseTimer > 0) this.healPulseTimer -= dt;
        if (this.scoutFlashTimer > 0) this.scoutFlashTimer -= dt;

        // === Phase 2 护理恢复系统：更新受伤等级 ===
        const newInjuredLevel = this.juvenileHitCount >= 2 ? 2 : (this.juvenileHitCount >= 1 ? 1 : 0);
        this.injuredLevel = newInjuredLevel;
        // 平滑过渡灰色透明度
        const targetGrayAlpha = this.injuredLevel === 2 ? 0.6 : (this.injuredLevel === 1 ? 0.3 : 0);
        this.injuredGrayAlpha += (targetGrayAlpha - this.injuredGrayAlpha) * Math.min(1, dt * 3);

        // === Phase 2 护理恢复：母体靠近喂食恢复 ===
        if (this.injuredLevel > 0 && this.parentWorm && this.parentWorm.isAlive) {
            const distToParent = this.head.dist(this.parentWorm.head);
            if (distToParent < 60) {
                this.isRecovering = true;
                this.recoveryTimer += dt;
                // 每 2 秒恢复 1 级受伤
                if (this.recoveryTimer >= 2.0) {
                    this.recoveryTimer = 0;
                    if (this.juvenileHitCount > 0) {
                        this.juvenileHitCount--;
                        // 恢复特效
                        if (typeof game !== 'undefined' && game.particles) {
                            for (let k = 0; k < 5; k++) {
                                game.particles.push(Particle.acquire(this.head.x, this.head.y, '#a8e6cf'));
                            }
                        }
                        if (typeof game !== 'undefined' && game.floatingTexts) {
                            game.floatingTexts.push(FloatingText.acquire(this.head.x, this.head.y - 20, 'HEAL!', '#a8e6cf'));
                        }
                        if (typeof game !== 'undefined' && game.musicSystem) {
                            game.musicSystem.playHealChime(this.head.x);
                        }
                    }
                }
            } else {
                this.isRecovering = false;
                this.recoveryTimer = 0;
            }
        } else {
            this.isRecovering = false;
            this.recoveryTimer = 0;
        }

        // === Phase 2 性格行为：勇敢挡刀 ===
        if (this.personality === 'brave' && enemies && this.parentWorm && this.parentWorm.isAlive) {
            if (this.guardCooldown <= 0 && !this.isGuarding) {
                // 检查母体是否被敌人威胁
                for (const enemy of enemies) {
                    if (!enemy.isAlive || enemy.isDying) continue;
                    const distToEnemy = this.head.dist(enemy.pos);
                    const distParentToEnemy = this.parentWorm.head.dist(enemy.pos);
                    // 敌人在母体附近300px内，且幼体比母体更近敌人的概率更大
                    if (distParentToEnemy < 300 && distToEnemy < 350) {
                        this.isGuarding = true;
                        this.guardTargetEnemy = enemy;
                        this._pendingGuardSound = true;
                        break;
                    }
                }
            }
            // 挡刀行为：冲到敌人和母体之间
            if (this.isGuarding && this.guardTargetEnemy && this.guardTargetEnemy.isAlive) {
                const parentHead = this.parentWorm.head;
                const enemyPos = this.guardTargetEnemy.pos;
                // 计算敌人和母体之间的中点偏敌方位置（挡在前面）
                const guardX = (parentHead.x + enemyPos.x) / 2 + (enemyPos.x - parentHead.x) * 0.15;
                const guardY = (parentHead.y + enemyPos.y) / 2 + (enemyPos.y - parentHead.y) * 0.15;
                const distToGuard = this.head.dist(new Vector(guardX, guardY));
                if (distToGuard < 20) {
                    // 到达挡位，等待敌人冲过来
                    this.isGuarding = false;
                    this.guardCooldown = 15; // 冷却15秒
                }
                return this._juvenileAvoidWalls(new Vector(guardX, guardY));
            }
        }

        // === Phase 2 性格行为：温柔治疗 ===
        if (this.personality === 'gentle' && this.parentWorm && this.parentWorm.isAlive) {
            const distToParent = this.head.dist(this.parentWorm.head);
            // 如果母体有受伤幼体，靠近治疗
            if (distToParent < 80) {
                this.isHealing = true;
                this.healPulseTimer = 2.0; // 治疗脉冲持续2秒
            } else if (distToParent > 150) {
                this.isHealing = false;
            }
        }

        // === Phase 2 性格行为：好奇侦察 ===
        if (this.personality === 'curious' && foods && foods.length > 0) {
            // 主动探索远处宝珠
            let farthestFood = null;
            let farthestDist = 0;
            for (const food of foods) {
                if (!food || !food.pos) continue;
                const d = this.head.dist(food.pos);
                if (d > 200 && d > farthestDist && d < 600) {
                    farthestDist = d;
                    farthestFood = food;
                }
            }
            if (farthestFood && !this.isScouting) {
                this.isScouting = true;
                this.scoutTarget = farthestFood.pos;
            }
            // 侦察中：向远处宝珠移动
            if (this.isScouting && this.scoutTarget) {
                const distToTarget = this.head.dist(this.scoutTarget);
                if (distToTarget < 40) {
                    // 到达侦察目标，闪烁提示
                    this.scoutFlashTimer = 1.5;
                    this.isScouting = false;
                    this._pendingScoutFlash = true;
                } else {
                    return this._juvenileAvoidWalls(this.scoutTarget);
                }
            }
        }

        // === Phase 2 性格行为：淘气加速 ===
        if (this.personality === 'naughty') {
            // 淘气幼体移动更快（在updateSpeed中处理）
            // 主动靠近母体偷吃宝珠残渣
        }

        // 冷却计时器递减
        if (this.feedCooldown > 0) {
            this.feedCooldown -= dt;
            if (this.feedCooldown < 0) this.feedCooldown = 0;
        }

        // 0. 如果正在被咬，在原地挣扎游走
        if (this.bittenSegments && this.bittenSegments.size > 0) {
            // 安全检查：确认确实有敌人咬住这个幼体
            let actuallyBitten = false;
            if (enemies) {
                for (const enemy of enemies) {
                    if (enemy.latchedJuvenile === this && enemy.isAlive && !enemy.isDying) {
                        actuallyBitten = true;
                        break;
                    }
                }
            }
            if (!actuallyBitten) {
                // 没有敌人实际咬住，清除挣扎状态
                this.bittenSegments.clear();
                this.isStruggling = false;
            } else {
                this.isStruggling = true;
                this.strugglePhase += dt * 18;
                const wriggleX = Math.sin(this.strugglePhase) * 45;
                const wriggleY = Math.cos(this.strugglePhase * 1.3) * 45;
                return new Vector(this.head.x + wriggleX, this.head.y + wriggleY);
            }
        } else {
            this.isStruggling = false;
        }

        // === Phase 1 亲子情感：撒娇/庆祝逻辑 ===
        if (this.parentWorm && this.parentWorm.isAlive && this.parentWorm.head) {
            const distToParent = this.head.dist(this.parentWorm.head);

            // 庆祝中：围着母体头部快速转圈
            if (this.isCelebrating) {
                this.celebrateTimer -= dt;
                if (this.celebrateTimer <= 0) {
                    this.isCelebrating = false;
                    this.celebrateTimer = 0;
                }
                // 快速环绕母体头部（速度是正常的3倍）
                const parentHead = this.parentWorm.head;
                this.juvenileOrbitPhase += 0.045;  // 3倍速旋转
                const orbitDist = CONFIG.SEGMENT_RADIUS * 2.5;
                const angle = this.juvenileOrbitPhase;
                const targetX = parentHead.x + Math.cos(angle) * orbitDist;
                const targetY = parentHead.y + Math.sin(angle) * orbitDist;
                this.sulkGlow += (1.1 - this.sulkGlow) * dt * 5;  // 快速恢复亮度
                return this._juvenileAvoidWalls(new Vector(targetX, targetY));
            }

            // 远离母体超过300px
            if (distToParent > 300) {
                this.sulkTimer += dt;
                // 远离超过10秒，进入撒娇状态
                if (this.sulkTimer > 10 && !this.isSulking) {
                    this.isSulking = true;
                    // 撒娇音效（通过返回标记让game.js触发）
                    this._pendingSulkSound = true;
                }
            } else {
                // 靠近母体，重置远离计时
                this.sulkTimer = Math.max(0, this.sulkTimer - dt * 2);
            }

            // 撒娇状态中靠近母体（距离<80px），触发庆祝
            if (this.isSulking && distToParent < 80) {
                this.isSulking = false;
                this.isCelebrating = true;
                this.celebrateTimer = 2.0;
                this.sulkTimer = 0;
                // 庆祝音效标记
                this._pendingCelebrateSound = true;
            }

            // 撒娇状态：身体变暗
            if (this.isSulking) {
                this.sulkGlow += (0.3 - this.sulkGlow) * dt * 3;  // lerp到0.3
            } else if (!this.isCelebrating) {
                this.sulkGlow += (1.0 - this.sulkGlow) * dt * 3;  // lerp回1.0
            }
        }

        // 1. 检查附近是否有敌人（害怕/逃亡）
        let nearestEnemy = null;
        let enemyDist = Infinity;
        if (enemies) {
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;
                const d = this.head.dist(enemy.pos);
                if (d < enemyDist) {
                    enemyDist = d;
                    nearestEnemy = enemy;
                }
            }
        }

        // 2. 如果被攻击过，进入逃亡模式：远离敌人，不再跟随父代
        if (this.juvenileHitCount >= 1) {
            if (nearestEnemy) {
                let fleeDir = this.head.sub(nearestEnemy.pos).normalize();
                let fleeTarget = this.head.add(fleeDir.mult(280));
                // 逃亡时也要避开边界
                return this._juvenileAvoidWalls(fleeTarget);
            }
            // 没有可见敌人，随机游荡（不跟随父代）
            this.aiWanderTimer -= dt;
            if (this.aiWanderTimer <= 0) {
                this.aiWanderTimer = CONFIG.AI_WANDER_CHANGE + Math.random() * 2;
                this.aiWanderDir = Vector.randomDir();
            }
            return this._juvenileAvoidWalls(this.head.add(this.aiWanderDir.mult(100)));
        }

        // 如果敌人在害怕范围内，停止不动
        if (nearestEnemy && enemyDist < CONFIG.FAMILY.JUVENILE_FEAR_RADIUS) {
            this.juvenileFearTimer = 1.0;  // 害怕1秒
            return this.head;  // 返回自己的位置（不动）
        }

        // 如果还在害怕状态，继续不动
        if (this.juvenileFearTimer > 0) {
            return this.head;
        }

        // 1.5 冷却期间跳过食物寻觅，直接去环绕父代尾部或游荡
        if (this.feedCooldown > 0) {
            const orbitTarget = this._juvenileGetOrbitTarget();
            if (orbitTarget) return orbitTarget;
            // 无父代，随机游荡
            this.aiWanderTimer -= dt;
            if (this.aiWanderTimer <= 0) {
                this.aiWanderTimer = CONFIG.AI_WANDER_CHANGE + Math.random() * 2;
                this.aiWanderDir = Vector.randomDir();
            }
            return this._juvenileAvoidWalls(this.head.add(this.aiWanderDir.mult(50)));
        }

        // 2. 寻找成年体掉下的断尾（优先吃）
        if (brokenTails) {
            let nearestTail = null;
            let tailDist = Infinity;
            for (const tail of brokenTails) {
                if (!tail.segments || tail.segments.length === 0) continue;
                const d = this.head.dist(tail.segments[0]);
                if (d < tailDist) {
                    tailDist = d;
                    nearestTail = tail;
                }
            }
            if (nearestTail && tailDist < CONFIG.FAMILY.JUVENILE_EAT_RADIUS * 5) {
                return nearestTail.segments[0];
            }
        }

        // 2.5 追逐任何虫虫正在消耗沉下的尾部（shrinkingSegments）
        {
            let nearestShrink = null;
            let shrinkDist = Infinity;
            for (const w of this._allWorms || []) {
                if (!w.isAlive || !w.shrinkingSegments) continue;
                for (const shrink of w.shrinkingSegments) {
                    if (!shrink.pos) continue;
                    const d = this.head.dist(shrink.pos);
                    if (d < shrinkDist) {
                        shrinkDist = d;
                        nearestShrink = shrink;
                    }
                }
            }
            if (nearestShrink && shrinkDist < CONFIG.FAMILY.JUVENILE_EAT_RADIUS * 5) {
                return nearestShrink.pos;
            }
        }

        // 3. 环绕父代尾部（幼体默认行为：围着尾巴打转，等着吃下沉的灰色尾巴）
        const orbitTarget = this._juvenileGetOrbitTarget();
        if (orbitTarget) return orbitTarget;

        // 4. 无父代时：随机游荡
        this.aiWanderTimer -= dt;
        if (this.aiWanderTimer <= 0) {
            this.aiWanderTimer = CONFIG.AI_WANDER_CHANGE + Math.random() * 2;
            this.aiWanderDir = Vector.randomDir();
        }
        return this._juvenileAvoidWalls(this.head.add(this.aiWanderDir.mult(50)));
    }

    /**
     * 幼体环绕父代尾部的逻辑
     * 距离 1-2 个身段半径（8~16px），围着尾巴打转
     */
    _juvenileGetOrbitTarget() {
        if (!this.parentWorm || !this.parentWorm.isAlive || this.parentWorm.segments.length < 3) {
            return null;
        }
        const parent = this.parentWorm;
        const tailIdx = parent.segments.length - 1;
        const tailPos = parent.segments[tailIdx];

        // 环绕距离：1~2 个身段半径 + 一点随机
        const orbitDist = CONFIG.SEGMENT_RADIUS * (1.5 + Math.sin(this.juvenileOrbitPhase * 0.3) * 0.5);

        // 缓慢更新环绕角度（让幼体绕着尾巴打转）
        this.juvenileOrbitPhase += 0.015; // 慢速旋转，每帧约0.86度

        const angle = this.juvenileOrbitPhase;
        const targetX = tailPos.x + Math.cos(angle) * orbitDist;
        const targetY = tailPos.y + Math.sin(angle) * orbitDist;

        return this._juvenileAvoidWalls(new Vector(targetX, targetY));
    }

    // 幼体边界避让：目标靠近边缘时推向中心
    _juvenileAvoidWalls(target) {
        const safeMargin = CONFIG.BORDER_MARGIN * 2;  // 安全边距
        const cx = CONFIG.MAP_WIDTH / 2;
        const cy = CONFIG.MAP_HEIGHT / 2;
        let tx = target.x;
        let ty = target.y;

        // 如果目标超出安全区域，推向中心
        if (tx < safeMargin) tx = cx;
        else if (tx > CONFIG.MAP_WIDTH - safeMargin) tx = cx;
        if (ty < safeMargin) ty = cy;
        else if (ty > CONFIG.MAP_HEIGHT - safeMargin) ty = cy;

        // 如果当前位置已经在边缘，强制推向中心
        if (this.head.x < safeMargin || this.head.x > CONFIG.MAP_WIDTH - safeMargin ||
            this.head.y < safeMargin || this.head.y > CONFIG.MAP_HEIGHT - safeMargin) {
            const pushDir = new Vector(cx - this.head.x, cy - this.head.y).normalize();
            return this.head.add(pushDir.mult(150));
        }

        return new Vector(tx, ty);
    }

    // 死亡线检测（地图边缘）
    checkWallCollision() {
        if (this.segments.length === 0) return false;
        const head = this.segments[0];
        const margin = CONFIG.BORDER_MARGIN;
        return head.x < margin || head.x > CONFIG.MAP_WIDTH - margin ||
               head.y < margin || head.y > CONFIG.MAP_HEIGHT - margin;
    }

    // 预警线检测（接近地图边缘时预警）
    checkWarningLine() {
        if (this.segments.length === 0) return false;
        const head = this.segments[0];
        const margin = CONFIG.BORDER_MARGIN + 80;  // 距离边界80像素时开始预警
        return head.x < margin || head.x > CONFIG.MAP_WIDTH - margin ||
               head.y < margin || head.y > CONFIG.MAP_HEIGHT - margin;
    }

    checkFoodCollision(foods) {
        if (this.segments.length === 0) return -1;
        if (this.isJuvenile) return -1;  // 幼年体不能吃宝珠
        const head = this.segments[0];
        for (let i = 0; i < foods.length; i++) {
            const food = foods[i];
            if (food.inactiveTimer > 0) continue;  // 初生冷却中的宝珠不能被吃
            const eatDist = CONFIG.SEGMENT_RADIUS + food.type.radius;
            if (head.dist(food.pos) < eatDist) return i;
        }
        return -1;
    }

    checkSelfCollision() {
        if (this.segments.length < 11) return -1;  // 至少需要11段才可能自噬
        const head = this.segments[0];
        const collisionDist = CONFIG.SEGMENT_RADIUS * 1.5;

        for (let i = 10; i < this.segments.length; i++) {
            if (head.dist(this.segments[i]) < collisionDist) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 检测头部是否咬到自己的尾巴段
     * 返回：被咬的段索引，或 -1
     * 注意：返回所有咬尾段，由调用方判断无敌状态
     */
    checkSelfTailBite() {
        if (this.segments.length === 0) return -1;
        const head = this.segments[0];
        const collisionDist = CONFIG.SEGMENT_RADIUS * 1.2;

        const tailIndices = this.tailSegmentIndices;
        for (const segIndex of tailIndices) {
            if (head.dist(this.segments[segIndex]) < collisionDist) {
                return segIndex;
            }
        }
        return -1;
    }

    /**
     * 检测头部是否碰到其他虫虫的尾巴段
     * 返回: { worm: 被咬的虫虫，segmentIndex: 被咬的段索引 } 或 null
     */
    checkTailBite(otherWorms, spatialGrid) {
        if (this.segments.length === 0) return null;
        const head = this.segments[0];
        const collisionDist = CONFIG.SEGMENT_RADIUS * 1.2;

        if (spatialGrid) {
            // 空间网格加速：只检测头部附近的段
            const candidates = spatialGrid.query(head.x, head.y, collisionDist);
            for (const { worm: other, segIndex } of candidates) {
                if (other === this || !other.isAlive) continue;
                if (other.invincibleTimer > 0) continue;
                if (other.activationTimer > 0) continue;
                if (other.isJuvenile) continue;
                // 检查是否为尾巴段
                const tailIndices = other.tailSegmentIndices;
                if (!tailIndices.includes(segIndex)) continue;
                if (head.dist(other.segments[segIndex]) < collisionDist) {
                    return { worm: other, segmentIndex: segIndex };
                }
            }
            return null;
        }

        for (const other of otherWorms) {
            if (other === this || !other.isAlive) continue;
            if (other.invincibleTimer > 0) continue;
            if (other.activationTimer > 0) continue;
            if (other.isJuvenile) continue;

            const tailIndices = other.tailSegmentIndices;
            for (const segIndex of tailIndices) {
                if (head.dist(other.segments[segIndex]) < collisionDist) {
                    return { worm: other, segmentIndex: segIndex };
                }
            }
        }
        return null;
    }

    /**
     * 检测头部是否碰到其他虫虫的颈部段（索引 1 ~ len/3）
     * 返回：{ worm: 被咬的虫虫，segmentIndex: 被咬的段索引 } 或 null
     */
    checkNeckBite(otherWorms, spatialGrid) {
        if (this.segments.length === 0) return null;
        const head = this.segments[0];
        const collisionDist = CONFIG.SEGMENT_RADIUS * 1.2;

        if (spatialGrid) {
            const candidates = spatialGrid.query(head.x, head.y, collisionDist);
            for (const { worm: other, segIndex } of candidates) {
                if (other === this || !other.isAlive) continue;
                if (other.invincibleTimer > 0) continue;
                if (other.activationTimer > 0) continue;
                if (other.isJuvenile) continue;
                const neckIndices = other.neckSegmentIndices;
                if (!neckIndices.includes(segIndex)) continue;
                if (head.dist(other.segments[segIndex]) < collisionDist) {
                    return { worm: other, segmentIndex: segIndex };
                }
            }
            return null;
        }

        for (const other of otherWorms) {
            if (other === this || !other.isAlive) continue;
            if (other.invincibleTimer > 0) continue;
            if (other.activationTimer > 0) continue;
            if (other.isJuvenile) continue;

            const neckIndices = other.neckSegmentIndices;
            for (const segIndex of neckIndices) {
                if (head.dist(other.segments[segIndex]) < collisionDist) {
                    return { worm: other, segmentIndex: segIndex };
                }
            }
        }
        return null;
    }

    /**
     * 检测头部是否碰到其他虫虫的身体段（非尾巴、非颈部、非腹部）
     * 跳过无敌状态的虫虫
     * 腹部碰撞不触发死亡
     */
    checkOtherWormCollision(otherWorms, spatialGrid) {
        if (this.segments.length === 0) return null;
        const head = this.segments[0];
        const collisionDist = CONFIG.SEGMENT_RADIUS * 1.2;

        if (spatialGrid) {
            const candidates = spatialGrid.query(head.x, head.y, collisionDist);
            for (const { worm: other, segIndex } of candidates) {
                if (other === this || !other.isAlive) continue;
                if (other.invincibleTimer > 0) continue;
                if (other.activationTimer > 0) continue;
                if (other.isJuvenile) continue;  // 跳过幼体，防止玩家碰幼体死亡
                const rs = other._regionSets;
                if (rs.tail.has(segIndex) || rs.neck.has(segIndex) || rs.abdomen.has(segIndex)) continue;
                if (head.dist(other.segments[segIndex]) < collisionDist) {
                    return { worm: other, segmentIndex: segIndex };
                }
            }
            return null;
        }

        for (const other of otherWorms) {
            if (other === this || !other.isAlive) continue;
            if (other.invincibleTimer > 0) continue;
            if (other.activationTimer > 0) continue;
            if (other.isJuvenile) continue;  // 跳过幼体，防止玩家碰幼体死亡

            const rs = other._regionSets;

            for (let i = 0; i < other.segments.length; i++) {
                // 跳过尾巴段（尾巴 bite 有单独处理）
                if (rs.tail.has(i)) continue;
                // 跳过颈部段（颈部 bite 有单独处理，直接死亡）
                if (rs.neck.has(i)) continue;
                // 跳过腹部段（腹部碰撞不触发死亡）
                if (rs.abdomen.has(i)) continue;
                if (head.dist(other.segments[i]) < collisionDist) {
                    return { worm: other, segmentIndex: i };
                }
            }
        }
        return null;
    }

    updateEntering(dt) {
        // 更新空闲波动相位（始终保持生命感波动）
        this.idleWavePhase += dt * 4;

        // 处理出场动画
        if (this.isEntering && this.enterPhase === 0) {
            this.enterPhase = 1;  // 开始动画第一阶段
            this.enterStartTime = performance.now() / 1000;

        }

        if (this.enterPhase === 1) {
            // 第一阶段：从框外正弦波游到画面中央
            const currentTime = performance.now() / 1000;
            const elapsed = currentTime - this.enterStartTime;
            const progress = Math.min(elapsed / this.enterDuration1, 1);


            const startX = this.enterStartPos.x;
            const endX = this.enterMidPos.x;
            const startY = this.enterStartPos.y;
            const endY = this.enterMidPos.y;

            // 水平方向：线性移动
            const currentX = startX + (endX - startX) * progress;

            // 垂直方向：正弦波摆动
            const amplitude = 16;  // 一个身体直径
            const frequency = 2;
            const currentY = startY + (endY - startY) * progress + Math.sin(progress * Math.PI * frequency) * amplitude;

            const head = this.segments[0];
            const newHead = new Vector(currentX, currentY);
            this.velocity = newHead.sub(head).normalize();
            this.segments[0] = newHead;

            // 身体跟随
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dir = prev.sub(curr);
                const dist = dir.mag();

                if (dist > CONFIG.SEGMENT_SPACING) {
                    const targetPos = prev.sub(dir.normalize().mult(CONFIG.SEGMENT_SPACING));
                    this.segments[i] = new Vector(
                        curr.x + (targetPos.x - curr.x) * 0.3,
                        curr.y + (targetPos.y - curr.y) * 0.3
                    );
                }
            }

            if (progress >= 1) {
                this.enterPhase = 2;  // 进入第二阶段
                this.enterStartTime = performance.now() / 1000;  // 重置时间
            }

            return;
        }

        if (this.enterPhase === 2) {
            // 第二阶段：从当前位置游到鼠标位置
            const currentTime = performance.now() / 1000;
            const elapsed = currentTime - this.enterStartTime;
            const progress = Math.min(elapsed / this.enterDuration2, 1);

            const head = this.segments[0];

            // 使用enterTargetPos作为鼠标位置（在mouse事件中设置）
            const mousePos = this.enterTargetPos || head;
            const distanceToMouse = head.dist(mousePos);

            if (distanceToMouse < 5) {
                // 鼠标没动，直接完成动画
                this.enterPhase = 3;
                this.isEntering = false;
                return;
            }

            // 计算目标位置（从当前位置向鼠标位置移动）
            const direction = mousePos.sub(head).normalize();
            const moveDistance = distanceToMouse * progress;
            const currentX = head.x + direction.x * moveDistance;
            const currentY = head.y + direction.y * moveDistance;

            const newHead = new Vector(currentX, currentY);
            this.velocity = newHead.sub(head).normalize();
            this.segments[0] = newHead;

            // 身体跟随
            for (let i = 1; i < this.segments.length; i++) {
                const prev = this.segments[i - 1];
                const curr = this.segments[i];
                const dir = prev.sub(curr);
                const dist = dir.mag();

                if (dist > CONFIG.SEGMENT_SPACING) {
                    const targetPos = prev.sub(dir.normalize().mult(CONFIG.SEGMENT_SPACING));
                    this.segments[i] = new Vector(
                        curr.x + (targetPos.x - curr.x) * 0.3,
                        curr.y + (targetPos.y - curr.y) * 0.3
                    );
                }
            }

            if (progress >= 1) {
                this.enterPhase = 3;  // 完成
                this.isEntering = false;
            }

            return;
        }
    }

}

// 混入绘制方法
import { WormDrawMixin } from './worm-draw.js';
Object.assign(Worm.prototype, WormDrawMixin);
