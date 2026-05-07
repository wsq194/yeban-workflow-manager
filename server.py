from pathlib import Path
from aiohttp import web
from .workflow_manager import WorkflowManager
from .web_api_handler import WorkflowManagerAPI


def setup_web_routes(app):
    """设置 Web API 路由"""
    try:
        comfyui_path = Path(__file__).parent.parent.parent
        manager = WorkflowManager(str(comfyui_path / "yeban-workflows"))
        api = WorkflowManagerAPI(manager)

        routes = [
            ("POST", "/api/yeban-wm/list",                api.list_workflows),
            ("POST", "/api/yeban-wm/save",                api.save_workflow),
            ("POST", "/api/yeban-wm/load",                api.load_workflow),
            ("POST", "/api/yeban-wm/delete",              api.delete_workflow),
            ("POST", "/api/yeban-wm/rename",              api.rename_workflow),
            ("POST", "/api/yeban-wm/move",                api.move_workflow),
            ("POST", "/api/yeban-wm/copy",                api.copy_workflow),
            ("POST", "/api/yeban-wm/create-group",        api.create_group),
            ("POST", "/api/yeban-wm/delete-group",        api.delete_group),
            ("POST", "/api/yeban-wm/rename-group",        api.rename_group),
            ("POST", "/api/yeban-wm/save-thumbnail",      api.save_thumbnail),
            ("GET",  "/api/yeban-wm/thumbnail/{workflow_id}", api.get_thumbnail),
            ("POST", "/api/yeban-wm/versions/list",       api.list_versions),
            ("POST", "/api/yeban-wm/versions/restore",    api.restore_version),
            ("POST", "/api/yeban-wm/search",              api.search_workflows),
            ("POST", "/api/yeban-wm/toggle-star",         api.toggle_star),
            ("POST", "/api/yeban-wm/update-tags",         api.update_tags),
            ("POST", "/api/yeban-wm/backup",              api.backup_workflow),
            ("POST", "/api/yeban-wm/import",              api.import_workflow),
        ]

        for method, path, handler in routes:
            app.router.add_route(method, path, handler)

        web_dir = Path(__file__).parent / "web"
        app.router.add_static("/yeban-wm-static/", path=web_dir, name="yeban-wm-static")
        
        print("[yeban-WM] ✓ Web routes setup complete")
    except Exception as e:
        print(f"[yeban-WM] ✗ Failed to setup web routes: {e}")
        raise