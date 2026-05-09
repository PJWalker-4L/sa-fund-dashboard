import os
import sys
from pathlib import Path

# On Vercel, $HOME and project root are read-only. Redirect any "user home" or
# library cache writes to /tmp BEFORE importing edgartools or anything else
# that touches the filesystem at import time.
if os.getenv("VERCEL"):
    _TMP_HOME = "/tmp/home"
    Path(_TMP_HOME).mkdir(parents=True, exist_ok=True)
    os.environ["HOME"] = _TMP_HOME
    os.environ.setdefault("EDGAR_DATA_DIR", "/tmp/edgar")
    Path("/tmp/edgar").mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from main import app  # noqa: F401 — Vercel picks up `app` as the ASGI entrypoint
