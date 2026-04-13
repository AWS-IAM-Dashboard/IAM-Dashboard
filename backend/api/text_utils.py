"""
text_utils.py — shared text-processing helpers for backend API modules.
"""


def strip_code_fences(text: str) -> str:
    """
    Remove accidental markdown code fences from model output.

    Claude occasionally wraps JSON in ```json ... ``` or ``` ... ``` blocks
    despite being instructed not to. Strip the opening fence line and any
    closing fence lines so the caller gets clean JSON.
    """
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    return "\n".join(
        line for line in lines[1:]
        if not line.strip().startswith("```")
    ).strip()
