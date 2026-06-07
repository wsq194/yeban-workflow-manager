import { t, getLanguage, setLanguage } from "../i18n.js";
import { API } from "../api.js";
import { captureCanvasThumbnail, debounce, getActiveTabName, setActiveTabName, generateDefaultWorkflowName } from "../utils.js";
import { GroupTree } from "./GroupTree.js";
import { WorkflowList } from "./WorkflowList.js";
import { VersionHistory } from "./VersionHistory.js";
import { showDialog, showSaveAsDialog } from "./Dialog.js";

export class WorkflowPanel {
    constructor(container, { onSaved } = {}) {
        this.container = container;
        this.onSaved = onSaved;
        this.workflows = {};
        this.groups = {};
        this.currentGroup = null;
        this.groupTree = null;
        this.wfList = null;
        this.versionPanel = null;
        this.statusEl = null;
        this.countEl = null;
        this.searchInput = null;
        this._build();
        this.loadData();
    }

    _build() {
        this.container.innerHTML = "";
        this.container.style.cssText = `
            display:flex;flex-direction:column;height:100%;
            background:#1a1a1a;color:#fff;font-family:sans-serif;
            font-size:13px;overflow:hidden;
        `;

        const topbar = document.createElement("div");
        topbar.style.cssText = `
            padding:8px 10px;border-bottom:1px solid #2a2a2a;
            display:flex;align-items:center;gap:7px;
            flex-shrink:0;background:#141414;flex-wrap:wrap;
        `;

        const title = document.createElement("div");
        title.textContent = t("workflowManager");
        title.style.cssText = "font-size:13px;font-weight:600;color:#fff;flex-shrink:0;";

        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchInput.placeholder = t("searchPlaceholder");
        this.searchInput.style.cssText = `
            flex:1;min-width:80px;padding:5px 9px;background:#242424;
            border:1px solid #333;color:#fff;border-radius:5px;
            font-size:12px;outline:none;transition:border-color .15s;
        `;
        this.searchInput.addEventListener("focus", () => this.searchInput.style.borderColor = "#0066cc");
        this.searchInput.addEventListener("blur", () => this.searchInput.style.borderColor = "#333");
        this.searchInput.addEventListener("input", debounce(() => this.wfList?.setQuery(this.searchInput.value), 200));

        const languageSelect = document.createElement("select");
        languageSelect.title = t("language");
        languageSelect.value = getLanguage();
        languageSelect.style.cssText = `
            padding:5px 7px;background:#242424;color:#ddd;
            border:1px solid #333;border-radius:5px;font-size:11px;outline:none;
        `;
        [
            ["zh", "中文"],
            ["en", "English"],
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            option.selected = value === getLanguage();
            languageSelect.appendChild(option);
        });
        languageSelect.addEventListener("change", () => {
            setLanguage(languageSelect.value);
            this._build();
            this.loadData();
        });

        const saveBtnQuick = this._btn(`💾 ${t("saveCurrent")}`, "#0066cc");
        const saveBtnAs = this._btn(`📋 ${t("saveAs")}`, "#2a2a2a");
        const groupBtn = this._btn(`📁 ${t("createGroup")}`, "#2a2a2a");
        const refreshBtn = this._btn("↻", "#2a2a2a");
        refreshBtn.title = t("refresh");

        saveBtnQuick.addEventListener("click", () => this._saveCurrentQuick());
        saveBtnAs.addEventListener("click", () => this._saveCurrentAs());
        groupBtn.addEventListener("click", () => this._createGroup());
        refreshBtn.addEventListener("click", () => this.loadData());

        [title, this.searchInput, languageSelect, saveBtnQuick, saveBtnAs, groupBtn, refreshBtn]
            .forEach(el => topbar.appendChild(el));

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
            onSelect: id => { this.currentGroup = id; this.wfList.setGroup(id); },
            onDrop: (wfId, groupId) => this._moveWorkflow(wfId, groupId),
            onRefresh: () => this.loadData(),
        });

        this.wfList = new WorkflowList(listWrap, {
            onLoad: id => this._loadWorkflow(id),
            onRefresh: () => this.loadData(),
            onShowVersions: (id, name) => this.versionPanel.show(id, name),
        });

        this.versionPanel = new VersionHistory(body, {
            onRestore: () => this.loadData(),
        });

        body.appendChild(treeWrap);
        body.appendChild(listWrap);

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
            this.groups = res.groups || {};
            this.groupTree?.setData(this.groups);
            this.groupTree?.setActive(this.currentGroup);
            this.wfList?.setData(this.workflows, this.groups);
            this.wfList?.setGroup(this.currentGroup);
            if (this.countEl) {
                this.countEl.textContent = t("count", { count: Object.keys(this.workflows).length });
            }
        } catch (error) {
            console.error("[yeban-WM] loadData failed:", error);
        }
    }

    setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
    }

    async _saveCurrentQuick() {
        try {
            let tabName = getActiveTabName();
            if (!tabName || tabName.trim() === "") {
                tabName = generateDefaultWorkflowName();
                setActiveTabName(tabName);
            }
            tabName = tabName.trim();

            const groupId = (this.currentGroup && this.currentGroup !== "__starred__") ? this.currentGroup : null;
            const workflowData = window.app.graph.serialize();
            const dataUrl = captureCanvasThumbnail();

            let isOverwriting = false;
            for (const workflowId of Object.keys(this.workflows)) {
                const workflow = this.workflows[workflowId];
                if (workflow.name === tabName && workflow.group === groupId) {
                    isOverwriting = true;
                    break;
                }
            }

            const res = await API.save(tabName, JSON.stringify(workflowData), groupId);
            if (res.status === "success") {
                if (dataUrl) await API.saveThumbnail(res.workflow_id, dataUrl);
                const tag = isOverwriting ? `⚡ ${t("overwritten")}` : `✓ ${t("saved")}`;
                this.setStatus(`${tag}: ${tabName}`);
                this.onSaved?.({ workflow_id: res.workflow_id, name: tabName, group_id: groupId });
                await this.loadData();
            } else {
                this.setStatus(`✗ ${t("saveFailed")}: ${res.message}`);
            }
        } catch (error) {
            console.error("[yeban-WM] quick save failed:", error);
            this.setStatus(`✗ ${t("saveError")}`);
        }
    }

    async _saveCurrentAs() {
        try {
            let defaultName = getActiveTabName();
            if (!defaultName || defaultName.trim() === "") {
                defaultName = generateDefaultWorkflowName();
            }

            const result = await showSaveAsDialog({
                defaultName,
                groups: this.groups,
                currentGroupId: this.currentGroup && this.currentGroup !== "__starred__" ? this.currentGroup : null,
                confirmText: t("saveAs"),
                cancelText: t("cancel"),
            });
            if (!result) return;

            const { name, groupId } = result;
            const workflowData = window.app.graph.serialize();
            const dataUrl = captureCanvasThumbnail();
            const res = await API.save(name, JSON.stringify(workflowData), groupId);

            if (res.status === "success") {
                if (dataUrl) await API.saveThumbnail(res.workflow_id, dataUrl);
                setActiveTabName(name);
                this.setStatus(`✓ ${t("savedAs")}: ${name}`);
                this.onSaved?.({ workflow_id: res.workflow_id, name, group_id: groupId });
                await this.loadData();
            } else {
                this.setStatus(`✗ ${t("saveFailed")}: ${res.message}`);
            }
        } catch (error) {
            console.error("[yeban-WM] save as failed:", error);
            this.setStatus(`✗ ${t("saveError")}`);
        }
    }

    async _loadWorkflow(id) {
        const res = await API.load(id);
        if (res.status !== "success") return;

        await window.app.loadGraphData(res.data);
        const wf = this.workflows[id];
        setActiveTabName(wf?.name || id);
        this.setStatus(`✓ ${t("workflowLoaded")}: ${wf?.name || id}`);
        this.onSaved?.({
            workflow_id: id,
            name: wf?.name || id,
            group_id: wf?.group || null,
        });
    }

    async _createGroup() {
        const result = await showDialog({
            title: t("createGroup"),
            fields: [{ key: "name", label: t("groupName"), placeholder: t("enterGroupName") }],
        });
        if (!result?.name) return;

        const parentId = (this.currentGroup && this.currentGroup !== "__starred__") ? this.currentGroup : null;
        await API.createGroup(result.name, parentId);
        await this.loadData();
    }

    async _moveWorkflow(wfId, targetGroupId) {
        await API.move(wfId, targetGroupId);
        await this.loadData();
    }
}
