import argparse
import json
import sys


def load_gitleaks_json(path):
    """Load Gitleaks JSON from disk and normalize it into a list of finding dicts."""
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Could not open file: {path}", file=sys.stderr)
        return []
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON in {path}: {exc}", file=sys.stderr)
        return []

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError as exc:
            print(f"Invalid nested JSON string in {path}: {exc}", file=sys.stderr)
            return []

    if not isinstance(data, list):
        print(f"Unsupported JSON structure in {path}: expected top-level list.", file=sys.stderr)
        return []

    return [entry for entry in data if isinstance(entry, dict)]


def to_text(value):
    """Convert a field to a printable string, preserving empty values."""
    if value is None:
        return ""
    return str(value)


def md_cell(value):
    """Normalize markdown table cell text to keep table structure valid."""
    text = to_text(value)
    text = text.replace("|", r"\|")
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")
    return text


def build_markdown(path, findings):
    """Build markdown report content for Gitleaks findings."""
    lines = [
        "# Gitleaks Results",
        "",
        f"Source: `{path}`",
        "",
        "| Description | Start Line | Match | File Path |",
        "| --- | --- | --- | --- |",
    ]

    if not findings:
        lines.append("| No findings | - | - | - |")
        return "\n".join(lines) + "\n"

    for finding in findings:
        description = md_cell(finding.get("Description"))
        start_line = md_cell(finding.get("StartLine"))
        match = md_cell(finding.get("Match"))
        file_path = md_cell(finding.get("File"))
        lines.append(f"| {description} | {start_line} | {match} | {file_path} |")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Parse Gitleaks findings and write a markdown table report."
    )
    parser.add_argument(
        "--path",
        default="gitleaks-results.json",
        help="Path to Gitleaks JSON report (default: gitleaks-results.json).",
    )
    parser.add_argument(
        "--output",
        default="gitleaks-results.md",
        help="Path to markdown output report (default: gitleaks-results.md).",
    )
    args = parser.parse_args()

    findings = load_gitleaks_json(args.path)
    markdown = build_markdown(args.path, findings)

    try:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown)
    except OSError as exc:
        print(f"Could not write markdown report to {args.output}: {exc}", file=sys.stderr)
        return 0

    print(f"Findings: {len(findings)}")
    print(f"Markdown report: {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
