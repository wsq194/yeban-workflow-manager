import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path


VERSION_RE = re.compile(r"^(?P<workflow_id>.+)_(?P<date>\d{8})_(?P<time>\d{6})\.json$")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def iso_from_mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime).isoformat()


def valid_workflow(path: Path) -> bool:
    try:
        data = load_json(path)
    except Exception:
        return False
    return isinstance(data, dict) and isinstance(data.get("nodes"), list)


def latest_versions(versions_dir: Path):
    groups = {}
    for path in versions_dir.glob("*.json"):
        match = VERSION_RE.match(path.name)
        if not match:
            continue
        if not valid_workflow(path):
            continue
        workflow_id = match.group("workflow_id")
        groups.setdefault(workflow_id, []).append(path)
    return {
        workflow_id: max(paths, key=lambda p: p.stat().st_mtime)
        for workflow_id, paths in groups.items()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("base", type=Path, help="Path to ComfyUI/yeban-workflows")
    parser.add_argument("--apply", action="store_true", help="Write recovered metadata and missing workflow files")
    args = parser.parse_args()

    base = args.base
    workflows_dir = base / "workflows"
    versions_dir = base / "versions"
    thumbnails_dir = base / "thumbnails"
    metadata_file = base / "metadata.json"

    if not workflows_dir.exists() or not versions_dir.exists():
        raise SystemExit(f"Missing yeban-workflows subdirectories under {base}")

    existing_meta = {"groups": {}, "workflows": {}}
    if metadata_file.exists():
        try:
            existing_meta = load_json(metadata_file)
        except Exception:
            pass

    current_files = {
        path.stem: path
        for path in workflows_dir.glob("*.json")
        if valid_workflow(path)
    }
    latest_by_id = latest_versions(versions_dir)

    recovered = {}
    copied = []
    recovered_names = set()

    # Prefer IDs from version history because thumbnails and versions are keyed by workflow ID.
    for workflow_id, latest in sorted(latest_by_id.items()):
        matching_file = None
        name = workflow_id

        for stem, path in current_files.items():
            if stem == workflow_id or stem.startswith(f"{workflow_id}_"):
                matching_file = path
                name = stem
                break

        if matching_file is None:
            # Recover friendly names when a current workflow file matches the newest snapshot exactly.
            latest_size = latest.stat().st_size
            for stem, path in current_files.items():
                if path.stat().st_size == latest_size:
                    matching_file = path
                    name = stem
                    break

        if matching_file is None:
            matching_file = workflows_dir / f"{workflow_id}.json"
            name = workflow_id
            copied.append((latest, matching_file))

        modified_at = iso_from_mtime(matching_file if matching_file.exists() else latest)
        created_at = iso_from_mtime(min([latest, matching_file] if matching_file.exists() else [latest], key=lambda p: p.stat().st_mtime))
        recovered[workflow_id] = {
            "id": workflow_id,
            "name": name,
            "group": None,
            "created_at": created_at,
            "modified_at": modified_at,
            "size": matching_file.stat().st_size if matching_file.exists() else latest.stat().st_size,
            "tags": [],
            "starred": False,
            "has_thumbnail": (thumbnails_dir / f"{workflow_id}.png").exists(),
        }
        recovered_names.add(name)

    # Keep any current metadata entries that point at valid files but have no version history.
    for workflow_id, item in existing_meta.get("workflows", {}).items():
        if workflow_id in recovered:
            continue
        name = item.get("name")
        if name in recovered_names:
            continue
        if name and (workflows_dir / f"{name}.json").exists():
            recovered[workflow_id] = item
            recovered_names.add(name)

    new_meta = {
        "groups": existing_meta.get("groups", {}),
        "workflows": recovered,
    }

    print(f"Base: {base}")
    print(f"Recovered workflows: {len(recovered)}")
    for workflow_id, item in recovered.items():
        print(f"- {workflow_id} | {item['name']} | thumbnail={item['has_thumbnail']} | size={item['size']}")
    if copied:
        print("Missing workflow files to copy from latest versions:")
        for src, dst in copied:
            print(f"- {src.name} -> {dst.name}")

    if not args.apply:
        print("Dry run only. Pass --apply to write changes.")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = base / f"_recovery_backup_{stamp}"
    backup_dir.mkdir(parents=True, exist_ok=False)
    if metadata_file.exists():
        shutil.copy2(metadata_file, backup_dir / "metadata.json")
    for src, dst in copied:
        shutil.copy2(src, dst)
    dump_json(metadata_file, new_meta)
    print(f"Backup written: {backup_dir}")
    print(f"Metadata written: {metadata_file}")


if __name__ == "__main__":
    main()
