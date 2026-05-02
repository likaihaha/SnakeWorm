/**
 * DebugLogger - 调试日志系统
 * Ctrl+L 进入/退出调试模式
 * 记录虫虫每一次关键事件，方便查Bug
 */

export class DebugLogger {
    constructor() {
        this.active = false;
        this.logs = [];
        this.juvenileCounter = 0;  // 幼体全局编号
        this.enemyCounter = 0;     // 敌人全局编号
        this.startTime = 0;        // 调试开始的游戏时间
        this.overlay = null;       // 状态指示器 DOM
        this._initHotkey();
    }

    _initHotkey() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.active) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.active = true;
        this.logs = [];
        this.juvenileCounter = 0;
        this.enemyCounter = 0;
        // 记录当前游戏时间作为基准
        const game = window.game;
        this.startTime = game ? game.gameTime : 0;

        this._log('SYSTEM', '调试模式启动', { version: typeof CONFIG !== 'undefined' ? '' : '' });
        this._showOverlay();

        // 启动时记录当前存活虫虫状态
        if (game && game.worms) {
            for (const worm of game.worms) {
                if (!worm.isAlive) continue;
                const id = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
                const type = worm.isJuvenile ? '幼体' : '成年体';
                this._log('SNAPSHOT', `${id}(${type}) 存活中`, {
                    长度: worm.segments.length,
                    颜色: worm.color,
                    位置: this._pos(worm.head),
                });
            }
            for (const enemy of game.enemies) {
                if (!enemy.isAlive) continue;
                const eid = enemy._debugId || '?';
                this._log('SNAPSHOT', `敌人 #${eid} 存活中`, {
                    生命: `${enemy.health}/${enemy.maxHealth}`,
                    位置: this._pos(enemy.pos),
                });
            }
        }

        console.log('[DebugLogger] 调试模式启动 - Ctrl+L 停止并导出日志');
    }

    stop() {
        this.active = false;
        this._log('SYSTEM', '调试模式停止', { 总日志条数: this.logs.length });
        this._hideOverlay();
        this.exportToFile();
        console.log('[DebugLogger] 调试模式停止，日志已导出');
    }

    // ========== 日志记录方法 ==========

    /**
     * 玩家/AI 吃了宝珠
     */
    logEat(worm, food, gameTime) {
        if (!this.active) return;
        const id = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        this._log('EAT', `${id} 吃了${this._foodName(food)}`, {
            宝珠类型: this._foodName(food),
            宝珠颜色: food.type.color,
            分值: food.type.score,
            当前长度: worm.segments.length,
            位置: this._pos(food.pos),
        }, gameTime);
    }

    /**
     * 虫虫自噬断尾（咬到自己尾巴，诞生后代）
     */
    logSelfBiteSplit(worm, segIndex, gameTime) {
        if (!this.active) return;
        const id = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        this._log('SELF_BITE', `${id} 自噬断尾`, {
            断尾段索引: segIndex,
            断尾前长度: worm.segments.length + '(待计算)',
            剩余长度: segIndex,
            �截断长度: '(待计算)',
        }, gameTime);
    }

    /**
     * 虫虫咬到其他虫虫的尾巴，被咬者断尾
     */
    logTailBite(biter, victim, segIndex, gameTime) {
        if (!this.active) return;
        const biterId = biter.isPlayer ? '玩家' : `AI-${biter._debugId || '?'}`;
        const victimId = victim.isPlayer ? '玩家' : `AI-${victim._debugId || '?'}`;
        this._log('TAIL_BITE', `${biterId} 咬了 ${victimId} 的尾巴`, {
            咬人者: biterId,
            被咬者: victimId,
            被咬段索引: segIndex,
            被咬者剩余长度: segIndex,
        }, gameTime);
    }

    /**
     * 虫虫颈部被咬死亡
     */
    logNeckBiteDeath(biter, victim, segIndex, gameTime) {
        if (!this.active) return;
        const biterId = biter.isPlayer ? '玩家' : `AI-${biter._debugId || '?'}`;
        const victimId = victim.isPlayer ? '玩家' : `AI-${victim._debugId || '?'}`;
        this._log('NECK_BITE_DEATH', `${victimId} 颈部被 ${biterId} 咬死`, {
            咬人者: biterId,
            被咬者: victimId,
            被咬段索引: segIndex,
        }, gameTime);
    }

    /**
     * 幼体诞生（从断尾孵化）
     * @param {Worm} juvenile - 新诞生的幼体
     * @param {Worm} parentWorm - 父代
     * @param {string} method - 诞生方式: 'self-bite'(自噬) / 'tail-bite'(被咬)
     */
    logJuvenileBorn(juvenile, parentWorm, method, gameTime) {
        if (!this.active) return;
        this.juvenileCounter++;
        juvenile._debugId = this.juvenileCounter;
        const parentId = parentWorm.isPlayer ? '玩家' : `AI-${parentWorm._debugId || '?'}`;
        const methodText = method === 'self-bite' ? '自噬断尾孵化' : '被咬断尾孵化';
        this._log('JUVENILE_BORN', `幼体 #${this.juvenileCounter} 诞生 (${methodText})`, {
            幼体编号: this.juvenileCounter,
            父代: parentId,
            诞生方式: methodText,
            初始长度: juvenile.segments.length,
            颜色: juvenile.color,
            位置: this._pos(juvenile.head),
        }, gameTime);
    }

    /**
     * 幼体吃断尾/灰色尾巴成长
     */
    logJuvenileEat(juvenile, what, gameTime) {
        if (!this.active) return;
        const jid = `幼体 #${juvenile._debugId || '?'}`;
        this._log('JUVENILE_EAT', `${jid} 吃了${what}`, {
            幼体编号: juvenile._debugId,
            当前长度: juvenile.segments.length,
        }, gameTime);
    }

    /**
     * 幼体成年
     */
    logJuvenileMature(juvenile, gameTime) {
        if (!this.active) return;
        const jid = `幼体 #${juvenile._debugId || '?'}`;
        this._log('JUVENILE_MATURE', `${jid} 成年了!`, {
            幼体编号: juvenile._debugId,
            最终长度: juvenile.segments.length,
            位置: this._pos(juvenile.head),
        }, gameTime);
    }

    /**
     * 敌人生成
     */
    logEnemySpawn(enemy, gameTime) {
        if (!this.active) return;
        this.enemyCounter++;
        enemy._debugId = this.enemyCounter;
        this._log('ENEMY_SPAWN', `敌人 #${this.enemyCounter} 生成`, {
            敌人编号: this.enemyCounter,
            生命: `${enemy.health}/${enemy.maxHealth}`,
            位置: this._pos(enemy.pos),
        }, gameTime);
    }

    /**
     * 敌人被子弹击中
     */
    logEnemyHit(enemy, remainingHealth, gameTime) {
        if (!this.active) return;
        const eid = `敌人 #${enemy._debugId || '?'}`;
        this._log('ENEMY_HIT', `${eid} 被子弹击中`, {
            剩余生命: remainingHealth,
            位置: this._pos(enemy.pos),
        }, gameTime);
    }

    /**
     * 敌人死亡
     */
    logEnemyDeath(enemy, gameTime) {
        if (!this.active) return;
        const eid = `敌人 #${enemy._debugId || '?'}`;
        this._log('ENEMY_DEATH', `${eid} 死亡`, {
            位置: this._pos(enemy.pos),
        }, gameTime);
    }

    /**
     * 敌人咬住幼体
     */
    logEnemyLatch(enemy, juvenile, segIndex, gameTime) {
        if (!this.active) return;
        const eid = `敌人 #${enemy._debugId || '?'}`;
        const jid = `幼体 #${juvenile._debugId || '?'}`;
        this._log('ENEMY_LATCH', `${eid} 咬住了 ${jid} 的第${segIndex}段`, {
            敌人编号: enemy._debugId,
            幼体编号: juvenile._debugId,
            被咬段索引: segIndex,
            幼体当前长度: juvenile.segments.length,
            幼体被咬次数: (juvenile.juvenileHitCount || 0) + 1,
        }, gameTime);
    }

    /**
     * 敌人咬伤幼体（造成伤害）
     */
    logEnemyBiteDamage(enemy, juvenile, gameTime) {
        if (!this.active) return;
        const eid = `敌人 #${enemy._debugId || '?'}`;
        const jid = `幼体 #${juvenile._debugId || '?'}`;
        this._log('ENEMY_BITE', `${eid} 咬伤了 ${jid}`, {
            幼体编号: juvenile._debugId,
            幼体剩余长度: juvenile.segments.length,
            幼体被咬总次数: juvenile.juvenileHitCount,
            幼体是否存活: juvenile.isAlive,
        }, gameTime);
    }

    /**
     * 幼体死亡
     */
    logJuvenileDeath(juvenile, reason, gameTime) {
        if (!this.active) return;
        const jid = `幼体 #${juvenile._debugId || '?'}`;
        this._log('JUVENILE_DEATH', `${jid} 死亡 - ${reason}`, {
            幼体编号: juvenile._debugId,
            死因: reason,
            死亡时长度: juvenile.segments ? juvenile.segments.length : 0,
            被咬次数: juvenile.juvenileHitCount || 0,
            位置: this._pos(juvenile.head),
        }, gameTime);
    }

    /**
     * 成年体被敌人撞击
     */
    logAdultHitByEnemy(worm, enemy, hitCount, gameTime) {
        if (!this.active) return;
        const wid = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        const eid = `敌人 #${enemy._debugId || '?'}`;
        this._log('ADULT_HIT', `${wid} 被 ${eid} 撞击 (累计${hitCount}次)`, {
            虫虫: wid,
            敌人编号: enemy._debugId,
            累计撞击次数: hitCount,
            需要次数: typeof CONFIG !== 'undefined' ? CONFIG.FAMILY.ADULT_HITS_TO_LOSE : '?',
            当前长度: worm.segments.length,
        }, gameTime);
    }

    /**
     * 成年体被敌人撞掉一节身体
     */
    logAdultLoseSegment(worm, gameTime) {
        if (!this.active) return;
        const wid = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        this._log('ADULT_LOSE_SEG', `${wid} 被敌人撞掉一节身体`, {
            虫虫: wid,
            剩余长度: worm.segments.length,
        }, gameTime);
    }

    /**
     * 玩家/AI 碰撞死亡（碰到其他虫虫身体）
     */
    logCollisionDeath(worm, otherWorm, gameTime) {
        if (!this.active) return;
        const wid = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        const oid = otherWorm.isPlayer ? '玩家' : `AI-${otherWorm._debugId || '?'}`;
        this._log('COLLISION_DEATH', `${wid} 碰撞死亡 (撞了 ${oid} 的身体)`, {
            死者: wid,
            撞到: oid,
        }, gameTime);
    }

    /**
     * 撞墙死亡
     */
    logWallDeath(worm, gameTime) {
        if (!this.active) return;
        const wid = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        this._log('WALL_DEATH', `${wid} 撞墙死亡`, {
            位置: this._pos(worm.head),
        }, gameTime);
    }

    /**
     * 饥饿死亡
     */
    logHungerDeath(worm, gameTime) {
        if (!this.active) return;
        const wid = worm.isPlayer ? '玩家' : `AI-${worm._debugId || '?'}`;
        this._log('HUNGER_DEATH', `${wid} 饥饿死亡`, {
            最终长度: worm.segments ? worm.segments.length : 0,
        }, gameTime);
    }

    /**
     * AI 虫虫死亡（通用）
     */
    logAIDeath(worm, reason, gameTime) {
        if (!this.active) return;
        const wid = `AI-${worm._debugId || '?'}`;
        this._log('AI_DEATH', `${wid} 死亡 - ${reason}`, {
            死因: reason,
            最终长度: worm.segments ? worm.segments.length : 0,
        }, gameTime);
    }

    /**
     * 游戏结束
     */
    logGameOver(reason, gameTime) {
        if (!this.active) return;
        this._log('GAME_OVER', `游戏结束 - ${reason}`, {
            死因: reason,
        }, gameTime);
    }

    // ========== 内部方法 ==========

    _log(type, message, details = {}, gameTime) {
        const gt = gameTime !== undefined ? gameTime : (window.game ? window.game.gameTime : 0);
        const entry = {
            time: gt.toFixed(2),
            type,
            message,
            details,
        };
        this.logs.push(entry);

        // 控制台也输出一份（方便实时查看）
        const prefix = `[DEBUG ${type}]`;
        console.log(`${prefix} t=${entry.time}s ${message}`, details);
    }

    _pos(vec) {
        if (!vec) return 'N/A';
        return `(${Math.round(vec.x)}, ${Math.round(vec.y)})`;
    }

    _foodName(food) {
        const scoreMap = {
            10: '绿色宝珠',
            30: '黄色宝珠',
            60: '橙色宝珠',
            120: '蓝色宝珠',
            300: '紫色宝珠',
        };
        return scoreMap[food.type.score] || `宝珠(${food.type.score})`;
    }

    _showOverlay() {
        if (this.overlay) return;
        this.overlay = document.createElement('div');
        this.overlay.id = 'debugLogOverlay';
        this.overlay.style.cssText = `
            position: fixed; top: 8px; right: 8px; z-index: 15000;
            background: rgba(255, 60, 60, 0.9); color: #fff;
            padding: 6px 14px; border-radius: 6px; font-size: 13px;
            font-family: 'Consolas', 'Courier New', monospace;
            pointer-events: none; user-select: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            animation: debugPulse 1.5s ease-in-out infinite;
        `;
        this.overlay.textContent = '🔴 DEBUG (Ctrl+L 停止)';
        document.body.appendChild(this.overlay);

        // 添加脉冲动画
        if (!document.getElementById('debugLogStyle')) {
            const style = document.createElement('style');
            style.id = 'debugLogStyle';
            style.textContent = `
                @keyframes debugPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    _hideOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * 导出日志为文件
     */
    exportToFile() {
        if (this.logs.length === 0) {
            console.log('[DebugLogger] 没有日志记录');
            return;
        }

        // 格式化日志
        const lines = [];
        lines.push('═══════════════════════════════════════════════════════');
        lines.push('  SnakeWorm 调试日志');
        lines.push(`  导出时间: ${new Date().toLocaleString('zh-CN')}`);
        lines.push(`  总记录: ${this.logs.length} 条`);
        lines.push('═══════════════════════════════════════════════════════');
        lines.push('');

        for (const entry of this.logs) {
            const typeTag = `[${entry.type}]`.padEnd(20);
            const timeStr = `${entry.time}s`.padStart(8);
            lines.push(`${timeStr} ${typeTag} ${entry.message}`);

            // 输出详情（缩进）
            if (entry.details && Object.keys(entry.details).length > 0) {
                const detailStr = Object.entries(entry.details)
                    .map(([k, v]) => `${k}=${v}`)
                    .join('  ');
                lines.push(`            └─ ${detailStr}`);
            }
        }

        lines.push('');
        lines.push('═══════════════════════════════════════════════════════');
        lines.push('  日志结束');
        lines.push('═══════════════════════════════════════════════════════');

        const content = lines.join('\n');

        // 触发下载
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `snakeworm-debug-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
