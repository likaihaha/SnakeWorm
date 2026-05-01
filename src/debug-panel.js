/**
 * DebugPanel - 游戏调试面板
 * 快捷键 Shift+D 呼出/隐藏
 * 提供作弊和调试功能
 */
import { CONFIG } from './config.js';
import { Worm } from './worm.js';
import { Enemy } from './enemy.js';
import { Food } from './entities.js';
import { Vector } from './vector.js';

export class DebugPanel {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.overlay = null;
        this.panel = null;
        this._godMode = false;
        this._initHotkey();
    }

    _initHotkey() {
        document.addEventListener('keydown', (e) => {
            // Shift + D 切换调试面板
            if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        if (this.overlay) return;
        this.visible = true;

        // 遮罩层
        this.overlay = document.createElement('div');
        this.overlay.id = 'debugPanelOverlay';
        this.overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 20000;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        `;

        // 点击遮罩关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        // 面板
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            background: #1e1e2e; border: 2px solid #7aa2f7; border-radius: 10px;
            padding: 20px; min-width: 320px; max-width: 90vw;
            color: #eee; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        // 标题
        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 16px 0; color: #7aa2f7; font-size: 16px; text-align: center;';
        title.textContent = '🐛 调试面板 (Shift+D 关闭)';
        this.panel.appendChild(title);

        // 按钮网格
        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;';

        const buttons = [
            { label: '➕ +10节', action: () => this._growPlayer(10), color: '#4ecca3' },
            { label: '➖ -5节', action: () => this._shrinkPlayer(5), color: '#e94560' },
            { label: '⭐ 无敌', action: () => this._toggleGodMode(), color: this._godMode ? '#ffd700' : '#888' },
            { label: '🟢 绿珠', action: () => this._spawnFood(0), color: '#4ecca3' },
            { label: '🟡 黄珠', action: () => this._spawnFood(1), color: '#ffe66d' },
            { label: '🟠 橙珠', action: () => this._spawnFood(2), color: '#ff8c42' },
            { label: '🔵 蓝珠', action: () => this._spawnFood(3), color: '#4dabf7' },
            { label: '🟣 紫珠', action: () => this._spawnFood(4), color: '#c77dff' },
            { label: '🗑️ 清宝珠', action: () => this._clearFoods(), color: '#666' },
            { label: '🤖 AI虫虫', action: () => this._spawnAIWorm(), color: '#ffd700' },
            { label: '👹 敌人', action: () => this._spawnEnemy(), color: '#ff6b6b' },
            { label: '💥 清敌人', action: () => this._clearEnemies(), color: '#ff4444' },
            { label: '💯 +1000分', action: () => this._addScore(1000), color: '#4dabf7' },
            { label: '🔄 重置', action: () => this._restart(), color: '#aaa' },
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.style.cssText = `
                background: ${btn.color}; color: #fff; border: none;
                padding: 8px 12px; font-size: 13px; border-radius: 6px;
                cursor: pointer; transition: opacity 0.2s; font-weight: bold;
            `;
            button.onmouseover = () => button.style.opacity = '0.85';
            button.onmouseout = () => button.style.opacity = '1';
            button.onclick = () => {
                try {
                    btn.action();
                } catch (err) {
                    console.error('[DebugPanel]', err);
                }
            };
            grid.appendChild(button);
        });

        this.panel.appendChild(grid);

        // 状态信息
        this.infoEl = document.createElement('div');
        this.infoEl.style.cssText = 'margin-top: 12px; font-size: 11px; color: #888; text-align: center; min-height: 16px;';
        this.infoEl.textContent = '按按钮执行调试操作';
        this.panel.appendChild(this.infoEl);

        this.overlay.appendChild(this.panel);
        document.body.appendChild(this.overlay);

        this._updateInfo();
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.remove();
        this.overlay = null;
        this.panel = null;
        this.visible = false;
    }

    _info(msg) {
        if (this.infoEl) this.infoEl.textContent = msg;
        console.log('[DebugPanel]', msg);
    }

    _updateInfo() {
        const g = this.game;
        const player = g.worms?.[0];
        const length = player?.segments?.length ?? 0;
        const score = g.score ?? 0;
        const worms = g.worms?.length ?? 0;
        const enemies = g.enemies?.length ?? 0;
        const god = this._godMode ? ' [无敌]' : '';
        this._info(`长度:${length} 分数:${score} 虫虫:${worms} 敌人:${enemies}${god}`);
    }

    // ====== 调试操作 ======

    _growPlayer(amount) {
        const player = this.game.worms?.[0];
        if (!player || !player.isAlive) {
            this._info('❌ 玩家不存在或已死亡');
            return;
        }
        player.grow(amount);
        this._info(`✅ 玩家增长 ${amount} 节`);
    }

    _shrinkPlayer(amount) {
        const player = this.game.worms?.[0];
        if (!player || !player.isAlive) {
            this._info('❌ 玩家不存在或已死亡');
            return;
        }
        // 保留至少 3 节
        const newLen = Math.max(3, player.segments.length - amount);
        const remove = player.segments.length - newLen;
        if (remove <= 0) {
            this._info('❌ 无法再缩短');
            return;
        }
        for (let i = 0; i < remove; i++) {
            player.segments.pop();
        }
        player.targetLength = player.segments.length;
        player.syncBlueToBody();
        this._info(`✅ 玩家缩短 ${remove} 节`);
    }

    _spawnAIWorm() {
        const g = this.game;
        if (g.worms.length >= CONFIG.MAX_WORMS) {
            this._info('❌ 虫虫数量已达上限');
            return;
        }
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#c7ceea', '#ff9f43', '#a29bfe'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
        const y = 100 + Math.random() * (CONFIG.CANVAS_HEIGHT - 200);
        const length = 5 + Math.floor(Math.random() * 15);
        const worm = new Worm(x, y, length, color, false);
        g.worms.push(worm);
        this._info(`✅ 生成 AI 虫虫 (${length}节)`);
    }

    _spawnEnemy() {
        const g = this.game;
        const margin = 60;
        const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - margin * 2);
        const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - margin * 2);
        const enemy = new Enemy(x, y);
        g.enemies.push(enemy);
        // 强制设置计时器避免立即被清理
        if (!g.enemySpawnTimer) g.enemySpawnTimer = CONFIG.FAMILY.ENEMY_SPAWN_INTERVAL;
        this._info('✅ 生成敌人');
    }

    _toggleGodMode() {
        const player = this.game.worms?.[0];
        if (!player) {
            this._info('❌ 玩家不存在');
            return;
        }
        this._godMode = !this._godMode;
        if (this._godMode) {
            player.invincibleTimer = Infinity;
            player.headEnlarged = true;
            player.headScaleTarget = 1.5;
            this._info('⭐ 无敌模式已开启');
        } else {
            player.invincibleTimer = 0;
            player.headEnlarged = false;
            player.headScaleTarget = 1.0;
            this._info('⭐ 无敌模式已关闭');
        }
    }

    _clearEnemies() {
        const count = this.game.enemies?.length ?? 0;
        this.game.enemies = [];
        this._info(`✅ 清除 ${count} 个敌人`);
    }

    _addScore(amount) {
        this.game.score = (this.game.score || 0) + amount;
        this._info(`✅ 分数 +${amount}`);
    }

    _spawnFood(typeIndex) {
        const g = this.game;
        const type = CONFIG.FOOD_TYPES[typeIndex];
        if (!type) {
            this._info('❌ 宝珠类型不存在');
            return;
        }
        const margin = 40;
        const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - margin * 2);
        const y = margin + Math.random() * (CONFIG.CANVAS_HEIGHT - margin * 2);
        const food = new Food(x, y, type);
        // 给一点随机初速度，让它有动态感
        food.velocity.x = (Math.random() - 0.5) * 1.5;
        food.velocity.y = (Math.random() - 0.5) * 1.5;
        g.foods.push(food);
        const names = ['绿珠', '黄珠', '橙珠', '蓝珠', '紫珠'];
        this._info(`✅ 生成 ${names[typeIndex] || '宝珠'}`);
    }

    _clearFoods() {
        const count = this.game.foods?.length ?? 0;
        this.game.foods = [];
        this._info(`✅ 清除 ${count} 个宝珠`);
    }

    _restart() {
        this.game.restart();
        this._info('🔄 游戏已重置');
    }
}
