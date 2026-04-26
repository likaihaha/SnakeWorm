/**
 * MIDI 文件解析器和播放器
 * 
 * MIDI 格式说明：
 * - 世界通用的音乐数据格式
 * - 文件扩展名：.mid 或 .midi
 * - 包含：音符、力度、时值、乐器等信息
 * - 几乎所有音乐软件都支持
 */

const MidiPlayer = {
    // 音符名称到频率的映射
    noteFrequencies: {
        'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83,
        'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
        'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65,
        'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
        'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
        'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
        'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
        'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
        'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
        'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
        'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F6': 1396.91,
        'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53,
        'C7': 2093.00, 'C#7': 2217.46, 'D7': 2349.32, 'D#7': 2489.02, 'E7': 2637.02, 'F7': 2793.83,
        'F#7': 2959.96, 'G7': 3135.96, 'G#7': 3322.44, 'A7': 3520.00, 'A#7': 3729.31, 'B7': 3951.07,
        'C8': 4186.01
    },

    /**
     * MIDI 音符号转频率
     * @param {number} midiNote - MIDI 音符号 (0-127)
     * @returns {number} 频率 (Hz)
     */
    midiToFreq(midiNote) {
        // A4 (440Hz) = MIDI 69
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    },

    /**
     * 解析 MIDI 文件
     * @param {ArrayBuffer} buffer - MIDI 文件的 ArrayBuffer
     * @returns {Object} 解析后的 MIDI 数据
     */
    parse(buffer) {
        const data = new Uint8Array(buffer);
        const view = new DataView(buffer);
        let offset = 0;

        // 检查文件头
        const headerChunk = String.fromCharCode(data[0], data[1], data[2], data[3]);
        if (headerChunk !== 'MThd') {
            throw new Error('不是有效的 MIDI 文件');
        }

        const headerLength = view.getUint32(4);
        const format = view.getUint16(8);
        const trackCount = view.getUint16(10);
        const division = view.getUint16(12); // 每四分音符的 tick 数

        offset = 8 + headerLength;

        const tracks = [];

        // 解析每个音轨
        for (let i = 0; i < trackCount; i++) {
            const trackChunk = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
            offset += 4;

            if (trackChunk !== 'MTrk') {
                throw new Error(`音轨 ${i} 格式错误`);
            }

            const trackLength = view.getUint32(offset);
            offset += 4;

            const trackEnd = offset + trackLength;
            const events = [];
            let currentTime = 0;
            let runningStatus = 0;

            while (offset < trackEnd) {
                // 读取可变长度的 delta time
                let deltaTime = 0;
                let byte;
                do {
                    byte = data[offset++];
                    deltaTime = (deltaTime << 7) | (byte & 0x7F);
                } while (byte & 0x80);

                currentTime += deltaTime;

                // 读取事件
                let statusByte = data[offset];

                if (statusByte < 0x80) {
                    // Running status
                    statusByte = runningStatus;
                } else {
                    offset++;
                    runningStatus = statusByte;
                }

                const eventType = statusByte >> 4;
                const channel = statusByte & 0x0F;

                if (eventType === 0x8) {
                    // Note Off
                    const note = data[offset++];
                    const velocity = data[offset++];
                    events.push({
                        type: 'noteOff',
                        time: currentTime,
                        note: note,
                        velocity: velocity,
                        channel: channel
                    });
                } else if (eventType === 0x9) {
                    // Note On
                    const note = data[offset++];
                    const velocity = data[offset++];
                    events.push({
                        type: velocity > 0 ? 'noteOn' : 'noteOff',
                        time: currentTime,
                        note: note,
                        velocity: velocity,
                        channel: channel
                    });
                } else if (eventType === 0xA || eventType === 0xB || eventType === 0xE) {
                    // 2-byte events
                    offset += 2;
                } else if (eventType === 0xC || eventType === 0xD) {
                    // 1-byte events
                    offset += 1;
                } else if (statusByte === 0xFF) {
                    // Meta event
                    const metaType = data[offset++];
                    let metaLength = 0;
                    do {
                        byte = data[offset++];
                        metaLength = (metaLength << 7) | (byte & 0x7F);
                    } while (byte & 0x80);

                    const metaData = data.slice(offset, offset + metaLength);
                    offset += metaLength;

                    if (metaType === 0x51) {
                        // Tempo
                        const tempo = (metaData[0] << 16) | (metaData[1] << 8) | metaData[2];
                        events.push({
                            type: 'tempo',
                            time: currentTime,
                            tempo: tempo
                        });
                    }
                } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                    // SysEx
                    let sysexLength = 0;
                    do {
                        byte = data[offset++];
                        sysexLength = (sysexLength << 7) | (byte & 0x7F);
                    } while (byte & 0x80);
                    offset += sysexLength;
                }
            }

            tracks.push({
                events: events,
                duration: currentTime
            });
        }

        return {
            format: format,
            division: division,
            tracks: tracks,
            tempo: 500000 // 默认 120 BPM (500000 微秒/四分音符)
        };
    },

    /**
     * 将 MIDI 数据转换为简化的音符列表
     * @param {Object} midiData - 解析后的 MIDI 数据
     * @param {number} ticksPerMs - 每毫秒的 tick 数
     * @returns {Array} 音符列表 [{freq, duration, velocity}]
     */
    toNotes(midiData, ticksPerMs = null) {
        const notes = [];
        const division = midiData.division;
        let tempo = midiData.tempo; // 微秒/四分音符

        // 计算 ticksPerMs
        if (!ticksPerMs) {
            // 默认 120 BPM: 500000 微秒/四分音符
            ticksPerMs = division / (tempo / 1000);
        }

        // 处理第一个音轨（通常包含 tempo 信息）
        if (midiData.tracks.length > 0) {
            const tempoTrack = midiData.tracks[0];
            for (const event of tempoTrack.events) {
                if (event.type === 'tempo') {
                    tempo = event.tempo;
                    ticksPerMs = division / (tempo / 1000);
                }
            }
        }

        // 处理所有音轨（包括第一个）
        for (let trackIndex = 0; trackIndex < midiData.tracks.length; trackIndex++) {
            const track = midiData.tracks[trackIndex];
            const activeNotes = new Map(); // note -> {startTime, velocity}
            let hasNoteEvents = false;

            for (const event of track.events) {
                if (event.type === 'noteOn') {
                    hasNoteEvents = true;
                    activeNotes.set(event.note, {
                        startTime: event.time,
                        velocity: event.velocity
                    });
                } else if (event.type === 'noteOff') {
                    hasNoteEvents = true;
                    const activeNote = activeNotes.get(event.note);
                    if (activeNote) {
                        const duration = event.time - activeNote.startTime;
                        const durationMs = duration / ticksPerMs;

                        // 只记录有意义的音符（>10ms）
                        if (durationMs > 10) {
                            notes.push({
                                note: event.note,
                                freq: this.midiToFreq(event.note),
                                duration: Math.round(durationMs),
                                velocity: activeNote.velocity / 127, // 归一化到 0-1
                                startTime: activeNote.startTime / ticksPerMs
                            });
                        }
                        activeNotes.delete(event.note);
                    }
                } else if (event.type === 'tempo') {
                    // 更新 tempo
                    tempo = event.tempo;
                    ticksPerMs = division / (tempo / 1000);
                }
            }
        }

        // 按开始时间排序
        notes.sort((a, b) => a.startTime - b.startTime);

        return notes;
    },

    /**
     * 加载并解析 MIDI 文件
     * @param {string} url - MIDI 文件 URL
     * @returns {Promise<Object>} MIDI 数据
     */
    async load(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载 MIDI 文件: ${url}`);
        }
        const buffer = await response.arrayBuffer();
        return this.parse(buffer);
    },

    /**
     * 从文件输入元素加载 MIDI 文件
     * @param {HTMLInputElement} input - 文件输入元素
     * @returns {Promise<ArrayBuffer>}
     */
    loadFromFile(input) {
        return new Promise((resolve, reject) => {
            const file = input.files[0];
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MidiPlayer;
}