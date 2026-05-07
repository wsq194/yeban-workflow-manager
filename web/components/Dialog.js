/**
 * 轻量级对话框组件
 */

function baseOverlay() {
    const el = document.createElement("div");
    el.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.7);
        z-index:99999;display:flex;align-items:center;justify-content:center;
    `;
    return el;
}

function baseBox() {
    const el = document.createElement("div");
    el.style.cssText = `
        background:#242424;border:1px solid #3a3a3a;border-radius:10px;
        padding:22px 24px;min-width:320px;max-width:440px;width:90%;
        box-shadow:0 12px 40px rgba(0,0,0,.8);
    `;
    return el;
}

/**
 * 通用对话框
 * showDialog({ title, fields, confirmText, cancelText, danger })
 *   fields: [{ key, label, default, placeholder }]
 *   返回 Promise<object|null>  null = 取消
 */
export function showDialog({ title, fields = [], confirmText = "确定", cancelText = "取消", danger = false }) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        // title
        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;";
        box.appendChild(titleEl);

        // fields
        const inputs = {};
        fields.forEach(f => {
            const label = document.createElement("div");
            label.textContent = f.label;
            label.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
            box.appendChild(label);

            const input = document.createElement("input");
            input.type = "text";
            input.value = f.default || "";
            input.placeholder = f.placeholder || "";
            input.style.cssText = `
                width:100%;box-sizing:border-box;padding:8px 11px;
                background:#1a1a1a;border:1px solid #444;color:#fff;
                border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
                transition:border-color .15s;
            `;
            input.addEventListener("focus", () => input.style.borderColor = "#0066cc");
            input.addEventListener("blur", () => input.style.borderColor = "#444");
            box.appendChild(input);
            inputs[f.key] = input;
        });

        // buttons
        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:4px;";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding:7px 18px;background:#2a2a2a;color:#bbb;
            border:1px solid #444;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = confirmText;
        confirmBtn.style.cssText = `
            padding:7px 18px;
            background:${danger ? "#c0392b" : "#0066cc"};
            color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const close = (result) => { overlay.remove(); resolve(result); };

        cancelBtn.addEventListener("click", () => close(null));
        confirmBtn.addEventListener("click", () => {
            const result = {};
            for (const [k, el] of Object.entries(inputs)) result[k] = el.value.trim();
            close(result);
        });

        overlay.addEventListener("click", e => { if (e.target === overlay) close(null); });
        box.addEventListener("keydown", e => {
            if (e.key === "Enter") confirmBtn.click();
            if (e.key === "Escape") close(null);
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // focus first input
        const first = Object.values(inputs)[0];
        if (first) setTimeout(() => first.focus(), 30);
    });
}

/**
 * 确认对话框
 * showConfirm({ title, message, danger })
 *   返回 Promise<boolean>
 */
export function showConfirm({ title, message, danger = false }) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:10px;";

        const msgEl = document.createElement("div");
        msgEl.textContent = message;
        msgEl.style.cssText = "font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;";

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "取消";
        cancelBtn.style.cssText = `
            padding:7px 18px;background:#2a2a2a;color:#bbb;
            border:1px solid #444;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "确定";
        confirmBtn.style.cssText = `
            padding:7px 18px;
            background:${danger ? "#c0392b" : "#0066cc"};
            color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const close = (r) => { overlay.remove(); resolve(r); };
        cancelBtn.addEventListener("click", () => close(false));
        confirmBtn.addEventListener("click", () => close(true));
        overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
        document.addEventListener("keydown", function handler(e) {
            if (e.key === "Escape") { close(false); document.removeEventListener("keydown", handler); }
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(titleEl);
        box.appendChild(msgEl);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => confirmBtn.focus(), 30);
    });
}

/**
 * 另存为对话框 - 包含分组选择
 */
export function showSaveAsDialog({ 
    defaultName = "", 
    groups = {}, 
    currentGroupId = null,
    confirmText = "确定", 
    cancelText = "取消" 
}) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        // title
        const titleEl = document.createElement("div");
        titleEl.textContent = "另存为";
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;";
        box.appendChild(titleEl);

        // name field
        const nameLabel = document.createElement("div");
        nameLabel.textContent = "工作流名称";
        nameLabel.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
        box.appendChild(nameLabel);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = defaultName || "";
        nameInput.placeholder = "输入工作流名称";
        nameInput.style.cssText = `
            width:100%;box-sizing:border-box;padding:8px 11px;
            background:#1a1a1a;border:1px solid #444;color:#fff;
            border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
            transition:border-color .15s;
        `;
        nameInput.addEventListener("focus", () => nameInput.style.borderColor = "#0066cc");
        nameInput.addEventListener("blur", () => nameInput.style.borderColor = "#444");
        box.appendChild(nameInput);

        // group select
        const groupLabel = document.createElement("div");
        groupLabel.textContent = "保存到分组";
        groupLabel.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
        box.appendChild(groupLabel);

        const groupSelect = document.createElement("select");
        groupSelect.style.cssText = `
            width:100%;box-sizing:border-box;padding:8px 11px;
            background:#1a1a1a;border:1px solid #444;color:#fff;
            border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
            transition:border-color .15s;
        `;

        // 构建分组树选项
        const buildGroupOptions = (parentId = null, depth = 0) => {
            const entries = Object.entries(groups)
                .filter(([, g]) => g.parent === parentId)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name));

            entries.forEach(([gid, g]) => {
                const option = document.createElement("option");
                option.value = gid;
                option.textContent = "  ".repeat(depth) + g.name;
                option.selected = gid === currentGroupId;
                groupSelect.appendChild(option);

                // 递归添加子分组
                buildGroupOptions(gid, depth + 1);
            });
        };

        // 添加"根目录"选项
        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = "📋 根目录";
        rootOption.selected = !currentGroupId;
        groupSelect.appendChild(rootOption);

        buildGroupOptions();

        groupSelect.addEventListener("focus", () => groupSelect.style.borderColor = "#0066cc");
        groupSelect.addEventListener("blur", () => groupSelect.style.borderColor = "#444");
        box.appendChild(groupSelect);

        // buttons
        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:4px;";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding:7px 18px;background:#2a2a2a;color:#bbb;
            border:1px solid #444;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = confirmText;
        confirmBtn.style.cssText = `
            padding:7px 18px;background:#0066cc;color:#fff;
            border:none;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const close = (result) => { 
            overlay.remove(); 
            resolve(result); 
        };

        cancelBtn.addEventListener("click", () => close(null));
        confirmBtn.addEventListener("click", () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert("请输入工作流名称");
                return;
            }
            close({ name, groupId: groupSelect.value || null });
        });

        overlay.addEventListener("click", e => { if (e.target === overlay) close(null); });
        nameInput.addEventListener("keydown", e => {
            if (e.key === "Enter") confirmBtn.click();
            if (e.key === "Escape") close(null);
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // focus name input
        setTimeout(() => nameInput.focus(), 30);
    });
}