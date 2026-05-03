/**
 * Changelog - 游戏更新日志
 * 静态数据 + 弹窗展示
 */

const LOGS = [
    {
        version: 'v1.80',
        date: '2026-05-03',
        items: [
            'Phase 4a 完成 — 小地图 + 胜利画面',
            '小地图：屏幕右上角25区域缩略图，绿=通关/蓝=解锁/灰=锁定，玩家位置闪烁标记',
            '胜利画面：虫后Boss击败后全屏金色覆盖，显示通关时间/分数/击杀数/最大长度',
            '庆祝粒子：胜利画面持续飘落彩色粒子雨',
            '胜利操作：按 R 再来一次 / 按 ESC 返回菜单',
        ]
    },
    {
        version: 'v1.79',
        date: '2026-05-03',
        items: [
            'Phase 3c 完成 — 主题背景系统',
            '6种区域主题：森林/洞穴/水晶/岩浆/虚空/终焉，每种独立配色+粒子+地形元素',
            '主题过渡动画：区域切换时1.2秒cubic缓动平滑混合旧/新背景',
            '动态元素增强：洞穴蝙蝠、水晶棱光、岩浆裂缝、虚空极光等区域专属效果',
            '主题配置模块化：theme-configs.js 独立管理，便于扩展新主题',
        ]
    },
    {
        version: 'v1.78',
        date: '2026-05-03',
        items: [
            'Phase 3b 完成 — 障碍物系统',
            '编辑器创建可旋转障碍物组（岩石/水晶/熔岩/树木/冰块等材质）',
            '障碍物组支持旋转、缩放、移动变换，元素保持相对位置',
            '游戏引擎渲染编辑器导出的自定义障碍物形状',
            '虫虫与障碍物碰撞检测',
        ]
    },
    {
        version: 'v1.77',
        date: '2026-05-03',
        items: [
            'Phase 3a 完成 — Boss系统',
            '区域Boss：特定区域生成大型Boss敌人，有独立行为和攻击模式',
            'Boss血量条：击杀Boss推进区域通关进度',
            'Boss击败特效：金色粒子爆发+胜利音效',
        ]
    },
    {
        version: 'v1.76',
        date: '2026-05-03',
        items: [
            'Phase E 完成 — 自由回访 + 区域实体懒加载',
            '区域切换暂存：离开区域时暂存食物和敌人，返回时自动恢复',
            '回访奖励：首次回访已通关区域时生成3个高级宝珠+金色粒子特效',
            'Barrier自动跳过：已通关区域的Barrier不再生成（自动开启）',
            '重启时Barrier重建：反映最新解锁/通关状态',
            '区域日志：进入区域时显示恢复的实体数量',
        ]
    },
    {
        version: 'v1.75',
        date: '2026-05-03',
        items: [
            'Phase D 完成 — 通关条件 + 进度存储',
            '区域通关检测：清除区域内敌人/Boss击败/门条件满足时自动通关',
            '通关反馈：绿色粒子爆发+浮动文字提示',
            '安全区3秒后自动通关',
            '死亡保留进度：区域解锁/通关状态在死亡后不丢失',
            '扩展进度存储：累计分数、最大长度持久化到 localStorage',
            '调试日志新增区域通关事件',
        ]
    },
    {
        version: 'v1.74',
        date: '2026-05-03',
        items: [
            'Phase C 完成 — 区域化实体生成',
            '宝珠区域生成：Food.inZone() 在玩家当前区域内均匀分布宝珠',
            '敌人区域锁定：敌人生成在当前区域内，homeZone 属性限制移动范围',
            '区域倍率：enemyMultiplier/foodMultiplier 影响生成数量和间隔',
            '子弹边界：子弹到达区域边界自动消失，不会跨区击中',
            '敌人数上限随区域倍率动态调整',
        ]
    },
    {
        version: 'v1.73',
        date: '2026-05-03',
        items: [
            'Phase B 完成 — Barrier 门系统',
            '区域间墙壁障碍门：在Z字形路径的门条件区域边界自动放置',
            '5种视觉主题：藤蔓墙/岩石墙/水晶墙/熔岩墙/能量墙/星光墙',
            '门条件显示：靠近时显示当前条件和达成状态（绿色=已满足）',
            '开门动画：两扇墙向两侧滑开+光柱+粒子消散',
            '粒子效果：门上持续产生向上飘浮的彩色粒子',
            '自动阻拦：虫虫靠近未开门的 Barrier 时自动停下',
        ]
    },
    {
        version: 'v1.72',
        date: '2026-05-03',
        items: [
            'Phase A 完成 — ZoneManager 区域管理系统',
            '25个区域网格：5×5 的 800×600 区域，Z字形路径（1→2→3→4→5↑10→9→…↑25）',
            '难度分层：基础层(1~5)→战斗层(6~10)→策略层(11~15)→技巧层(16~20)→终极层(21~25)',
            '7种主题视觉：森林/洞穴/水晶/岩浆/虚空/终焉/默认',
            '门条件系统：分数/长度/成年后代/幼体/击杀 5种门类型',
            '进度存储：区域解锁/通关状态自动保存到 localStorage',
            'Ctrl+Z 区域调试视图：显示所有区域编号、状态、主题',
            '左下角 HUD：显示当前区域编号和通关状态',
        ]
    },
    {
        version: 'v1.71',
        date: '2026-05-03',
        items: [
            'Phase 3 完成 — 羁绊深度系统',
            '成年后代：幼体长到11节自动进化，金色小皇冠标识',
            '驻守系统：成年后代可停在指定位置巡逻，主动攻击附近敌人',
            '家族门：地图上两道家族门（初试需2只/进阶需3只成年后代才能打开）',
            '家族门视觉：藤蔓纹理+锁图标+进度数字+开门动画',
            '家族门提示：玩家靠近时显示门名和成年后代需求',
            'UI优化：虫虫数量旁显示成年后代数量👑',
            '进化特效：金色粒子爆发+出生琶音',
        ]
    },
    {
        version: 'v1.70',
        date: '2026-05-03',
        items: [
            'Phase 2 完成 — 幼体性格与互动系统',
            '幼体出生时随机分配4种性格：勇敢⚔️、温柔💚、好奇🔍、淘气⚡',
            '性格模仿机制：幼体采样母体行为倾向（冲锋→勇敢，躲闪→温柔）',
            '勇敢护卫：主动冲到敌人和母体之间挡刀，15秒冷却',
            '温柔治疗：靠近母体时触发治疗脉冲，绿色光环扩散',
            '好奇侦察：主动探索200~600范围的远处宝珠，到达后闪烁提示',
            '淘气加速：移动速度×1.3倍，比兄弟姐妹更活泼',
            '护理恢复系统：受伤幼体变灰变慢（轻伤/重伤两级），母体靠近60px内2秒恢复1级',
            '受伤视觉：灰色覆盖+重伤头部感叹号+恢复中绿色脉冲',
            '恢复音效：C5→E5→G5上行琶音',
        ]
    },
    {
        version: 'v1.61',
        date: '2026-05-02',
        items: [
            '地图扩大5×5倍：世界地图4000×3000，视口800×600',
            '相机平滑跟随系统：Camera类使用lerp平滑跟随虫虫头部，帧率无关',
            '首帧snap：开局相机直接定位到虫虫位置，不再从(0,0)飘移',
            '网格瓦片平铺：大地图使用循环网格线代替固定边框',
            '出生点固定为(400,2800)，宝珠集中生成在左下方区域',
        ]
    },
    {
        version: 'v1.60',
        date: '2026-05-02',
        items: [
            '全身碰撞检测：虫虫全身与敌人全身碰撞，只有头部撞敌人才双向伤害',
        ]
    },
    {
        version: 'v1.59',
        date: '2026-05-02',
        items: [
            '幼体死亡变灰色尸体沉底：被敌人咬死后不再瞬间消失，改为DeadBody灰色下沉动画',
        ]
    },
    {
        version: 'v1.58',
        date: '2026-05-02',
        items: [
            '调试日志实时面板：Ctrl+L开启后左侧显示彩色滚动日志面板（带图标+颜色+可拖拽），支持导出txt',
        ]
    },
    {
        version: 'v1.57',
        date: '2026-05-02',
        items: [
            '调试日志系统：Ctrl+L记录所有游戏事件（进食/断尾/幼体/敌人/死亡），自动编号+导出txt',
        ]
    },
    {
        version: 'v1.56',
        date: '2026-05-02',
        items: [
            '游戏引擎支持编辑器导出的自定义形状：path、polygon、circle/ellipse、rectangle 等',
            '支持形状特效：glow 发光、blendMode 混合模式、opacity 透明度',
            '修复 path 曲线渲染：使用贝塞尔曲线替代折线，与编辑器保持一致的平滑效果',
        ]
    },
    {
        version: 'v1.55',
        date: '2026-05-02',
        items: [
            '虫虫长粗效果：长度≥20节时身体中间段按正态分布逐渐变粗，30节完全生效，呈现大蟒蛇体型',
            '幼体边界避让：幼体靠近边缘时自动向中心移动，不再卡在死角',
        ]
    },
    {
        version: 'v1.54',
        date: '2026-05-02',
        items: [
            'AI护子行为：AI虫发现自己的幼体被敌人咬住时，会冲向敌人攻击',
            '幼体逃亡机制：幼体第一次被敌人攻击后不再跟随父代，改为四散逃亡',
            'AI成年体可攻击敌人：AI虫撞向敌人时敌人会受伤，AI自己也会受到反击',
        ]
    },
    {
        version: 'v1.53',
        date: '2026-05-01',
        items: [
            '修复观战模式：从排行榜返回后画面不再静止，AI 虫虫继续运行',
            '宝珠自由飘动：移除左右和顶部边界碰撞，宝珠可飘出画面',
            '菜单背景动画：返回开始界面时有虫虫和宝珠在背景中游动',
            '尸体爆宝珠初速度降低50%，发射角度收窄为30°~150°减少横向飞散',
            'Magic Number 清理：尸体下沉、宝珠发射参数提取到 CONFIG.DEAD_BODY',
        ]
    },
    {
        version: 'v1.52',
        date: '2026-05-01',
        items: [
            'AI指令功能改进：支持更多关键词和更灵活的匹配',
            '新增帮助命令：输入"帮助"查看可用指令',
            '支持撤销/重做命令',
            '新增更多颜色和场景关键词',
        ]
    },
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
