# FlowCube - Supabase Setup Guide

## 🎉 开箱即用！

**本应用已预配置 Supabase 数据库，无需任何设置即可使用！**

### 快速开始

1. **启动应用**：
   ```bash
   npm install
   npm run dev
   ```

2. **访问登录页面**：http://localhost:5173

3. **注册账号**：
   - 输入邮箱地址
   - 输入密码（至少 6 位）
   - 点击 "REGISTER OPERATOR"

4. **开始使用**：登录后即可使用所有功能！

---

## 🔧 使用自己的 Supabase 项目（可选）

如果你想使用自己的 Supabase 数据库：

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project"
4. 填写项目信息：
   - **Name**: flowcube (或你喜欢的名字)
   - **Database Password**: 设置一个强密码（请妥善保管）
   - **Region**: 选择离你最近的地区

### 2. 配置数据库

1. 项目创建完成后，进入项目控制台
2. 点击左侧菜单 **SQL Editor**
3. 点击 **New Query**
4. 复制 `supabase-schema.sql` 文件中的所有内容
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行

这将创建：
- ✅ `user_stats` 表 - 存储用户统计数据
- ✅ `focus_sessions` 表 - 存储专注记录
- ✅ 自动更新统计的触发器
- ✅ 行级安全策略（RLS）

### 3. 获取 API 密钥

1. 在 Supabase 控制台，点击 **Settings** (左下角齿轮图标)
2. 选择 **API**
3. 复制以下两个值：
   - **Project URL** (格式：`https://xxxxx.supabase.co`)
   - **anon public** key (格式：`eyJhbG...` 的长字符串)

### 4. 配置环境变量

1. 在项目根目录创建 `.env` 文件（如果还没有）
2. 填入你的 Supabase 凭据：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **重要提示**：
- 不要将 `.env` 文件提交到 Git
- 使用 `.env.example` 作为模板

### 5. 测试登录

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问 http://localhost:5173/login

3. 使用邮箱注册新账号：
   - 输入邮箱地址
   - 输入密码（至少 6 位）
   - 点击 "REGISTER OPERATOR"

4. 检查邮箱验证（如果启用了邮箱确认）

5. 登录成功后即可使用所有功能

---

## 📊 数据库结构

### user_stats 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户 ID（关联 auth.users） |
| `total_duration` | INTEGER | 总专注时长（秒） |
| `total_sessions` | INTEGER | 总专注次数 |
| `study_duration` | INTEGER | 学习模式时长（秒） |
| `exercise_duration` | INTEGER | 锻炼模式时长（秒） |
| `planet_stage` | INTEGER | 星球阶段（0-3） |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### focus_sessions 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户 ID |
| `duration` | INTEGER | 专注时长（秒） |
| `mode` | TEXT | 模式（study/exercise） |
| `completed_at` | TIMESTAMP | 完成时间 |
| `created_at` | TIMESTAMP | 创建时间 |

---

## 🔐 安全说明

### Row Level Security (RLS)

已启用行级安全策略，确保：
- ✅ 用户只能查看自己的数据
- ✅ 用户只能创建/更新/删除自己的数据
- ✅ 无法访问其他用户的数据

### 认证流程

1. 用户注册 → Supabase Auth 创建用户
2. 用户登录 → 获取 JWT token
3. 所有数据库请求自动携带用户身份
4. RLS 策略验证用户权限

---

## 🛠️ 常见问题

### Q: 注册后没有收到验证邮件？

A: 在 Supabase 控制台：
1. 进入 **Authentication** → **Providers**
2. 确保 **Email** 已启用
3. 或者暂时禁用 "Confirm email"（开发环境）

### Q: 登录时提示 "Invalid credentials"？

A: 检查：
1. 邮箱和密码是否正确
2. 是否已完成邮箱验证
3. 控制台是否有错误信息

### Q: 数据库查询失败？

A: 检查：
1. `.env` 文件配置是否正确
2. 是否运行了 `supabase-schema.sql`
3. 浏览器控制台错误信息

### Q: 如何查看用户数据？

A: 在 Supabase 控制台：
1. 进入 **Authentication** → **Users** 查看用户列表
2. 进入 **Table Editor** 查看 `user_stats` 和 `focus_sessions` 表

---

## 📝 下一步

1. ✅ 完成上述设置
2. ✅ 测试注册和登录
3. ✅ 开始开发专注功能
4. ✅ 集成星球生长系统

---

## 🔗 有用链接

- [Supabase 文档](https://supabase.com/docs)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Row Level Security 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [React + Supabase 教程](https://supabase.com/docs/guides/getting-started/quickstarts/react)

---

**祝你开发顺利！** 🚀✨
