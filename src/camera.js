/**
 * Camera - 区域锁定镜头系统
 *
 * 镜头固定在区域中心，不跟随虫虫在区域内移动。
 * 当虫虫接近区域边界时，镜头开始平滑过渡到下一区域中心。
 * 过渡过程中镜头不可逆——一旦开始向前移动就不会因虫虫后退而回退。
 * 当虫虫超过目标区域中心后，镜头锁定在新区域中心。
 * 直到虫虫再次接近下一个区域边界时才重新开始过渡。
 *
 * 挖掘同步模式：当虫虫在挖区域墙时，镜头不跟随虫虫位置快速移动，
 * 而是跟随挖掘进度——每挖穿一个墙壁颗粒，镜头才同步移动一个颗粒的距离（14px）。
 * 当墙壁挖穿后，切换回正常平滑过渡模式，缓慢移动到下一区域中心。
 */
import { CONFIG } from './config.js';

// 虫虫距区域边缘多远时触发镜头过渡（像素）
const EDGE_TRIGGER = 180;
// 正常过渡平滑度（越小越慢）
const TRANSITION_SMOOTH = 0.045;
// 挖掘同步模式的平滑度（跟手但不跳变）
const DIG_SYNC_SMOOTH = 0.06;
// 墙壁挖穿后切换到正常模式的平滑度（中等速度）
const POST_DIG_SMOOTH = 0.03;

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this._initialized = false;

        // 区域锁定状态
        this._lockedZone = null;      // 当前锁定区域对象
        this._transitioning = false;  // 是否正在向下一区域过渡
        this._targetZone = null;      // 过渡目标区域
        this._direction = null;       // 过渡方向 {dx, dy} (网格方向)
        this._maxForward = null;      // 已达到的最大前进位置 {x, y}（防回退）

        // 挖掘同步状态
        this._digSync = false;        // 是否处于挖掘同步模式
        this._digBaseX = 0;           // dig-sync开始时的镜头X
        this._digBaseY = 0;           // dig-sync开始时的镜头Y
        this._lastDigDepth = 0;       // 已记录的最大挖掘深度（cell数，只增不减）
    }

    /**
     * 设置初始锁定区域（游戏开始时调用）
     * @param {object} zone - 区域配置对象 {x, y, width, height, centerX, centerY, col, row, id}
     */
    setInitialZone(zone) {
        this._lockedZone = zone;
        this._targetZone = null;
        this._transitioning = false;
        this._direction = null;
        this._maxForward = null;
        this._digSync = false;
        this._lastDigDepth = 0;
        this.x = zone.x;
        this.y = zone.y;
        this._initialized = true;
    }

    /**
     * 区域锁定模式的镜头跟随
     * @param {number} targetX - 虫虫头部世界坐标X
     * @param {number} targetY - 虫虫头部世界坐标Y
     * @param {number} dt - 帧间隔（秒）
     * @param {object|null} currentZone - 虫虫当前所在区域
     * @param {object|null} nextZone - 路径中的下一个区域（如有）
     * @param {object|null} [activeWall] - 当前过渡方向上的可挖掘墙壁（如有）
     */
    follow(targetX, targetY, dt, currentZone, nextZone, activeWall) {
        if (!this._initialized) {
            if (currentZone) {
                this.setInitialZone(currentZone);
            }
            return;
        }

        // 如果虫虫所在区域和锁定区域差异太大（比如重生），重新snap
        if (currentZone && this._lockedZone && !this._transitioning) {
            const dc = Math.abs(currentZone.col - this._lockedZone.col);
            const dr = Math.abs(currentZone.row - this._lockedZone.row);
            if (dc + dr > 1) {
                this.setInitialZone(currentZone);
                return;
            }
        }

        const lerpFactor = 1 - Math.pow(1 - TRANSITION_SMOOTH, dt * 60);
        const digLerpFactor = 1 - Math.pow(1 - DIG_SYNC_SMOOTH, dt * 60);
        const postDigLerpFactor = 1 - Math.pow(1 - POST_DIG_SMOOTH, dt * 60);

        if (!this._transitioning) {
            // ========== 锁定状态：镜头固定在区域中心 ==========
            this.x = this._lockedZone.x;
            this.y = this._lockedZone.y;

            // 检查是否需要开始过渡
            if (nextZone) {
                const zone = this._lockedZone;
                const dx = nextZone.col - zone.col;
                const dy = nextZone.row - zone.row;

                let nearEdge = false;
                if (dx === 1)      nearEdge = targetX > zone.x + zone.width - EDGE_TRIGGER;
                else if (dx === -1) nearEdge = targetX < zone.x + EDGE_TRIGGER;
                else if (dy === 1)  nearEdge = targetY > zone.y + zone.height - EDGE_TRIGGER;
                else if (dy === -1) nearEdge = targetY < zone.y + EDGE_TRIGGER;

                if (nearEdge) {
                    this._transitioning = true;
                    this._targetZone = nextZone;
                    this._direction = { dx, dy };
                    this._maxForward = { x: this.x, y: this.y };

                    // 如果过渡方向上有活跃墙壁，立即进入挖掘同步模式
                    if (activeWall && activeWall.active) {
                        this._digSync = true;
                        this._digBaseX = this.x;
                        this._digBaseY = this.y;
                        this._lastDigDepth = 0;
                    }
                }
            }

        } else {
            // ========== 过渡状态 ==========
            const target = this._targetZone;
            if (!target) {
                this._transitioning = false;
                this._digSync = false;
                return;
            }

            const dir = this._direction;

            if (this._digSync) {
                // ========== 挖掘同步模式 ==========
                if (activeWall && activeWall.active) {
                    const { depth, fraction } = activeWall.getDigDepthFromDir(dir.dx, dir.dy);

                    // 每挖穿一个cell（14px），镜头同步移动一个cell的距离
                    // 用max保证只前进不后退
                    this._lastDigDepth = Math.max(this._lastDigDepth, depth);
                    const cellSize = CONFIG.DIGGABLE_WALL.CELL_SIZE;
                    const depthPx = this._lastDigDepth * cellSize;

                    const targetCamX = this._digBaseX + depthPx * dir.dx;
                    const targetCamY = this._digBaseY + depthPx * dir.dy;

                    // 平滑插值（不跳变）
                    this.x += (targetCamX - this.x) * digLerpFactor;
                    this.y += (targetCamY - this.y) * digLerpFactor;

                    // 更新 _maxForward（只前进不后退）
                    this._maxForward.x = this.x;
                    this._maxForward.y = this.y;

                    // 如果挖穿进度 >= 1（墙已完全穿越），退出dig-sync进入平滑过渡
                    if (fraction >= 0.99) {
                        this._digSync = false;
                    }
                } else {
                    // 墙已不存在（已被子弹打穿或Boss关解锁），退出dig-sync
                    this._digSync = false;
                }

            } else {
                // ========== 正常过渡模式（墙挖穿后或无墙时） ==========
                // 平滑移动到目标区域中心
                const goalX = target.x;
                const goalY = target.y;

                // 主轴（过渡方向）：只能前进不能后退
                if (dir.dx !== 0) {
                    const forwardGoal = dir.dx > 0
                        ? Math.max(this._maxForward.x, goalX)
                        : Math.min(this._maxForward.x, goalX);
                    this._maxForward.x = forwardGoal;
                    this.x += (forwardGoal - this.x) * postDigLerpFactor;
                }

                if (dir.dy !== 0) {
                    const forwardGoal = dir.dy > 0
                        ? Math.max(this._maxForward.y, goalY)
                        : Math.min(this._maxForward.y, goalY);
                    this._maxForward.y = forwardGoal;
                    this.y += (forwardGoal - this.y) * postDigLerpFactor;
                }

                // 副轴（非过渡方向）：平滑到目标区域位置
                if (dir.dx === 0) {
                    this.x += (target.x - this.x) * postDigLerpFactor;
                }
                if (dir.dy === 0) {
                    this.y += (target.y - this.y) * postDigLerpFactor;
                }
            }

            // ---- 检查是否到达锁定点 ----
            // 当虫虫超过目标区域中心时，锁定
            let passedCenter = false;
            if (dir.dx === 1)       passedCenter = targetX >= target.centerX;
            else if (dir.dx === -1) passedCenter = targetX <= target.centerX;
            else if (dir.dy === 1)  passedCenter = targetY >= target.centerY;
            else if (dir.dy === -1) passedCenter = targetY <= target.centerY;

            if (passedCenter) {
                this._lockedZone = target;
                this._transitioning = false;
                this._targetZone = null;
                this._direction = null;
                this._maxForward = null;
                this._digSync = false;
                this._lastDigDepth = 0;
                this.x = target.x;
                this.y = target.y;
            }
        }

        // 钳制到地图边界
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
