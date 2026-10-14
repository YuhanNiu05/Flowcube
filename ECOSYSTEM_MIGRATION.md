# 🌱 生态系统数据库迁移指南

## 问题
当前"我的星球"页面显示的小草、繁树、精灵数量是静态的，不会随着盲盒解锁而实际增加。

## 解决方案

### 步骤 1️⃣：运行数据库迁移脚本

1. **访问 Supabase 控制台**
   - URL: https://supabase.com/dashboard/project/cmflpwqxlflxojwyexab

2. **进入 SQL Editor**
   - 点击左侧菜单：**SQL Editor**
   - 点击：**New Query**

3. **复制并运行迁移脚本**
   - 打开项目中的 `supabase-ecosystem-schema.sql` 文件
   - 复制全部内容
   - 粘贴到 SQL Editor
   - 点击 **Run** 执行

4. **验证表结构已更新**
   - 点击左侧菜单：**Table Editor**
   - 点击 `user_stats` 表
   - 应该看到新增的字段：
     - ✅ `grass_count` (INTEGER)
     - ✅ `tree_count` (INTEGER)
     - ✅ `elf_count` (INTEGER)
   - 点击 `item_unlocks` 表
   - 应该能看到新表，用于记录每次解锁历史

---

### 步骤 2️⃣：测试功能

1. **清除浏览器缓存**
   - 按 `Ctrl + Shift + Delete`
   - 清除缓存和 Cookie

2. **登录账号**
   - 访问：http://localhost:5175/login
   - 使用任意用户名登录

3. **完成 3 次专注**
   - 开始专注 → 完成 → 重置
   - 重复 3 次

4. **打开盲盒**
   - 进入"我的星球"页面
   - 点击"赛博盲盒"按钮
   - 点击"收纳至地表"

5. **验证数据**
   - 刷新页面
   - 检查小草/繁树/精灵数量是否增加
   - 访问 Supabase **Table Editor** → `user_stats`
   - 查看对应数量字段是否更新
   - 访问 `item_unlocks` 表
   - 应该能看到一条新的解锁记录

---

## 📊 数据库结构说明

### user_stats 表（已更新）
- `grass_count`: 小草数量
- `tree_count`: 繁树数量
- `elf_count`: 精灵数量

### item_unlocks 表（新增）
- `id`: 解锁记录 ID
- `user_id`: 用户 ID
- `item_type`: 物品类型 ('grass', 'tree', 'elf')
- `quantity`: 数量
- `unlocked_at`: 解锁时间
- `created_at`: 创建时间

---

## 🎲 盲盒概率

- **小草种子** 🌱: 60%
- **发光树种** 🌳: 30%
- **森林精灵** ✨: 10%

---

## 🔍 故障排查

### 问题：数量没有增加

**检查点：**
1. 是否运行了数据库迁移脚本？
2. 浏览器控制台是否有错误？（按 F12 查看）
3. 用户是否已登录？

**验证 SQL：**
```sql
-- 在 SQL Editor 运行，查看你的物品数量
SELECT 
  grass_count,
  tree_count,
  elf_count
FROM user_stats
WHERE user_id = auth.uid();

-- 查看解锁历史
SELECT * FROM item_unlocks
WHERE user_id = auth.uid()
ORDER BY unlocked_at DESC;
```

### 问题：提示权限错误

**解决方案：**
确保 RLS 策略已正确创建。迁移脚本中已包含：
- ✅ `Users can view own item unlocks`
- ✅ `Users can create own item unlocks`

---

## 🎯 代码变更总结

### 新增文件
- `supabase-ecosystem-schema.sql`: 数据库迁移脚本

### 修改文件
- `src/lib/supabase.ts`: 新增 3 个函数
  - `unlockItem()`: 解锁物品并保存到数据库
  - `getEcosystemItems()`: 获取用户的植物/精灵数量
  - `getUserItemUnlocks()`: 获取解锁历史记录

- `src/pages/PlanetSettings.tsx`: 星球页面
  - 从数据库加载物品数量
  - 打开盲盒时调用 `unlockItem()` 保存到数据库
  - 实时更新显示的数量

---

## ✅ 完成清单

- [ ] 运行 `supabase-ecosystem-schema.sql`
- [ ] 验证 `user_stats` 表有新增字段
- [ ] 验证 `item_unlocks` 表已创建
- [ ] 完成 3 次专注测试
- [ ] 打开盲盒测试
- [ ] 验证数据库记录已更新
- [ ] 验证页面显示数量已增加

---

**完成以上步骤后，每次打开盲盒都会实际增加数据库中的植物/精灵数量！** 🌟
