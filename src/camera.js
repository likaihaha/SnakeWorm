/**
 * Camera - 相机/视口系统
 * 跟随玩家头部，提供世界坐标↔屏幕坐标转换
 * 特殊规则：虫虫向上游时镜头Y轴不跟随（只在向下移动时跟随Y）
 */
import { CONFIG } from './config.js';

export class Camera {
    constructor() {
        this.x = 0;  // 视口左上角在世界坐标中的x
        this.y = 0;  // 视口左上角在世界坐标中的y
        this.smooth = 0.08; // 跟随平滑度（0=不动, 1=瞬间跟上）
        this._initialized = false; // 首帧是否已snap到位
        this._prevTargetY = null;   // 上一帧目标Y，用于判断方向
    }

    /**
     * 平滑跟随目标（通常是玩家头部），带lerp延迟追尾
     * 特殊规则：虫虫向上游时镜头Y轴不跟随（只在向下移动时跟随Y）
     * @param {number} targetX - 世界坐标x
     * @param {number} targetY - 世界坐标y
     * @param {number} dt - 帧间隔（秒）
     */
    follow(targetX, targetY, dt) {
        // 目标位置（视口左上角）
        const goalX = targetX - CONFIG.CANVAS_WIDTH / 2;
        const goalY = targetY - CONFIG.CANVAS_HEIGHT / 2;

        // 首帧直接snap到位，避免从(0,0)慢慢飘过去
        if (!this._initialized) {
            this.x = goalX;
            this.y = goalY;
            this._prevTargetY = targetY;
            this._initialized = true;
            // 钳制到地图边界
            this.x = Math.max(0, Math.min(CONFIG.MAP_WIDTH - CONFIG.CANVAS_WIDTH, this.x));
            this.y = Math.max(0, Math.min(CONFIG.MAP_HEIGHT - CONFIG.CANVAS_HEIGHT, this.y));
            return;
        }

        // 判断虫虫是否在向上游（Y减小）
        const movingUp = this._prevTargetY !== null && targetY < this._prevTargetY - 0.01;
        this._prevTargetY = targetY;

        // X轴始终跟随
        const lerpFactor = 1 - Math.pow(1 - this.smooth, dt * 60);
        this.x += (goalX - this.x) * lerpFactor;

        // Y轴：只有向下移动时才跟随，向上移动时镜头Y轴锁定不动
        if (!movingUp) {
            this.y += (goalY - this.y) * lerpFactor;
        }

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
