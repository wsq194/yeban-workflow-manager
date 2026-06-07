import { t } from "../i18n.js";
import { API } from "../api.js";
import { showDialog, showConfirm } from "./Dialog.js";
import { showContextMenu } from "./ContextMenu.js";

export class GroupTree {
    constructor(container, opts = {}) {
        this.container = container;
        this.opts = opts;
        this.groups = {};
        this.current = null;
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

        this._addItem("📋", t("all"), null, this.current === null);
        this._addItem("★", t("starred"), "__starred__", this.current === "__starred__");

        const hr = document.createElement("div");
        hr.style.cssText = "height:1px;background:#2a2a2a;margin:6px 8px;";
        this.container.appendChild(hr);

        Object.entries(this.groups)
            .filter(([, group]) => !group.parent)
            .forEach(([id, group]) => this._addGroupItem(id, group, 0));
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

        Object.entries(this.groups)
            .filter(([, child]) => child.parent === id)
            .forEach(([childId, child]) => this._addGroupItem(childId, child, depth + 1));
    }

    _showGroupMenu(e, id, name) {
        showContextMenu(e, [
            {
                icon: "✏️",
                label: t("renameGroup"),
                action: async () => {
                    const result = await showDialog({
                        title: t("renameGroup"),
                        fields: [{ key: "name", label: t("newName"), default: name }],
                    });
                    if (!result?.name || result.name === name) return;
                    await API.renameGroup(id, result.name);
                    this.opts.onRefresh?.();
                },
            },
            {
                icon: "📁",
                label: t("createSubgroup"),
                action: async () => {
                    const result = await showDialog({
                        title: t("createSubgroup"),
                        fields: [{ key: "name", label: t("groupName"), placeholder: t("enterGroupName") }],
                    });
                    if (!result?.name) return;
                    await API.createGroup(result.name, id);
                    this.opts.onRefresh?.();
                },
            },
            "divider",
            {
                icon: "🗑️",
                label: t("deleteGroup"),
                danger: true,
                action: async () => {
                    const ok = await showConfirm({
                        title: t("deleteGroup"),
                        message: t("deleteGroupConfirm", { name }),
                        danger: true,
                    });
                    if (!ok) return;
                    await API.deleteGroup(id);
                    if (this.current === id) {
                        this.current = null;
                        this.opts.onSelect?.(null);
                    }
                    this.opts.onRefresh?.();
                },
            },
        ]);
    }
}
