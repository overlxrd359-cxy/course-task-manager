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
  statusRadios.forEach(r => { if (r.checked) status = r.value; });

  const importance = [];
  importanceCheckboxes.forEach(cb => { if (cb.checked) importance.push(cb.value); });

  const subjectCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]');
  const subjects = [];
  subjectCbs.forEach(cb => { if (cb.checked) subjects.push(cb.value); });

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

  if (f.search) {
    tasks = tasks.filter(t =>
      t.subject.toLowerCase().includes(f.search) ||
      t.content.toLowerCase().includes(f.search)
    );
  }

  if (f.status === 'completed') {
    tasks = tasks.filter(t => t.completed);
  } else if (f.status === 'incomplete') {
    tasks = tasks.filter(t => !t.completed);
  }

  if (f.importance.length > 0) {
    tasks = tasks.filter(t => f.importance.includes(t.importance));
  }

  if (f.subjects.length > 0) {
    tasks = tasks.filter(t => f.subjects.includes(t.subject));
  }

  // 排序：置顶优先 → 完成靠后 → DDL 升序
  tasks.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.ddl < b.ddl) return -1;
    if (a.ddl > b.ddl) return 1;
    return 0;
  });

  return tasks;
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
  if (!ddl) return null;
  return new Date(ddl + 'T00:00:00');
}

function isOverdue(ddl) {
  if (!ddl) return false;
  const due = parseDdl(ddl);
  if (!due) return false;
  return due < getToday();
}

function formatDate(ddl) {
  if (!ddl) return '';
  const d = parseDdl(ddl);
  if (!d || isNaN(d.getTime())) return ddl;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const week = ['日','一','二','三','四','五','六'][d.getDay()];
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

// ===== 渲染 =====
function renderOneCard(t, color) {
  const overdue = !t.completed && isOverdue(t.ddl);
  const ddlDisplay = formatDate(t.ddl);
  const ddlEmoji = overdue ? '⚠️' : '⏰';
  const imageHtml = t.image ? `<img class="task-image" src="/static/uploads/${escapeHtml(t.image)}" alt="作业图片" onclick="window.open('/static/uploads/${escapeHtml(t.image)}')">` : '';
  return `
    <div class="task-card ${t.pinned ? 'pinned' : ''} ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <div class="task-top-row">
        <span class="subject-tag" style="background:${color};">${escapeHtml(t.subject)}</span>
        <span class="importance-tag importance-${t.importance}">${importanceLabel(t.importance)}</span>
      </div>
      <div class="task-content">${escapeHtml(t.content)}</div>
      ${imageHtml}
      <div class="task-meta">
        <span class="task-ddl ${overdue ? 'overdue' : ''}">${ddlEmoji} DDL: ${ddlDisplay}${overdue ? ' (已过期)' : ''}</span>
        ${t.pinned ? '<span class="task-pin-badge">📌 置顶</span>' : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-secondary btn-toggle-complete" data-id="${t.id}">
          ${t.completed ? '↩️ 撤销' : '✅ 完成'}
        </button>
        <button class="btn btn-sm btn-secondary btn-toggle-pin" data-id="${t.id}">
          ${t.pinned ? '📌 取消置顶' : '📌 置顶'}
        </button>
        <button class="btn btn-sm btn-danger btn-delete-task" data-id="${t.id}">🗑️ 删除</button>
      </div>
    </div>
  `;
}

function renderTaskList(tasks, colors, groupBy) {
  if (tasks.length === 0) {
    taskList.innerHTML = '';
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');

  if (groupBy) {
    const grouped = {};
    tasks.forEach(t => {
      if (!grouped[t.subject]) grouped[t.subject] = [];
      grouped[t.subject].push(t);
    });

    const sortedSubjects = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    taskList.innerHTML = sortedSubjects.map(subject => {
      const groupCards = grouped[subject].map(t => renderOneCard(t, colors[subject] || '#888')).join('');
      const subjectColor = colors[subject] || '#888';
      return `
        <div class="subject-group-header" style="border-bottom-color: ${subjectColor}">
          ${escapeHtml(subject)} <span style="font-size:12px;color:var(--color-text-secondary);font-weight:400;">(${grouped[subject].length})</span>
        </div>
        ${groupCards}
      `;
    }).join('');
  } else {
    taskList.innerHTML = tasks.map(t => renderOneCard(t, colors[t.subject] || '#888')).join('');
  }

  // 绑定事件
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
  const f = getFilterState();
  const visible = applyFilters(allTasks);
  const subjects = [...new Set(visible.map(t => t.subject))].sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const currentCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]');
  const checkedMap = {};
  currentCbs.forEach(cb => { checkedMap[cb.value] = cb.checked; });

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
    cb.addEventListener('change', render);
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
    allTasks = tasksRes.data;
    subjectColors = colorsRes.data;
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
  const imageFile = formImage.files[0];
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
  if (res.ok) loadAndRender();
}

async function togglePin(id) {
  const res = await apiPut(`/tasks/${encodeURIComponent(id)}/toggle-pin`);
  if (res.ok) loadAndRender();
}

async function deleteTask(id) {
  const res = await apiDelete(`/tasks/${encodeURIComponent(id)}`);
  if (res.ok) loadAndRender();
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
  deleteTargetId = id;
  const card = document.querySelector(`[data-id="${id}"]`);
  const subject = card ? card.querySelector('.subject-tag').textContent : '';
  const content = card ? card.querySelector('.task-content').textContent : '';
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
  if (!formSubject.value.trim()) return false;
  if (!formContent.value.trim()) return false;
  if (!formDdl.value) return false;
  return true;
}

// ===== 事件监听 =====
btnAdd.addEventListener('click', openModal);
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

btnSubmit.addEventListener('click', handleFormSubmit);

formImage.addEventListener('change', () => {
  const file = formImage.files[0];
  imagePreview.innerHTML = '';
  imagePreview.classList.remove('visible');
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
      imagePreview.classList.add('visible');
    };
    reader.readAsDataURL(file);
  }
});

btnConfirmCancel.addEventListener('click', hideDeleteConfirm);
confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) hideDeleteConfirm();
});
btnConfirmDelete.addEventListener('click', () => {
  if (deleteTargetId) {
    deleteTask(deleteTargetId);
    hideDeleteConfirm();
  }
});

btnOverdueCancel.addEventListener('click', hideOverdueConfirm);
overdueOverlay.addEventListener('click', (e) => {
  if (e.target === overdueOverlay) hideOverdueConfirm();
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
filterGroupBy.addEventListener('change', () => {
  render();
});

statusRadios.forEach(radio => {
  radio.addEventListener('change', render);
});

importanceCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    render();
    updateSubjectFilters();
  });
});

// 搜索：防抖 300ms
let searchTimer = null;
searchInput.addEventListener('input', () => {
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
    } else if (confirmOverlay.classList.contains('visible')) {
      hideDeleteConfirm();
    } else if (modalOverlay.classList.contains('visible')) {
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
