#!/usr/bin/env python3
"""Verify HarmonyOS Sans SC font checksums for the CrystaSee V1.13 snapshot."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

EXPECTED = {
    "HarmonyOS_Sans_SC_Regular.ttf": (
        "b8485d72ec40b9030ee19b10a5d24a14df446e9b4d9b7ebd54bfd5f374161f79"
    ),
    "HarmonyOS_Sans_SC_Black.ttf": (
        "7342bf79a64e95eaaa2577dddea1948f29b63e61555b415fa0a34d4386fcaaae"
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "font_dir",
        nargs="?",
        default=str(Path(__file__).resolve().parents[1] / "src" / "ui" / "fonts"),
        help="directory containing the two TTF files",
    )
    args = parser.parse_args()

    font_dir = Path(args.font_dir)
    failed = False
    for name, expected in EXPECTED.items():
        path = font_dir / name
        if not path.is_file():
            print(f"MISSING  {name}")
            failed = True
            continue
        actual = sha256(path)
        status = "OK      " if actual == expected else "MISMATCH"
        print(f"{status}  {name}  {actual}")
        if actual != expected:
            print(f"         expected: {expected}")
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
