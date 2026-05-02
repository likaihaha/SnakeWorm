# SnakeWorm 项目记忆

## 版本管理流程
- 完成功能修改后自动提交，不需要用户每次都提醒
- 流程：git add → git commit → git push → 打标签
- **每次提交必须同步更新页面标题和注释中的版本号**（index.html 中 `<title>` 和页面内版本号，用 `grep -n "v1\." index.html` 检查三处）
- GitHub 远程仓库：https://github.com/likaihaha/SnakeWorm
- GitHub Pages 地址：https://likaihaha.github.io/SnakeWorm/
- 配置文件：index.html（v1.35起改为ESM多文件架构，src/目录14个模块）
- Git Credential Manager 已配置，推送自动认证

## 当前版本
- v1.59: 幼体死亡变灰色尸体沉底 - 被敌人咬死后不再瞬间消失，改为DeadBody灰色下沉动画
- v1.58: 调试日志实时面板 - Ctrl+L开启后左侧显示彩色滚动日志面板（带图标+颜色+可拖拽），导出txt
- v1.57: 调试日志系统 - Ctrl+L记录所有游戏事件（进食/断尾/幼体/敌人/死亡），自动编号+导出txt
- v1.44: 蚯蚓统一改名虫虫 - 所有UI文本和代码注释
- v1.43: 统一术语为"后代" - 孩子/分裂体改为后代
- v1.42: 修复玩家撞敌人秒杀bug - 删除重复碰撞检测，每次碰扣1血需3次击杀
- v1.41: 敌人咬成功后见好就收 - 冷却10秒不再追幼体，改为巡游觅食
- v1.40: 幼体进食冷却+敌人恢复身体 - 吃一节冷却3秒+敌人咬幼体恢复1节
- v1.39: ESC暂停复用开始界面 - 按钮显示继续游戏，再按ESC或点按钮恢复
- v1.38: 排行榜管理员模式 - ⚙️登录后可删除记录（SHA-256哈希验证）
- v1.37: 排行榜返回按钮修复 - 点击返回回到开始菜单
- v1.36: 排行榜系统 - LocalStorage+排序+提交成绩
- v1.35: 多文件ESM重构+6项审查修复（对象池+热路径+颜色缓存+死代码+重复函数+版本号统一）
- v1.34: 断尾幼体去掉光圈缩放+成年给无敌防碰死
- v1.30~v1.32: 渲染热路径优化+全局错误边界+魔法数字消除+状态机统一
- v1.20~v1.29: 性能优化系列（Vector就地修改+碰撞区域缓存+DOM缓存+SpatialGrid+对象池+shadowBlur替换+紧凑过滤+游戏状态机+魔法数字+错误边界+渲染优化）
- v1.13~v1.19: SpatialGrid碰撞检测+Magic Number+死亡对话框修复+宝珠光圈+三叶虫改进+幼体保护
- v1.10~v1.12: 错误处理增强+Magic Number整理+游戏状态机+Enemy状态模式
- v1.05~v1.09: 幼体系统+敌人咬幼体+亲子系统Bug修复+shadowBlur优化+渲染优化
- v0.86~v1.04: 饥饿系统+子弹系统+宝珠系统+尸体宝珠+亲子系统+消耗尾巴
- v0.62~v0.85: 安全修复+布局优化+全屏+RP提示+FPS锁定+宝珠频率+图例
- v0.12~v0.61: 核心玩法搭建期（吃豆人嘴型→移动端→虚拟摇杆→宝珠系统→音效→尸体系统→亲子系统）

## 音乐系统v2
- MusicSystem已升级为v2真人演奏模拟版本（2026-04-26）
- 新增特性：力度变化（Velocity）、延音踏板（ConvolverNode卷积混响）、弹性速度（Rubato ±8%）、情感表达（Dolce）
- 水晶序曲音符数据：每个音符有独立velocity和pedal属性，琶音上行渐强、下行渐弱
- test_music.html有控制面板可实时调节参数

## 游戏节奏/进度系统（v0.58）
- RHYTHM配置：YELLOW_UNLOCK_TIME=25s, YELLOW_UNLOCK_LENGTH=10节, YELLOW_COOLDOWN=15.0s, RED_UNLOCK_TIME=30s, RED_UNLOCK_LENGTH=15节, ORANGE_UNLOCK_TIME=90s
- 宝珠解锁顺序：🟢绿(始终) → 🟡黄(25s或10节) → 🟠橙(90s) → 🔴红(30s且身长15)
- 黄色宝珠冷却机制：首次解锁后，吃完冷却15秒（旋律播完后等待）

## 速度单位规范
- 虫虫移动：`velocity * speed * dt * 60`
- 宝珠/子弹移动：`velocity * dt * 60`
- 尾巴下沉：`velocity * dt`（比其他系统小60倍，保存速度时需乘以60）

## 安全规范
- 禁止使用innerHTML/outerHTML插入动态内容，必须用DOM API（createElement + textContent）
- 禁止使用eval()、document.write()、setTimeout(string)等危险函数

## 调试原则
- **连续2次修不好同一问题时，必须让用户检查F12控制台输出**
- 日志比猜测可靠100倍，浏览器控制台能直接看到变量状态和执行流程

## 术语规范
- "后代"为统一术语（不用"孩子"/"分裂体"/"子代"）
- "虫虫"为统一称呼（不用"蚯蚓"）
