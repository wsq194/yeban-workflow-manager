const BASE = "/api/yeban-wm";

async function post(path, body = {}) {
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return res.json();
}

export const API = {
    // workflows
    list:          ()                              => post("/list"),
    save: (workflow_name, workflow_data, group_id, source = "manual") =>
    post("/save", { workflow_name, workflow_data, group_id, source }),
    load:          (workflow_id)                   => post("/load", { workflow_id }),
    delete:        (workflow_id)                   => post("/delete", { workflow_id }),
    rename:        (workflow_id, new_name)         => post("/rename", { workflow_id, new_name }),
    move:          (workflow_id, target_group_id)  => post("/move", { workflow_id, target_group_id }),
    copy:          (workflow_id, target_group_id, new_name) => post("/copy", { workflow_id, target_group_id, new_name }),
    backup:        (workflow_id)                   => post("/backup", { workflow_id }),
    import:        (import_path, workflow_name, group_id) => post("/import", { import_path, workflow_name, group_id }),
    toggleStar:    (workflow_id)                   => post("/toggle-star", { workflow_id }),
    updateTags:    (workflow_id, tags)             => post("/update-tags", { workflow_id, tags }),
    search:        (query)                         => post("/search", { query }),

    // thumbnail
    saveThumbnail: (workflow_id, data_url)         => post("/save-thumbnail", { workflow_id, data_url }),
    thumbnailUrl:  (workflow_id)                   => `${BASE}/thumbnail/${workflow_id}`,

    // groups
    createGroup:   (name, parent_group_id)         => post("/create-group", { name, parent_group_id }),
    deleteGroup:   (group_id)                      => post("/delete-group", { group_id }),
    renameGroup:   (group_id, new_name)            => post("/rename-group", { group_id, new_name }),

    // versions
    listVersions:   (workflow_id)                  => post("/versions/list", { workflow_id }),
    restoreVersion: (workflow_id, version_filename) => post("/versions/restore", { workflow_id, version_filename }),
};
