#!/bin/bash
# Clash Verge 代理快速配置脚本（不修改代码）

echo "🌐 Clash Verge 代理配置"
echo ""

# 默认 Clash Verge 端口
DEFAULT_PORT=7897

echo "Clash Verge 默认端口: $DEFAULT_PORT"
echo ""
read -p "请确认您的 Clash 端口 [直接回车使用 $DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

PROXY_URL="http://127.0.0.1:$PORT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 配置代理: $PROXY_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 配置 backend/.env
if [ -f "backend/.env" ]; then
    # 检查是否已有代理配置
    if grep -q "^HTTP_PROXY=" backend/.env; then
        echo ""
        echo "⚠️  backend/.env 中已有代理配置"
        read -p "是否覆盖? [y/N]: " OVERWRITE
        if [[ $OVERWRITE =~ ^[Yy]$ ]]; then
            # 删除旧配置
            grep -v "^HTTP_PROXY=" backend/.env | grep -v "^HTTPS_PROXY=" > backend/.env.tmp
            mv backend/.env.tmp backend/.env
        else
            echo "跳过 backend/.env"
        fi
    fi
    
    if ! grep -q "^HTTP_PROXY=" backend/.env; then
        echo "" >> backend/.env
        echo "# Clash Verge Proxy" >> backend/.env
        echo "HTTP_PROXY=$PROXY_URL" >> backend/.env
        echo "HTTPS_PROXY=$PROXY_URL" >> backend/.env
        echo "✅ 已配置 backend/.env"
    fi
else
    cat > backend/.env << EOF
# Gemini API Configuration
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock

# Clash Verge Proxy
HTTP_PROXY=$PROXY_URL
HTTPS_PROXY=$PROXY_URL
EOF
    echo "✅ 已创建 backend/.env"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 配置完成！"
echo ""
echo "🧪 测试代理:"
echo "   curl --proxy $PROXY_URL https://google.com"
echo ""
echo "🚀 启动后端:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --port 8000"
echo ""
echo "📖 详细文档: cat CLASH_PROXY_SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
