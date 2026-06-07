import { t } from "../i18n.js";
import { WorkflowItem } from "./WorkflowItem.js";

export class WorkflowList {
    constructor(container, opts = {}) {
        this.container = container;
        this.opts = opts;
        this.workflows = {};
        this.groups = {};
        this.currentGroup = null;
        this.query = "";
    }

    setData(workflows, groups) {
        this.workflows = workflows;
        this.groups = groups;
        this.render();
    }

    setGroup(groupId) {
        this.currentGroup = groupId;
        this.render();
    }

    setQuery(q) {
        this.query = q.toLowerCase();
        this.render();
    }

    render() {
        this.container.innerHTML = "";

        let entries = Object.values(this.workflows);

        if (this.currentGroup === "__starred__") {
            entries = entries.filter(w => w.starred);
        } else if (this.currentGroup) {
            entries = entries.filter(w => w.group === this.currentGroup);
        } else {
            entries = entries.filter(w => !w.group);
        }

        if (this.query) {
            entries = entries.filter(w =>
                w.name.toLowerCase().includes(this.query) ||
                w.tags?.some(tag => tag.toLowerCase().includes(this.query))
            );
        }

        if (entries.length === 0) {
            this.container.innerHTML = `
                <div style="
                    color:#444;text-align:center;
                    padding:60px 20px;font-size:13px;
                ">${t("noWorkflows")}</div>
            `;
            return;
        }

        entries.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));

        entries.forEach(wf => {
            const item = new WorkflowItem(wf, this.groups, {
                onLoad: this.opts.onLoad,
                onRefresh: this.opts.onRefresh,
                onShowVersions: this.opts.onShowVersions,
            });
            this.container.appendChild(item.render());
        });
    }
}
