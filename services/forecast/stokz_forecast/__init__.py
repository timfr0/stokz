from __future__ import annotations

from pathlib import Path

_REAL_PACKAGE_DIR = Path(__file__).resolve().parent.parent / 'src' / 'stokz_forecast'
__path__ = [str(_REAL_PACKAGE_DIR)]

exec((_REAL_PACKAGE_DIR / '__init__.py').read_text(encoding='utf-8'))
