import { API } from "../api.js";
import { GroupTree } from "./GroupTree.js";
import { WorkflowList } from "./WorkflowList.js";
import { VersionHistory } from "./VersionHistory.js";
import { showDialog } from "./Dialog.js";
import { captureCanvasThumbnail, debounce } from "../utils.js";

export class WorkflowPanel {
    /**
     * @param {HTMLElement} container — 侧边栏容器
     * @param {object} opts
     *   opts.onSaved({ workflow_id, name, group_id }) — 手动保存成功后回调
     */
    constructor(container, { onSaved } = {}) {
        this.container    = container;
        this.onSaved      = onSaved;
        this.workflows    = {};
        this.groups       = {};
        this.currentGroup = null;
        this.groupTree    = null;
        this.wfList       = null;
        this.versionPanel = null;
        this.statusEl     = null;
        this.countEl      = null;
        this._build();
        this.loadData();
    }

    _build() {
        this.container.style.cssText = `
            display:flex;flex-direction:column;height:100%;
            background:#1a1a1a;color:#fff;font-family:sans-serif;
            font-size:13px;overflow:hidden;
        `;

        // ── 顶部工具栏 ──────────────────────────────────────────────────────
        const topbar = document.createElement("div");
        topbar.style.cssText = `
            padding:8px 10px;border-bottom:1px solid #2a2a2a;
            display:flex;align-items:center;gap:7px;
            flex-shrink:0;background:#141414;flex-wrap:wrap;
        `;

        const title = document.createElement("div");
        title.textContent = "工作流管理";
        title.style.cssText = "font-size:13px;font-weight:600;color:#fff;flex-shrink:0;";

        const search = document.createElement("input");
        search.type = "text";
        search.placeholder = "搜索名称或标签...";
        search.style.cssText = `
            flex:1;min-width:80px;padding:5px 9px;background:#242424;
            border:1px solid #333;color:#fff;border-radius:5px;
            font-size:12px;outline:none;transition:border-color .15s;
        `;
        search.addEventListener("focus", () => search.style.borderColor = "#0066cc");
        search.addEventListener("blur",  () => search.style.borderColor = "#333");
        search.addEventListener("input", debounce(() => this.wfList?.setQuery(search.value), 200));

        const saveBtn    = this._btn("💾 保存当前", "#0066cc");
        const groupBtn   = this._btn("📁 新建分组", "#2a2a2a");
        const refreshBtn = this._btn("↻", "#2a2a2a");
        refreshBtn.title = "刷新";

        saveBtn.addEventListener("click",    () => this._saveCurrent());
        groupBtn.addEventListener("click",   () => this._createGroup());
        refreshBtn.addEventListener("click", () => this.loadData());

        [title, search, saveBtn, groupBtn, refreshBtn].forEach(el => topbar.appendChild(el));

        // ── 主体：左树 + 右列表 ─────────────────────────────────────────────
        const body = document.createElement("div");
        body.style.cssText = "display:flex;flex:1;overflow:hidden;position:relative;";

        const treeWrap = document.createElement("div");
        treeWrap.style.cssText = `
            width:110px;flex-shrink:0;border-right:1px solid #2a2a2a;
            overflow-y:auto;background:#161616;padding:6px 0;
        `;

        const listWrap = document.createElement("div");
        listWrap.style.cssText = "flex:1;overflow-y:auto;padding:8px;";

        this.groupTree = new GroupTree(treeWrap, {
            onSelect:  (id) => { this.currentGroup = id; this.wfList.setGroup(id); },
            onDrop:    (wfId, groupId) => this._moveWorkflow(wfId, groupId),
            onRefresh: () => this.loadData(),
        });

        this.wfList = new WorkflowList(listWrap, {
            onLoad:         (id) => this._loadWorkflow(id),
            onRefresh:      () => this.loadData(),
            onShowVersions: (id, name) => this.versionPanel.show(id, name),
        });

        this.versionPanel = new VersionHistory(body, {
            onRestore: () => this.loadData(),
        });

        body.appendChild(treeWrap);
        body.appendChild(listWrap);

        // ── 状态栏 ──────────────────────────────────────────────────────────
        const statusBar = document.createElement("div");
        statusBar.style.cssText = `
            padding:4px 10px;border-top:1px solid #2a2a2a;
            display:flex;align-items:center;justify-content:space-between;
            flex-shrink:0;background:#141414;
        `;
        this.statusEl = document.createElement("span");
        this.statusEl.style.cssText = "font-size:11px;color:#FFD700;";
        this.countEl = document.createElement("span");
        this.countEl.style.cssText = "font-size:11px;color:#444;";
        statusBar.appendChild(this.statusEl);
        statusBar.appendChild(this.countEl);

        this.container.appendChild(topbar);
        this.container.appendChild(body);
        this.container.appendChild(statusBar);
    }

    _btn(text, bg) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.cssText = `
            padding:5px 10px;background:${bg};color:#fff;
            border:1px solid #3a3a3a;border-radius:5px;
            cursor:pointer;font-size:11px;flex-shrink:0;
            transition:filter .12s;white-space:nowrap;
        `;
        btn.addEventListener("mouseenter", () => btn.style.filter = "brightness(1.2)");
        btn.addEventListener("mouseleave", () => btn.style.filter = "");
        return btn;
    }

    async loadData() {
        try {
            const res = await API.list();
            this.workflows = res.workflows || {};
            this.groups    = res.groups    || {};
            this.groupTree?.setData(this.groups);
            this.groupTree?.setActive(this.currentGroup);
            this.wfList?.setData(this.workflows, this.groups);
            this.wfList?.setGroup(this.currentGroup);
            if (this.countEl) {
                this.countEl.textContent = `共 ${Object.keys(this.workflows).length} 个`;
            }
        } catch (e) {
            console.error("[yeban-WM] loadData failed:", e);
        }
    }

    setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
    }

    async _saveCurrent() {
        const r = await showDialog({
            title: "保存工作流",
            fields: [{ key: "name", label: "工作流名称", placeholder: "输入名称" }],
        });
        if (!r?.name) return;

        const groupId = (this.currentGroup && this.currentGroup !== "__starred__")
            ? this.currentGroup : null;

        const workflowData = window.app.graph.serialize();
        const dataUrl = captureCanvasThumbnail();

        const res = await API.save(r.name, JSON.stringify(workflowData), groupId);
        if (res.status === "success") {
            if (dataUrl) await API.saveThumbnail(res.workflow_id, dataUrl);
            this.setStatus(`已保存: ${r.name}`);
            // 通知外部更新 tabWorkflowMap，自动保存才能生效
            this.onSaved?.({ workflow_id: res.workflow_id, name: r.name, group_id: groupId });
            await this.loadData();
        }
    }

    async _loadWorkflow(id) {
        const res = await API.load(id);
        if (res.status !== "success") return;
        await window.app.loadGraphData(res.data);
        const wf = this.workflows[id];
        this.setStatus(`已加载: ${wf?.name || id}`);
        // 加载工作流后也记录到 tabWorkflowMap，后续自动保存会跟踪它
        this.onSaved?.({
            workflow_id: id,
            name: wf?.name || id,
            group_id: wf?.group || null,
        });
    }

    async _createGroup() {
        const r = await showDialog({
            title: "新建分组",
            fields: [{ key: "name", label: "分组名称", placeholder: "输入名称" }],
        });
        if (!r?.name) return;
        const parentId = (this.currentGroup && this.currentGroup !== "__starred__")
            ? this.currentGroup : null;
        await API.createGroup(r.name, parentId);
        await this.loadData();
    }

    async _moveWorkflow(wfId, targetGroupId) {
        await API.move(wfId, targetGroupId);
        await this.loadData();
    }
}