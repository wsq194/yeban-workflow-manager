export function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatVersionFilename(filename) {
    // e.g. "uuid_20240101_153000.json" → "2024/01/01 15:30:00"
    const match = filename.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (!match) return filename;
    const [, y, mo, d, h, mi, s] = match;
    return `${y}/${mo}/${d} ${h}:${mi}:${s}`;
}

/**
 * 截取当前 ComfyUI canvas 缩略图，返回 base64 data URL
 * 缩放到 320x180
 */
export function captureCanvasThumbnail() {
    try {
        const canvas = document.querySelector("canvas");
        if (!canvas) return null;
        const thumb = document.createElement("canvas");
        thumb.width  = 320;
        thumb.height = 180;
        const ctx = thumb.getContext("2d");
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, 320, 180);
        // 保持比例居中绘制
        const scale = Math.min(320 / canvas.width, 180 / canvas.height);
        const w = canvas.width  * scale;
        const h = canvas.height * scale;
        const x = (320 - w) / 2;
        const y = (180 - h) / 2;
        ctx.drawImage(canvas, x, y, w, h);
        return thumb.toDataURL("image/png");
    } catch (e) {
        console.warn("[yeban-WM] 截图失败:", e);
        return null;
    }
}

export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
