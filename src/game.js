/**
 * Game - 游戏主控制器
 * 管理游戏循环、输入、碰撞检测、UI、敌人系统、死亡系统
 */
import { CONFIG, GAME_STATE } from './config.js';
import { canvas, ctx } from './canvas.js';
import { Vector } from './vector.js';
import { hexToRgba, drawGlow, drawTextGlow } from './utils.js';
import { SpatialGrid } from './spatial-grid.js';
import { MusicSystem } from './music.js';
import { Particle, Bullet, FloatingText, Food } from './entities.js';
import { Worm } from './worm.js';
import { Enemy } from './enemy.js';
import { BrokenTail } from './broken-tail.js';
import { DeadBody } from './dead-body.js';
import { Leaderboard } from './leaderboard.js';
import { DynamicBG } from './dynamic-bg.js';
import { DebugLogger } from './debug-log.js';
import { Camera } from './camera.js';
import { FamilyGate } from './family-gate.js';
import { ZoneManager } from './zone-manager.js';
import { Barrier, generateBarriers } from './barrier.js';
import { createBoss, BOSS_STATE } from './boss.js';
import { Obstacle, OBSTACLE_TYPE, generateObstacles } from './obstacle.js';
import { getThemeConfig } from './theme-configs.js';
import { MiniMap } from './minimap.js';
import { DiggableWall, generateDiggableWalls } from './diggable-wall.js';
import { ZoneDecorations } from './zone-decorations.js';

export class Game {
    constructor() {
        this.worms = [];
        this.brokenTails = [];
        this.deadBodies = [];  // 尸体下沉动画
        this.foods = [];
        this.particles = [];  // 粒子效果
        this.floatingTexts = [];  // 浮动文字
        this.bullets = [];  // 子弹
        this.slowedFoods = new Map();  // 减速的宝珠 {food: slowTimer}
        this.initialGreenSpawned = 0;  // 初始绿宝珠已生成数量
        this.showCrosshairHint = false;  // 是否显示瞄准镜提示
        this.crosshairHintTimer = 0;  // 瞄准镜提示计时器
        this.slowedWorms = new Map();  // 减速的虫虫 {worm: slowTimer}
        this.musicSystem = new MusicSystem();  // 音效系统
        this.mousePos = new Vector(400, 2800);  // 左下方偏高
        this.isMouseDown = false;  // 鼠标按下状态（连续射击）
        this.fireCooldown = 0;  // 射击冷却计时器
        this.score = 0;
        this.state = GAME_STATE.IDLE;
        this.spectating = false;  // 观战模式（死亡后继续播放）
        this.postDeathOverlay = null;  // 死亡后观战界面按钮 overlay
        this.lastTime = 0;
        this.splitCount = 0;
        this.splitCooldown = 0;
        this.foodRespawnTimers = {};  // 宝珠刷新计时器
        this.yellowCooldown = 0;  // 黄色宝珠冷却计时器
        this.gameTime = 0;  // 游戏时间（秒）
        this.frameCount = 0;  // 帧计数器
        this.rhythmNotified = {};  // 节奏解锁通知追踪
        this.joystickDirection = new Vector(0, 0);  // 摇杆方向
        this.playerDeadWaitingForBodies = false;  // 玩家死亡等待尸体处理
        
        // 亲子关系系统
        this.enemies = [];  // 敌人列表
        this.familyGates = [];  // 家族门列表
        this.enemySpawnTimer = 0;  // 敌人生成计时器

        // === Phase 3a: Boss系统 ===
        this.bosses = [];  // 当前Boss列表
        this.bossSpawned = new Set();  // 已召唤Boss的区域ID（防止重复召唤）

        // === Phase 3b: 障碍物系统 ===
        this.obstacles = [];  // 当前区域障碍物列表
        this.obstaclesGenerated = new Set();  // 已生成障碍物的区域ID

        // === Phase A: ZoneManager 关卡区域系统 ===
        this.zoneManager = new ZoneManager();
        this.zoneManager.loadProgress();
        this.showZoneDebug = false;  // Ctrl+Z 切换区域调试视图
        // Phase 3c: 背景主题在 bg 创建后设置（见下方 _initZoneTheme 调用）
        
        // === Phase B: Barrier 门系统 ===
        this.barriers = generateBarriers(this.zoneManager);

        // === Phase 3c: 可挖掘墙壁系统 ===
        this.diggableWalls = generateDiggableWalls(this.zoneManager);

        // === 海底生态边界墙系统 ===
        this.zoneDecorations = new ZoneDecorations(this.zoneManager);

        this.playerDeathLength = 0;  // 玩家死亡时的长度（用于显示）
        this.maxLengthReached = 0;  // 玩家达到过的最大长度（用于排行榜）
        this.waitingForPlayer = false;  // 等待玩家鼠标移入白圈
        this.mouseInCanvas = false;  // 鼠标是否在Canvas内
        this.familyNoticeShown = false;  // 亲子提示是否已显示

        // 屏幕震动系统
        this.screenShake = { intensity: 0, duration: 0, timer: 0 };

        // 波纹特效列表
        this.ripples = [];

        // 相机系统
        this.camera = new Camera();

        // 小地图系统
        this.miniMap = new MiniMap(this.zoneManager);

        // 胜利画面状态
        this.victory = false;

        // 空间网格分区（使用地图尺寸）
        this.spatialGrid = new SpatialGrid(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT, 40);
        // 网格瓦片预渲染（只渲染一个 40×40 瓦片，绘制时平铺）
        this.gridTileSize = 40;
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = this.gridTileSize;
        this.gridCanvas.height = this.gridTileSize;
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.preRenderGrid();

        // 动态程序化背景（视口大小，覆盖屏幕即可）
        this.bg = new DynamicBG(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        // Phase 3c: 根据已存档区域设置初始背景主题
        this._currentTheme = 'default';
        {
            const savedZone = this.zoneManager.zones[this.zoneManager.currentZoneId - 1];
            if (savedZone) {
                const savedCfg = getThemeConfig(savedZone.theme);
                if (savedCfg) {
                    this.bg.applyConfig(savedCfg);
                    this._currentTheme = savedZone.theme;
                }
            }
        }
        // 仅在使用默认主题时加载 JSON 配置（JSON 是深度海洋场景）
        fetch('src/dynamic-bg-config.json')
            .then(r => r.json())
            .then(cfg => { if (this._currentTheme === 'default') this.bg.applyConfig(cfg); })
            .catch(() => {});
        // FPS相关
        this.showFPS = CONFIG.SHOW_FPS;
        this.targetFPS = CONFIG.TARGET_FPS;
        this.fpsAccumulator = 0;
        this.fpsDisplay = 0;
        
        // DOM 引用缓存（避免每帧 getElementById）
        this.ui = {
            timer: document.getElementById('timerDisplay'),
            length: document.getElementById('lengthDisplay'),
            score: document.getElementById('scoreDisplay'),
            speed: document.getElementById('speedDisplay'),
            bullet: document.getElementById('bulletDisplay'),
            splitCount: document.getElementById('splitCount'),
            wormCount: document.getElementById('wormCount'),
            ammoCount: document.getElementById('ammoCount'),
            rhythmHint: document.getElementById('rhythmHint'),
            pauseScreen: document.getElementById('pauseScreen'),
            gameOver: document.getElementById('gameOver'),
            startScreen: document.getElementById('startScreen'),
            startBtn: document.getElementById('startBtn'),
            audioLoading: document.getElementById('audioLoading'),
            gameContainer: document.getElementById('gameContainer'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            mouseIndicator: document.getElementById('mouseIndicator'),
        };
        this.fpsUpdateTimer = 0;
        // 初始化每种宝珠的计时器
        CONFIG.FOOD_TYPES.forEach(type => {
            this.foodRespawnTimers[type.score] = 0;
        });

        // 调试日志系统
        this.debugLogger = new DebugLogger();

        this.setupInput();

        // 初始化时调整 Canvas 尺寸
        this.resizeCanvas();
        
        // 窗口大小改变时重新调整 Canvas（防抖）
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
                this.checkOrientation();
            }, 100);
        });
        
        // 检测浏览器缩放（Ctrl+滚轮 / Ctrl+加减键）
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => this.resizeCanvas(), 150);
            }
        }, { passive: true });
        
        // 定期检测 devicePixelRatio 变化（覆盖 Ctrl+加减键、菜单缩放等）
        let lastDevicePixelRatio = window.devicePixelRatio;
        setInterval(() => {
            if (window.devicePixelRatio !== lastDevicePixelRatio) {
                lastDevicePixelRatio = window.devicePixelRatio;
                this.resizeCanvas();
            }
        }, 500);
        
        // 初始检查横屏
        this.checkOrientation();
    }
    
    /**
     * 检查横屏状态（不显示遮罩，横屏竖屏都能玩）
     */
    checkOrientation() {
        // 横屏竖屏都能正常玩，不显示遮罩提示
    }
    
    /**
     * 初始化虚拟摇杆
     */
    initJoystick() {
        // 只在实际触摸事件后调用（已由touchstart事件保证）
        
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick || !knob) return;
        
        joystick.style.display = 'block';  // 显示摇杆
        
        const joystickRect = joystick.getBoundingClientRect();
        const joystickCenterX = joystickRect.left + joystickRect.width / 2;
        const joystickCenterY = joystickRect.top + joystickRect.height / 2;
        const maxRadius = joystickRect.width / 2 - 25;  // 摇杆最大半径
        
        let isDragging = false;
        
        // 触摸开始
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isDragging = true;
            this.handleJoystickMove(e.touches[0], joystickCenterX, joystickCenterY, maxRadius, knob);
        }, { passive: false });
        
        // 触摸移动
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isDragging) {
                this.handleJoystickMove(e.touches[0], joystickCenterX, joystickCenterY, maxRadius, knob);
            }
        }, { passive: false });
        
        // 触摸结束
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            isDragging = false;
            // 摇杆归位
            knob.style.transform = 'translate(-50%, -50%)';
            this.joystickDirection = new Vector(0, 0);
        }, { passive: false });
    }
    
    /**
     * 处理摇杆移动
     */
    handleJoystickMove(touch, centerX, centerY, maxRadius, knob) {
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        // 计算触摸点相对于摇杆中心的偏移
        let dx = touchX - centerX;
        let dy = touchY - centerY;
        
        // 计算距离
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 如果超出最大半径，限制在半径内
        if (distance > maxRadius) {
            dx = (dx / distance) * maxRadius;
            dy = (dy / distance) * maxRadius;
        }
        
        // 移动摇杆 knob
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        // 计算方向向量（归一化）
        const direction = new Vector(dx, dy);
        const normalizedDir = direction.normalize();
        
        // 将摇杆方向转换为游戏坐标
        // 摇杆：上=-y, 下=+y, 左=-x, 右=+x
        // 游戏：上=-y, 下=+y, 左=-x, 右=+x
        this.joystickDirection = normalizedDir;
        
        // 更新鼠标位置（在摇杆方向上）
        const head = this.worms[0] ? this.worms[0].head : new Vector(400, 2800);
        const targetX = head.x + normalizedDir.x * 100;
        const targetY = head.y + normalizedDir.y * 100;
        this.mousePos = new Vector(targetX, targetY);
        this.mouseInCanvas = true;
    }

    setupInput() {
        this.mouseInCanvas = false;
        this.isTouchDevice = false;  // 标记是否为触摸设备
        this.mobileUIInitialized = false;  // 移动端UI是否已初始化
        
        // 不再使用能力检测（navigator.maxTouchPoints在Windows PC上经常误报）
        // 改为实际触摸事件触发后才启用移动端UI
        
        // 鼠标事件（桌面端）
        canvas.addEventListener('mousemove', (e) => {
            if (this.isTouchDevice) return;  // 触摸设备不处理鼠标事件
            // 出场动画期间忽略鼠标位置更新
            if (this.state === GAME_STATE.PLAYING && this.worms[0] && this.worms[0].isEntering) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
            const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
            const screenX = (e.clientX - rect.left) * scaleX;
            const screenY = (e.clientY - rect.top) * scaleY;
            
            // 检查鼠标是否真的在 Canvas 区域内
            if (screenX >= 0 && screenX <= CONFIG.CANVAS_WIDTH && screenY >= 0 && screenY <= CONFIG.CANVAS_HEIGHT) {
                // 屏幕坐标转世界坐标
                const world = this.camera.screenToWorld(screenX, screenY);
                const x = world.x;
                const y = world.y;
                this.mousePos = new Vector(x, y);
                this.mouseInCanvas = true;
                
                // 桌面端：鼠标移入游戏区域时隐藏全屏按钮
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) fullscreenBtn.style.display = 'none';
                
                // 等待玩家控制阶段：检测鼠标是否移入白圈
                if (this.waitingForPlayer) {
                    const centerX = 400;
                    const centerY = 2800;
                    const cursorRadius = 18;  // 白圈半径
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 鼠标进入白圈范围（白圈直径24px，半径12px内）
                    if (distance <= cursorRadius + 5) {
                        this.waitingForPlayer = false;
                        // 开始控制虫虫
                        const player = this.worms[0];
                        // 出场动画在waitingForPlayer期间已经完成，直接结束入场状态
                        player.isEntering = false;
                        // 更新鼠标位置
                        this.mousePos = new Vector(x, y);
                    }
                }
            } else {
                this.mouseInCanvas = false;
                
                // 桌面端：鼠标移出游戏区域时显示全屏按钮
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) fullscreenBtn.style.display = 'flex';
            }
        });
        
    // 射击按钮点击事件（桌面端）- 按住连续射击（仅左键）
        canvas.addEventListener('mousedown', (e) => {
            if (this.isTouchDevice) return;  // 触摸设备用按钮
            if (e.button !== 0) return;  // 只响应左键（0=左键，1=中键，2=右键）
            if (this.state !== GAME_STATE.PLAYING) return;
            this.isMouseDown = true;
            this.fireBullet();
            this.fireCooldown = CONFIG.FIRE.FIRST_DELAY;
        });
        canvas.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
        });
        canvas.addEventListener('mouseleave', (e) => {
            this.isMouseDown = false;
        });
        
        // 触摸事件（移动端）- 在 Canvas 上触摸也控制方向
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isTouchDevice = true;
            
            // 首次触摸时动态初始化移动端UI
            if (!this.mobileUIInitialized) {
                this.mobileUIInitialized = true;
                const joystick = document.getElementById('joystick');
                const fireBtn = document.getElementById('fireBtn');
                const ammoDisplay = document.getElementById('ammoDisplay');
                const mouseIndicator = document.getElementById('mouseIndicator');
                if (joystick) joystick.style.display = 'block';
                if (fireBtn) fireBtn.style.display = 'flex';
                if (ammoDisplay) ammoDisplay.style.display = 'block';
                if (mouseIndicator) mouseIndicator.style.display = 'block';
                
                // 射击按钮事件（按住连续射击）
                if (fireBtn) {
                    fireBtn.addEventListener('touchstart', (e2) => {
                        e2.preventDefault();
                        e2.stopPropagation();
                        this.isMouseDown = true;
                        this.fireBullet();
                        this.fireCooldown = CONFIG.FIRE.FIRST_DELAY;
                    }, { passive: false });
                    fireBtn.addEventListener('touchend', (e2) => {
                        e2.preventDefault();
                        this.isMouseDown = false;
                    });
                    fireBtn.addEventListener('mousedown', (e2) => {
                        e2.preventDefault();
                        e2.stopPropagation();
                        this.isMouseDown = true;
                        this.fireBullet();
                        this.fireCooldown = CONFIG.FIRE.FIRST_DELAY;
                    });
                    fireBtn.addEventListener('mouseup', (e2) => {
                        this.isMouseDown = false;
                    });
                }
                
                // 初始化摇杆
                this.initJoystick();
                
                // 显示全屏按钮
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (fullscreenBtn) fullscreenBtn.style.display = 'flex';
            }
            
            // 如果摇杆存在，使用摇杆；否则使用触摸点
            if (this.joystickDirection.mag() > 0) {
                // 摇杆正在使用，忽略 Canvas 触摸
                return;
            }
            this.handleTouch(e);
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            // 如果摇杆正在使用，忽略 Canvas 触摸
            if (this.joystickDirection.mag() > 0) {
                return;
            }
            this.handleTouch(e);
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            // 如果摇杆正在使用，不关闭 mouseInCanvas
            if (this.joystickDirection.mag() <= 0) {
                this.mouseInCanvas = false;
            }
        }, { passive: false });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            // Phase 4a: 胜利画面按键处理
            if (this.victory) {
                if (e.key === 'r' || e.key === 'R') {
                    this._victoryParticles = null;
                    this.restart();
                    this.waitingForPlayer = true;
                } else if (e.key === 'Escape') {
                    this._victoryParticles = null;
                    this.victory = false;
                    this.backToStartScreen();
                }
                return;
            }
            if (e.key === 'Escape') {
                if (this.state === GAME_STATE.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GAME_STATE.PAUSED) {
                    this.resumeGame();
                }
            }
            // F键切换FPS显示
            if (e.key === 'f' || e.key === 'F') {
                this.showFPS = !this.showFPS;
            }
            // Ctrl+Z 切换区域调试视图
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                this.showZoneDebug = !this.showZoneDebug;
            }
        });
    }
    
    /**
     * 处理触摸事件
     */
    handleTouch(e) {
        // 出场动画期间忽略触摸位置更新
        if (this.state === GAME_STATE.PLAYING && this.worms[0] && this.worms[0].isEntering) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
        const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
        const screenX = (touch.clientX - rect.left) * scaleX;
        const screenY = (touch.clientY - rect.top) * scaleY;
        
        // 检查触摸是否在 Canvas 区域内
        if (screenX >= 0 && screenX <= CONFIG.CANVAS_WIDTH && screenY >= 0 && screenY <= CONFIG.CANVAS_HEIGHT) {
            const world = this.camera.screenToWorld(screenX, screenY);
            this.mousePos = new Vector(world.x, world.y);
            this.mouseInCanvas = true;
        } else {
            this.mouseInCanvas = false;
        }
    }

    startGame() {
        // 显示音频加载提示
        const startBtn = document.getElementById('startBtn');
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        const audioLoading = document.getElementById('audioLoading');
        if (startBtn) startBtn.style.display = 'none';
        if (leaderboardBtn) leaderboardBtn.style.display = 'none';
        if (audioLoading) audioLoading.style.display = 'block';
        
        // 预初始化音频系统（避免首次播放音符时的延迟）
        const initAudio = () => {
            this.musicSystem.init();
            // 确保AudioContext已恢复
            if (this.musicSystem.audioContext && this.musicSystem.audioContext.state === 'suspended') {
                this.musicSystem.audioContext.resume();
            }
            // 隐藏加载提示
            const startScreen = document.getElementById('startScreen');
            if (startScreen) startScreen.style.display = 'none';
            this.resizeCanvas();
            this.restart();
            
            // 设置初始状态：白圈在画面中央，等待玩家鼠标移入
            this.mousePos = new Vector(400, 2800);
            this.mouseInCanvas = true;
            this.waitingForPlayer = true;  // 等待玩家鼠标移入白圈
            
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        };
        
        // 使用requestAnimationFrame确保UI更新后再初始化音频
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initAudio();
            });
        });
    }
    
    /**
     * 响应式调整 Canvas 大小
     */
    resizeCanvas() {
        // 获取游戏容器的实际可用空间
        const gameContainer = document.getElementById('gameContainer');
        const containerRect = gameContainer ? gameContainer.getBoundingClientRect() : null;
        
        // 优先使用游戏容器的尺寸（更精确）
        const availWidth = containerRect ? containerRect.width : document.documentElement.clientWidth;
        const availHeight = containerRect ? containerRect.height : document.documentElement.clientHeight;
        
        // 计算等比缩放比例（留出一点边距）
        let scale = Math.min(
            (availWidth - 20) / CONFIG.CANVAS_WIDTH, 
            (availHeight - 20) / CONFIG.CANVAS_HEIGHT
        );
        // 限制最小缩放比例，防止 canvas 太小
        scale = Math.max(scale, 0.35);
        
        canvas.style.width = (CONFIG.CANVAS_WIDTH * scale) + 'px';
        canvas.style.height = (CONFIG.CANVAS_HEIGHT * scale) + 'px';
    }
    
    /**
     * 请求全屏模式
     */
    requestFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {  // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {  // IE11
            elem.msRequestFullscreen();
        }
    }

    pauseGame() {
        this.state = GAME_STATE.PAUSED;
        // 复用开始界面，按钮改为"继续游戏"
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'block';
        const startBtn = document.getElementById('startBtn');
        if (startBtn) { startBtn.style.display = ''; startBtn.textContent = '继续游戏'; }
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        if (leaderboardBtn) leaderboardBtn.style.display = '';
    }

    resumeGame() {
        this.state = GAME_STATE.PLAYING;
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'none';
        this.lastTime = 0;
    }

    /**
     * 返回开始菜单（关闭游戏循环，显示开始界面）
     */
    backToStartScreen() {
        this._hidePostDeathOverlay();
        this.state = GAME_STATE.IDLE;
        // 清理游戏对象
        for (const p of this.particles) { Particle.release(p); }
        this.worms = [];
        this.brokenTails = [];
        this.deadBodies = [];
        this.foods = [];
        this.enemies = [];
        this.particles = [];
        this.floatingTexts.forEach(ft => FloatingText.release(ft));
        this.floatingTexts = [];
        this.bullets = [];
        this.slowedFoods = new Map();
        this.slowedWorms = new Map();
        this.score = 0;
        this.splitCount = 0;
        // 生成 demo 元素（背景中游动的虫虫和宝珠）
        this._spawnDemoElements();
        // 显示开始界面
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'block';
        const startBtn = document.getElementById('startBtn');
        if (startBtn) { startBtn.style.display = ''; startBtn.textContent = '开始游戏'; }
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        if (leaderboardBtn) leaderboardBtn.style.display = '';
        const audioLoading = document.getElementById('audioLoading');
        if (audioLoading) audioLoading.style.display = 'none';
    }

    /**
     * 生成 demo 模式元素：几条 AI 虫虫和宝珠在背景中游动
     */
    _spawnDemoElements() {
        const colors = ['#4ecca3', '#4ecdc4', '#ffe66d', '#ff8b94', '#a8e6cf', '#c7ceea'];
        // 生成 3-4 条 AI 虫虫（在视口中央区域）
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            // Demo 模式：在左下方偏高区域生成
            const cx = 400, cy = 2800;
            const x = cx - 300 + Math.random() * 600;
            const y = cy - 200 + Math.random() * 400;
            const color = colors[i % colors.length];
            const worm = new Worm(x, y, 5 + Math.floor(Math.random() * 6), color, false);
            worm.aiWanderDir = Vector.randomDir();
            worm.aiWanderTimer = 2 + Math.random() * 3;
            this.worms.push(worm);
        }
        // 生成一些宝珠
        for (const type of CONFIG.FOOD_TYPES) {
            const n = Math.min(type.maxCount, 2);
            for (let i = 0; i < n; i++) {
                this.foods.push(Food.random(type));
            }
        }
    }

    /**
     * demo 模式更新：只更新 AI 虫虫和宝珠，不处理碰撞/分数等
     */
    _updateDemo(dt) {
        // 更新虫虫
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.segments.length === 0) continue;
            worm.update(null, dt, this.foods, this.worms);
            // 碰墙反弹
            if (worm.checkWallCollision()) {
                worm.aiWanderDir = Vector.randomDir();
                const margin = CONFIG.BORDER_MARGIN + CONFIG.SEGMENT_RADIUS;
                worm.segments[0].x = Math.max(margin, Math.min(CONFIG.MAP_WIDTH - margin, worm.segments[0].x));
                worm.segments[0].y = Math.max(margin, Math.min(CONFIG.MAP_HEIGHT - margin, worm.segments[0].y));
            }
        }
        // 更新宝珠
        for (const food of this.foods) food.update(dt);
        // 补充宝珠（保持数量）
        for (const type of CONFIG.FOOD_TYPES) {
            const existing = this.foods.filter(f => f.type === type).length;
            if (existing < type.maxCount && Math.random() < 0.01) {
                this.foods.push(Food.random(type));
            }
        }
    }

    restart() {
        this._hidePostDeathOverlay();
        // 回收粒子到对象池
        for (const p of this.particles) { Particle.release(p); }

        this.worms = [];
        this.brokenTails = [];
        this.deadBodies = [];
        this.foods = [];
        this.enemies = [];           // 清理敌人
        this.bosses = [];            // 清理Boss
        this.bossSpawned.clear();    // 清理Boss召唤记录
        this.obstacles = [];         // 清理障碍物
        this.obstaclesGenerated.clear();  // 清理障碍物生成记录
        this.particles = [];         // 清理粒子
        this.floatingTexts.forEach(ft => FloatingText.release(ft));
        this.floatingTexts = [];     // 清理浮动文字
        this.bullets = [];           // 清理子弹
        this.slowedFoods = new Map();   // 清理减速宝珠
        this.slowedWorms = new Map();   // 清理减速虫虫
        this.enemySpawnTimer = 0;    // 重置敌人生成计时器
        this.score = 0;
        this.splitCount = 0;
        this.splitCooldown = 0;
        this.yellowCooldown = 0;
        this.gameTime = 0;
        this.familyNoticeShown = false;
        this.frameCount = 0;
        this.rhythmNotified = {};  // 重置节奏通知
        this.showCrosshairHint = false;  // 重置瞄准镜提示
        this.crosshairHintTimer = 0;
        this.state = GAME_STATE.PLAYING;
        this.waitingForPlayer = true;  // 等待玩家鼠标移入白圈
        this.playerDeadWaitingForBodies = false;  // 重置玩家死亡等待标志
        this.playerDeathLength = 0;  // 重置玩家死亡长度
        this.maxLengthReached = 0;  // 重置历史最大长度
        this.isMouseDown = false;  // 重置鼠标按下状态
        this.fireCooldown = 0;  // 重置射击冷却
        this.screenShake = { intensity: 0, duration: 0, timer: 0 };  // 重置屏幕震动
        this.ripples = [];  // 重置波纹

        // Phase 3c: 重置背景主题到初始（Zone 1 = forest）
        this._currentTheme = 'default';
        const initThemeCfg = getThemeConfig('forest');
        if (initThemeCfg) this.bg.applyConfig(initThemeCfg);
        this._currentTheme = 'forest';

        // Phase 4a: 重置胜利状态
        this.victory = false;
        this.victoryStats = null;

        // 玩家虫虫从框外左边开始（完全不可见）
        const spawnX = 400;   // 左下方偏高
        const spawnY = 2800;
        const player = new Worm(
            spawnX,    // 目标位置（左下方偏高）
            spawnY,
            CONFIG.WORM_INITIAL_LENGTH,
            '#4ecca3',
            true
        );
        // 设置出场动画参数
        player.enterStartPos = new Vector(-50, spawnY);  // 从框外左边开始
        player.enterMidPos = new Vector(spawnX, spawnY);  // 左下方偏高
        // 初始化虫虫身体位置到框外（这样一开始就不可见）
        for (let i = 0; i < player.segments.length; i++) {
            player.segments[i] = new Vector(-50 - i * 14, spawnY);
        }
        // 给玩家添加无敌时间，出场动画期间不会被吞噬
        player.invincibleTimer = 3.5;  // 3.5 秒无敌（2 秒动画 + 1.5 秒游向鼠标）
        this.worms.push(player);

        // 初始化宝珠：开局只生成1个绿色宝珠，其他由节奏系统逐步生成
        const greenType = CONFIG.FOOD_TYPES.find(t => t.score === 10);
        const spawnZone = this.zoneManager ? this.zoneManager.zones[0] : null;
        this.foods.push(spawnZone ? Food.inZone(spawnZone, greenType) : Food.random(greenType));
        this.initialGreenSpawned = 1;  // 记录已生成的初始绿宝珠数量
        this.foodRespawnTimers = {};
        CONFIG.FOOD_TYPES.forEach(type => {
            this.foodRespawnTimers[type.score] = 0;
        });

        // Phase 3: 初始化家族门（放置在地图中部偏上位置）
        this.familyGates = [
            new FamilyGate(2000, 1500, 2, '家族门·初试'),
            new FamilyGate(3200, 600, 3, '家族门·进阶'),
        ];

        // Phase E: 重新生成 Barrier（反映已解锁区域），清理实体缓存
        this.barriers = generateBarriers(this.zoneManager);
        this.diggableWalls = generateDiggableWalls(this.zoneManager);
        this.zoneManager.zoneEntityCache.clear();

        // 重置镜头到初始区域（区域1）
        this.camera = new Camera();
        if (this.zoneManager.zones.length > 0) {
            this.camera.setInitialZone(this.zoneManager.zones[0]);
        }

        document.getElementById('gameOver').style.display = 'none';
        this.updateUI();
    }

    updateUI() {
        const player = this.worms[0];
        // 计时器：格式化为 MM:SS
        const totalSeconds = Math.floor(this.gameTime);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        this.ui.timer.textContent = 
            String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        this.ui.length.textContent = player.length;
        this.ui.score.textContent = this.score;
        this.ui.speed.textContent = player.speed.toFixed(1);
        this.ui.bullet.textContent = player.bulletCount || 0;
        this.ui.splitCount.textContent = this.splitCount;
        const aliveWorms = this.worms.filter(w => w.isAlive);
        const adultCount = aliveWorms.filter(w => w.isAdult).length;
        this.ui.wormCount.textContent = adultCount > 0 ? `${aliveWorms.length}(${adultCount}👑)` : aliveWorms.length;
        
        // 移动端弹仓显示
        if (this.ui.ammoCount && this.isTouchDevice) {
            this.ui.ammoCount.textContent = player.bulletCount || 0;
        }
        
        // 游戏节奏提示
        if (this.ui.rhythmHint) {
            const hints = [];
            // 绿色始终可用
            hints.push('🟢');
            // 黄色：25秒后或10节后解锁
            const isYellowUnlocked = this.gameTime >= CONFIG.RHYTHM.YELLOW_UNLOCK_TIME
                || player.length >= CONFIG.RHYTHM.YELLOW_UNLOCK_LENGTH;
            if (isYellowUnlocked) {
                if (this.yellowCooldown > 0) {
                    hints.push('🟡⏳' + this.yellowCooldown.toFixed(1) + 's');
                } else {
                    hints.push('🟡');
                }
            }
            // 橙色：90秒后
            if (this.gameTime >= CONFIG.RHYTHM.ORANGE_UNLOCK_TIME) {
                hints.push('🟠');
            }
            // 蓝色：30秒后 + 身体15节后
            if (this.gameTime >= CONFIG.RHYTHM.RED_UNLOCK_TIME && player.length >= CONFIG.RHYTHM.RED_UNLOCK_LENGTH) {
                hints.push('🔵');
            }
            this.ui.rhythmHint.textContent = hints.join(' ');
        }
    }

    loop(timestamp) {
        try {
            const deltaTime = this.lastTime ? (timestamp - this.lastTime) / 1000 : 1 / 60;
            this.lastTime = timestamp;

            // FPS锁定：累积时间，按目标帧率更新
            this.fpsAccumulator += deltaTime;
            const targetInterval = 1 / this.targetFPS;

            // FPS显示更新（每秒更新一次）
            this.fpsUpdateTimer += deltaTime;
            if (this.fpsUpdateTimer >= 1.0) {
                this.fpsDisplay = Math.round(this.frameCount / this.fpsUpdateTimer);
                this.frameCount = 0;
                this.fpsUpdateTimer = 0;
            }

            // 按目标帧率执行更新
            while (this.fpsAccumulator >= targetInterval) {
                // Phase 4a: 胜利画面期间暂停游戏逻辑，但仍更新背景动画
                if (this.victory) {
                    break;
                }
                if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.GAME_OVER) {
                    // 游戏结束但还有尸体需要处理时，继续更新；观战模式下也持续更新
                    if (this.state === GAME_STATE.PLAYING || this.deadBodies.length > 0 || this.playerDeadWaitingForBodies || this.spectating) {
                        this.update(targetInterval);
                    }
                } else if (this.state === GAME_STATE.IDLE) {
                    // demo 模式：只更新 AI 虫虫和宝珠
                    this._updateDemo(targetInterval);
                }
                this.fpsAccumulator -= targetInterval;
            }

            // 更新背景动画（菜单/游戏中均持续播放）
            this.bg.update(deltaTime);
            this.draw();
        } catch (e) {
            console.error('[Game.loop] 主循环异常:', e);
        }
        // requestAnimationFrame放在try外面，保证帧循环永不中断
        requestAnimationFrame((t) => this.loop(t));
    }

    update(deltaTime) {
        const dt = Math.min(deltaTime, 1 / 30);
        this._lastDt = dt; // 存给draw()相机跟随用
        this.frameCount++;
        const player = this.worms[0];

        // 等待玩家控制阶段：执行出场动画，暂停其他游戏逻辑
        if (this.waitingForPlayer) {
            // 确保出场动画启动
            if (player && player.isEntering && player.enterPhase === 0) {
                player.enterPhase = 1;  // 立即切换到phase 1
                player.enterStartTime = performance.now() / 1000;
            }
            // 更新虫虫出场动画
            if (player && player.isEntering) {
                player.updateEntering(dt);
            }
            // 出场动画完成后，继续更新空闲波动（保持生命感）
            if (player && !player.isEntering) {
                player.idleWavePhase += dt * 4;
                player.isMoving = false;  // 确保静止状态波动明显
            }
            return;
        }

        if (this.splitCooldown > 0) {
            this.splitCooldown -= dt;
        }

        // 更新游戏时间
        this.gameTime += dt;

        // 更新黄色宝珠冷却
        if (this.yellowCooldown > 0) {
            this.yellowCooldown -= dt;
        }

        // 更新瞄准镜提示计时器
        if (this.crosshairHintTimer > 0) {
            this.crosshairHintTimer -= dt;
            if (this.crosshairHintTimer <= 0) {
                this.showCrosshairHint = false;
            }
        }

        // 节奏解锁通知
        if (!this.rhythmNotified.yellow && (this.gameTime >= CONFIG.RHYTHM.YELLOW_UNLOCK_TIME || player.length >= CONFIG.RHYTHM.YELLOW_UNLOCK_LENGTH)) {
            this.rhythmNotified.yellow = true;
            this.floatingTexts.push(FloatingText.acquire(CONFIG.MAP_WIDTH / 2, CONFIG.MAP_HEIGHT / 2 - 50, '🟡 黄色宝珠已解锁！', '#ffd700'));
        }
        if (!this.rhythmNotified.orange && this.gameTime >= CONFIG.RHYTHM.ORANGE_UNLOCK_TIME) {
            this.rhythmNotified.orange = true;
            this.floatingTexts.push(FloatingText.acquire(CONFIG.MAP_WIDTH / 2, CONFIG.MAP_HEIGHT / 2 - 50, '🟠 橙色宝珠已解锁！', '#ff8c42'));
        }
        if (!this.rhythmNotified.red && this.gameTime >= CONFIG.RHYTHM.RED_UNLOCK_TIME && player.length >= CONFIG.RHYTHM.RED_UNLOCK_LENGTH) {
            this.rhythmNotified.red = true;
            this.floatingTexts.push(FloatingText.acquire(CONFIG.MAP_WIDTH / 2, CONFIG.MAP_HEIGHT / 2 - 50, '🔵 蓝色宝珠已解锁！可以发射减速子弹！', '#4dabf7'));
        }

        // 按住鼠标连续射击
        if (this.isMouseDown && this.fireCooldown <= 0) {
            this.fireBullet();
            this.fireCooldown = CONFIG.FIRE.COOLDOWN;
        }
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }

        // 更新宝珠刷新计时器
        CONFIG.FOOD_TYPES.forEach(type => {
            if (this.foodRespawnTimers[type.score] > 0) {
                this.foodRespawnTimers[type.score] -= dt;
            }
        });

        // 重力宝珠不需要追踪逻辑，由 Food.update 处理掉落

        // 检测玩家是否在出场动画中
        const isPlayerEntering = player && player.isEntering;

        // 1. 更新所有虫虫
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.segments.length === 0) continue;
            
            // 传递敌人、断尾、家族门、Barrier和障碍物引用给AI
            worm._enemies = this.enemies;
            worm._brokenTails = this.brokenTails;
            worm._familyGates = this.familyGates;
            worm._barriers = this.barriers;
            worm._obstacles = this.obstacles;
            worm._diggableWalls = this.diggableWalls;

            if (worm.isPlayer) {
                // 出场动画期间，继续执行updateEntering，跳过普通update
                if (worm.isEntering) {
                    worm.updateEntering(dt);
                    continue;
                }
                if (this.mouseInCanvas) {
                    worm.update(this.mousePos, dt, this.foods, this.worms);
                } else {
                    worm.update(null, dt, this.foods, this.worms);
                }
                // 检查玩家是否饿死
                if (!worm.isAlive) {
                    this.debugLogger.logHungerDeath(worm, this.gameTime);
                    this.gameOver('hunger');
                    return;
                }
            } else {
                // 玩家出场动画期间，AI 虫虫不更新
                if (isPlayerEntering) {
                    continue;
                }
                worm.update(null, dt, this.foods, this.worms);

                if (worm.checkWallCollision()) {
                    worm.aiWanderDir = Vector.randomDir();
                    const margin = CONFIG.BORDER_MARGIN + CONFIG.SEGMENT_RADIUS;
                    worm.segments[0].x = Math.max(margin, Math.min(CONFIG.MAP_WIDTH - margin, worm.segments[0].x));
                    worm.segments[0].y = Math.max(margin, Math.min(CONFIG.MAP_HEIGHT - margin, worm.segments[0].y));
                }
                
                // AI虫虫随机射击（有蓝色段时）
                if (worm.blueSegments > 0 && worm.bulletCount > 0) {
                    worm.aiShootTimer -= dt;
                    if (worm.aiShootTimer <= 0) {
                        // 随机射击
                        this.aiFireBullet(worm);
                        worm.aiShootTimer = worm.aiShootInterval;  // 重置射击间隔
                        worm.aiShootInterval = 2.0 + Math.random() * 2;  // 新的随机间隔（2-4秒）
                    }
                }
            }
            
            // 收集worm产生的待处理粒子
            if (worm.pendingParticles && worm.pendingParticles.length > 0) {
                for (const p of worm.pendingParticles) {
                    this.particles.push(p);
                }
                worm.pendingParticles = [];
            }

            // === Phase 1 亲子情感：触发幼体撒娇/庆祝音效 ===
            if (worm._pendingSulkSound) {
                worm._pendingSulkSound = false;
                this.musicSystem.playSulkSound(worm.head ? worm.head.x : 400);
            }
            if (worm._pendingCelebrateSound) {
                worm._pendingCelebrateSound = false;
                this.musicSystem.playCelebrateSound(worm.head ? worm.head.x : 400);
            }

            // === Phase 2 性格行为：勇敢挡刀音效 ===
            if (worm._pendingGuardSound) {
                worm._pendingGuardSound = false;
                this.musicSystem.playBirthChime(worm.head ? worm.head.x : 400);
            }

            // === Phase 2 性格行为：侦察兵发现宝珠提示 ===
            if (worm._pendingScoutFlash) {
                worm._pendingScoutFlash = false;
                // 给母体一个浮动文字提示
                if (worm.parentWorm && worm.parentWorm.isAlive && worm.parentWorm.head) {
                    this.floatingTexts.push(FloatingText.acquire(
                        worm.parentWorm.head.x, worm.parentWorm.head.y - 30,
                        '🔍 发现宝珠！', '#4ecdc4'
                    ));
                }
                // 存储方向指示数据（供绘制层使用）
                if (worm.scoutTarget) {
                    worm._scoutIndicator = {
                        target: { x: worm.scoutTarget.x, y: worm.scoutTarget.y },
                        timer: 3.0
                    };
                }
            }

            // === Phase 2 侦察兵方向指示：衰减计时器 ===
            if (worm._scoutIndicator) {
                worm._scoutIndicator.timer -= dt;
                if (worm._scoutIndicator.timer <= 0) {
                    worm._scoutIndicator = null;
                }
            }

            // === Phase 1 亲子情感：幼体死亡动画完成后清理 ===
            if (worm.isJuvenile && worm.deathPhase === 'gone') {
                // 创建灰色尸体下沉
                if (worm.segments.length > 0) {
                    const deadSegments = worm.segments.map(s => ({ x: s.x, y: s.y }));
                    this.deadBodies.push(new DeadBody(deadSegments, worm.color));
                }
                // 留下光点粒子（消散感）+ 波纹
                const cx = worm.head ? worm.head.x : 0;
                const cy = worm.head ? worm.head.y : 0;
                for (let k = 0; k < 8; k++) {
                    this.particles.push(Particle.acquire(cx, cy, worm.color));
                }
                this.createRipple(cx, cy, worm.color, 60, 1.5);
                // 清空segments，下次循环会被跳过
                worm.segments = [];
                worm.deathPhase = 'done';
            }
        }
        
        // 总控AI：检测AI虫虫是否聚集，如果聚集就让它们分散
        this.updateAIDispersal();

 // 2. 玩家进入预警线（显示红色闪烁预警）
        if (this.mouseInCanvas && player && player.isAlive && !player.isEntering && player.checkWarningLine()) {
            player.warningFlashTimer = 0.5;  // 预警闪烁 0.5 秒
        }
        
        // 2.1 玩家撞死亡线（游戏结束）
        if (this.mouseInCanvas && player && player.isAlive && !player.isEntering && player.checkWallCollision()) {
            this.debugLogger.logWallDeath(player, this.gameTime);
            this.gameOver('wall');
            return;
        }

// 3. 吃食物
        for (const worm of this.worms) {
            if (!worm.isAlive) continue;
            const eatenIndex = worm.checkFoodCollision(this.foods);
            if (eatenIndex !== -1) {
                const food = this.foods[eatenIndex];
                const foodPos = food.pos;
                this.foods.splice(eatenIndex, 1);

                // 调试日志：记录进食
                this.debugLogger.logEat(worm, food, this.gameTime);
                
                // 黄色宝珠特殊处理：先闪光，闪完后逐节长2格
                if (food.type.score === 30) {  // 黄色宝珠
                    // 触发黄光效果：从嘴部到尾部逐个闪光
                    worm.yellowGlowTimer = worm.segments.length * 0.1 + 0.2;  // 根据段数计算总时间 + 余量
                    worm.yellowGlowIndex = 0;  // 从第 0 段（嘴部）开始
                    worm.yellowGlowStepTimer = 0;
                    worm.pendingGrowCount = 2;  // 等黄光结束后逐节长2格
                    worm.grownCount = 0;
                    worm.growStepTimer = 0;
                    // 启动黄色宝珠冷却：旋律播完(3秒) + 间隔(2秒)
                    this.yellowCooldown = CONFIG.RHYTHM.YELLOW_COOLDOWN;
                    this.floatingTexts.push(FloatingText.acquire(foodPos.x, foodPos.y - 30, '🎵 等待旋律...', '#ffd700'));
                } else if (food.type.score === 60) {  // 橙色宝珠：触发磁力效果
                    worm.magnetTimer = 3.0;  // 磁力持续 3 秒（加倍）
                    worm.magnetCombo = 0;  // 重置连击数
                    worm.grow(CONFIG.GROWTH_PER_FOOD);
                } else if (food.type.score === 120) {  // 蓝色宝珠：增加蓝色段（每段提供5发子弹）
                    worm.blueSegments = (worm.blueSegments || 0) + 1;  // 增加1个蓝色段
                    worm.blueStrengths.push(5);  // 新蓝色段强度为5
                    worm.bulletCount = worm.blueSegments * 5;  // 子弹数量 = 蓝色段数 × 5
                    worm.bulletFiredCount = 0;  // 重置已发射计数
                    this.floatingTexts.push(FloatingText.acquire(foodPos.x, foodPos.y - 20, '🔫 +5', '#4dabf7'));
                    worm.grow(CONFIG.GROWTH_PER_FOOD);
                    // 第一次吃到蓝宝珠：显示瞄准镜提示
                    if (!this.rhythmNotified.redAim) {
                        this.rhythmNotified.redAim = true;
                        this.showCrosshairHint = true;  // 显示瞄准镜提示
                        this.crosshairHintTimer = 3.0;  // 提示持续3秒
                    }
                } else if (food.type.score === 300) {  // 紫色宝珠：无敌状态
                    worm.invincibleTimer = 10.0;  // 10秒无敌
                    worm.headEnlarged = true;  // 头部变大一倍
                    worm.headEnlargedTimer = 10.0;  // 头部变大持续时间
                    worm.headScaleTarget = 2.0;  // 头部缩放目标值
                    worm.purpleParticleTimer = 10.0;  // 紫色粒子特效持续时间（与无敌状态同步）
                    worm.tailYellowDash = false;  // 尾部黄色虚线消失
                    worm.tailYellowDashTimer = 10.0;  // 尾部虚线消失持续时间
                    this.floatingTexts.push(FloatingText.acquire(foodPos.x, foodPos.y - 20, '⭐ 无敌', '#c77dff'));
                    worm.grow(CONFIG.GROWTH_PER_FOOD);
                } else {
                    worm.grow(CONFIG.GROWTH_PER_FOOD);
                }
                
                // 吃宝珠时触发闭嘴动画
                worm.mouthCloseTimer = 0.3;  // 闭嘴 0.3 秒
                
                if (worm.isPlayer) {
                    this.score += food.type.score;
                    if (worm.segments.length > this.maxLengthReached) {
                        this.maxLengthReached = worm.segments.length;
                    }

                    // 粒子爆发效果（使用宝珠颜色）
                    const particleColor = food.type.color;
                    for (let i = 0; i < 6; i++) {
                        this.particles.push(Particle.acquire(foodPos.x, foodPos.y, particleColor));
                    }
                    
                    // 浮动文字效果（显示实际分数）
                    this.floatingTexts.push(FloatingText.acquire(foodPos.x, foodPos.y - 10, `+${food.type.score}`, food.type.color));
                }
                
                // 设置该类型宝珠的刷新计时器
                this.foodRespawnTimers[food.type.score] = food.type.respawnTime;
                
                // 触发音效（立体声：基于宝珠位置）
                if (worm.isPlayer) {
                    // 黄色宝珠：播放水晶序曲音符，数量等于虫虫段数
                    if (food.type.score === 30) {
                        this.musicSystem.playYellowBeadArpeggio(worm.segments.length, foodPos.x);
                    } else {
                        this.musicSystem.onEatFood(food, foodPos.x);
                    }
                }
            }
        }

        // 4. 所有虫虫咬到自己尾巴检测（玩家出场动画期间不检测）
        // 先刷新空间网格（用于碰撞加速查询）
        this.populateSpatialGrid();
        if (this.splitCooldown <= 0 && player && !player.isEntering) {
            for (const worm of this.worms) {
                if (!worm.isAlive || worm.isDead) continue;
                // 幼体不能自噬断尾
                if (worm.isJuvenile) continue;
                // 跳过无敌状态的虫虫（刚诞生的后代）
                if (worm.invincibleTimer > 0) continue;
                
                // 检测咬到自己尾巴
                const selfTailBiteIndex = worm.checkSelfTailBite();
                if (selfTailBiteIndex !== -1) {
                    this.debugLogger.logSelfBiteSplit(worm, selfTailBiteIndex, this.gameTime);
                    this.handleSplit(worm, selfTailBiteIndex);
                    this.splitCooldown = 2.0;
                    break;  // 每次只处理一个虫虫的诞生
                }
            }
        }

        // 5. 【实验机制】所有虫虫咬到其他虫虫的尾巴 → 被咬者断尾诞生后代
        const activeWorms = this.worms.filter(w => 
            w.isAlive && w.invincibleTimer <= 0 && w.activationTimer <= 0
        );
        
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.isEntering || worm.isJuvenile) continue;
            
            const others = activeWorms.filter(w => w !== worm);
            const tailBite = worm.checkTailBite(others, this.spatialGrid);
            if (tailBite) {
                const biteType = worm.isPlayer ? '玩家' : 'AI';
                const biteeType = tailBite.worm.isPlayer ? '玩家' : 'AI';

                this.debugLogger.logTailBite(worm, tailBite.worm, tailBite.segmentIndex, this.gameTime);
                this.handleTailBiteSplit(tailBite.worm, tailBite.segmentIndex);
                this.splitCooldown = 2.0;
                break;  // 每次只处理一个虫虫的诞生
            }
        }

      // 6. 检测所有虫虫颈部被咬（被咬的死，不是咬人的死）
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.isEntering || worm.invincibleTimer > 0 || worm.isJuvenile) continue;
            
            const neckBite = worm.checkNeckBite(activeWorms, this.spatialGrid);
            if (neckBite) {
                const biter = worm.isPlayer ? '玩家' : 'AI';
                const bitee = neckBite.worm.isPlayer ? '玩家' : 'AI';

                this.debugLogger.logNeckBiteDeath(worm, neckBite.worm, neckBite.segmentIndex, this.gameTime);
                this.handleNeckBiteDeath(neckBite.worm, neckBite.segmentIndex);
                this.splitCooldown = 2.0;
                break;
            }
        }

        // 7. 玩家碰到其他虫虫身体（只有咬到尾部才能咬断，其他地方不咬断）
        if (player && player.isAlive && !this.playerDeadWaitingForBodies) {
            const adultWorms = activeWorms.filter(w => !w.isJuvenile);
            const otherCollision = player.checkOtherWormCollision(adultWorms, this.spatialGrid);
            if (otherCollision) {
                if (player.invincibleTimer > 0) {
                    // 玩家处于无敌状态，不被吞噬也不咬断对方
                } else {
                    // 玩家碰到其他虫虫身体，被吞噬
                    this.debugLogger.logCollisionDeath(player, otherCollision.worm, this.gameTime);
                    this.gameOver();
                    return;
                }
            }
        }

        // 6.5 AI虫虫头部互撞：不咬断，只是碰撞

        // 8. 更新断尾（紧凑过滤替代splice）
        {
            let w = 0;
            for (let i = 0; i < this.brokenTails.length; i++) {
                const tail = this.brokenTails[i];
                const finished = tail.update(dt);
                if (!finished) {
                    this.brokenTails[w++] = tail;
                } else {
                    const newWorm = tail.spawnWorm(tail.parentWorm);
                    if (newWorm && this.worms.length < CONFIG.MAX_WORMS) {
                        this.worms.push(newWorm);
                        // 调试日志：幼体诞生
                        this.debugLogger.logJuvenileBorn(newWorm, tail.parentWorm, tail.birthMethod || 'self-bite', this.gameTime);
                        this.splitCount++;
                        if (this.splitCount === 1) {
                            this.showFamilyNotice();
                        } else {
                            this.showSplitNotice();
                        }

                        // === Phase 1 亲子情感：出生奖励 ===
                        // 母体获得3秒无敌
                        if (tail.parentWorm && tail.parentWorm.isAlive) {
                            tail.parentWorm.invincibleTimer = 3.0;
                            const parentHead = tail.parentWorm.head;
                            if (parentHead) {
                                this.floatingTexts.push(FloatingText.acquire(parentHead.x, parentHead.y - 30, '✨ +3s无敌', '#ffd700'));
                            }
                        }
                        // 出生音效
                        const birthX = newWorm.head ? newWorm.head.x : 400;
                        this.musicSystem.playBirthChime(birthX);
                    } else {
                        // 无法生成新虫（达到上限等），转为尸体下沉并产出食物，避免白白消失
                        if (tail.segments && tail.segments.length > 0) {
                            this.deadBodies.push(new DeadBody(tail.segments, tail.newColor));
                        }
                    }
                }
            }
            this.brokenTails.length = w;
        }

        // 8.5 更新敌人系统
        this.updateEnemies(dt, player);

        // 8.5b Phase 3b: 更新障碍物系统
        this.updateObstacles(dt, player);
        
        // 8.6 Phase 3: 更新家族门
        for (const gate of this.familyGates) {
            gate.update(dt, this.worms);
        }
        
        // 8.7 Phase A+D+E: 更新区域系统 + 通关检测 + 懒加载
        if (player && player.isAlive) {
            const prevZoneId = this.zoneManager.currentZoneId;
            this.zoneManager.getCurrentZone(player);
            const newZoneId = this.zoneManager.currentZoneId;

            // Phase E: 区域切换时暂存/恢复实体
            if (prevZoneId !== newZoneId) {
                this._handleZoneTransition(prevZoneId, newZoneId, player);
            }

            // Phase E: 检查回访奖励
            this._checkRevisitReward(player);

            // Phase D: 检查当前区域是否通关
            const completionResult = this.zoneManager.checkZoneCompletion(newZoneId, {
                enemies: this.enemies,
                gameTime: this.gameTime,
                score: this.score,
                playerLength: player.segments.length,
                juvenileCount: this.worms.filter(w => w.isAlive && w.isJuvenile).length,
                adultCount: this.worms.filter(w => w.isAlive && w.isAdult).length,
                bosses: this.bosses,
                bossesSpawned: this.bossSpawned.has(newZoneId),
            });
            if (completionResult.completed) {
                this.zoneManager.completeZone(newZoneId);
                // 通关提示
                const cx = player.head ? player.head.x : 400;
                const cy = player.head ? player.head.y : 2800;
                this.floatingTexts.push(FloatingText.acquire(cx, cy - 40, `✅ 区域 ${newZoneId} 通关！`, '#44ff44'));
                // 通关粒子
                for (let k = 0; k < 15; k++) {
                    this.particles.push(Particle.acquire(cx, cy, '#44ff44'));
                }
                this.debugLogger.logZoneComplete(newZoneId, completionResult.reason, this.gameTime);
                // Phase 4a: Zone 25 通关触发胜利画面
                if (newZoneId === 25 && !this.victory) {
                    this.victory = true;
                    this.victoryStats = {
                        time: this.gameTime,
                        score: this.score,
                        kills: this.zoneManager.killCount,
                        maxLength: this.maxLengthReached,
                    };
                    this.debugLogger._log('VICTORY', '虫后击败！游戏胜利！', this.victoryStats, this.gameTime);
                }
            }
            // 定期保存进度（每10秒）
            if (Math.floor(this.gameTime) % 10 === 0 && Math.floor(this.gameTime) !== Math.floor(this.gameTime - dt)) {
                this.zoneManager.saveProgress();
            }
        }

        // 8.8 Phase B: 更新 Barrier 门
        const playerState = {
            score: this.score,
            length: player ? player.length : 0,
            juvenileCount: this.worms.filter(w => w.isAlive && w.isJuvenile).length,
            adultCount: this.worms.filter(w => w.isAlive && w.isAdult).length,
            killCount: this.zoneManager.killCount,
        };
        for (const barrier of this.barriers) {
            barrier.update(dt, playerState, this.zoneManager);
            if (player) barrier.checkPlayerNear(player);
        }

        // 8.9 Phase 3c: 更新可挖掘墙壁
        for (const wall of this.diggableWalls) {
            wall.update(dt);
        }
        // 8.10 更新海底生态边界墙
        this.zoneDecorations.update(dt);

        // 虫虫挖掘墙壁检测
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.segments.length === 0) continue;
            worm.isDigging = false;  // 重置挖掘状态
            for (const wall of this.diggableWalls) {
                if (!wall.active) continue;
                const result = wall.dig(worm, dt);
                if (result.digging) {
                    worm.isDigging = true;
                    worm.mouthCloseTimer = 0;  // 清除吃宝珠的闭嘴，让挖掘嘴巴动画生效
                }
                if (result.blocked) {
                    worm.isDigging = true;
                }
                // 收集泥块粒子
                if (result.debrisParticles.length > 0) {
                    wall.addDebris(result.debrisParticles);
                }
                // 释放的宝珠加入食物列表
                for (const food of result.releasedFoods) {
                    this.foods.push(food);
                }
            }
        }

        // 9. 更新尸体下沉动画（紧凑过滤替代splice）
        {
            let w = 0;
            for (let i = 0; i < this.deadBodies.length; i++) {
                const body = this.deadBodies[i];
                const emitted = body.update(dt, CONFIG.MAP_HEIGHT);

                // 每一段碰底的尸体转化为宝珠，从该段位置向上发射
                for (const emit of emitted) {
                    const food = new Food(emit.x, emit.y, emit.type);
                    const angle = (CONFIG.DEAD_BODY.EMIT_ANGLE_MIN + Math.random() * CONFIG.DEAD_BODY.EMIT_ANGLE_SPREAD) * Math.PI / 180;
                    const speed = CONFIG.DEAD_BODY.EMIT_SPEED_MIN + Math.random() * CONFIG.DEAD_BODY.EMIT_SPEED_SPREAD;
                    food.velocity.x = speed * Math.cos(angle);
                    food.velocity.y = -speed * Math.sin(angle);
                    food.inactiveTimer = CONFIG.DEAD_BODY.EMIT_INACTIVE_TIME;
                    food.birthPhase = 'white';
                    food.birthTimer = CONFIG.DEAD_BODY.EMIT_BIRTH_TIME;
                    this.foods.push(food);
                    for (let j = 0; j < CONFIG.DEAD_BODY.EMIT_PARTICLE_COUNT; j++) {
                        this.particles.push(Particle.acquire(emit.x, emit.y, emit.type.color));
                    }
                }

                if (!body.isFinished) {
                    this.deadBodies[w++] = body;
                }
            }
            this.deadBodies.length = w;
        }

        // 10. 检查玩家死亡是否等待尸体处理完成
        if (this.playerDeadWaitingForBodies && this.deadBodies.length === 0) {
            this.playerDeadWaitingForBodies = false;
            this.showPlayerDeathDialog(this.pendingDeathReason || 'eaten');
        }

        // 11. 磁力吸引效果（橙色宝珠触发）
        if (player && player.magnetTimer > 0 && player.head) {
            const magnetRange = 150;  // 磁力范围（减半）
            const playerHead = player.head;
            
            for (const food of this.foods) {
                if (!food || !food.pos) continue;
                if (food.inactiveTimer > 0) continue;  // 初生冷却中的宝珠不能被磁力吸引
                const dist = playerHead.dist(food.pos);
                if (dist > magnetRange) continue;  // 超出范围
                
                // 计算吸引力强度
                let attractStrength;
                if (food.type.score === 10) {  // 绿色宝珠：完全吸引
                    attractStrength = 1.0;
                } else {
                    // 其他宝珠：根据稀有度减弱，最多移动 1/2 距离
                    attractStrength = Math.max(0.1, 1 - food.type.score / 150);
                }
                
                // 计算吸引方向和距离
                const ddx = playerHead.x - food.pos.x;
                const ddy = playerHead.y - food.pos.y;
                const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
                const maxMove = dist * 0.5 * attractStrength;  // 最多移动 1/2 距离
                const moveSpeed = Math.min(8, maxMove * dt * 5);  // 速度限制
                
                // 移动宝珠（就地修改）
                if (ddist > 0) { food.pos.x += ddx / ddist * moveSpeed; food.pos.y += ddy / ddist * moveSpeed; }
            }
        }
        
        // 磁力效果结束时结算连击
        if (player && player.magnetTimer <= 0 && player.magnetCombo > 0) {
            // 播放叮叮声（每个被吸引的宝珠响一声，立体声定位）
            const headX = player.segments[0] ? player.segments[0].x : 400;
            for (let i = 0; i < Math.min(player.magnetCombo, 8); i++) {
                setTimeout(() => {
                    this.musicSystem.playNote(1200 + i * 100, 80, undefined, undefined, headX);  // 递增音高
                }, i * 100);
            }
            if (player) player.magnetCombo = 0;  // 重置连击
        }
        
        // 7.6 更新子弹和碰撞检测（紧凑过滤替代splice）
        {
            let w = 0;
            const bulletZone = this.zoneManager ? this.zoneManager.zones[this.zoneManager.currentZoneId - 1] : null;
            for (let i = 0; i < this.bullets.length; i++) {
                const bullet = this.bullets[i];
                if (!bullet.update(dt)) {
                    continue; // 过期子弹，丢弃
                }

                // Phase C: 子弹到达区域边界自动消失
                if (CONFIG.ZONE.BULLET_DISAPPEAR_AT_ZONE && bulletZone) {
                    const bz = bulletZone;
                    if (bullet.pos.x < bz.x || bullet.pos.x > bz.x + bz.width ||
                        bullet.pos.y < bz.y || bullet.pos.y > bz.y + bz.height) {
                        continue; // 子弹飞出当前区域，丢弃
                    }
                }

                let hit = false;

                // 检测子弹击中宝珠
                if (!hit) {
                    for (let j = this.foods.length - 1; j >= 0; j--) {
                        const food = this.foods[j];
                        if (bullet.checkFoodHit(food)) {
                            this.slowedFoods.set(food, 3.0);
                            food.velocity.multSelf(0.2);
                            const hx = food.pos.x - bullet.pos.x;
                            const hy = food.pos.y - bullet.pos.y;
                            const hd = Math.sqrt(hx * hx + hy * hy);
                            if (hd > 0) { food.pos.x += hx / hd * 15; food.pos.y += hy / hd * 15; }
                            for (let k = 0; k < 4; k++) {
                                this.particles.push(Particle.acquire(food.pos.x, food.pos.y, '#4dabf7'));
                            }
                            this.floatingTexts.push(FloatingText.acquire(food.pos.x, food.pos.y - 15, 'SLOW', '#4dabf7'));
                            hit = true;
                            break;
                        }
                    }
                }

                // 检测子弹击中虫虫
                if (!hit) {
                    for (const worm of this.worms) {
                        if (!worm.isAlive || worm.isPlayer || worm.segments.length === 0) continue;
                        if (bullet.checkWormHit(worm)) {
                            let hitSegmentIndex = 0;
                            for (let si = 0; si < worm.segments.length; si++) {
                                if (bullet.pos.dist(worm.segments[si]) < bullet.radius + CONFIG.SEGMENT_RADIUS) {
                                    hitSegmentIndex = si;
                                    break;
                                }
                            }
                            worm.slowStacks = Math.min((worm.slowStacks || 0) + 1, 5);
                            worm.slowTimer = 3.0;
                            worm.updateSpeed();
                            worm.iceOverlays.push({
                                segmentIndex: hitSegmentIndex,
                                timer: 2.0,
                                maxTimer: 2.0
                            });
                            const khx = worm.head.x - bullet.pos.x;
                            const khy = worm.head.y - bullet.pos.y;
                            const khd = Math.sqrt(khx * khx + khy * khy);
                            worm.knockbackVelocity = new Vector(khd > 0 ? khx / khd * 6 : 0, khd > 0 ? khy / khd * 6 : 0);
                            worm.knockbackTimer = 0.15;
                            for (let k = 0; k < 6; k++) {
                                this.particles.push(Particle.acquire(worm.head.x, worm.head.y, '#4dabf7'));
                            }
                            const stackText = worm.slowStacks > 1 ? `SLOW x${worm.slowStacks}!` : 'SLOW!';
                            this.floatingTexts.push(FloatingText.acquire(worm.head.x, worm.head.y - 20, stackText, '#4dabf7'));
                            hit = true;
                            break;
                        }
                    }
                }

                // 检测子弹击中敌人（三叶虫）
                if (!hit) {
                    for (const enemy of this.enemies) {
                        if (!enemy.isAlive || enemy.isDying) continue;
                        const enemyHead = enemy.segments[0];
                        if (!enemyHead) continue;
                        const dist = bullet.pos.dist(enemyHead);
                        if (dist < bullet.radius + enemy.size) {
                            const ehx = enemy.pos.x - bullet.pos.x;
                            const ehy = enemy.pos.y - bullet.pos.y;
                            const ehd = Math.sqrt(ehx * ehx + ehy * ehy);
                            const hitDir = new Vector(ehd > 0 ? ehx / ehd : 0, ehd > 0 ? ehy / ehd : 0);
                            for (let k = 0; k < 6; k++) {
                                this.particles.push(Particle.acquire(enemyHead.x, enemyHead.y, '#4dabf7'));
                            }
                            const killed = enemy.takeDamage(hitDir);
                            if (killed) {
                                this.floatingTexts.push(FloatingText.acquire(enemyHead.x, enemyHead.y - 20, 'KILL!', '#ff6b6b'));
                                this.debugLogger.logEnemyDeath(enemy, this.gameTime);
                            } else {
                                this.floatingTexts.push(FloatingText.acquire(enemyHead.x, enemyHead.y - 20, `HIT! ${enemy.health}/${enemy.maxHealth}`, '#4dabf7'));
                                this.debugLogger.logEnemyHit(enemy, enemy.health, this.gameTime);
                            }
                            hit = true;
                            break;
                        }
                    }
                }

                // Phase 3c: 检测子弹击中可挖掘墙壁
                if (!hit) {
                    for (const wall of this.diggableWalls) {
                        if (!wall.active) continue;
                        const result = wall.bulletHit(bullet.pos, bullet.radius);
                        if (result.hit) {
                            // 沙雾粒子效果（通用粒子，由game.js管理）
                            for (let k = 0; k < 5; k++) {
                                this.particles.push(Particle.acquire(
                                    bullet.pos.x + (Math.random() - 0.5) * 12,
                                    bullet.pos.y + (Math.random() - 0.5) * 12,
                                    CONFIG.DIGGABLE_WALL.COLOR_LIGHT
                                ));
                            }
                            // 释放的宝珠加入食物列表
                            for (const food of result.releasedFoods) {
                                this.foods.push(food);
                            }
                            hit = true;
                            break;
                        }
                    }
                }

                // Phase 3b: 检测子弹击中障碍物
                if (!hit) {
                    for (const obs of this.obstacles) {
                        if (!obs.isAlive) continue;
                        const result = obs.checkBulletHit(bullet.pos, bullet.radius);
                        if (result === 'hit') {
                            // 岩石被击中
                            const destroyed = obs.takeDamage();
                            for (let k = 0; k < 4; k++) {
                                this.particles.push(Particle.acquire(bullet.pos.x, bullet.pos.y, '#888888'));
                            }
                            if (destroyed) {
                                this.floatingTexts.push(FloatingText.acquire(obs.pos.x, obs.pos.y - 20, '💥 碎裂!', '#aaaaaa'));
                            } else {
                                this.floatingTexts.push(FloatingText.acquire(obs.pos.x, obs.pos.y - 20, `${obs.health}/${obs.maxHealth}`, '#aaaaaa'));
                            }
                            hit = true;
                            break;
                        } else if (result === 'reflect') {
                            // 水晶刺反射子弹
                            const dx = bullet.pos.x - obs.pos.x;
                            const dy = bullet.pos.y - obs.pos.y;
                            const dd = Math.sqrt(dx * dx + dy * dy);
                            if (dd > 0) {
                                bullet.velocity.x = (dx / dd) * bullet.velocity.length();
                                bullet.velocity.y = (dy / dd) * bullet.velocity.length();
                                // 延长子弹寿命以继续飞行
                                bullet.life = Math.max(bullet.life, 0.5);
                            }
                            for (let k = 0; k < 3; k++) {
                                this.particles.push(Particle.acquire(bullet.pos.x, bullet.pos.y, '#c77dff'));
                            }
                            this.floatingTexts.push(FloatingText.acquire(bullet.pos.x, bullet.pos.y - 15, '反射!', '#c77dff'));
                            // 不设hit=true，子弹继续飞
                            break;
                        } else if (result === 'absorb') {
                            // 岩浆池/虚空裂隙吸收子弹
                            for (let k = 0; k < 3; k++) {
                                this.particles.push(Particle.acquire(bullet.pos.x, bullet.pos.y, obs.cfg.COLOR));
                            }
                            hit = true;
                            break;
                        }
                    }
                }

                if (!hit) {
                    this.bullets[w++] = bullet;
                }
            }
            this.bullets.length = w;
        }
        
        // 更新减速计时器
        for (const [food, timer] of this.slowedFoods) {
            if (timer <= dt) {
                this.slowedFoods.delete(food);
            } else {
                this.slowedFoods.set(food, timer - dt);
            }
        }
        for (const [worm, timer] of this.slowedWorms) {
            if (timer <= dt) {
                this.slowedWorms.delete(worm);
                worm.updateSpeed();  // 恢复速度
            } else {
                this.slowedWorms.set(worm, timer - dt);
            }
        }

        // 8. 更新食物动画
        for (let i = 0; i < this.foods.length; i++) this.foods[i].update(dt);

        // 9. 按类型刷新宝珠 + 清理出画布的宝珠（底部消散特效）
        {
            const deathMargin = CONFIG.BORDER_MARGIN;
            let w = 0;
            for (let i = 0; i < this.foods.length; i++) {
                const food = this.foods[i];
                if (food.pos.y > CONFIG.MAP_HEIGHT - deathMargin && food.velocity.y >= 0) {
                    // 宝珠掉到底部死亡线时，播放消散特效
                    for (let j = 0; j < 8; j++) {
                        this.particles.push(Particle.acquire(food.pos.x, food.pos.y, food.type.color));
                    }
                    this.foodRespawnTimers[food.type.score] = food.type.respawnTime;
                } else if (food.pos.y < -50) {
                    // 清理飞出顶部的宝珠
                } else {
                    this.foods[w++] = food;
                }
            }
            this.foods.length = w;
        }
        
        // 节奏控制宝珠生成（Phase C: 区域化生成）
        const playerLength = player ? player.segments.length : 0;
        // 获取玩家当前区域（用于区域化生成）
        const playerZone = this.zoneManager ? this.zoneManager.zones[this.zoneManager.currentZoneId - 1] : null;
        for (let ti = 0; ti < CONFIG.FOOD_TYPES.length; ti++) {
            const type = CONFIG.FOOD_TYPES[ti];
            // 计数当前类型的宝珠数量（避免filter创建临时数组）
            let currentCount = 0;
            for (let fi = 0; fi < this.foods.length; fi++) {
                if (this.foods[fi].type.score === type.score) currentCount++;
            }
            if (currentCount >= type.maxCount || this.foodRespawnTimers[type.score] > 0) {
                continue;  // 已达上限或冷却中
            }

            // 根据节奏配置决定是否生成
            let canSpawn = false;
            switch (type.score) {
                case 1:  // 海洋雪：始终可用，持续生成
                    canSpawn = Math.random() < 0.5;
                    break;
                case 10:  // 绿色：开局分批生成，之后持续补充
                    if (this.initialGreenSpawned < type.maxCount) {
                        // 开局分批生成：每隔1.5-2.5秒生成1个，错落有致
                        const spawnInterval = 1.5 + Math.random();  // 1.5~2.5秒随机间隔
                        if (this.gameTime > this.initialGreenSpawned * spawnInterval) {
                            canSpawn = true;
                            this.initialGreenSpawned++;
                        }
                    } else {
                        // 之后持续补充（30%概率）
                        canSpawn = Math.random() < 0.3;
                    }
                    break;
                case 30: { // 黄色：25秒后或10节后 + 冷却结束
                    const isYellowUnlocked = this.gameTime >= CONFIG.RHYTHM.YELLOW_UNLOCK_TIME
                        || playerLength >= CONFIG.RHYTHM.YELLOW_UNLOCK_LENGTH;
                    canSpawn = isYellowUnlocked && this.yellowCooldown <= 0;
                    break;
                }
                case 60:  // 橙色：90秒后
                    canSpawn = this.gameTime >= CONFIG.RHYTHM.ORANGE_UNLOCK_TIME;
                    break;
                case 120: // 蓝色：30秒后 + 身体15节后
                    canSpawn = this.gameTime >= CONFIG.RHYTHM.RED_UNLOCK_TIME 
                        && playerLength >= CONFIG.RHYTHM.RED_UNLOCK_LENGTH;
                    break;
                case 300: // 紫色：暂时禁用
                    canSpawn = false;
                    break;
            }

            if (canSpawn) {
                // Phase C: 优先在当前区域生成宝珠
                if (playerZone) {
                    this.foods.push(Food.inZone(playerZone, type));
                } else {
                    this.foods.push(Food.random(type));
                }
            }
        }

        // 9.5 紫色粒子特效（当玩家有purpleParticleTimer时）
        if (player && player.purpleParticleTimer > 0) {
            // 在玩家头部位置创建紫色粒子
            const headPos = player.head;
            for (let i = 0; i < 2; i++) {
                this.particles.push(Particle.acquire(
                    headPos.x + (Math.random() - 0.5) * 20,
                    headPos.y + (Math.random() - 0.5) * 20,
                    'rgb(199, 125, 255)'  // 紫色
                ));
            }
        }

        // 10. 更新粒子效果（紧凑过滤替代splice，O(n)）
        {
            let w = 0;
            for (let i = 0; i < this.particles.length; i++) {
                if (this.particles[i].update(dt)) {
                    this.particles[w++] = this.particles[i];
                } else {
                    Particle.release(this.particles[i]);
                }
            }
            this.particles.length = w;
        }

        // 11. 更新浮动文字（紧凑过滤替代splice，O(n)）+ 对象池回收
        {
            let w = 0;
            for (let i = 0; i < this.floatingTexts.length; i++) {
                if (this.floatingTexts[i].update(dt)) {
                    this.floatingTexts[w++] = this.floatingTexts[i];
                } else {
                    FloatingText.release(this.floatingTexts[i]);
                }
            }
            this.floatingTexts.length = w;
        }

        // 11.5 更新屏幕震动和波纹
        this.updateScreenShake(dt);
        this.updateRipples(dt);

        // 11.6 更新小地图
        this.miniMap.update(dt);

        // 12. 更新 UI
        this.updateUI();
        
        // 13. 更新移动端鼠标指示器
        this.updateMouseIndicator();
    }
    
    /**
     * 发射子弹（桌面端和移动端共用）
     */
    fireBullet() {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        const player = this.worms[0];
        if (!player || !player.isAlive || player.segments.length < 2) return;
        if (!player.bulletCount || player.bulletCount <= 0) return;
        if (!player.blueSegments || player.blueSegments <= 0) return;
        
        // 子弹方向：嘴部开合的方向（基于头部到第二段的向量）
        let mouthAngle = Math.atan2(player.velocity.y, player.velocity.x);
        if (player.segments.length > 1) {
            const dx = player.head.x - player.segments[1].x;
            const dy = player.head.y - player.segments[1].y;
            if (dx !== 0 || dy !== 0) {
                mouthAngle = Math.atan2(dy, dx);
            }
        }
        const cosMA = Math.cos(mouthAngle);
        const sinMA = Math.sin(mouthAngle);
        const direction = new Vector(cosMA, sinMA);
        const bpx = player.head.x + cosMA * (CONFIG.SEGMENT_RADIUS + 5);
        const bpy = player.head.y + sinMA * (CONFIG.SEGMENT_RADIUS + 5);
        
        this.bullets.push(new Bullet(bpx, bpy, direction));
        player.bulletCount--;
        
        // 每射1发子弹，减少第一个蓝色段的强度
        let strengthReduced = false;
        for (let i = 0; i < player.blueStrengths.length; i++) {
            if (player.blueStrengths[i] > 0) {
                player.blueStrengths[i]--;
                strengthReduced = true;
                
                // 当该段强度为0时，减少蓝色段数并创建消失动画，同时移除该节身体
                if (player.blueStrengths[i] === 0) {
                    // 创建消失动画（粒子效果）
                    const segmentIndex = i + 1;  // 对应的身体段索引
                    if (segmentIndex < player.segments.length) {
                        const segmentPos = player.segments[segmentIndex];
                        // 创建蓝色粒子爆炸效果
                        for (let j = 0; j < 8; j++) {
                            this.particles.push(Particle.acquire(segmentPos.x, segmentPos.y, 'rgb(77, 171, 247)'));
                        }
                        // 移除该节身体
                        player.segments.splice(segmentIndex, 1);
                        player.targetLength--;
                    }
                    
                    player.blueSegments--;
                    player.blueStrengths.splice(i, 1);  // 从数组中移除
                    player.syncBlueToBody();  // 同步弹舱状态
                }
                break;  // 只减少一个段的强度
            }
        }
        
        // 如果没有蓝色段可用，消耗身体
        if (!strengthReduced && player.segments.length > 1) {
            player.segments.pop();
            player.targetLength--;
        }
        
        // 发射音效（立体声定位）
        const headX = player.segments[0] ? player.segments[0].x : 400;
        this.musicSystem.playNote(800, 50, undefined, undefined, headX);

        // === Phase 2 合击攻击：成年后代协同射击 ===
        this._triggerComboAttack(player, mouthAngle);
    }

    /**
     * 合击攻击：玩家射击时，附近的成年后代自动协同射击
     * @param {Worm} player - 玩家虫虫
     * @param {number} baseAngle - 玩家射击角度（弧度）
     */
    _triggerComboAttack(player, baseAngle) {
        const comboRange = CONFIG.FAMILY.COMBO_RANGE;
        const comboCooldown = CONFIG.FAMILY.COMBO_COOLDOWN;
        const comboSpread = CONFIG.FAMILY.COMBO_SPREAD;

        let comboIndex = 0;  // 用于交替偏移方向
        for (const worm of this.worms) {
            if (!worm.isAlive || !worm.isAdult || worm.isPlayer) continue;
            if (worm.isGuardingPosition) continue;  // 驻守中的不合击
            if (worm.comboCooldown > 0) continue;    // 冷却中
            if (!worm.blueSegments || worm.blueSegments <= 0) continue;
            if (!worm.bulletCount || worm.bulletCount <= 0) continue;
            if (worm.segments.length < 2) continue;

            // 距离检测
            const dist = worm.head.dist(player.head);
            if (dist > comboRange) continue;

            // 计算合击方向（与母体大致相同，加微小扇形偏移）
            const spreadDir = comboIndex % 2 === 0 ? 1 : -1;
            const comboAngle = baseAngle + spreadDir * comboSpread * (1 + comboIndex * 0.3);
            const direction = new Vector(Math.cos(comboAngle), Math.sin(comboAngle));
            const bpx = worm.head.x + Math.cos(comboAngle) * (CONFIG.SEGMENT_RADIUS + 5);
            const bpy = worm.head.y + Math.sin(comboAngle) * (CONFIG.SEGMENT_RADIUS + 5);

            this.bullets.push(new Bullet(bpx, bpy, direction));
            worm.bulletCount--;
            worm.comboCooldown = comboCooldown;

            // 消耗蓝色段
            for (let i = 0; i < worm.blueStrengths.length; i++) {
                if (worm.blueStrengths[i] > 0) {
                    worm.blueStrengths[i]--;
                    if (worm.blueStrengths[i] === 0) {
                        worm.blueSegments--;
                        worm.blueStrengths.splice(i, 1);
                        if (worm.segments.length > 3) {
                            worm.segments.pop();
                            worm.targetLength = worm.segments.length;
                        }
                        worm.syncBlueToBody();
                    }
                    break;
                }
            }

            // 合击特效：成年后代头部金色粒子
            for (let k = 0; k < 4; k++) {
                this.particles.push(Particle.acquire(worm.head.x, worm.head.y, '#ffd700'));
            }
            // 浮动文字
            this.floatingTexts.push(FloatingText.acquire(worm.head.x, worm.head.y - 25, '⚔️合击！', '#ffd700'));

            comboIndex++;
        }
    }
    
    /**
     * AI虫虫发射子弹（随机方向）
     */
    aiFireBullet(worm) {
        if (!worm || !worm.isAlive || worm.segments.length < 2) return;
        if (!worm.bulletCount || worm.bulletCount <= 0) return;
        if (!worm.blueSegments || worm.blueSegments <= 0) return;
        
        // 计算射击方向（基于头部到第二段的方向，加随机偏移）
        const head = worm.segments[0];
        const next = worm.segments[1];
        let angle = Math.atan2(head.y - next.y, head.x - next.x);
        angle += (Math.random() - 0.5) * 0.5;  // 随机偏移±0.25弧度
        
        const direction = new Vector(Math.cos(angle), Math.sin(angle));
        const bulletPos = head.add(direction.mult(CONFIG.SEGMENT_RADIUS + 5));
        
        this.bullets.push(new Bullet(bulletPos.x, bulletPos.y, direction));
        worm.bulletCount--;
        
        // 每射1发子弹，减少第一个蓝色段的强度
        for (let i = 0; i < worm.blueStrengths.length; i++) {
            if (worm.blueStrengths[i] > 0) {
                worm.blueStrengths[i]--;
                if (worm.blueStrengths[i] === 0) {
                    // 蓝色段用完，移除
                    worm.blueSegments--;
                    worm.blueStrengths.splice(i, 1);
                    // 移除该节身体
                    if (worm.segments.length > 3) {
                        worm.segments.pop();
                        worm.targetLength = worm.segments.length;
                    }
                    worm.syncBlueToBody();  // 同步弹舱状态
                }
                break;
            }
        }
    }
    
    /**
     * 更新移动端鼠标指示器
     */
    updateMouseIndicator() {
        if (!this.isTouchDevice) return;
        
        const indicator = this.ui.mouseIndicator;
        if (!indicator) return;
        
        // 获取玩家头部位置
        const player = this.worms[0];
        if (!player) return;
        
        // 检查玩家是否静止（速度接近0）
        const speed = player.velocity.mag();
        const isStationary = speed < 0.1;
        
        // 获取鼠标位置（摇杆控制的方向）
        let indicatorX, indicatorY;
        
        if (isStationary) {
            // 静止时：不显示指示器（隐藏）
            indicator.style.opacity = '0';
            return;
        }
        
        // 移动时：显示指示器（在摇杆方向的前方）
        if (this.joystickDirection && this.joystickDirection.mag() > 0) {
            const head = player.head;
            const dir = this.joystickDirection;
            indicatorX = head.x + dir.x * 100;
            indicatorY = head.y + dir.y * 100;
        } else {
            // 如果没有摇杆方向，使用鼠标位置
            if (this.mousePos) {
                indicatorX = this.mousePos.x;
                indicatorY = this.mousePos.y;
            } else {
                return;
            }
        }
        
        // 世界坐标 → 屏幕坐标（通过相机转换）
        const screen = this.camera.worldToScreen(indicatorX, indicatorY);
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / CONFIG.CANVAS_WIDTH;
        const scaleY = rect.height / CONFIG.CANVAS_HEIGHT;
        const screenX = rect.left + screen.x * scaleX;
        const screenY = rect.top + screen.y * scaleY;
        
        // 更新指示器位置
        indicator.style.left = screenX + 'px';
        indicator.style.top = screenY + 'px';
        indicator.style.opacity = '1';
    }
    
    /**
     * 总控AI：检测AI虫虫是否聚集，如果聚集就让它们分散
     */
    updateAIDispersal() {
        // 获取所有存活的AI虫虫（排除segments为空的）
        const aiWorms = this.worms.filter(w => w.isAlive && !w.isPlayer && w.segments.length > 0);
        if (aiWorms.length < 2) return;  // 少于2条AI不检测
        
        // 计算所有AI虫虫的中心点
        let centerX = 0, centerY = 0;
        for (const worm of aiWorms) {
            centerX += worm.head.x;
            centerY += worm.head.y;
        }
        centerX /= aiWorms.length;
        centerY /= aiWorms.length;
        
        // 计算平均距离（与中心点的距离）
        let totalDist = 0;
        for (const worm of aiWorms) {
            const dx = worm.head.x - centerX;
            const dy = worm.head.y - centerY;
            totalDist += Math.sqrt(dx * dx + dy * dy);
        }
        const avgDist = totalDist / aiWorms.length;
        
        // 如果平均距离小于阈值（聚集），让大部分虫虫分散
        const dispersalThreshold = 80;  // 聚集阈值（降低到80，更容易触发）
        if (avgDist < dispersalThreshold) {
            // 让大部分AI虫虫分散（60%概率）
            for (const worm of aiWorms) {
                if (Math.random() < 0.6) {  // 60% 的概率触发分散（提高）
                    // 计算远离中心的方向
                    const awayX = worm.head.x - centerX;
                    const awayY = worm.head.y - centerY;
                    const dist = Math.sqrt(awayX * awayX + awayY * awayY);
                    
                    if (dist > 0) {
                        // 设置远离中心的随机方向（更大角度偏移）
                        const randomAngle = (Math.random() - 0.5) * Math.PI * 1.5;  // ±135度随机偏移
                        const cos = Math.cos(randomAngle);
                        const sin = Math.sin(randomAngle);
                        worm.aiWanderDir = new Vector(
                            (awayX * cos - awayY * sin) / dist,
                            (awayX * sin + awayY * cos) / dist
                        );
                    } else {
                        worm.aiWanderDir = Vector.randomDir();
                    }
                    
                    worm.aiWanderTimer = 3 + Math.random() * 2;  // 保持分散方向 3-5 秒
                }
            }
        }
    }

    /**
     * 处理咬尾诞生后代：被咬者断尾
     * @param {Worm} worm - 被咬的虫虫
     * @param {number} biteIndex - 被咬的段索引
     */
    handleTailBiteSplit(worm, biteIndex) {
        // 从被咬的段开始，保留尾巴部分
        const tailSegments = worm.segments.slice(biteIndex);

        if (tailSegments.length < 3) {

            return;
        }

        // 被咬的虫虫：删除尾巴段（从 biteIndex 开始）
        worm.segments = worm.segments.slice(0, biteIndex);
        worm.targetLength = worm.segments.length;
        worm.syncBlueToBody();  // 同步弹舱状态

        // 如果剩余段太少（< 3），虫虫死亡
        if (worm.segments.length < 3) {

            if (worm.isPlayer) {
                this.gameOver('eaten');
            } else {
                worm.isAlive = false;
                worm.segments = [];
            }
            return;
        }

        // 创建断尾（保存父代引用）
        const brokenTail = new BrokenTail(tailSegments, worm.color, worm);
        brokenTail.birthMethod = 'tail-bite';  // 标记诞生方式
        this.brokenTails.push(brokenTail);


    }

    /**
     * 处理颈部被咬死亡：从被咬处断开，两部分身体柔软无力地下沉
     * @param {Worm} worm - 被咬的虫虫
     * @param {number} biteIndex - 被咬的段索引
     */
    handleNeckBiteDeath(worm, biteIndex) {
        // 从被咬处断开：保留头部段（0 ~ biteIndex-1）和尾巴段（biteIndex ~ end）
        const headSegments = worm.segments.slice(0, biteIndex);
        const tailSegments = worm.segments.slice(biteIndex);

        // 预创建尸体
        const bodies = [];
        if (headSegments.length > 0) {
            bodies.push(new DeadBody(headSegments, worm.color));
        }
        if (tailSegments.length > 0) {
            bodies.push(new DeadBody(tailSegments, worm.color));
        }

        if (worm.isPlayer) {
            // 玩家死亡走统一入口
            this.gameOver('neckBite', bodies);
        } else {
            // AI 死亡：直接处理
            worm.isAlive = false;
            worm.segments = [];
            for (const body of bodies) {
                this.deadBodies.push(body);
            }
        }
    }

    /**
     * 处理自噬诞生后代（原有逻辑）
     */
    handleSplit(worm, collisionIndex) {
        const keptSegments = worm.segments.slice(0, collisionIndex);
        const tailSegments = worm.segments.slice(collisionIndex);

        // 双向保护：断尾和本体都至少保留3节，否则不执行
        if (tailSegments.length < 3 || keptSegments.length < 3) return;

        worm.segments = keptSegments;
        worm.targetLength = keptSegments.length;
        worm.syncBlueToBody();  // 同步弹舱状态

        const brokenTail = new BrokenTail(tailSegments, worm.color, worm);
        this.brokenTails.push(brokenTail);
        
        // 第一次诞生后代时显示亲子提示
        if (!this.familyNoticeShown) {
            this.familyNoticeShown = true;
            this.showFamilyNotice();
        }
    }

    showSplitNotice() {
        const notice = document.getElementById('splitNotice');
        notice.style.display = 'block';
        notice.style.animation = 'none';
        notice.offsetHeight;
        notice.style.animation = 'fadeInOut 2s ease-in-out';
        setTimeout(() => { notice.style.display = 'none'; }, 2000);
    }
    
    showFamilyNotice() {
        const notice = document.getElementById('familyNotice');
        notice.style.display = 'block';
        notice.style.animation = 'none';
        notice.offsetHeight;
        notice.style.animation = 'fadeInOut 4s ease-in-out';
        setTimeout(() => { notice.style.display = 'none'; }, 4000);
    }

    /**
     * 触发屏幕震动
     * @param {number} intensity - 震动强度（像素）
     * @param {number} duration - 震动持续时间（秒）
     */
    triggerScreenShake(intensity, duration) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.timer = duration;
    }

    /**
     * 更新屏幕震动
     */
    updateScreenShake(dt) {
        if (this.screenShake.timer > 0) {
            this.screenShake.timer -= dt;
            if (this.screenShake.timer < 0) this.screenShake.timer = 0;
        }
    }

    /**
     * 获取当前震动偏移量
     */
    getShakeOffset() {
        if (this.screenShake.timer <= 0) return { x: 0, y: 0 };
        const progress = this.screenShake.timer / this.screenShake.duration;
        const currentIntensity = this.screenShake.intensity * progress;
        return {
            x: (Math.random() - 0.5) * 2 * currentIntensity,
            y: (Math.random() - 0.5) * 2 * currentIntensity,
        };
    }

    /**
     * 创建波纹特效
     */
    createRipple(x, y, color, maxRadius, duration) {
        this.ripples.push({
            x, y, color,
            radius: 5,
            maxRadius,
            alpha: 0.6,
            timer: 0,
            duration,
        });
    }

    /**
     * 更新波纹特效
     */
    updateRipples(dt) {
        let w = 0;
        for (let i = 0; i < this.ripples.length; i++) {
            const r = this.ripples[i];
            r.timer += dt;
            const progress = r.timer / r.duration;
            if (progress >= 1) continue;
            r.radius = 5 + (r.maxRadius - 5) * progress;
            r.alpha = 0.6 * (1 - progress);
            this.ripples[w++] = r;
        }
        this.ripples.length = w;
    }

    /**
     * 绘制波纹特效（在世界坐标中绘制）
     */
    drawRipples() {
        for (const r of this.ripples) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = r.color.replace('ALPHA', r.alpha.toFixed(2));
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }

    // 敌人系统更新
    updateEnemies(dt, player) {
        // 生成敌人
        this.spawnEnemies(dt, player);

        // === Phase 3a: Boss系统 ===
        this.updateBosses(dt, player);
        
        // 更新敌人（紧凑过滤替代splice）
        const juveniles = this.worms.filter(w => w.isAlive && w.isJuvenile && (!w.deathPhase || w.deathPhase === 'none'));
        {
            let w = 0;
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                enemy.update(dt, juveniles, player);
                
                // 检测敌人与幼体碰撞
                if (!enemy.latchedJuvenile) {
                    for (const worm of this.worms) {
                        if (!worm.isAlive || !worm.isJuvenile) continue;
                        const segIndex = enemy.checkCollisionWithJuvenile(worm);
                        if (segIndex >= 0) {
                            enemy.latch(worm, segIndex);
                            // 调试日志：敌人咬住幼体
                            this.debugLogger.logEnemyLatch(enemy, worm, segIndex, this.gameTime);
                            break;
                        }
                    }
                }
                
                // 检测敌人与玩家（成年体）碰撞 - 全身碰撞，头部碰撞双向伤害
                if (player && player.isAlive && !player.isJuvenile && !enemy.isDying) {
                    const hitSeg = enemy.checkCollisionWithPlayer(player);
                    if (hitSeg >= 0) {
                        player.adultHitCount++;
                        // 调试日志：玩家被敌人撞击
                        this.debugLogger.logAdultHitByEnemy(player, enemy, player.adultHitCount, this.gameTime);
                        // 只有虫虫头部撞到敌人才双向伤害
                        if (hitSeg === 0) {
                            const phx = enemy.pos.x - player.head.x;
                            const phy = enemy.pos.y - player.head.y;
                            const phd = Math.sqrt(phx * phx + phy * phy);
                            const hitDir = new Vector(phd > 0 ? phx / phd : 0, phd > 0 ? phy / phd : 0);
                            const killed = enemy.takeDamage(hitDir);
                            if (killed) {
                                this.debugLogger.logEnemyDeath(enemy, this.gameTime);
                                this.floatingTexts.push(FloatingText.acquire(enemy.segments[0].x, enemy.segments[0].y - 20, 'KILL!', '#ff6b6b'));
                            } else {
                                this.debugLogger.logEnemyHit(enemy, enemy.health, this.gameTime);
                                this.floatingTexts.push(FloatingText.acquire(enemy.segments[0].x, enemy.segments[0].y - 20, `${enemy.health}/${enemy.maxHealth}`, '#ffa500'));
                            }
                        }
                        if (player.adultHitCount >= CONFIG.FAMILY.ADULT_HITS_TO_LOSE) {
                            player.adultHitCount = 0;
                            if (player.segments.length > 3) {
                                player.segments.pop();
                                player.targetLength = player.segments.length;
                                player.syncBlueToBody();  // 同步弹舱状态
                                this.debugLogger.logAdultLoseSegment(player, this.gameTime);
                            }
                        }
                    }
                }

                // 检测敌人与AI成年体虫虫碰撞（AI保护幼体时撞向敌人）
                for (const worm of this.worms) {
                    if (!worm.isAlive || worm.isPlayer || worm.isJuvenile || !worm.head) continue;
                    if (enemy.isDying) continue;
                    const aiHitSeg = enemy.checkCollisionWithPlayer(worm);
                    if (aiHitSeg >= 0) {
                        worm.adultHitCount++;
                        this.debugLogger.logAdultHitByEnemy(worm, enemy, worm.adultHitCount, this.gameTime);
                        // 只有虫虫头部撞到敌人才双向伤害
                        if (aiHitSeg === 0) {
                            const whx = enemy.pos.x - worm.head.x;
                            const why = enemy.pos.y - worm.head.y;
                            const whd = Math.sqrt(whx * whx + why * why);
                            const hitDir = new Vector(whd > 0 ? whx / whd : 0, whd > 0 ? why / whd : 0);
                            const killed = enemy.takeDamage(hitDir);
                            if (killed) {
                                this.floatingTexts.push(FloatingText.acquire(enemy.segments[0].x, enemy.segments[0].y - 20, 'KILL!', '#ff6b6b'));
                                this.debugLogger.logEnemyDeath(enemy, this.gameTime);
                            } else {
                                this.floatingTexts.push(FloatingText.acquire(enemy.segments[0].x, enemy.segments[0].y - 20, `${enemy.health}/${enemy.maxHealth}`, '#ffa500'));
                                this.debugLogger.logEnemyHit(enemy, enemy.health, this.gameTime);
                            }
                        }
                        if (worm.adultHitCount >= CONFIG.FAMILY.ADULT_HITS_TO_LOSE) {
                            worm.adultHitCount = 0;
                            if (worm.segments.length > 3) {
                                worm.segments.pop();
                                worm.targetLength = worm.segments.length;
                                worm.syncBlueToBody();
                                this.debugLogger.logAdultLoseSegment(worm, this.gameTime);
                            }
                        }
                    }
                }
                
                // 保留存活的敌人
                if (enemy.isAlive) {
                    this.enemies[w++] = enemy;
                }
            }
            this.enemies.length = w;
        }
        
        // 检测幼体吃尾巴
        this.checkJuvenileEatBrokenTails();
        this.checkJuvenileEatShrinkingSegments();
    }

    /**
     * Phase E: 区域切换处理 — 暂存旧区域实体，恢复新区域实体
     */
    _handleZoneTransition(fromZoneId, toZoneId, player) {
        const zm = this.zoneManager;

        // Phase 3c: 主题背景切换
        const toZoneTheme = zm.zones[toZoneId - 1]?.theme || 'default';
        if (toZoneTheme !== this._currentTheme) {
            const themeCfg = getThemeConfig(toZoneTheme);
            if (themeCfg) {
                this.bg.transitionTo(themeCfg, 1.2);  // 1.2秒平滑过渡
            } else {
                // 没有专用配置（default），使用默认配置快速切换
                this.bg.applyConfig(this.bg._defaultConfig());
            }
            this._currentTheme = toZoneTheme;
        }
        // 暂存离开区域的食物和敌人
        const fromZone = zm.zones[fromZoneId - 1];
        if (fromZone) {
            const storedFoods = [];
            let w = 0;
            for (let i = 0; i < this.foods.length; i++) {
                const food = this.foods[i];
                if (food.pos.x >= fromZone.x && food.pos.x <= fromZone.x + fromZone.width &&
                    food.pos.y >= fromZone.y && food.pos.y <= fromZone.y + fromZone.height) {
                    storedFoods.push(food);
                } else {
                    this.foods[w++] = food;
                }
            }
            this.foods.length = w;

            const storedEnemies = [];
            w = 0;
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                if (enemy.homeZone && enemy.homeZone.x === fromZone.x && enemy.homeZone.y === fromZone.y &&
                    enemy.isAlive && !enemy.isDying) {
                    storedEnemies.push(enemy);
                } else {
                    this.enemies[w++] = enemy;
                }
            }
            this.enemies.length = w;

            // Phase 3a: 缓存Boss
            const storedBosses = [];
            let bw = 0;
            for (let i = 0; i < this.bosses.length; i++) {
                const boss = this.bosses[i];
                if (boss.homeZone && boss.homeZone.x === fromZone.x && boss.homeZone.y === fromZone.y) {
                    storedBosses.push(boss);
                } else {
                    this.bosses[bw++] = boss;
                }
            }
            this.bosses.length = bw;

            // Phase 3b: 缓存障碍物
            const storedObstacles = [];
            this.obstacles = this.obstacles.filter(obs => {
                if (obs.homeZone && obs.homeZone.x === fromZone.x && obs.homeZone.y === fromZone.y) {
                    storedObstacles.push(obs);
                    return false;
                }
                return true;
            });

            if (storedFoods.length > 0 || storedEnemies.length > 0 || storedBosses.length > 0 || storedObstacles.length > 0) {
                zm.zoneEntityCache.set(fromZoneId, { foods: storedFoods, enemies: storedEnemies, bosses: storedBosses, obstacles: storedObstacles });
            }
        }

        // 恢复目标区域的缓存实体
        const toZone = zm.zones[toZoneId - 1];
        if (toZone) {
            const cached = zm.zoneEntityCache.get(toZoneId);
            if (cached) {
                for (const food of cached.foods) this.foods.push(food);
                for (const enemy of cached.enemies) this.enemies.push(enemy);
                if (cached.bosses) {
                    for (const boss of cached.bosses) this.bosses.push(boss);
                }
                if (cached.obstacles) {
                    for (const obs of cached.obstacles) this.obstacles.push(obs);
                }
                zm.zoneEntityCache.delete(toZoneId);
                this.debugLogger._log('ZONE_ENTER', `进入区域 ${toZoneId} (恢复 ${cached.foods.length} 宝珠, ${cached.enemies.length} 敌人, ${(cached.bosses||[]).length} Boss, ${(cached.obstacles||[]).length} 障碍物)`, {}, this.gameTime);
            } else {
                this.debugLogger._log('ZONE_ENTER', `进入区域 ${toZoneId}`, {}, this.gameTime);
            }
        }
    }

    /**
     * Phase E: 检查回访已通关区域的隐藏奖励
     */
    _checkRevisitReward(player) {
        const zm = this.zoneManager;
        const zoneId = zm.currentZoneId;
        const zone = zm.zones[zoneId - 1];
        if (!zone || zone.status !== 'completed') return;
        if (zm.revisitRewards.has(zoneId)) return;

        // 首次回访已通关区域 → 给隐藏奖励
        zm.revisitRewards.add(zoneId);
        const cx = player.head ? player.head.x : 400;
        const cy = player.head ? player.head.y : 2800;
        // 生成3个高级宝珠作为奖励
        const rewardTypes = CONFIG.FOOD_TYPES.filter(t => t.score >= 30 && t.score <= 120);
        for (let i = 0; i < 3; i++) {
            const rType = rewardTypes[i % rewardTypes.length];
            const reward = Food.inZone(zone, rType);
            this.foods.push(reward);
        }
        this.floatingTexts.push(FloatingText.acquire(cx, cy - 50, '🎁 回访奖励！', '#ffd700'));
        for (let k = 0; k < 20; k++) {
            this.particles.push(Particle.acquire(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 60, '#ffd700'));
        }
        this.debugLogger._log('REVISIT_REWARD', `🎁 区域 ${zoneId} 回访奖励`, {}, this.gameTime);
    }

    // 生成敌人（Phase C: 区域化生成）
    spawnEnemies(dt, player) {
        const hasJuvenile = this.worms.some(w => w.isAlive && w.isJuvenile);
        // 获取玩家当前区域
        const currentZone = this.zoneManager ? this.zoneManager.zones[this.zoneManager.currentZoneId - 1] : null;
        // 计算当前区域内的敌人数
        let enemiesInZone = 0;
        if (currentZone) {
            for (const e of this.enemies) {
                if (!e.isAlive || e.isDying) continue;
                if (e.homeZone && e.homeZone.x === currentZone.x && e.homeZone.y === currentZone.y) {
                    enemiesInZone++;
                }
            }
        }
        if (hasJuvenile) {
            // 动态最大敌人数量：幼体≥阈值节数时允许2只，否则1只
            const threshold = CONFIG.FAMILY.ENEMY_JUVENILE_SEG_THRESHOLD;
            const hasLargeJuvenile = this.worms.some(w => w.isAlive && w.isJuvenile && w.segments.length >= threshold);
            const baseMax = hasLargeJuvenile ? 2 : 1;
            const zoneMaxEnemy = currentZone ? Math.max(1, Math.round(baseMax * currentZone.enemyMultiplier)) : baseMax;
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0 && enemiesInZone < zoneMaxEnemy) {
                this.enemySpawnTimer = CONFIG.ZONE.ENEMY_SPAWN_INTERVAL / (currentZone ? currentZone.enemyMultiplier : 1);
                let x, y;
                if (currentZone) {
                    // Phase C: 在当前区域内生成敌人
                    const pad = CONFIG.ZONE.ZONE_PADDING;
                    x = currentZone.x + pad + Math.random() * (currentZone.width - pad * 2);
                    y = currentZone.y + pad + Math.random() * (currentZone.height - pad * 2);
                } else {
                    // 降级：在地图范围内生成
                    const margin = CONFIG.BORDER_MARGIN;
                    x = margin + Math.random() * (CONFIG.MAP_WIDTH - margin * 2);
                    y = margin + Math.random() * (CONFIG.MAP_HEIGHT - margin * 2);
                }
                const newEnemy = new Enemy(x, y);
                // 设置区域锁定
                if (currentZone && CONFIG.ZONE.LOCK_ENEMY_TO_ZONE) {
                    newEnemy.homeZone = currentZone;
                }
                this.enemies.push(newEnemy);
                this.debugLogger.logEnemySpawn(newEnemy, this.gameTime);
            }
        }
    }

    // === Phase 3a: Boss系统 ===
    updateBosses(dt, player) {
        if (!player || !player.isAlive) return;

        // Boss生成：进入Boss区域时自动召唤
        const currentZone = this.zoneManager ? this.zoneManager.zones[this.zoneManager.currentZoneId - 1] : null;
        if (currentZone && currentZone.zoneType === 'boss' && !this.bossSpawned.has(currentZone.id)) {
            this.bossSpawned.add(currentZone.id);
            const boss = createBoss(currentZone.id, currentZone.centerX, currentZone.centerY);
            if (boss) {
                boss.homeZone = currentZone;
                this.bosses.push(boss);
                this.debugLogger._log('BOSS_SPAWN', `Boss ${boss.bossName} 出现在区域 ${currentZone.id}`, {}, this.gameTime);
                this.triggerScreenShake(8, 0.8);
                // 清除区域内普通敌人
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const e = this.enemies[i];
                    if (e.homeZone && e.homeZone.x === currentZone.x && e.homeZone.y === currentZone.y) {
                        e.isAlive = false;
                    }
                }
            }
        }

        const playerPos = player.head;

        // 更新Boss（紧凑过滤）
        let bw = 0;
        for (let i = 0; i < this.bosses.length; i++) {
            const boss = this.bosses[i];
            boss.update(dt, playerPos);

            // Boss与玩家子弹碰撞
            if (boss.isAlive && boss.state !== BOSS_STATE.DYING && boss.state !== BOSS_STATE.SPAWNING) {
                let bulletW = 0;
                for (let j = 0; j < this.bullets.length; j++) {
                    const bullet = this.bullets[j];
                    let bulletConsumed = false;

                    // 护盾检测（水晶守卫/虫后）
                    if (boss.checkShieldHit && boss.checkShieldHit(bullet.pos, bullet.radius)) {
                        bulletConsumed = true;
                    }
                    // Boss本体碰撞
                    else if (boss.checkBulletCollision(bullet.pos, bullet.radius)) {
                        const bx = boss.pos.x - bullet.pos.x;
                        const by = boss.pos.y - bullet.pos.y;
                        const bd = Math.sqrt(bx * bx + by * by);
                        const hitDir = new Vector(bd > 0 ? bx / bd : 0, bd > 0 ? by / bd : 0);
                        const killed = boss.takeDamage(hitDir);
                        bulletConsumed = true;
                        if (killed) {
                            this.floatingTexts.push(FloatingText.acquire(boss.pos.x, boss.pos.y - 30, `BOSS KILL!`, '#ffd700'));
                            this.debugLogger._log('BOSS_KILL', `${boss.bossName} 被击杀`, {}, this.gameTime);
                            // 掉落大量宝珠
                            for (let k = 0; k < 10; k++) {
                                const type = CONFIG.FOOD_TYPES[Math.floor(Math.random() * 3) + 1];
                                const angle = Math.random() * Math.PI * 2;
                                const dist = 30 + Math.random() * 60;
                                const food = new Food(boss.pos.x + Math.cos(angle) * dist, boss.pos.y + Math.sin(angle) * dist, type);
                                this.foods.push(food);
                            }
                        } else {
                            this.floatingTexts.push(FloatingText.acquire(boss.pos.x, boss.pos.y - 30, `${boss.health}/${boss.maxHealth}`, '#ff8c42'));
                        }
                    }

                    if (!bulletConsumed) {
                        this.bullets[bulletW++] = bullet;
                    }
                }
                this.bullets.length = bulletW;
            }

            // Boss与玩家碰撞（身体接触伤害）
            if (boss.isAlive && boss.state !== BOSS_STATE.DYING && player && player.isAlive && !player.isJuvenile) {
                for (let s = 0; s < player.segments.length; s++) {
                    if (boss.checkPlayerCollision(player.segments[s], CONFIG.SEGMENT_RADIUS)) {
                        // 头部碰撞对Boss造成伤害
                        if (s === 0 && boss.invincibleTimer <= 0) {
                            const hdx = boss.pos.x - player.head.x;
                            const hdy = boss.pos.y - player.head.y;
                            const hd = Math.sqrt(hdx * hdx + hdy * hdy);
                            const hitDir = new Vector(hd > 0 ? hdx / hd : 0, hd > 0 ? hdy / hd : 0);
                            boss.takeDamage(hitDir);
                        }
                        // Boss对玩家造成伤害
                        if (player.invincibleTimer <= 0) {
                            player.adultHitCount++;
                            if (player.adultHitCount >= CONFIG.FAMILY.ADULT_HITS_TO_LOSE) {
                                player.adultHitCount = 0;
                                if (player.segments.length > 3) {
                                    player.segments.pop();
                                    player.targetLength = player.segments.length;
                                    player.syncBlueToBody();
                                }
                            }
                            // 击退玩家
                            const dx = player.head.x - boss.pos.x;
                            const dy = player.head.y - boss.pos.y;
                            const d = Math.sqrt(dx * dx + dy * dy);
                            player.invincibleTimer = 0.5;
                        }
                        break;
                    }
                }
            }

            // 蛛母特殊：蛛网减速检测
            if (boss.checkWebSlow && playerPos) {
                const slowFactor = boss.checkWebSlow(playerPos);
                if (slowFactor < 1 && player.slowStacks < 3) {
                    player.slowStacks++;
                    player.slowTimer = CONFIG.BOSS.SPIDER.WEB_SLOW_DURATION;
                }
            }

            // 炎龙蜥特殊：火焰吐息和岩浆路径检测
            if (boss.checkBreathCollision && playerPos) {
                if (boss.checkBreathCollision(playerPos, CONFIG.SEGMENT_RADIUS)) {
                    if (player.invincibleTimer <= 0) {
                        player.adultHitCount += 2;
                        player.invincibleTimer = 1.0;
                        if (player.adultHitCount >= CONFIG.FAMILY.ADULT_HITS_TO_LOSE) {
                            player.adultHitCount = 0;
                            if (player.segments.length > 3) {
                                player.segments.pop();
                                player.targetLength = player.segments.length;
                                player.syncBlueToBody();
                            }
                        }
                    }
                }
            }
            if (boss.checkLavaCollision && playerPos) {
                if (boss.checkLavaCollision(playerPos, CONFIG.SEGMENT_RADIUS)) {
                    if (player.invincibleTimer <= 0) {
                        player.adultHitCount++;
                        player.invincibleTimer = 0.8;
                        if (player.adultHitCount >= CONFIG.FAMILY.ADULT_HITS_TO_LOSE) {
                            player.adultHitCount = 0;
                            if (player.segments.length > 3) {
                                player.segments.pop();
                                player.targetLength = player.segments.length;
                                player.syncBlueToBody();
                            }
                        }
                    }
                }
            }

            // 保留存活的Boss
            if (boss.state !== BOSS_STATE.DEAD) {
                this.bosses[bw++] = boss;
            }
        }
        this.bosses.length = bw;
    }

    // === Phase 3b: 障碍物系统 ===
    updateObstacles(dt, player) {
        if (!player || !player.isAlive) return;

        // 障碍物生成：进入新区域时按配置生成
        const currentZone = this.zoneManager ? this.zoneManager.zones[this.zoneManager.currentZoneId - 1] : null;
        if (currentZone && !this.obstaclesGenerated.has(currentZone.id) && currentZone.obstacleCount > 0) {
            this.obstaclesGenerated.add(currentZone.id);
            const types = currentZone.obstacleTypes || [];
            const count = currentZone.obstacleCount || 0;
            if (types.length > 0 && count > 0) {
                const newObs = generateObstacles(currentZone, types, count);
                for (const obs of newObs) {
                    this.obstacles.push(obs);
                }
                if (newObs.length > 0) {
                    this.debugLogger._log('OBSTACLE_SPAWN', `区域 ${currentZone.id} 生成 ${newObs.length} 个障碍物`, {}, this.gameTime);
                }
            }
        }

        // 更新障碍物动画和伤害计时器
        for (const obs of this.obstacles) {
            obs.update(dt);
            obs.updateDamageTimers(dt);
        }

        // 障碍物与所有虫虫的碰撞检测
        const allWorms = this.worms.filter(w => w.isAlive && w.segments.length > 0);
        for (const obs of this.obstacles) {
            if (!obs.isAlive) continue;

            for (const worm of allWorms) {
                if (worm.invincibleTimer > 0) continue;  // 无敌虫虫不受影响

                const headPos = worm.head;
                if (!headPos) continue;

                // 固体障碍物碰撞（岩石/水晶刺）—— 推开虫虫
                if (obs.type === OBSTACLE_TYPE.ROCK || obs.type === OBSTACLE_TYPE.CRYSTAL_SPIKE) {
                    for (let s = 0; s < worm.segments.length; s++) {
                        const seg = worm.segments[s];
                        const push = obs.checkSolidCollision(seg, CONFIG.SEGMENT_RADIUS);
                        if (push) {
                            // 推开段
                            seg.x += push.nx * push.overlap;
                            seg.y += push.ny * push.overlap;
                            // 头部碰撞有额外效果
                            if (s === 0 && worm.isPlayer) {
                                // 减速效果
                                if (!worm._obstacleSlowTimer || worm._obstacleSlowTimer <= 0) {
                                    worm._obstacleSlowTimer = 0.3;
                                    // 轻微减速
                                    if (worm.slowStacks < 1) {
                                        worm.slowStacks = 1;
                                        worm.slowTimer = 0.3;
                                        worm.updateSpeed();
                                    }
                                }
                            }
                        }
                    }
                }

                // 荆棘：减速+周期伤害
                if (obs.type === OBSTACLE_TYPE.THORN) {
                    if (obs.checkCollision(headPos, CONFIG.SEGMENT_RADIUS)) {
                        // 减速
                        if (worm.slowStacks < 2) {
                            worm.slowStacks++;
                            worm.slowTimer = obs.cfg.SLOW_DURATION;
                            worm.updateSpeed();
                        }
                        // 周期伤害
                        if (obs.shouldDamage(worm)) {
                            if (worm.segments.length > 3) {
                                worm.segments.pop();
                                worm.targetLength = worm.segments.length;
                                if (worm.isPlayer) worm.syncBlueToBody();
                                this.floatingTexts.push(FloatingText.acquire(headPos.x, headPos.y - 20, '🌿 荆棘!', '#4a8a3a'));
                                for (let k = 0; k < 4; k++) {
                                    this.particles.push(Particle.acquire(headPos.x, headPos.y, '#4a8a3a'));
                                }
                            }
                        }
                    }
                }

                // 岩浆池：周期伤害
                if (obs.type === OBSTACLE_TYPE.LAVA_POOL) {
                    if (obs.checkCollision(headPos, CONFIG.SEGMENT_RADIUS)) {
                        if (obs.shouldDamage(worm)) {
                            if (worm.segments.length > 3) {
                                worm.segments.pop();
                                worm.targetLength = worm.segments.length;
                                if (worm.isPlayer) worm.syncBlueToBody();
                                this.floatingTexts.push(FloatingText.acquire(headPos.x, headPos.y - 20, '🔥 灼烧!', '#ff4500'));
                                for (let k = 0; k < 5; k++) {
                                    this.particles.push(Particle.acquire(headPos.x, headPos.y, '#ff4500'));
                                }
                            }
                        }
                    }
                }

                // 虚空裂隙：拉扯+伤害
                if (obs.type === OBSTACLE_TYPE.VOID_RIFT) {
                    // 拉扯所有段
                    for (const seg of worm.segments) {
                        const pull = obs.getPullForce(seg);
                        if (pull) {
                            seg.x += pull.fx;
                            seg.y += pull.fy;
                        }
                    }
                    // 核心范围内周期伤害
                    if (obs.checkCollision(headPos, CONFIG.SEGMENT_RADIUS)) {
                        if (obs.shouldDamage(worm)) {
                            if (worm.segments.length > 3) {
                                worm.segments.pop();
                                worm.targetLength = worm.segments.length;
                                if (worm.isPlayer) worm.syncBlueToBody();
                                this.floatingTexts.push(FloatingText.acquire(headPos.x, headPos.y - 20, '🌀 虚空!', '#c7ceea'));
                                for (let k = 0; k < 5; k++) {
                                    this.particles.push(Particle.acquire(headPos.x, headPos.y, '#c7ceea'));
                                }
                            }
                        }
                    }
                }
            }

            // 障碍物与敌人的碰撞（只做固体推开）
            if (obs.type === OBSTACLE_TYPE.ROCK || obs.type === OBSTACLE_TYPE.CRYSTAL_SPIKE) {
                for (const enemy of this.enemies) {
                    if (!enemy.isAlive || enemy.isDying) continue;
                    if (!enemy.segments || enemy.segments.length === 0) continue;
                    const eHead = enemy.segments[0];
                    const push = obs.checkSolidCollision(eHead, enemy.size);
                    if (push) {
                        eHead.x += push.nx * push.overlap;
                        eHead.y += push.ny * push.overlap;
                    }
                }
            }
        }

        // 清理已销毁的障碍物（紧凑过滤）
        this.obstacles = this.obstacles.filter(obs => obs.isAlive || obs.fragments.length > 0);

        // 海底生态边界墙碰撞检测
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.segments.length === 0) continue;
            const result = this.zoneDecorations.checkWormCollision(worm);
            if (result && result.damage) {
                if (worm.segments.length > 3) {
                    worm.segments.pop();
                    worm.targetLength = worm.segments.length;
                    if (worm.isPlayer) worm.syncBlueToBody();
                }
                const headPos = worm.head;
                if (headPos) {
                    this.floatingTexts.push(FloatingText.acquire(headPos.x, headPos.y - 20, result.text, result.color));
                    for (let k = 0; k < 4; k++) {
                        this.particles.push(Particle.acquire(headPos.x, headPos.y, result.color));
                    }
                }
            }
            // 沙层互动碰撞（不造成伤害，只产生粒子和形变）
            this.zoneDecorations.checkSandCollision(worm);
        }
    }

    // 幼体成年逻辑（提取重复代码）
    matureJuvenile(worm) {
        worm.isJuvenile = false;
        worm.invincibleTimer = 10.0;  // 成年后给10秒无敌，防止刚成年就被碰死
        this.debugLogger.logJuvenileMature(worm, this.gameTime);
        // 成年动画：释放咬住的敌人
        for (const e of this.enemies) {
            if (e.latchedJuvenile === worm) {
                e.release();
            }
        }
        worm.bittenSegments.clear();
        worm.isStruggling = false;
        // 成年粒子特效
        const headPos = worm.head;
        if (headPos) {
            for (let k = 0; k < 12; k++) {
                this.particles.push(Particle.acquire(headPos.x, headPos.y, '#ffd700'));
            }
            this.floatingTexts.push(FloatingText.acquire(headPos.x, headPos.y - 30, '🦋 成年了！', '#ffd700'));
        }
    }

    // 检测幼体吃尾巴（brokenTails）
    checkJuvenileEatBrokenTails() {
        for (const worm of this.worms) {
            if (!worm.isAlive || !worm.isJuvenile || !worm.head) continue;
            if (worm.feedCooldown > 0) continue;  // 冷却中不吃
            for (let j = this.brokenTails.length - 1; j >= 0; j--) {
                const tail = this.brokenTails[j];
                if (!tail.segments || tail.segments.length === 0) continue;
                // 只允许同父代的幼体吃断尾（父代已死的断尾任何幼体都能吃）
                if (tail.parentWorm && tail.parentWorm.isAlive && worm.parentWorm !== tail.parentWorm) continue;
                const dist = worm.head.dist(tail.segments[0]);
                if (dist < CONFIG.FAMILY.JUVENILE_EAT_RADIUS) {
                    if (worm.segments.length < CONFIG.FAMILY.JUVENILE_MAX_LENGTH + 1) {
                        const lastSeg = worm.segments[worm.segments.length - 1];
                        worm.segments.push(new Vector(lastSeg.x, lastSeg.y));
                        worm.targetLength = worm.segments.length;
                        if (worm.segments.length > CONFIG.FAMILY.JUVENILE_MAX_LENGTH) {
                            this.matureJuvenile(worm);
                        }
                    }
                    worm.feedCooldown = CONFIG.FAMILY.JUVENILE_FEED_COOLDOWN;  // 吃完设冷却
                    this.debugLogger.logJuvenileEat(worm, '断尾', this.gameTime);
                    tail.segments.pop();
                    if (tail.segments.length === 0) {
                        this.brokenTails.splice(j, 1);
                    }
                    break;
                }
            }
        }
    }

    // 检测幼体吃所有灰色尾巴（shrinkingSegments）—— 任何幼体都能吃任何灰色尾巴
    checkJuvenileEatShrinkingSegments() {
        for (const worm of this.worms) {
            if (!worm.isAlive || !worm.isJuvenile || !worm.head) continue;
            if (worm.feedCooldown > 0) continue;  // 冷却中不吃
            let ate = false;
            for (const sourceWorm of this.worms) {
                if (!sourceWorm.isAlive || !sourceWorm.shrinkingSegments) continue;
                for (let j = sourceWorm.shrinkingSegments.length - 1; j >= 0; j--) {
                    const shrink = sourceWorm.shrinkingSegments[j];
                    if (!shrink.pos) continue;
                    const dist = worm.head.dist(shrink.pos);
                    if (dist < CONFIG.FAMILY.JUVENILE_EAT_RADIUS) {
                        if (worm.segments.length < CONFIG.FAMILY.JUVENILE_MAX_LENGTH + 1) {
                            const lastSeg = worm.segments[worm.segments.length - 1];
                            worm.segments.push(new Vector(lastSeg.x, lastSeg.y));
                            worm.targetLength = worm.segments.length;
                            if (worm.segments.length > CONFIG.FAMILY.JUVENILE_MAX_LENGTH) {
                                this.matureJuvenile(worm);
                            }
                        }
                        worm.feedCooldown = CONFIG.FAMILY.JUVENILE_FEED_COOLDOWN;  // 吃完设冷却
                        this.debugLogger.logJuvenileEat(worm, '灰色尾巴', this.gameTime);
                        sourceWorm.shrinkingSegments.splice(j, 1);
                        ate = true;
                        break;
                    }
                }
                if (ate) break;
            }
        }
    }

    // 注：玩家撞敌人的碰撞检测已移至主循环 updateWorms() 中，使用 takeDamage() 正确扣血

    /**
     * 显示玩家死亡对话框（排行榜版本）
     */
    showPlayerDeathDialog(reason = 'eaten') {
        const finalLength = this.playerDeathLength || this.worms[0]?.segments?.length || 0;
        const recordLength = Math.max(this.maxLengthReached, finalLength);
        const game = this;
        Leaderboard.show(
            recordLength, this.score, this.splitCount,
            // 重新开始
            function() { game.restart(); },
            // 返回观战模式
            function() { game._showPostDeathOverlay(); }
        );
    }

    /**
     * 显示死亡后观战界面的操作按钮（重新开始 / 排行榜）
     */
    _showPostDeathOverlay() {
        this._hidePostDeathOverlay();
        this.spectating = true;

        const overlay = document.createElement('div');
        overlay.id = 'postDeathOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 10000; pointer-events: none;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 16px; font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        `;

        // 闪烁动画 keyframes
        const style = document.createElement('style');
        style.id = 'postDeathBlinkStyle';
        style.textContent = `
            @keyframes postDeathBlink {
                0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 20px rgba(233,69,96,0.6); }
                50% { opacity: 0.7; transform: scale(1.05); box-shadow: 0 0 40px rgba(233,69,96,0.9); }
            }
            @keyframes postDeathBlinkSecondary {
                0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px rgba(77,171,247,0.4); }
                50% { opacity: 0.75; transform: scale(1.03); box-shadow: 0 0 25px rgba(77,171,247,0.7); }
            }
        `;
        document.head.appendChild(style);

        const restartBtn = document.createElement('button');
        restartBtn.textContent = '🔄 重新开始';
        restartBtn.style.cssText = `
            pointer-events: auto; background: #e94560; color: #fff; border: none;
            padding: 14px 48px; font-size: 20px; border-radius: 10px; cursor: pointer;
            font-weight: bold; letter-spacing: 2px;
            animation: postDeathBlink 1.2s ease-in-out infinite;
            transition: background 0.2s;
        `;
        restartBtn.onmouseover = () => { restartBtn.style.background = '#c73652'; };
        restartBtn.onmouseout = () => { restartBtn.style.background = '#e94560'; };
        restartBtn.onclick = () => { this.restart(); };

        const leaderboardBtn = document.createElement('button');
        leaderboardBtn.textContent = '🏆 排行榜';
        leaderboardBtn.style.cssText = `
            pointer-events: auto; background: #4dabf7; color: #fff; border: none;
            padding: 10px 36px; font-size: 16px; border-radius: 8px; cursor: pointer;
            font-weight: bold; letter-spacing: 1px;
            animation: postDeathBlinkSecondary 1.5s ease-in-out infinite;
            transition: background 0.2s;
        `;
        leaderboardBtn.onmouseover = () => { leaderboardBtn.style.background = '#3a9ae6'; };
        leaderboardBtn.onmouseout = () => { leaderboardBtn.style.background = '#4dabf7'; };
        leaderboardBtn.onclick = () => {
            this._hidePostDeathOverlay();
            const finalLength = this.playerDeathLength || 0;
            const recordLength = Math.max(this.maxLengthReached, finalLength);
            Leaderboard.show(
                recordLength, this.score, this.splitCount,
                () => this.restart(),
                () => this._showPostDeathOverlay()
            );
        };

        overlay.appendChild(restartBtn);
        overlay.appendChild(leaderboardBtn);
        document.body.appendChild(overlay);
        this.postDeathOverlay = overlay;
    }

    /**
     * 隐藏死亡后观战界面的操作按钮
     */
    _hidePostDeathOverlay() {
        if (this.postDeathOverlay) {
            this.postDeathOverlay.remove();
            this.postDeathOverlay = null;
        }
        const style = document.getElementById('postDeathBlinkStyle');
        if (style) style.remove();
        this.spectating = false;
    }

    draw() {
        // 更新相机跟随玩家头部（或demo模式下跟随第一个虫虫）
        const player = this.worms[0];
        const camDt = this._lastDt || 0.016; // dt来自update()

        // 基于镜头锁定区域计算下一区域（路径中的下一个）
        const lockedZone = this.camera._lockedZone;
        let nextZoneInPath = null;
        if (lockedZone && lockedZone.id < 25) {
            nextZoneInPath = this.zoneManager.zones[lockedZone.id]; // zones[0]=id1, zones[n-1]=id n, so zones[lockedZone.id] has id=lockedZone.id+1
        }

        // 查找锁定区域与下一区域之间的可挖掘墙壁（用于镜头挖掘同步）
        let activeWallForCamera = null;
        if (lockedZone && nextZoneInPath) {
            for (const wall of this.diggableWalls) {
                if (!wall.active) continue;
                if ((wall.fromZone === lockedZone && wall.toZone === nextZoneInPath) ||
                    (wall.fromZone === nextZoneInPath && wall.toZone === lockedZone)) {
                    activeWallForCamera = wall;
                    break;
                }
            }
        }

        if (player && player.isAlive && player.head) {
            const playerZone = this.zoneManager.getZoneAt(player.head.x, player.head.y);
            this.camera.follow(player.head.x, player.head.y, camDt, playerZone, nextZoneInPath, activeWallForCamera);
        } else if (this.state === GAME_STATE.IDLE && this.worms.length > 0) {
            // Demo模式：跟随第一个存活虫虫
            for (const w of this.worms) {
                if (w.isAlive && w.head) {
                    const wZone = this.zoneManager.getZoneAt(w.head.x, w.head.y);
                    this.camera.follow(w.head.x, w.head.y, camDt, wZone, nextZoneInPath, activeWallForCamera);
                    break;
                }
            }
        }

        // 绘制程序化动态背景（视口大小，直接画到屏幕）
        this.bg.draw(ctx);

        // === 应用相机偏移 + 屏幕震动 ===
        const shake = this.getShakeOffset();
        ctx.save();
        ctx.translate(-this.camera.x + shake.x, -this.camera.y + shake.y);

        this.drawGrid();

        // 绘制source-over模式的对象（不发光）
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < this.brokenTails.length; i++) this.brokenTails[i].draw(ctx);
        for (let i = 0; i < this.enemies.length; i++) this.enemies[i].draw(ctx);
        // Phase 3a: 绘制Boss
        for (let i = 0; i < this.bosses.length; i++) this.bosses[i].draw(ctx);
        // Phase 3b: 绘制障碍物
        for (let i = 0; i < this.obstacles.length; i++) this.obstacles[i].draw(ctx);
        // Phase 3c: 绘制可挖掘墙壁（在障碍物之后、虫虫之前，让虫虫出现在墙上面）
        for (const wall of this.diggableWalls) {
            wall.draw(ctx, this.gameTime);
        }
        for (let i = 0; i < this.deadBodies.length; i++) this.deadBodies[i].draw(ctx);

        // 绘制screen模式的对象（发光）
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < this.foods.length; i++) this.foods[i].draw(ctx);
        for (let i = 0; i < this.particles.length; i++) this.particles[i].draw(ctx);
        for (let i = 0; i < this.bullets.length; i++) this.bullets[i].draw(ctx);
        for (const worm of this.worms) {
            if (!worm.isAlive) continue;
            
            // 出场动画期间，如果头部进入动画后才开始绘制
            if (worm.isEntering && worm.enterPhase < 1) {
                continue;
            }
            
            worm.draw(ctx);
        }

        // 恢复source-over模式绘制UI
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < this.floatingTexts.length; i++) this.floatingTexts[i].draw(ctx);

        // === Phase 2 侦察兵方向指示箭头（在母体附近画箭头指向宝珠方向） ===
        for (const worm of this.worms) {
            if (!worm.isAlive || !worm._scoutIndicator) continue;
            const indicator = worm._scoutIndicator;
            if (!worm.parentWorm || !worm.parentWorm.isAlive) continue;
            const parentHead = worm.parentWorm.head;
            if (!parentHead) continue;

            const target = indicator.target;
            const dx = target.x - parentHead.x;
            const dy = target.y - parentHead.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 10) continue;

            // 箭头距离母体头部的距离
            const arrowDist = 50;
            const nx = dx / dist;
            const ny = dy / dist;
            const ax = parentHead.x + nx * arrowDist;
            const ay = parentHead.y + ny * arrowDist;

            const alpha = Math.min(1.0, indicator.timer / 0.5) * (0.5 + 0.3 * Math.sin(Date.now() * 0.008));
            const arrowLen = 12;
            const arrowWid = 6;
            const angle = Math.atan2(dy, dx);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            // 箭头尖端
            ctx.moveTo(ax + Math.cos(angle) * arrowLen, ay + Math.sin(angle) * arrowLen);
            // 左翼（向后偏转150度）
            ctx.lineTo(ax + Math.cos(angle + 2.6) * arrowWid, ay + Math.sin(angle + 2.6) * arrowWid);
            // 右翼（向后偏转-150度）
            ctx.lineTo(ax + Math.cos(angle - 2.6) * arrowWid, ay + Math.sin(angle - 2.6) * arrowWid);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        // 绘制波纹特效
        this.drawRipples();

        // Phase 3: 绘制家族门
        ctx.globalCompositeOperation = 'source-over';
        for (const gate of this.familyGates) {
            gate.draw(ctx, this.gameTime);
        }
        // 门提示文字
        const playerWorm = this.worms[0];
        for (const gate of this.familyGates) {
            gate.drawHint(ctx, playerWorm);
        }

        // Phase B: 绘制 Barrier 门
        for (const barrier of this.barriers) {
            barrier.draw(ctx, this.gameTime);
        }

        // 海底生态边界墙（覆盖虫虫以表现墙壁效果）
        this.zoneDecorations.draw(ctx);

        // 绘制地图边界（在世界坐标中）
        this.drawMapBorder();

        // Phase A: 区域调试视图
        if (this.showZoneDebug) {
            this.zoneManager.drawDebug(ctx);
        }

        // 恢复相机偏移
        ctx.restore();

        // === 屏幕坐标UI层（不受相机影响） ===
        this.drawCustomCursor();
        if (this.showFPS) {
            this.drawFPS();
        }
        // Phase A: 区域 HUD 信息
        this.zoneManager.drawHUD(ctx, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        // Phase 4a: 小地图
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.GAME_OVER) {
            const player = this.worms[0];
            if (player && player.isAlive && player.head) {
                this.miniMap.draw(ctx, player.head.x, player.head.y);
            } else {
                this.miniMap.draw(ctx);
            }
        }
        // Phase 4a: 胜利画面
        if (this.victory) {
            this.drawVictoryScreen();
        }
    }

    preRenderGrid() {
        const gridCtx = this.gridCtx;
        const size = this.gridTileSize;
        gridCtx.clearRect(0, 0, size, size);
        gridCtx.strokeStyle = 'rgba(78, 204, 163, 0.05)';
        gridCtx.lineWidth = 1;
        gridCtx.beginPath();
        gridCtx.moveTo(0, 0); gridCtx.lineTo(size, 0);
        gridCtx.moveTo(0, 0); gridCtx.lineTo(0, size);
        gridCtx.stroke();
    }

    /**
     * 将所有存活虫虫的段填充到空间网格中（每帧调用一次）
     */
    populateSpatialGrid() {
        this.spatialGrid.clear();
        for (const worm of this.worms) {
            if (!worm.isAlive || worm.isDead) continue;
            for (let i = 0; i < worm.segments.length; i++) {
                const seg = worm.segments[i];
                this.spatialGrid.insert({ worm, segIndex: i }, seg.x, seg.y);
            }
        }
    }

    drawGrid() {
        // 在可见视口范围内平铺网格瓦片
        const size = this.gridTileSize;
        const startX = Math.floor(this.camera.x / size) * size;
        const startY = Math.floor(this.camera.y / size) * size;
        const endX = this.camera.x + CONFIG.CANVAS_WIDTH + size;
        const endY = this.camera.y + CONFIG.CANVAS_HEIGHT + size;
        for (let x = startX; x < endX; x += size) {
            for (let y = startY; y < endY; y += size) {
                // 只绘制地图范围内的网格
                if (x >= 0 && x < CONFIG.MAP_WIDTH && y >= 0 && y < CONFIG.MAP_HEIGHT) {
                    ctx.drawImage(this.gridCanvas, x, y);
                }
            }
        }
    }

    /**
     * 绘制地图边界指示（虚线，非红色边框）
     */
    drawMapBorder() {
        ctx.save();
        ctx.setLineDash([20, 15]);
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.15)';
        ctx.lineWidth = 3;
        const m = CONFIG.BORDER_MARGIN;
        ctx.strokeRect(m, m, CONFIG.MAP_WIDTH - m * 2, CONFIG.MAP_HEIGHT - m * 2);
        ctx.setLineDash([]);
        ctx.restore();
    }

    drawFPS() {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 5, 60, 20);
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.fpsDisplay} FPS`, 10, 18);
        ctx.restore();
    }

    /**
     * 绘制胜利画面
     */
    drawVictoryScreen() {
        const W = CONFIG.CANVAS_WIDTH;
        const H = CONFIG.CANVAS_HEIGHT;
        const cx = W / 2;
        const cy = H / 2;

        // 半透明金色覆盖层
        ctx.save();
        ctx.fillStyle = 'rgba(10, 5, 0, 0.82)';
        ctx.fillRect(0, 0, W, H);

        // 标题
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 30;
        ctx.fillText('🎉 游戏胜利！', cx, cy - 140);
        ctx.shadowBlur = 0;

        // 副标题
        ctx.font = '20px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#ffec99';
        ctx.fillText('虫后已被击败，旋律虫虫的传说永存！', cx, cy - 85);

        // 统计面板
        const stats = this.victoryStats || {};
        const panelX = cx - 160;
        const panelY = cy - 40;
        const panelW = 320;
        const panelH = 160;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(panelX, panelY, panelW, panelH, 10);
        } else {
            ctx.rect(panelX, panelY, panelW, panelH);
        }
        ctx.fill();
        ctx.stroke();

        const totalSec = Math.floor(stats.time || 0);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

        const statsRows = [
            ['⏱️ 通关时间', timeStr],
            ['🏆 最终分数', `${stats.score || 0}`],
            ['💀 击杀数', `${stats.kills || 0}`],
            ['📏 最大长度', `${stats.maxLength || 0} 节`],
        ];
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        for (let i = 0; i < statsRows.length; i++) {
            const row = statsRows[i];
            const ry = panelY + 30 + i * 35;
            ctx.fillStyle = '#ccc';
            ctx.fillText(row[0], panelX + 20, ry);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
            ctx.fillText(row[1], panelX + panelW - 20, ry);
            ctx.textAlign = 'left';
            ctx.font = '16px "Microsoft YaHei", sans-serif';
        }

        // 按钮提示
        ctx.textAlign = 'center';
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('按 R 再来一次 · 按 ESC 返回菜单', cx, cy + 160);

        // 庆祝粒子（在覆盖层上方画）
        this._drawVictoryParticles();

        ctx.restore();
    }

    /**
     * 胜利画面粒子动画
     */
    _drawVictoryParticles() {
        if (!this._victoryParticles) {
            this._victoryParticles = [];
            const colors = ['#ffd700', '#ff6b6b', '#4ecca3', '#4dabf7', '#c77dff', '#ff8c42'];
            for (let i = 0; i < 60; i++) {
                this._victoryParticles.push({
                    x: Math.random() * CONFIG.CANVAS_WIDTH,
                    y: -20 - Math.random() * 400,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 1.5 + Math.random() * 2,
                    size: 2 + Math.random() * 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: Math.random(),
                    wobble: Math.random() * Math.PI * 2,
                });
            }
        }
        for (const p of this._victoryParticles) {
            p.y += p.vy;
            p.x += p.vx + Math.sin(p.wobble + p.y * 0.02) * 0.5;
            if (p.y > CONFIG.CANVAS_HEIGHT + 10) {
                p.y = -10;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH;
            }
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * 绘制自定义鼠标光标：有蓝色弹舱时显示瞄准镜，否则显示圆环
     */
    drawCustomCursor() {
        if (!this.mouseInCanvas) return;
        if (this.isTouchDevice) return;  // 触摸设备不显示光标
        
        // 将世界坐标转换为屏幕坐标
        let worldX = this.mousePos.x;
        let worldY = this.mousePos.y;
        const player = this.worms[0];
        const hasBlueSegments = player && player.blueSegments > 0;
        
        // 等待玩家控制阶段：白圈在虫虫出生点
        if (this.waitingForPlayer) {
            worldX = 400;
            worldY = 2800;
        }
        
        // 世界坐标转屏幕坐标
        const screen = this.camera.worldToScreen(worldX, worldY);
        const cursorX = screen.x;
        const cursorY = screen.y;
        
        if (hasBlueSegments) {
            // 瞄准镜图样（蓝色）
            const radius = 20;
            const lineWidth = 2;
            
            // 外圈
            ctx.beginPath();
            ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(77, 171, 247, 0.8)';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            
            // 十字线
            const crossSize = radius + 8;
            ctx.beginPath();
            ctx.moveTo(cursorX - crossSize, cursorY);
            ctx.lineTo(cursorX - radius - 3, cursorY);
            ctx.moveTo(cursorX + radius + 3, cursorY);
            ctx.lineTo(cursorX + crossSize, cursorY);
            ctx.moveTo(cursorX, cursorY - crossSize);
            ctx.lineTo(cursorX, cursorY - radius - 3);
            ctx.moveTo(cursorX, cursorY + radius + 3);
            ctx.lineTo(cursorX, cursorY + crossSize);
            ctx.strokeStyle = 'rgba(77, 171, 247, 0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 中心点
            ctx.beginPath();
            ctx.arc(cursorX, cursorY, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(77, 171, 247, 0.9)';
            ctx.fill();
            
            // 按住射击时的脉冲光环
            if (this.isMouseDown) {
                const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(cursorX, cursorY, radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(77, 171, 247, ${pulse * 0.5})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            // 普通圆环（白色）
            const radius = 18;
            const lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
        
        // 瞄准镜提示（第一次吃到红宝珠时）
        if (this.showCrosshairHint && this.crosshairHintTimer > 0) {
            const alpha = Math.min(1, this.crosshairHintTimer / 0.5);  // 最后0.5秒淡出
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎯 点击鼠标发射子弹！', cursorX, cursorY - 40);
            ctx.restore();
        }
        
        // 等待玩家控制阶段：显示提示文字
        if (this.waitingForPlayer) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('移动鼠标到白圈开始游戏', cursorX, cursorY + 40);
            ctx.restore();
        }
    }

    /**
     * 玩家死亡统一入口 — 所有死亡路径必须通过此方法
     * @param {string} reason - 死亡原因（'eaten'|'wall'|'hunger'|'neckBite'）
     * @param {DeadBody[]} [existingBodies] - 预创建的尸体（如颈部咬断产生的两段）
     */
    gameOver(reason = 'eaten', existingBodies = null) {
        if (this.state === GAME_STATE.GAME_OVER) return;  // 防止重复触发
        this.isMouseDown = false;  // 停止连续射击
        this.debugLogger.logGameOver(reason, this.gameTime);
        this.state = GAME_STATE.GAME_OVER;

        // Phase D: 保存区域进度（死亡不丢失）
        if (this.zoneManager) {
            this.zoneManager.totalScore = Math.max(this.zoneManager.totalScore || 0, this.score);
            this.zoneManager.maxLengthReached = Math.max(this.zoneManager.maxLengthReached || 0, this.maxLengthReached);
            this.zoneManager.saveProgress();
        }
        const player = this.worms.find(w => w.isPlayer);
        
        // 保存死亡长度
        if (player) {
            this.playerDeathLength = player.segments.length;
        }
        
        // 使用预创建的尸体，或从玩家当前段创建
        if (existingBodies && existingBodies.length > 0) {
            for (const body of existingBodies) {
                this.deadBodies.push(body);
            }
            this.playerDeadWaitingForBodies = true;
            if (player) {
                player.isAlive = false;
                player.segments = [];
            }
        } else if (player && player.segments.length > 0) {
            const deadBody = new DeadBody(player.segments.map(s => new Vector(s.x, s.y)), player.color);
            this.deadBodies.push(deadBody);
            this.playerDeadWaitingForBodies = true;
            player.isAlive = false;
            player.segments = [];
        }
        
        // 保存死亡原因供后续弹框使用
        this.pendingDeathReason = reason;
        
        // 如果没有尸体需要等待，直接弹框
        if (!this.playerDeadWaitingForBodies) {
            this.showPlayerDeathDialog(reason);
        }
    }
}
