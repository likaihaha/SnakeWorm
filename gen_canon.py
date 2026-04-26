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

# 卡农完整旋律 (D大调)
melody = [
    # 第一段 - 主题
    (74, 240), (73, 240), (74, 240), (76, 240),
    (78, 240), (76, 240), (74, 240), (73, 240),
    (71, 240), (73, 240), (74, 240), (76, 240),
    (74, 240), (73, 240), (71, 240), (69, 240),
    # 第二段 - 变奏
    (74, 240), (76, 240), (78, 240), (76, 240),
    (74, 240), (73, 240), (71, 240), (69, 240),
    (71, 240), (73, 240), (74, 240), (76, 240),
    (78, 240), (81, 480), (78, 240), (76, 240),
    # 第三段 - 发展
    (74, 240), (73, 240), (71, 240), (69, 240),
    (67, 240), (69, 240), (71, 240), (73, 240),
    (74, 240), (76, 240), (74, 240), (73, 240),
    (71, 240), (69, 240), (71, 240), (73, 240),
    # 第四段 - 高潮
    (74, 240), (76, 240), (78, 240), (81, 240),
    (83, 240), (81, 240), (78, 240), (76, 240),
    (74, 240), (73, 240), (71, 240), (73, 240),
    (74, 480), (71, 480), (69, 960),
]

# 低音伴奏（卡农经典低音进行）
bass_pattern = [
    (62, 960),  # D
    (66, 960),  # F#
    (69, 960),  # A
    (67, 960),  # G
    (62, 960),  # D
    (66, 960),  # F#
    (69, 960),  # A
    (67, 960),  # G
    (62, 960),  # D
    (66, 960),  # F#
    (69, 960),  # A
    (67, 960),  # G
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
    all_events.append((bass_time, 0x90, note, 55))  # note on
    all_events.append((bass_time + duration, 0x80, note, 0))  # note off
    bass_time += duration

# 按时间排序
all_events.sort(key=lambda x: x[0])

# 生成 MIDI 数据
track_data = bytearray()

# Tempo (80 BPM - 优雅的速度)
track_data += write_varint(0)
track_data += bytes([0xFF, 0x51, 0x03, 0x0C, 0x35, 0x00])  # tempo = 750000 microseconds (~80 BPM)

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
with open('pachelbel_canon.mid', 'wb') as f:
    f.write(header)
    f.write(track_header)
    f.write(track_data)

print('完整卡农 MIDI 文件已创建')
print('文件大小:', len(header) + len(track_header) + len(track_data), '字节')
print('旋律音符数:', len(melody))
print('时长:', melody_time / 480, '拍 =', round(melody_time / 480 / 80 * 60, 1), '秒')
