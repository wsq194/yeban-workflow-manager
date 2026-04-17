import { WorkflowItem } from "./WorkflowItem.js";

export class WorkflowList {
    /**
     * @param {HTMLElement} container
     * @param {object} opts
     *   opts.onLoad(id)
     *   opts.onRefresh()
     *   opts.onShowVersions(id, name)
     */
    constructor(container, opts = {}) {
        this.container = container;
        this.opts      = opts;
        this.workflows = {};
        this.groups    = {};
        this.currentGroup = null;
        this.query     = "";
    }

    setData(workflows, groups) {
        this.workflows = workflows;
        this.groups    = groups;
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

        // 过滤分组
        if (this.currentGroup === "__starred__") {
            entries = entries.filter(w => w.starred);
        } else if (this.currentGroup) {
            entries = entries.filter(w => w.group === this.currentGroup);
        } else {
            // null = 根目录（无分组）
            entries = entries.filter(w => !w.group);
        }

        // 搜索过滤
        if (this.query) {
            entries = entries.filter(w =>
                w.name.toLowerCase().includes(this.query) ||
                w.tags?.some(t => t.toLowerCase().includes(this.query))
            );
        }

        if (entries.length === 0) {
            this.container.innerHTML = `
                <div style="
                    color:#444;text-align:center;
                    padding:60px 20px;font-size:13px;
                ">暂无工作流</div>
            `;
            return;
        }

        // 按修改时间倒序
        entries.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));

        entries.forEach(wf => {
            const item = new WorkflowItem(wf, this.groups, {
                onLoad:         this.opts.onLoad,
                onRefresh:      this.opts.onRefresh,
                onShowVersions: this.opts.onShowVersions,
            });
            this.container.appendChild(item.render());
        });
    }
}
