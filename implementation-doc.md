# SnakeWorm (Melody Worm) 游戏实施文档

## 1. 项目概述

### 1.1 游戏简介
SnakeWorm（旋律虫虫）是一款基于HTML5 Canvas的多人贪吃蛇变体游戏，融合了音乐节奏、亲子关系、区域探索等创新玩法。游戏采用模块化JavaScript架构，支持PC和移动端。

### 1.2 核心玩法
- **基础操作**：鼠标/触摸控制方向，按住左键连续射击
- **成长系统**：吃不同颜色宝珠获得不同效果（绿色+1节、黄色+2节+旋律、蓝色发射子弹、橙色磁力吸引）
- **亲子系统**：咬尾诞生后代，后代有4种性格（勇敢、温柔、好奇、淘气）
- **区域探索**：25个区域网格，Z字形路径，每个区域有独特主题和Boss
- **战斗系统**：射击、碰撞、Boss战、障碍物交互

### 1.3 技术栈
- **前端**：原生JavaScript (ES6+模块)
- **渲染**：HTML5 Canvas 2D
- **音效**：Web Audio API
- **存储**：localStorage (本地进度)
- **云服务**：腾讯云CloudBase (全球排行榜)

## 2. 项目架构

### 2.1 文件结构
```
SnakeWorm/
├── index.html              # 主入口HTML
├── src/                    # 源代码目录
│   ├── main.js            # 游戏入口，初始化和事件绑定
│   ├── game.js            # 游戏主控制器（核心逻辑）
│   ├── config.js          # 全局配置和常量
│   ├── worm.js            # 虫虫类（玩家和AI）
│   ├── enemy.js           # 敌人类
│   ├── boss.js            # Boss系统
│   ├── obstacle.js        # 障碍物系统
│   ├── entities.js        # 实体类（Food, Bullet, Particle等）
│   ├── camera.js          # 相机系统
│   ├── zone-manager.js    # 区域管理器
│   ├── barrier.js         # 区域门系统
│   ├── family-gate.js     # 家族门系统
│   ├── minimap.js         # 小地图
│   ├── music.js           # 音效系统
│   ├── leaderboard.js     # 排行榜
│   ├── changelog.js       # 更新日志
│   ├── debug-panel.js     # 调试面板
│   ├── debug-log.js       # 调试日志
│   ├── dynamic-bg.js      # 动态背景
│   ├── theme-configs.js   # 主题配置
│   ├── spatial-grid.js    # 空间分区优化
│   ├── vector.js          # 向量工具类
│   ├── utils.js           # 工具函数
│   ├── canvas.js          # Canvas初始化
│   ├── worm-draw.js       # 虫虫绘制
│   ├── broken-tail.js     # 断尾系统
│   ├── dead-body.js       # 尸体系统
│   └── cloudbase.js       # 云服务集成
├── editor/                 # 关卡编辑器
├── assets/                 # 资源文件
└── docs/                   # 文档
```

### 2.2 模块依赖关系
```
main.js → game.js → [所有其他模块]
game.js ← config.js (配置)
game.js ← worm.js (虫虫)
game.js ← enemy.js (敌人)
game.js ← boss.js (Boss)
game.js ← obstacle.js (障碍物)
game.js ← entities.js (实体)
game.js ← camera.js (相机)
game.js ← zone-manager.js (区域)
game.js ← barrier.js (门)
game.js ← family-gate.js (家族门)
game.js ← minimap.js (小地图)
game.js ← music.js (音效)
```

## 3. 核心功能模块详解

### 3.1 游戏主控制器 (game.js)
**职责**：管理游戏循环、输入处理、碰撞检测、UI更新、系统协调

**关键属性**：
```javascript
class Game {
    constructor() {
        this.worms = [];           // 所有虫虫列表
        this.enemies = [];         // 敌人列表
        this.bosses = [];          // Boss列表
        this.obstacles = [];       // 障碍物列表
        this.foods = [];           // 宝珠列表
        this.bullets = [];         // 子弹列表
        this.particles = [];       // 粒子效果
        this.camera = new Camera(); // 相机系统
        this.zoneManager = new ZoneManager(); // 区域管理
        this.state = GAME_STATE.IDLE; // 游戏状态
    }
}
```

**核心方法**：
- `startGame()`: 开始游戏
- `update(dt)`: 游戏逻辑更新
- `render()`: 渲染画面
- `checkCollisions()`: 碰撞检测
- `spawnFood()`: 生成宝珠
- `spawnEnemy()`: 生成敌人

### 3.2 虫虫系统 (worm.js)
**职责**：管理虫虫的行为、生长、AI、亲子关系

**关键特性**：
- **身体结构**：segments数组，每个segment是Vector位置
- **生长机制**：吃宝珠增加targetLength，逐节生长
- **AI行为**：寻食、避障、追击、逃跑
- **亲子关系**：幼体跟随母体，有4种性格
- **射击系统**：bulletCount管理弹药

**幼体性格系统**：
```javascript
PERSONALITY: {
    brave:   { label: '勇敢', guardRadius: 300, shieldCooldown: 15 },
    gentle:  { label: '温柔', healRadius: 80, healRate: 0.5 },
    curious: { label: '好奇', scoutRadius: 500, flashDuration: 1.5 },
    naughty: { label: '淘气', speedBonus: 1.3, stealRadius: 120 }
}
```

### 3.3 敌人系统 (enemy.js)
**职责**：敌人的AI行为、状态机、战斗逻辑

**状态机**：
```javascript
ENEMY_STATE = {
    WANDERING: 'wandering',   // 巡游
    CHASING: 'chasing',      // 追击
    CIRCLING: 'circling',    // 绕圈观察
    LATCHED: 'latched',      // 咬住幼体
    FEEDING: 'feeding',      // 觅食
    DYING: 'dying',          // 死亡中
    DEAD: 'dead'             // 已死亡
}
```

**行为逻辑**：
1. 巡游：随机移动，寻找目标
2. 发现幼体 → 绕圈观察2-3圈
3. 发动攻击 → 咬住幼体
4. 被击中 → 击退、受伤
5. 死亡 → 下沉动画、掉落宝珠

### 3.4 Boss系统 (boss.js)
**职责**：Boss的生成、行为、攻击模式

**5种Boss**：
1. **巨型蚯蚓** (Zone 5) - 冲锋+钻地
2. **暗影蛛母** (Zone 10) - 蛛网+召唤小蜘蛛
3. **晶石守卫** (Zone 15) - 护盾+弹幕
4. **炎龙蜥** (Zone 20) - 火焰吐息+岩浆
5. **虫后** (Zone 25) - 三阶段终极Boss

**Boss属性**：
```javascript
BOSS: {
    WORM: { HEALTH: 8, SIZE: 25, CHARGE_SPEED: 8.0 },
    SPIDER: { HEALTH: 12, WEB_RANGE: 250, SPAWN_COUNT: 3 },
    CRYSTAL: { HEALTH: 15, SHARD_COUNT: 4, ORBIT_SPEED: 2.0 },
    LIZARD: { HEALTH: 18, BREATH_RANGE: 200, LAVA_DURATION: 5.0 },
    QUEEN: { HEALTH: 25, PHASE1_CHARGE_SPEED: 7.0, PHASE2_SHARD_COUNT: 6 }
}
```

### 3.5 区域系统 (zone-manager.js)
**职责**：管理25个区域，Z字形路径，难度分层

**区域布局**：
```
5×5网格，800×600每个区域
Z字形路径：1→2→3→4→5↑10→9→8→7→6↑11→12→...→25
```

**难度分层**：
- 基础层 (1-5)：学习基础操作
- 战斗层 (6-10)：敌人和Boss
- 策略层 (11-15)：障碍物和地形
- 技巧层 (16-20)：复杂组合
- 终极层 (21-25)：最终挑战

**区域主题**：
```javascript
THEMES: {
    forest: { color: '#2d5a1e', particles: 'leaves' },
    cave: { color: '#1a1a2e', particles: 'bats' },
    crystal: { color: '#9d4edd', particles: 'shimmer' },
    lava: { color: '#ff4500', particles: 'embers' },
    void: { color: '#0a0a2e', particles: 'aurora' },
    final: { color: '#8b0000', particles: 'stars' }
}
```

### 3.6 障碍物系统 (obstacle.js)
**职责**：生成和管理各种障碍物

**5种障碍物**：
1. **岩石** (ROCK) - 固体，阻挡移动，可被子弹击碎
2. **荆棘** (THORN) - 减速+周期伤害，可通过
3. **水晶刺** (CRYSTAL_SPIKE) - 固体，反射子弹，不可破坏
4. **岩浆池** (LAVA_POOL) - 持续伤害区域
5. **虚空裂隙** (VOID_RIFT) - 拉扯附近虫虫+周期伤害

### 3.7 相机系统 (camera.js)
**职责**：平滑跟随玩家，逐屏区域锁定

**特性**：
- 逐屏锁定：镜头锁定在当前区域中心
- 平滑过渡：跨区域时1.2秒cubic缓动
- 首帧snap：开局直接定位到虫虫位置

### 3.8 音效系统 (music.js)
**职责**：管理游戏音效和音乐

**音效类型**：
- 进食音效（不同颜色不同音高）
- 射击音效
- 受伤音效
- Boss战音乐
- 背景音乐

## 4. 配置系统 (config.js)

### 4.1 核心配置
```javascript
CONFIG = {
    VERSION: '1.83',
    CANVAS_WIDTH: 800, CANVAS_HEIGHT: 600,   // 视口大小
    MAP_WIDTH: 4000, MAP_HEIGHT: 3000,        // 世界地图大小
    SEGMENT_RADIUS: 8, SEGMENT_SPACING: 14,  // 虫虫身体参数
    BASE_SPEED: 5, MIN_SPEED: 2,             // 速度参数
    WORM_INITIAL_LENGTH: 3,                   // 初始长度
    MAX_WORMS: 12,                            // 最大虫虫数
    TARGET_FPS: 60,                           // 目标帧率
}
```

### 4.2 宝珠类型
```javascript
FOOD_TYPES: [
    { color: '#4ecca3', score: 10, radius: 8, gravity: 0.01, weight: 60 },  // 绿色
    { color: '#ffe66d', score: 30, radius: 8, gravity: 0.02, weight: 25 },  // 黄色
    { color: '#ff8c42', score: 60, radius: 8, gravity: 0.03, weight: 10 },  // 橙色
    { color: '#4dabf7', score: 120, radius: 8, gravity: 0.04, weight: 4 },  // 蓝色
    { color: '#c77dff', score: 300, radius: 8, gravity: 0.05, weight: 1 }   // 紫色
]
```

### 4.3 亲子系统配置
```javascript
FAMILY: {
    JUVENILE_MAX_LENGTH: 11,           // 幼体最大长度
    ADULT_HITS_TO_LOSE: 3,            // 成年体受击次数
    JUVENILE_HITS_TO_LOSE: 1,         // 幼体受击次数
    ENEMY_SPAWN_INTERVAL: 30,         // 敌人生成间隔
    ENEMY_MAX_COUNT: 3,               // 最大敌人数
    ENEMY_CHASE_RADIUS: 200,          // 追击半径
    ENEMY_CIRCLE_RADIUS: 60,          // 绕圈半径
    ENEMY_CIRCLES_BEFORE_ATTACK: 2,   // 攻击前绕圈数
}
```

## 5. 游戏流程

### 5.1 游戏状态机
```javascript
GAME_STATE = {
    IDLE: 'idle',           // 空闲（开始界面）
    PLAYING: 'playing',     // 游戏中
    PAUSED: 'paused',       // 暂停
    GAME_OVER: 'gameOver'   // 游戏结束
}
```

### 5.2 游戏循环
```javascript
gameLoop(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    
    if (this.state === GAME_STATE.PLAYING) {
        this.update(dt);      // 逻辑更新
        this.render();        // 渲染画面
    }
    
    requestAnimationFrame(this.gameLoop.bind(this));
}
```

### 5.3 碰撞检测
使用空间分区优化（SpatialGrid）：
- 虫虫与宝珠碰撞
- 虫虫与敌人碰撞
- 子弹与敌人碰撞
- 虫虫与障碍物碰撞
- 虫虫之间碰撞（咬尾/咬颈）

## 6. 渲染系统

### 6.1 渲染层次
1. 背景层（动态背景）
2. 障碍物层
3. 宝珠层
4. 虫虫层（玩家、AI、幼体）
5. 敌人层
6. Boss层
7. 粒子层
8. UI层（小地图、血条、提示）

### 6.2 视觉效果
- 粒子系统：进食、死亡、升级特效
- 光效：glow、发光、脉冲
- 动画：生长、死亡、击退
- 主题：每个区域独特配色和元素

## 7. 输入系统

### 7.1 PC端
- 鼠标移动：控制虫虫方向
- 鼠标左键：按住连续射击
- ESC：暂停游戏
- Ctrl+Z：区域调试视图
- Ctrl+L：调试日志
- Shift+D：调试面板

### 7.2 移动端
- 虚拟摇杆：控制方向
- 射击按钮：发射子弹
- 弹药显示：显示当前弹药数
- 全屏按钮：进入全屏模式

## 8. 存储系统

### 8.1 本地存储 (localStorage)
- 区域解锁状态
- 区域通关状态
- 累计分数
- 最大长度
- 游戏设置

### 8.2 云存储 (CloudBase)
- 全球排行榜
- 玩家昵称
- 最高分数
- 最大长度

## 9. 性能优化

### 9.1 空间分区
使用SpatialGrid进行碰撞检测优化，将O(n²)降低到O(n)

### 9.2 对象池
复用Particle、FloatingText等频繁创建的对象

### 9.3 渲染优化
- 按混合模式分批渲染
- 减少shadowBlur使用
- 使用径向渐变替代阴影

### 9.4 帧率控制
- 目标60FPS
- 帧率无关的逻辑更新
- 动态调整粒子数量

## 10. 当前状态和待实现功能

### 10.1 已完成功能 (v1.83)
- ✅ 核心玩法（吃宝珠、生长、射击）
- ✅ 亲子系统（幼体、性格、成长）
- ✅ 区域系统（25个区域、Z字形路径）
- ✅ Boss系统（5种Boss）
- ✅ 障碍物系统（5种障碍物）
- ✅ 相机系统（逐屏锁定）
- ✅ 音效系统
- ✅ 排行榜
- ✅ 移动端适配
- ✅ 调试工具

### 10.2 待优化/扩展
- 🔄 更多Boss类型
- 🔄 更多障碍物类型
- 🔄 成就系统
- 🔄 多人联机
- 🔄 自定义皮肤
- 🔄 关卡编辑器完善
- 🔄 音效增强
- 🔄 性能进一步优化

## 11. 开发指南

### 11.1 环境搭建
```bash
# 克隆项目
git clone <repository-url>

# 启动本地服务器
python -m http.server 8888

# 访问游戏
http://localhost:8888/index.html
```

### 11.2 代码规范
- ES6+模块化
- 类名大驼峰
- 方法名小驼峰
- 常量全大写下划线
- 注释使用JSDoc格式

### 11.3 调试方法
- Ctrl+Z：区域调试视图
- Ctrl+L：调试日志面板
- Shift+D：调试面板
- 浏览器开发者工具

## 12. 部署说明

### 12.1 静态部署
项目为纯前端，可直接部署到任何静态服务器：
```bash
# 构建（无需构建步骤）
# 直接上传所有文件到服务器

# 或使用CDN
# 将src/目录上传到CDN
```

### 12.2 云服务配置
如需排行榜功能，需配置CloudBase：
1. 创建CloudBase环境
2. 配置数据库集合
3. 更新cloudbase.js中的环境ID

## 13. 扩展开发

### 13.1 添加新Boss
1. 在config.js中添加Boss配置
2. 在boss.js中实现Boss类
3. 在zone-manager.js中关联区域
4. 添加Boss音效和特效

### 13.2 添加新障碍物
1. 在config.js中添加障碍物配置
2. 在obstacle.js中实现障碍物类
3. 在game.js中添加碰撞检测
4. 添加视觉效果

### 13.3 添加新主题
1. 在theme-configs.js中添加主题配置
2. 在dynamic-bg.js中实现背景效果
3. 在zone-manager.js中关联区域

## 14. 常见问题

### 14.1 性能问题
- 减少粒子数量
- 降低阴影效果
- 优化碰撞检测

### 14.2 兼容性问题
- 使用现代浏览器
- 移动端使用触摸事件
- 音效需要用户交互后播放

### 14.3 调试技巧
- 使用调试面板查看状态
- 使用调试日志追踪事件
- 使用区域视图检查布局

## 15. 版本历史

详见 `changelog.js`，当前版本 v1.83，包含以下主要更新：
- 逐屏区域锁定镜头
- Phase 2 功能补全
- 幼体性格与互动系统
- 小地图 + 胜利画面
- 主题背景系统
- 障碍物系统
- Boss系统
- 区域化实体生成
- Barrier门系统
- ZoneManager区域管理系统

---

**文档版本**：v1.0  
**最后更新**：2026-05-03  
**适用版本**：SnakeWorm v1.83