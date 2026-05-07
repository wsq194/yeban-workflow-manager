import json
from aiohttp import web
from pathlib import Path
from datetime import datetime


def _ok(**kwargs):
    """返回成功响应"""
    return web.json_response({"status": "success", **kwargs})


def _err(msg, status=400):
    """返回错误响应"""
    return web.json_response({"status": "error", "message": msg}, status=status)


class WorkflowManagerAPI:
    def __init__(self, manager):
        self.manager = manager

    async def _body(self, request):
        """安全地获取请求体"""
        try:
            return await request.json()
        except Exception:
            return {}

    # ── workflows ─────────────────────────────────────────────────────────────

    async def list_workflows(self, request):
        """列出所有工作流和分组"""
        try:
            return _ok(
                workflows=self.manager.get_all_workflows(),
                groups=self.manager.get_all_groups()
            )
        except Exception as e:
            return _err(str(e), 500)

    async def save_workflow(self, request):
        """保存工作流（自动保存和手动保存统一接口）"""
        try:
            d = await self._body(request)
            wf_data = d.get("workflow_data")
            
            if isinstance(wf_data, str):
                wf_data = json.loads(wf_data)
            
            name = d.get("workflow_name")
            group_id = d.get("group_id") or None
            
            if not name:
                return _err("workflow_name required", 400)

            now = datetime.now().strftime("%H:%M:%S")

            # 检测是否已存在同名同分组的工作流
            existing_id = None
            for wid, wf in self.manager.get_all_workflows().items():
                if wf["name"] == name and wf.get("group") == group_id:
                    existing_id = wid
                    break

            # 如果存在，先创建版本快照
            if existing_id:
                self.manager.save_version(existing_id)
                print(f"[yeban-WM] [{now}] 📸 版本快照已创建: 「{name}」")

            wf_id = self.manager.save_workflow(wf_data, name, group_id)
            group_label = group_id or "根目录"
            
            if existing_id:
                print(f"[yeban-WM] [{now}] ⚡ 已覆盖 「{name}」→ {group_label} | id: {wf_id[:8]}...")
            else:
                print(f"[yeban-WM] [{now}] ✓ 已保存 「{name}」→ {group_label} | id: {wf_id[:8]}...")

            return _ok(workflow_id=wf_id)
        except Exception as e:
            print(f"[yeban-WM] ❌ 保存失败: {e}")
            return _err(str(e), 500)

    async def load_workflow(self, request):
        """加载工作流"""
        try:
            d = await self._body(request)
            wf_id = d.get("workflow_id")
            
            if not wf_id:
                return _err("workflow_id required", 400)
            
            data = self.manager.load_workflow(wf_id)
            if data is None:
                return _err("Workflow not found", 404)
            
            return _ok(data=data)
        except Exception as e:
            return _err(str(e), 500)

    async def delete_workflow(self, request):
        """删除工作流"""
        try:
            d = await self._body(request)
            result = self.manager.delete_workflow(d.get("workflow_id"))
            
            if result:
                return _ok()
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def rename_workflow(self, request):
        """重命名工作流"""
        try:
            d = await self._body(request)
            result = self.manager.rename_workflow(
                d.get("workflow_id"), 
                d.get("new_name")
            )
            
            if result:
                return _ok(workflow_id=result)
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def move_workflow(self, request):
        """移动工作流到其他分组"""
        try:
            d = await self._body(request)
            result = self.manager.move_workflow(
                d.get("workflow_id"), 
                d.get("target_group_id") or None
            )
            
            if result:
                return _ok(workflow_id=result)
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def copy_workflow(self, request):
        """复制工作流"""
        try:
            d = await self._body(request)
            result = self.manager.copy_workflow(
                d.get("workflow_id"),
                d.get("target_group_id") or None,
                d.get("new_name") or None
            )
            
            if result:
                return _ok(workflow_id=result)
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    # ── groups ────────────────────────────────────────────────────────────────

    async def create_group(self, request):
        """创建分组"""
        try:
            d = await self._body(request)
            name = d.get("name")
            
            if not name:
                return _err("name required", 400)
            
            group_id = self.manager.create_group(name, d.get("parent_group_id") or None)
            return _ok(group_id=group_id)
        except Exception as e:
            return _err(str(e), 500)

    async def delete_group(self, request):
        """删除分组"""
        try:
            d = await self._body(request)
            result = self.manager.delete_group(d.get("group_id"))
            
            if result:
                return _ok()
            else:
                return _err("Group not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def rename_group(self, request):
        """重命名分组"""
        try:
            d = await self._body(request)
            result = self.manager.rename_group(
                d.get("group_id"), 
                d.get("new_name")
            )
            
            if result:
                return _ok(group_id=result)
            else:
                return _err("Group not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    # ── thumbnail ─────────────────────────────────────────────────────────────

    async def save_thumbnail(self, request):
        """保存缩略图"""
        try:
            d = await self._body(request)
            result = self.manager.save_thumbnail(
                d.get("workflow_id"), 
                d.get("data_url")
            )
            
            if result:
                return _ok()
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def get_thumbnail(self, request):
        """获取缩略图"""
        try:
            wf_id = request.match_info.get("workflow_id")
            path = self.manager.get_thumbnail_path(wf_id)
            
            if path is None:
                return web.Response(status=404)
            
            return web.FileResponse(path)
        except Exception as e:
            return _err(str(e), 500)

    # ── versions ──────────────────────────────────────────────────────────────

    async def list_versions(self, request):
        """列出所有版本"""
        try:
            d = await self._body(request)
            versions = self.manager.list_versions(d.get("workflow_id"))
            return _ok(versions=versions)
        except Exception as e:
            return _err(str(e), 500)

    async def restore_version(self, request):
        """恢复到指定版本"""
        try:
            d = await self._body(request)
            result = self.manager.restore_version(
                d.get("workflow_id"), 
                d.get("version_filename")
            )
            
            if result:
                return _ok()
            else:
                return _err("Version not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    # ── search / star / tags ──────────────────────────────────────────────────

    async def search_workflows(self, request):
        """搜索工作流"""
        try:
            d = await self._body(request)
            results = self.manager.search_workflows(d.get("query", ""))
            return _ok(results=results)
        except Exception as e:
            return _err(str(e), 500)

    async def toggle_star(self, request):
        """切换收藏状态"""
        try:
            d = await self._body(request)
            result = self.manager.toggle_star(d.get("workflow_id"))
            
            if result is None:
                return _err("Workflow not found", 404)
            
            return _ok(starred=result)
        except Exception as e:
            return _err(str(e), 500)

    async def update_tags(self, request):
        """更新标签"""
        try:
            d = await self._body(request)
            tags = d.get("tags", [])
            result = self.manager.update_tags(d.get("workflow_id"), tags)
            
            if result:
                return _ok()
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    # ── backup / import ───────────────────────────────────────────────────────

    async def backup_workflow(self, request):
        """备份工作流"""
        try:
            d = await self._body(request)
            result = self.manager.backup_workflow(d.get("workflow_id"))
            
            if result:
                return _ok(backup_path=result)
            else:
                return _err("Workflow not found", 404)
        except Exception as e:
            return _err(str(e), 500)

    async def import_workflow(self, request):
        """导入工作流"""
        try:
            d = await self._body(request)
            result = self.manager.import_workflow(
                d.get("import_path"),
                d.get("workflow_name"),
                d.get("group_id") or None
            )
            
            if result:
                return _ok(workflow_id=result)
            else:
                return _err("Import failed", 500)
        except Exception as e:
            return _err(str(e), 500)