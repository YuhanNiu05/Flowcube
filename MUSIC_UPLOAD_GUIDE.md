# 🎵 音乐文件上传指南

## 📁 文件夹结构

音乐文件应该放在：`public/music/` 文件夹

```
flow-cube_demo/
├── public/
│   └── music/
│       ├── 1.mp3    ← 宁静星空
│       ├── 2.mp3    ← 晨间微风
│       ├── 3.mp3    ← 专注时刻
│       ├── 4.mp3    ← 星际旅行
│       ├── 5.mp3    ← 深海探索
│       ├── 6.mp3    ← 宇宙重生
│       └── 7.mp3    ← 时间尽头
```

## 📥 上传步骤

### 方法 1：直接复制文件（推荐）

1. **准备音乐文件**
   - 格式：MP3（推荐）、WAV、OGG
   - 建议大小：每首 1-5MB
   - 建议质量：128kbps 或更高

2. **重命名文件**
   - 按照编号重命名：`1.mp3`, `2.mp3`, `3.mp3` 等
   - 或者修改 `MusicLibrary.tsx` 中的 `audio_path` 字段

3. **复制到文件夹**
   - 打开文件资源管理器
   - 导航到：`E:\ent208\flow-cube_demo\public\music\`
   - 将音乐文件复制到此文件夹

4. **刷新页面**
   - 刷新浏览器（F5）
   - 在曲库页面点击歌曲的播放按钮

### 方法 2：使用免费音乐资源

如果你没有自己的音乐，可以从以下网站下载免版税音乐：

#### 推荐网站：
1. **Free Music Archive** - https://freemusicarchive.org/
2. **Bensound** - https://www.bensound.com/
3. **NCS (NoCopyrightSounds)** - https://ncs.io/
4. **YouTube Audio Library** - https://www.youtube.com/audiolibrary

#### 下载后：
1. 下载音乐文件到本地
2. 按照方法 1 的步骤重命名并复制到 `public/music/` 文件夹

## 🎨 歌曲信息自定义

如果想修改歌曲名称、艺术家等信息，编辑 `src/pages/MusicLibrary.tsx` 文件：

```typescript
const SONG_DATABASE: Song[] = [
  { 
    id: "1", 
    song_name: "宁静星空",      // ← 修改歌曲名称
    artist: "FlowCube",          // ← 修改艺术家
    genre: "ambient",            // ← 修改流派 (ambient/lofi/electronic/orchestral)
    duration: 180,               // ← 修改时长（秒）
    audio_path: "/music/1.mp3"   // ← 修改音频文件路径
  },
  // ... 其他歌曲
];
```

## 🎯 测试播放

1. 上传音乐文件后
2. 打开应用，访问曲库页面（通过设置页面）
3. 点击已解锁歌曲的播放按钮 ▶️
4. 按钮变蓝表示正在播放
5. 再次点击暂停 ⏸️

## ⚠️ 常见问题

### Q: 点击播放没声音？
A: 检查以下几点：
- 音乐文件是否正确放在 `public/music/` 文件夹
- 文件名是否匹配（1.mp3, 2.mp3 等）
- 浏览器控制台是否有错误（F12）
- 电脑音量是否打开

### Q: 可以上传其他格式吗？
A: 支持大多数音频格式：
- ✅ MP3（推荐）
- ✅ WAV（无损，文件较大）
- ✅ OGG（开源格式）
- ✅ M4A（AAC 编码）

### Q: 文件太大怎么办？
A: 建议：
- 使用 MP3 格式
- 比特率 128kbps 足够
- 每首歌曲控制在 5MB 以内
- 可以使用格式工厂等工具压缩

## 🎶 示例音乐包

你可以搜索以下关键词找到适合的专注音乐：
- "Ambient Music"
- "Lo-fi Study Music"
- "Electronic Chill"
- "Meditation Music"
- "Focus Music"

祝你使用愉快！🎵
