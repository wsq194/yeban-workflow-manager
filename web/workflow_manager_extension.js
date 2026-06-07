import { app } from "../../scripts/app.js";
import { t } from "./i18n.js";
import { API } from "./api.js";
import { WorkflowPanel } from "./components/Drawer.js";
import { captureCanvasThumbnail, getActiveTabName } from "./utils.js";

const tabWorkflowMap = new Map();
let panel = null;

function getActiveTabId() {
    try {
        const workflow = app.extensionManager?.workflow;
        return workflow?.activeWorkflow?.filename ?? null;
    } catch {
        return null;
    }
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
            const currentTabName = getActiveTabName() || mapped.name;
            const res = await API.save(currentTabName, JSON.stringify(workflowData), mapped.group_id || null);
            if (res.status !== "success") return;

            const dataUrl = captureCanvasThumbnail();
            if (dataUrl) await API.saveThumbnail(res.workflow_id, dataUrl);

            tabWorkflowMap.set(tabId, { ...mapped, workflow_id: res.workflow_id, name: currentTabName });
            const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            panel?.setStatus(`🔄 ${t("autoSaved")}: ${time}`);
            panel?.loadData();
        } catch (error) {
            console.error("[yeban-WM] auto save failed:", error);
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
            title: t("workflowManager"),
            tooltip: t("workflowManagerTooltip"),
            type: "custom",
            render(el) {
                panel = new WorkflowPanel(el, {
                    onSaved: ({ workflow_id, name, group_id }) => {
                        const tabId = getActiveTabId();
                        if (tabId) {
                            tabWorkflowMap.set(tabId, { workflow_id, name, group_id });
                        }
                    },
                });
            },
        });

        try {
            app.addEventListener("graphCleared", () => {
                const tabId = getActiveTabId();
                if (tabId && !tabWorkflowMap.has(tabId)) {
                    tabWorkflowMap.set(tabId, { name: tabId, group_id: null, workflow_id: null });
                }
            });
        } catch (error) {
            console.warn("[yeban-WM] graphCleared listener failed, skipped:", error);
        }

        startAutoSave(60_000);
        console.log("[yeban-WM] extension loaded");
    },
});
