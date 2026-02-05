# 🔧 Clash Verge 代理故障排查指南

## 问题：仍然显示 "400 User location is not supported"

## ✅ 快速诊断（30秒）

运行诊断脚本自动检测：
```bash
cd /Users/changliu/workspace/src/github.com/SheZiyu/Gemini_hetzerk
./diagnose-proxy.sh
```

这个脚本会：
- ✅ 检查 Clash Verge 是否运行
- ✅ 自动测试所有常见端口（7890, 7897, 7891, 1080, 10808）
- ✅ 找到可用端口并自动配置
- ✅ 测试能否访问 Gemini API

---

## 🔍 手动检查步骤

### 1. 确认 Clash Verge 正在运行并已连接

**检查方法：**
1. 打开 Clash Verge 应用
2. 查看主界面，确保：
   - ✅ 有节点被选中（节点列表中有高亮的节点）
   - ✅ 延迟测试显示数字（如 100ms），不是 timeout
   - ✅ 右下角状态显示"已连接"或类似

**如果未连接：**
- 点击节点进行延迟测试
- 选择延迟低的节点
- 确保节点支持访问 Google

---

### 2. 查找正确的代理端口

**方法 A：在 Clash Verge 中查看**
1. 打开 Clash Verge
2. 点击 **设置** (Settings) 或 ⚙️ 图标
3. 找到 **端口设置** 或 **Port**
4. 记下以下端口：
   - **Mixed Port**（混合端口）- 推荐使用
   - **HTTP Port**（HTTP 端口）
   - **SOCKS Port**（SOCKS 端口）

**方法 B：测试常见端口**
```bash
# 测试端口 7890
curl --proxy http://127.0.0.1:7890 https://google.com

# 测试端口 7897
curl --proxy http://127.0.0.1:7897 https://google.com

# 如果返回 HTML，说明这个端口可用 ✅
```

---

### 3. 正确配置环境变量

编辑 `backend/.env`，使用**正确的端口**：

```bash
# 使用您在步骤2找到的端口
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

**重要提示：**
- ❌ 不要有多余空格：`HTTP_PROXY = xxx` 是错误的
- ✅ 正确格式：`HTTP_PROXY=http://127.0.0.1:7890`
- ❌ 不要使用 `127.0.0.1:7890`，必须有 `http://`
- ✅ 正确格式：`http://127.0.0.1:7890`

---

### 4. 验证配置文件

```bash
# 查看配置
cat backend/.env | grep PROXY

# 应该看到：
# HTTP_PROXY=http://127.0.0.1:7890
# HTTPS_PROXY=http://127.0.0.1:7890
```

---

### 5. **关键步骤：重启后端**

**必须重启才能读取新的环境变量！**

```bash
# 1. 停止当前运行的后端（Ctrl+C）

# 2. 重新启动
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# 3. 查看启动日志，确认配置已加载
```

---

## 🧪 测试代理连接

### 测试 1: 基础代理测试
```bash
# 替换为您的端口
curl --proxy http://127.0.0.1:7890 https://google.com

# ✅ 成功：返回 HTML 内容
# ❌ 失败：Connection refused 或 timeout
```

### 测试 2: Gemini API 域名测试
```bash
curl --proxy http://127.0.0.1:7890 -I https://generativelanguage.googleapis.com

# ✅ 成功：看到 HTTP 响应头
# ❌ 失败：Connection refused 或 timeout
```

---

## 🔴 常见问题

### ❌ "Connection refused" 或端口 7897 无法连接

**原因：** 端口错误或 Clash Verge 未启动

**解决：**
1. 确认 Clash Verge 正在运行
2. 在 Clash Verge 中查看实际的端口号
3. 常见端口：7890 (Mixed), 7891 (SOCKS)
4. 用 `./diagnose-proxy.sh` 自动检测

---

### ❌ 仍然显示 "User location is not supported"

**可能原因：**

1. **后端未重启** ⭐ 最常见
   - 配置后**必须重启**后端
   - Ctrl+C 停止，然后重新运行

2. **环境变量未生效**
   - 检查 `.env` 文件格式（无多余空格）
   - 确认文件保存了

3. **代理节点问题**
   - 节点不支持 Google 服务
   - 在 Clash Verge 中切换其他节点
   - 选择美国、日本、新加坡等地区节点

4. **Clash 规则问题**
   - Clash Verge 的代理规则可能不包含 Gemini API 域名
   - 尝试在 Clash 中启用 **全局代理模式**

---

### ❌ Python 没有读取代理

**检查方法：**
```bash
# 在后端运行环境中检查
cd backend
source venv/bin/activate
python3 -c "import os; print('HTTP_PROXY:', os.getenv('HTTP_PROXY'))"

# 应该输出: HTTP_PROXY: http://127.0.0.1:7890
# 如果是 None，说明环境变量未加载
```

**解决：**
- 确认 `backend/.env` 文件存在且格式正确
- 重启后端服务

---

## 📋 完整检查清单

- [ ] Clash Verge 正在运行
- [ ] Clash Verge 已连接节点（不是 timeout）
- [ ] 找到正确的代理端口（用 `curl` 测试）
- [ ] `backend/.env` 中配置了 `HTTP_PROXY` 和 `HTTPS_PROXY`
- [ ] 配置格式正确（`http://127.0.0.1:端口`）
- [ ] **已重启后端服务**（重要！）
- [ ] 后端启动日志正常
- [ ] 重新测试文件上传

---

## 🎯 推荐的完整流程

```bash
# 1. 运行诊断脚本（自动检测和配置）
./diagnose-proxy.sh

# 2. 如果脚本检测成功，重启后端
cd backend
source venv/bin/activate

# 3. 停止旧的后端（如果在运行）
# Ctrl+C

# 4. 启动新的后端
uvicorn main:app --reload --port 8000

# 5. 观察启动日志，确认无错误

# 6. 访问 http://localhost:3000 测试上传文件
```

---

## 💡 终极解决方案

如果所有方法都失败，尝试：

### 方案 1: 临时环境变量（绕过 .env）
```bash
cd backend
source venv/bin/activate
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
uvicorn main:app --reload --port 8000
```

### 方案 2: 系统全局代理
在 Clash Verge 中启用 **系统代理** 或 **TUN 模式**，让整个系统走代理。

### 方案 3: 验证 Python 代理
```bash
cd backend
source venv/bin/activate
python3 << 'EOF'
import os
import httpx

os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

client = httpx.Client(proxies={
    'http://': 'http://127.0.0.1:7890',
    'https://': 'http://127.0.0.1:7890'
})

try:
    response = client.get('https://google.com', timeout=5)
    print(f"✅ 代理工作正常: {response.status_code}")
except Exception as e:
    print(f"❌ 代理失败: {e}")
EOF
```

---

需要更多帮助？运行 `./diagnose-proxy.sh` 获取自动诊断！
