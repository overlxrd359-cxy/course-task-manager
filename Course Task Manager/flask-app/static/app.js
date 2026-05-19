"use strict";
// ===== 数据层 =====
const API_BASE = '/api';
async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    return res.json();
}
async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}
async function apiUpload(path, formData) {
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        body: formData,
    });
    return res.json();
}
async function apiPut(path) {
    const res = await fetch(API_BASE + path, { method: 'PUT' });
    return res.json();
}
async function apiDelete(path) {
    const res = await fetch(API_BASE + path, { method: 'DELETE' });
    return res.json();
}
// ===== DOM 引用 =====
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const btnAdd = document.getElementById('btn-add');
const subjectFilterList = document.getElementById('subject-filter-list');
const filterGroupBy = document.getElementById('filter-group-by');
const statusRadios = document.querySelectorAll('input[name="status"]');
const importanceCheckboxes = document.querySelectorAll('.filter-importance');
const statsBar = document.getElementById('stats-bar');
const modalOverlay = document.getElementById('modal-overlay');
const formSubject = document.getElementById('form-subject');
const formContent = document.getElementById('form-content');
const formDdl = document.getElementById('form-ddl');
const formImportance = document.getElementById('form-importance');
const formImage = document.getElementById('form-image');
const imagePreview = document.getElementById('image-preview');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmTaskInfo = document.getElementById('confirm-task-info');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const overdueOverlay = document.getElementById('overdue-overlay');
const overdueTaskInfo = document.getElementById('overdue-task-info');
const btnOverdueConfirm = document.getElementById('btn-overdue-confirm');
const btnOverdueCancel = document.getElementById('btn-overdue-cancel');
let deleteTargetId = null;
let pendingTask = null;
let allTasks = [];
let subjectColors = {};
// ===== 筛选状态 =====
function getFilterState() {
    let status = 'all';
    statusRadios.forEach((r) => { if (r.checked)
        status = r.value; });
    const importance = [];
    importanceCheckboxes.forEach((cb) => { if (cb.checked)
        importance.push(cb.value); });
    const subjectCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]');
    const subjects = [];
    subjectCbs.forEach((cb) => { if (cb.checked)
        subjects.push(cb.value); });
    return {
        groupBy: filterGroupBy.checked,
        status,
        importance,
        subjects,
        search: searchInput.value.trim().toLowerCase(),
    };
}
// ===== 筛选逻辑 =====
function applyFilters(tasks) {
    const f = getFilterState();
    let filtered = tasks;
    if (f.search) {
        filtered = filtered.filter(t => t.subject.toLowerCase().includes(f.search) ||
            t.content.toLowerCase().includes(f.search));
    }
    if (f.status === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }
    else if (f.status === 'incomplete') {
        filtered = filtered.filter(t => !t.completed);
    }
    if (f.importance.length > 0) {
        filtered = filtered.filter(t => f.importance.includes(t.importance));
    }
    if (f.subjects.length > 0) {
        filtered = filtered.filter(t => f.subjects.includes(t.subject));
    }
    filtered.sort((a, b) => {
        if (a.pinned !== b.pinned)
            return a.pinned ? -1 : 1;
        if (a.completed !== b.completed)
            return a.completed ? 1 : -1;
        if (a.ddl < b.ddl)
            return -1;
        if (a.ddl > b.ddl)
            return 1;
        return 0;
    });
    return filtered;
}
// ===== 工具函数 =====
function getToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}
function getMaxDate() {
    const today = new Date();
    const y = today.getFullYear() + 100;
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function parseDdl(ddl) {
    if (!ddl)
        return null;
    return new Date(ddl + 'T00:00:00');
}
function isOverdue(ddl) {
    if (!ddl)
        return false;
    const due = parseDdl(ddl);
    if (!due)
        return false;
    return due < getToday();
}
function formatDate(ddl) {
    if (!ddl)
        return '';
    const d = parseDdl(ddl);
    if (!d || isNaN(d.getTime()))
        return ddl;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${y}-${m}-${day} (周${week})`;
}
function importanceLabel(level) {
    const map = { high: '🔥 高', medium: '⚡ 中', low: '🌱 低' };
    return map[level] || '⚡ 中';
}
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
// ===== 统计栏 =====
function renderStats(tasks) {
    const total = tasks.length;
    const incomplete = tasks.filter(t => !t.completed).length;
    const overdue = tasks.filter(t => !t.completed && isOverdue(t.ddl)).length;
    const highCount = tasks.filter(t => t.importance === 'high').length;
    const mediumCount = tasks.filter(t => t.importance === 'medium').length;
    const lowCount = tasks.filter(t => t.importance === 'low').length;
    const f = getFilterState();
    const activeStatus = f.status !== 'all' ? f.status : '';
    const activeImportance = f.importance.length === 1 ? f.importance[0] : '';
    statsBar.innerHTML = `
    <div class="stat-card ${!activeStatus && !activeImportance ? 'active' : ''}" data-stat="all">
      <div class="text-2xl mb-0.5">📋</div>
      <div class="text-xl font-bold text-text-primary">${total}</div>
      <div class="text-[11px] text-text-secondary">全部作业</div>
    </div>
    <div class="stat-card ${activeStatus === 'incomplete' ? 'active' : ''}" data-stat="incomplete">
      <div class="text-2xl mb-0.5">📝</div>
      <div class="text-xl font-bold text-text-primary">${incomplete}</div>
      <div class="text-[11px] text-text-secondary">未完成</div>
    </div>
    <div class="stat-card border-l-high ${activeStatus === 'incomplete' && overdue > 0 ? '!border-l-high' : ''}" data-stat="overdue">
      <div class="text-2xl mb-0.5">⚠️</div>
      <div class="text-xl font-bold ${overdue > 0 ? 'text-high' : 'text-text-primary'}">${overdue}</div>
      <div class="text-[11px] text-text-secondary">已过期</div>
    </div>
    <div class="stat-card ${activeImportance === 'high' ? 'active' : ''}" data-stat="importance-high">
      <div class="text-2xl mb-0.5">🔥</div>
      <div class="text-xl font-bold text-text-primary">${highCount}</div>
      <div class="text-[11px] text-text-secondary">高重要性</div>
    </div>
    <div class="stat-card ${activeImportance === 'medium' ? 'active' : ''}" data-stat="importance-medium">
      <div class="text-2xl mb-0.5">⚡</div>
      <div class="text-xl font-bold text-text-primary">${mediumCount}</div>
      <div class="text-[11px] text-text-secondary">中重要性</div>
    </div>
    <div class="stat-card ${activeImportance === 'low' ? 'active' : ''}" data-stat="importance-low">
      <div class="text-2xl mb-0.5">🌱</div>
      <div class="text-xl font-bold text-text-primary">${lowCount}</div>
      <div class="text-[11px] text-text-secondary">低重要性</div>
    </div>
  `;
    // 统计卡片点击 → 设置筛选
    statsBar.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const stat = card.dataset.stat;
            handleStatClick(stat || '');
        });
    });
}
function handleStatClick(stat) {
    // 重置筛选
    importanceCheckboxes.forEach((cb) => { cb.checked = false; });
    if (stat === 'all') {
        statusRadios.forEach((r) => { r.checked = r.value === 'all'; });
    }
    else if (stat === 'incomplete') {
        statusRadios.forEach((r) => { r.checked = r.value === 'incomplete'; });
    }
    else if (stat === 'overdue') {
        statusRadios.forEach((r) => { r.checked = r.value === 'incomplete'; });
        // 过期是"未完成+已过期"的快捷方式，不需要额外设置
    }
    else if (stat === 'importance-high') {
        importanceCheckboxes.forEach((cb) => { cb.checked = cb.value === 'high'; });
        statusRadios.forEach((r) => { r.checked = r.value === 'all'; });
    }
    else if (stat === 'importance-medium') {
        importanceCheckboxes.forEach((cb) => { cb.checked = cb.value === 'medium'; });
        statusRadios.forEach((r) => { r.checked = r.value === 'all'; });
    }
    else if (stat === 'importance-low') {
        importanceCheckboxes.forEach((cb) => { cb.checked = cb.value === 'low'; });
        statusRadios.forEach((r) => { r.checked = r.value === 'all'; });
    }
    render();
    updateSubjectFilters();
}
// ===== 渲染 =====
function renderOneCard(t, color) {
    const overdue = !t.completed && isOverdue(t.ddl);
    const ddlDisplay = formatDate(t.ddl);
    const ddlEmoji = overdue ? '⚠️' : '⏰';
    const imageHtml = t.image
        ? `<img class="task-image" src="/static/uploads/${escapeHtml(t.image)}" alt="作业图片" onclick="window.open('/static/uploads/${escapeHtml(t.image)}')">`
        : '';
    return `
    <div class="task-card ${t.pinned ? 'pinned' : ''} ${t.completed ? 'completed' : ''} hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" data-id="${t.id}">
      <div class="flex items-center justify-between gap-2">
        <span class="subject-tag" style="background:${color};">${escapeHtml(t.subject)}</span>
        <span class="importance-tag importance-${t.importance}">${importanceLabel(t.importance)}</span>
      </div>
      <div class="content-text">${escapeHtml(t.content)}</div>
      ${imageHtml}
      <div class="flex items-center gap-3 text-[13px]">
        <span class="task-ddl ${overdue ? 'overdue' : ''}">${ddlEmoji} DDL: ${ddlDisplay}${overdue ? ' (已过期)' : ''}</span>
        ${t.pinned ? '<span class="pin-badge">📌 置顶</span>' : ''}
      </div>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-secondary btn-toggle-complete active:scale-95" data-id="${t.id}">
          ${t.completed ? '↩️ 撤销' : '✅ 完成'}
        </button>
        <button class="btn btn-sm btn-secondary btn-toggle-pin active:scale-95" data-id="${t.id}">
          ${t.pinned ? '📌 取消置顶' : '📌 置顶'}
        </button>
        <button class="btn btn-sm btn-danger btn-delete-task active:scale-95" data-id="${t.id}">🗑️ 删除</button>
      </div>
    </div>
  `;
}
function renderTaskList(tasks, colors, groupBy) {
    if (tasks.length === 0) {
        taskList.innerHTML = '';
        statsBar.innerHTML = '';
        emptyState.classList.add('visible');
        return;
    }
    emptyState.classList.remove('visible');
    renderStats(allTasks);
    if (groupBy) {
        const grouped = {};
        tasks.forEach(t => {
            if (!grouped[t.subject])
                grouped[t.subject] = [];
            grouped[t.subject].push(t);
        });
        const sortedSubjects = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        taskList.innerHTML = sortedSubjects.map(subject => {
            const groupCards = grouped[subject].map(t => renderOneCard(t, colors[subject] || '#888')).join('');
            const subjectColor = colors[subject] || '#888';
            return `
        <div class="subject-group-header" style="border-bottom: 2px solid ${subjectColor}; color: ${subjectColor};">
          ${escapeHtml(subject)} <span class="text-xs text-text-secondary font-normal">(${grouped[subject].length})</span>
        </div>
        ${groupCards}
      `;
        }).join('');
    }
    else {
        taskList.innerHTML = tasks.map(t => renderOneCard(t, colors[t.subject] || '#888')).join('');
    }
    bindCardEvents();
}
function bindCardEvents() {
    taskList.querySelectorAll('.btn-toggle-complete').forEach(btn => {
        btn.addEventListener('click', () => toggleComplete(btn.dataset.id));
    });
    taskList.querySelectorAll('.btn-toggle-pin').forEach(btn => {
        btn.addEventListener('click', () => togglePin(btn.dataset.id));
    });
    taskList.querySelectorAll('.btn-delete-task').forEach(btn => {
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id));
    });
}
function updateSubjectFilters() {
    const visible = applyFilters(allTasks);
    const subjects = [...new Set(visible.map(t => t.subject))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const currentCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]');
    const checkedMap = {};
    currentCbs.forEach((cb) => { checkedMap[cb.value] = cb.checked; });
    subjectFilterList.innerHTML = subjects.map(s => {
        const checked = checkedMap[s] !== undefined ? checkedMap[s] : false;
        return `
      <label class="subject-filter-item">
        <input type="checkbox" class="filter-subject" value="${escapeHtml(s)}" ${checked ? 'checked' : ''}>
        ${escapeHtml(s)}
      </label>
    `;
    }).join('');
    subjectFilterList.querySelectorAll('.filter-subject').forEach(cb => {
        cb.addEventListener('change', () => {
            render();
            updateSubjectFilters();
        });
    });
}
function render() {
    const f = getFilterState();
    const filtered = applyFilters(allTasks);
    renderTaskList(filtered, subjectColors, f.groupBy);
}
// ===== 操作 =====
async function loadAndRender() {
    const tasksRes = await apiGet('/tasks');
    const colorsRes = await apiGet('/subject-colors');
    if (tasksRes.ok && colorsRes.ok) {
        allTasks = tasksRes.data || [];
        subjectColors = colorsRes.data || {};
        updateSubjectFilters();
        render();
    }
}
async function addTask(task) {
    await apiPost('/subject-colors', { subject: task.subject });
    const res = await apiPost('/tasks', task);
    if (!res.ok) {
        alert(res.error || '添加失败');
        return null;
    }
    return res.data.id;
}
async function uploadImage(taskId, file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiUpload(`/tasks/${encodeURIComponent(taskId)}/image`, formData);
    if (!res.ok) {
        alert(res.error || '图片上传失败');
    }
}
async function handleFormSubmit() {
    if (!validateForm()) {
        alert('请填写科目、具体内容和截止日期');
        return;
    }
    const task = {
        subject: formSubject.value.trim(),
        content: formContent.value.trim(),
        ddl: formDdl.value,
        importance: formImportance.value,
    };
    if (isOverdue(task.ddl)) {
        pendingTask = task;
        overdueTaskInfo.textContent = `截止日期为 ${formatDate(task.ddl)}，已经过期。是否仍要添加？`;
        overdueOverlay.classList.add('visible');
        return;
    }
    await submitTask(task);
}
async function submitTask(task) {
    var _a;
    const imageFile = (_a = formImage.files) === null || _a === void 0 ? void 0 : _a[0];
    const taskId = await addTask(task);
    if (taskId && imageFile) {
        await uploadImage(taskId, imageFile);
    }
    if (taskId) {
        closeModal();
        loadAndRender();
    }
}
async function toggleComplete(id) {
    const res = await apiPut(`/tasks/${encodeURIComponent(id)}/toggle-complete`);
    if (res.ok)
        loadAndRender();
}
async function togglePin(id) {
    const res = await apiPut(`/tasks/${encodeURIComponent(id)}/toggle-pin`);
    if (res.ok)
        loadAndRender();
}
async function deleteTask(id) {
    const res = await apiDelete(`/tasks/${encodeURIComponent(id)}`);
    if (res.ok)
        loadAndRender();
}
// ===== 弹窗控制 =====
function openModal() {
    formSubject.value = '';
    formContent.value = '';
    formDdl.value = '';
    formDdl.max = getMaxDate();
    formImportance.value = 'medium';
    formImage.value = '';
    imagePreview.innerHTML = '';
    imagePreview.classList.remove('visible');
    modalOverlay.classList.add('visible');
    formSubject.focus();
}
function closeModal() {
    modalOverlay.classList.remove('visible');
}
function showDeleteConfirm(id) {
    var _a, _b;
    deleteTargetId = id;
    const card = document.querySelector(`[data-id="${id}"]`);
    const subject = card ? ((_a = card.querySelector('.subject-tag')) === null || _a === void 0 ? void 0 : _a.textContent) || '' : '';
    const content = card ? ((_b = card.querySelector('.content-text')) === null || _b === void 0 ? void 0 : _b.textContent) || '' : '';
    confirmTaskInfo.textContent = `${subject} - ${content}`;
    confirmOverlay.classList.add('visible');
}
function hideDeleteConfirm() {
    confirmOverlay.classList.remove('visible');
    deleteTargetId = null;
}
function hideOverdueConfirm() {
    overdueOverlay.classList.remove('visible');
    pendingTask = null;
}
// ===== 表单验证 =====
function validateForm() {
    if (!formSubject.value.trim())
        return false;
    if (!formContent.value.trim())
        return false;
    if (!formDdl.value)
        return false;
    return true;
}
// ===== 事件监听 =====
btnAdd.addEventListener('click', openModal);
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay)
        closeModal();
});
btnSubmit.addEventListener('click', handleFormSubmit);
formImage.addEventListener('change', () => {
    var _a;
    const file = (_a = formImage.files) === null || _a === void 0 ? void 0 : _a[0];
    imagePreview.innerHTML = '';
    imagePreview.classList.remove('visible');
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            imagePreview.innerHTML = `<img src="${(_a = e.target) === null || _a === void 0 ? void 0 : _a.result}" alt="预览">`;
            imagePreview.classList.add('visible');
        };
        reader.readAsDataURL(file);
    }
});
btnConfirmCancel.addEventListener('click', hideDeleteConfirm);
confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay)
        hideDeleteConfirm();
});
btnConfirmDelete.addEventListener('click', () => {
    if (deleteTargetId) {
        deleteTask(deleteTargetId);
        hideDeleteConfirm();
    }
});
btnOverdueCancel.addEventListener('click', hideOverdueConfirm);
overdueOverlay.addEventListener('click', (e) => {
    if (e.target === overdueOverlay)
        hideOverdueConfirm();
});
btnOverdueConfirm.addEventListener('click', () => {
    if (pendingTask) {
        const task = pendingTask;
        pendingTask = null;
        overdueOverlay.classList.remove('visible');
        submitTask(task);
    }
});
// 筛选事件
filterGroupBy.addEventListener('change', render);
statusRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        render();
        updateSubjectFilters();
    });
});
importanceCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        render();
        updateSubjectFilters();
    });
});
// 搜索
let searchTimer = null;
searchInput.addEventListener('input', () => {
    if (searchTimer)
        clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        render();
        updateSubjectFilters();
    }, 300);
});
// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (overdueOverlay.classList.contains('visible')) {
            hideOverdueConfirm();
        }
        else if (confirmOverlay.classList.contains('visible')) {
            hideDeleteConfirm();
        }
        else if (modalOverlay.classList.contains('visible')) {
            closeModal();
        }
    }
    if (e.key === 'Enter' && modalOverlay.classList.contains('visible') &&
        !overdueOverlay.classList.contains('visible') && !confirmOverlay.classList.contains('visible')) {
        btnSubmit.click();
    }
});
// ===== 初始加载 =====
loadAndRender();
//# sourceMappingURL=app.js.map