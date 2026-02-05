#!/bin/bash
# Clash Verge 代理诊断和配置脚本

echo "🔍 Clash Verge 代理诊断"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查 Clash Verge 是否运行
echo "1️⃣ 检查 Clash Verge 进程..."
if pgrep -f "verge" > /dev/null || pgrep -f "clash" > /dev/null; then
    echo "   ✅ Clash Verge 正在运行"
else
    echo "   ❌ Clash Verge 未运行"
    echo "   请先启动 Clash Verge！"
    exit 1
fi

echo ""
echo "2️⃣ 测试常见代理端口..."

# 测试常见端口
PORTS=(7890 7897 7891 1080 10808 8080)
WORKING_PORT=""

for PORT in "${PORTS[@]}"; do
    echo -n "   测试端口 $PORT ... "
    if curl --proxy http://127.0.0.1:$PORT -s -m 2 https://google.com > /dev/null 2>&1; then
        echo "✅ 可用"
        if [ -z "$WORKING_PORT" ]; then
            WORKING_PORT=$PORT
        fi
    else
        echo "❌ 不可用"
    fi
done

echo ""

if [ -z "$WORKING_PORT" ]; then
    echo "❌ 未找到可用的代理端口！"
    echo ""
    echo "📋 请手动检查 Clash Verge 配置："
    echo "   1. 打开 Clash Verge"
    echo "   2. 点击 设置 → 端口设置"
    echo "   3. 查看 HTTP 代理端口"
    echo "   4. 确保 '系统代理' 或 'TUN 模式' 已启用"
    echo ""
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 找到可用端口: $WORKING_PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROXY_URL="http://127.0.0.1:$WORKING_PORT"

# 3. 测试 Gemini API 域名访问
echo "3️⃣ 测试 Gemini API 访问..."
if curl --proxy $PROXY_URL -s -m 5 -I https://generativelanguage.googleapis.com 2>&1 | grep -q "200\|301\|302\|403"; then
    echo "   ✅ 可以访问 Gemini API 域名"
else
    echo "   ⚠️  无法访问 Gemini API 域名"
    echo "   可能需要切换 Clash 节点或检查规则配置"
fi

echo ""
echo "4️⃣ 配置环境变量..."

# 配置 backend/.env
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
EOF
fi

# 移除旧的代理配置
grep -v "^HTTP_PROXY=" backend/.env | grep -v "^HTTPS_PROXY=" > backend/.env.tmp 2>/dev/null || true
mv backend/.env.tmp backend/.env 2>/dev/null || true

# 添加新配置
echo "" >> backend/.env
echo "# Clash Verge Proxy (Auto-configured)" >> backend/.env
echo "HTTP_PROXY=$PROXY_URL" >> backend/.env
echo "HTTPS_PROXY=$PROXY_URL" >> backend/.env

echo "   ✅ 已配置 backend/.env"

# 显示当前配置
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 当前代理配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "HTTP_PROXY=$PROXY_URL"
echo "HTTPS_PROXY=$PROXY_URL"
echo ""

# 检查 .env 文件
echo "📄 backend/.env 文件内容:"
cat backend/.env
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ 配置完成！"
echo ""
echo "🚀 下一步："
echo "   1. 重启后端服务（如果正在运行，先 Ctrl+C 停止）"
echo "   2. 运行以下命令："
echo ""
echo "      cd backend"
echo "      source venv/bin/activate"
echo "      uvicorn main:app --reload --port 8000"
echo ""
echo "   3. 重新测试文件上传"
echo ""
echo "💡 提示："
echo "   - 如果仍然失败，请检查 Clash Verge 是否已连接节点"
echo "   - 在 Clash Verge 中尝试切换不同的节点"
echo "   - 确保节点支持访问 Google 服务"
echo ""
