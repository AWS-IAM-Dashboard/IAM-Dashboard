import json

PATH = "checkov-results.json"

with open(PATH, "r", encoding="utf-8-sig") as f:
    data = json.load(f)

# Unwrap if JSON was stored as a string
if isinstance(data, str):
    data = json.loads(data)

# Normalize to terraform section dict
if isinstance(data, list):
    tf = next((x for x in data if isinstance(x, dict) and x.get("check_type") == "terraform"), None)
elif isinstance(data, dict):
    tf = data if data.get("check_type") == "terraform" else None
else:
    tf = None

if not tf:
    raise SystemExit("Could not find terraform section in the JSON output.")

failed = (tf.get("results") or {}).get("failed_checks") or []
summary = tf.get("summary") or {}

print(f"Checkov version: {summary.get('checkov_version')}")
print(f"Terraform summary: passed={summary.get('passed')} failed={summary.get('failed')} skipped={summary.get('skipped')} parsing_errors={summary.get('parsing_errors')} resources={summary.get('resource_count')}")
print(f"Terraform failed checks: {len(failed)}\n")

for f in failed:
    print(f"{f.get('check_id','')}\t{f.get('file_path','')}\t{f.get('check_name','')}")
