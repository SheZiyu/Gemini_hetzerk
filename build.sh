#!/bin/bash
# DrugDiffusion - 统一构建和开发脚本
# 整合了 setup, check, dev, build, verify 功能
# 首次运行自动安装所有依赖

set -e  # 遇到错误立即退出

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# 标记文件，用于检测是否已初始化
INIT_MARKER=".initialized"

# ==================== 工具函数 ====================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_step() {
    echo -e "${CYAN}→ $1${NC}"
}

# 检查命令是否存在
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# 检查系统依赖
check_system_deps() {
    local missing=0

    echo ""
    log_info "检查系统依赖..."

    # 检查 Node.js
    if check_command node; then
        log_success "Node.js $(node --version)"
    else
        log_error "Node.js 未安装"
        echo "  请安装 Node.js 18+: https://nodejs.org/"
        missing=1
    fi

    # 检查 npm
    if check_command npm; then
        log_success "npm $(npm --version)"
    else
        log_error "npm 未安装"
        missing=1
    fi

    # 检查 Python3
    if check_command python3; then
        log_success "Python $(python3 --version 2>&1 | cut -d' ' -f2)"
    else
        log_error "Python3 未安装"
        echo "  请安装 Python 3.8+: https://python.org/"
        missing=1
    fi

    # 检查 pip
    if python3 -m pip --version &> /dev/null; then
        log_success "pip $(python3 -m pip --version 2>&1 | cut -d' ' -f2)"
    else
        log_error "pip 未安装"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        echo ""
        log_error "缺少必要的系统依赖，请先安装后再运行"
        exit 1
    fi

    log_success "系统依赖检查通过"
}

# 检查是否需要初始化
needs_init() {
    # 检查标记文件
    if [ -f "$INIT_MARKER" ]; then
        return 1  # 不需要初始化
    fi

    # 检查关键依赖是否存在
    if [ -d "frontend/node_modules" ] && [ -d "backend/venv" ]; then
        # 创建标记文件
        touch "$INIT_MARKER"
        return 1  # 不需要初始化
    fi

    return 0  # 需要初始化
}

# 自动初始化（首次运行）
auto_init() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🔧 检测到首次运行，正在自动安装依赖...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 检查系统依赖
    check_system_deps

    # 创建环境配置文件
    create_env_files

    # 安装前端依赖
    install_frontend_deps

    # 安装后端依赖
    install_backend_deps

    # 安装 AI Agent 依赖
    install_agent_deps

    # 创建标记文件
    touch "$INIT_MARKER"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 依赖安装完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 创建环境配置文件
create_env_files() {
    echo ""
    log_info "创建环境配置文件..."

    # 后端 .env
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << 'EOF'
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
EOF
        log_success "创建 backend/.env"
    else
        log_success "backend/.env 已存在"
    fi

    # 前端 .env.local
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
EOF
        log_success "创建 frontend/.env.local"
    else
        log_success "frontend/.env.local 已存在"
    fi

    # AI Agent .env
    if [ ! -f "ai-agents/gemini-molecular-ranker/.env" ]; then
        mkdir -p ai-agents/gemini-molecular-ranker
        cat > ai-agents/gemini-molecular-ranker/.env << 'EOF'
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
DIFFDOCK_SAMPLES=40
GEMINI_MODEL=gemini-1.5-pro
EOF
        log_success "创建 ai-agents/gemini-molecular-ranker/.env"
    else
        log_success "ai-agents/.env 已存在"
    fi
}

# 安装前端依赖
install_frontend_deps() {
    echo ""
    log_info "安装前端依赖..."

    if [ ! -d "frontend" ]; then
        log_error "frontend 目录不存在"
        return 1
    fi

    cd frontend

    if [ ! -d "node_modules" ]; then
        log_step "运行 npm install..."
        npm install --legacy-peer-deps
        log_success "前端依赖安装完成"
    else
        log_success "前端依赖已安装"
    fi

    cd "$SCRIPT_DIR"
}

# 安装后端依赖
install_backend_deps() {
    echo ""
    log_info "安装后端依赖..."

    if [ ! -d "backend" ]; then
        log_error "backend 目录不存在"
        return 1
    fi

    cd backend

    if [ ! -d "venv" ]; then
        log_step "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi

    log_step "安装 Python 依赖..."
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    deactivate

    log_success "后端依赖安装完成"
    cd "$SCRIPT_DIR"
}

# 安装 AI Agent 依赖
install_agent_deps() {
    echo ""
    log_info "安装 AI Agent 依赖..."

    local agent_dir="ai-agents/gemini-molecular-ranker"

    if [ ! -d "$agent_dir" ]; then
        log_warn "AI Agent 目录不存在，跳过"
        return 0
    fi

    cd "$agent_dir"

    if [ ! -d "venv" ]; then
        log_step "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi

    if [ -f "requirements.txt" ]; then
        log_step "安装 Python 依赖..."
        source venv/bin/activate
        pip install --upgrade pip -q
        pip install -r requirements.txt -q
        deactivate
        log_success "AI Agent 依赖安装完成"
    else
        log_warn "requirements.txt 不存在，跳过依赖安装"
    fi

    cd "$SCRIPT_DIR"
}

# 确保依赖已安装
ensure_deps() {
    if needs_init; then
        auto_init
    fi
}

# ==================== 显示帮助 ====================
usage() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  DrugDiffusion - AI分子对接平台${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  ${GREEN}dev${NC}       - 启动开发服务器 (自动安装依赖)"
    echo "  ${GREEN}build${NC}     - 构建生产版本"
    echo "  ${GREEN}setup${NC}     - 手动初始化环境和安装依赖"
    echo "  ${GREEN}check${NC}     - 检查配置是否正确"
    echo "  ${GREEN}verify${NC}    - 验证项目完整性"
    echo "  ${GREEN}clean${NC}     - 清理构建产物和依赖"
    echo "  ${GREEN}help${NC}      - 显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # 启动开发环境 (首次运行自动安装依赖)"
    echo "  $0 build    # 构建生产版本"
    echo "  $0 clean    # 清理所有依赖，重新开始"
    echo ""
}

# ==================== SETUP ====================
cmd_setup() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 DrugDiffusion 环境设置${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 检查系统依赖
    check_system_deps

    # 创建环境配置文件
    create_env_files

    # 安装前端依赖
    install_frontend_deps

    # 安装后端依赖
    install_backend_deps

    # 安装 AI Agent 依赖
    install_agent_deps

    # 创建标记文件
    touch "$INIT_MARKER"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 设置完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 下一步:"
    echo "  1. 编辑 ${YELLOW}backend/.env${NC} 添加 GEMINI_API_KEY"
    echo "  2. 编辑 ${YELLOW}backend/.env${NC} 设置 DIFFDOCK_PATH"
    echo "  3. 将相同配置复制到 ${YELLOW}ai-agents/gemini-molecular-ranker/.env${NC}"
    echo ""
    echo "🚀 启动开发环境:"
    echo "  ${GREEN}./build.sh dev${NC}"
    echo ""
    echo "🔍 检查配置:"
    echo "  ${GREEN}./build.sh check${NC}"
    echo ""
}

# ==================== CHECK ====================
cmd_check() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔍 检查 DrugDiffusion 配置${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    ERRORS=0
    WARNINGS=0

    # 检查系统工具
    echo "📦 系统工具:"
    if check_command node; then
        log_success "Node.js $(node --version)"
    else
        log_error "Node.js 未安装"
        ((ERRORS++))
    fi

    if check_command python3; then
        log_success "Python $(python3 --version 2>&1 | cut -d' ' -f2)"
    else
        log_error "Python3 未安装"
        ((ERRORS++))
    fi

    # 检查依赖安装
    echo ""
    echo "📁 项目依赖:"
    if [ -d "frontend/node_modules" ]; then
        log_success "前端依赖已安装"
    else
        log_warn "前端依赖未安装 (运行: ./build.sh setup)"
        ((WARNINGS++))
    fi

    if [ -d "backend/venv" ]; then
        log_success "后端虚拟环境已创建"
    else
        log_warn "后端虚拟环境未创建 (运行: ./build.sh setup)"
        ((WARNINGS++))
    fi

    # 检查配置文件
    echo ""
    echo "⚙️  配置文件:"
    if [ -f "backend/.env" ]; then
        log_success "backend/.env 存在"
        # 检查 API Key
        if grep -q "GEMINI_API_KEY=" backend/.env && ! grep -q "GEMINI_API_KEY=your_api_key_here" backend/.env; then
            log_success "  GEMINI_API_KEY 已配置"
        else
            log_warn "  GEMINI_API_KEY 未设置"
            ((WARNINGS++))
        fi
        # 检查 DiffDock 路径
        if grep -q "DIFFDOCK_PATH=" backend/.env; then
            DIFFDOCK_PATH=$(grep "DIFFDOCK_PATH=" backend/.env | cut -d'=' -f2)
            if [ -d "$DIFFDOCK_PATH" ] && [ "$DIFFDOCK_PATH" != "/path/to/DiffDock" ]; then
                log_success "  DIFFDOCK_PATH 有效: $DIFFDOCK_PATH"
            else
                log_warn "  DIFFDOCK_PATH 无效或未设置"
                ((WARNINGS++))
            fi
        fi
    else
        log_warn "backend/.env 不存在"
        ((WARNINGS++))
    fi

    if [ -f "frontend/.env.local" ]; then
        log_success "frontend/.env.local 存在"
    else
        log_warn "frontend/.env.local 不存在"
        ((WARNINGS++))
    fi

    if [ -f "ai-agents/gemini-molecular-ranker/.env" ]; then
        log_success "ai-agents/.env 存在"
    else
        log_warn "ai-agents/.env 不存在"
        ((WARNINGS++))
    fi

    # 结果汇总
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ 所有检查通过！${NC}"
        echo ""
        echo "启动开发环境: ${GREEN}./build.sh dev${NC}"
    elif [ $ERRORS -eq 0 ]; then
        echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告${NC}"
        echo ""
        echo "可以继续运行，但建议先完成配置"
    else
        echo -e "${RED}❌ 发现 $ERRORS 个错误，$WARNINGS 个警告${NC}"
        echo ""
        echo "请先修复错误后再运行"
    fi
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== DEV ====================
cmd_dev() {
    # 确保依赖已安装
    ensure_deps

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 启动 DrugDiffusion 开发环境${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 清理可能存在的旧进程
    cleanup_processes

    # 启动后端
    log_info "启动后端服务 (Port 8000)..."
    cd backend
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd "$SCRIPT_DIR"
    log_success "后端已启动 (PID: $BACKEND_PID)"

    # 等待后端启动
    sleep 2

    # 启动前端
    log_info "启动前端服务 (Port 3000)..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
    log_success "前端已启动 (PID: $FRONTEND_PID)"

    # 等待前端启动
    sleep 3

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 开发服务器已启动！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  🌐 前端:    ${BLUE}http://localhost:3000${NC}"
    echo -e "  🔌 后端:    ${BLUE}http://localhost:8000${NC}"
    echo -e "  📚 API文档: ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""

    # 捕获退出信号
    trap cleanup_on_exit INT TERM

    # 等待进程
    wait
}

# 清理进程
cleanup_processes() {
    # 尝试杀死可能存在的旧进程
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    sleep 1
}

# 退出时清理
cleanup_on_exit() {
    echo ""
    log_info "正在停止服务..."
    cleanup_processes
    log_success "服务已停止"
    exit 0
}

# ==================== BUILD ====================
cmd_build() {
    # 确保依赖已安装
    ensure_deps

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🏗️  构建 DrugDiffusion 生产版本${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    BUILD_DIR="dist"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    # 构建前端
    log_info "构建前端..."
    cd frontend
    npm run build
    if [ $? -eq 0 ]; then
        log_success "前端构建成功"
        mkdir -p "../$BUILD_DIR/frontend"
        cp -r .next "../$BUILD_DIR/frontend/"
        cp -r public "../$BUILD_DIR/frontend/" 2>/dev/null || true
        cp package.json package-lock.json next.config.mjs "../$BUILD_DIR/frontend/"
    else
        log_error "前端构建失败"
        exit 1
    fi
    cd "$SCRIPT_DIR"

    # 复制后端
    log_info "准备后端..."
    mkdir -p "$BUILD_DIR/backend"
    cp backend/main.py backend/requirements.txt "$BUILD_DIR/backend/"
    cp backend/.env "$BUILD_DIR/backend/" 2>/dev/null || true
    log_success "后端文件已复制"

    # 复制 AI Agent
    log_info "准备 AI Agent..."
    mkdir -p "$BUILD_DIR/ai-agents"
    cp -r ai-agents/gemini-molecular-ranker "$BUILD_DIR/ai-agents/"
    # 排除 venv 和 __pycache__
    rm -rf "$BUILD_DIR/ai-agents/gemini-molecular-ranker/venv"
    find "$BUILD_DIR/ai-agents" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    log_success "AI Agent 文件已复制"

    # 创建启动脚本
    log_info "创建启动脚本..."
    cat > "$BUILD_DIR/start.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting DrugDiffusion Production"

# 启动后端
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 &
cd ..

# 启动前端
cd frontend
npm install --production --legacy-peer-deps
npm run start -- -p 3000 &
cd ..

echo ""
echo "✅ Services started!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""

wait
EOF
    chmod +x "$BUILD_DIR/start.sh"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 构建完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "构建目录: ${BLUE}$BUILD_DIR/${NC}"
    echo ""
    echo "部署步骤:"
    echo "  ${GREEN}cd $BUILD_DIR${NC}"
    echo "  ${GREEN}./start.sh${NC}"
    echo ""
}

# ==================== CLEAN ====================
cmd_clean() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧹 清理 DrugDiffusion${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    log_info "清理前端依赖..."
    rm -rf frontend/node_modules frontend/.next
    log_success "前端依赖已清理"

    log_info "清理后端虚拟环境..."
    rm -rf backend/venv
    log_success "后端虚拟环境已清理"

    log_info "清理 AI Agent 虚拟环境..."
    rm -rf ai-agents/gemini-molecular-ranker/venv
    log_success "AI Agent 虚拟环境已清理"

    log_info "清理构建产物..."
    rm -rf dist build
    log_success "构建产物已清理"

    log_info "清理初始化标记..."
    rm -f "$INIT_MARKER"
    log_success "初始化标记已清理"

    echo ""
    echo -e "${GREEN}✅ 清理完成！${NC}"
    echo ""
    echo "重新安装依赖: ${GREEN}./build.sh setup${NC}"
    echo ""
}

# ==================== VERIFY ====================
cmd_verify() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔍 验证 DrugDiffusion 项目完整性${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    PASS=0
    FAIL=0

    check_item() {
        if [ $1 -eq 0 ]; then
            log_success "$2"
            ((PASS++))
        else
            log_error "$2"
            ((FAIL++))
        fi
    }

    echo "📁 目录结构:"
    test -d "frontend" && test -d "backend" && test -d "ai-agents"
    check_item $? "frontend/, backend/, ai-agents/ 目录存在"

    echo ""
    echo "📄 关键文件:"
    test -f "frontend/src/app/page.tsx"
    check_item $? "frontend/src/app/page.tsx"

    test -f "frontend/src/app/results/page.tsx"
    check_item $? "frontend/src/app/results/page.tsx"

    test -f "frontend/src/app/api/analyze/route.ts"
    check_item $? "frontend/src/app/api/analyze/route.ts"

    test -f "backend/main.py"
    check_item $? "backend/main.py"

    test -f "ai-agents/gemini-molecular-ranker/src/agents/orchestrator.py"
    check_item $? "ai-agents orchestrator.py"

    echo ""
    echo "📦 依赖配置:"
    test -f "frontend/package.json"
    check_item $? "frontend/package.json"

    test -f "backend/requirements.txt"
    check_item $? "backend/requirements.txt"

    echo ""
    echo "🔍 代码检查:"
    if grep -q "pako" frontend/src/app/api/analyze/route.ts 2>/dev/null; then
        check_item 0 "前端使用 pako 压缩"
    else
        check_item 1 "前端使用 pako 压缩"
    fi

    if grep -q "gzip.decompress" backend/main.py 2>/dev/null; then
        check_item 0 "后端实现解压缩"
    else
        check_item 1 "后端实现解压缩"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "📊 结果: ${GREEN}$PASS 通过${NC}, ${RED}$FAIL 失败${NC}"

    if [ $FAIL -eq 0 ]; then
        echo -e "${GREEN}✅ 项目完整性验证通过！${NC}"
    else
        echo -e "${YELLOW}⚠️  发现 $FAIL 个问题${NC}"
    fi
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== MAIN ====================
case "${1:-}" in
    dev)
        cmd_dev
        ;;
    build)
        cmd_build
        ;;
    setup)
        cmd_setup
        ;;
    check)
        cmd_check
        ;;
    verify)
        cmd_verify
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h)
        usage
        ;;
    "")
        usage
        ;;
    *)
        log_error "未知命令: $1"
        echo ""
        usage
        exit 1
        ;;
esac
