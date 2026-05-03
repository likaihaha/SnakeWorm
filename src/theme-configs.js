/**
 * Theme Configs - 6种区域主题的 DynamicBG 配置
 * Phase 3c: 主题背景系统
 *
 * 每个主题复用 DynamicBG 的渲染结构（背景渐变、河流、岩石、粒子等），
 * 通过不同的颜色、透明度、可见性来实现截然不同的视觉风格。
 */

// ========== 通用工具函数 ==========

/** 根据基准配置派生主题配置，只覆盖差异字段 */
function _override(base, patch) {
    return JSON.parse(JSON.stringify({ ...base, ...patch }));
}

// ========== 基线配置（深海默认） ==========

const BASE_CANVAS = { width: 960, height: 540 };

// ========== 1. FOREST 森林（Zone 1-5） ==========
export const FOREST_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.35, radius: 0.9, color0: '#1a3a1a', color1: '#0f2a0f', color2: '#061206' },
    ambient: { visible: true, centerX: 0.4, centerY: 0.5, radius: 0.6, color0: 'rgba(78, 204, 100, 0.15)', color1: 'rgba(30, 80, 30, 0)' },
    river: { visible: true, shadowColor: '#4ee89d', shadowBlur: 10, stroke0: 'rgba(78, 232, 157, 0.2)', width0: 30, stroke1: 'rgba(120, 255, 180, 0.35)', width1: 6, path: [[-0.05,0.52],[0.08,0.50],[0.18,0.56],[0.30,0.54],[0.42,0.58],[0.52,0.61],[0.65,0.57],[0.75,0.55],[0.85,0.60],[0.95,0.58],[1.05,0.56]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#0f1f0f' }, highlight: { visible: true, color: 'rgba(78, 160, 100, 0.4)', width: 2, points: [[0.06,0.63],[0.12,0.68],[0.17,0.64],[0.22,0.72],[0.27,0.66]] }, points: [[0,1],[0,0.68],[0.10,0.62],[0.18,0.67],[0.24,0.66],[0.28,0.68],[0.31,0.75],[0.30,0.82],[0.28,0.88],[0.25,0.95],[0.20,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#0a1a0a' }, points: [[0.68,1],[0.72,0.84],[0.77,0.77],[0.83,0.81],[0.88,0.73],[0.94,0.78],[1,0.70],[1,1]] },
    vents: { visible: false, pipeGrad: [], topFill: '', crackColor: '', crackGlow: '', crackWidth: 0, crack2Color: '', pipes: [], cracks: [], cracks2: [] },
    fog: { visible: true, color0: 'rgba(10, 30, 15, 0.75)', color1: 'rgba(20, 50, 25, 0.3)', color2: 'rgba(20, 50, 25, 0)' },
    vignette: { visible: true, color0: 'rgba(5, 15, 5, 0.5)', color1: 'rgba(5, 15, 5, 0)' },
    jellyfish: { visible: true, x: 0.60, y: 0.25, radiusX: 50, radiusY: 40, bobSpeed: 0.3, bobAmp: 15, breatheSpeed: 0.6, breatheAmp: 0.08, glowColor: '#7aff9d', glowBlur: 18, bodyGrad: ['rgba(120, 255, 157, 0.8)','rgba(78, 204, 100, 0.5)','rgba(50, 150, 70, 0.15)'], tentacleCount: 4, tentacleSpacing: 12, tentacleLenMin: 60, tentacleLenMax: 90, tentacleWaveFreqMin: 0.6, tentacleWaveFreqMax: 1.0, tentacleWaveAmpMin: 5, tentacleWaveAmpMax: 8 },
    particles: { visible: true, count: 35, vxMin: -0.05, vxMax: 0.05, vyMin: -0.08, vyMax: 0.02, rMin: 1, rMax: 3, alphaMin: 0.2, alphaMax: 0.6, blinkFreqMin: 0.4, blinkFreqMax: 1.5, colors: ['#7aff9d','#4ee89d','#a8ffc0','#ffe66d'] },
    magma: { visible: false, countPerVent: 0, vxMin: 0, vxMax: 0, vyMin: 0, vyMax: 0, rMin: 0, rMax: 0, maxRMin: 0, maxRMax: 0, decayMin: 0, decayMax: 0, ventIntensity: [] },
    glints: { visible: true, count: 30, rMin: 1.5, rMax: 3.5, alphaMin: 0.25, alphaMax: 0.6, freqMin: 0.4, freqMax: 1.2 },
    mountains: { visible: true, farBaseY: 0.48, farRoughness: 90, farOpacity: 0.5, midBaseY: 0.56, midRoughness: 70, midOpacity: 0.7, steps: 20, swaySpeed: 0.1, swayAmp: 1.5, farPoints: [[0,0.40],[0.05,0.38],[0.10,0.43],[0.15,0.41],[0.20,0.46],[0.25,0.42],[0.30,0.39],[0.35,0.44],[0.40,0.40],[0.45,0.37],[0.50,0.42],[0.55,0.38],[0.60,0.43],[0.65,0.39],[0.70,0.44],[0.75,0.41],[0.80,0.38],[0.85,0.43],[0.90,0.40],[0.95,0.37],[1,0.41]], midPoints: [[0,0.62],[0.05,0.55],[0.10,0.58],[0.15,0.53],[0.20,0.56],[0.25,0.52],[0.30,0.55],[0.35,0.50],[0.40,0.53],[0.45,0.49],[0.50,0.52],[0.55,0.48],[0.60,0.51],[0.65,0.47],[0.70,0.50],[0.75,0.46],[0.80,0.49],[0.85,0.45],[0.90,0.48],[0.95,0.44],[1,0.47]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 2. CAVE 洞穴（Zone 6-10） ==========
export const CAVE_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.4, radius: 0.85, color0: '#1a1a2e', color1: '#12122a', color2: '#08081a' },
    ambient: { visible: true, centerX: 0.3, centerY: 0.6, radius: 0.45, color0: 'rgba(77, 171, 247, 0.12)', color1: 'rgba(30, 50, 100, 0)' },
    river: { visible: true, shadowColor: '#4dabf7', shadowBlur: 8, stroke0: 'rgba(77, 171, 247, 0.18)', width0: 25, stroke1: 'rgba(130, 200, 255, 0.3)', width1: 5, path: [[-0.05,0.50],[0.10,0.48],[0.20,0.55],[0.35,0.52],[0.50,0.56],[0.65,0.53],[0.80,0.58],[0.95,0.55],[1.05,0.53]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#0e1428' }, highlight: { visible: true, color: 'rgba(77, 171, 247, 0.3)', width: 2, points: [[0.06,0.65],[0.13,0.70],[0.19,0.66],[0.24,0.73]] }, points: [[0,1],[0,0.60],[0.08,0.55],[0.16,0.60],[0.22,0.58],[0.27,0.62],[0.30,0.70],[0.29,0.78],[0.27,0.85],[0.24,0.93],[0.19,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#0a0f20' }, points: [[0.70,1],[0.74,0.80],[0.78,0.74],[0.84,0.78],[0.90,0.70],[0.95,0.75],[1,0.66],[1,1]] },
    vents: { visible: true, pipeGrad: ['#141e30','#1e2d4a','#162038','#0e1525'], topFill: '#0e1525', crackColor: 'rgba(77, 171, 247, 0.4)', crackGlow: '#4dabf7', crackWidth: 2, crack2Color: 'rgba(130, 200, 255, 0.6)', pipes: [{x:0.12,y:0.50,wTop:0.010,wBot:0.010,h:0.15},{x:0.20,y:0.54,wTop:0.008,wBot:0.008,h:0.12}], cracks: [[0.07,0.77],[0.10,0.80],[0.13,0.78],[0.16,0.82],[0.20,0.80]], cracks2: [[0.17,0.72],[0.20,0.75]] },
    fog: { visible: true, color0: 'rgba(8, 8, 26, 0.80)', color1: 'rgba(15, 15, 40, 0.35)', color2: 'rgba(15, 15, 40, 0)' },
    vignette: { visible: true, color0: 'rgba(3, 3, 15, 0.55)', color1: 'rgba(3, 3, 15, 0)' },
    jellyfish: { visible: true, x: 0.55, y: 0.20, radiusX: 45, radiusY: 35, bobSpeed: 0.35, bobAmp: 10, breatheSpeed: 0.7, breatheAmp: 0.05, glowColor: '#4dabf7', glowBlur: 15, bodyGrad: ['rgba(130, 200, 255, 0.75)','rgba(77, 171, 247, 0.5)','rgba(40, 100, 180, 0.15)'], tentacleCount: 4, tentacleSpacing: 11, tentacleLenMin: 55, tentacleLenMax: 80, tentacleWaveFreqMin: 0.7, tentacleWaveFreqMax: 1.1, tentacleWaveAmpMin: 4, tentacleWaveAmpMax: 7 },
    particles: { visible: true, count: 25, vxMin: -0.04, vxMax: 0.04, vyMin: -0.06, vyMax: 0.01, rMin: 0.8, rMax: 2.5, alphaMin: 0.15, alphaMax: 0.5, blinkFreqMin: 0.3, blinkFreqMax: 1.2, colors: ['#4dabf7','#74c0fc','#a5d8ff'] },
    magma: { visible: true, countPerVent: 15, vxMin: -0.15, vxMax: 0.15, vyMin: -0.8, vyMax: -0.2, rMin: 0.4, rMax: 1.2, maxRMin: 1.5, maxRMax: 3.5, decayMin: 0.004, decayMax: 0.006, ventIntensity: [0.8, 0.5] },
    glints: { visible: true, count: 25, rMin: 1, rMax: 3, alphaMin: 0.2, alphaMax: 0.5, freqMin: 0.4, freqMax: 1.0 },
    mountains: { visible: true, farBaseY: 0.45, farRoughness: 70, farOpacity: 0.4, midBaseY: 0.55, midRoughness: 55, midOpacity: 0.6, steps: 20, swaySpeed: 0.08, swayAmp: 1, farPoints: [[0,0.35],[0.08,0.33],[0.15,0.38],[0.25,0.34],[0.35,0.30],[0.45,0.36],[0.55,0.32],[0.65,0.28],[0.75,0.34],[0.85,0.30],[0.95,0.33],[1,0.31]], midPoints: [[0,0.60],[0.10,0.52],[0.20,0.56],[0.30,0.50],[0.40,0.54],[0.50,0.48],[0.60,0.52],[0.70,0.46],[0.80,0.50],[0.90,0.46],[1,0.48]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 3. CRYSTAL 水晶（Zone 11-15） ==========
export const CRYSTAL_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.3, radius: 0.9, color0: '#2d1b4e', color1: '#1a0f30', color2: '#0d0820' },
    ambient: { visible: true, centerX: 0.7, centerY: 0.4, radius: 0.5, color0: 'rgba(199, 125, 255, 0.18)', color1: 'rgba(100, 50, 160, 0)' },
    river: { visible: true, shadowColor: '#c77dff', shadowBlur: 14, stroke0: 'rgba(199, 125, 255, 0.22)', width0: 28, stroke1: 'rgba(220, 170, 255, 0.38)', width1: 7, path: [[-0.05,0.45],[0.08,0.43],[0.18,0.50],[0.30,0.48],[0.42,0.52],[0.55,0.50],[0.68,0.54],[0.80,0.52],[0.92,0.56],[1.05,0.54]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#150e28' }, highlight: { visible: true, color: 'rgba(199, 125, 255, 0.4)', width: 2, points: [[0.06,0.62],[0.12,0.67],[0.18,0.63],[0.23,0.70]] }, points: [[0,1],[0,0.62],[0.09,0.58],[0.17,0.63],[0.23,0.61],[0.28,0.65],[0.31,0.72],[0.30,0.80],[0.28,0.87],[0.25,0.94],[0.20,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#100a22' }, points: [[0.67,1],[0.71,0.82],[0.76,0.75],[0.82,0.79],[0.87,0.72],[0.93,0.77],[1,0.68],[1,1]] },
    vents: { visible: false, pipeGrad: [], topFill: '', crackColor: '', crackGlow: '', crackWidth: 0, crack2Color: '', pipes: [], cracks: [], cracks2: [] },
    fog: { visible: true, color0: 'rgba(13, 8, 32, 0.78)', color1: 'rgba(30, 15, 60, 0.3)', color2: 'rgba(30, 15, 60, 0)' },
    vignette: { visible: true, color0: 'rgba(5, 2, 15, 0.5)', color1: 'rgba(5, 2, 15, 0)' },
    jellyfish: { visible: true, x: 0.65, y: 0.18, radiusX: 55, radiusY: 42, bobSpeed: 0.25, bobAmp: 18, breatheSpeed: 0.5, breatheAmp: 0.1, glowColor: '#c77dff', glowBlur: 22, bodyGrad: ['rgba(220, 170, 255, 0.85)','rgba(199, 125, 255, 0.6)','rgba(130, 60, 200, 0.2)'], tentacleCount: 5, tentacleSpacing: 13, tentacleLenMin: 70, tentacleLenMax: 110, tentacleWaveFreqMin: 0.5, tentacleWaveFreqMax: 0.9, tentacleWaveAmpMin: 7, tentacleWaveAmpMax: 12 },
    particles: { visible: true, count: 40, vxMin: -0.06, vxMax: 0.06, vyMin: -0.09, vyMax: -0.01, rMin: 0.8, rMax: 2.8, alphaMin: 0.2, alphaMax: 0.65, blinkFreqMin: 0.5, blinkFreqMax: 2.0, colors: ['#c77dff','#e599f7','#d0bfff','#9775fa'] },
    magma: { visible: false, countPerVent: 0, vxMin: 0, vxMax: 0, vyMin: 0, vyMax: 0, rMin: 0, rMax: 0, maxRMin: 0, maxRMax: 0, decayMin: 0, decayMax: 0, ventIntensity: [] },
    glints: { visible: true, count: 35, rMin: 1.5, rMax: 4.5, alphaMin: 0.3, alphaMax: 0.7, freqMin: 0.6, freqMax: 1.8 },
    mountains: { visible: true, farBaseY: 0.42, farRoughness: 85, farOpacity: 0.45, midBaseY: 0.52, midRoughness: 65, midOpacity: 0.65, steps: 20, swaySpeed: 0.12, swayAmp: 2, farPoints: [[0,0.36],[0.06,0.34],[0.12,0.40],[0.20,0.36],[0.28,0.32],[0.36,0.38],[0.44,0.34],[0.52,0.30],[0.60,0.36],[0.68,0.32],[0.76,0.28],[0.84,0.34],[0.92,0.30],[1,0.33]], midPoints: [[0,0.58],[0.08,0.50],[0.16,0.54],[0.24,0.48],[0.32,0.52],[0.40,0.46],[0.48,0.50],[0.56,0.44],[0.64,0.48],[0.72,0.42],[0.80,0.46],[0.88,0.40],[1,0.44]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 4. LAVA 熔岩（Zone 16-20） ==========
export const LAVA_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.6, radius: 0.85, color0: '#3a1a1a', color1: '#2a0f0f', color2: '#1a0606' },
    ambient: { visible: true, centerX: 0.5, centerY: 0.7, radius: 0.5, color0: 'rgba(255, 100, 50, 0.2)', color1: 'rgba(120, 30, 10, 0)' },
    river: { visible: true, shadowColor: '#ff6b2c', shadowBlur: 16, stroke0: 'rgba(255, 107, 44, 0.3)', width0: 35, stroke1: 'rgba(255, 180, 80, 0.45)', width1: 8, path: [[-0.05,0.55],[0.10,0.53],[0.22,0.58],[0.35,0.56],[0.48,0.60],[0.60,0.58],[0.72,0.62],[0.85,0.60],[0.95,0.63],[1.05,0.61]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#1f0a0a' }, highlight: { visible: true, color: 'rgba(255, 107, 44, 0.5)', width: 2, points: [[0.06,0.64],[0.12,0.69],[0.18,0.65],[0.24,0.72],[0.28,0.67]] }, points: [[0,1],[0,0.65],[0.09,0.60],[0.17,0.65],[0.23,0.63],[0.28,0.67],[0.31,0.74],[0.30,0.81],[0.28,0.88],[0.25,0.95],[0.20,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#180808' }, points: [[0.67,1],[0.71,0.82],[0.76,0.76],[0.82,0.80],[0.88,0.72],[0.94,0.77],[1,0.68],[1,1]] },
    vents: { visible: true, pipeGrad: ['#2a1515','#3a2020','#2d1818','#1a0e0e'], topFill: '#1a0e0e', crackColor: 'rgba(255, 107, 44, 0.7)', crackGlow: '#ff6b2c', crackWidth: 3, crack2Color: 'rgba(255, 180, 60, 0.9)', pipes: [{x:0.10,y:0.52,wTop:0.014,wBot:0.014,h:0.18},{x:0.18,y:0.56,wTop:0.012,wBot:0.012,h:0.16},{x:0.25,y:0.50,wTop:0.010,wBot:0.010,h:0.14}], cracks: [[0.06,0.76],[0.09,0.80],[0.12,0.78],[0.16,0.84],[0.20,0.81],[0.24,0.86],[0.28,0.83]], cracks2: [[0.16,0.71],[0.19,0.74],[0.22,0.73],[0.26,0.76]] },
    fog: { visible: true, color0: 'rgba(26, 6, 6, 0.82)', color1: 'rgba(50, 15, 10, 0.35)', color2: 'rgba(50, 15, 10, 0)' },
    vignette: { visible: true, color0: 'rgba(10, 2, 2, 0.55)', color1: 'rgba(10, 2, 2, 0)' },
    jellyfish: { visible: true, x: 0.58, y: 0.22, radiusX: 48, radiusY: 38, bobSpeed: 0.4, bobAmp: 10, breatheSpeed: 0.9, breatheAmp: 0.07, glowColor: '#ff6b2c', glowBlur: 20, bodyGrad: ['rgba(255, 180, 80, 0.8)','rgba(255, 107, 44, 0.5)','rgba(200, 60, 20, 0.15)'], tentacleCount: 4, tentacleSpacing: 12, tentacleLenMin: 50, tentacleLenMax: 75, tentacleWaveFreqMin: 0.8, tentacleWaveFreqMax: 1.3, tentacleWaveAmpMin: 4, tentacleWaveAmpMax: 7 },
    particles: { visible: true, count: 30, vxMin: -0.06, vxMax: 0.06, vyMin: -0.12, vyMax: -0.02, rMin: 0.6, rMax: 2.2, alphaMin: 0.2, alphaMax: 0.6, blinkFreqMin: 0.5, blinkFreqMax: 2.0, colors: ['#ff6b2c','#ff9a3c','#ffb366','#ff5722'] },
    magma: { visible: true, countPerVent: 30, vxMin: -0.25, vxMax: 0.25, vyMin: -1.3, vyMax: -0.4, rMin: 0.6, rMax: 1.8, maxRMin: 2.5, maxRMax: 6, decayMin: 0.003, decayMax: 0.005, ventIntensity: [1, 0.8, 0.6] },
    glints: { visible: true, count: 35, rMin: 1.5, rMax: 4, alphaMin: 0.3, alphaMax: 0.7, freqMin: 0.6, freqMax: 1.6 },
    mountains: { visible: true, farBaseY: 0.50, farRoughness: 95, farOpacity: 0.5, midBaseY: 0.58, midRoughness: 75, midOpacity: 0.7, steps: 20, swaySpeed: 0.2, swayAmp: 2.5, farPoints: [[0,0.42],[0.06,0.40],[0.12,0.46],[0.20,0.42],[0.28,0.38],[0.36,0.44],[0.44,0.40],[0.52,0.36],[0.60,0.42],[0.68,0.38],[0.76,0.34],[0.84,0.40],[0.92,0.36],[1,0.39]], midPoints: [[0,0.63],[0.08,0.55],[0.16,0.59],[0.24,0.53],[0.32,0.57],[0.40,0.51],[0.48,0.55],[0.56,0.49],[0.64,0.53],[0.72,0.47],[0.80,0.51],[0.88,0.45],[1,0.49]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 5. VOID 虚空（Zone 21-24） ==========
export const VOID_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.5, radius: 0.95, color0: '#0a0a15', color1: '#060610', color2: '#020208' },
    ambient: { visible: true, centerX: 0.5, centerY: 0.5, radius: 0.6, color0: 'rgba(199, 206, 234, 0.08)', color1: 'rgba(80, 80, 120, 0)' },
    river: { visible: true, shadowColor: '#c7ceea', shadowBlur: 6, stroke0: 'rgba(199, 206, 234, 0.12)', width0: 20, stroke1: 'rgba(200, 210, 240, 0.22)', width1: 4, path: [[-0.05,0.48],[0.10,0.46],[0.25,0.52],[0.40,0.50],[0.55,0.54],[0.70,0.52],[0.85,0.56],[1.05,0.54]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#060610' }, highlight: { visible: true, color: 'rgba(199, 206, 234, 0.2)', width: 1, points: [[0.06,0.63],[0.13,0.68],[0.19,0.64]] }, points: [[0,1],[0,0.64],[0.08,0.58],[0.16,0.63],[0.22,0.61],[0.27,0.65],[0.30,0.72],[0.29,0.80],[0.27,0.87],[0.24,0.94],[0.19,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#040408' }, points: [[0.69,1],[0.73,0.81],[0.77,0.75],[0.83,0.79],[0.89,0.71],[0.95,0.76],[1,0.67],[1,1]] },
    vents: { visible: false, pipeGrad: [], topFill: '', crackColor: '', crackGlow: '', crackWidth: 0, crack2Color: '', pipes: [], cracks: [], cracks2: [] },
    fog: { visible: true, color0: 'rgba(2, 2, 8, 0.85)', color1: 'rgba(8, 8, 20, 0.4)', color2: 'rgba(8, 8, 20, 0)' },
    vignette: { visible: true, color0: 'rgba(0, 0, 4, 0.6)', color1: 'rgba(0, 0, 4, 0)' },
    jellyfish: { visible: true, x: 0.50, y: 0.20, radiusX: 60, radiusY: 48, bobSpeed: 0.2, bobAmp: 20, breatheSpeed: 0.4, breatheAmp: 0.12, glowColor: '#c7ceea', glowBlur: 25, bodyGrad: ['rgba(220, 225, 250, 0.7)','rgba(199, 206, 234, 0.4)','rgba(140, 150, 200, 0.1)'], tentacleCount: 6, tentacleSpacing: 16, tentacleLenMin: 80, tentacleLenMax: 130, tentacleWaveFreqMin: 0.4, tentacleWaveFreqMax: 0.8, tentacleWaveAmpMin: 8, tentacleWaveAmpMax: 14 },
    particles: { visible: true, count: 50, vxMin: -0.03, vxMax: 0.03, vyMin: -0.04, vyMax: 0.02, rMin: 0.5, rMax: 2, alphaMin: 0.1, alphaMax: 0.4, blinkFreqMin: 0.2, blinkFreqMax: 1.0, colors: ['#c7ceea','#a5b4d6','#8896bf','#6b7baa'] },
    magma: { visible: false, countPerVent: 0, vxMin: 0, vxMax: 0, vyMin: 0, vyMax: 0, rMin: 0, rMax: 0, maxRMin: 0, maxRMax: 0, decayMin: 0, decayMax: 0, ventIntensity: [] },
    glints: { visible: true, count: 20, rMin: 1, rMax: 2.5, alphaMin: 0.15, alphaMax: 0.4, freqMin: 0.3, freqMax: 0.8 },
    mountains: { visible: true, farBaseY: 0.48, farRoughness: 60, farOpacity: 0.25, midBaseY: 0.56, midRoughness: 45, midOpacity: 0.4, steps: 20, swaySpeed: 0.06, swayAmp: 1, farPoints: [[0,0.38],[0.10,0.36],[0.20,0.40],[0.30,0.36],[0.40,0.32],[0.50,0.38],[0.60,0.34],[0.70,0.30],[0.80,0.36],[0.90,0.32],[1,0.35]], midPoints: [[0,0.60],[0.10,0.54],[0.20,0.58],[0.30,0.52],[0.40,0.56],[0.50,0.50],[0.60,0.54],[0.70,0.48],[0.80,0.52],[0.90,0.48],[1,0.50]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 6. FINAL 终极（Zone 25） ==========
export const FINAL_CONFIG = {
    canvas: BASE_CANVAS,
    background: { visible: true, centerX: 0.5, centerY: 0.3, radius: 0.95, color0: '#2a1a0a', color1: '#1a0f05', color2: '#0d0802' },
    ambient: { visible: true, centerX: 0.5, centerY: 0.35, radius: 0.6, color0: 'rgba(255, 230, 109, 0.2)', color1: 'rgba(150, 100, 30, 0)' },
    river: { visible: true, shadowColor: '#ffe66d', shadowBlur: 18, stroke0: 'rgba(255, 230, 109, 0.25)', width0: 32, stroke1: 'rgba(255, 240, 160, 0.4)', width1: 8, path: [[-0.05,0.50],[0.08,0.48],[0.18,0.54],[0.30,0.52],[0.42,0.56],[0.55,0.54],[0.68,0.58],[0.80,0.56],[0.92,0.60],[1.05,0.58]] },
    leftRock: { visible: true, fill: { mode: 'solid', color: '#150e05' }, highlight: { visible: true, color: 'rgba(255, 230, 109, 0.35)', width: 2, points: [[0.06,0.63],[0.12,0.68],[0.18,0.64],[0.23,0.71]] }, points: [[0,1],[0,0.63],[0.09,0.58],[0.17,0.63],[0.23,0.61],[0.28,0.65],[0.31,0.72],[0.30,0.80],[0.28,0.87],[0.25,0.94],[0.20,1]] },
    rightRock: { visible: true, fill: { mode: 'solid', color: '#100a04' }, points: [[0.68,1],[0.72,0.82],[0.77,0.76],[0.83,0.80],[0.88,0.72],[0.94,0.77],[1,0.68],[1,1]] },
    vents: { visible: false, pipeGrad: [], topFill: '', crackColor: '', crackGlow: '', crackWidth: 0, crack2Color: '', pipes: [], cracks: [], cracks2: [] },
    fog: { visible: true, color0: 'rgba(13, 8, 2, 0.75)', color1: 'rgba(30, 20, 8, 0.3)', color2: 'rgba(30, 20, 8, 0)' },
    vignette: { visible: true, color0: 'rgba(5, 3, 1, 0.5)', color1: 'rgba(5, 3, 1, 0)' },
    jellyfish: { visible: true, x: 0.50, y: 0.18, radiusX: 65, radiusY: 50, bobSpeed: 0.2, bobAmp: 20, breatheSpeed: 0.4, breatheAmp: 0.1, glowColor: '#ffe66d', glowBlur: 28, bodyGrad: ['rgba(255, 240, 160, 0.85)','rgba(255, 230, 109, 0.6)','rgba(200, 160, 50, 0.2)'], tentacleCount: 6, tentacleSpacing: 15, tentacleLenMin: 90, tentacleLenMax: 140, tentacleWaveFreqMin: 0.4, tentacleWaveFreqMax: 0.7, tentacleWaveAmpMin: 6, tentacleWaveAmpMax: 10 },
    particles: { visible: true, count: 45, vxMin: -0.04, vxMax: 0.04, vyMin: -0.07, vyMax: 0, rMin: 0.8, rMax: 3, alphaMin: 0.2, alphaMax: 0.65, blinkFreqMin: 0.3, blinkFreqMax: 1.5, colors: ['#ffe66d','#ffd43b','#ffc078','#ffe066'] },
    magma: { visible: false, countPerVent: 0, vxMin: 0, vxMax: 0, vyMin: 0, vyMax: 0, rMin: 0, rMax: 0, maxRMin: 0, maxRMax: 0, decayMin: 0, decayMax: 0, ventIntensity: [] },
    glints: { visible: true, count: 40, rMin: 1.5, rMax: 5, alphaMin: 0.3, alphaMax: 0.7, freqMin: 0.5, freqMax: 1.8 },
    mountains: { visible: true, farBaseY: 0.45, farRoughness: 90, farOpacity: 0.4, midBaseY: 0.54, midRoughness: 70, midOpacity: 0.6, steps: 20, swaySpeed: 0.1, swayAmp: 1.5, farPoints: [[0,0.38],[0.06,0.36],[0.12,0.42],[0.20,0.38],[0.28,0.34],[0.36,0.40],[0.44,0.36],[0.52,0.32],[0.60,0.38],[0.68,0.34],[0.76,0.30],[0.84,0.36],[0.92,0.32],[1,0.35]], midPoints: [[0,0.60],[0.08,0.52],[0.16,0.56],[0.24,0.50],[0.32,0.54],[0.40,0.48],[0.48,0.52],[0.56,0.46],[0.64,0.50],[0.72,0.44],[0.80,0.48],[0.88,0.42],[1,0.46]] },
    layerOrder: ['background','ambient','river','leftRock','vents','rightRock','mountains','fog','vignette','jellyfish','particles','magma','glints'],
};

// ========== 主题名 → 配置映射 ==========

export const THEME_CONFIGS = {
    forest:  FOREST_CONFIG,
    cave:    CAVE_CONFIG,
    crystal: CRYSTAL_CONFIG,
    lava:    LAVA_CONFIG,
    void:    VOID_CONFIG,
    final:   FINAL_CONFIG,
    default: null, // 使用 DynamicBG 内置的 _defaultConfig()
};

/**
 * 根据主题名获取配置
 * @param {string} theme
 * @returns {object|null} 配置对象，null 表示使用默认
 */
export function getThemeConfig(theme) {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.default;
}
