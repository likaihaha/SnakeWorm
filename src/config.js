/**
 * CONFIG - 游戏全局配置
 * GAME_STATE - 游戏状态枚举
 * ENEMY_STATE - 敌人状态枚举
 */

export const CONFIG = {
    VERSION: '1.82',
    CANVAS_WIDTH: 800, CANVAS_HEIGHT: 600,   // 视口大小（屏幕显示区域）
    MAP_WIDTH: 4000, MAP_HEIGHT: 3000,        // 世界地图大小（5×5倍）
    BORDER_MARGIN: 30,                        // 地图边界死亡区宽度（用于尸体/宝珠生成等）
    WALL_MARGIN: 5,                           // 地图边缘死亡区宽度（保留兼容，很小）
    SEGMENT_RADIUS: 8, SEGMENT_SPACING: 14,
    BASE_SPEED: 5, MIN_SPEED: 2, SPEED_DECAY: 0.02,
    WORM_INITIAL_LENGTH: 3, GROWTH_PER_FOOD: 1,
    MAX_SEGMENT_LENGTH: 80,
    SPLIT_COLOR_DURATION: 3.0,
    SPLIT_GROW_HEAD_TIME: 2.0,
    SPLIT_INVINCIBLE_TIME: 9.0,
    SPLIT_COLORS: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#c7ceea'],
    MAX_WORMS: 12,
    AI_BASE_SPEED: 3.5,
    AI_WANDER_CHANGE: 2.0,
    TAIL_RATIO: 0.33,
    STOP_DISTANCE: 15,
    LERP_STOP_THRESHOLD: 1,
    LERP_MOVE_FACTOR: 0.15,
    LERP_BODY_FACTOR: 0.3,
    FOOD_TYPES: [
        { color: '#4ecca3', score: 10, radius: 8, gravity: 0.01, wobble: 0, weight: 60, maxCount: 5, respawnTime: 0.5 },
        { color: '#ffe66d', score: 30, radius: 8, gravity: 0.02, wobble: 0.5, weight: 25, maxCount: 1, respawnTime: 1.0 },
        { color: '#ff8c42', score: 60, radius: 8, gravity: 0.03, wobble: 0.6, weight: 10, maxCount: 2, respawnTime: 1.5 },
        { color: '#4dabf7', score: 120, radius: 8, gravity: 0.04, wobble: 0, weight: 4, maxCount: 2, respawnTime: 1.0 },
        { color: '#c77dff', score: 300, radius: 8, gravity: 0.05, wobble: 0.7, weight: 1, maxCount: 0, respawnTime: 2.5 }
    ],
    TARGET_FPS: 60,
    SHOW_FPS: false,
    RHYTHM: {
        YELLOW_UNLOCK_TIME: 25,
        YELLOW_UNLOCK_LENGTH: 10,
        RED_UNLOCK_TIME: 30,
        RED_UNLOCK_LENGTH: 15,
        ORANGE_UNLOCK_TIME: 90,
        YELLOW_COOLDOWN: 15.0,
    },
    FIRE: {
        FIRST_DELAY: 0.15,
        COOLDOWN: 0.12,
        BULLET_SPEED: 12,
        BULLET_LIFE: 2.0,
    },
    HUNGER: {
        BASE_MULTIPLIER: 52.6,
        DECAY_RATE: -0.099,
        LOW_BODY_MULTIPLIER: 32,
        LOW_BODY_THRESHOLD: 5,
    },
    FAMILY: {
        JUVENILE_MAX_LENGTH: 11,
        ADULT_HITS_TO_LOSE: 3,
        JUVENILE_HITS_TO_LOSE: 1,
        ENEMY_SPAWN_INTERVAL: 30,
        ENEMY_MAX_COUNT: 3,
        ENEMY_JUVENILE_SEG_THRESHOLD: 8,
        ENEMY_SPEED: 1.5,
        ENEMY_CHASE_SPEED: 3.0,
        ENEMY_CHASE_RADIUS: 200,
        ENEMY_SIZE: 12,
        ENEMY_SEGMENTS: 5,
        ENEMY_HEALTH: 3,
        ENEMY_DEATH_DURATION: 1.5,
        ENEMY_CIRCLE_RADIUS: 60,
        ENEMY_CIRCLE_SPEED: 2.5,
        ENEMY_CIRCLES_BEFORE_ATTACK: 2,
        ENEMY_SINK_GRAVITY: 120,
        ENEMY_KNOCKBACK_DECAY: 0.9,
        ENEMY_KNOCKBACK_DURATION: 0.3,
        ENEMY_HIT_FLASH_DURATION: 0.3,
        ENEMY_BITE_DAMAGE_DELAY: 0.5,
        ENEMY_BOB_SPEED: 3,
        ENEMY_SEG_SPACING: 8,
        ENEMY_TAIL_TAPER: 0.3,
        ENEMY_KNOCKBACK_SPEED: 8,
        ENEMY_BOUNCE_DECAY: 0.95,
        ENEMY_HIT_FLASH_BULLET: 0.5,
        ENEMY_HIT_FLASH_DAMAGE: 0.3,
        ENEMY_KNOCKBACK_TAKE: 0.2,
        ENEMY_BITE_COOLDOWN: 10.0,  // 咬成功后冷却10秒，见好就收去巡游
        JUVENILE_FOLLOW_RADIUS: 250,
        JUVENILE_FEAR_RADIUS: 150,
        JUVENILE_EAT_RADIUS: 30,
        JUVENILE_FEED_COOLDOWN: 3.0,  // 幼体吃一节后冷却3秒（游出去一圈再吃下一节）
        JUVENILE_SPEED_RATIO: 0.7,
        // === Phase 3 羁绊深度 ===
        ADULT_EVOLVE_LENGTH: 11,      // 幼体进化为成年后代的长度
        GUARD_PATROL_RADIUS: 120,     // 驻守巡逻半径
        GUARD_DETECT_RADIUS: 200,     // 驻守者发现敌人的半径
        GUARD_ORBIT_SPEED: 0.8,       // 驻守巡逻旋转速度
        TERRITORY_GUARDIAN_COUNT: 5,  // 家族领地所需驻守者数量
        FAMILY_GATE_RADIUS: 40,       // 家族门检测半径
        // === Phase 2 合击攻击 ===
        COMBO_RANGE: 300,             // 成年后代合击检测范围（距母体）
        COMBO_COOLDOWN: 3.0,          // 成年后代合击冷却（秒）
        COMBO_SPREAD: 0.15,           // 合击子弹角度偏移（弧度）
    },
    // === Phase 2 幼体性格系统 ===
    PERSONALITY: {
        TYPES: {
            brave:   { label: '勇敢', color: '#ff6b6b', emoji: '⚔️', guardRadius: 300, shieldCooldown: 15 },
            gentle:  { label: '温柔', color: '#a8e6cf', emoji: '💚', healRadius: 80, healRate: 0.5 },
            curious: { label: '好奇', color: '#4ecdc4', emoji: '🔍', scoutRadius: 500, flashDuration: 1.5 },
            naughty: { label: '淘气', color: '#ffe66d', emoji: '⚡', speedBonus: 1.3, stealRadius: 120 },
        },
        MIMICRY_THRESHOLD: 10,  // 母体行为采样次数阈值
    },
    // === Phase C 区域化实体生成 ===
    ZONE: {
        FOOD_BASE_COUNT: 4,        // 每区域基础宝珠数（乘以foodMultiplier）
        ENEMY_BASE_COUNT: 1,       // 每区域基础敌人数（乘以enemyMultiplier）
        ENEMY_SPAWN_INTERVAL: 15,  // 敌人刷新间隔（秒，基础值）
        FOOD_SPAWN_INTERVAL: 3,    // 宝珠刷新间隔（秒，基础值）
        ZONE_PADDING: 40,          // 实体在区域内离边界的最小距离
        LOCK_ENEMY_TO_ZONE: true,  // 敌人锁定在生成区域内
        BULLET_DISAPPEAR_AT_ZONE: true, // 子弹到达区域边界自动消失
    },
    // === Phase 3b 障碍物系统 ===
    OBSTACLE: {
        // 岩石 - 固体障碍，阻挡移动，可被子弹击碎
        ROCK: {
            RADIUS: 28,
            HEALTH: 3,
            COLOR: '#5a6e5a',
            BORDER_COLOR: '#3a4a3a',
            CRACK_COLOR: '#2a3a2a',
            SPAWN_PER_ZONE: 3,       // 每区域生成数量
        },
        // 荆棘 - 减速+周期伤害，可通过
        THORN: {
            RADIUS: 32,
            SLOW_FACTOR: 0.4,        // 减速比例
            SLOW_DURATION: 1.5,      // 减速持续时间（秒）
            DAMAGE_INTERVAL: 0.8,    // 伤害间隔（秒）
            DAMAGE: 1,               // 每次伤害（扣一节）
            COLOR: '#2d5a1e',
            VINE_COLOR: '#4a8a3a',
            THORN_COLOR: '#8a3a3a',
            SPAWN_PER_ZONE: 2,
        },
        // 水晶刺 - 固体障碍，反射子弹，不可破坏
        CRYSTAL_SPIKE: {
            RADIUS: 24,
            COLOR: '#9d4edd',
            CORE_COLOR: '#e0aaff',
            SHIMMER_SPEED: 2.0,      // 闪烁速度
            SPAWN_PER_ZONE: 3,
        },
        // 岩浆池 - 持续伤害区域，可通过（有伤害）
        LAVA_POOL: {
            RADIUS: 45,
            DAMAGE_INTERVAL: 1.0,    // 伤害间隔（秒）
            DAMAGE: 1,
            COLOR: '#ff4500',
            GLOW_COLOR: '#ff6b35',
            BUBBLE_COUNT: 5,         // 气泡数量
            SPAWN_PER_ZONE: 2,
        },
        // 虚空裂隙 - 拉扯附近虫虫+周期伤害
        VOID_RIFT: {
            RADIUS: 35,
            PULL_RADIUS: 150,        // 吸引半径
            PULL_FORCE: 1.2,         // 吸引力度
            DAMAGE_INTERVAL: 1.2,    // 伤害间隔
            DAMAGE: 1,
            COLOR: '#1a0a2e',
            RING_COLOR: '#c7ceea',
            PULSE_SPEED: 1.5,
            SPAWN_PER_ZONE: 2,
        },
        // 障碍物不生成的区域边界padding
        SPAWN_PADDING: 60,
        // 最少/最多障碍物数
        MIN_PER_ZONE: 1,
        MAX_PER_ZONE: 6,
    },
    // === Phase 3a Boss系统 ===
    BOSS: {
        // 通用参数
        HIT_FLASH_DURATION: 0.3,
        KNOCKBACK_SPEED: 10,
        KNOCKBACK_DECAY: 0.9,
        KNOCKBACK_DURATION: 0.3,
        INVINCIBLE_TIME: 0.5,  // 受击后无敌时间
        DEATH_DURATION: 3.0,  // Boss死亡动画时间

        // Zone 5 - 巨型蚯蚓（森林）
        WORM: {
            HEALTH: 8,
            SIZE: 25,
            SEGMENTS: 12,
            SEG_SPACING: 18,
            SPEED: 2.0,
            CHARGE_SPEED: 8.0,
            CHARGE_DISTANCE: 300,
            BURROW_DURATION: 1.5,
            BURROW_WARN_TIME: 0.8,
            PHASE2_SPEED_MULT: 1.3,
            PHASE2_CHARGE_MULT: 1.5,
            COLOR: '#4a7c59',
            EYE_COLOR: '#ff6b6b',
        },

        // Zone 10 - 暗影蛛母（洞穴）
        SPIDER: {
            HEALTH: 12,
            SIZE: 30,
            SPEED: 1.5,
            WEB_RANGE: 250,
            WEB_SLOW_DURATION: 3.0,
            WEB_SLOW_FACTOR: 0.4,
            WEB_COOLDOWN: 4.0,
            SPAWN_COUNT: 3,
            SPAWN_INTERVAL: 8.0,
            SPAWN_SIZE: 8,
            SPAWN_HEALTH: 1,
            PHASE2_SPAWN_MULT: 2,
            COLOR: '#2d1b4e',
            EYE_COLOR: '#ff00ff',
            LEG_COUNT: 8,
            LEG_LENGTH: 35,
        },

        // Zone 15 - 晶石守卫（水晶）
        CRYSTAL: {
            HEALTH: 15,
            SIZE: 20,
            CORE_SIZE: 15,
            SHARD_COUNT: 4,
            SHARD_RADIUS: 50,
            SHARD_SIZE: 10,
            ORBIT_SPEED: 2.0,
            PROJECTILE_SPEED: 5.0,
            PROJECTILE_COOLDOWN: 2.0,
            PROJECTILE_COUNT: 3,
            PHASE2_ORBIT_MULT: 1.5,
            PHASE2_PROJ_MULT: 2,
            COLOR: '#c77dff',
            CORE_COLOR: '#e0aaff',
            SHARD_COLOR: '#9d4edd',
        },

        // Zone 20 - 炎龙蜥（岩浆）
        LIZARD: {
            HEALTH: 18,
            SIZE: 28,
            SEGMENTS: 15,
            SEG_SPACING: 20,
            SPEED: 2.5,
            BREATH_RANGE: 200,
            BREATH_ANGLE: Math.PI / 3,  // 60度扇形
            BREATH_DURATION: 2.0,
            BREATH_COOLDOWN: 3.0,
            LAVA_DURATION: 5.0,
            LAVA_DAMAGE_INTERVAL: 1.0,
            PHASE2_SPEED_MULT: 1.4,
            PHASE2_BREATH_MULT: 1.5,
            COLOR: '#ff4500',
            EYE_COLOR: '#ffd700',
            LAVA_COLOR: '#ff6b35',
        },

        // Zone 25 - 虫后（终极）
        QUEEN: {
            HEALTH: 25,
            SIZE: 35,
            SPEED: 1.8,
            // 阶段1：召唤+冲锋
            PHASE1_CHARGE_SPEED: 7.0,
            PHASE1_CHARGE_COOLDOWN: 5.0,
            PHASE1_SPAWN_COUNT: 4,
            // 阶段2：弹幕+护盾
            PHASE2_SHARD_COUNT: 6,
            PHASE2_SHARD_RADIUS: 60,
            PHASE2_ORBIT_SPEED: 2.5,
            PHASE2_PROJECTILE_SPEED: 6.0,
            PHASE2_PROJECTILE_COOLDOWN: 1.5,
            PHASE2_PROJECTILE_COUNT: 5,
            // 阶段3：全机制+狂暴
            PHASE3_SPEED_MULT: 1.5,
            PHASE3_CHARGE_MULT: 1.3,
            PHASE3_PROJ_MULT: 1.5,
            PHASE3_SPAWN_INTERVAL: 4.0,
            COLOR: '#8b0000',
            EYE_COLOR: '#ffd700',
            QUEEN_COLOR: '#ff1493',
        },
    },

    PARTICLE: {
        SPEED_MIN: 2,
        SPEED_SPREAD: 3,
        LIFE: 0.4,
        SIZE_MIN: 2,
        SIZE_SPREAD: 2,
    },
    BULLET_RADIUS: 5,
    // 尸体下沉 & 宝珠发射参数
    DEAD_BODY: {
        SINK_GRAVITY: 60,           // 下沉重力加速度
        SINK_SWAY: 20,              // 左右摆动强度
        SINK_DAMPING: 0.99,         // 下沉阻尼
        INITIAL_VY_MIN: 15,         // 初始向下速度最小值
        INITIAL_VY_SPREAD: 15,      // 初始向下速度随机范围
        INITIAL_VX_INHERIT: 0.1,    // 继承初始水平速度比例
        INITIAL_VX_RANDOM: 5,       // 初始水平随机速度
        EMIT_SPEED_MIN: 2.0,        // 宝珠发射速度最小值
        EMIT_SPEED_SPREAD: 2.0,     // 宝珠发射速度随机范围
        EMIT_ANGLE_MIN: 30,         // 发射角度最小值（度）
        EMIT_ANGLE_SPREAD: 120,     // 发射角度随机范围（度）
        EMIT_INACTIVE_TIME: 2.0,    // 宝珠初生冷却时间
        EMIT_BIRTH_TIME: 1.2,       // 宝珠白点动画时间
        EMIT_PARTICLE_COUNT: 6,     // 发射粒子数量
        // 宝珠类型概率（绿70%、蓝15%、黄10%、橙5%）
        EMIT_PROB_GREEN: 0.70,
        EMIT_PROB_BLUE: 0.85,
        EMIT_PROB_YELLOW: 0.95,
    },
};

export const GAME_STATE = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
};

export const ENEMY_STATE = {
    WANDERING: 'wandering',
    CHASING: 'chasing',
    CIRCLING: 'circling',
    LATCHED: 'latched',
    FEEDING: 'feeding',
    DYING: 'dying',
    DEAD: 'dead',
};
