from .file_handler import FileHandler
import json
from pathlib import Path


class WorkflowManager:
    """工作流管理器 - 单例模式"""
    _instance = None
    _initialized = False

    def __new__(cls, base_path=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, base_path=None):
        # 防止重复初始化
        if self._initialized:
            return
        
        if base_path is None:
            raise ValueError("base_path required on first initialization")
        
        self.file_handler = FileHandler(base_path)
        self._load_config()
        WorkflowManager._initialized = True

    def _load_config(self):
        """从 config.json 加载配置"""
        try:
            config_file = Path(__file__).parent / "config.json"
            if config_file.exists():
                config = json.loads(config_file.read_text(encoding="utf-8"))
                self.auto_save_interval = config.get("auto_save_interval", 60)
                self.max_versions = config.get("max_versions", 20)
            else:
                self.auto_save_interval = 60
                self.max_versions = 20
            print(f"[yeban-WM] Config loaded: interval={self.auto_save_interval}s, max_versions={self.max_versions}")
        except Exception as e:
            print(f"[yeban-WM] Failed to load config: {e}")
            self.auto_save_interval = 60
            self.max_versions = 20

    @classmethod
    def reset(cls):
        """重置单例（用于测试或重载）"""
        cls._instance = None
        cls._initialized = False

    # ── groups ────────────────────────────────────────────────────────────────
    
    def create_group(self, name, parent_id=None):
        """创建分组"""
        if not name or not isinstance(name, str):
            raise ValueError("Group name must be non-empty string")
        name = name.strip()
        return self.file_handler.create_group(name, parent_id)

    def delete_group(self, group_id):
        """删除分组"""
        return self.file_handler.delete_group(group_id)

    def rename_group(self, group_id, new_name):
        """重命名分组"""
        if not new_name or not isinstance(new_name, str):
            raise ValueError("Group name must be non-empty string")
        new_name = new_name.strip()
        return self.file_handler.rename_group(group_id, new_name)

    # ── workflows ─────────────────────────────────────────────────────────────
    
    def save_workflow(self, data, name, group_id=None):
        """保存工作流"""
        if not name or not isinstance(name, str):
            raise ValueError("Workflow name must be non-empty string")
        name = name.strip()
        if not isinstance(data, dict):
            raise ValueError("Workflow data must be a dict")
        return self.file_handler.save_workflow(data, name, group_id)

    def load_workflow(self, wf_id):
        """加载工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.load_workflow(wf_id)

    def delete_workflow(self, wf_id):
        """删除工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.delete_workflow(wf_id)

    def rename_workflow(self, wf_id, new_name):
        """重命名工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        if not new_name or not isinstance(new_name, str):
            raise ValueError("New name must be non-empty string")
        new_name = new_name.strip()
        return self.file_handler.rename_workflow(wf_id, new_name)

    def move_workflow(self, wf_id, target_group_id):
        """移动工作流到其他分组"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.move_workflow(wf_id, target_group_id)

    def copy_workflow(self, wf_id, target_group_id, new_name=None):
        """复制工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        if new_name:
            new_name = new_name.strip()
        return self.file_handler.copy_workflow(wf_id, target_group_id, new_name)

    # ── thumbnail ─────────────────────────────────────────────────────────────
    
    def save_thumbnail(self, wf_id, data_url):
        """保存缩略图"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        if not data_url:
            raise ValueError("Data URL required")
        return self.file_handler.save_thumbnail(wf_id, data_url)

    def get_thumbnail_path(self, wf_id):
        """获取缩略图路径"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.get_thumbnail_path(wf_id)

    # ── version history ───────────────────────────────────────────────────────
    
    def save_version(self, wf_id):
        """创建版本快照"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.save_version(wf_id, self.max_versions)

    def list_versions(self, wf_id):
        """列出所有版本"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.list_versions(wf_id)

    def restore_version(self, wf_id, version_filename):
        """恢复到指定版本"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        if not version_filename:
            raise ValueError("Version filename required")
        return self.file_handler.restore_version(wf_id, version_filename)

    # ── misc ──────────────────────────────────────────────────────────────────
    
    def search_workflows(self, query):
        """搜索工作流"""
        if not isinstance(query, str):
            query = ""
        return self.file_handler.search_workflows(query)

    def get_all_workflows(self):
        """获取所有工作流元数据"""
        return self.file_handler.get_all_workflows()

    def get_all_groups(self):
        """获取所有分组"""
        return self.file_handler.get_all_groups()

    def backup_workflow(self, wf_id):
        """备份工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.backup_workflow(wf_id)

    def import_workflow(self, import_path, workflow_name, group_id=None):
        """导入工作流"""
        if not import_path:
            raise ValueError("Import path required")
        if not workflow_name or not isinstance(workflow_name, str):
            raise ValueError("Workflow name must be non-empty string")
        workflow_name = workflow_name.strip()
        return self.file_handler.import_workflow(import_path, workflow_name, group_id)

    def toggle_star(self, wf_id):
        """收藏/取消收藏工作流"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        return self.file_handler.toggle_star(wf_id)

    def update_tags(self, wf_id, tags):
        """更新工作流标签"""
        if not wf_id:
            raise ValueError("Workflow ID required")
        if not isinstance(tags, list):
            tags = []
        tags = [str(t).strip() for t in tags if str(t).strip()]
        return self.file_handler.update_tags(wf_id, tags)