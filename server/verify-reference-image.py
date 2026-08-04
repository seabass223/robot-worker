#!/usr/bin/env python
"""Fully decode-verify one localized room-editor reference image."""
import sys
import warnings
from pathlib import Path

from PIL import Image

MAX_WIDTH = 8192
MAX_HEIGHT = 8192
MAX_PIXELS = 40_000_000
EXPECTED = {"image/png": "PNG", "image/jpeg": "JPEG"}


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[2] not in EXPECTED:
        return 2
    path = Path(sys.argv[1])
    if not path.is_file() or path.is_symlink():
        return 3
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    warnings.simplefilter("error", Image.DecompressionBombWarning)
    with Image.open(path) as image:
        if image.format != EXPECTED[sys.argv[2]]:
            return 4
        width, height = image.size
        if not width or not height or width > MAX_WIDTH or height > MAX_HEIGHT or width * height > MAX_PIXELS:
            return 5
        image.verify()
    with Image.open(path) as image:
        image.load()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        raise SystemExit(6)
