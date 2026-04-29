/**
 * utils.js - 公共工具函数
 * hexToRgba - 颜色转换
 * drawGlow - 径向渐变发光（替代 shadowBlur）
 * drawTextGlow - 文字发光光晕
 */

export function hexToRgba(hex, alpha) {
    if (hex.startsWith('rgb')) {
        return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 绘制发光光晕（替代 shadowBlur，性能更好）
 */
export function drawGlow(ctx, x, y, radius, color, glowSize) {
    const glowRadius = radius + glowSize;
    const grd = ctx.createRadialGradient(x, y, radius * 0.5, x, y, glowRadius);
    grd.addColorStop(0, hexToRgba(color, 0.25));
    grd.addColorStop(0.5, hexToRgba(color, 0.1));
    grd.addColorStop(1, hexToRgba(color, 0));
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
}

/**
 * 绘制文字发光光晕（替代文字 shadowBlur）
 */
export function drawTextGlow(ctx, text, x, y, color, glowSize) {
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    ctx.fillStyle = hexToRgba(color, 0.15);
    for (const [ox, oy] of offsets) {
        ctx.fillText(text, x + ox * glowSize * 0.15, y + oy * glowSize * 0.15);
    }
}
