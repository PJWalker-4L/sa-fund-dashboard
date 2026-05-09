import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from main import app  # noqa: F401 — Vercel picks up `app` as the ASGI entrypoint
