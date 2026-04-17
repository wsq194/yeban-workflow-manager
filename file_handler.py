import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime


MAX_VERSIONS = 20


class FileHandler:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.workflows_dir  = self.base_path / "workflows"
        self.thumbnails_dir = self.base_path / "thumbnails"
        self.backups_dir    = self.base_path / "backups"
        self.versions_dir   = self.base_path / "versions"
        self.metadata_file  = self.base_path / "metadata.json"
        self._init_directories()
        self._init_metadata()

    def _init_directories(self):
        for d in [self.workflows_dir, self.thumbnails_dir,
                  self.backups_dir, self.versions_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def _init_metadata(self):
        if not self.metadata_file.exists():
            self._write_metadata({"groups": {}, "workflows": {}})

    def _read_metadata(self):
        try:
            return json.loads(self.metadata_file.read_text(encoding="utf-8"))
        except Exception:
            return {"groups": {}, "workflows": {}}

    def _write_metadata(self, data):
        self.metadata_file.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # ── groups ────────────────────────────────────────────────────────────────

    def create_group(self, group_name, parent_id=None):
        meta = self._read_metadata()
        group_id = str(uuid.uuid4())
        meta["groups"][group_id] = {
            "id": group_id,
            "name": group_name,
            "parent": parent_id or None,
            "created_at": datetime.now().isoformat(),
        }
        self._write_metadata(meta)
        return group_id

    def delete_group(self, group_id):
        meta = self._read_metadata()
        if group_id not in meta["groups"]:
            return False
        # 子分组提升到根
        for gid in meta["groups"]:
            if meta["groups"][gid].get("parent") == group_id:
                meta["groups"][gid]["parent"] = None
        del meta["groups"][group_id]
        self._write_metadata(meta)
        return True

    def rename_group(self, group_id, new_name):
        meta = self._read_metadata()
        if group_id not in meta["groups"]:
            return None
        meta["groups"][group_id]["name"] = new_name
        self._write_metadata(meta)
        return group_id

    # ── workflows ─────────────────────────────────────────────────────────────

    def save_workflow(self, workflow_data, workflow_name, group_id=None):
        meta = self._read_metadata()

        # 同名同分组则更新
        existing_id = None
        for wid, wf in meta["workflows"].items():
            if wf["name"] == workflow_name and wf.get("group") == group_id:
                existing_id = wid
                break

        wf_id = existing_id or str(uuid.uuid4())
        wf_file = self.workflows_dir / f"{wf_id}.json"
        wf_file.write_text(
            json.dumps(workflow_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        now = datetime.now().isoformat()
        if existing_id:
            meta["workflows"][wf_id].update({
                "name": workflow_name,
                "group": group_id,
                "modified_at": now,
                "size": len(json.dumps(workflow_data)),
            })
        else:
            meta["workflows"][wf_id] = {
                "id": wf_id,
                "name": workflow_name,
                "group": group_id,
                "created_at": now,
                "modified_at": now,
                "size": len(json.dumps(workflow_data)),
                "tags": [],
                "starred": False,
            }

        self._write_metadata(meta)
        return wf_id

    def load_workflow(self, workflow_id):
        wf_file = self.workflows_dir / f"{workflow_id}.json"
        if wf_file.exists():
            return json.loads(wf_file.read_text(encoding="utf-8"))
        return None

    def delete_workflow(self, workflow_id):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        wf_file = self.workflows_dir / f"{workflow_id}.json"
        if wf_file.exists():
            wf_file.unlink()
        # 清理缩略图
        thumb = self.thumbnails_dir / f"{workflow_id}.png"
        if thumb.exists():
            thumb.unlink()
        del meta["workflows"][workflow_id]
        self._write_metadata(meta)
        return True

    def rename_workflow(self, workflow_id, new_name):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        meta["workflows"][workflow_id]["name"] = new_name
        meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
        self._write_metadata(meta)
        return workflow_id

    def move_workflow(self, workflow_id, target_group_id):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        meta["workflows"][workflow_id]["group"] = target_group_id or None
        meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
        self._write_metadata(meta)
        return workflow_id

    def copy_workflow(self, workflow_id, target_group_id, new_name=None):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        workflow_data = self.load_workflow(workflow_id)
        if workflow_data is None:
            return None
        name = new_name or f"{meta['workflows'][workflow_id]['name']}_copy"
        return self.save_workflow(workflow_data, name, target_group_id)

    # ── thumbnail ─────────────────────────────────────────────────────────────

    def save_thumbnail(self, workflow_id, data_url):
        """data_url: base64 PNG string from canvas.toDataURL()"""
        import base64, re
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        # 去掉 data:image/png;base64, 前缀
        b64 = re.sub(r"^data:image/\w+;base64,", "", data_url)
        thumb_file = self.thumbnails_dir / f"{workflow_id}.png"
        thumb_file.write_bytes(base64.b64decode(b64))
        meta["workflows"][workflow_id]["has_thumbnail"] = True
        self._write_metadata(meta)
        return True

    def get_thumbnail_path(self, workflow_id):
        thumb = self.thumbnails_dir / f"{workflow_id}.png"
        return thumb if thumb.exists() else None

    # ── version history ───────────────────────────────────────────────────────

    def save_version(self, workflow_id):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        workflow_data = self.load_workflow(workflow_id)
        if workflow_data is None:
            return None

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        ver_file = self.versions_dir / f"{workflow_id}_{ts}.json"
        ver_file.write_text(
            json.dumps(workflow_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

        # 超出 MAX_VERSIONS 则删最旧的
        all_versions = sorted(
            self.versions_dir.glob(f"{workflow_id}_*.json"),
            key=lambda f: f.stat().st_mtime
        )
        while len(all_versions) > MAX_VERSIONS:
            all_versions.pop(0).unlink()

        return ver_file.name

    def list_versions(self, workflow_id):
        files = sorted(
            self.versions_dir.glob(f"{workflow_id}_*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
        return [f.name for f in files]

    def restore_version(self, workflow_id, version_filename):
        ver_file = self.versions_dir / version_filename
        if not ver_file.exists():
            return False
        # 先把当前版本存一个快照
        self.save_version(workflow_id)
        workflow_data = json.loads(ver_file.read_text(encoding="utf-8"))
        wf_file = self.workflows_dir / f"{workflow_id}.json"
        wf_file.write_text(
            json.dumps(workflow_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        meta = self._read_metadata()
        meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
        self._write_metadata(meta)
        return True

    # ── search ────────────────────────────────────────────────────────────────

    def search_workflows(self, query):
        meta = self._read_metadata()
        q = query.lower()
        results = []
        for wf_id, wf in meta["workflows"].items():
            if q in wf["name"].lower() or any(q in t.lower() for t in wf.get("tags", [])):
                results.append(wf_id)
        return results

    # ── misc ──────────────────────────────────────────────────────────────────

    def get_all_workflows(self):
        return self._read_metadata()["workflows"]

    def get_all_groups(self):
        return self._read_metadata()["groups"]

    def backup_workflow(self, workflow_id):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        workflow_data = self.load_workflow(workflow_id)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = meta["workflows"][workflow_id]["name"]
        backup_file = self.backups_dir / f"{name}_{ts}.json"
        backup_file.write_text(
            json.dumps(workflow_data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        return str(backup_file)

    def import_workflow(self, import_path, workflow_name, group_id=None):
        try:
            workflow_data = json.loads(Path(import_path).read_text(encoding="utf-8"))
            return self.save_workflow(workflow_data, workflow_name, group_id)
        except Exception:
            return None

    def toggle_star(self, workflow_id):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        meta["workflows"][workflow_id]["starred"] = not meta["workflows"][workflow_id]["starred"]
        self._write_metadata(meta)
        return meta["workflows"][workflow_id]["starred"]

    def update_tags(self, workflow_id, tags):
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        meta["workflows"][workflow_id]["tags"] = list(set(tags))
        self._write_metadata(meta)
        return True