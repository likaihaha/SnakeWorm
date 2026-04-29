import struct

def write_varint(value):
    result = []
    result.append(value & 0x7F)
    value >>= 7
    while value > 0:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.reverse()
    return bytes(result)

# MIDI 文件头
header = b'MThd' + struct.pack('>I', 6) + struct.pack('>H', 0) + struct.pack('>H', 1) + struct.pack('>H', 480)

# 致爱丽丝完整旋律
# E5=76, D#5=75, B4=71, D5=73, C5=72, A4=69, E4=64, G4=67, B4=71, C5=72
# A4=69, B4=71, C5=72, D5=73, E5=74(实际是E5=76)

# 主旋律
melody = [
    # 主题 A
    (76, 200), (75, 200), (76, 200), (75, 200),
    (76, 200), (71, 200), (72, 200), (69, 200),
    (64, 200), (60, 200), (64, 200), (69, 200),
    (71, 200), (64, 200), (67, 200), (71, 200),
    (72, 200), (64, 200), (76, 200), (75, 200),
    (76, 200), (75, 200), (76, 200), (71, 200),
    (72, 200), (69, 200), (64, 200), (60, 200),
    (64, 200), (69, 200), (71, 200), (64, 200),
    (72, 200), (71, 200), (69, 400),
    
    # 主题 B
    (71, 200), (72, 200), (73, 200), (76, 200),
    (73, 200), (72, 200), (71, 200), (64, 200),
    (67, 200), (69, 200), (72, 200), (69, 200),
    (67, 200), (64, 200), (76, 200), (75, 200),
    (76, 200), (75, 200), (76, 200), (71, 200),
    (72, 200), (69, 200), (64, 200), (60, 200),
    (64, 200), (69, 200), (71, 200), (64, 200),
    (72, 200), (71, 200), (69, 400),
    
    # 主题 A 再现
    (71, 200), (72, 200), (73, 200), (76, 200),
    (73, 200), (72, 200), (71, 200), (69, 200),
    (67, 200), (69, 200), (71, 200), (72, 200),
    (76, 200), (75, 200), (76, 400),
]

# 低音伴奏（简化版）
bass_pattern = [
    # A 小调进行
    (57, 800), (52, 800), (55, 800), (57, 800),
    (60, 800), (57, 800), (52, 800), (55, 800),
    (57, 800), (52, 800), (55, 800), (57, 800),
    (60, 800), (57, 800), (52, 800), (55, 800),
]

# 构建事件列表
all_events = []

# 旋律事件
melody_time = 0
for note, duration in melody:
    all_events.append((melody_time, 0x90, note, 70))  # note on
    all_events.append((melody_time + duration, 0x80, note, 0))  # note off
    melody_time += duration

# 伴奏事件
bass_time = 0
for note, duration in bass_pattern:
    all_events.append((bass_time, 0x90, note, 50))  # note on, 轻柔
    all_events.append((bass_time + duration, 0x80, note, 0))  # note off
    bass_time += duration

# 按时间排序
all_events.sort(key=lambda x: x[0])

# 生成 MIDI 数据
track_data = bytearray()

# Tempo (120 BPM - 中速)
track_data += write_varint(0)
track_data += bytes([0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20])  # tempo = 500000 microseconds (120 BPM)

# Program Change to Piano
track_data += write_varint(0)
track_data += bytes([0xC0, 0x00])

# 写入事件
last_time = 0
for time, status, note, velocity in all_events:
    delta = time - last_time
    track_data += write_varint(delta)
    track_data += bytes([status, note, velocity])
    last_time = time

# 结束事件
track_data += write_varint(0)
track_data += bytes([0xFF, 0x2F, 0x00])

# 音轨头
track_header = b'MTrk' + struct.pack('>I', len(track_data))

# 写入文件
with open('fur_elise.mid', 'wb') as f:
    f.write(header)
    f.write(track_header)
    f.write(track_data)

print('致爱丽丝 MIDI 文件已创建')
print('文件大小:', len(header) + len(track_header) + len(track_data), '字节')
print('旋律音符数:', len(melody))
print('时长:', melody_time / 480, '拍 =', round(melody_time / 480 / 120 * 60, 1), '秒')
