#!/bin/bash
# DrugDiffusion - 统一构建和开发脚本
# 整合了 setup, check, dev, build, verify 功能

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 显示帮助信息
usage() {
    echo -e "${BLUE}DrugDiffusion - AI分子对接平台${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - 初始化环境和安装依赖"
    echo "  check     - 检查配置是否正确"
    echo "  dev       - 启动开发服务器"
    echo "  build     - 构建生产版本"
    echo "  verify    - 验证项目完整性"
    echo "  help      - 显示帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0 setup   # 首次使用，初始化项目"
    echo "  $0 dev     # 启动开发环境"
    echo "  $0 build   # 构建生产版本"
}

# ==================== SETUP ====================
cmd_setup() {
    echo -e "${BLUE}🚀 DrugDiffusion Quick Setup${NC}"
    echo ""

    # 1. 创建后端 .env
    if [ ! -f "backend/.env" ]; then
        echo "📝 Creating backend/.env..."
        cat > backend/.env << 'EOF'
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
EOF
        echo -e "${GREEN}✓ Created backend/.env${NC}"
        echo -e "  ${YELLOW}⚠️  Please edit backend/.env and add your API key${NC}"
    else
        echo -e "${GREEN}✓ backend/.env already exists${NC}"
    fi

    # 2. 创建前端 .env.local
    if [ ! -f "frontend/.env.local" ]; then
        echo "📝 Creating frontend/.env.local..."
        cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
EOF
        echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
    else
        echo -e "${GREEN}✓ frontend/.env.local already exists${NC}"
    fi

    # 3. 创建 AI Agent .env
    if [ ! -f "ai-agents/gemini-molecular-ranker/.env" ]; then
        echo "📝 Creating ai-agents/.env..."
        cat > ai-agents/gemini-molecular-ranker/.env << 'EOF'
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
DIFFDOCK_SAMPLES=40
GEMINI_MODEL=gemini-1.5-pro
EOF
        echo -e "${GREEN}✓ Created ai-agents/.env${NC}"
        echo -e "  ${YELLOW}⚠️  Please edit ai-agents/gemini-molecular-ranker/.env and add your API key${NC}"
    else
        echo -e "${GREEN}✓ ai-agents/.env already exists${NC}"
    fi

    # 4. 安装前端依赖
    echo ""
    echo "📦 Installing frontend dependencies..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
    fi
    cd ..

    # 5. 创建后端虚拟环境
    echo ""
    echo "🐍 Setting up backend virtual environment..."
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        echo -e "${GREEN}✓ Backend virtual environment created${NC}"
    else
        echo -e "${GREEN}✓ Backend virtual environment already exists${NC}"
    fi
    cd ..

    # 6. 安装 AI Agent 依赖
    echo ""
    echo "🤖 Installing AI Agent dependencies..."
    cd ai-agents/gemini-molecular-ranker
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        echo -e "${GREEN}✓ AI Agent dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ AI Agent dependencies already installed${NC}"
    fi
    cd ../..

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Setup Complete!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Edit backend/.env and add your GEMINI_API_KEY"
    echo "  2. Edit backend/.env and set DIFFDOCK_PATH"
    echo "  3. Copy the same values to ai-agents/gemini-molecular-ranker/.env"
    echo ""
    echo "🚀 To start development:"
    echo "  ./build.sh dev"
    echo ""
    echo "🔍 To check configuration:"
    echo "  ./build.sh check"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== CHECK ====================
cmd_check() {
    echo -e "${BLUE}🔍 Checking DrugDiffusion Configuration...${NC}"
    echo ""

    ERRORS=0

    # 检查 Node.js
    echo -n "Checking Node.js... "
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ $NODE_VERSION${NC}"
    else
        echo -e "${RED}✗ Not installed${NC}"
        ((ERRORS++))
    fi

    # 检查 Python
    echo -n "Checking Python... "
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"
    else
        echo -e "${RED}✗ Not installed${NC}"
        ((ERRORS++))
    fi

    # 检查前端依赖
    echo -n "Checking frontend dependencies... "
    if [ -d "frontend/node_modules" ]; then
        echo -e "${GREEN}✓ Installed${NC}"
    else
        echo -e "${YELLOW}⚠ Not installed (run: ./build.sh setup)${NC}"
    fi

    # 检查后端 .env
    echo -n "Checking backend .env... "
    if [ -f "backend/.env" ]; then
        echo -e "${GREEN}✓ Found${NC}"

        # 检查 GEMINI_API_KEY
        if grep -q "GEMINI_API_KEY=" backend/.env && ! grep -q "GEMINI_API_KEY=your_api_key_here" backend/.env; then
            echo -e "  ${GREEN}✓ GEMINI_API_KEY configured${NC}"
        else
            echo -e "  ${YELLOW}⚠ GEMINI_API_KEY not set${NC}"
        fi

        # 检查 DIFFDOCK_PATH
        if grep -q "DIFFDOCK_PATH=" backend/.env; then
            DIFFDOCK_PATH=$(grep "DIFFDOCK_PATH=" backend/.env | cut -d'=' -f2)
            if [ -d "$DIFFDOCK_PATH" ]; then
                echo -e "  ${GREEN}✓ DIFFDOCK_PATH valid: $DIFFDOCK_PATH${NC}"
            else
                echo -e "  ${YELLOW}⚠ DIFFDOCK_PATH not found: $DIFFDOCK_PATH${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠ Not found (run: ./build.sh setup)${NC}"
    fi

    # 检查 AI Agent .env
    echo -n "Checking ai-agents .env... "
    if [ -f "ai-agents/gemini-molecular-ranker/.env" ]; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
    fi

    # 检查前端 .env.local
    echo -n "Checking frontend .env.local... "
    if [ -f "frontend/.env.local" ]; then
        echo -e "${GREEN}✓ Found${NC}"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
        echo "  Create frontend/.env.local with:"
        echo "  NEXT_PUBLIC_BACKEND_URL=http://localhost:8000"
    fi

    echo ""
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ All critical checks passed!${NC}"
        echo ""
        echo "To start development:"
        echo "  ./build.sh dev"
    else
        echo -e "${RED}❌ Found $ERRORS error(s). Please fix them before starting.${NC}"
    fi
}

# ==================== DEV ====================
cmd_dev() {
    echo -e "${BLUE}🚀 Starting DrugDiffusion Development Environment${NC}"
    echo ""

    # 1. 启动后端 (端口 8000)
    echo -e "${GREEN}📦 Starting Backend (Port 8000)...${NC}"
    cd backend

    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    source venv/bin/activate
    pip install -q -r requirements.txt

    echo "Starting FastAPI server..."
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

    cd ..

    # 2. 启动前端 (端口 3000)
    echo -e "${GREEN}🌐 Starting Frontend (Port 3000)...${NC}"
    cd frontend

    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
    fi

    echo "Starting Next.js dev server..."
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

    cd ..

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Development servers are running!${NC}"
    echo ""
    echo -e "  Frontend:  ${BLUE}http://localhost:3000${NC}"
    echo -e "  Backend:   ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Docs:  ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 等待进程
    wait
}

# ==================== BUILD ====================
cmd_build() {
    echo -e "${BLUE}🏗️  Building DrugDiffusion for Production${NC}"
    echo ""

    BUILD_DIR="build"
    rm -rf $BUILD_DIR
    mkdir -p $BUILD_DIR

    # 1. 构建前端
    echo -e "${GREEN}📦 Building Frontend...${NC}"
    cd frontend

    if [ ! -d "node_modules" ]; then
        echo "Installing npm dependencies..."
        npm install
    fi

    echo "Building Next.js app..."
    npm run build

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend build successful${NC}"
        # 复制构建产物
        mkdir -p ../$BUILD_DIR/frontend
        cp -r .next ../$BUILD_DIR/frontend/
        cp -r public ../$BUILD_DIR/frontend/ 2>/dev/null || true
        cp package.json ../$BUILD_DIR/frontend/
        cp package-lock.json ../$BUILD_DIR/frontend/
        cp next.config.mjs ../$BUILD_DIR/frontend/
    else
        echo -e "${RED}✗ Frontend build failed${NC}"
        exit 1
    fi

    cd ..

    # 2. 准备后端
    echo ""
    echo -e "${GREEN}📦 Preparing Backend...${NC}"
    mkdir -p $BUILD_DIR/backend
    cp -r backend/* $BUILD_DIR/backend/
    echo -e "${GREEN}✓ Backend files copied${NC}"

    # 3. 准备 AI Agents
    echo ""
    echo -e "${GREEN}🤖 Preparing AI Agents...${NC}"
    mkdir -p $BUILD_DIR/ai-agents
    cp -r ai-agents/gemini-molecular-ranker $BUILD_DIR/ai-agents/
    echo -e "${GREEN}✓ AI Agents files copied${NC}"

    # 4. 创建启动脚本
    echo ""
    echo -e "${GREEN}📝 Creating production scripts...${NC}"

    # 前端启动脚本
    cat > $BUILD_DIR/start-frontend.sh << 'EOF'
#!/bin/bash
cd frontend
npm install --production
npm run start -- -p 3000
EOF

    # 后端启动脚本
    cat > $BUILD_DIR/start-backend.sh << 'EOF'
#!/bin/bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
EOF

    # 统一启动脚本
    cat > $BUILD_DIR/start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting DrugDiffusion Production"
echo ""
echo "Starting Backend (Port 8000)..."
./start-backend.sh &

echo "Starting Frontend (Port 3000)..."
./start-frontend.sh &

echo ""
echo "✅ Services started!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
wait
EOF

    chmod +x $BUILD_DIR/*.sh

    # 5. 创建 README
    cat > $BUILD_DIR/README.md << 'EOF'
# DrugDiffusion Production Build

## Quick Start

### Start All Services
```bash
./start-all.sh
```

### Start Individual Services

**Frontend (Port 3000):**
```bash
./start-frontend.sh
```

**Backend (Port 8000):**
```bash
./start-backend.sh
```

## Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Requirements

- Node.js 18+
- Python 3.8+
- pip

## Environment Variables

Create a `.env` file in `backend/` with:
```
GEMINI_API_KEY=your_api_key_here
DIFFDOCK_PATH=/path/to/DiffDock
```
EOF

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Build Complete!${NC}"
    echo ""
    echo -e "  Build directory: ${BLUE}$BUILD_DIR/${NC}"
    echo ""
    echo -e "  To deploy:"
    echo -e "    ${YELLOW}cd $BUILD_DIR${NC}"
    echo -e "    ${YELLOW}./start-all.sh${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== VERIFY ====================
cmd_verify() {
    echo -e "${BLUE}🔍 DrugDiffusion - 完整性验证${NC}"
    echo ""

    PASS=0
    FAIL=0

    check() {
        if [ $1 -eq 0 ]; then
            echo -e "  ${GREEN}✅ $2${NC}"
            ((PASS++))
        else
            echo -e "  ${RED}❌ $2${NC}"
            ((FAIL++))
        fi
    }

    echo "📁 检查目录结构..."
    test -d "frontend" && test -d "backend" && test -d "ai-agents"
    check $? "frontend/, backend/, ai-agents/ 目录存在"

    echo ""
    echo "📄 检查关键文件..."
    test -f "frontend/src/app/page.tsx"
    check $? "frontend/src/app/page.tsx (文件上传页面)"

    test -f "frontend/src/app/results/page.tsx"
    check $? "frontend/src/app/results/page.tsx (结果展示页面)"

    test -f "frontend/src/app/api/analyze/route.ts"
    check $? "frontend/src/app/api/analyze/route.ts (API 路由)"

    test -f "backend/main.py"
    check $? "backend/main.py (后端 API)"

    test -f "ai-agents/gemini-molecular-ranker/src/agents/orchestrator.py"
    check $? "orchestrator.py (AI Agent)"

    echo ""
    echo "📦 检查依赖配置..."
    test -f "frontend/package.json"
    check $? "frontend/package.json"

    test -f "backend/requirements.txt"
    check $? "backend/requirements.txt"

    test -f "ai-agents/gemini-molecular-ranker/requirements.txt"
    check $? "ai-agents/requirements.txt"

    echo ""
    echo "🔍 检查关键代码特征..."

    # 检查前端没有 mock 数据
    if ! grep -q "mock" frontend/src/app/api/analyze/route.ts 2>/dev/null; then
        check 0 "前端 API 路由无 mock 数据"
    else
        check 1 "前端 API 路由无 mock 数据"
    fi

    # 检查前端使用了 pako 压缩
    if grep -q "pako" frontend/src/app/api/analyze/route.ts 2>/dev/null; then
        check 0 "前端使用 pako 压缩"
    else
        check 1 "前端使用 pako 压缩"
    fi

    # 检查后端调用了 AI Agent
    if grep -q "AgentOrchestrator" backend/main.py 2>/dev/null; then
        check 0 "后端集成 AI Agent"
    else
        check 1 "后端集成 AI Agent"
    fi

    # 检查后端有解压缩逻辑
    if grep -q "gzip.decompress" backend/main.py 2>/dev/null; then
        check 0 "后端实现解压缩"
    else
        check 1 "后端实现解压缩"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "📊 验证结果: $PASS 通过, $FAIL 失败"

    if [ $FAIL -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ 项目完整性验证通过！${NC}"
        echo ""
        echo "下一步:"
        echo "  1. 配置环境变量: 编辑 backend/.env 和 ai-agents/.env"
        echo "  2. 运行配置检查: ./build.sh check"
        echo "  3. 启动开发服务: ./build.sh dev"
    else
        echo ""
        echo -e "${YELLOW}⚠️  发现 $FAIL 个问题，请检查上述错误${NC}"
    fi
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==================== MAIN ====================
case "${1:-}" in
    setup)
        cmd_setup
        ;;
    check)
        cmd_check
        ;;
    dev)
        cmd_dev
        ;;
    build)
        cmd_build
        ;;
    verify)
        cmd_verify
        ;;
    help|--help|-h)
        usage
        ;;
    "")
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        usage
        exit 1
        ;;
esac
