/**
 * main.js - 游戏入口文件
 * 创建 Game 实例、初始化图例 canvas、绑定 HTML 按钮事件
 */
import { Game } from './game.js';
import { Leaderboard } from './leaderboard.js';

// 创建游戏实例
const game = new Game();

// 暴露到全局供 HTML inline onclick 使用（兼容性）
window.game = game;

// 绑定按钮事件（替代 HTML inline onclick）
const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', () => game.startGame());

const pauseResumeBtn = document.getElementById('pauseResumeBtn');
if (pauseResumeBtn) pauseResumeBtn.addEventListener('click', () => game.resumeGame());

const gameOverBtn = document.getElementById('gameOverRestartBtn');
if (gameOverBtn) gameOverBtn.addEventListener('click', () => game.restart());

// 排行榜按钮（开始界面）
const leaderboardBtn = document.getElementById('leaderboardBtn');
if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => Leaderboard.show());

const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => game.requestFullscreen());

// 初始化图例颈部 canvas（用游戏真实 drawNeckIndicator 绘制）
document.querySelectorAll('.legend-neck-canvas').forEach(cvs => {
    const ctx = cvs.getContext('2d');
    const isPlayer = cvs.dataset.player === 'true';
    const centerX = cvs.width / 2;
    const centerY = cvs.height / 2;
    const radius = 6;

    ctx.fillStyle = isPlayer ? '#4ecca3' : '#ff6b6b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    const rayCount = 8;
    const rayInner = radius * 0.6;
    const rayOuter = radius * 1.3;
    const rayWidth = 1.5;
    const rayColor = isPlayer ? 'rgba(120, 255, 200, 0.7)' : 'rgba(100, 200, 255, 0.6)';

    ctx.strokeStyle = rayColor;
    ctx.lineWidth = rayWidth;

    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const x1 = centerX + Math.cos(angle) * rayInner;
        const y1 = centerY + Math.sin(angle) * rayInner;
        const x2 = centerX + Math.cos(angle) * rayOuter;
        const y2 = centerY + Math.sin(angle) * rayOuter;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
});

// 初始化图例蓝色弹夹 canvas（绘制 2/5 扇形蓝色弹夹）
document.querySelectorAll('.legend-mag-canvas').forEach(cvs => {
    const ctx = cvs.getContext('2d');
    const centerX = cvs.width / 2;
    const centerY = cvs.height / 2;
    const radius = 7;

    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4dabf7';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * 2 / 5));
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#339af0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
});

// 全局错误边界
window.onerror = function(msg, url, line, col, error) {
    console.error(`[全局异常] ${msg} at ${url}:${line}:${col}`, error);
    try {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('游戏遇到异常，请刷新页面重试', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillStyle = '#888';
            ctx.font = '12px monospace';
            ctx.fillText(msg, canvas.width / 2, canvas.height / 2 + 20);
        }
    } catch (_) {}
    return true;
};

window.addEventListener('unhandledrejection', function(e) {
    console.error('[未处理的Promise异常]', e.reason);
});
