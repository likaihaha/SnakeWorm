import { Vector } from './vector.js';
import { CONFIG } from './config.js';
import { hexToRgba, drawGlow } from './utils.js';

export const WormDrawMixin = {
    draw(ctx) {
        if (!this.isAlive || this.segments.length === 0) return;

        // 获取各区域段索引集合 (用于视觉标识，使用缓存)
        const rs = this._regionSets;
        const tailIndices = rs.tail;
        const headIndices = rs.head;
        const neckIndices = rs.neck;
        const abdomenIndices = rs.abdomen;

        // 计算空闲波动：未移动时从头到尾的正弦波波动（生命感）
        let wavePerpX = 0, wavePerpY = 0, waveOffsets = null;
        const waveAmplitude = this.isMoving ? 0.3 : 2.5;  // 移动时几乎无波动，静止时明显波动
        if (waveAmplitude > 0.1) {
            // 垂直于 velocity 的方向（直接计算，避免 new Vector/normalize 临时对象）
            const vMag = this.velocity.mag();
            if (vMag > 0) {
                const invMag = 1 / vMag;
                wavePerpX = -(this.velocity.y * invMag);
                wavePerpY = this.velocity.x * invMag;
            } else {
                wavePerpX = 0;
                wavePerpY = 1;  // 默认垂直偏移
            }
            waveOffsets = new Float32Array(this.segments.length * 2);
            for (let i = 0; i < this.segments.length; i++) {
                const wave = Math.sin(this.idleWavePhase - i * 0.6) * waveAmplitude;
                waveOffsets[i * 2] = wavePerpX * wave;
                waveOffsets[i * 2 + 1] = wavePerpY * wave;
            }
        }

        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segRaw = this.segments[i];
            // 应用空闲波动偏移（头部不波动，保持稳定）
            const isHead = i === 0;
            const seg = !isHead && waveOffsets
                ? new Vector(segRaw.x + waveOffsets[i * 2], segRaw.y + waveOffsets[i * 2 + 1])
                : segRaw;
            // 嘴部（索引 0）永远不属于尾巴区域，避免双重标识
            const isTail = i > 0 && tailIndices.has(i);
            const sizeRatio = isHead ? 1.0 : (0.7 + 0.3 * (1 - i / this.segments.length));
            let radius = CONFIG.SEGMENT_RADIUS * sizeRatio;
            if (isHead) {
                radius *= this.headScale;  // 头部缩放比例
            }

            if (isHead) {
                // 幼体用2个眼睛，成年体用吃豆人嘴巴
                if (this.isJuvenile) {
                    this.drawJuvenileHead(ctx, seg, radius);
                } else {
                    this.drawPacmanHead(ctx, seg, radius);
                }
            } else {
                // 身体段保持圆形
                let alpha = 0.3 + 0.5 * (1 - i / this.segments.length);
                let color = this.color;
                const isBlueSegment = i > 0 && i <= this.blueSegments;

                // 黄光效果检查（优先级最高，覆盖所有类型）
                const isYellowGlow = this.yellowGlowTimer > 0 && i === this.yellowGlowIndex;

                if (isBlueSegment && !isYellowGlow) {
                    // 蓝色腹部效果：头部以下的段变蓝，分成5个扇形
                    // 临时切换到正常混合模式，避免颜色叠加变白
                    ctx.globalCompositeOperation = 'source-over';

                    // 先绘制整个圆形为原色
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = hexToRgba(this.color, alpha);
                    ctx.fill();

                    // 绘制蓝色扇形（根据当前段的强度绘制相应数量的扇形）
                    const strengthIndex = i - 1;  // blueStrengths数组索引（头部是索引0，蓝色段从索引1开始）
                    const segmentStrength = (strengthIndex >= 0 && strengthIndex < this.blueStrengths.length) ? this.blueStrengths[strengthIndex] : 0;
                    const sliceAngle = (Math.PI * 2) / 5;  // 每个扇形角度
                    for (let slice = 0; slice < segmentStrength; slice++) {
                        const startAngle = slice * sliceAngle - Math.PI / 2;  // 从顶部开始
                        const endAngle = startAngle + sliceAngle;
                        ctx.beginPath();
                        ctx.moveTo(seg.x, seg.y);
                        ctx.arc(seg.x, seg.y, radius, startAngle, endAngle);
                        ctx.closePath();
                        ctx.fillStyle = hexToRgba('#4dabf7', 0.8);
                        ctx.fill();
                    }

                    // 恢复Screen混合模式
                    ctx.globalCompositeOperation = 'screen';
                } else {
                    // 黄光效果：从嘴部到尾部逐个闪光（每个段只闪一次）
                    if (isYellowGlow) {
                        // 当前段正在闪光
                        const glowIntensity = 1.0;  // 全亮度闪光
                        color = '#ffe66d';  // 黄色
                        alpha = glowIntensity;
                        // 用径向渐变替代shadowBlur
                        drawGlow(ctx, seg.x, seg.y, radius, '#ffe66d', 15);
                    }

                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = hexToRgba(color, alpha);
                    ctx.fill();
                }

                // 减速叠加视觉效果：身体段变蓝/变冷
                if (this.slowStacks > 0 && !isBlueSegment) {
                    const slowAlpha = Math.min(0.4, this.slowStacks * 0.1);  // 每层增加0.1透明度，最多0.4
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(100, 180, 255, ${slowAlpha})`;  // 浅蓝色覆盖
                    ctx.fill();
                }

                // 被咬段视觉效果：红色脉冲标记
                if (this.bittenSegments && this.bittenSegments.has(i)) {
                    const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.01);
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius + 2, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

            // 颈部段视觉标识：短放射线（蓝色弹舱段用高对比度白色）- 幼体不显示
            if (!this.isJuvenile && neckIndices.has(i)) {
                const isBlueSegment = i > 0 && i <= this.blueSegments;
                this.drawNeckIndicator(ctx, seg, radius, this.isPlayer, isBlueSegment);
            }

            // 尾巴段视觉标识：黄色 / 红色虚线边框 + 半透明填充 - 幼体不显示
            if (!this.isJuvenile && isTail) {
                this.drawTailIndicator(ctx, seg, radius, this.isPlayer);
            }
        }

        // 绘制正在生长的新节（从尾部延伸出去的动画）
        for (const growing of this.growingSegments) {
            // 如果 startPos 或 targetPos 为 null，跳过绘制（等待 update 初始化）
            if (!growing.startPos || !growing.targetPos) continue;

            const progress = Math.min(1, growing.progress);
            const currentPos = growing.startPos.add(
                growing.targetPos.sub(growing.startPos).mult(progress)
            );

            // 根据进度计算大小（从小到大）
            const sizeRatio = 0.3 + 0.7 * progress;
            const radius = CONFIG.SEGMENT_RADIUS * sizeRatio;

            // 绘制半透明的新节
            if (progress > 0.1) drawGlow(ctx, currentPos.x, currentPos.y, radius, this.color, 5 * progress);
            ctx.beginPath();
            ctx.arc(currentPos.x, currentPos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(this.color, 0.3 + 0.5 * progress);
            ctx.fill();
        }

        // 绘制尾巴缩小动画（带虚线、变灰、下沉）
        for (const shrinking of this.shrinkingSegments) {
            const progress = Math.min(1, shrinking.progress);

            // 第一阶段：缩小到2/3（带虚线）- 加大尺寸方便幼体吃到
            if (progress < 1) {
                // 从大到小，缩小到2/3（原来是1/3）
                const sizeRatio = 1 - progress * (1/3);  // 1 → 2/3
                const radius = CONFIG.SEGMENT_RADIUS * sizeRatio;
                const alpha = 1 - progress * 0.5;  // 透明度略微降低

                // 绘制虚线边框（同步缩小）
                if (shrinking.showDash) {
                    ctx.save();
                    ctx.strokeStyle = hexToRgba(this.color, alpha);
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(shrinking.pos.x, shrinking.pos.y, radius + 2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }

                // 绘制填充（颜色逐渐变灰，使用缓存的颜色分量）
                ctx.beginPath();
                ctx.arc(shrinking.pos.x, shrinking.pos.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba(this._grayColor, alpha);
                ctx.fill();
            }

            // 第二阶段：下沉（灰色，无虚线）
            if (shrinking.sinking) {
                const radius = CONFIG.SEGMENT_RADIUS * 2 / 3;  // 保持2/3大小（原来是1/3）

                // 绘制灰色填充
                ctx.beginPath();
                ctx.arc(shrinking.pos.x, shrinking.pos.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';  // 灰色半透明
                ctx.fill();
            }
        }

        // 绘制冰晶覆盖效果（被蓝色子弹击中）
        for (const ice of this.iceOverlays) {
            if (ice.segmentIndex < this.segments.length) {
                const seg = this.segments[ice.segmentIndex];
                const alpha = (ice.timer / ice.maxTimer) * 0.5;
                const radius = CONFIG.SEGMENT_RADIUS * 1.4;

                // 浅蓝色冰晶底色
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(173, 216, 230, ${alpha})`;
                ctx.fill();

                // 冰晶边缘高光
                ctx.strokeStyle = `rgba(200, 230, 255, ${alpha + 0.2})`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // 中心闪光点
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, radius * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha + 0.3})`;
                ctx.fill();
            }
        }

        // 绘制磁力脉冲光环（橙色宝珠效果）
        if (this.magnetTimer > 0 && this.segments.length > 0) {
            const head = this.segments[0];
            const pulsePhase = Math.sin(this.magnetTimer * 15) * 0.5 + 0.5;  // 脉冲
            const pulseRadius = 40 + pulsePhase * 30;  // 40~70 像素

            ctx.globalCompositeOperation = 'screen';
            // 只画外围圆环，不画实心光效
            ctx.beginPath();
            ctx.arc(head.x, head.y, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 140, 0, ${0.2 + pulsePhase * 0.3})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 绘制预警闪烁环（当进入预警线时）
        if (this.warningFlashTimer > 0 && this.isPlayer && this.segments.length > 0) {
            const flashIntensity = Math.sin(this.warningFlashTimer * 20) * 0.5 + 0.5;  // 快速闪烁
            const head = this.segments[0];
            const flashRadius = CONFIG.SEGMENT_RADIUS * 2.5;

            // 径向渐变光晕替代shadowBlur
            drawGlow(ctx, head.x, head.y, flashRadius, '#ff3333', 10 + flashIntensity * 10);
            ctx.beginPath();
            ctx.arc(head.x, head.y, flashRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + flashIntensity * 0.5})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 恢复默认混合模式
        ctx.globalCompositeOperation = 'source-over';
    },

    /**
     * 绘制尾巴标识：虚线边框 + 颜色填充
     * @param {boolean} isPlayer - 是否为玩家虫虫 (玩家用黄色，AI 用红色)
     */
    drawTailIndicator(ctx, seg, radius, isPlayer) {
        // 如果尾部黄色虚线被禁用，直接返回
        if (!this.tailYellowDash && isPlayer) return;

        const borderColor = isPlayer ? 'rgba(255, 230, 109, 0.9)' : 'rgba(255, 100, 100, 0.8)';
        const fillColor = isPlayer ? 'rgba(255, 230, 109, 0.2)' : 'rgba(255, 80, 80, 0.15)';

        ctx.save();
        // 外层虚线圆圈
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 内部半透明填充
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, radius - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * 绘制颈部标识：短放射线，颜色比身体亮一点
     * @param {boolean} isPlayer - 是否为玩家虫虫
     * @param {boolean} isBlueSegment - 是否为蓝色弹舱段（使用高对比度白色）
     */
    drawNeckIndicator(ctx, seg, radius, isPlayer, isBlueSegment = false) {
        ctx.save();

        // 放射线数量：8条
        const rayCount = 8;
        const rayInner = radius * 0.6;   // 放射线内端（在圆内）
        const rayOuter = radius * 1.3;   // 放射线外端（超出圆）
        const rayWidth = 1.5;

        // 蓝色弹舱段用白色高对比度放射线，普通段：玩家用浅绿色，AI用浅蓝色
        let rayColor;
        if (isBlueSegment) {
            rayColor = 'rgba(255, 255, 255, 0.9)';
        } else {
            rayColor = isPlayer ? 'rgba(120, 255, 200, 0.7)' : 'rgba(100, 200, 255, 0.6)';
        }

        ctx.strokeStyle = rayColor;
        ctx.lineWidth = rayWidth;

        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const x1 = seg.x + Math.cos(angle) * rayInner;
            const y1 = seg.y + Math.sin(angle) * rayInner;
            const x2 = seg.x + Math.cos(angle) * rayOuter;
            const y2 = seg.y + Math.sin(angle) * rayOuter;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();
    },

    // 幼体头部绘制：圆形 + 2个眼睛（无吃豆人嘴巴）
    drawJuvenileHead(ctx, headPos, radius) {
        if (!this.isAlive) return;

        const drawRadius = radius + 2;

        // 绘制圆形头部
        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, drawRadius, 0, Math.PI *2);
        ctx.fillStyle = hexToRgba(this.color, 0.8);
        ctx.fill();

        // 计算朝向角度
        let mouthAngle = Math.atan2(this.velocity.y, this.velocity.x);
        if (this.segments.length > 1) {
            const dir = headPos.sub(this.segments[1]);
            if (dir.mag() > 0) {
                mouthAngle = Math.atan2(dir.y, dir.x);
            }
        }

        // 绘制2个眼睛
        const eyeOffset = drawRadius * 0.4;
        const eyeRadius = 2;
        const eyeAngle1 = mouthAngle + 0.5;  // 左眼
        const eyeAngle2 = mouthAngle - 0.5;  // 右眼

        const eyeX1 = headPos.x + Math.cos(eyeAngle1) * eyeOffset;
        const eyeY1 = headPos.y + Math.sin(eyeAngle1) * eyeOffset;
        const eyeX2 = headPos.x + Math.cos(eyeAngle2) * eyeOffset;
        const eyeY2 = headPos.y + Math.sin(eyeAngle2) * eyeOffset;

        // 恢复默认混合模式绘制眼睛
        ctx.globalCompositeOperation = 'source-over';

        // 白色眼白
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, eyeRadius + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY2, eyeRadius + 1, 0, Math.PI * 2);
        ctx.fill();

        // 黑色瞳孔
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2, eyeY2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛高光
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX1 - 0.5, eyeY1 - 0.5, eyeRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeX2 - 0.5, eyeY2 - 0.5, eyeRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 恢复 Screen 模式
        ctx.globalCompositeOperation = 'screen';
    },

    /**
     * 吃豆人头部绘制
     * 使用 Canvas 的 arc() 绘制带缺口的圆形，嘴巴开口角度根据速度动态调整
     * 速度越快，嘴巴张得越大
     * 嘴巴方向基于 head 到 segments[1] 的向量，平滑连续变化
     * 去掉发光效果，使用 hexToRgba 与身体亮度一致
     * 加上眼睛和嘴部张合动画
     * 头部半径加大到虚线圆环大小（radius + 2）
     * 嘴巴扇形缺口最大 120 度（约 2.09 弧度），闭合时完全闭合
     */
    drawPacmanHead(ctx, headPos, radius) {
        if (!this.isAlive) return;

        // 头部半径加大到虚线圆环大小
        const drawRadius = radius + 2;

        // 嘴巴方向基于 head 到 segments[1] 的向量（平滑连续变化）
        let mouthAngle = Math.atan2(this.velocity.y, this.velocity.x);
        if (this.segments.length > 1) {
            const dir = headPos.sub(this.segments[1]);
            if (dir.mag() > 0) {
                mouthAngle = Math.atan2(dir.y, dir.x);
            }
        }

        // 嘴巴动画逻辑：
        // - 移动时：保持张开，有小幅度合嘴动作（表现张嘴冲向宝珠）
        // - 闭嘴计时器 > 0 时：完全闭合（吃到宝珠时）
        let mouthOpenRatio;
        if (this.mouthCloseTimer > 0) {
            // 吃到宝珠时：完全闭合
            mouthOpenRatio = 0;
        } else if (this.isMoving) {
            // 移动时：保持张开，有小幅度合嘴动作
            const smallAnim = (Math.sin(performance.now() / 200) + 1) / 2;  // 0~1
            mouthOpenRatio = 0.7 + smallAnim * 0.3;  // 0.7 ~ 1.0（大部分时间张开）
        } else {
            // 停止时：正常张合动画
            mouthOpenRatio = (Math.sin(performance.now() / 150) + 1) / 2;  // 0~1
        }

        // 嘴巴开口角度：从 0（完全闭合）到 2.09 弧度（120 度扇形）
        const maxMouthOpen = 2.09;  // 120 度 = π * 2/3 ≈ 2.09 弧度
        const animMouthOpen = maxMouthOpen * mouthOpenRatio;  // 0 ~ 2.09 弧度

        // 绘制带缺口的圆形（吃豆人形状）
        // arc(x, y, radius, startAngle, endAngle, counterclockwise)
        // 缺口朝前（移动方向），上下对称
        const startAngle = mouthAngle + animMouthOpen / 2;
        const endAngle = mouthAngle - animMouthOpen / 2 + Math.PI * 2;

        ctx.beginPath();
        ctx.arc(headPos.x, headPos.y, drawRadius, startAngle, endAngle);
        ctx.lineTo(headPos.x, headPos.y);  // 连接到中心
        ctx.closePath();

        // 填充颜色：使用 hexToRgba 与身体亮度一致
        ctx.fillStyle = hexToRgba(this.color, 0.8);
        ctx.fill();

        // 减速叠加视觉效果：头部变蓝/变冷
        if (this.slowStacks > 0) {
            const slowAlpha = Math.min(0.5, this.slowStacks * 0.12);  // 每层增加0.12透明度，最多0.5
            ctx.beginPath();
            ctx.arc(headPos.x, headPos.y, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 180, 255, ${slowAlpha})`;  // 浅蓝色覆盖
            ctx.fill();
        }

        // 绘制眼睛（侧面视角，只有一个眼睛）
        this.drawEye(ctx, headPos, mouthAngle, drawRadius);

        // 显示减速层数（头部上方）
        if (this.slowStacks > 0) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#4dabf7';
            ctx.textAlign = 'center';
            ctx.fillText(`\u2744${this.slowStacks}`, headPos.x, headPos.y - drawRadius - 8);
            ctx.globalCompositeOperation = 'screen';
        }
    },

    drawEye(ctx, headPos, mouthAngle, drawRadius) {
        // 眼睛位置逻辑：
        // - 头向上时（mouthAngle接近-PI/2）：眼睛往后拉（嘴巴反方向）
        // - 头左右移动时：眼睛保持在头顶位置（固定向上）
        const eyeOffset = drawRadius * 0.5;  // 从中心到眼睛的距离
        const eyeRadius = 1.5;  // 眼睛半径（小一点）

        // 判断是否向上（mouthAngle在-PI/2附近，范围约±45度）
        const isUpward = mouthAngle < -Math.PI/4 && mouthAngle > -Math.PI*3/4;

        let eyeAngle;
        if (isUpward) {
            // 向上时：眼睛往后拉（嘴巴反方向）
            eyeAngle = mouthAngle + Math.PI;
        } else {
            // 左右移动时：眼睛固定在头顶（向上）
            eyeAngle = -Math.PI/2;  // 固定向上
        }

        const eyeX = headPos.x + Math.cos(eyeAngle) * eyeOffset;
        const eyeY = headPos.y + Math.sin(eyeAngle) * eyeOffset;

        // 恢复默认混合模式（不用 Screen，否则看不到黑色眼睛）
        ctx.globalCompositeOperation = 'source-over';

        // 黑色眼睛
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // 恢复 Screen 模式
        ctx.globalCompositeOperation = 'screen';
    },
};
