import json
from pathlib import Path
from .workflow_manager import WorkflowManager


class WorkflowManagerNode:
    def __init__(self):
        comfyui_path = Path(__file__).resolve().parent.parent.parent
        try:
            self.manager = WorkflowManager(str(comfyui_path / "yeban-workflows"))
        except Exception as e:
            print(f"[yeban-WorkflowManager] Init failed: {e}")
            self.manager = None

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "action": (["save", "load", "delete", "list", "search",
                            "create_group", "delete_group", "rename_group",
                            "rename", "move", "copy", "backup",
                            "toggle_star", "update_tags",
                            "save_version", "list_versions"],),
            },
            "optional": {
                "workflow_id":   ("STRING", {"default": ""}),
                "workflow_name": ("STRING", {"default": ""}),
                "group_id":      ("STRING", {"default": ""}),
                "workflow_data": ("STRING", {"default": "{}"}),
                "new_name":      ("STRING", {"default": ""}),
                "target_group":  ("STRING", {"default": ""}),
                "query":         ("STRING", {"default": ""}),
                "tags":          ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("result",)
    FUNCTION = "execute"
    CATEGORY = "workflow"

    def execute(self, action, workflow_id="", workflow_name="", group_id="",
                workflow_data="{}", new_name="", target_group="", query="", tags=""):
        if self.manager is None:
            return (json.dumps({"status": "error", "message": "Manager not initialized"}),)

        wf_id  = workflow_id.strip() or None
        grp_id = group_id.strip() or None

        try:
            if action == "save":
                data = json.loads(workflow_data) if workflow_data else {}
                r = self.manager.save_workflow(data, workflow_name, grp_id)
                return (json.dumps({"status": "success", "workflow_id": r}),)

            elif action == "load":
                data = self.manager.load_workflow(wf_id)
                return (json.dumps({"status": "success", "data": data}),) if data else \
                       (json.dumps({"status": "error", "message": "Not found"}),)

            elif action == "delete":
                r = self.manager.delete_workflow(wf_id)
                return (json.dumps({"status": "success" if r else "error"}),)

            elif action == "list":
                return (json.dumps({
                    "status": "success",
                    "workflows": self.manager.get_all_workflows(),
                    "groups": self.manager.get_all_groups(),
                }),)

            elif action == "search":
                r = self.manager.search_workflows(query)
                return (json.dumps({"status": "success", "results": r}),)

            elif action == "create_group":
                r = self.manager.create_group(workflow_name, grp_id)
                return (json.dumps({"status": "success", "group_id": r}),)

            elif action == "delete_group":
                r = self.manager.delete_group(grp_id)
                return (json.dumps({"status": "success" if r else "error"}),)

            elif action == "rename_group":
                r = self.manager.rename_group(grp_id, new_name)
                return (json.dumps({"status": "success", "group_id": r} if r else {"status": "error"}),)

            elif action == "rename":
                r = self.manager.rename_workflow(wf_id, new_name)
                return (json.dumps({"status": "success", "workflow_id": r} if r else {"status": "error"}),)

            elif action == "move":
                r = self.manager.move_workflow(wf_id, target_group.strip() or None)
                return (json.dumps({"status": "success", "workflow_id": r} if r else {"status": "error"}),)

            elif action == "copy":
                r = self.manager.copy_workflow(wf_id, target_group.strip() or None, new_name or None)
                return (json.dumps({"status": "success", "workflow_id": r} if r else {"status": "error"}),)

            elif action == "backup":
                r = self.manager.backup_workflow(wf_id)
                return (json.dumps({"status": "success", "backup_path": r} if r else {"status": "error"}),)

            elif action == "toggle_star":
                r = self.manager.toggle_star(wf_id)
                return (json.dumps({"status": "success", "starred": r} if r is not None else {"status": "error"}),)

            elif action == "update_tags":
                tag_list = [t.strip() for t in tags.split(",") if t.strip()]
                r = self.manager.update_tags(wf_id, tag_list)
                return (json.dumps({"status": "success" if r else "error"}),)

            elif action == "save_version":
                r = self.manager.save_version(wf_id)
                return (json.dumps({"status": "success", "version_file": r} if r else {"status": "error"}),)

            elif action == "list_versions":
                r = self.manager.list_versions(wf_id)
                return (json.dumps({"status": "success", "versions": r}),)

            else:
                return (json.dumps({"status": "error", "message": "Unknown action"}),)

        except Exception as e:
            return (json.dumps({"status": "error", "message": str(e)}),)
