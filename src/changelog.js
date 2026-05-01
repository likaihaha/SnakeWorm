/**
 * Changelog - 游戏更新日志
 * 静态数据 + 弹窗展示
 */

const LOGS = [
    {
        version: 'v1.51',
        date: '2026-05-01',
        items: [
            '版本号统一管理：版本号集中到 config.js，页面 title 和界面自动同步',
            '观战模式：死亡后从排行榜返回可继续观看游戏，AI 虫虫和敌人正常运行',
            '闪烁按钮：观战画面叠加重新开始（红色强闪）和排行榜（蓝色弱闪）按钮',
        ]
    },
    {
        version: 'v1.50',
        date: '2026-05-01',
        items: [
            '调试面板新增宝珠生成：Shift+D 呼出，可一键生成 5 种宝珠或清除全部',
            '修复敌人吃幼体报错：修复敌人吃掉幼体后读取 juv.head 为 undefined 的 TypeError',
        ]
    },
    {
        version: 'v1.35',
        date: '2026-04-30',
        items: [
            'FloatingText 对象池 + update 就地修改消除临时 Vector',
        ]
    },
    {
        version: 'v1.34',
        date: '2026-04-30',
        items: [
            '敌人 AI 行为树优化：觅食、巡游、追击、锁定状态机',
            '敌人咬幼体时增加击中位移和受击闪光效果',
        ]
    },
    {
        version: 'v1.19',
        date: '2026-04-28',
        items: [
            '碰撞检测空间分区：SpatialGrid 接入 checkTailBite / checkNeckBite',
            'Magic Number 收敛：射击、饥饿、亲子常量提取到 CONFIG',
            '死亡对话框改用 game.restart() 替代 location.reload()',
        ]
    },
    {
        version: 'v1.12',
        date: '2026-04-27',
        items: [
            '游戏状态机：GAME_STATE 枚举（IDLE / PLAYING / PAUSED / GAME_OVER）',
        ]
    },
    {
        version: 'v1.11',
        date: '2026-04-27',
        items: [
            '敌人状态模式：ENEMY_STATE 枚举（WANDERING / CIRCLING / CHASING / FEEDING / LATCHED / DYING / DEAD）',
        ]
    },
    {
        version: 'v1.10',
        date: '2026-04-26',
        items: [
            '错误处理增强：playNote / _addSustainTail 添加 try-catch',
            'startGame DOM null 检查',
        ]
    },
    {
        version: 'v1.07 ~ v1.09',
        date: '2026-04-25',
        items: [
            '渲染优化：清理冗余 globalCompositeOperation 切换，按混合模式分批',
            'shadowBlur 优化：Bullet 和 Food 使用径向渐变替代 GPU 阴影渲染',
            '射击 / 饥饿常量提取到 CONFIG',
        ]
    },
    {
        version: 'v1.00',
        date: '2026-04-25',
        items: [
            '完整游戏发布：模块化拆分、UI、音效、视觉、性能优化',
        ]
    },
];

export class Changelog {
    static show() {
        // 移除旧弹窗
        const old = document.getElementById('changelogDialog');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'changelogDialog';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10001;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
        `;
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1a1a2e; border: 2px solid #4dabf7; border-radius: 12px;
            padding: 24px; width: 520px; max-width: 90vw; max-height: 80vh;
            display: flex; flex-direction: column; color: #eee;
            box-shadow: 0 0 40px rgba(77,171,247,0.3);
        `;

        // 标题
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';

        const title = document.createElement('h2');
        title.style.cssText = 'margin: 0; color: #4dabf7; font-size: 20px;';
        title.textContent = '📜 更新日志';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'cursor: pointer; font-size: 18px; color: #888; padding: 4px 8px;';
        closeBtn.onmouseover = () => { closeBtn.style.color = '#fff'; };
        closeBtn.onmouseout = () => { closeBtn.style.color = '#888'; };
        closeBtn.onclick = () => overlay.remove();

        titleRow.appendChild(title);
        titleRow.appendChild(closeBtn);
        panel.appendChild(titleRow);

        // 日志列表（可滚动）
        const list = document.createElement('div');
        list.style.cssText = 'overflow-y: auto; flex: 1; padding-right: 8px;';

        for (const log of LOGS) {
            const block = document.createElement('div');
            block.style.cssText = 'margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08);';

            const header = document.createElement('div');
            header.style.cssText = 'display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px;';

            const ver = document.createElement('span');
            ver.style.cssText = 'font-weight: bold; color: #ffd700; font-size: 15px;';
            ver.textContent = log.version;

            const date = document.createElement('span');
            date.style.cssText = 'color: #666; font-size: 12px;';
            date.textContent = log.date;

            header.appendChild(ver);
            header.appendChild(date);
            block.appendChild(header);

            const ul = document.createElement('ul');
            ul.style.cssText = 'margin: 0; padding-left: 18px; color: #ccc; font-size: 13px; line-height: 1.8;';
            for (const item of log.items) {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
            }
            block.appendChild(ul);
            list.appendChild(block);
        }

        panel.appendChild(list);

        // 底部提示
        const hint = document.createElement('div');
        hint.style.cssText = 'text-align: center; font-size: 11px; color: #555; margin-top: 8px;';
        hint.textContent = '点击遮罩层或 ✕ 关闭';
        panel.appendChild(hint);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    }
}
