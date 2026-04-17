from .file_handler import FileHandler


class WorkflowManager:
    _instance = None

    def __new__(cls, base_path=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, base_path=None):
        if self._initialized:
            return
        if base_path is None:
            raise ValueError("base_path required on first initialization")
        self.file_handler = FileHandler(base_path)
        self._initialized = True

    @classmethod
    def reset(cls):
        """重置单例，用于插件重载场景"""
        cls._instance = None

    # groups
    def create_group(self, name, parent_id=None): ...
    # 其余方法不变

    # groups
    def create_group(self, name, parent_id=None):       return self.file_handler.create_group(name, parent_id)
    def delete_group(self, group_id):                   return self.file_handler.delete_group(group_id)
    def rename_group(self, group_id, new_name):         return self.file_handler.rename_group(group_id, new_name)

    # workflows
    def save_workflow(self, data, name, group_id=None): return self.file_handler.save_workflow(data, name, group_id)
    def load_workflow(self, wf_id):                     return self.file_handler.load_workflow(wf_id)
    def delete_workflow(self, wf_id):                   return self.file_handler.delete_workflow(wf_id)
    def rename_workflow(self, wf_id, new_name):         return self.file_handler.rename_workflow(wf_id, new_name)
    def move_workflow(self, wf_id, target_group_id):    return self.file_handler.move_workflow(wf_id, target_group_id)
    def copy_workflow(self, wf_id, target_group_id, new_name=None): return self.file_handler.copy_workflow(wf_id, target_group_id, new_name)

    # thumbnail
    def save_thumbnail(self, wf_id, data_url):          return self.file_handler.save_thumbnail(wf_id, data_url)
    def get_thumbnail_path(self, wf_id):                return self.file_handler.get_thumbnail_path(wf_id)

    # versions
    def save_version(self, wf_id):                      return self.file_handler.save_version(wf_id)
    def list_versions(self, wf_id):                     return self.file_handler.list_versions(wf_id)
    def restore_version(self, wf_id, version_filename): return self.file_handler.restore_version(wf_id, version_filename)

    # misc
    def search_workflows(self, query):                  return self.file_handler.search_workflows(query)
    def get_all_workflows(self):                        return self.file_handler.get_all_workflows()
    def get_all_groups(self):                           return self.file_handler.get_all_groups()
    def backup_workflow(self, wf_id):                   return self.file_handler.backup_workflow(wf_id)
    def import_workflow(self, path, name, group_id=None): return self.file_handler.import_workflow(path, name, group_id)
    def toggle_star(self, wf_id):                       return self.file_handler.toggle_star(wf_id)
    def update_tags(self, wf_id, tags):                 return self.file_handler.update_tags(wf_id, tags)
