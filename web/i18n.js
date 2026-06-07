const STORAGE_KEY = "yeban-wm-language";

const DICT = {
    zh: {
        all: "全部",
        autoSaved: "自动保存",
        backup: "备份",
        backupSuccess: "备份成功",
        cancel: "取消",
        confirm: "确定",
        copyWorkflow: "复制工作流",
        copyTo: "复制到...",
        createGroup: "新建分组",
        createSubgroup: "新建子分组",
        customCover: "自定义封面",
        delete: "删除",
        deleteGroup: "删除分组",
        deleteGroupConfirm: "确定删除分组「{name}」？子分组将移至根目录，工作流不会被删除。",
        deleteWorkflow: "删除工作流",
        deleteWorkflowConfirm: "确定删除「{name}」？此操作不可撤销。",
        editTags: "编辑标签",
        enterGroupName: "输入名称",
        enterWorkflowName: "请输入工作流名称",
        groupName: "分组名称",
        language: "语言",
        latestVersion: "最新版本",
        loadWorkflow: "加载工作流",
        loading: "加载中...",
        newName: "新名称",
        noHistory: "暂无历史版本",
        noWorkflows: "暂无工作流",
        refresh: "刷新",
        rename: "重命名",
        renameGroup: "重命名分组",
        renameWorkflow: "重命名工作流",
        restore: "回滚",
        restoreConfirm: "确定回滚到 {version}？当前版本会自动备份。",
        restoreVersion: "回滚版本",
        root: "根目录",
        saveAs: "另存为",
        saveCurrent: "保存当前",
        saveFailed: "保存失败",
        saveError: "保存异常",
        saved: "已保存",
        savedAs: "已另存为",
        savedTo: "已保存到:",
        saveToGroup: "保存到分组",
        searchPlaceholder: "搜索名称或标签...",
        starred: "收藏",
        tagsComma: "标签（逗号分隔）",
        unstar: "取消收藏",
        version: "版本",
        versionHistory: "版本历史",
        workflowManager: "工作流管理",
        workflowManagerTooltip: "工作流管理器",
        workflowName: "工作流名称",
        workflowLoaded: "已加载",
        overwritten: "已覆盖",
        count: "共 {count} 个",
    },
    en: {
        all: "All",
        autoSaved: "Auto saved",
        backup: "Backup",
        backupSuccess: "Backup complete",
        cancel: "Cancel",
        confirm: "OK",
        copyWorkflow: "Copy workflow",
        copyTo: "Copy to...",
        createGroup: "New group",
        createSubgroup: "New subgroup",
        customCover: "Custom cover",
        delete: "Delete",
        deleteGroup: "Delete group",
        deleteGroupConfirm: "Delete group \"{name}\"? Subgroups will move to root. Workflows will not be deleted.",
        deleteWorkflow: "Delete workflow",
        deleteWorkflowConfirm: "Delete \"{name}\"? This cannot be undone.",
        editTags: "Edit tags",
        enterGroupName: "Enter a name",
        enterWorkflowName: "Please enter a workflow name",
        groupName: "Group name",
        language: "Language",
        latestVersion: "Latest version",
        loadWorkflow: "Load workflow",
        loading: "Loading...",
        newName: "New name",
        noHistory: "No history yet",
        noWorkflows: "No workflows yet",
        refresh: "Refresh",
        rename: "Rename",
        renameGroup: "Rename group",
        renameWorkflow: "Rename workflow",
        restore: "Restore",
        restoreConfirm: "Restore to {version}? The current version will be backed up automatically.",
        restoreVersion: "Restore version",
        root: "Root",
        saveAs: "Save as",
        saveCurrent: "Save current",
        saveFailed: "Save failed",
        saveError: "Save error",
        saved: "Saved",
        savedAs: "Saved as",
        savedTo: "Saved to:",
        saveToGroup: "Save to group",
        searchPlaceholder: "Search name or tags...",
        starred: "Starred",
        tagsComma: "Tags (comma separated)",
        unstar: "Unstar",
        version: "Version",
        versionHistory: "Version history",
        workflowManager: "Workflow Manager",
        workflowManagerTooltip: "Workflow Manager",
        workflowName: "Workflow name",
        workflowLoaded: "Loaded",
        overwritten: "Overwritten",
        count: "{count} total",
    },
};

function detectLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

let currentLanguage = detectLanguage();

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(lang) {
    currentLanguage = lang === "en" ? "en" : "zh";
    localStorage.setItem(STORAGE_KEY, currentLanguage);
}

export function t(key, params = {}) {
    const value = DICT[currentLanguage]?.[key] || DICT.zh[key] || key;
    return Object.entries(params).reduce(
        (text, [name, replacement]) => text.replaceAll(`{${name}}`, replacement),
        value
    );
}
