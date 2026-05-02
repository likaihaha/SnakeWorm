/**
 * CONFIG - 游戏全局配置
 * GAME_STATE - 游戏状态枚举
 * ENEMY_STATE - 敌人状态枚举
 */

export const CONFIG = {
    VERSION: '1.56',
    CANVAS_WIDTH: 800, CANVAS_HEIGHT: 600,
    SEGMENT_RADIUS: 8, SEGMENT_SPACING: 14,
    BASE_SPEED: 5, MIN_SPEED: 2, SPEED_DECAY: 0.02,
    WORM_INITIAL_LENGTH: 3, GROWTH_PER_FOOD: 1,
    MAX_SEGMENT_LENGTH: 80,
    WALL_MARGIN: 10,
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
