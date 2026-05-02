/**
 * Camera - 相机/视口系统
 * 跟随玩家头部，提供世界坐标↔屏幕坐标转换
 */
import { CONFIG } from './config.js';

export class Camera {
    constructor() {
        this.x = 0;  // 视口左上角在世界坐标中的x
        this.y = 0;  // 视口左上角在世界坐标中的y
    }

    /**
     * 跟随目标（通常是玩家头部），保持目标在视口中央
     * @param {number} targetX - 世界坐标x
     * @param {number} targetY - 世界坐标y
     */
    follow(targetX, targetY) {
        // 目标居中
        this.x = targetX - CONFIG.CANVAS_WIDTH / 2;
        this.y = targetY - CONFIG.CANVAS_HEIGHT / 2;

        // 钳制到地图边界，不超出地图范围
        this.x = Math.max(0, Math.min(CONFIG.MAP_WIDTH - CONFIG.CANVAS_WIDTH, this.x));
        this.y = Math.max(0, Math.min(CONFIG.MAP_HEIGHT - CONFIG.CANVAS_HEIGHT, this.y));
    }

    /**
     * 世界坐标 → 屏幕坐标
     */
    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    }

    /**
     * 屏幕坐标 → 世界坐标
     */
    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    }
}
