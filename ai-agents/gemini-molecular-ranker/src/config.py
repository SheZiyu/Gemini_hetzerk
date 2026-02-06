"""Configuration management for Gemini Molecular Ranker"""
import os
import socket
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from multiple possible locations
# Priority: 1. Current working directory, 2. AI agent directory, 3. Backend directory
AI_AGENT_DIR = Path(__file__).parent.parent
PROJECT_ROOT = AI_AGENT_DIR.parent.parent

# Try multiple .env locations
env_paths = [
    PROJECT_ROOT / ".env",            # Project root (统一配置，优先)
    Path.cwd() / ".env",              # Current working directory
    AI_AGENT_DIR / ".env",            # AI agent directory
    PROJECT_ROOT / "backend" / ".env", # Backend directory
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break
else:
    # Fallback: just call load_dotenv() to try default behavior
    load_dotenv()


def check_proxy_available(proxy_url: str, timeout: float = 2.0) -> bool:
    """检查代理是否可用"""
    if not proxy_url:
        return False
    try:
        # 解析代理地址
        proxy_url = proxy_url.replace("http://", "").replace("https://", "")
        if ":" in proxy_url:
            host, port = proxy_url.split(":")
            port = int(port)
        else:
            return False

        # 尝试连接代理端口
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def setup_proxy() -> dict:
    """设置代理，仅当代理可用时启用"""
    http_proxy = os.getenv('HTTP_PROXY') or os.getenv('http_proxy')
    https_proxy = os.getenv('HTTPS_PROXY') or os.getenv('https_proxy')

    proxy_info = {
        'enabled': False,
        'http_proxy': None,
        'https_proxy': None
    }

    # 检查代理是否可用
    proxy_to_check = https_proxy or http_proxy
    if proxy_to_check and check_proxy_available(proxy_to_check):
        proxy_info['enabled'] = True
        proxy_info['http_proxy'] = http_proxy
        proxy_info['https_proxy'] = https_proxy

        # 设置环境变量
        if http_proxy:
            os.environ['HTTP_PROXY'] = http_proxy
            os.environ['http_proxy'] = http_proxy
        if https_proxy:
            os.environ['HTTPS_PROXY'] = https_proxy
            os.environ['https_proxy'] = https_proxy

        print(f"✅ 代理已启用: {proxy_to_check}")
    else:
        # 清除代理环境变量
        for key in ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy']:
            os.environ.pop(key, None)

        if proxy_to_check:
            print(f"⚠️  代理不可用: {proxy_to_check}")
        else:
            print("ℹ️  未配置代理")

    return proxy_info


# 初始化时检测代理
PROXY_INFO = setup_proxy()


def _resolve_diffdock_path() -> Path:
    """解析 DiffDock 路径，支持相对路径"""
    env_path = os.getenv("DIFFDOCK_PATH", "")

    if env_path:
        path = Path(env_path)
        # 如果是 ~ 开头，展开用户目录
        if str(path).startswith("~"):
            path = path.expanduser()
        # 如果是相对路径，相对于项目根目录
        elif not path.is_absolute():
            path = PROJECT_ROOT / path

        if path.exists():
            return path

    # 默认: 项目内的 ai-agents/DiffDock
    default_path = PROJECT_ROOT / "ai-agents" / "DiffDock"
    if default_path.exists():
        return default_path

    # 兜底返回环境变量值或默认值
    return Path(env_path) if env_path else default_path


class Config:
    """Central configuration"""

    # Project paths
    PROJECT_ROOT = PROJECT_ROOT
    AGENT_DIR = AI_AGENT_DIR
    SRC_DIR = AI_AGENT_DIR / "src"
    DATA_DIR = AI_AGENT_DIR / "data"
    EXAMPLES_DIR = DATA_DIR / "examples"
    UPLOADS_DIR = DATA_DIR / "uploads"
    RESULTS_DIR = DATA_DIR / "results"
    CACHE_DIR = DATA_DIR / "cache"

    # API Keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    # Export for direct import
    if not GEMINI_API_KEY:
        GEMINI_API_KEY = ""

    # External tool paths (支持相对路径)
    DIFFDOCK_PATH = _resolve_diffdock_path()

    # DiffDock settings
    DIFFDOCK_SAMPLES = int(os.getenv("DIFFDOCK_SAMPLES", 40))
    DIFFDOCK_STEPS = int(os.getenv("DIFFDOCK_STEPS", 20))
    DIFFDOCK_ACTUAL_STEPS = int(os.getenv("DIFFDOCK_ACTUAL_STEPS", 18))
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", 10))

    # Gemini settings
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    GEMINI_TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", 0.1))
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", 8000))

    # Processing settings
    ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
    SAVE_ALL_POSES = os.getenv("SAVE_ALL_POSES", "true").lower() == "true"
    MAX_POSES_TO_SCORE = int(os.getenv("MAX_POSES_TO_SCORE", 10))
    TOP_POSES_TO_ANALYZE = int(os.getenv("TOP_POSES_TO_ANALYZE", 5))

    @classmethod
    def validate(cls) -> bool:
        """Validate configuration"""
        errors = []

        if not cls.GEMINI_API_KEY:
            errors.append("❌ GEMINI_API_KEY not set in .env file")

        if not cls.DIFFDOCK_PATH.exists():
            errors.append(f"❌ DiffDock not found at {cls.DIFFDOCK_PATH}")

        inference_py = cls.DIFFDOCK_PATH / "inference.py"
        if not inference_py.exists():
            errors.append(f"❌ inference.py not found in {cls.DIFFDOCK_PATH}")

        # Create directories
        for dir_path in [cls.DATA_DIR, cls.UPLOADS_DIR, cls.RESULTS_DIR, cls.CACHE_DIR, cls.EXAMPLES_DIR]:
            dir_path.mkdir(parents=True, exist_ok=True)

        if errors:
            print("\n⚠️  Configuration Errors:")
            for error in errors:
                print(f"   {error}")
            print("\n💡 Fix these issues in your .env file\n")
            return False

        print("✅ Configuration validated successfully")
        return True

    @classmethod
    def print_config(cls):
        """Print current configuration"""
        print("\n" + "="*60)
        print("GEMINI MOLECULAR RANKER - CONFIGURATION")
        print("="*60)
        print(f"DiffDock Path:      {cls.DIFFDOCK_PATH}")
        print(f"Samples per run:    {cls.DIFFDOCK_SAMPLES}")
        print(f"Gemini Model:       {cls.GEMINI_MODEL}")
        print(f"API Key set:        {'✅ Yes' if cls.GEMINI_API_KEY else '❌ No'}")
        print(f"Cache enabled:      {cls.ENABLE_CACHE}")
        print(f"Output directory:   {cls.RESULTS_DIR}")
        print("="*60 + "\n")

# Export commonly used values
GEMINI_API_KEY = Config.GEMINI_API_KEY
DIFFDOCK_PATH = Config.DIFFDOCK_PATH

# Auto-validate on import (only when run as main module)
# Skip validation when imported by backend to avoid blocking
if __name__ == "__main__":
    Config.validate()