"""Configuration management for Gemini Molecular Ranker"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Central configuration"""

    # Project paths
    PROJECT_ROOT = Path(__file__).parent.parent
    SRC_DIR = PROJECT_ROOT / "src"
    DATA_DIR = PROJECT_ROOT / "data"
    EXAMPLES_DIR = DATA_DIR / "examples"
    UPLOADS_DIR = DATA_DIR / "uploads"
    RESULTS_DIR = DATA_DIR / "results"
    CACHE_DIR = DATA_DIR / "cache"

    # API Keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    # External tool paths
    DIFFDOCK_PATH = Path(os.getenv("DIFFDOCK_PATH", "~/projects/DiffDock")).expanduser()

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

# Auto-validate on import
if __name__ != "__main__":
    Config.validate()