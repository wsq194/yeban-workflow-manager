import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime
from threading import Lock
import re


class FileHandler:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.workflows_dir = self.base_path / "workflows"
        self.thumbnails_dir = self.base_path / "thumbnails"
        self.backups_dir = self.base_path / "backups"
        self.versions_dir = self.base_path / "versions"
        self.metadata_file = self.base_path / "metadata.json"
        
        # 线程锁，保证并发安全
        self._metadata_lock = Lock()
        
        self._init_directories()
        self._init_metadata()

    def _init_directories(self):
        """初始化所需目录"""
        for d in [self.workflows_dir, self.thumbnails_dir,
                  self.backups_dir, self.versions_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def _init_metadata(self):
        """初始化元数据文件"""
        if not self.metadata_file.exists():
            self._write_metadata({"groups": {}, "workflows": {}})

    def _read_metadata(self):
        """线程安全地读取元数据"""
        try:
            with self._metadata_lock:
                if not self.metadata_file.exists():
                    return {"groups": {}, "workflows": {}}
                return json.loads(self.metadata_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[yeban-WM] Error reading metadata: {e}")
            return {"groups": {}, "workflows": {}}

    def _write_metadata(self, data):
        """线程安全地写入元数据"""
        try:
            with self._metadata_lock:
                # 先写到临时文件，再原子性重命名
                temp_file = self.metadata_file.with_suffix('.tmp')
                temp_file.write_text(
                    json.dumps(data, indent=2, ensure_ascii=False),
                    encoding="utf-8"
                )
                temp_file.replace(self.metadata_file)
        except Exception as e:
            print(f"[yeban-WM] Error writing metadata: {e}")
            raise

    def _sanitize_filename(self, filename):
        """
        将文件名中的特殊字符替换为下划线
        保留中文字符和常见符号
        """
        # 替换不安全的字符
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # 移除前后空格
        filename = filename.strip()
        # 如果为空，使用默认名称
        if not filename:
            filename = "untitled"
        return filename

    # ── groups ────────────────────────────────────────────────────────────────

    def create_group(self, group_name, parent_id=None):
        """创建分组"""
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
        """删除分组，子分组提升到根"""
        meta = self._read_metadata()
        if group_id not in meta["groups"]:
            return False
        
        # 子分组提升到根
        for gid in list(meta["groups"].keys()):
            if meta["groups"][gid].get("parent") == group_id:
                meta["groups"][gid]["parent"] = None
        
        del meta["groups"][group_id]
        self._write_metadata(meta)
        return True

    def rename_group(self, group_id, new_name):
        """重命名分组"""
        meta = self._read_metadata()
        if group_id not in meta["groups"]:
            return None
        meta["groups"][group_id]["name"] = new_name
        self._write_metadata(meta)
        return group_id

    # ── workflows ─────────────────────────────────────────────────────────────

    def save_workflow(self, workflow_data, workflow_name, group_id=None):
        """
        保存工作流
        如果同名同分组的工作流已存在，则覆盖；否则创建新的
        文件名使用工作流名称而不是UUID
        """
        meta = self._read_metadata()

        # 查找是否已存在同名同分组的工作流
        existing_id = None
        for wid, wf in meta["workflows"].items():
            if wf["name"] == workflow_name and wf.get("group") == group_id:
                existing_id = wid
                break

        # 如果是新工作流，生成 UUID 用作 ID
        # 但文件名改为使用工作流名称
        wf_id = existing_id or str(uuid.uuid4())
        
        # 创建安全的文件名（移除特殊字符）
        safe_filename = self._sanitize_filename(workflow_name)
        wf_file = self.workflows_dir / f"{safe_filename}.json"
        
        try:
            # 先写到临时文件，再原子性重命名
            temp_file = wf_file.with_suffix('.tmp')
            temp_file.write_text(
                json.dumps(workflow_data, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            temp_file.replace(wf_file)
        except Exception as e:
            print(f"[yeban-WM] Failed to write workflow file: {e}")
            raise

        now = datetime.now().isoformat()
        
        if existing_id:
            # 覆盖现有工作流
            meta["workflows"][wf_id].update({
                "name": workflow_name,
                "group": group_id,
                "modified_at": now,
                "size": len(json.dumps(workflow_data)),
            })
        else:
            # 创建新工作流
            meta["workflows"][wf_id] = {
                "id": wf_id,
                "name": workflow_name,
                "group": group_id,
                "created_at": now,
                "modified_at": now,
                "size": len(json.dumps(workflow_data)),
                "tags": [],
                "starred": False,
                "has_thumbnail": False,
            }

        self._write_metadata(meta)
        return wf_id

    def load_workflow(self, workflow_id):
        """加载工作流数据"""
        meta = self._read_metadata()
        
        # 从元数据中获取工作流名称
        if workflow_id not in meta["workflows"]:
            return None
        
        workflow_name = meta["workflows"][workflow_id]["name"]
        safe_filename = self._sanitize_filename(workflow_name)
        wf_file = self.workflows_dir / f"{safe_filename}.json"
        
        if not wf_file.exists():
            return None
        try:
            return json.loads(wf_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[yeban-WM] Failed to load workflow: {e}")
            return None

    def delete_workflow(self, workflow_id):
        """删除工作流及其相关文件"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        
        # 根据工作流名称找到文件
        workflow_name = meta["workflows"][workflow_id]["name"]
        safe_filename = self._sanitize_filename(workflow_name)
        wf_file = self.workflows_dir / f"{safe_filename}.json"
        
        if wf_file.exists():
            try:
                wf_file.unlink()
            except Exception as e:
                print(f"[yeban-WM] Failed to delete workflow file: {e}")

        # 删除缩略图
        thumb = self.thumbnails_dir / f"{workflow_id}.png"
        if thumb.exists():
            try:
                thumb.unlink()
            except Exception as e:
                print(f"[yeban-WM] Failed to delete thumbnail: {e}")

        # 删除所有版本
        for ver_file in self.versions_dir.glob(f"{workflow_id}_*.json"):
            try:
                ver_file.unlink()
            except Exception as e:
                print(f"[yeban-WM] Failed to delete version: {e}")

        del meta["workflows"][workflow_id]
        self._write_metadata(meta)
        return True

    def rename_workflow(self, workflow_id, new_name):
        """重命名工作流"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        
        # 获取旧文件名
        old_name = meta["workflows"][workflow_id]["name"]
        old_safe_filename = self._sanitize_filename(old_name)
        old_wf_file = self.workflows_dir / f"{old_safe_filename}.json"
        
        # 生成新文件名
        new_safe_filename = self._sanitize_filename(new_name)
        new_wf_file = self.workflows_dir / f"{new_safe_filename}.json"
        
        # 如果文件存在，重命名文件
        if old_wf_file.exists() and old_wf_file != new_wf_file:
            try:
                old_wf_file.rename(new_wf_file)
            except Exception as e:
                print(f"[yeban-WM] Failed to rename workflow file: {e}")
        
        # 更新元数据
        meta["workflows"][workflow_id]["name"] = new_name
        meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
        self._write_metadata(meta)
        return workflow_id

    def move_workflow(self, workflow_id, target_group_id):
        """移动工作流到其他分组"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        meta["workflows"][workflow_id]["group"] = target_group_id or None
        meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
        self._write_metadata(meta)
        return workflow_id

    def copy_workflow(self, workflow_id, target_group_id, new_name=None):
        """复制工作流到目标分组"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        
        workflow_data = self.load_workflow(workflow_id)
        if workflow_data is None:
            return None
        
        original_name = meta["workflows"][workflow_id]["name"]
        name = new_name or f"{original_name}_copy"
        return self.save_workflow(workflow_data, name, target_group_id)

    # ── thumbnail ─────────────────────────────────────────────────────────────

    def save_thumbnail(self, workflow_id, data_url):
        """保存缩略图"""
        import base64
        
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        
        try:
            # 去掉 data:image/png;base64, 前缀
            b64 = re.sub(r"^data:image/\w+;base64,", "", data_url)
            thumb_file = self.thumbnails_dir / f"{workflow_id}.png"
            thumb_file.write_bytes(base64.b64decode(b64))
            
            meta["workflows"][workflow_id]["has_thumbnail"] = True
            self._write_metadata(meta)
            return True
        except Exception as e:
            print(f"[yeban-WM] Failed to save thumbnail: {e}")
            return False

    def get_thumbnail_path(self, workflow_id):
        """获取缩略图路径"""
        thumb = self.thumbnails_dir / f"{workflow_id}.png"
        return thumb if thumb.exists() else None

    # ── version history ───────────────────────────────────────────────────────

    def save_version(self, workflow_id, max_versions=20):
        """创建工作流版本快照"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        
        workflow_data = self.load_workflow(workflow_id)
        if workflow_data is None:
            return None

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        ver_file = self.versions_dir / f"{workflow_id}_{ts}.json"
        
        try:
            ver_file.write_text(
                json.dumps(workflow_data, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
        except Exception as e:
            print(f"[yeban-WM] Failed to save version: {e}")
            return None

        # 清理超出 max_versions 的旧版本
        self._cleanup_old_versions(workflow_id, max_versions)
        return ver_file.name

    def _cleanup_old_versions(self, workflow_id, max_versions):
        """清理超出限制的旧版本"""
        try:
            all_versions = sorted(
                self.versions_dir.glob(f"{workflow_id}_*.json"),
                key=lambda f: f.stat().st_mtime
            )
            
            while len(all_versions) > max_versions:
                old_file = all_versions.pop(0)
                try:
                    old_file.unlink()
                except Exception as e:
                    print(f"[yeban-WM] Failed to delete old version: {e}")
        except Exception as e:
            print(f"[yeban-WM] Failed to cleanup versions: {e}")

    def list_versions(self, workflow_id):
        """列出工作流的所有版本"""
        try:
            files = sorted(
                self.versions_dir.glob(f"{workflow_id}_*.json"),
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )
            return [f.name for f in files]
        except Exception as e:
            print(f"[yeban-WM] Failed to list versions: {e}")
            return []

    def restore_version(self, workflow_id, version_filename):
        """恢复到指定版本"""
        ver_file = self.versions_dir / version_filename
        if not ver_file.exists():
            return False
        
        try:
            # 先把当前版本存一个快照
            self.save_version(workflow_id)
            
            workflow_data = json.loads(ver_file.read_text(encoding="utf-8"))
            
            # 根据工作流名称生成文件路径
            meta = self._read_metadata()
            if workflow_id not in meta["workflows"]:
                return False
            
            workflow_name = meta["workflows"][workflow_id]["name"]
            safe_filename = self._sanitize_filename(workflow_name)
            wf_file = self.workflows_dir / f"{safe_filename}.json"
            
            wf_file.write_text(
                json.dumps(workflow_data, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            
            meta["workflows"][workflow_id]["modified_at"] = datetime.now().isoformat()
            self._write_metadata(meta)
            return True
        except Exception as e:
            print(f"[yeban-WM] Failed to restore version: {e}")
            return False

    # ── search ────────────────────────────────────────────────────────────────

    def search_workflows(self, query):
        """按名称或标签搜索工作流"""
        meta = self._read_metadata()
        q = query.lower()
        results = []
        
        for wf_id, wf in meta["workflows"].items():
            name_match = q in wf["name"].lower()
            tag_match = any(q in t.lower() for t in wf.get("tags", []))
            
            if name_match or tag_match:
                results.append(wf_id)
        
        return results

    # ── misc ──────────────────────────────────────────────────────────────────

    def get_all_workflows(self):
        """获取所有工作流元数据"""
        return self._read_metadata()["workflows"]

    def get_all_groups(self):
        """获取所有分组"""
        return self._read_metadata()["groups"]

    def backup_workflow(self, workflow_id):
        """备份工作流到 backups 目录"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        
        workflow_data = self.load_workflow(workflow_id)
        if workflow_data is None:
            return None
        
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = meta["workflows"][workflow_id]["name"]
        backup_file = self.backups_dir / f"{name}_{ts}.json"
        
        try:
            backup_file.write_text(
                json.dumps(workflow_data, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )
            return str(backup_file)
        except Exception as e:
            print(f"[yeban-WM] Failed to backup workflow: {e}")
            return None

    def import_workflow(self, import_path, workflow_name, group_id=None):
        """从文件导入工作流"""
        try:
            workflow_data = json.loads(Path(import_path).read_text(encoding="utf-8"))
            return self.save_workflow(workflow_data, workflow_name, group_id)
        except Exception as e:
            print(f"[yeban-WM] Failed to import workflow: {e}")
            return None

    def toggle_star(self, workflow_id):
        """切换工作流收藏状态"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return None
        
        meta["workflows"][workflow_id]["starred"] = not meta["workflows"][workflow_id].get("starred", False)
        self._write_metadata(meta)
        return meta["workflows"][workflow_id]["starred"]

    def update_tags(self, workflow_id, tags):
        """更新工作流标签"""
        meta = self._read_metadata()
        if workflow_id not in meta["workflows"]:
            return False
        
        # 去重并排序
        meta["workflows"][workflow_id]["tags"] = sorted(list(set(tags)))
        self._write_metadata(meta)
        return True