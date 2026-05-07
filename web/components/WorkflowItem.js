import { API } from "../api.js";
import { showDialog, showConfirm } from "./Dialog.js";
import { showContextMenu } from "./ContextMenu.js";
import { formatDate } from "../utils.js";

export class WorkflowItem {
    /**
     * @param {object} wf   — workflow metadata
     * @param {object} opts
     *   opts.onLoad(id)
     *   opts.onRefresh()
     *   opts.onShowVersions(id, name)
     */
	_pickCustomThumbnail() {
		const input = document.createElement("input");
		input.type   = "file";
		input.accept = "image/*";
		input.style.display = "none";
		document.body.appendChild(input);

		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			input.remove();
			if (!file) return;

			// 压缩到 320x180
			const dataUrl = await new Promise((resolve, reject) => {
				const img = new Image();
				const url = URL.createObjectURL(file);
				img.onload = () => {
					URL.revokeObjectURL(url);
					const canvas = document.createElement("canvas");
					canvas.width  = 320;
					canvas.height = 180;
					const ctx = canvas.getContext("2d");
					ctx.fillStyle = "#1a1a1a";
					ctx.fillRect(0, 0, 320, 180);
					const scale = Math.min(320 / img.width, 180 / img.height);
					const w = img.width  * scale;
					const h = img.height * scale;
					ctx.drawImage(img, (320 - w) / 2, (180 - h) / 2, w, h);
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
    constructor(wf, groups, opts = {}) {
        this.wf     = wf;
        this.groups = groups;
        this.opts   = opts;
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
            el.style.background    = "#2a2a2a";
            el.style.borderColor   = "#3a3a3a";
        });
        el.addEventListener("mouseleave", () => {
            el.style.background    = "#222";
            el.style.borderColor   = "#2e2e2e";
        });

        // drag
        el.addEventListener("dragstart", e => {
            e.dataTransfer.setData("workflowId", wf.id);
            e.dataTransfer.effectAllowed = "move";
            el.style.opacity = "0.45";
        });
        el.addEventListener("dragend", () => { el.style.opacity = "1"; });

        // 缩略图
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
            img.onerror = () => { thumb.innerHTML = `<span style="font-size:18px;color:#333">🖼</span>`; };
            thumb.appendChild(img);
        } else {
            thumb.innerHTML = `<span style="font-size:18px;color:#333">🖼</span>`;
        }

        // 信息区
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
                ${wf.tags?.length ? `<span style="color:#0066cc">${wf.tags.map(t => `#${t}`).join(" ")}</span>` : ""}
            </div>
        `;
        info.addEventListener("click", () => this.opts.onLoad?.(wf.id));

        // 收藏按钮
        const starBtn = document.createElement("button");
        starBtn.textContent = wf.starred ? "★" : "☆";
        starBtn.title = wf.starred ? "取消收藏" : "收藏";
        starBtn.style.cssText = `
            background:none;border:none;padding:0;flex-shrink:0;
            color:${wf.starred ? "#ffd700" : "#444"};
            cursor:pointer;font-size:15px;line-height:1;
            transition:color .12s;
        `;
        starBtn.addEventListener("mouseenter", () => { if (!wf.starred) starBtn.style.color = "#888"; });
        starBtn.addEventListener("mouseleave", () => { if (!wf.starred) starBtn.style.color = "#444"; });
        starBtn.addEventListener("click", async e => {
            e.stopPropagation();
            await API.toggleStar(wf.id);
            this.opts.onRefresh?.();
        });

        // 更多菜单
        const moreBtn = document.createElement("button");
        moreBtn.textContent = "⋯";
        moreBtn.style.cssText = `
            background:none;border:none;padding:0 2px;flex-shrink:0;
            color:#555;cursor:pointer;font-size:17px;line-height:1;
            transition:color .12s;
        `;
        moreBtn.addEventListener("mouseenter", () => moreBtn.style.color = "#aaa");
        moreBtn.addEventListener("mouseleave", () => moreBtn.style.color = "#555");
        moreBtn.addEventListener("click", e => {
            e.stopPropagation();
            this._showMenu(e);
        });

        el.appendChild(thumb);
        el.appendChild(info);
        el.appendChild(starBtn);
        el.appendChild(moreBtn);
        return el;
    }

    _showMenu(e) {
        const { wf } = this;
        showContextMenu(e, [
            {
                icon: "📂", label: "加载工作流",
                action: () => this.opts.onLoad?.(wf.id)
            },
			{
				icon: "🖼️", label: "自定义封面",
				action: () => this._pickCustomThumbnail()
			},
            "divider",
            {
                icon: "✏️", label: "重命名",
                action: async () => {
                    const r = await showDialog({
                        title: "重命名工作流",
                        fields: [{ key: "name", label: "新名称", default: wf.name }],
                    });
                    if (!r?.name || r.name === wf.name) return;
                    await API.rename(wf.id, r.name);
                    this.opts.onRefresh?.();
                }
            },
            {
                icon: "🏷️", label: "编辑标签",
                action: async () => {
                    const r = await showDialog({
                        title: "编辑标签",
                        fields: [{
                            key: "tags",
                            label: "标签（逗号分隔）",
                            default: wf.tags?.join(", ") || "",
                            placeholder: "tag1, tag2, tag3",
                        }],
                    });
                    if (r === null) return;
                    const tags = r.tags.split(",").map(t => t.trim()).filter(Boolean);
                    await API.updateTags(wf.id, tags);
                    this.opts.onRefresh?.();
                }
            },
            {
                icon: "📋", label: "复制到...",
                action: async () => {
                    const r = await showDialog({
                        title: "复制工作流",
                        fields: [
                            { key: "name", label: "新名称", default: `${wf.name}_copy` },
                        ],
                    });
                    if (!r?.name) return;
                    await API.copy(wf.id, wf.group || null, r.name);
                    this.opts.onRefresh?.();
                }
            },
            {
                icon: "🕐", label: "版本历史",
                action: () => this.opts.onShowVersions?.(wf.id, wf.name)
            },
            {
                icon: "💾", label: "备份",
                action: async () => {
                    const res = await API.backup(wf.id);
                    if (res.status === "success") {
                        await showConfirm({
                            title: "备份成功",
                            message: `已保存到:\n${res.backup_path}`,
                            danger: false,
                        });
                    }
                }
            },
            "divider",
            {
                icon: "🗑️", label: "删除", danger: true,
                action: async () => {
                    const ok = await showConfirm({
                        title: "删除工作流",
                        message: `确定删除「${wf.name}」？此操作不可撤销。`,
                        danger: true,
                    });
                    if (!ok) return;
                    await API.delete(wf.id);
                    this.opts.onRefresh?.();
                }
            },
        ]);
    }
}
