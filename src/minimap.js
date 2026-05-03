/**
 * MiniMap - 小地图系统
 * 显示在屏幕右上角，展示25个区域的通关状态和玩家位置
 */
import { CONFIG } from './config.js';

export class MiniMap {
    constructor(zoneManager) {
        this.zm = zoneManager;
        this.size = 100; // 小地图大小（像素）
        this.margin = 10; // 距离屏幕边缘的间距
        this.cellSize = this.size / 5; // 每个区域单元格大小
        this.blinkTimer = 0;
        this.blinkState = true;
    }

    update(dt) {
        this.blinkTimer += dt;
        if (this.blinkTimer >= 0.5) {
            this.blinkState = !this.blinkState;
            this.blinkTimer = 0;
        }
    }

    draw(ctx, playerX, playerY) {
        // 保存当前绘图状态
        ctx.save();
        
        // 计算小地图位置（右上角）
        const mapX = CONFIG.CANVAS_WIDTH - this.size - this.margin;
        const mapY = this.margin;
        
        // 绘制半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(mapX, mapY, this.size, this.size);
        
        // 绘制边框
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX, mapY, this.size, this.size);
        
        // 绘制25个区域
        for (let i = 0; i < 25; i++) {
            const zone = this.zm.zones[i];
            const col = zone.col;
            const row = zone.row;
            
            // 计算单元格位置
            const cellX = mapX + col * this.cellSize;
            const cellY = mapY + row * this.cellSize;
            
            // 根据状态选择颜色
            let fillColor;
            if (zone.status === 'completed') {
                fillColor = 'rgba(68, 255, 68, 0.7)'; // 绿色
            } else if (zone.status === 'unlocked') {
                fillColor = 'rgba(77, 171, 247, 0.7)'; // 蓝色
            } else {
                fillColor = 'rgba(128, 128, 128, 0.5)'; // 灰色
            }
            
            // 绘制单元格背景
            ctx.fillStyle = fillColor;
            ctx.fillRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);
            
            // 绘制单元格边框
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cellX + 1, cellY + 1, this.cellSize - 2, this.cellSize - 2);
            
            // 绘制区域编号
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.id.toString(), cellX + this.cellSize / 2, cellY + this.cellSize / 2);
        }
        
        // 绘制玩家位置（闪烁的白点）
        if (playerX !== undefined && playerY !== undefined) {
            // 计算玩家在小地图上的位置
            const mapWidth = CONFIG.MAP_WIDTH;
            const mapHeight = CONFIG.MAP_HEIGHT;
            const playerMapX = mapX + (playerX / mapWidth) * this.size;
            const playerMapY = mapY + (playerY / mapHeight) * this.size;
            
            // 闪烁效果
            if (this.blinkState) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // 外圈发光效果
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(playerMapX, playerMapY, 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // 绘制标题
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MAP', mapX + this.size / 2, mapY - 5);
        
        // 恢复绘图状态
        ctx.restore();
    }
}
