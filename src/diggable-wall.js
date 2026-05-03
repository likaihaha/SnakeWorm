/**
 * DiggableWall - 可挖掘墙壁系统（珊瑚礁造型版）
 * Phase 3c: 区域间的可破坏泥墙
 *
 * 在相邻区域之间放置由网格单元组成的泥墙
 * 泥墙呈下面宽、上面窄的珊瑚礁形状
 * 玩家虫虫的头部碰墙时，嘴巴一张一合，逐单元挖穿
 * 墙体内随机嵌入宝珠作为奖励
 * 挖掘时产生泥块掉落粒子特效
 */
import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba } from './utils.js';
import { Food } from './entities.js';

const DW = CONFIG.DIGGABLE_WALL;

/**
 * 确定性伪随机函数（基于坐标hash）
 * 用于同一位置的单元每次生成相同外观
 */
function hashRandom(x, y, seed) {
    let n = (x * 374761393 + y * 668265263 + seed * 1274126177) & 0xFFFFFFFF;
    n = ((n ^ (n >> 13)) * 1103515245) & 0xFFFFFFFF;
    n = (n ^ (n >> 16)) & 0xFFFFFFFF;
    return (n & 0x7FFFFFFF) / 0x7FFFFFFF;
}

/**
 * 单个泥块单元
 */
class WallCell {
    constructor(col, row, worldX, worldY) {
        this.col = col;           // 网格列
        this.row = row;           // 网格行
        this.worldX = worldX;     // 左上角世界坐标X
        this.worldY = worldY;     // 左上角世界坐标Y
        this.hp = 1.0;            // 耐久度 1.0=完整 0.0=挖穿
        this.dug = false;         // 是否已挖穿
        this.orbType = null;      // 嵌入的宝珠类型（null=无）
        this.orbEaten = false;    // 宝珠是否已被获取
        this.crackPhase = Math.random() * Math.PI * 2;  // 裂纹动画相位
        // 视觉随机化（确定性：用位置作种子）
        const hr = hashRandom(col, row, 7);
        this.brightness = 0.85 + hr * 0.3;  // 亮度变化
        this.variant = hashRandom(row, col, 13);  // 外观变体 0~1
        // 四角扰动（珊瑚礁有机感）
        this.jitter = [
            (hashRandom(col, row, 1) - 0.5) * 4,
            (hashRandom(col, row, 2) - 0.5) * 4,
            (hashRandom(col, row, 3) - 0.5) * 4,
            (hashRandom(col, row, 4) - 0.5) * 4,
        ];
    }
}

/**
 * 泥块掉落粒子
 */
class DebrisParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;  // 向上飞溅为主
        const speed = DW.DEBRIS_SPEED * (0.5 + Math.random());
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 2;  // 向上初速度
        this.gravity = 15 + Math.random() * 10;  // 重力
        this.life = DW.DEBRIS_LIFE * (0.6 + Math.random() * 0.4);
        this.maxLife = this.life;
        this.size = DW.DEBRIS_SIZE_MIN + Math.random() * DW.DEBRIS_SIZE_SPREAD;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 8;
        this.color = Math.random() > 0.5 ? DW.COLOR : DW.COLOR_DARK;
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        this.rotation += this.rotSpeed * dt;
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        // 绘制不规则泥块（菱形）
        const s = this.size * (0.5 + 0.5 * alpha);  // 缩小消逝
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.7, 0);
        ctx.lineTo(0, s * 0.8);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

export class DiggableWall {
    /**
     * @param {object} fromZone - 来源区域配置 {x, y, width, height, ...}
     * @param {object} toZone - 目标区域配置
     */
    constructor(fromZone, toZone) {
        this.fromZone = fromZone;
        this.toZone = toZone;
        this.cells = [];          // 二维网格单元
        this.cols = 0;
        this.rows = 0;
        this.debris = [];         // 泥块粒子
        this.active = true;       // 墙是否激活（挖穿后可移除）

        // 墙体区域的世界坐标范围
        this.wallX = 0;
        this.wallY = 0;
        this.wallW = 0;
        this.wallH = 0;

        this._buildWall(fromZone, toZone);
    }

    _buildWall(fromZone, toZone) {
        const cellSize = DW.CELL_SIZE;
        const thickness = DW.THICKNESS;

        const dx = toZone.col - fromZone.col;
        const dy = toZone.row - fromZone.row;

        if (dx === 1) {
            // 右侧边界：垂直墙
            this.wallX = fromZone.x + fromZone.width - thickness / 2;
            this.wallY = fromZone.y;
            this.wallW = thickness;
            this.wallH = fromZone.height;
            this.orientation = 'vertical';
        } else if (dx === -1) {
            // 左侧边界
            this.wallX = toZone.x + toZone.width - thickness / 2;
            this.wallY = fromZone.y;
            this.wallW = thickness;
            this.wallH = fromZone.height;
            this.orientation = 'vertical';
        } else if (dy === 1) {
            // 下侧边界：水平墙
            this.wallX = fromZone.x;
            this.wallY = fromZone.y + fromZone.height - thickness / 2;
            this.wallW = fromZone.width;
            this.wallH = thickness;
            this.orientation = 'horizontal';
        } else if (dy === -1) {
            // 上侧边界
            this.wallX = fromZone.x;
            this.wallY = toZone.y + toZone.height - thickness / 2;
            this.wallW = fromZone.width;
            this.wallH = thickness;
            this.orientation = 'horizontal';
        } else {
            this.active = false;
            return;
        }

        // 珊瑚礁造型种子
        const reefSeed = fromZone.id * 31 + (toZone.id || 0) * 17 + 42;
        const noiseAmp = DW.REEF_NOISE_AMP || 3;
        const bottomExpand = DW.BOTTOM_EXPAND || 1.4;

        // 用像素大小的cell来填充墙区域
        this.cols = Math.ceil(this.wallW / cellSize);
        this.rows = Math.ceil(this.wallH / cellSize);

        for (let c = 0; c < this.cols; c++) {
            this.cells[c] = [];
            for (let r = 0; r < this.rows; r++) {
                const wx = this.wallX + c * cellSize;
                const wy = this.wallY + r * cellSize;
                const cell = new WallCell(c, r, wx, wy);

                // ---- 珊瑚礁随机轮廓判断 ----
                let inReef = true;

                if (this.orientation === 'vertical') {
                    // 垂直墙：r=0是顶部，r=rows-1是底部
                    const t = 1 - r / (this.rows - 1 || 1); // 1=顶部 0=底部
                    const widthScale = 1 + (bottomExpand - 1) * t; // 顶部窄、底部宽
                    const center = (this.cols - 1) / 2;
                    const halfMax = this.cols / 2;
                    const halfCurrent = halfMax / widthScale;
                    const dist = Math.abs(c - center);
                    // 噪声扰动边界
                    const n = (hashRandom(c, r, reefSeed) - 0.5) * noiseAmp;
                    if (dist > halfCurrent + n) {
                        inReef = false;
                    }
                } else {
                    // 水平墙：c=0是左端，c=cols-1是右端
                    const t = 1 - c / (this.cols - 1 || 1); // 1=左端 0=右端
                    const heightScale = 1 + (bottomExpand - 1) * t; // 左右端窄、中间宽
                    const center = (this.rows - 1) / 2;
                    const halfMax = this.rows / 2;
                    const halfCurrent = halfMax / heightScale;
                    const dist = Math.abs(r - center);
                    const n = (hashRandom(r, c, reefSeed) - 0.5) * noiseAmp;
                    if (dist > halfCurrent + n) {
                        inReef = false;
                    }
                }

                cell._inReef = inReef;

                // 随机嵌入宝珠
                if (inReef && hashRandom(c, r, reefSeed + 99) < DW.ORB_CHANCE) {
                    cell.orbType = Food.weightedRandom();
                }

                this.cells[c][r] = cell;
            }
        }
    }

    /**
     * 检查某个世界坐标点是否在未挖穿的墙壁单元内
     */
    isBlocked(worldX, worldY) {
        if (!this.active) return false;
        const { col, row } = this._worldToCell(worldX, worldY);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        const cell = this.cells[col][row];
        return cell._inReef && !cell.dug;
    }

    /**
     * 检查虫虫头部是否与墙壁碰撞并执行挖掘
     * @param {Worm} worm - 虫虫对象
     * @returns {{ blocked: boolean, digging: boolean, debrisParticles: DebrisParticle[], releasedFoods: Food[] }}
     */
    dig(worm) {
        if (!this.active || !worm.head) return { blocked: false, digging: false, debrisParticles: [], releasedFoods: [] };

        const hx = worm.head.x;
        const hy = worm.head.y;
        const segRadius = CONFIG.SEGMENT_RADIUS * worm.headScale;

        // 检查头部附近所有可能碰撞的单元
        let blocked = false;
        let digging = false;
        const newDebris = [];
        const releasedFoods = [];
        const digRadius = DW.DIG_RADIUS;
        const cellSize = DW.CELL_SIZE;

        // 检测头部中心所在的单元
        const centerCell = this._worldToCell(hx, hy);

        // 扩大搜索范围（头部半径 + 挖掘半径）
        const minCol = Math.max(0, centerCell.col - digRadius - 1);
        const maxCol = Math.min(this.cols - 1, centerCell.col + digRadius + 1);
        const minRow = Math.max(0, centerCell.row - digRadius - 1);
        const maxRow = Math.min(this.rows - 1, centerCell.row + digRadius + 1);

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                if (!this.cells[c] || !this.cells[c][r]) continue;
                const cell = this.cells[c][r];
                if (cell.dug || !cell._inReef) continue;

                // 计算头部中心到单元格中心的距离（以单元格为单位）
                const cellCenterX = cell.worldX + cellSize / 2;
                const cellCenterY = cell.worldY + cellSize / 2;
                const dist = Math.sqrt((hx - cellCenterX) ** 2 + (hy - cellCenterY) ** 2);
                const collisionDist = segRadius + cellSize / 2;

                if (dist < collisionDist) {
                    // 头部碰到了这个单元
                    blocked = true;

                    // 只在碰撞区域内且距离足够近时才挖掘
                    const cellDist = Math.abs(c - centerCell.col) + Math.abs(r - centerCell.row);
                    if (cellDist <= digRadius) {
                        digging = true;
                        cell.hp -= DW.DIG_SPEED * (1 / 60);  // 按帧率调整

                        // 产生裂纹效果（hp降低时）
                        cell.crackPhase += 0.1;

                        // 产生泥块粒子
                        if (Math.random() < 0.3) {  // 30%概率产生粒子（避免太密集）
                            for (let k = 0; k < DW.DEBRIS_COUNT; k++) {
                                newDebris.push(new DebrisParticle(
                                    cellCenterX + (Math.random() - 0.5) * cellSize,
                                    cellCenterY + (Math.random() - 0.5) * cellSize
                                ));
                            }
                        }

                        // 单元被挖穿
                        if (cell.hp <= 0) {
                            cell.dug = true;
                            cell.hp = 0;

                            // 大量泥块飞溅
                            for (let k = 0; k < DW.DEBRIS_COUNT * 3; k++) {
                                newDebris.push(new DebrisParticle(
                                    cellCenterX + (Math.random() - 0.5) * cellSize,
                                    cellCenterY + (Math.random() - 0.5) * cellSize
                                ));
                            }

                            // 释放宝珠
                            if (cell.orbType && !cell.orbEaten) {
                                cell.orbEaten = true;
                                const orb = new Food(cellCenterX, cellCenterY, cell.orbType);
                                orb.inactiveTimer = 0.3;  // 短暂冷却
                                releasedFoods.push(orb);
                            }
                        }
                    }
                }
            }
        }

        // 检查墙壁是否完全挖穿
        this._checkComplete();

        return { blocked, digging, debrisParticles: newDebris, releasedFoods };
    }

    /**
     * 检查整个墙壁是否被挖穿（只检查reef内的单元）
     */
    _checkComplete() {
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const cell = this.cells[c][r];
                if (cell._inReef && !cell.dug) return;
            }
        }
        this.active = false;  // 全部挖穿，墙壁消失
    }

    /**
     * 世界坐标转单元格坐标
     */
    _worldToCell(worldX, worldY) {
        const col = Math.floor((worldX - this.wallX) / DW.CELL_SIZE);
        const row = Math.floor((worldY - this.wallY) / DW.CELL_SIZE);
        return { col, row };
    }

    /**
     * 更新逻辑
     */
    update(dt) {
        // 更新泥块粒子
        let w = 0;
        for (let i = 0; i < this.debris.length; i++) {
            if (this.debris[i].update(dt)) {
                this.debris[w++] = this.debris[i];
            }
        }
        this.debris.length = w;
    }

    /**
     * 绘制墙壁（珊瑚礁造型）
     */
    draw(ctx, gameTime) {
        if (!this.active) return;

        const cellSize = DW.CELL_SIZE;

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                const cell = this.cells[c][r];
                if (cell.dug || !cell._inReef) continue;

                const x = cell.worldX;
                const y = cell.worldY;
                const s = cellSize;

                // 基础泥块颜色（带有随机亮度变化）
                const baseR = parseInt(DW.COLOR.slice(1, 3), 16);
                const baseG = parseInt(DW.COLOR.slice(3, 5), 16);
                const baseB = parseInt(DW.COLOR.slice(5, 7), 16);
                const br = cell.brightness;
                const cr = Math.round(Math.min(255, baseR * br));
                const cg = Math.round(Math.min(255, baseG * br));
                const cb = Math.round(Math.min(255, baseB * br));

                // 根据剩余HP计算损坏程度
                const damage = 1 - cell.hp;  // 0=完好 1=即将破碎

                ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

                // 使用jitter绘制不规则四边形（珊瑚礁有机感）
                const j = cell.jitter;
                ctx.beginPath();
                ctx.moveTo(x + j[0], y + j[1]);
                ctx.lineTo(x + s + j[1], y + j[2]);
                ctx.lineTo(x + s + j[2], y + s + j[3]);
                ctx.lineTo(x + j[3], y + s + j[0]);
                ctx.closePath();
                ctx.fill();

                // 泥土纹理：随机小点
                if (cell.variant > 0.3) {
                    ctx.fillStyle = hexToRgba(DW.COLOR_DARK, 0.3);
                    const dotCount = 2 + Math.floor(cell.variant * 3);
                    for (let d = 0; d < dotCount; d++) {
                        const dx = x + ((cell.variant * 137 + d * 53) % s);
                        const dy = y + ((cell.variant * 89 + d * 71) % s);
                        ctx.beginPath();
                        ctx.arc(dx, dy, 1 + cell.variant * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // 高光边缘
                if (damage < 0.3) {
                    ctx.fillStyle = hexToRgba(DW.COLOR_LIGHT, 0.2);
                    ctx.fillRect(x, y, s, 1);  // 顶部高光
                    ctx.fillRect(x, y, 1, s);  // 左侧高光
                }

                // 裂纹效果（damage > 0时开始出现）
                if (damage > 0.1) {
                    ctx.strokeStyle = hexToRgba(DW.CRACK_COLOR, damage * 0.8);
                    ctx.lineWidth = 0.8 + damage * 0.5;
                    const cx = x + s / 2;
                    const cy = y + s / 2;

                    // 根据crackPhase生成裂纹方向
                    const angle1 = cell.crackPhase;
                    const angle2 = cell.crackPhase + 2.3;

                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(angle1) * s * 0.1, cy + Math.sin(angle1) * s * 0.1);
                    ctx.lineTo(cx + Math.cos(angle1) * s * 0.4 * damage, cy + Math.sin(angle1) * s * 0.4 * damage);
                    ctx.stroke();

                    if (damage > 0.4) {
                        ctx.beginPath();
                        ctx.moveTo(cx + Math.cos(angle2) * s * 0.15, cy + Math.sin(angle2) * s * 0.15);
                        ctx.lineTo(cx + Math.cos(angle2) * s * 0.35 * damage, cy + Math.sin(angle2) * s * 0.35 * damage);
                        ctx.stroke();
                    }

                    // 严重损坏时，整个单元变暗
                    if (damage > 0.5) {
                        ctx.fillStyle = hexToRgba('#000000', (damage - 0.5) * 0.4);
                        ctx.fillRect(x, y, s, s);
                    }
                }

                // 宝珠发光提示（透过泥土的微光）
                if (cell.orbType && !cell.orbEaten) {
                    const glowPhase = Math.sin(gameTime * 3 + cell.crackPhase) * 0.5 + 0.5;
                    ctx.fillStyle = hexToRgba(cell.orbType.color, 0.15 + glowPhase * 0.15);
                    ctx.beginPath();
                    ctx.arc(x + s / 2, y + s / 2, s * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 绘制墙体边缘（装饰性砖缝线）— 只画reef内单元
        ctx.strokeStyle = hexToRgba(DW.COLOR_DARK, 0.2);
        ctx.lineWidth = 0.3;
        for (let c = 0; c <= this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (!this.cells[c] || !this.cells[c][r] || !this.cells[c][r]._inReef) continue;
                const x = this.wallX + c * cellSize;
                const y = this.wallY + r * cellSize;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + cellSize);
                ctx.stroke();
            }
        }
        for (let r = 0; r <= this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.cells[c] || !this.cells[c][r] || !this.cells[c][r]._inReef) continue;
                const x = this.wallX + c * cellSize;
                const y = this.wallY + r * cellSize;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
                ctx.stroke();
            }
        }

        // 绘制泥块粒子
        for (const d of this.debris) {
            d.draw(ctx);
        }
    }

    /**
     * 添加泥块粒子（从外部game.js调用）
     */
    addDebris(particles) {
        for (const p of particles) {
            this.debris.push(p);
        }
    }
}

/**
 * 自动生成区域边界的可挖掘墙壁
 * 只在 Z字形路径中相邻区域之间生成
 * @param {ZoneManager} zoneManager
 * @returns {DiggableWall[]}
 */
export function generateDiggableWalls(zoneManager) {
    const walls = [];
    const zones = zoneManager.zones;

    // 在所有相邻区域对之间生成墙壁
    for (let i = 0; i < zones.length - 1; i++) {
        const current = zones[i];
        const next = zones[i + 1];

        // 只在路径上相邻的区域之间放墙
        const dx = next.col - current.col;
        const dy = next.row - current.row;
        if (Math.abs(dx) + Math.abs(dy) !== 1) continue;

        const wall = new DiggableWall(current, next);
        if (wall.active) {
            walls.push(wall);
        }
    }

    return walls;
}
