let currentMenu = null;

export function showContextMenu(e, items) {
    closeContextMenu();

    const menu = document.createElement("div");
    menu.style.cssText = `
        position:fixed;left:${e.clientX}px;top:${e.clientY}px;
        background:#242424;border:1px solid #3a3a3a;border-radius:7px;
        z-index:99998;min-width:160px;overflow:hidden;
        box-shadow:0 6px 24px rgba(0,0,0,.7);padding:4px 0;
    `;

    items.forEach(item => {
        if (item === "divider") {
            const hr = document.createElement("div");
            hr.style.cssText = "height:1px;background:#333;margin:4px 0;";
            menu.appendChild(hr);
            return;
        }

        const btn = document.createElement("div");
        btn.style.cssText = `
            padding:9px 16px;cursor:pointer;font-size:13px;
            color:${item.danger ? "#e74c3c" : "#ccc"};
            display:flex;align-items:center;gap:8px;
        `;
        btn.innerHTML = `<span style="width:16px;text-align:center">${item.icon || ""}</span><span>${item.label}</span>`;
        btn.addEventListener("mouseenter", () => btn.style.background = "#333");
        btn.addEventListener("mouseleave", () => btn.style.background = "");
        btn.addEventListener("click", () => {
            closeContextMenu();
            item.action?.();
        });
        menu.appendChild(btn);
    });

    // 防止超出屏幕
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right  > window.innerWidth)  menu.style.left = `${e.clientX - rect.width}px`;
    if (rect.bottom > window.innerHeight) menu.style.top  = `${e.clientY - rect.height}px`;

    currentMenu = menu;
    setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 0);
}

export function closeContextMenu() {
    currentMenu?.remove();
    currentMenu = null;
}
