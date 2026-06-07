import { t } from "../i18n.js";

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

export function showDialog({
    title,
    fields = [],
    confirmText = t("confirm"),
    cancelText = t("cancel"),
    danger = false,
}) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;";
        box.appendChild(titleEl);

        const inputs = {};
        fields.forEach(field => {
            const label = document.createElement("div");
            label.textContent = field.label;
            label.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
            box.appendChild(label);

            const input = document.createElement("input");
            input.type = "text";
            input.value = field.default || "";
            input.placeholder = field.placeholder || "";
            input.style.cssText = `
                width:100%;box-sizing:border-box;padding:8px 11px;
                background:#1a1a1a;border:1px solid #444;color:#fff;
                border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
                transition:border-color .15s;
            `;
            input.addEventListener("focus", () => input.style.borderColor = "#0066cc");
            input.addEventListener("blur", () => input.style.borderColor = "#444");
            box.appendChild(input);
            inputs[field.key] = input;
        });

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

        const close = result => {
            overlay.remove();
            resolve(result);
        };

        cancelBtn.addEventListener("click", () => close(null));
        confirmBtn.addEventListener("click", () => {
            const result = {};
            for (const [key, input] of Object.entries(inputs)) result[key] = input.value.trim();
            close(result);
        });

        overlay.addEventListener("click", event => { if (event.target === overlay) close(null); });
        box.addEventListener("keydown", event => {
            if (event.key === "Enter") confirmBtn.click();
            if (event.key === "Escape") close(null);
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const first = Object.values(inputs)[0];
        if (first) setTimeout(() => first.focus(), 30);
    });
}

export function showConfirm({ title, message, danger = false }) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:10px;";

        const msgEl = document.createElement("div");
        msgEl.textContent = message;
        msgEl.style.cssText = "font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;white-space:pre-wrap;";

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = t("cancel");
        cancelBtn.style.cssText = `
            padding:7px 18px;background:#2a2a2a;color:#bbb;
            border:1px solid #444;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = t("confirm");
        confirmBtn.style.cssText = `
            padding:7px 18px;
            background:${danger ? "#c0392b" : "#0066cc"};
            color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;
        `;

        const close = result => {
            overlay.remove();
            resolve(result);
        };

        cancelBtn.addEventListener("click", () => close(false));
        confirmBtn.addEventListener("click", () => close(true));
        overlay.addEventListener("click", event => { if (event.target === overlay) close(false); });
        document.addEventListener("keydown", function handler(event) {
            if (event.key === "Escape") {
                close(false);
                document.removeEventListener("keydown", handler);
            }
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

export function showSaveAsDialog({
    defaultName = "",
    groups = {},
    currentGroupId = null,
    confirmText = t("confirm"),
    cancelText = t("cancel"),
}) {
    return new Promise(resolve => {
        const overlay = baseOverlay();
        const box = baseBox();

        const titleEl = document.createElement("div");
        titleEl.textContent = t("saveAs");
        titleEl.style.cssText = "font-size:15px;font-weight:600;color:#fff;margin-bottom:16px;";
        box.appendChild(titleEl);

        const nameLabel = document.createElement("div");
        nameLabel.textContent = t("workflowName");
        nameLabel.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
        box.appendChild(nameLabel);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = defaultName || "";
        nameInput.placeholder = t("enterWorkflowName");
        nameInput.style.cssText = `
            width:100%;box-sizing:border-box;padding:8px 11px;
            background:#1a1a1a;border:1px solid #444;color:#fff;
            border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
            transition:border-color .15s;
        `;
        nameInput.addEventListener("focus", () => nameInput.style.borderColor = "#0066cc");
        nameInput.addEventListener("blur", () => nameInput.style.borderColor = "#444");
        box.appendChild(nameInput);

        const groupLabel = document.createElement("div");
        groupLabel.textContent = t("saveToGroup");
        groupLabel.style.cssText = "font-size:12px;color:#999;margin-bottom:5px;";
        box.appendChild(groupLabel);

        const groupSelect = document.createElement("select");
        groupSelect.style.cssText = `
            width:100%;box-sizing:border-box;padding:8px 11px;
            background:#1a1a1a;border:1px solid #444;color:#fff;
            border-radius:5px;font-size:13px;margin-bottom:14px;outline:none;
            transition:border-color .15s;
        `;

        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = `📋 ${t("root")}`;
        rootOption.selected = !currentGroupId;
        groupSelect.appendChild(rootOption);

        const buildGroupOptions = (parentId = null, depth = 0) => {
            Object.entries(groups)
                .filter(([, group]) => group.parent === parentId)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .forEach(([groupId, group]) => {
                    const option = document.createElement("option");
                    option.value = groupId;
                    option.textContent = "  ".repeat(depth) + group.name;
                    option.selected = groupId === currentGroupId;
                    groupSelect.appendChild(option);
                    buildGroupOptions(groupId, depth + 1);
                });
        };
        buildGroupOptions();

        groupSelect.addEventListener("focus", () => groupSelect.style.borderColor = "#0066cc");
        groupSelect.addEventListener("blur", () => groupSelect.style.borderColor = "#444");
        box.appendChild(groupSelect);

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

        const close = result => {
            overlay.remove();
            resolve(result);
        };

        cancelBtn.addEventListener("click", () => close(null));
        confirmBtn.addEventListener("click", () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert(t("enterWorkflowName"));
                return;
            }
            close({ name, groupId: groupSelect.value || null });
        });

        overlay.addEventListener("click", event => { if (event.target === overlay) close(null); });
        nameInput.addEventListener("keydown", event => {
            if (event.key === "Enter") confirmBtn.click();
            if (event.key === "Escape") close(null);
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(confirmBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        setTimeout(() => nameInput.focus(), 30);
    });
}
