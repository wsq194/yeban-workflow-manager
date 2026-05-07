from pathlib import Path
import threading
import atexit

WEB_DIRECTORY = str(Path(__file__).parent / "web")

from .nodes import WorkflowManagerNode
from .server import setup_web_routes

NODE_CLASS_MAPPINGS = {"WorkflowManager": WorkflowManagerNode}
NODE_DISPLAY_NAME_MAPPINGS = {"WorkflowManager": "Workflow Manager"}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

# 延迟初始化路由
_route_initialized = False
_route_lock = threading.Lock()


def _try_setup_routes():
    """尝试设置 Web 路由（延迟初始化）"""
    global _route_initialized
    
    if _route_initialized:
        return True
    
    with _route_lock:
        # double-check lock pattern
        if _route_initialized:
            return True
        
        try:
            from server import PromptServer
            
            if PromptServer.instance is None:
                print("[yeban-WorkflowManager] ⚠ PromptServer.instance is None, will retry later")
                return False
            
            if not hasattr(PromptServer.instance, 'app'):
                print("[yeban-WorkflowManager] ⚠ PromptServer.instance.app not available")
                return False
            
            setup_web_routes(PromptServer.instance.app)
            _route_initialized = True
            print("[yeban-WorkflowManager] ✓ Routes registered successfully")
            return True
            
        except ImportError as e:
            print(f"[yeban-WorkflowManager] ⚠ PromptServer not available: {e}")
            return False
        except Exception as e:
            print(f"[yeban-WorkflowManager] ✗ Failed to register routes: {e}")
            import traceback
            traceback.print_exc()
            return False


# 尝试立即初始化
_try_setup_routes()


# 注册一个延迟初始化的回调
def _delayed_setup():
    """延迟初始化回调"""
    if not _route_initialized:
        _try_setup_routes()


# 在模块加载完成后尝试一次
import threading
timer = threading.Timer(0.5, _delayed_setup)
timer.daemon = True
timer.start()


# 清理
def _cleanup():
    timer.cancel()

atexit.register(_cleanup)