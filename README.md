# Yeban Workflow Manager

[中文](#中文) | [English](#english)

<img width="2571" height="1361" alt="Yeban Workflow Manager preview" src="https://github.com/user-attachments/assets/0b362c66-f61c-4cef-8135-f9e5d83dda0e" />

## 中文

Yeban Workflow Manager 是一个为 ComfyUI 设计的工作流管理插件，提供侧边栏管理、自动保存、版本历史、分组、搜索、缩略图和多层备份保护。

### 功能特点

- 分组管理：支持分组、子分组和拖拽移动工作流。
- 自动保存：手动保存过的工作流会按间隔自动更新。
- 版本历史：保存前自动创建版本快照，可从历史版本回滚。
- 最新同步备份：每个工作流保存后都会同步一份最新备份。
- 覆盖前历史备份：覆盖已有工作流前会保留旧状态快照。
- 元数据自愈：如果 `metadata.json` 丢失或被重建，会从磁盘工作流和版本快照自动恢复索引。
- 缩略图：保存时自动截取画布缩略图，也支持自定义封面。
- 标签与收藏：支持标签搜索和收藏常用工作流。
- 中英界面：面板顶部可在中文和 English 之间切换。

### 安装

#### Comfy Registry / ComfyUI Manager

在 ComfyUI Manager 或 Comfy Registry 中搜索：

```bash
yeban-workflow-manager
```

也可以使用：

```bash
comfy node install yeban-workflow-manager
```

#### Git Clone

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wsq194/yeban-workflow-manager.git
```

重启 ComfyUI 后生效。

### 使用方法

- 打开管理器：点击 ComfyUI 左侧侧边栏中的工作流管理图标。
- 保存当前：使用当前标签栏名称快速保存当前画布。
- 另存为：输入新名称并选择保存分组。
- 加载工作流：点击工作流卡片名称区域。
- 分组管理：新建分组，右键分组可重命名、新建子分组或删除。
- 版本历史：右键工作流，选择版本历史并回滚。
- 自定义封面：右键工作流，选择自定义封面。
- 切换语言：在面板顶部选择 `中文` 或 `English`，选择会保存在浏览器本地。

### 数据存储

所有运行数据保存在 `ComfyUI/yeban-workflows/`：

```text
yeban-workflows/
├── metadata.json          # 工作流和分组索引
├── metadata.json.bak      # 上一次 metadata 备份
├── metadata_backups/      # metadata 自动恢复快照
├── workflows/             # 主工作流 JSON
├── thumbnails/            # 缩略图
├── versions/              # 版本历史快照
└── backups/
    ├── latest/            # 每个工作流的最新同步备份
    └── auto/              # 覆盖保存前的历史快照备份
```

### 配置

编辑插件目录下的 `config.json`：

```json
{
  "auto_save_interval": 60,
  "max_versions": 20,
  "latest_backup_enabled": true,
  "auto_backup_enabled": true,
  "max_auto_backups": 50,
  "language": "zh"
}
```

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `auto_save_interval` | 自动保存间隔，单位秒 | `60` |
| `max_versions` | 每个工作流保留的版本历史数量 | `20` |
| `latest_backup_enabled` | 保存后是否同步最新备份 | `true` |
| `auto_backup_enabled` | 覆盖前是否保留历史备份 | `true` |
| `max_auto_backups` | 每个工作流最多保留的覆盖前备份数量 | `50` |
| `language` | 默认语言提示，界面也可在面板顶部切换 | `zh` |

### 系统要求

- ComfyUI 0.19.0+
- Python 3.10+
- 无额外 Python 运行依赖

### 更新日志

#### v0.2.5

- 新增面板内中文 / English 切换。
- 更新 GitHub README 为中英双语说明。

#### v0.2.4

- 新增 metadata 自动自愈。
- 新增最新同步备份 `backups/latest/`。
- 新增覆盖前历史备份 `backups/auto/`。
- 增加 Comfy Registry 发布元信息。

## English

Yeban Workflow Manager is a ComfyUI custom node extension for managing workflows from the sidebar. It adds auto-save, version history, groups, search, thumbnails, resilient metadata recovery, and layered backup protection.

### Features

- Group management: groups, subgroups, and drag-and-drop workflow movement.
- Auto-save: saved workflows can continue updating on a timer.
- Version history: snapshots are created before saves and can be restored.
- Latest synced backup: each workflow keeps one latest mirror backup after saving.
- Pre-overwrite backups: old workflow states are kept before overwriting.
- Metadata recovery: if `metadata.json` is lost or reset, the plugin rebuilds the index from workflow files and version snapshots.
- Thumbnails: automatic canvas thumbnails plus custom covers.
- Tags and stars: tag search and starred workflows.
- Bilingual UI: switch between Chinese and English from the panel header.

### Installation

#### Comfy Registry / ComfyUI Manager

Search for:

```bash
yeban-workflow-manager
```

Or install with:

```bash
comfy node install yeban-workflow-manager
```

#### Git Clone

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wsq194/yeban-workflow-manager.git
```

Restart ComfyUI after installation.

### Usage

- Open the manager from the ComfyUI sidebar.
- Save current uses the active workflow tab name.
- Save as lets you choose a name and target group.
- Click a workflow card to load it.
- Create groups and manage them from the group tree context menu.
- Open version history from a workflow context menu and restore snapshots.
- Set a custom cover from a workflow context menu.
- Switch language from the panel header. The choice is stored in browser local storage.

### Data Storage

Runtime data is stored under `ComfyUI/yeban-workflows/`:

```text
yeban-workflows/
├── metadata.json          # Workflow and group index
├── metadata.json.bak      # Previous metadata backup
├── metadata_backups/      # Metadata recovery snapshots
├── workflows/             # Main workflow JSON files
├── thumbnails/            # Thumbnails
├── versions/              # Version history snapshots
└── backups/
    ├── latest/            # Latest synced backup for each workflow
    └── auto/              # Pre-overwrite historical backups
```

### Configuration

Edit `config.json` in the plugin directory:

```json
{
  "auto_save_interval": 60,
  "max_versions": 20,
  "latest_backup_enabled": true,
  "auto_backup_enabled": true,
  "max_auto_backups": 50,
  "language": "zh"
}
```

| Field | Description | Default |
| --- | --- | --- |
| `auto_save_interval` | Auto-save interval in seconds | `60` |
| `max_versions` | Maximum version snapshots per workflow | `20` |
| `latest_backup_enabled` | Keep a latest synced backup after saving | `true` |
| `auto_backup_enabled` | Keep pre-overwrite historical backups | `true` |
| `max_auto_backups` | Maximum pre-overwrite backups per workflow | `50` |
| `language` | Default language hint; UI can also switch from the panel | `zh` |

### Requirements

- ComfyUI 0.19.0+
- Python 3.10+
- No extra Python runtime dependencies

### Changelog

#### v0.2.5

- Added in-panel Chinese / English language switching.
- Reworked README with bilingual documentation.

#### v0.2.4

- Added metadata self-recovery.
- Added latest synced backups in `backups/latest/`.
- Added pre-overwrite history backups in `backups/auto/`.
- Added Comfy Registry publishing metadata.

## Acknowledgements

UI and workflow-management ideas were inspired by [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager). Thanks to the original author for the open-source work.

## License

MIT
