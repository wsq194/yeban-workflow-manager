import { t } from "../i18n.js";
import { API } from "../api.js";
import { showConfirm } from "./Dialog.js";
import { formatVersionFilename } from "../utils.js";

export class VersionHistory {
    constructor(parentEl, opts = {}) {
        this.parentEl = parentEl;
        this.opts = opts;
        this.panel = null;
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

        const header = document.createElement("div");
        header.style.cssText = `
            padding:14px 16px;border-bottom:1px solid #333;
            display:flex;align-items:center;justify-content:space-between;
            flex-shrink:0;
        `;
        header.innerHTML = `
            <div>
                <div style="font-size:13px;font-weight:600;color:#fff;">${t("versionHistory")}</div>
                <div style="font-size:11px;color:#666;margin-top:2px;
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">
                    ${workflowName}
                </div>
            </div>
        `;

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.cssText = `
            background:none;border:none;color:#666;
            cursor:pointer;font-size:14px;padding:4px;
            transition:color .12s;
        `;
        closeBtn.addEventListener("mouseenter", () => closeBtn.style.color = "#fff");
        closeBtn.addEventListener("mouseleave", () => closeBtn.style.color = "#666");
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);

        const list = document.createElement("div");
        list.style.cssText = "flex:1;overflow-y:auto;padding:8px;";
        list.innerHTML = `<div style="color:#555;text-align:center;padding:30px;font-size:12px;">${t("loading")}</div>`;

        panel.appendChild(header);
        panel.appendChild(list);
        this.parentEl.appendChild(panel);
        this.panel = panel;

        requestAnimationFrame(() => { panel.style.transform = "translateX(0)"; });

        const res = await API.listVersions(workflowId);
        const versions = res.versions || [];

        list.innerHTML = "";

        if (versions.length === 0) {
            list.innerHTML = `<div style="color:#555;text-align:center;padding:30px;font-size:12px;">${t("noHistory")}</div>`;
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

            const label = index === 0 ? t("latestVersion") : `${t("version")} ${versions.length - index}`;
            item.innerHTML = `
                <div style="font-size:12px;color:#ccc;margin-bottom:4px;">${label}</div>
                <div style="font-size:11px;color:#555;">${formatVersionFilename(filename)}</div>
            `;

            const restoreBtn = document.createElement("button");
            restoreBtn.textContent = t("restore");
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
                const version = formatVersionFilename(filename);
                const ok = await showConfirm({
                    title: t("restoreVersion"),
                    message: t("restoreConfirm", { version }),
                });
                if (!ok) return;
                const result = await API.restoreVersion(workflowId, filename);
                if (result.status === "success") {
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
