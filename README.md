# yeban Workflow Manager

一个为 ComfyUI 设计的工作流管理插件，参考 [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager) 的设计思路，适配最新版 ComfyUI。


## ✨ 功能特点

- 📁 **分组管理** — 支持多级分组，拖拽工作流到分组
- 💾 **自动保存** — 每 60 秒自动保存当前工作流，无需手动操作
- 🕐 **版本历史** — 每次保存前自动创建快照，保留最近 20 个版本，支持一键回滚
- 🖼 **缩略图** — 保存时自动截取画布缩略图，也支持自定义封面图片
- 🏷️ **标签系统** — 为工作流添加标签，支持按标签搜索
- ★ **收藏** — 收藏常用工作流，快速访问
- 🔍 **搜索** — 按名称或标签实时搜索
- 📦 **备份导出** — 手动备份工作流到本地
- 🎨 **侧边栏集成** — 直接嵌入 ComfyUI 侧边栏，无需额外窗口

## 📦 安装

### 方法一：git clone（推荐）

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/wsq194/yeban-workflow-manager.git
```

重启 ComfyUI 即可。

### 方法二：手动安装

1. 下载本仓库 zip 并解压
2. 将文件夹放入 `ComfyUI/custom_nodes/`
3. 重启 ComfyUI

### 方法三：ComfyUI Manager

在 ComfyUI Manager 中搜索 `yeban Workflow Manager` 一键安装。

## 🚀 使用方法

### 打开管理器

点击左侧侧边栏的 📁 工作流管理 图标即可打开。

### 保存工作流

点击顶部 💾 保存当前 按钮，输入名称后保存。

保存后插件会自动每 60 秒更新一次该工作流。

### 加载工作流

点击列表中的工作流名称区域即可加载到画布。

### 分组管理

- 点击 📁 新建分组 创建分组
- 右键分组可重命名、新建子分组、删除
- 拖拽工作流到左侧分组树可移动分组

### 版本历史

右键工作流 → 🕐 版本历史，可查看所有历史快照并回滚。

每次保存时自动创建快照，最多保留 20 个版本。

### 自定义封面

右键工作流 → 🖼️ 自定义封面，选择本地图片作为缩略图。

### 标签

右键工作流 → 🏷️ 编辑标签，输入标签（逗号分隔）。

搜索框支持按标签名搜索。

### 备份

右键工作流 → 💾 备份，将工作流 JSON 备份到本地 `yeban-workflows/backups/` 目录。

## 📂 数据存储

所有数据保存在 `ComfyUI/yeban-workflows/` 目录下：

```
yeban-workflows/
├── metadata.json     # 工作流和分组的元数据
├── workflows/        # 工作流 JSON 文件（以 UUID 命名）
├── thumbnails/       # 缩略图
├── versions/         # 版本历史快照
└── backups/          # 手动备份
```

## ⚙️ 配置

编辑插件目录下的 `config.json`：

```json
{
  "auto_save_interval": 60,
  "max_versions": 20
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| auto_save_interval | 自动保存间隔（秒） | 60 |
| max_versions | 每个工作流保留的最大版本数 | 20 |

## 🖥️ 系统要求

- ComfyUI 0.15.0+
- Python 3.10+
- 无额外 Python 依赖

## 📝 更新日志

### v2.0.0

- 全面重构，适配最新版 ComfyUI
- 新增版本历史功能
- 新增缩略图和自定义封面
- 侧边栏直接嵌入，无需弹窗
- 工作流 ID 改为 UUID，避免重命名冲突
- 自动保存功能

## 补充说明

自动保存限制：

- 每 60 秒触发一次
- 只会保存当前 session 里打开过的工作流（tabWorkflowMap 里有记录的）
- 如果你手动点过"保存当前"，之后自动保存就会持续更新那个工作流

验证方法：底部状态栏或者终端会显示 `自动保存: HH:MM`，等 60 秒看看有没有出现。

## 🙏 致谢

UI 设计和功能参考了 [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager)，感谢原作者的开源贡献。

## 📄 License

MIT
