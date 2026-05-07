import { API } from "../api.js";
import { showDialog, showConfirm } from "./Dialog.js";
import { showContextMenu } from "./ContextMenu.js";

export class GroupTree {
    /**
     * @param {HTMLElement} container
     * @param {object} opts
     *   opts.onSelect(groupId)   — null = 全部，"__starred__" = 收藏
     *   opts.onDrop(workflowId, groupId)
     *   opts.onRefresh()
     */
    constructor(container, opts = {}) {
        this.container = container;
        this.opts      = opts;
        this.groups    = {};
        this.current   = null;  // null | "__starred__" | groupId
    }

    setData(groups) {
        this.groups = groups;
        this.render();
    }

    setActive(groupId) {
        this.current = groupId;
        this.render();
    }

    render() {
        this.container.innerHTML = "";

        this._addItem("📋", "全部",   null,           this.current === null);
        this._addItem("★",  "收藏",   "__starred__",  this.current === "__starred__");

        // 分隔线
        const hr = document.createElement("div");
        hr.style.cssText = "height:1px;background:#2a2a2a;margin:6px 8px;";
        this.container.appendChild(hr);

        // 根分组
        const roots = Object.entries(this.groups).filter(([, g]) => !g.parent);
        roots.forEach(([id, g]) => this._addGroupItem(id, g, 0));
    }

    _addItem(icon, label, id, active) {
        const el = document.createElement("div");
        el.style.cssText = `
            display:flex;align-items:center;gap:7px;
            padding:7px 12px;cursor:pointer;font-size:12px;border-radius:5px;
            margin:1px 6px;
            background:${active ? "#0066cc" : "transparent"};
            color:${active ? "#fff" : "#aaa"};
            transition:background .12s;
        `;
        el.innerHTML = `<span>${icon}</span><span style="flex:1">${label}</span>`;
        el.addEventListener("mouseenter", () => { if (!active) el.style.background = "#2a2a2a"; });
        el.addEventListener("mouseleave", () => { if (!active) el.style.background = "transparent"; });
        el.addEventListener("click", () => {
            this.current = id;
            this.render();
            this.opts.onSelect?.(id);
        });
        this.container.appendChild(el);
    }

    _addGroupItem(id, group, depth) {
        const active = this.current === id;

        const el = document.createElement("div");
        el.style.cssText = `
            display:flex;align-items:center;gap:7px;
            padding:7px 12px 7px ${12 + depth * 14}px;
            cursor:pointer;font-size:12px;border-radius:5px;
            margin:1px 6px;
            background:${active ? "#0066cc" : "transparent"};
            color:${active ? "#fff" : "#aaa"};
            transition:background .12s;
        `;

        el.innerHTML = `
            <span>📁</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${group.name}</span>
        `;

        el.addEventListener("mouseenter", () => { if (this.current !== id) el.style.background = "#2a2a2a"; });
        el.addEventListener("mouseleave", () => { if (this.current !== id) el.style.background = "transparent"; });

        el.addEventListener("click", () => {
            this.current = id;
            this.render();
            this.opts.onSelect?.(id);
        });

        el.addEventListener("contextmenu", e => {
            e.preventDefault();
            this._showGroupMenu(e, id, group.name);
        });

        // drag-over 高亮
        el.addEventListener("dragover", e => {
            e.preventDefault();
            el.style.background = "#0066cc88";
        });
        el.addEventListener("dragleave", () => {
            el.style.background = this.current === id ? "#0066cc" : "transparent";
        });
        el.addEventListener("drop", e => {
            e.preventDefault();
            el.style.background = this.current === id ? "#0066cc" : "transparent";
            const wfId = e.dataTransfer.getData("workflowId");
            if (wfId) this.opts.onDrop?.(wfId, id);
        });

        this.container.appendChild(el);

        // 子分组递归
        Object.entries(this.groups)
            .filter(([, g]) => g.parent === id)
            .forEach(([cid, cg]) => this._addGroupItem(cid, cg, depth + 1));
    }

    _showGroupMenu(e, id, name) {
        showContextMenu(e, [
            {
                icon: "✏️", label: "重命名分组",
                action: async () => {
                    const r = await showDialog({
                        title: "重命名分组",
                        fields: [{ key: "name", label: "新名称", default: name }],
                    });
                    if (!r?.name || r.name === name) return;
                    await API.renameGroup(id, r.name);
                    this.opts.onRefresh?.();
                }
            },
            {
                icon: "📁", label: "新建子分组",
                action: async () => {
                    const r = await showDialog({
                        title: "新建子分组",
                        fields: [{ key: "name", label: "分组名称", placeholder: "输入名称" }],
                    });
                    if (!r?.name) return;
                    await API.createGroup(r.name, id);
                    this.opts.onRefresh?.();
                }
            },
            "divider",
            {
                icon: "🗑️", label: "删除分组", danger: true,
                action: async () => {
                    const ok = await showConfirm({
                        title: "删除分组",
                        message: `确定删除分组「${name}」？子分组将移至根目录，工作流不会被删除。`,
                        danger: true,
                    });
                    if (!ok) return;
                    await API.deleteGroup(id);
                    if (this.current === id) {
                        this.current = null;
                        this.opts.onSelect?.(null);
                    }
                    this.opts.onRefresh?.();
                }
            },
        ]);
    }
}
