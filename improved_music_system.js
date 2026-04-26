/**
 * 改进的音乐系统 - 模拟真人演奏水晶序曲
 * 
 * 改进点：
 * 1. 力度变化（Velocity）：为每个音符添加velocity参数，控制音量大小
 * 2. 延音踏板效果：使用ConvolverNode模拟钢琴共鸣，或使用长衰减的增益节点模拟延音踏板
 * 3. 速度变化（Rubato）：添加弹性速度，让速度有微妙的变化
 * 4. 情感表达：通过力度、速度、踏板的组合来表现dolce（甜美地）的情感
 */

class ImprovedMusicSystem {
    constructor() {
        this.audioContext = null;
        this.lastEatTime = 0;
        this.noteIndex = 0;
        this.currentSong = null;
        this.isPlaying = false;
        
        // 延音踏板状态
        this.sustainPedal = false;
        this.sustainNodes = [];
        
        // Rubato（弹性速度）参数
        this.rubatoAmount = 0.1; // 速度变化幅度（0-1）
        this.baseTempo = 120; // 基础速度（BPM）
        
        // 力度变化参数
        this.velocityRange = { min: 0.6, max: 1.0 }; // 力度范围
        this.currentVelocity = 0.8; // 当前力度
        
        // 情感表达参数
        this.expression = {
            dolce: true, // 甜美地
            legato: true, // 连奏
            rubato: true, // 弹性速度
            pedal: true // 踏板
        };
        
        // 预设歌曲（音符序列）- 水晶序曲经典琶音
        this.songs = {
            // 最终幻想水晶序曲 - C-E-G 琶音上行下行（经典模式）
            '水晶序曲': [
                // C 大调琶音上行（3个八度）
                { freq: 261.63, duration: 120, velocity: 0.7, pedal: true },  // C4
                { freq: 329.63, duration: 120, velocity: 0.75, pedal: true },  // E4
                { freq: 392.00, duration: 120, velocity: 0.8, pedal: true },  // G4
                { freq: 523.25, duration: 120, velocity: 0.85, pedal: true },  // C5
                { freq: 659.25, duration: 120, velocity: 0.9, pedal: true },  // E5
                { freq: 783.99, duration: 120, velocity: 0.95, pedal: true },  // G5
                { freq: 1046.50, duration: 120, velocity: 1.0, pedal: true }, // C6
                { freq: 1318.51, duration: 120, velocity: 0.95, pedal: true }, // E6
                { freq: 1567.98, duration: 120, velocity: 0.9, pedal: true }, // G6
                // C 大调琶音下行
                { freq: 1567.98, duration: 120, velocity: 0.85, pedal: true }, // G6
                { freq: 1318.51, duration: 120, velocity: 0.8, pedal: true }, // E6
                { freq: 1046.50, duration: 120, velocity: 0.75, pedal: true }, // C6
                { freq: 783.99, duration: 120, velocity: 0.7, pedal: true },  // G5
                { freq: 659.25, duration: 120, velocity: 0.65, pedal: true },  // E5
                { freq: 523.25, duration: 120, velocity: 0.6, pedal: true },  // C5
                { freq: 392.00, duration: 120, velocity: 0.65, pedal: true },  // G4
                { freq: 329.63, duration: 120, velocity: 0.7, pedal: true },  // E4
                { freq: 261.63, duration: 120, velocity: 0.75, pedal: true },  // C4
                // F 大调琶音上行
                { freq: 349.23, duration: 120, velocity: 0.7, pedal: true },  // F4
                { freq: 440.00, duration: 120, velocity: 0.75, pedal: true },  // A4
                { freq: 523.25, duration: 120, velocity: 0.8, pedal: true },  // C5
                { freq: 698.46, duration: 120, velocity: 0.85, pedal: true },  // F5
                { freq: 880.00, duration: 120, velocity: 0.9, pedal: true },  // A5
                { freq: 1046.50, duration: 120, velocity: 0.95, pedal: true }, // C6
                { freq: 1396.91, duration: 120, velocity: 1.0, pedal: true }, // F6
                // F 大调琶音下行
                { freq: 1396.91, duration: 120, velocity: 0.95, pedal: true }, // F6
                { freq: 1046.50, duration: 120, velocity: 0.9, pedal: true }, // C6
                { freq: 880.00, duration: 120, velocity: 0.85, pedal: true },  // A5
                { freq: 698.46, duration: 120, velocity: 0.8, pedal: true },  // F5
                { freq: 523.25, duration: 120, velocity: 0.75, pedal: true },  // C5
                { freq: 440.00, duration: 120, velocity: 0.7, pedal: true },  // A4
                { freq: 349.23, duration: 120, velocity: 0.65, pedal: true },  // F4
                // G 大调琶音上行
                { freq: 392.00, duration: 120, velocity: 0.7, pedal: true },  // G4
                { freq: 493.88, duration: 120, velocity: 0.75, pedal: true },  // B4
                { freq: 587.33, duration: 120, velocity: 0.8, pedal: true },  // D5
                { freq: 783.99, duration: 120, velocity: 0.85, pedal: true },  // G5
                { freq: 987.77, duration: 120, velocity: 0.9, pedal: true },  // B5
                { freq: 1174.66, duration: 120, velocity: 0.95, pedal: true }, // D6
                { freq: 1567.98, duration: 120, velocity: 1.0, pedal: true }, // G6
                // G 大调琶音下行
                { freq: 1567.98, duration: 120, velocity: 0.95, pedal: true }, // G6
                { freq: 1174.66, duration: 120, velocity: 0.9, pedal: true }, // D6
                { freq: 987.77, duration: 120, velocity: 0.85, pedal: true },  // B5
                { freq: 783.99, duration: 120, velocity: 0.8, pedal: true },  // G5
                { freq: 587.33, duration: 120, velocity: 0.75, pedal: true },  // D5
                { freq: 493.88, duration: 120, velocity: 0.7, pedal: true },  // B4
                { freq: 392.00, duration: 120, velocity: 0.65, pedal: true },  // G4
                // C 大调琶音上行（高八度）
                { freq: 523.25, duration: 120, velocity: 0.7, pedal: true },  // C5
                { freq: 659.25, duration: 120, velocity: 0.75, pedal: true },  // E5
                { freq: 783.99, duration: 120, velocity: 0.8, pedal: true },  // G5
                { freq: 1046.50, duration: 120, velocity: 0.85, pedal: true }, // C6
                { freq: 1318.51, duration: 120, velocity: 0.9, pedal: true }, // E6
                { freq: 1567.98, duration: 120, velocity: 0.95, pedal: true }, // G6
                { freq: 2093.00, duration: 120, velocity: 1.0, pedal: true }, // C7
                // C 大调琶音下行（高八度）
                { freq: 2093.00, duration: 120, velocity: 0.95, pedal: true }, // C7
                { freq: 1567.98, duration: 120, velocity: 0.9, pedal: true }, // G6
                { freq: 1318.51, duration: 120, velocity: 0.85, pedal: true }, // E6
                { freq: 1046.50, duration: 120, velocity: 0.8, pedal: true }, // C6
                { freq: 783.99, duration: 120, velocity: 0.75, pedal: true },  // G5
                { freq: 659.25, duration: 120, velocity: 0.7, pedal: true },  // E5
                { freq: 523.25, duration: 120, velocity: 0.65, pedal: true },  // C5
            ],
            // 最终幻想水晶序曲 - 经典旋律版本
            '水晶序曲旋律': [
                { freq: 523.25, duration: 300, velocity: 0.7, pedal: true },  // C5
                { freq: 587.33, duration: 300, velocity: 0.75, pedal: true },  // D5
                { freq: 659.25, duration: 600, velocity: 0.8, pedal: true },  // E5
                { freq: 587.33, duration: 300, velocity: 0.75, pedal: true },  // D5
                { freq: 523.25, duration: 300, velocity: 0.7, pedal: true },  // C5
                { freq: 493.88, duration: 300, velocity: 0.65, pedal: true },  // B4
                { freq: 440.00, duration: 600, velocity: 0.6, pedal: true },  // A4
            ]
        };
        
        // 当前选中的歌曲（默认水晶序曲）
        this.currentSongName = '水晶序曲';
        this.currentSong = this.songs[this.currentSongName];
        
        // 延音踏板节点
        this.sustainNodes = [];
        
        // 创建卷积混响（模拟钢琴共鸣）
        this.convolver = null;
        this.reverbGain = null;
    }
    
    // 初始化音频上下文（需要用户交互）
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建卷积混响（模拟钢琴共鸣）
            this.createReverb();
        }
    }
    
    // 创建卷积混响
    createReverb() {
        // 创建简单的脉冲响应（模拟钢琴共鸣）
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2秒的混响
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        // 左声道
        const leftChannel = impulse.getChannelData(0);
        for (let i = 0; i < length; i++) {
            leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
        
        // 右声道
        const rightChannel = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
        
        // 创建卷积节点
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = impulse;
        
        // 混响音量
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        // 连接混响
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.audioContext.destination);
    }
    
    // 播放钢琴音色（改进版）
    playNote(freq, duration = 120, velocity = 0.8, usePedal = true) {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        
        const now = this.audioContext.currentTime;
        const durationSec = duration / 1000;
        
        // 应用力度变化
        const adjustedVelocity = velocity * this.currentVelocity;
        
        // 主振荡器（锯齿波，更接近钢琴的丰富泛音）
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        
        // 第二振荡器（方波，增加厚度）
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq, now);
        
        // 泛音振荡器（高频泛音）
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 2, now);  // 2倍频泛音
        
        // 第四振荡器（低频基音）
        const osc4 = this.audioContext.createOscillator();
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(freq * 0.5, now);  // 低八度
        
        // 主音量包络（钢琴特性：快速起音，缓慢衰减）
        const gainMain = this.audioContext.createGain();
        gainMain.gain.setValueAtTime(0, now);
        gainMain.gain.linearRampToValueAtTime(0.12 * adjustedVelocity, now + 0.005);  // 快速起音 5ms
        gainMain.gain.exponentialRampToValueAtTime(0.06 * adjustedVelocity, now + 0.1);  // 快速衰减到一半
        gainMain.gain.exponentialRampToValueAtTime(0.01 * adjustedVelocity, now + durationSec * 1.5);  // 缓慢衰减
        
        // 方波音量（较小）
        const gainSquare = this.audioContext.createGain();
        gainSquare.gain.setValueAtTime(0, now);
        gainSquare.gain.linearRampToValueAtTime(0.04 * adjustedVelocity, now + 0.005);
        gainSquare.gain.exponentialRampToValueAtTime(0.005 * adjustedVelocity, now + durationSec);
        
        // 泛音音量（更小）
        const gainHarmonic = this.audioContext.createGain();
        gainHarmonic.gain.setValueAtTime(0, now);
        gainHarmonic.gain.linearRampToValueAtTime(0.02 * adjustedVelocity, now + 0.003);
        gainHarmonic.gain.exponentialRampToValueAtTime(0.001 * adjustedVelocity, now + durationSec * 0.8);
        
        // 低频音量
        const gainLow = this.audioContext.createGain();
        gainLow.gain.setValueAtTime(0, now);
        gainLow.gain.linearRampToValueAtTime(0.03 * adjustedVelocity, now + 0.008);
        gainLow.gain.exponentialRampToValueAtTime(0.001 * adjustedVelocity, now + durationSec * 1.2);
        
        // 低通滤波器（模拟钢琴共鸣）
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, now);  // 起始频率
        filter.frequency.exponentialRampToValueAtTime(800, now + durationSec);  // 衰减后降低
        filter.Q.setValueAtTime(1, now);
        
        // 连接
        osc1.connect(gainMain);
        osc2.connect(gainSquare);
        osc3.connect(gainHarmonic);
        osc4.connect(gainLow);
        
        gainMain.connect(filter);
        gainSquare.connect(filter);
        gainHarmonic.connect(filter);
        gainLow.connect(filter);
        
        // 如果使用踏板，连接到混响
        if (usePedal && this.convolver) {
            filter.connect(this.convolver);
        } else {
            filter.connect(this.audioContext.destination);
        }
        
        // 播放
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc4.start(now);
        
        osc1.stop(now + durationSec * 1.5 + 0.3);
        osc2.stop(now + durationSec + 0.2);
        osc3.stop(now + durationSec * 0.8 + 0.2);
        osc4.stop(now + durationSec * 1.2 + 0.2);
        
        // 如果使用踏板，添加延音效果
        if (usePedal) {
            this.addSustainEffect(freq, durationSec, adjustedVelocity);
        }
        
        this.lastEatTime = now;
    }
    
    // 添加延音效果
    addSustainEffect(freq, duration, velocity) {
        // 创建一个持续的正弦波来模拟延音
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.01 * velocity, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration * 2);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration * 2);
        
        // 保存节点以便后续控制
        this.sustainNodes.push({ osc, gain });
    }
    
    // 应用Rubato（弹性速度）
    applyRubato(baseDuration) {
        if (!this.expression.rubato) return baseDuration;
        
        // 随机微调 duration（±10%）
        const variation = (Math.random() - 0.5) * 2 * this.rubatoAmount;
        return baseDuration * (1 + variation);
    }
    
    // 更新力度（模拟真人演奏的力度变化）
    updateVelocity() {
        // 在范围内随机变化力度
        const range = this.velocityRange.max - this.velocityRange.min;
        this.currentVelocity = this.velocityRange.min + Math.random() * range;
    }
    
    // 吃一个宝珠播放 1 个音符
    onEatFood(food) {
        const now = this.audioContext ? this.audioContext.currentTime : 0;
        if (now - this.lastEatTime < 0.1) return; // 防止过于频繁
        
        this.lastEatTime = now;
        
        // 更新力度
        this.updateVelocity();
        
        // 吃一个宝珠播放 1 个音符
        if (this.currentSong && this.noteIndex < this.currentSong.length) {
            const note = this.currentSong[this.noteIndex];
            
            // 应用Rubato
            const adjustedDuration = this.applyRubato(note.duration);
            
            // 播放音符
            this.playNote(note.freq, adjustedDuration, note.velocity, note.pedal);
            this.noteIndex++;
            
            // 如果播放完一首歌，循环播放
            if (this.noteIndex >= this.currentSong.length) {
                this.noteIndex = 0;
            }
        }
    }
    
    // 切换歌曲
    setSong(songName) {
        if (this.songs[songName]) {
            this.currentSongName = songName;
            this.currentSong = this.songs[songName];
            this.noteIndex = 0;
        }
    }
    
    // 播放黄色宝珠的琶音（水晶序曲音符，数量等于段数）
    playYellowBeadArpeggio(segmentCount) {
        // 使用与普通宝珠相同的水晶序曲音符序列
        const song = this.songs['水晶序曲'];
        if (!song || song.length === 0) return;
        
        const totalNotes = song.length;
        const interval = 100;  // 每个音符间隔 100ms
        
        // 更新力度
        this.updateVelocity();
        
        // 使用递归 setTimeout 确保可靠播放
        const playNoteAtIndex = (index) => {
            if (index >= segmentCount) return;  // 播放完毕
            
            const noteIndex = index % totalNotes;  // 循环使用音符
            const note = song[noteIndex];
            
            // 应用Rubato
            const adjustedDuration = this.applyRubato(note.duration);
            
            // 播放音符
            this.playNote(note.freq, adjustedDuration, note.velocity, note.pedal);
            
            // 安排下一个音符
            setTimeout(() => {
                playNoteAtIndex(index + 1);
            }, interval);
        };
        
        // 开始播放
        playNoteAtIndex(0);
    }
    
    // 设置情感表达参数
    setExpression(params) {
        Object.assign(this.expression, params);
    }
    
    // 设置力度范围
    setVelocityRange(min, max) {
        this.velocityRange.min = Math.max(0, Math.min(1, min));
        this.velocityRange.max = Math.max(0, Math.min(1, max));
    }
    
    // 设置Rubato幅度
    setRubatoAmount(amount) {
        this.rubatoAmount = Math.max(0, Math.min(1, amount));
    }
    
    // 停止所有声音
    stopAll() {
        this.sustainNodes.forEach(node => {
            try {
                node.osc.stop();
            } catch(e) {}
        });
        this.sustainNodes = [];
    }
}

// 导出改进的音乐系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImprovedMusicSystem;
}