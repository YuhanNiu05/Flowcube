# FlowCube 🌍✨

**心流魔方 · 专注成就星球**

一个赛博朋克风格的专注计时应用，通过专注时间培养你的星球生态系统。

## 🎉 开箱即用

**无需任何配置！立即开始使用！**

### 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 即可使用！

### 功能特点

- ✅ **预配置数据库**：已集成 Supabase，无需设置
- ✅ **用户认证**：安全的邮箱/密码登录
- ✅ **个人数据**：每个用户拥有独立的数据库空间
- ✅ **专注计时**：正向/倒计时两种模式
- ✅ **星球成长**：根据专注时长进化你的星球
- ✅ **数据统计**：追踪你的专注进度
- ✅ **赛博朋克美学**：沉浸式 UI 设计

---

## 🚀 使用指南

### 1️⃣ 注册账号

1. 访问登录页面
2. 点击 "Create Account"
3. 输入**任意用户名**和密码（至少 6 位）
   - 可以使用：`admin`、`player1`、`test` 等任意字符串
   - 也可以使用邮箱格式（可选）
4. 点击 "REGISTER OPERATOR"
5. **无需邮箱验证，立即登录！** ✨

### 2️⃣ 开始专注

1. 登录后进入主页
2. 选择专注模式（学习/锻炼）
3. 设置专注时长
4. 开始专注，观察你的星球成长！

### 3️⃣ 查看进度

- **主页**：查看本周专注统计
- **星球页面**：查看星球成长阶段
- **宇宙页面**：查看你的专注历史

---

## 🌱 星球成长系统

你的星球会随着专注时间不断进化：

| 专注时长 | 星球阶段 | 视觉效果 |
|---------|---------|---------|
| 0-5 小时 | 荒芜期 | 灰色岩石星球 |
| 5-15 小时 | 萌芽期 | 出现绿色植被 |
| 15-30 小时 | 生机期 | 茂盛植被覆盖 |
| 30 小时+ | 心流期 | 完整生态系统 |

---

## 🔧 高级配置（可选）

### 使用自己的 Supabase 项目

如果你想完全控制数据：

1. 复制 `.env.example` 到 `.env`
2. 填入你的 Supabase 凭据：
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. 在 Supabase 运行 `supabase-schema.sql` 初始化数据库

详细步骤请查看 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## 📊 数据库结构

应用使用 Supabase PostgreSQL 数据库：

- **user_stats**: 用户统计数据（总时长、专注次数等）
- **focus_sessions**: 每次专注的详细记录
- **自动触发器**: 专注完成后自动更新统计
- **行级安全**: 确保用户数据隐私

---

## 🛠️ 技术栈

- **前端**: React 19 + TypeScript
- **路由**: React Router v7
- **样式**: Tailwind CSS 4
- **动画**: Motion
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **构建工具**: Vite 6

---

## 📝 开发说明

### 项目结构

```
flow-cube_demo/
├── src/
│   ├── components/       # 可复用组件
│   ├── pages/           # 页面组件
│   ├── lib/             # 工具库（Supabase 客户端）
│   ├── App.tsx          # 应用入口
│   └── main.tsx         # React 入口
├── .env                 # 环境变量（已预配置）
├── .env.example         # 环境变量模板
├── supabase-schema.sql  # 数据库初始化脚本
└── package.json
```

### 可用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run lint

# 清理构建文件
npm run clean
```

---

## 🔒 安全说明

- ✅ 使用 Supabase Auth 进行安全认证
- ✅ 行级安全策略（RLS）保护数据
- ✅ JWT token 自动管理
- ✅ 密码加密存储
- ✅ HTTPS 加密传输

---

## 📄 许可证

Apache-2.0

---

## 🙏 致谢

感谢 Supabase 提供的免费数据库服务！

---

**开始你的专注之旅，培养专属星球！** 🌍✨
