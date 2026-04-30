/**
 * Leaderboard - 排行榜系统
 * LocalStorage存储，支持按字段排序，管理员可删除记录
 */
const STORAGE_KEY = 'snakeworm_leaderboard';
const MAX_ENTRIES = 100;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '23aa53b077ad35a3f680d5119efbab4f315c3ec7856bda41e9749aa393275136';

export class Leaderboard {
    static _isAdmin = false;

    /**
     * 获取排行榜数据
     * @returns {Array<{name:string, length:number, score:number, children:number, date:string}>}
     */
    static getData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * 保存一条成绩
     * @param {string} name 玩家名字
     * @param {number} length 最终长度
     * @param {number} score 最终分数
     * @param {number} children 后代数量（诞生次数）
     */
    static addScore(name, length, score, children) {
        const data = Leaderboard.getData();
        data.push({
            name: name.substring(0, 12),
            length,
            score,
            children,
            date: new Date().toLocaleDateString('zh-CN')
        });
        // 按分数降序排列，只保留前 MAX_ENTRIES 条
        data.sort((a, b) => b.score - a.score);
        if (data.length > MAX_ENTRIES) data.length = MAX_ENTRIES;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * SHA-256 哈希密码
     */
    static async _hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 删除一条记录（按原始索引）
     */
    static _deleteEntry(origIdx) {
        const data = Leaderboard.getData();
        if (origIdx >= 0 && origIdx < data.length) {
            data.splice(origIdx, 1);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }

    /**
     * 创建排行榜对话框
     * @param {number} [resultLength] 游戏结束时的长度（如果有）
     * @param {number} [resultScore] 游戏结束时的分数
     * @param {number} [resultChildren] 游戏结束时的后代数量
     * @param {Function} [onRestart] 点击重新开始的回调
     * @param {Function} [onClose] 点击返回/关闭的回调
     */
    static show(resultLength, resultScore, resultChildren, onRestart, onClose) {
        // 移除旧对话框
        const old = document.getElementById('leaderboardDialog');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'leaderboardDialog';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10001;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1a1a2e; border: 2px solid #e94560; border-radius: 12px;
            padding: 24px; min-width: 480px; max-width: 90vw; max-height: 85vh;
            display: flex; flex-direction: column; color: #eee;
        `;

        // 标题行（含管理员按钮）
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; align-items: center; justify-content: center; margin: 0 0 16px 0; position: relative;';

        const title = document.createElement('h2');
        title.style.cssText = 'margin: 0; color: #e94560; font-size: 20px;';
        title.textContent = '🏆 排行榜';

        const adminBtn = document.createElement('span');
        adminBtn.textContent = '⚙️';
        adminBtn.style.cssText = 'position: absolute; right: 0; cursor: pointer; font-size: 14px; opacity: 0.4; transition: opacity 0.2s;';
        adminBtn.title = '管理员';
        adminBtn.onmouseover = () => { if (!Leaderboard._isAdmin) adminBtn.style.opacity = '0.8'; };
        adminBtn.onmouseout = () => { if (!Leaderboard._isAdmin) adminBtn.style.opacity = '0.4'; };

        // 管理员状态指示
        const adminBadge = document.createElement('span');
        adminBadge.style.cssText = 'position: absolute; left: 0; font-size: 11px; color: #e94560; display: none;';
        adminBadge.textContent = '🔧 管理模式';

        titleRow.appendChild(adminBadge);
        titleRow.appendChild(title);
        titleRow.appendChild(adminBtn);
        panel.appendChild(titleRow);

        // 如果有成绩，显示提交区域
        let showSubmit = resultLength !== undefined && resultScore !== undefined;
        let hasSubmitted = false;
        if (showSubmit) {
            const submitArea = document.createElement('div');
            submitArea.style.cssText = 'margin-bottom: 16px; padding: 12px; background: rgba(233,69,96,0.1); border-radius: 8px; text-align: center;';

            const resultText = document.createElement('p');
            resultText.style.cssText = 'margin: 0 0 10px 0; font-size: 14px;';
            resultText.textContent = `最终长度: ${resultLength} | 分数: ${resultScore} | 后代: ${resultChildren}`;
            submitArea.appendChild(resultText);

            const inputRow = document.createElement('div');
            inputRow.style.cssText = 'display: flex; gap: 8px; justify-content: center; align-items: center;';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = '输入你的名字';
            nameInput.maxLength = 12;
            nameInput.style.cssText = `
                background: rgba(255,255,255,0.1); border: 1px solid #555; border-radius: 6px;
                padding: 6px 12px; color: #fff; font-size: 14px; width: 140px; outline: none;
            `;

            const submitBtn = document.createElement('button');
            submitBtn.textContent = '提交成绩';
            submitBtn.style.cssText = `
                background: #e94560; color: #fff; border: none; padding: 6px 18px;
                font-size: 14px; border-radius: 6px; cursor: pointer;
            `;
            submitBtn.onmouseover = () => submitBtn.style.background = '#c73652';
            submitBtn.onmouseout = () => submitBtn.style.background = '#e94560';
            submitBtn.onclick = () => {
                const name = nameInput.value.trim() || '匿名虫虫';
                Leaderboard.addScore(name, resultLength, resultScore, resultChildren);
                hasSubmitted = true;
                submitBtn.disabled = true;
                submitBtn.textContent = '已提交 ✓';
                submitBtn.style.background = '#555';
                nameInput.disabled = true;
                // 刷新表格
                Leaderboard._renderTable(tableBody, sortState);
            };

            inputRow.appendChild(nameInput);
            inputRow.appendChild(submitBtn);
            submitArea.appendChild(inputRow);
            panel.appendChild(submitArea);
        }

        // 排序状态
        const sortState = { field: 'score', dir: 'desc' };

        // 表格
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 16px;';

        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';

        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const cols = [
            { key: 'rank', label: '#', width: '36px' },
            { key: 'name', label: '名字', width: 'auto' },
            { key: 'length', label: '长度', width: '70px' },
            { key: 'score', label: '分数', width: '80px' },
            { key: 'children', label: '后代', width: '60px' },
            { key: 'date', label: '日期', width: '90px' }
        ];
        cols.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = `
                padding: 8px 6px; text-align: center; color: #e94560; border-bottom: 2px solid #333;
                ${col.key !== 'rank' ? 'cursor: pointer; user-select: none;' : ''}
                white-space: nowrap; width: ${col.width};
            `;
            th.textContent = col.label;
            if (col.key !== 'rank') {
                th.addEventListener('click', () => {
                    if (sortState.field === col.key) {
                        sortState.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
                    } else {
                        sortState.field = col.key;
                        sortState.dir = 'desc';
                    }
                    // 更新表头箭头
                    Leaderboard._updateHeaders(headerRow, sortState);
                    Leaderboard._renderTable(tableBody, sortState);
                });
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tableBody = document.createElement('tbody');
        table.appendChild(tableBody);
        tableWrap.appendChild(table);
        panel.appendChild(tableWrap);

        // 初始渲染
        Leaderboard._updateHeaders(headerRow, sortState);
        Leaderboard._renderTable(tableBody, sortState);

        // 管理员登录逻辑
        adminBtn.onclick = () => {
            if (Leaderboard._isAdmin) {
                // 退出管理模式
                Leaderboard._isAdmin = false;
                adminBtn.style.opacity = '0.4';
                adminBadge.style.display = 'none';
                Leaderboard._updateHeaders(headerRow, sortState);
                Leaderboard._renderTable(tableBody, sortState);
                return;
            }
            // 显示登录对话框
            Leaderboard._showAdminLogin(overlay, () => {
                Leaderboard._isAdmin = true;
                adminBtn.style.opacity = '1';
                adminBadge.style.display = 'block';
                Leaderboard._updateHeaders(headerRow, sortState);
                Leaderboard._renderTable(tableBody, sortState);
            });
        };

        // 按钮行
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

        if (onRestart) {
            const restartBtn = document.createElement('button');
            restartBtn.textContent = '重新开始';
            restartBtn.style.cssText = `
                background: #e94560; color: #fff; border: none; padding: 8px 28px;
                font-size: 15px; border-radius: 6px; cursor: pointer;
            `;
            restartBtn.onclick = () => { overlay.remove(); onRestart(); };
            btnRow.appendChild(restartBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = onRestart ? '返回' : '关闭';
        closeBtn.style.cssText = `
            background: #555; color: #fff; border: none; padding: 8px 28px;
            font-size: 15px; border-radius: 6px; cursor: pointer;
        `;
        closeBtn.onclick = () => { overlay.remove(); if (onClose) onClose(); };
        btnRow.appendChild(closeBtn);

        panel.appendChild(btnRow);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 回车提交
        if (showSubmit) {
            overlay.querySelector('input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') overlay.querySelector('button[style*="e94560"]').click();
            });
            overlay.querySelector('input').focus();
        }
    }

    /**
     * 显示管理员登录对话框
     */
    static _showAdminLogin(parentOverlay, onSuccess) {
        const loginOverlay = document.createElement('div');
        loginOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10002;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        const loginPanel = document.createElement('div');
        loginPanel.style.cssText = `
            background: #1a1a2e; border: 2px solid #e94560; border-radius: 10px;
            padding: 20px; min-width: 280px; color: #eee;
        `;

        const loginTitle = document.createElement('h3');
        loginTitle.style.cssText = 'margin: 0 0 14px 0; text-align: center; color: #e94560; font-size: 16px;';
        loginTitle.textContent = '🔒 管理员登录';
        loginPanel.appendChild(loginTitle);

        // 用户名
        const userLabel = document.createElement('label');
        userLabel.style.cssText = 'display: block; font-size: 12px; color: #999; margin-bottom: 4px;';
        userLabel.textContent = '用户名';
        loginPanel.appendChild(userLabel);

        const userInput = document.createElement('input');
        userInput.type = 'text';
        userInput.style.cssText = `
            width: 100%; background: rgba(255,255,255,0.1); border: 1px solid #555;
            border-radius: 6px; padding: 6px 10px; color: #fff; font-size: 14px;
            outline: none; margin-bottom: 10px; box-sizing: border-box;
        `;
        loginPanel.appendChild(userInput);

        // 密码
        const passLabel = document.createElement('label');
        passLabel.style.cssText = 'display: block; font-size: 12px; color: #999; margin-bottom: 4px;';
        passLabel.textContent = '密码';
        loginPanel.appendChild(passLabel);

        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.style.cssText = `
            width: 100%; background: rgba(255,255,255,0.1); border: 1px solid #555;
            border-radius: 6px; padding: 6px 10px; color: #fff; font-size: 14px;
            outline: none; margin-bottom: 6px; box-sizing: border-box;
        `;
        loginPanel.appendChild(passInput);

        // 错误提示
        const errorMsg = document.createElement('p');
        errorMsg.style.cssText = 'margin: 0 0 10px 0; font-size: 12px; color: #e94560; min-height: 16px;';
        loginPanel.appendChild(errorMsg);

        // 按钮行
        const loginBtnRow = document.createElement('div');
        loginBtnRow.style.cssText = 'display: flex; gap: 8px; justify-content: center;';

        const loginOkBtn = document.createElement('button');
        loginOkBtn.textContent = '登录';
        loginOkBtn.style.cssText = `
            background: #e94560; color: #fff; border: none; padding: 6px 24px;
            font-size: 14px; border-radius: 6px; cursor: pointer;
        `;
        loginOkBtn.onmouseover = () => loginOkBtn.style.background = '#c73652';
        loginOkBtn.onmouseout = () => loginOkBtn.style.background = '#e94560';

        const loginCancelBtn = document.createElement('button');
        loginCancelBtn.textContent = '取消';
        loginCancelBtn.style.cssText = `
            background: #555; color: #fff; border: none; padding: 6px 24px;
            font-size: 14px; border-radius: 6px; cursor: pointer;
        `;

        const doLogin = async () => {
            const username = userInput.value.trim();
            const password = passInput.value;
            if (username !== ADMIN_USERNAME) {
                errorMsg.textContent = '用户名错误';
                return;
            }
            const hash = await Leaderboard._hashPassword(password);
            if (hash !== ADMIN_PASSWORD_HASH) {
                errorMsg.textContent = '密码错误';
                return;
            }
            loginOverlay.remove();
            onSuccess();
        };

        loginOkBtn.onclick = doLogin;
        loginCancelBtn.onclick = () => loginOverlay.remove();

        // 回车登录
        passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
        userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passInput.focus(); });

        loginBtnRow.appendChild(loginOkBtn);
        loginBtnRow.appendChild(loginCancelBtn);
        loginPanel.appendChild(loginBtnRow);

        loginOverlay.appendChild(loginPanel);
        document.body.appendChild(loginOverlay);
        userInput.focus();
    }

    /**
     * 更新表头排序指示
     */
    static _updateHeaders(headerRow, sortState) {
        const ths = headerRow.querySelectorAll('th');
        const fieldMap = ['', 'name', 'length', 'score', 'children', 'date'];
        const labels = ['', '名字', '长度', '分数', '后代', '日期'];

        // 移除旧的操作列
        const oldOp = headerRow.querySelector('th[data-op]');
        if (oldOp) oldOp.remove();

        ths.forEach((th, i) => {
            const key = fieldMap[i];
            if (!key || key === 'rank') return;
            const arrow = key === sortState.field ? (sortState.dir === 'desc' ? ' ▼' : ' ▲') : '';
            th.textContent = labels[i] + arrow;
        });

        // 管理模式下添加操作列
        if (Leaderboard._isAdmin) {
            const opTh = document.createElement('th');
            opTh.setAttribute('data-op', '1');
            opTh.style.cssText = 'padding: 8px 6px; text-align: center; color: #e94560; border-bottom: 2px solid #333; white-space: nowrap; width: 50px;';
            opTh.textContent = '操作';
            headerRow.appendChild(opTh);
        }
    }

    /**
     * 渲染排行榜表格
     */
    static _renderTable(tbody, sortState) {
        let data = Leaderboard.getData().map((entry, i) => ({ ...entry, _origIdx: i }));
        const { field, dir } = sortState;
        data.sort((a, b) => {
            let va = a[field], vb = b[field];
            if (typeof va === 'string') return dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
            return dir === 'desc' ? vb - va : va - vb;
        });

        const isAdmin = Leaderboard._isAdmin;
        const colCount = isAdmin ? 7 : 6;

        tbody.innerHTML = '';
        if (data.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = colCount;
            td.style.cssText = 'padding: 20px; text-align: center; color: #666;';
            td.textContent = '暂无记录，快来挑战吧！';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        data.forEach((entry, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 0 ? 'background: rgba(255,255,255,0.03);' : '';
            const values = [i + 1, entry.name, entry.length, entry.score, entry.children, entry.date];
            values.forEach((val) => {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 6px; text-align: center; border-bottom: 1px solid #222;';
                td.textContent = val;
                tr.appendChild(td);
            });

            // 管理模式：添加删除按钮
            if (isAdmin) {
                const opTd = document.createElement('td');
                opTd.style.cssText = 'padding: 6px; text-align: center; border-bottom: 1px solid #222;';
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.title = '删除此记录';
                delBtn.style.cssText = `
                    background: none; border: none; cursor: pointer; font-size: 14px;
                    padding: 2px 4px; border-radius: 4px; transition: background 0.2s;
                `;
                delBtn.onmouseover = () => delBtn.style.background = 'rgba(233,69,96,0.3)';
                delBtn.onmouseout = () => delBtn.style.background = 'none';
                delBtn.onclick = () => {
                    if (confirm(`确定删除 ${entry.name} 的记录？\n分数: ${entry.score} | 长度: ${entry.length}`)) {
                        Leaderboard._deleteEntry(entry._origIdx);
                        Leaderboard._renderTable(tbody, sortState);
                    }
                };
                opTd.appendChild(delBtn);
                tr.appendChild(opTd);
            }

            tbody.appendChild(tr);
        });
    }
}
