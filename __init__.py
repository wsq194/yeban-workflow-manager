from pathlib import Path

WEB_DIRECTORY = str(Path(__file__).parent / "web")

from .nodes import WorkflowManagerNode
from .server import setup_web_routes

NODE_CLASS_MAPPINGS = {"WorkflowManager": WorkflowManagerNode}
NODE_DISPLAY_NAME_MAPPINGS = {"WorkflowManager": "Workflow Manager"}

try:
    from server import PromptServer
    setup_web_routes(PromptServer.instance.app)
    print("[yeban-WorkflowManager] Routes registered successfully")
except Exception as e:
    print(f"[yeban-WorkflowManager] Failed to register routes: {e}")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
