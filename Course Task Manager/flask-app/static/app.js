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

const modalOverlay = document.getElementById('modal-overlay');
const formSubject = document.getElementById('form-subject');
const formContent = document.getElementById('form-content');
const formDdl = document.getElementById('form-ddl');
const formImportance = document.getElementById('form-importance');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmTaskInfo = document.getElementById('confirm-task-info');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');

let deleteTargetId = null;

// ===== 渲染 =====
function isOverdue(ddl) {
  if (!ddl) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(ddl + 'T00:00:00');
  return due < today;
}

function formatDate(ddl) {
  if (!ddl) return '';
  const d = new Date(ddl + 'T00:00:00');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const week = ['日','一','二','三','四','五','六'][d.getDay()];
  return `${y}-${m}-${day} (周${week})`;
}

function importanceLabel(level) {
  const map = { high: '高', medium: '中', low: '低' };
  return map[level] || '中';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTaskList(tasks, subjectColors) {
  if (tasks.length === 0) {
    taskList.innerHTML = '';
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');
  taskList.innerHTML = tasks.map(t => {
    const overdue = !t.completed && isOverdue(t.ddl);
    const color = subjectColors[t.subject] || '#888';
    return `
      <div class="task-card ${t.pinned ? 'pinned' : ''} ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <div class="task-top-row">
          <span class="subject-tag" style="background:${color};">${escapeHtml(t.subject)}</span>
          <span class="importance-tag importance-${t.importance}">${importanceLabel(t.importance)}</span>
        </div>
        <div class="task-content">${escapeHtml(t.content)}</div>
        <div class="task-meta">
          <span class="task-ddl ${overdue ? 'overdue' : ''}">DDL: ${formatDate(t.ddl)}${overdue ? ' (已过期)' : ''}</span>
          ${t.pinned ? '<span class="task-pin-badge">置顶</span>' : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-sm btn-secondary btn-toggle-complete" data-id="${t.id}">
            ${t.completed ? '撤销' : '完成'}
          </button>
          <button class="btn btn-sm btn-secondary btn-toggle-pin" data-id="${t.id}">
            ${t.pinned ? '取消置顶' : '置顶'}
          </button>
          <button class="btn btn-sm btn-danger btn-delete-task" data-id="${t.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');

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

// ===== 操作 =====
async function loadAndRender() {
  const q = searchInput.value.trim();
  const tasksRes = await apiGet('/tasks' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  const colorsRes = await apiGet('/subject-colors');
  if (tasksRes.ok && colorsRes.ok) {
    renderTaskList(tasksRes.data, colorsRes.data);
  }
}

async function addTask(task) {
  // 为科目分配颜色（如果还没有）
  await apiPost('/subject-colors', { subject: task.subject });

  const res = await apiPost('/tasks', task);
  if (!res.ok) {
    alert(res.error || '添加失败');
    return;
  }
  loadAndRender();
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
  formImportance.value = 'medium';
  modalOverlay.classList.add('visible');
  formSubject.focus();
}

function closeModal() {
  modalOverlay.classList.remove('visible');
}

function showDeleteConfirm(id) {
  deleteTargetId = id;
  // 从 DOM 获取任务信息
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

btnSubmit.addEventListener('click', () => {
  if (!validateForm()) {
    alert('请填写科目、具体内容和截止日期');
    return;
  }
  addTask({
    subject: formSubject.value.trim(),
    content: formContent.value.trim(),
    ddl: formDdl.value,
    importance: formImportance.value,
  });
  closeModal();
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

// 搜索：防抖 300ms
let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadAndRender, 300);
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (confirmOverlay.classList.contains('visible')) {
      hideDeleteConfirm();
    } else if (modalOverlay.classList.contains('visible')) {
      closeModal();
    }
  }
  if (e.key === 'Enter' && modalOverlay.classList.contains('visible')) {
    btnSubmit.click();
  }
});

// ===== 初始加载 =====
loadAndRender();
