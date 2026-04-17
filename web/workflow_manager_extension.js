import { app } from "../../scripts/app.js";
import { API } from "./api.js";
import { WorkflowPanel } from "./components/Drawer.js";
import { captureCanvasThumbnail } from "./utils.js";

const tabWorkflowMap = new Map();
let panel = null;

function getActiveTabId() {
    try {
        const wf = app.extensionManager?.workflow;
        return wf?.activeWorkflow?.filename ?? null;
    } catch { return null; }
}

function waitFor(fn) {
    return new Promise(resolve => {
        const check = () => fn() ? resolve() : setTimeout(check, 100);
        check();
    });
}

function startAutoSave(intervalMs) {
    setInterval(async () => {
        const tabId = getActiveTabId();
        if (!tabId) return;
        const mapped = tabWorkflowMap.get(tabId);
        if (!mapped?.name) return;
        try {
            const workflowData = app.graph.serialize();
            const res = await API.save(mapped.name, JSON.stringify(workflowData), mapped.group_id || null, "auto");
            if (res.status !== "success") return;
            const dataUrl = captureCanvasThumbnail();
            if (dataUrl) await API.saveThumbnail(res.workflow_id, dataUrl);
            tabWorkflowMap.set(tabId, { ...mapped, workflow_id: res.workflow_id });
            const t = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
            panel?.setStatus(`自动保存: ${t}`);
            panel?.loadData();
        } catch (e) {
            console.error("[yeban-WM] 自动保存失败:", e);
        }
    }, intervalMs);
}

app.registerExtension({
    name: "yeban.WorkflowManager",

    async setup() {
        await waitFor(() => app.extensionManager?.registerSidebarTab);

        app.extensionManager.registerSidebarTab({
            id: "yeban-workflow-manager",
            icon: "pi pi-folder-open",
            title: "工作流管理",
            tooltip: "工作流管理器",
            type: "custom",
            render(el) {
                panel = new WorkflowPanel(el, {
                    onSaved: ({ workflow_id, name, group_id }) => {
                        const tabId = getActiveTabId();
                        if (tabId) {
                            tabWorkflowMap.set(tabId, { workflow_id, name, group_id });
                        }
                    }
                });
            }
        });

        try {
            app.addEventListener("graphCleared", () => {
                const tabId = getActiveTabId();
                if (tabId && !tabWorkflowMap.has(tabId)) {
                    tabWorkflowMap.set(tabId, { name: tabId, group_id: null, workflow_id: null });
                }
            });
        } catch (e) {
            console.warn("[yeban-WM] graphCleared 监听失败，跳过:", e);
        }

        startAutoSave(60_000);
        console.log("[yeban-WM] 插件加载完成");
    },
});