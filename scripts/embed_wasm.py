#!/usr/bin/env python3
"""Writes vendor/sql-wasm-embedded.js from vendor/sql-wasm.wasm. Run after updating sql.js."""
import base64
from pathlib import Path
root = Path(__file__).resolve().parent.parent
data = (root / "vendor/sql-wasm.wasm").read_bytes()
(root / "vendor/sql-wasm-embedded.js").write_text(
    "// sql-wasm.wasm as text (base64), generated from vendor/sql-wasm.wasm. Last resort for devices where the\n"
    "// .wasm file itself cannot be fetched (seen in the app installed on iOS): it travels like any other script.\n"
    "// Regenerate when sql.js is updated:  python3 scripts/embed_wasm.py\n"
    f'export default "{base64.b64encode(data).decode()}";\n', encoding="utf-8")
print("wrote vendor/sql-wasm-embedded.js")
