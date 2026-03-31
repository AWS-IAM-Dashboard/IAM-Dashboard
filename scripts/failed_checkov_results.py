import argparse
import json
import sys


def load_checkov_json(path):
    """Load Checkov JSON and normalize it into a list of section dictionaries."""
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise SystemExit(f"Could not open file: {path}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}")

    # Unwrap if JSON was stored as a JSON string
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid nested JSON string in {path}: {exc}")

    if isinstance(data, dict):
        return [data]
    if isinstance(data, list):
        return [entry for entry in data if isinstance(entry, dict)]

    raise SystemExit(f"Unsupported JSON structure in {path}: expected object or list.")


def index_sections(sections):
    """Build a map of check_type -> section (first seen section wins)."""
    by_type = {}
    for section in sections:
        check_type = section.get("check_type")
        if isinstance(check_type, str) and check_type not in by_type:
            by_type[check_type] = section
    return by_type


def to_text(value):
    """Convert a field value to printable text."""
    if value is None:
        return ""
    return str(value)


def md_cell(value):
    """Normalize markdown table cell text so row formatting stays valid."""
    text = to_text(value)
    text = text.replace("|", r"\|")
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")
    return text


def section_data(check_type, section):
    """Extract summary and failed checks for a section."""
    results = section.get("results") or {}
    failed = results.get("failed_checks") or []
    summary = section.get("summary") or {}
    return {
        "check_type": check_type,
        "summary": summary,
        "failed": failed,
    }


def build_markdown(path, section_reports, missing_sections):
    """Build a markdown report with one section per check type."""
    lines = [
        "# Checkov Results",
        "",
        f"Source: `{path}`",
        "",
    ]

    for report in section_reports:
        check_type = report["check_type"]
        summary = report["summary"]
        failed = report["failed"]
        lines.extend(
            [
                f"## {check_type}",
                "",
                f"- Checkov version: {md_cell(summary.get('checkov_version'))}",
                f"- Passed: {md_cell(summary.get('passed'))}",
                f"- Failed: {md_cell(summary.get('failed'))}",
                f"- Skipped: {md_cell(summary.get('skipped'))}",
                f"- Parsing errors: {md_cell(summary.get('parsing_errors'))}",
                f"- Resources: {md_cell(summary.get('resource_count'))}",
                "",
                "| Check ID | File Path | Check Name |",
                "| --- | --- | --- |",
            ]
        )
        if not failed:
            lines.append("| No failed checks | - | - |")
        else:
            for failed_check in failed:
                lines.append(
                    f"| {md_cell(failed_check.get('check_id'))} | "
                    f"{md_cell(failed_check.get('file_path'))} | "
                    f"{md_cell(failed_check.get('check_name'))} |"
                )
        lines.append("")

    if missing_sections:
        lines.append("## Missing Sections")
        lines.append("")
        for check_type in missing_sections:
            lines.append(f"- Section not found: `{md_cell(check_type)}`")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main():
    """Parse CLI args, write markdown report, and return an exit code."""
    parser = argparse.ArgumentParser(
        description="Parse failed Checkov checks for terraform/dockerfile from a Checkov JSON report."
    )
    parser.add_argument(
        "--path",
        default="checkov-results.json",
        help="Path to Checkov JSON report (default: checkov-results.json).",
    )
    parser.add_argument(
        "--check-type",
        choices=["terraform", "dockerfile", "all"],
        default="all",
        help="Section to report: terraform, dockerfile, or all (default: all).",
    )
    parser.add_argument(
        "--output",
        default="checkov-results.md",
        help="Path to markdown output report (default: checkov-results.md).",
    )
    args = parser.parse_args()

    sections = load_checkov_json(args.path)
    sections_by_type = index_sections(sections)

    targets = ["terraform", "dockerfile"] if args.check_type == "all" else [args.check_type]

    missing = []
    found_any = False
    section_reports = []
    failed_counts = {}

    for target in targets:
        section = sections_by_type.get(target)
        if not section:
            missing.append(target)
            continue
        found_any = True
        report = section_data(target, section)
        section_reports.append(report)
        failed_counts[target] = len(report["failed"])

    markdown = build_markdown(args.path, section_reports, missing if args.check_type == "all" else [])
    try:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(markdown)
    except OSError as exc:
        print(f"Could not write markdown report to {args.output}: {exc}", file=sys.stderr)
        return 1

    requested = ", ".join(targets)
    written = len(section_reports)
    counts = ", ".join(f"{k}={v}" for k, v in failed_counts.items()) if failed_counts else "none"
    print(f"Requested: {requested}")
    print(f"Sections written: {written}")
    print(f"Failed checks: {counts}")
    print(f"Markdown report: {args.output}")

    if args.check_type == "all":
        for target in missing:
            print(f"Section not found: {target}", file=sys.stderr)
        if not found_any:
            return 1
        return 0

    if missing:
        print(f"Could not find {args.check_type} section in the JSON output.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
