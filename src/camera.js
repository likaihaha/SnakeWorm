/**
 * Camera - 相机/视口系统
 * 跟随玩家头部，提供世界坐标↔屏幕坐标转换
 */
import { CONFIG } from './config.js';

export class Camera {
    constructor() {
        this.x = 0;  // 视口左上角在世界坐标中的x
        this.y = 0;  // 视口左上角在世界坐标中的y
        this.smooth = 0.08; // 跟随平滑度（0=不动, 1=瞬间跟上）
    }

    /**
     * 平滑跟随目标（通常是玩家头部），带lerp延迟追尾
     * @param {number} targetX - 世界坐标x
     * @param {number} targetY - 世界坐标y
     * @param {number} dt - 帧间隔（秒）
     */
    follow(targetX, targetY, dt) {
        // 目标位置（视口左上角）
        const goalX = targetX - CONFIG.CANVAS_WIDTH / 2;
        const goalY = targetY - CONFIG.CANVAS_HEIGHT / 2;

        // 平滑插值跟上，dt补偿帧率差异
        const lerpFactor = 1 - Math.pow(1 - this.smooth, dt * 60);
        this.x += (goalX - this.x) * lerpFactor;
        this.y += (goalY - this.y) * lerpFactor;

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
