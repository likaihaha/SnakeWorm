/**
 * ZoneManager - 关卡区域管理器
 * Phase A: 纯数据层
 * 
 * 将 4000×3000 地图划分为 5×5 的 800×600 区域网格
 * Z字形路径：1→2→3→4→5↑10→9→8→7→6↑11→12→13→14→15↑20→19→18→17→16↑21→22→23→24→25
 * 
 * 每个区域有：类型、状态（未解锁/已解锁/已完成）、门条件、主题等
 */
import { CONFIG } from './config.js';

// 区域类型
export const ZONE_TYPE = {
    OPEN: 'open',           // 开放区域（无特殊门）
    GATE: 'gate',           // 需要门才能进入
    BOSS: 'boss',           // Boss 关卡
    SAFE: 'safe',           // 安全区（无敌人）
    TREASURE: 'treasure',   // 宝藏区（隐藏奖励）
};

// 区域状态
export const ZONE_STATUS = {
    LOCKED: 'locked',       // 未解锁
    UNLOCKED: 'unlocked',   // 已解锁可进入
    COMPLETED: 'completed', // 已通关
};

// 门的类型
export const GATE_TYPE = {
    NONE: 'none',
    SCORE: 'score',         // 需要达到一定分数
    LENGTH: 'length',       // 需要一定长度
    FAMILY: 'family',       // 需要一定数量的成年后代（已通过FamilyGate实现）
    JUVENILE: 'juvenile',   // 需要幼体
    KILL: 'kill',           // 需要击杀一定敌人
};

// Z字形路径顺序
const ZIGZAG_PATH = [
    [0,4], [1,4], [2,4], [3,4], [4,4],  // 行5: 1→5 (左→右)
    [4,3], [3,3], [2,3], [1,3], [0,3],  // 行4: 6→10 (右→左)
    [0,2], [1,2], [2,2], [3,2], [4,2],  // 行3: 11→15 (左→右)
    [4,1], [3,1], [2,1], [1,1], [0,1],  // 行2: 16→20 (右→左)
    [0,0], [1,0], [2,0], [3,0], [4,0],  // 行1: 21→25 (左→右)
];

// 区域配置数据
const ZONE_CONFIGS = [];
for (let i = 0; i < 25; i++) {
    const [col, row] = ZIGZAG_PATH[i];
    const levelNum = i + 1;
    let zoneType = ZONE_TYPE.OPEN;
    let gateType = GATE_TYPE.NONE;
    let gateThreshold = 0;
    let enemyMultiplier = 1.0;
    let foodMultiplier = 1.0;
    let theme = 'default';

    // 难度分层
    let obstacleTypes = [];
    let obstacleCount = 0;
    if (levelNum <= 5) {
        // 基础层：移动、吃宝珠、躲避
        enemyMultiplier = 0.5;
        foodMultiplier = 1.5;
        theme = 'forest';
        obstacleTypes = ['rock', 'thorn'];
        obstacleCount = levelNum === 1 ? 0 : Math.min(levelNum, 3);  // 安全区无障碍，后面逐步增加
    } else if (levelNum <= 10) {
        // 战斗层：引入敌人
        enemyMultiplier = 1.5;
        foodMultiplier = 1.0;
        theme = 'cave';
        obstacleTypes = ['rock', 'thorn', 'crystalSpike'];
        obstacleCount = 3;
        if (levelNum === 6) {
            zoneType = ZONE_TYPE.GATE;
            gateType = GATE_TYPE.SCORE;
            gateThreshold = 300;
        }
    } else if (levelNum <= 15) {
        // 策略层：宝珠选择、路径规划
        enemyMultiplier = 1.2;
        foodMultiplier = 0.8;
        theme = 'crystal';
        obstacleTypes = ['crystalSpike', 'rock'];
        obstacleCount = 4;
        if (levelNum === 11) {
            zoneType = ZONE_TYPE.GATE;
            gateType = GATE_TYPE.LENGTH;
            gateThreshold = 15;
        }
    } else if (levelNum <= 20) {
        // 技巧层：狭窄通道、限时挑战
        enemyMultiplier = 2.0;
        foodMultiplier = 0.6;
        theme = 'lava';
        obstacleTypes = ['lavaPool', 'rock'];
        obstacleCount = 4;
        if (levelNum === 16) {
            zoneType = ZONE_TYPE.GATE;
            gateType = GATE_TYPE.JUVENILE;
            gateThreshold = 1;
        }
    } else {
        // 终极层：综合考验
        enemyMultiplier = 2.5;
        foodMultiplier = 0.5;
        theme = 'void';
        obstacleTypes = ['voidRift', 'crystalSpike'];
        obstacleCount = 5;
        if (levelNum === 21) {
            zoneType = ZONE_TYPE.GATE;
            gateType = GATE_TYPE.KILL;
            gateThreshold = 5;
        }
    }

    // Boss 关卡障碍物较少（Boss本身就是挑战）
    if ([5, 10, 15, 20, 25].includes(levelNum)) {
        zoneType = ZONE_TYPE.BOSS;
        obstacleCount = 2;  // Boss区域少量障碍物增加战术性
    }

    // Boss 关卡
    if ([5, 10, 15, 20, 25].includes(levelNum)) {
        zoneType = ZONE_TYPE.BOSS;
    }

    // 出生关和终点关
    if (levelNum === 1) zoneType = ZONE_TYPE.SAFE;
    if (levelNum === 25) theme = 'final';

    ZONE_CONFIGS.push({
        id: levelNum,
        col,
        row,
        x: col * 800,
        y: row * 600,
        width: 800,
        height: 600,
        centerX: col * 800 + 400,
        centerY: row * 600 + 300,
        zoneType,
        gateType,
        gateThreshold,
        enemyMultiplier,
        foodMultiplier,
        theme,
        obstacleTypes,
        obstacleCount,
        status: levelNum === 1 ? ZONE_STATUS.UNLOCKED : ZONE_STATUS.LOCKED,
        enemies: [],
        foods: [],
    });
}

export class ZoneManager {
    constructor() {
        this.zones = ZONE_CONFIGS;
        this.currentZoneId = 1;  // 玩家当前所在区域
        this.killCount = 0;      // 总击杀数（用于击杀门条件）
        this.visitedZones = new Set([1]);
        this.completedZones = new Set();
        // Phase E: 区域实体懒加载
        this.zoneEntityCache = new Map();  // zoneId -> {foods: [], enemies: [], bosses: [], obstacles: []} 暂存离区实体
        this.activeZoneIds = new Set([1]);  // 当前活跃区域（玩家+相邻）
        this.revisitRewards = new Set();  // 已领取回访奖励的区域
        this.obstaclesGenerated = new Set();  // 已生成障碍物的区域ID
        this.totalScore = 0;
        this.maxLengthReached = 0;
    }

    /**
     * 获取活跃区域集合（玩家所在+相邻8格）
     * Phase E: 懒加载核心
     */
    getActiveZoneIds(playerX, playerY) {
        const col = Math.floor(playerX / 800);
        const row = Math.floor(playerY / 600);
        const active = new Set();
        for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
                const c = col + dc;
                const r = row + dr;
                if (c >= 0 && c <= 4 && r >= 0 && r <= 4) {
                    // 找到对应区域id
                    for (const zone of this.zones) {
                        if (zone.col === c && zone.row === r) {
                            active.add(zone.id);
                            break;
                        }
                    }
                }
            }
        }
        return active;
    }

    /**
     * 检查实体是否在活跃区域内
     */
    isActive(entity, activeIds) {
        if (!entity.pos) return true;  // 无位置信息的默认活跃
        const zone = this.getZoneAt(entity.pos.x, entity.pos.y);
        return zone ? activeIds.has(zone.id) : true;
    }

    /**
     * 根据世界坐标获取所在区域
     * @param {number} worldX
     * @param {number} worldY
     * @returns {object|null} 区域配置
     */
    getZoneAt(worldX, worldY) {
        const col = Math.floor(worldX / 800);
        const row = Math.floor(worldY / 600);
        if (col < 0 || col > 4 || row < 0 || row > 4) return null;
        // 找到对应区域
        for (const zone of this.zones) {
            if (zone.col === col && zone.row === row) return zone;
        }
        return null;
    }

    /**
     * 获取玩家当前所在区域ID
     */
    getCurrentZone(player) {
        if (!player || !player.head) return this.currentZoneId;
        const zone = this.getZoneAt(player.head.x, player.head.y);
        if (zone) {
            this.currentZoneId = zone.id;
            this.visitedZones.add(zone.id);
            // 自动解锁当前区域
            if (zone.status === ZONE_STATUS.LOCKED) {
                zone.status = ZONE_STATUS.UNLOCKED;
            }
        }
        return this.currentZoneId;
    }

    /**
     * 检查下一个区域是否可以进入
     * @param {number} currentId 当前区域ID
     * @param {object} playerState 玩家状态 {score, length, juvenileCount, adultCount, killCount}
     * @returns {{canEnter: boolean, reason: string}}
     */
    canEnterNextZone(currentId, playerState) {
        if (currentId >= 25) return { canEnter: false, reason: '已经是最终区域' };

        const nextZone = this.zones[currentId]; // nextZone.id === currentId + 1
        if (!nextZone) return { canEnter: false, reason: '区域不存在' };
        if (nextZone.status === ZONE_STATUS.COMPLETED) return { canEnter: true, reason: '已通关' };
        if (nextZone.status === ZONE_STATUS.UNLOCKED) return { canEnter: true, reason: '已解锁' };

        // 检查门条件
        if (nextZone.gateType === GATE_TYPE.NONE) {
            return { canEnter: true, reason: '开放区域' };
        }

        switch (nextZone.gateType) {
            case GATE_TYPE.SCORE:
                if (playerState.score >= nextZone.gateThreshold) return { canEnter: true, reason: `分数 ${playerState.score}/${nextZone.gateThreshold}` };
                return { canEnter: false, reason: `需要 ${nextZone.gateThreshold} 分 (当前 ${playerState.score})` };
            case GATE_TYPE.LENGTH:
                if (playerState.length >= nextZone.gateThreshold) return { canEnter: true, reason: `长度 ${playerState.length}/${nextZone.gateThreshold}` };
                return { canEnter: false, reason: `需要长度 ${nextZone.gateThreshold} (当前 ${playerState.length})` };
            case GATE_TYPE.FAMILY:
                if (playerState.adultCount >= nextZone.gateThreshold) return { canEnter: true, reason: `成年后代 ${playerState.adultCount}/${nextZone.gateThreshold}` };
                return { canEnter: false, reason: `需要 ${nextZone.gateThreshold} 只成年后代` };
            case GATE_TYPE.JUVENILE:
                if (playerState.juvenileCount >= nextZone.gateThreshold) return { canEnter: true, reason: `幼体 ${playerState.juvenileCount}/${nextZone.gateThreshold}` };
                return { canEnter: false, reason: `需要 ${nextZone.gateThreshold} 只幼体` };
            case GATE_TYPE.KILL:
                if (this.killCount >= nextZone.gateThreshold) return { canEnter: true, reason: `击杀 ${this.killCount}/${nextZone.gateThreshold}` };
                return { canEnter: false, reason: `需要击杀 ${nextZone.gateThreshold} 敌人 (当前 ${this.killCount})` };
            default:
                return { canEnter: true, reason: '未知门类型，放行' };
        }
    }

    /**
     * 标记区域完成
     */
    completeZone(zoneId) {
        const zone = this.zones[zoneId - 1];
        if (zone) {
            zone.status = ZONE_STATUS.COMPLETED;
            this.completedZones.add(zoneId);
            // Boss关通过后，自动解锁下一个区域（打开通往下一区域的障碍门）
            if (zone.zoneType === ZONE_TYPE.BOSS && zoneId < 25) {
                const nextZone = this.zones[zoneId]; // zones[zoneId] = id zoneId+1
                if (nextZone && nextZone.status === ZONE_STATUS.LOCKED) {
                    nextZone.status = ZONE_STATUS.UNLOCKED;
                }
            }
        }
    }

    /**
     * 检查当前区域是否满足通关条件（Phase D）
     * @param {number} zoneId - 当前区域ID
     * @param {object} ctx - 上下文 {enemies, gameTime, score, playerLength}
     * @returns {{completed: boolean, reason: string}}
     */
    checkZoneCompletion(zoneId, ctx) {
        const zone = this.zones[zoneId - 1];
        if (!zone || zone.status === ZONE_STATUS.COMPLETED) return { completed: false, reason: '' };

        // 安全区自动通关（停留3秒后）
        if (zone.zoneType === ZONE_TYPE.SAFE) {
            if (ctx.gameTime > 3) {
                return { completed: true, reason: '安全区 — 自动通过' };
            }
            return { completed: false, reason: '' };
        }

        // Boss 关卡：检查Boss是否已死亡
        if (zone.zoneType === ZONE_TYPE.BOSS) {
            // 优先检查Boss列表
            if (ctx.bosses !== undefined) {
                const bossesAlive = (ctx.bosses || []).filter(b => b.isAlive && b.state !== 'dead');
                if (bossesAlive.length === 0 && ctx.gameTime > 5 && ctx.bossesSpawned) {
                    return { completed: true, reason: 'Boss 击败！' };
                }
                if (bossesAlive.length > 0) {
                    return { completed: false, reason: `Boss HP: ${bossesAlive[0].health}/${bossesAlive[0].maxHealth}` };
                }
            }
            // 降级：清除所有普通敌人
            const enemiesInZone = (ctx.enemies || []).filter(e => {
                if (!e.isAlive || e.isDying) return false;
                if (e.homeZone) return e.homeZone.x === zone.x && e.homeZone.y === zone.y;
                return e.pos.x >= zone.x && e.pos.x <= zone.x + zone.width &&
                       e.pos.y >= zone.y && e.pos.y <= zone.y + zone.height;
            });
            if (enemiesInZone.length === 0 && ctx.gameTime > 5) {
                return { completed: true, reason: 'Boss 击败！' };
            }
            return { completed: false, reason: `剩余敌人: ${enemiesInZone.length}` };
        }

        // 门条件区域：通过 Barrier 条件即算通关
        if (zone.gateType !== GATE_TYPE.NONE) {
            const playerState = {
                score: ctx.score || 0,
                length: ctx.playerLength || 0,
                juvenileCount: ctx.juvenileCount || 0,
                adultCount: ctx.adultCount || 0,
                killCount: this.killCount,
            };
            const check = this.canEnterNextZone(zoneId - 1, playerState);
            if (check.canEnter) {
                return { completed: true, reason: check.reason };
            }
            return { completed: false, reason: check.reason };
        }

        // 普通区域：区域内无敌人生存的敌人即通关
        const enemiesInZone = (ctx.enemies || []).filter(e => {
            if (!e.isAlive || e.isDying) return false;
            if (e.homeZone) return e.homeZone.x === zone.x && e.homeZone.y === zone.y;
            return e.pos.x >= zone.x && e.pos.x <= zone.x + zone.width &&
                   e.pos.y >= zone.y && e.pos.y <= zone.y + zone.height;
        });
        // 战斗层和技巧层需要清除敌人
        if (zone.enemyMultiplier >= 1.0 && enemiesInZone.length > 0) {
            return { completed: false, reason: `剩余敌人: ${enemiesInZone.length}` };
        }
        // 基础层和策略层：存在即通关（无敌人或敌人已清除）
        if (zone.enemyMultiplier < 1.0 || enemiesInZone.length === 0) {
            return { completed: true, reason: '区域探索完成' };
        }
        return { completed: false, reason: '' };
    }

    /**
     * 记录击杀
     */
    recordKill() {
        this.killCount++;
    }

    /**
     * 获取区域的主题颜色配置
     */
    getThemeColors(theme) {
        const themes = {
            forest:  { bg: '#1a3a2a', accent: '#4ecca3', enemy: '#ff6b6b' },
            cave:    { bg: '#1a1a2e', accent: '#4dabf7', enemy: '#ff8c42' },
            crystal: { bg: '#2d1b4e', accent: '#c77dff', enemy: '#ffe66d' },
            lava:    { bg: '#3a1a1a', accent: '#ff6b6b', enemy: '#ffe66d' },
            void:    { bg: '#0a0a15', accent: '#c7ceea', enemy: '#ff8b94' },
            final:   { bg: '#1a0a2e', accent: '#ffe66d', enemy: '#ff6b6b' },
            default: { bg: '#0f1923', accent: '#4ecca3', enemy: '#ff6b6b' },
        };
        return themes[theme] || themes.default;
    }

    /**
     * 绘制区域调试信息（显示在地图上）
     */
    drawDebug(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (const zone of this.zones) {
            const theme = this.getThemeColors(zone.theme);
            ctx.fillStyle = theme.bg;
            ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

            // 区域边框
            ctx.strokeStyle = zone.status === ZONE_STATUS.COMPLETED ? '#44ff44' :
                              zone.status === ZONE_STATUS.UNLOCKED ? '#4dabf7' : 'rgba(128,128,128,0.3)';
            ctx.lineWidth = zone.status === ZONE_STATUS.LOCKED ? 1 : 2;
            ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // 区域编号
        ctx.save();
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        for (const zone of this.zones) {
            const statusIcon = zone.status === ZONE_STATUS.COMPLETED ? '✅' :
                               zone.status === ZONE_STATUS.UNLOCKED ? '🔓' : '🔒';
            ctx.fillStyle = zone.status === ZONE_STATUS.COMPLETED ? '#44ff44' :
                            zone.status === ZONE_STATUS.UNLOCKED ? '#4dabf7' : 'rgba(128,128,128,0.5)';
            ctx.fillText(`${statusIcon} ${zone.id}`, zone.centerX, zone.centerY - 10);
            ctx.font = '10px monospace';
            ctx.fillStyle = 'rgba(200,200,200,0.5)';
            ctx.fillText(zone.theme, zone.centerX, zone.centerY + 10);
            ctx.font = '14px monospace';
        }
        ctx.restore();
    }

    /**
     * 绘制当前区域的HUD提示（屏幕坐标）
     */
    drawHUD(ctx, canvasWidth, canvasHeight) {
        const zone = this.zones[this.currentZoneId - 1];
        if (!zone) return;

        // 左上角显示当前区域信息
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
        const statusText = zone.status === ZONE_STATUS.COMPLETED ? '✅ 已通关' :
                           zone.status === ZONE_STATUS.UNLOCKED ? '🔓 已解锁' : '🔒 未解锁';
        ctx.fillText(`区域 ${zone.id}/25 · ${zone.theme.toUpperCase()} · ${statusText}`, 10, canvasHeight - 10);
        ctx.restore();
    }

    /**
     * 保存进度到 localStorage（Phase D: 扩展存储）
     */
    saveProgress() {
        try {
            const data = {
                currentZoneId: this.currentZoneId,
                killCount: this.killCount,
                visitedZones: [...this.visitedZones],
                completedZones: [...this.completedZones],
                zoneStatuses: this.zones.map(z => z.status),
                totalScore: this.totalScore || 0,
                maxLengthReached: this.maxLengthReached || 0,
            };
            localStorage.setItem('snakeworm_zones', JSON.stringify(data));
        } catch (e) { /* 忽略存储错误 */ }
    }

    /**
     * 从 localStorage 恢复进度（Phase D: 扩展存储）
     */
    loadProgress() {
        try {
            const raw = localStorage.getItem('snakeworm_zones');
            if (!raw) return false;
            const data = JSON.parse(raw);
            this.currentZoneId = data.currentZoneId || 1;
            this.killCount = data.killCount || 0;
            this.visitedZones = new Set(data.visitedZones || [1]);
            this.completedZones = new Set(data.completedZones || []);
            this.totalScore = data.totalScore || 0;
            this.maxLengthReached = data.maxLengthReached || 0;
            if (data.zoneStatuses) {
                for (let i = 0; i < Math.min(this.zones.length, data.zoneStatuses.length); i++) {
                    this.zones[i].status = data.zoneStatuses[i];
                }
            }
            return true;
        } catch (e) { return false; }
    }
}
