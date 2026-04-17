import json
from aiohttp import web
from pathlib import Path


def _ok(**kwargs):
    return web.json_response({"status": "success", **kwargs})

def _err(msg, status=500):
    return web.json_response({"status": "error", "message": msg}, status=status)


class WorkflowManagerAPI:
    def __init__(self, manager):
        self.manager = manager

    async def _body(self, request):
        try:
            return await request.json()
        except Exception:
            return {}

    # ── workflows ─────────────────────────────────────────────────────────────

    async def list_workflows(self, request):
        try:
            return _ok(
                workflows=self.manager.get_all_workflows(),
                groups=self.manager.get_all_groups()
            )
        except Exception as e:
            return _err(str(e))

    async def save_workflow(self, request):
        try:
            d = await self._body(request)
            wf_data = d.get("workflow_data")
            if isinstance(wf_data, str):
                wf_data = json.loads(wf_data)
            name     = d.get("workflow_name")
            group_id = d.get("group_id") or None
            if not name:
                return _err("workflow_name required", 400)

            from datetime import datetime
            now = datetime.now().strftime("%H:%M:%S")

            # 判断是自动保存还是手动保存（前端可以传 source 字段）
            source = d.get("source", "manual")

            # 保存前先快照
            for wid, wf in self.manager.get_all_workflows().items():
                if wf["name"] == name and wf.get("group") == group_id:
                    self.manager.save_version(wid)
                    print(f"[yeban-WM] [{now}] 📸 版本快照已创建: 「{name}」")
                    break

            wf_id = self.manager.save_workflow(wf_data, name, group_id)

            tag = "🔄 自动保存" if source == "auto" else "💾 手动保存"
            group_label = group_id or "根目录"
            print(f"[yeban-WM] [{now}] {tag} 「{name}」→ 分组: {group_label} | id: {wf_id[:8]}...")

            return _ok(workflow_id=wf_id)
        except Exception as e:
            print(f"[yeban-WM] ❌ 保存失败: {e}")
            return _err(str(e))

    async def load_workflow(self, request):
        try:
            d = await self._body(request)
            wf_id = d.get("workflow_id")
            if not wf_id:
                return _err("workflow_id required", 400)
            data = self.manager.load_workflow(wf_id)
            if data is None:
                return _err("Not found", 404)
            return _ok(data=data)
        except Exception as e:
            return _err(str(e))

    async def delete_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.delete_workflow(d.get("workflow_id"))
            return _ok() if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def rename_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.rename_workflow(d.get("workflow_id"), d.get("new_name"))
            return _ok(workflow_id=result) if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def move_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.move_workflow(d.get("workflow_id"), d.get("target_group_id") or None)
            return _ok(workflow_id=result) if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def copy_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.copy_workflow(
                d.get("workflow_id"),
                d.get("target_group_id") or None,
                d.get("new_name") or None
            )
            return _ok(workflow_id=result) if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    # ── groups ────────────────────────────────────────────────────────────────

    async def create_group(self, request):
        try:
            d = await self._body(request)
            name = d.get("name")
            if not name:
                return _err("name required", 400)
            group_id = self.manager.create_group(name, d.get("parent_group_id") or None)
            return _ok(group_id=group_id)
        except Exception as e:
            return _err(str(e))

    async def delete_group(self, request):
        try:
            d = await self._body(request)
            result = self.manager.delete_group(d.get("group_id"))
            return _ok() if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def rename_group(self, request):
        try:
            d = await self._body(request)
            result = self.manager.rename_group(d.get("group_id"), d.get("new_name"))
            return _ok(group_id=result) if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    # ── thumbnail ─────────────────────────────────────────────────────────────

    async def save_thumbnail(self, request):
        try:
            d = await self._body(request)
            result = self.manager.save_thumbnail(d.get("workflow_id"), d.get("data_url"))
            return _ok() if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def get_thumbnail(self, request):
        try:
            wf_id = request.match_info.get("workflow_id")
            path = self.manager.get_thumbnail_path(wf_id)
            if path is None:
                return web.Response(status=404)
            return web.FileResponse(path)
        except Exception as e:
            return _err(str(e))

    # ── versions ──────────────────────────────────────────────────────────────

    async def list_versions(self, request):
        try:
            d = await self._body(request)
            versions = self.manager.list_versions(d.get("workflow_id"))
            return _ok(versions=versions)
        except Exception as e:
            return _err(str(e))

    async def restore_version(self, request):
        try:
            d = await self._body(request)
            result = self.manager.restore_version(d.get("workflow_id"), d.get("version_filename"))
            return _ok() if result else _err("Version not found", 404)
        except Exception as e:
            return _err(str(e))

    # ── search / star / tags ──────────────────────────────────────────────────

    async def search_workflows(self, request):
        try:
            d = await self._body(request)
            results = self.manager.search_workflows(d.get("query", ""))
            return _ok(results=results)
        except Exception as e:
            return _err(str(e))

    async def toggle_star(self, request):
        try:
            d = await self._body(request)
            result = self.manager.toggle_star(d.get("workflow_id"))
            if result is None:
                return _err("Not found", 404)
            return _ok(starred=result)
        except Exception as e:
            return _err(str(e))

    async def update_tags(self, request):
        try:
            d = await self._body(request)
            tags = d.get("tags", [])
            result = self.manager.update_tags(d.get("workflow_id"), tags)
            return _ok() if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    # ── backup / import ───────────────────────────────────────────────────────

    async def backup_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.backup_workflow(d.get("workflow_id"))
            return _ok(backup_path=result) if result else _err("Not found", 404)
        except Exception as e:
            return _err(str(e))

    async def import_workflow(self, request):
        try:
            d = await self._body(request)
            result = self.manager.import_workflow(
                d.get("import_path"),
                d.get("workflow_name"),
                d.get("group_id") or None
            )
            return _ok(workflow_id=result) if result else _err("Import failed", 500)
        except Exception as e:
            return _err(str(e))
