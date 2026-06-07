import { t } from "../i18n.js";
import { API } from "../api.js";
import { formatDate } from "../utils.js";
import { showDialog, showConfirm } from "./Dialog.js";
import { showContextMenu } from "./ContextMenu.js";

export class WorkflowItem {
    constructor(wf, groups, opts = {}) {
        this.wf = wf;
        this.groups = groups;
        this.opts = opts;
    }

    async _pickCustomThumbnail() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        document.body.appendChild(input);

        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return;

            const dataUrl = await new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement("canvas");
                    canvas.width = 320;
                    canvas.height = 180;
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#1a1a1a";
                    ctx.fillRect(0, 0, 320, 180);
                    const scale = Math.min(320 / img.width, 180 / img.height);
                    const width = img.width * scale;
                    const height = img.height * scale;
                    ctx.drawImage(img, (320 - width) / 2, (180 - height) / 2, width, height);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = reject;
                img.src = url;
            });

            const res = await API.saveThumbnail(this.wf.id, dataUrl);
            if (res.status === "success") this.opts.onRefresh?.();
        });

        input.click();
    }

    render() {
        const { wf, groups } = this;
        const el = document.createElement("div");
        el.draggable = true;
        el.style.cssText = `
            display:flex;align-items:center;gap:10px;
            padding:9px 10px;background:#222;
            border:1px solid #2e2e2e;border-radius:7px;
            margin-bottom:5px;cursor:default;
            transition:background .12s, border-color .12s;
        `;
        el.addEventListener("mouseenter", () => {
            el.style.background = "#2a2a2a";
            el.style.borderColor = "#3a3a3a";
        });
        el.addEventListener("mouseleave", () => {
            el.style.background = "#222";
            el.style.borderColor = "#2e2e2e";
        });
        el.addEventListener("dragstart", event => {
            event.dataTransfer.setData("workflowId", wf.id);
            event.dataTransfer.effectAllowed = "move";
            el.style.opacity = "0.45";
        });
        el.addEventListener("dragend", () => { el.style.opacity = "1"; });

        const thumb = document.createElement("div");
        thumb.style.cssText = `
            width:54px;height:36px;flex-shrink:0;border-radius:4px;
            background:#1a1a1a;border:1px solid #333;overflow:hidden;
            display:flex;align-items:center;justify-content:center;
        `;
        if (wf.has_thumbnail) {
            const img = document.createElement("img");
            img.src = API.thumbnailUrl(wf.id);
            img.style.cssText = "width:100%;height:100%;object-fit:cover;";
            img.onerror = () => { thumb.innerHTML = `<span style="font-size:18px;color:#333">🖼️</span>`; };
            thumb.appendChild(img);
        } else {
            thumb.innerHTML = `<span style="font-size:18px;color:#333">🖼️</span>`;
        }

        const info = document.createElement("div");
        info.style.cssText = "flex:1;overflow:hidden;cursor:pointer;min-width:0;";

        const groupName = wf.group ? (groups[wf.group]?.name || wf.group) : "";
        info.innerHTML = `
            <div style="
                color:#ddd;font-size:13px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            ">${wf.name}</div>
            <div style="color:#555;font-size:11px;margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;">
                <span>${formatDate(wf.modified_at)}</span>
                ${groupName ? `<span style="color:#444">· ${groupName}</span>` : ""}
                ${wf.tags?.length ? `<span style="color:#0066cc">${wf.tags.map(tag => `#${tag}`).join(" ")}</span>` : ""}
            </div>
        `;
        info.addEventListener("click", () => this.opts.onLoad?.(wf.id));

        const starBtn = document.createElement("button");
        starBtn.textContent = wf.starred ? "★" : "☆";
        starBtn.title = wf.starred ? t("unstar") : t("starred");
        starBtn.style.cssText = `
            background:none;border:none;padding:0;flex-shrink:0;
            color:${wf.starred ? "#ffd700" : "#444"};
            cursor:pointer;font-size:15px;line-height:1;
            transition:color .12s;
        `;
        starBtn.addEventListener("mouseenter", () => { if (!wf.starred) starBtn.style.color = "#888"; });
        starBtn.addEventListener("mouseleave", () => { if (!wf.starred) starBtn.style.color = "#444"; });
        starBtn.addEventListener("click", async event => {
            event.stopPropagation();
            await API.toggleStar(wf.id);
            this.opts.onRefresh?.();
        });

        const moreBtn = document.createElement("button");
        moreBtn.textContent = "⋯";
        moreBtn.style.cssText = `
            background:none;border:none;padding:0 2px;flex-shrink:0;
            color:#555;cursor:pointer;font-size:17px;line-height:1;
            transition:color .12s;
        `;
        moreBtn.addEventListener("mouseenter", () => moreBtn.style.color = "#aaa");
        moreBtn.addEventListener("mouseleave", () => moreBtn.style.color = "#555");
        moreBtn.addEventListener("click", event => {
            event.stopPropagation();
            this._showMenu(event);
        });

        el.appendChild(thumb);
        el.appendChild(info);
        el.appendChild(starBtn);
        el.appendChild(moreBtn);
        return el;
    }

    _showMenu(event) {
        const { wf } = this;
        showContextMenu(event, [
            {
                icon: "📂",
                label: t("loadWorkflow"),
                action: () => this.opts.onLoad?.(wf.id),
            },
            {
                icon: "🖼️",
                label: t("customCover"),
                action: () => this._pickCustomThumbnail(),
            },
            "divider",
            {
                icon: "✏️",
                label: t("rename"),
                action: async () => {
                    const result = await showDialog({
                        title: t("renameWorkflow"),
                        fields: [{ key: "name", label: t("newName"), default: wf.name }],
                    });
                    if (!result?.name || result.name === wf.name) return;
                    await API.rename(wf.id, result.name);
                    this.opts.onRefresh?.();
                },
            },
            {
                icon: "🏷️",
                label: t("editTags"),
                action: async () => {
                    const result = await showDialog({
                        title: t("editTags"),
                        fields: [{
                            key: "tags",
                            label: t("tagsComma"),
                            default: wf.tags?.join(", ") || "",
                            placeholder: "tag1, tag2, tag3",
                        }],
                    });
                    if (result === null) return;
                    const tags = result.tags.split(",").map(tag => tag.trim()).filter(Boolean);
                    await API.updateTags(wf.id, tags);
                    this.opts.onRefresh?.();
                },
            },
            {
                icon: "📋",
                label: t("copyTo"),
                action: async () => {
                    const result = await showDialog({
                        title: t("copyWorkflow"),
                        fields: [{ key: "name", label: t("newName"), default: `${wf.name}_copy` }],
                    });
                    if (!result?.name) return;
                    await API.copy(wf.id, wf.group || null, result.name);
                    this.opts.onRefresh?.();
                },
            },
            {
                icon: "🕐",
                label: t("versionHistory"),
                action: () => this.opts.onShowVersions?.(wf.id, wf.name),
            },
            {
                icon: "💾",
                label: t("backup"),
                action: async () => {
                    const res = await API.backup(wf.id);
                    if (res.status === "success") {
                        await showConfirm({
                            title: t("backupSuccess"),
                            message: `${t("savedTo")}\n${res.backup_path}`,
                            danger: false,
                        });
                    }
                },
            },
            "divider",
            {
                icon: "🗑️",
                label: t("delete"),
                danger: true,
                action: async () => {
                    const ok = await showConfirm({
                        title: t("deleteWorkflow"),
                        message: t("deleteWorkflowConfirm", { name: wf.name }),
                        danger: true,
                    });
                    if (!ok) return;
                    await API.delete(wf.id);
                    this.opts.onRefresh?.();
                },
            },
        ]);
    }
}
