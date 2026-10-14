# 🔧 Supabase 数据库故障排查指南

## 问题：创建账号后数据库中没有数据

### 原因分析

当你注册账号时，Supabase Auth 会创建用户，但**数据库表需要先手动创建**。

---

## ✅ 解决方案

### 步骤 1️⃣：运行数据库初始化脚本

1. **打开 Supabase 控制台**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目：`cmflpwqxlflxojwyexab`

2. **进入 SQL Editor**
   - 点击左侧菜单：**SQL Editor**
   - 点击：**New Query**

3. **复制并运行 SQL 脚本**
   - 打开项目中的 `supabase-schema.sql` 文件
   - 复制**全部内容**
   - 粘贴到 SQL Editor
   - 点击 **Run** 执行

4. **验证表已创建**
   - 点击左侧菜单：**Table Editor**
   - 应该看到两个表：
     - ✅ `user_stats`
     - ✅ `focus_sessions`

---

### 步骤 2️⃣：检查注册设置

**无需邮箱验证！任意用户名即可登录！** 

本应用已配置为使用任意字符串作为账号：
- ✅ 用户可以使用任意用户名（例如：`admin`、`player1`）
- ✅ 也可以使用邮箱格式（可选）
- ✅ 注册后立即登录，无需确认邮件
- ✅ 系统会自动将用户名转换为内部邮箱格式

**工作原理：**
- 输入 `admin` → 系统使用 `admin@flowcube.local`
- 输入 `test@example.com` → 系统直接使用 `test@example.com`

---

### ⚠️ **常见错误：email rate limit exceeded**

**错误原因：**
Supabase 尝试发送验证邮件，触发了频率限制。

**解决方案：在 Supabase 控制台禁用邮箱验证**

1. 访问：https://supabase.com/dashboard/project/cmflpwqxlflxojwyexab
2. 点击左侧菜单：**Authentication** → **Settings**
3. 找到 **Email Auth** 部分
4. 关闭 **Enable email confirmations** 开关
5. 保存设置

**如果找不到该选项：**

1. 进入 **Authentication** → **Users**
2. 找到你的测试用户
3. 点击用户旁边的三个点 (⋮)
4. 选择 **Confirm user**
5. 手动确认用户

**完成后：**
1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 刷新登录页面
3. 重新注册
4. 立即登录成功！✨

---

如果你想启用邮箱验证（生产环境）：
1. 进入 **Authentication** → **Providers**
2. 确保 **Email** 是启用状态
3. 修改 `src/lib/supabase.ts` 中的注册逻辑

---

### 步骤 3️⃣：测试注册流程

1. **清除浏览器缓存**
   - 按 `Ctrl + Shift + Delete`
   - 清除缓存和 Cookie

2. **重新注册**
   - 访问：http://localhost:5174/login
   - 点击 "Create Account"
   - 输入邮箱和密码
   - 点击 "REGISTER OPERATOR"

3. **检查用户是否创建**
   - 回到 Supabase 控制台
   - 左侧菜单：**Authentication** → **Users**
   - 应该能看到你的新用户

---

### 步骤 4️⃣：验证数据

1. **查看用户统计**
   - 左侧菜单：**Table Editor**
   - 点击 `user_stats` 表
   - 新用户注册后会自动创建一行记录

2. **查看专注记录**
   - 点击 `focus_sessions` 表
   - 完成一次专注后会在这里显示

---

## 🔍 常见问题

### Q1: 注册后提示错误？

**检查点：**
- ✅ Supabase URL 是否正确
- ✅ Anon Key 是否正确
- ✅ 浏览器控制台是否有错误（F12）

**查看方法：**
```
1. 按 F12 打开开发者工具
2. 切换到 Console 标签
3. 查看是否有红色错误信息
```

### Q2: 表创建失败？

**可能原因：**
- 权限不足
- 表已存在

**解决方法：**
```sql
-- 手动删除旧表（谨慎操作！）
DROP TABLE IF EXISTS focus_sessions;
DROP TABLE IF EXISTS user_stats;

-- 然后重新运行 supabase-schema.sql
```

### Q3: 用户创建了但没有数据？

**原因：**
- `user_stats` 表是自动创建的（通过触发器）
- 第一次专注后才会创建记录

**验证方法：**
```sql
-- 在 SQL Editor 运行
SELECT * FROM user_stats;
SELECT * FROM focus_sessions;
```

---

## 📊 数据库结构说明

### user_stats 表
- 存储每个用户的累计统计数据
- 新用户首次专注时自动创建
- 包含：总时长、专注次数、星球阶段等

### focus_sessions 表
- 存储每次专注的详细记录
- 每次完成专注后创建一条记录
- 包含：时长、模式、完成时间等

---

## 🎯 快速验证清单

- [ ] 在 Supabase 运行了 `supabase-schema.sql`
- [ ] Table Editor 中能看到 `user_stats` 和 `focus_sessions` 表
- [ ] Authentication → Users 中有注册用户
- [ ] 浏览器控制台没有错误
- [ ] 完成一次专注后，`user_stats` 表有数据更新

---

## 🆘 需要帮助？

1. **检查 Supabase 项目 URL**
   - 应该是：`https://cmflpwqxlflxojwyexab.supabase.co`

2. **检查 Anon Key**
   - 在 Supabase：**Settings** → **API**
   - 复制 **anon public** key
   - 更新到 `.env` 文件

3. **查看日志**
   - Supabase：**Logs** → **Auth Logs**
   - 查看认证相关日志

---

**完成以上步骤后，刷新浏览器重新注册即可！** 🚀
