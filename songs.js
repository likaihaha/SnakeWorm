/**
 * 水晶序曲 - 曲谱数据文件
 * 
 * 格式说明：
 * - freq: 音符频率 (Hz)
 * - duration: 持续时间 (毫秒)
 * - velocity: 力度 (0-1)
 * - pedal: 是否使用延音踏板 (true/false)
 * 
 * 注意：这不是世界通用格式。世界通用的曲谱格式包括：
 * 1. MIDI (.mid) - 最通用的音乐数据格式，几乎所有音乐软件都支持
 * 2. MusicXML - 乐谱交换标准格式，用于乐谱软件间交换
 * 3. ABC notation - 文本乐谱格式，适合简单旋律
 * 
 * 当前格式是为 Web Audio API 优化的自定义格式。
 */

const SONGS = {
    // ===== 水晶序曲 - 完整版 =====
    '水晶序曲': {
        name: '水晶序曲 (Final Fantasy Prelude)',
        composer: '植松伸夫 (Nobuo Uematsu)',
        description: '《最终幻想》系列标志性旋律，由C-D-E-G琶音循环构成',
        notes: [
            // ===== 第一段：C大调琶音（4个八度）=====
            // 上行 - 渐强
            { freq: 261.63, duration: 150, velocity: 0.45, pedal: true },  // C4
            { freq: 293.66, duration: 150, velocity: 0.48, pedal: true },  // D4
            { freq: 329.63, duration: 150, velocity: 0.52, pedal: true },  // E4
            { freq: 392.00, duration: 150, velocity: 0.55, pedal: true },  // G4
            { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },  // C5
            { freq: 587.33, duration: 150, velocity: 0.63, pedal: true },  // D5
            { freq: 659.25, duration: 150, velocity: 0.67, pedal: true },  // E5
            { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },  // G5
            { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true }, // C6
            { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true }, // D6
            { freq: 1318.51, duration: 150, velocity: 0.82, pedal: true }, // E6
            { freq: 1567.98, duration: 150, velocity: 0.85, pedal: true }, // G6
            // 下行 - 渐弱
            { freq: 1318.51, duration: 150, velocity: 0.82, pedal: true }, // E6
            { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true }, // D6
            { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true }, // C6
            { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },  // G5
            { freq: 659.25, duration: 150, velocity: 0.67, pedal: true },  // E5
            { freq: 587.33, duration: 150, velocity: 0.63, pedal: true },  // D5
            { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },  // C5
            { freq: 392.00, duration: 150, velocity: 0.55, pedal: true },  // G4
            { freq: 329.63, duration: 150, velocity: 0.52, pedal: true },  // E4
            { freq: 293.66, duration: 150, velocity: 0.48, pedal: true },  // D4
            { freq: 261.63, duration: 200, velocity: 0.45, pedal: true },  // C4
            
            // ===== 第二段：F大调琶音（3个八度）=====
            // 上行
            { freq: 349.23, duration: 150, velocity: 0.50, pedal: true },  // F4
            { freq: 392.00, duration: 150, velocity: 0.53, pedal: true },  // G4
            { freq: 440.00, duration: 150, velocity: 0.57, pedal: true },  // A4
            { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },  // C5
            { freq: 698.46, duration: 150, velocity: 0.65, pedal: true },  // F5
            { freq: 783.99, duration: 150, velocity: 0.68, pedal: true },  // G5
            { freq: 880.00, duration: 150, velocity: 0.72, pedal: true },  // A5
            { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true }, // C6
            { freq: 1396.91, duration: 150, velocity: 0.80, pedal: true }, // F6
            // 下行
            { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true }, // C6
            { freq: 880.00, duration: 150, velocity: 0.72, pedal: true },  // A5
            { freq: 783.99, duration: 150, velocity: 0.68, pedal: true },  // G5
            { freq: 698.46, duration: 150, velocity: 0.65, pedal: true },  // F5
            { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },  // C5
            { freq: 440.00, duration: 150, velocity: 0.57, pedal: true },  // A4
            { freq: 392.00, duration: 150, velocity: 0.53, pedal: true },  // G4
            { freq: 349.23, duration: 200, velocity: 0.50, pedal: true },  // F4
            
            // ===== 第三段：G大调琶音（3个八度）=====
            // 上行
            { freq: 392.00, duration: 150, velocity: 0.52, pedal: true },  // G4
            { freq: 440.00, duration: 150, velocity: 0.55, pedal: true },  // A4
            { freq: 493.88, duration: 150, velocity: 0.58, pedal: true },  // B4
            { freq: 587.33, duration: 150, velocity: 0.62, pedal: true },  // D5
            { freq: 783.99, duration: 150, velocity: 0.67, pedal: true },  // G5
            { freq: 880.00, duration: 150, velocity: 0.70, pedal: true },  // A5
            { freq: 987.77, duration: 150, velocity: 0.74, pedal: true },  // B5
            { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true }, // D6
            { freq: 1567.98, duration: 150, velocity: 0.82, pedal: true }, // G6
            // 下行
            { freq: 1174.66, duration: 150, velocity: 0.78, pedal: true }, // D6
            { freq: 987.77, duration: 150, velocity: 0.74, pedal: true },  // B5
            { freq: 880.00, duration: 150, velocity: 0.70, pedal: true },  // A5
            { freq: 783.99, duration: 150, velocity: 0.67, pedal: true },  // G5
            { freq: 587.33, duration: 150, velocity: 0.62, pedal: true },  // D5
            { freq: 493.88, duration: 150, velocity: 0.58, pedal: true },  // B4
            { freq: 440.00, duration: 150, velocity: 0.55, pedal: true },  // A4
            { freq: 392.00, duration: 200, velocity: 0.52, pedal: true },  // G4
            
            // ===== 第四段：C大调高八度琶音（3个八度）=====
            // 上行 - 渐强到高潮
            { freq: 523.25, duration: 150, velocity: 0.60, pedal: true },  // C5
            { freq: 587.33, duration: 150, velocity: 0.65, pedal: true },  // D5
            { freq: 659.25, duration: 150, velocity: 0.70, pedal: true },  // E5
            { freq: 783.99, duration: 150, velocity: 0.75, pedal: true },  // G5
            { freq: 1046.50, duration: 150, velocity: 0.80, pedal: true }, // C6
            { freq: 1174.66, duration: 150, velocity: 0.85, pedal: true }, // D6
            { freq: 1318.51, duration: 150, velocity: 0.90, pedal: true }, // E6
            { freq: 1567.98, duration: 150, velocity: 0.95, pedal: true }, // G6
            { freq: 2093.00, duration: 200, velocity: 1.0, pedal: true },  // C7（最高点）
            // 下行 - 渐弱收尾
            { freq: 1567.98, duration: 150, velocity: 0.90, pedal: true }, // G6
            { freq: 1318.51, duration: 150, velocity: 0.85, pedal: true }, // E6
            { freq: 1174.66, duration: 150, velocity: 0.80, pedal: true }, // D6
            { freq: 1046.50, duration: 150, velocity: 0.75, pedal: true }, // C6
            { freq: 783.99, duration: 150, velocity: 0.70, pedal: true },  // G5
            { freq: 659.25, duration: 150, velocity: 0.65, pedal: true },  // E5
            { freq: 587.33, duration: 150, velocity: 0.60, pedal: true },  // D5
            { freq: 523.25, duration: 150, velocity: 0.55, pedal: true },  // C5
            { freq: 392.00, duration: 150, velocity: 0.50, pedal: true },  // G4
            { freq: 329.63, duration: 150, velocity: 0.48, pedal: true },  // E4
            { freq: 293.66, duration: 150, velocity: 0.46, pedal: true },  // D4
            { freq: 261.63, duration: 300, velocity: 0.45, pedal: true },  // C4（最终收尾）
        ]
    },

    // ===== 致爱丽丝 =====
    '致爱丽丝': {
        name: '致爱丽丝 (Für Elise)',
        composer: '贝多芬 (Ludwig van Beethoven)',
        description: '古典钢琴名曲，简化版主题旋律',
        notes: [
            { freq: 659.25, duration: 250, velocity: 0.65, pedal: true },  // E5
            { freq: 622.25, duration: 250, velocity: 0.60, pedal: true },  // D#5
            { freq: 659.25, duration: 250, velocity: 0.65, pedal: true },  // E5
            { freq: 622.25, duration: 250, velocity: 0.60, pedal: true },  // D#5
            { freq: 659.25, duration: 250, velocity: 0.65, pedal: true },  // E5
            { freq: 587.33, duration: 250, velocity: 0.60, pedal: true },  // D5
            { freq: 659.25, duration: 250, velocity: 0.65, pedal: true },  // E5
            { freq: 523.25, duration: 250, velocity: 0.55, pedal: true },  // C5
            { freq: 587.33, duration: 250, velocity: 0.60, pedal: true },  // D5
            { freq: 493.88, duration: 250, velocity: 0.55, pedal: true },  // B4
            { freq: 523.25, duration: 250, velocity: 0.60, pedal: true },  // C5
            { freq: 440.00, duration: 500, velocity: 0.55, pedal: true },  // A4
            { freq: 493.88, duration: 250, velocity: 0.50, pedal: true },  // B4
            { freq: 392.00, duration: 250, velocity: 0.50, pedal: true },  // G4
            { freq: 440.00, duration: 250, velocity: 0.55, pedal: true },  // A4
            { freq: 329.63, duration: 500, velocity: 0.50, pedal: true },  // E4
        ]
    },

    // ===== 爱的罗曼史 =====
    '爱的罗曼史': {
        name: '爱的罗曼史 (Romance Anónimo)',
        composer: '西班牙民谣',
        description: '经典吉他曲，温柔的三连音琶音',
        notes: [
            // 第一段 - E小调
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 783.99, duration: 300, velocity: 0.65, pedal: true },  // G5
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 783.99, duration: 300, velocity: 0.65, pedal: true },  // G5
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 783.99, duration: 300, velocity: 0.65, pedal: true },  // G5
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 783.99, duration: 600, velocity: 0.70, pedal: true },  // G5
            // 变化
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 830.61, duration: 300, velocity: 0.65, pedal: true },  // G#5
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 830.61, duration: 300, velocity: 0.65, pedal: true },  // G#5
            { freq: 329.63, duration: 300, velocity: 0.55, pedal: true },  // E4
            { freq: 493.88, duration: 300, velocity: 0.60, pedal: true },  // B4
            { freq: 830.61, duration: 600, velocity: 0.70, pedal: true },  // G#5
        ]
    },

    // ===== 小星星 =====
    '小星星': {
        name: '小星星 (Twinkle Twinkle Little Star)',
        composer: '法国童谣',
        description: '经典儿歌，简单优美',
        notes: [
            { freq: 261.63, duration: 400, velocity: 0.60, pedal: true },  // C4
            { freq: 261.63, duration: 400, velocity: 0.60, pedal: true },  // C4
            { freq: 392.00, duration: 400, velocity: 0.65, pedal: true },  // G4
            { freq: 392.00, duration: 400, velocity: 0.65, pedal: true },  // G4
            { freq: 440.00, duration: 400, velocity: 0.70, pedal: true },  // A4
            { freq: 440.00, duration: 400, velocity: 0.70, pedal: true },  // A4
            { freq: 392.00, duration: 800, velocity: 0.65, pedal: true },  // G4
            { freq: 349.23, duration: 400, velocity: 0.60, pedal: true },  // F4
            { freq: 349.23, duration: 400, velocity: 0.60, pedal: true },  // F4
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 293.66, duration: 400, velocity: 0.55, pedal: true },  // D4
            { freq: 293.66, duration: 400, velocity: 0.55, pedal: true },  // D4
            { freq: 261.63, duration: 800, velocity: 0.55, pedal: true },  // C4
        ]
    },

    // ===== 欢乐颂 =====
    '欢乐颂': {
        name: '欢乐颂 (Ode to Joy)',
        composer: '贝多芬 (Ludwig van Beethoven)',
        description: '《第九交响曲》第四乐章主题',
        notes: [
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 349.23, duration: 400, velocity: 0.62, pedal: true },  // F4
            { freq: 392.00, duration: 400, velocity: 0.65, pedal: true },  // G4
            { freq: 392.00, duration: 400, velocity: 0.65, pedal: true },  // G4
            { freq: 349.23, duration: 400, velocity: 0.62, pedal: true },  // F4
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 293.66, duration: 400, velocity: 0.55, pedal: true },  // D4
            { freq: 261.63, duration: 400, velocity: 0.55, pedal: true },  // C4
            { freq: 261.63, duration: 400, velocity: 0.55, pedal: true },  // C4
            { freq: 293.66, duration: 400, velocity: 0.55, pedal: true },  // D4
            { freq: 329.63, duration: 400, velocity: 0.60, pedal: true },  // E4
            { freq: 329.63, duration: 600, velocity: 0.62, pedal: true },  // E4
            { freq: 293.66, duration: 200, velocity: 0.55, pedal: true },  // D4
            { freq: 293.66, duration: 800, velocity: 0.55, pedal: true },  // D4
        ]
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SONGS;
}