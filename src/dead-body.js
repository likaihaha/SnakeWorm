import { Vector } from './vector.js';
import { CONFIG } from './config.js';

export class DeadBody {
    constructor(segments, originalColor) {
        this.segments = segments.map(s => new Vector(s.x, s.y));
        this.originalColor = originalColor;
        // 每段独立的速度，给初始向下速度确保能下沉
        this.velocities = segments.map(() => new Vector(0, CONFIG.DEAD_BODY.INITIAL_VY_MIN + Math.random() * CONFIG.DEAD_BODY.INITIAL_VY_SPREAD));
        this.isFinished = false;
    }

    update(dt, canvasHeight) {
        const emitted = [];  // 记录本次碰底需要发射的宝珠

        // 柔软无力地下沉：缓慢向下移动 + 左右摆动
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const vel = this.velocities[i];

            // 向下重力（增大加速度让下沉速度合理）
            vel.y += CONFIG.DEAD_BODY.SINK_GRAVITY * dt;

            // 左右摆动（柔软无力）
            vel.x += Math.sin(performance.now() / 400 + i * 0.6) * CONFIG.DEAD_BODY.SINK_SWAY * dt;

            // 阻尼
            vel.x *= CONFIG.DEAD_BODY.SINK_DAMPING;
            vel.y *= CONFIG.DEAD_BODY.SINK_DAMPING;

            seg.x += vel.x * dt;
            seg.y += vel.y * dt;

            // 碰底检测：该段尸体转化为宝珠向上发射
            if (seg.y >= canvasHeight - CONFIG.BORDER_MARGIN) {
                // 尸体爆宝珠概率：70%绿、15%蓝、10%黄、5%橙
                const roll = Math.random();
                let type;
                if (roll < CONFIG.DEAD_BODY.EMIT_PROB_GREEN) {
                    type = CONFIG.FOOD_TYPES[0]; // 绿色
                } else if (roll < CONFIG.DEAD_BODY.EMIT_PROB_BLUE) {
                    type = CONFIG.FOOD_TYPES[3]; // 蓝色
                } else if (roll < CONFIG.DEAD_BODY.EMIT_PROB_YELLOW) {
                    type = CONFIG.FOOD_TYPES[1]; // 黄色
                } else {
                    type = CONFIG.FOOD_TYPES[2]; // 橙色
                }

                // 根据段在尸体中的位置计算水平偏移：尾部段更靠左，头部段更靠右
                const spreadX = (i / (this.segments.length + 1) - 0.5) * 60;  // 左右展开60像素
                emitted.push({ x: seg.x + spreadX, y: seg.y, type });

                // 从尸体中移除该段（变成宝珠飞走了）
                this.segments.splice(i, 1);
                this.velocities.splice(i, 1);
            }
        }

        // 如果所有段都转化完毕或超出底部，标记为完成
        if (this.segments.length === 0 || this.segments.every(seg =>
            seg.y > canvasHeight + 50 || seg.x < -50 || seg.x > CONFIG.MAP_WIDTH + 50
        )) {
            this.isFinished = true;
        }

        return emitted;
    }

    draw(ctx) {
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const seg = this.segments[i];
            const isHead = i === 0;
            const sizeRatio = isHead ? 1.0 : (0.7 + 0.3 * (1 - i / this.segments.length));
            const radius = CONFIG.SEGMENT_RADIUS * sizeRatio;

            // 尸体颜色：半透明灰色
            const alpha = 0.4;
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
            ctx.fill();
        }
    }
}
