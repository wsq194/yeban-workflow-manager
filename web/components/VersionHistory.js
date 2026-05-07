import { API } from "../api.js";
import { showConfirm } from "./Dialog.js";
import { formatVersionFilename } from "../utils.js";

export class VersionHistory {
    /**
     * 从右侧滑入的版本历史面板
     * @param {HTMLElement} parentEl  — 挂载到哪个容器（相对定位）
     * @param {object} opts
     *   opts.onRestore()  — 回滚后回调
     */
    constructor(parentEl, opts = {}) {
        this.parentEl = parentEl;
        this.opts     = opts;
        this.panel    = null;
    }

    async show(workflowId, workflowName) {
        this.close();

        const panel = document.createElement("div");
        panel.style.cssText = `
            position:absolute;top:0;right:0;bottom:0;
            width:280px;background:#1e1e1e;
            border-left:1px solid #333;
            display:flex;flex-direction:column;
            z-index:100;
            transform:translateX(100%);
            transition:transform .2s ease;
        `;

        // header
        const header = document.createElement("div");
        header.style.cssText = `
            padding:14px 16px;border-bottom:1px solid #333;
            display:flex;align-items:center;justify-content:space-between;
            flex-shrink:0;
        `;
        header.innerHTML = `
            <div>
                <div style="font-size:13px;font-weight:600;color:#fff;">版本历史</div>
                <div style="font-size:11px;color:#666;margin-top:2px;
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">
                    ${workflowName}
                </div>
            </div>
        `;

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕";
        closeBtn.style.cssText = `
            background:none;border:none;color:#666;
            cursor:pointer;font-size:14px;padding:4px;
            transition:color .12s;
        `;
        closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#fff");
        closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#666");
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);

        // list
        const list = document.createElement("div");
        list.style.cssText = "flex:1;overflow-y:auto;padding:8px;";
        list.innerHTML = `<div style="color:#555;text-align:center;padding:30px;font-size:12px;">加载中...</div>`;

        panel.appendChild(header);
        panel.appendChild(list);
        this.parentEl.appendChild(panel);
        this.panel = panel;

        // 动画
        requestAnimationFrame(() => { panel.style.transform = "translateX(0)"; });

        // 加载版本列表
        const res = await API.listVersions(workflowId);
        const versions = res.versions || [];

        list.innerHTML = "";

        if (versions.length === 0) {
            list.innerHTML = `<div style="color:#555;text-align:center;padding:30px;font-size:12px;">暂无历史版本</div>`;
            return;
        }

        versions.forEach((filename, index) => {
            const item = document.createElement("div");
            item.style.cssText = `
                padding:10px 12px;border-radius:6px;
                border:1px solid #2a2a2a;margin-bottom:5px;
                background:#242424;cursor:default;
                transition:background .12s;
            `;
            item.addEventListener("mouseenter", () => item.style.background = "#2e2e2e");
            item.addEventListener("mouseleave", () => item.style.background = "#242424");

            const label = index === 0 ? "最新版本" : `版本 ${versions.length - index}`;
            item.innerHTML = `
                <div style="font-size:12px;color:#ccc;margin-bottom:4px;">${label}</div>
                <div style="font-size:11px;color:#555;">${formatVersionFilename(filename)}</div>
            `;

            const restoreBtn = document.createElement("button");
            restoreBtn.textContent = "回滚";
            restoreBtn.style.cssText = `
                margin-top:8px;padding:4px 12px;
                background:#333;color:#aaa;
                border:1px solid #444;border-radius:4px;
                cursor:pointer;font-size:11px;
                transition:all .12s;
            `;
            restoreBtn.addEventListener("mouseenter", () => {
                restoreBtn.style.background = "#0066cc";
                restoreBtn.style.color = "#fff";
                restoreBtn.style.borderColor = "#0066cc";
            });
            restoreBtn.addEventListener("mouseleave", () => {
                restoreBtn.style.background = "#333";
                restoreBtn.style.color = "#aaa";
                restoreBtn.style.borderColor = "#444";
            });
            restoreBtn.addEventListener("click", async () => {
                const ok = await showConfirm({
                    title: "回滚版本",
                    message: `确定回滚到 ${formatVersionFilename(filename)}？当前版本会自动备份。`,
                });
                if (!ok) return;
                const r = await API.restoreVersion(workflowId, filename);
                if (r.status === "success") {
                    this.close();
                    this.opts.onRestore?.();
                }
            });

            item.appendChild(restoreBtn);
            list.appendChild(item);
        });
    }

    close() {
        if (!this.panel) return;
        this.panel.style.transform = "translateX(100%)";
        setTimeout(() => {
            this.panel?.remove();
            this.panel = null;
        }, 200);
    }
}
