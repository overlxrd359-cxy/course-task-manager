// ===== 类型定义 =====
interface Task {
  id: string;
  subject: string;
  content: string;
  ddl: string;
  importance: 'high' | 'medium' | 'low';
  completed: boolean;
  pinned: boolean;
  image: string;
}

interface TaskInput {
  subject: string;
  content: string;
  ddl: string;
  importance: string;
}

interface SubjectColors {
  [subject: string]: string;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface FilterState {
  groupBy: boolean;
  status: 'all' | 'incomplete' | 'completed';
  importance: string[];
  subjects: string[];
  search: string;
}

// ===== 数据层 =====
const API_BASE = '/api';

async function apiGet<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(API_BASE + path);
  return res.json();
}

async function apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

async function apiPut<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(API_BASE + path, { method: 'PUT' });
  return res.json();
}

async function apiDelete<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(API_BASE + path, { method: 'DELETE' });
  return res.json();
}

// ===== DOM 引用 =====
const taskList = document.getElementById('task-list') as HTMLDivElement;
const emptyState = document.getElementById('empty-state') as HTMLDivElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const btnAdd = document.getElementById('btn-add') as HTMLButtonElement;
const subjectFilterList = document.getElementById('subject-filter-list') as HTMLDivElement;
const filterGroupBy = document.getElementById('filter-group-by') as HTMLInputElement;
const statusRadios = document.querySelectorAll('input[name="status"]') as NodeListOf<HTMLInputElement>;
const importanceCheckboxes = document.querySelectorAll('.filter-importance') as NodeListOf<HTMLInputElement>;
const statsBar = document.getElementById('stats-bar') as HTMLDivElement;

const modalOverlay = document.getElementById('modal-overlay') as HTMLDivElement;
const formSubject = document.getElementById('form-subject') as HTMLInputElement;
const formContent = document.getElementById('form-content') as HTMLInputElement;
const formDdl = document.getElementById('form-ddl') as HTMLInputElement;
const formImportance = document.getElementById('form-importance') as HTMLSelectElement;
const formImage = document.getElementById('form-image') as HTMLInputElement;
const imagePreview = document.getElementById('image-preview') as HTMLDivElement;
const btnSubmit = document.getElementById('btn-submit') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;

const confirmOverlay = document.getElementById('confirm-overlay') as HTMLDivElement;
const confirmTaskInfo = document.getElementById('confirm-task-info') as HTMLParagraphElement;
const btnConfirmDelete = document.getElementById('btn-confirm-delete') as HTMLButtonElement;
const btnConfirmCancel = document.getElementById('btn-confirm-cancel') as HTMLButtonElement;

const overdueOverlay = document.getElementById('overdue-overlay') as HTMLDivElement;
const overdueTaskInfo = document.getElementById('overdue-task-info') as HTMLParagraphElement;
const btnOverdueConfirm = document.getElementById('btn-overdue-confirm') as HTMLButtonElement;
const btnOverdueCancel = document.getElementById('btn-overdue-cancel') as HTMLButtonElement;

let deleteTargetId: string | null = null;
let pendingTask: TaskInput | null = null;
let allTasks: Task[] = [];
let subjectColors: SubjectColors = {};

// ===== 筛选状态 =====
function getFilterState(): FilterState {
  let status: FilterState['status'] = 'all';
  statusRadios.forEach((r: HTMLInputElement) => { if (r.checked) status = r.value as FilterState['status']; });

  const importance: string[] = [];
  importanceCheckboxes.forEach((cb: HTMLInputElement) => { if (cb.checked) importance.push(cb.value); });

  const subjectCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const subjects: string[] = [];
  subjectCbs.forEach((cb: HTMLInputElement) => { if (cb.checked) subjects.push(cb.value); });

  return {
    groupBy: filterGroupBy.checked,
    status,
    importance,
    subjects,
    search: searchInput.value.trim().toLowerCase(),
  };
}

// ===== 筛选逻辑 =====
function applyFilters(tasks: Task[]): Task[] {
  const f = getFilterState();

  let filtered = tasks;

  if (f.search) {
    filtered = filtered.filter(t =>
      t.subject.toLowerCase().includes(f.search) ||
      t.content.toLowerCase().includes(f.search)
    );
  }

  if (f.status === 'completed') {
    filtered = filtered.filter(t => t.completed);
  } else if (f.status === 'incomplete') {
    filtered = filtered.filter(t => !t.completed);
  }

  if (f.importance.length > 0) {
    filtered = filtered.filter(t => f.importance.includes(t.importance));
  }

  if (f.subjects.length > 0) {
    filtered = filtered.filter(t => f.subjects.includes(t.subject));
  }

  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.ddl < b.ddl) return -1;
    if (a.ddl > b.ddl) return 1;
    return 0;
  });

  return filtered;
}

// ===== 工具函数 =====
function getToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getMaxDate(): string {
  const today = new Date();
  const y = today.getFullYear() + 100;
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDdl(ddl: string): Date | null {
  if (!ddl) return null;
  return new Date(ddl + 'T00:00:00');
}

function isOverdue(ddl: string): boolean {
  if (!ddl) return false;
  const due = parseDdl(ddl);
  if (!due) return false;
  return due < getToday();
}

function formatDate(ddl: string): string {
  if (!ddl) return '';
  const d = parseDdl(ddl);
  if (!d || isNaN(d.getTime())) return ddl;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${y}-${m}-${day} (周${week})`;
}

function importanceLabel(level: string): string {
  const map: Record<string, string> = { high: '🔥 高', medium: '⚡ 中', low: '🌱 低' };
  return map[level] || '⚡ 中';
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 统计栏 =====
function renderStats(tasks: Task[]): void {
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
      const stat = (card as HTMLDivElement).dataset.stat;
      handleStatClick(stat || '');
    });
  });
}

function handleStatClick(stat: string): void {
  // 重置筛选
  importanceCheckboxes.forEach((cb: HTMLInputElement) => { cb.checked = false; });

  if (stat === 'all') {
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'all'; });
  } else if (stat === 'incomplete') {
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'incomplete'; });
  } else if (stat === 'overdue') {
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'incomplete'; });
    // 过期是"未完成+已过期"的快捷方式，不需要额外设置
  } else if (stat === 'importance-high') {
    importanceCheckboxes.forEach((cb: HTMLInputElement) => { cb.checked = cb.value === 'high'; });
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'all'; });
  } else if (stat === 'importance-medium') {
    importanceCheckboxes.forEach((cb: HTMLInputElement) => { cb.checked = cb.value === 'medium'; });
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'all'; });
  } else if (stat === 'importance-low') {
    importanceCheckboxes.forEach((cb: HTMLInputElement) => { cb.checked = cb.value === 'low'; });
    statusRadios.forEach((r: HTMLInputElement) => { r.checked = r.value === 'all'; });
  }

  render();
  updateSubjectFilters();
}

// ===== 渲染 =====
function renderOneCard(t: Task, color: string): string {
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

function renderTaskList(tasks: Task[], colors: SubjectColors, groupBy: boolean): void {
  if (tasks.length === 0) {
    taskList.innerHTML = '';
    statsBar.innerHTML = '';
    emptyState.classList.add('visible');
    return;
  }

  emptyState.classList.remove('visible');
  renderStats(allTasks);

  if (groupBy) {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (!grouped[t.subject]) grouped[t.subject] = [];
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
  } else {
    taskList.innerHTML = tasks.map(t => renderOneCard(t, colors[t.subject] || '#888')).join('');
  }

  bindCardEvents();
}

function bindCardEvents(): void {
  taskList.querySelectorAll('.btn-toggle-complete').forEach(btn => {
    btn.addEventListener('click', () => toggleComplete((btn as HTMLButtonElement).dataset.id!));
  });
  taskList.querySelectorAll('.btn-toggle-pin').forEach(btn => {
    btn.addEventListener('click', () => togglePin((btn as HTMLButtonElement).dataset.id!));
  });
  taskList.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', () => showDeleteConfirm((btn as HTMLButtonElement).dataset.id!));
  });
}

function updateSubjectFilters(): void {
  const visible = applyFilters(allTasks);
  const subjects = [...new Set(visible.map(t => t.subject))].sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const currentCbs = subjectFilterList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const checkedMap: Record<string, boolean> = {};
  currentCbs.forEach((cb: HTMLInputElement) => { checkedMap[cb.value] = cb.checked; });

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

function render(): void {
  const f = getFilterState();
  const filtered = applyFilters(allTasks);
  renderTaskList(filtered, subjectColors, f.groupBy);
}

// ===== 操作 =====
async function loadAndRender(): Promise<void> {
  const tasksRes = await apiGet<Task[]>('/tasks');
  const colorsRes = await apiGet<SubjectColors>('/subject-colors');
  if (tasksRes.ok && colorsRes.ok) {
    allTasks = tasksRes.data || [];
    subjectColors = colorsRes.data || {};
    updateSubjectFilters();
    render();
  }
}

async function addTask(task: TaskInput): Promise<string | null> {
  await apiPost('/subject-colors', { subject: task.subject });
  const res = await apiPost<Task>('/tasks', task as unknown as Record<string, unknown>);
  if (!res.ok) {
    alert(res.error || '添加失败');
    return null;
  }
  return res.data!.id;
}

async function uploadImage(taskId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await apiUpload<{ filename: string }>(`/tasks/${encodeURIComponent(taskId)}/image`, formData);
  if (!res.ok) {
    alert(res.error || '图片上传失败');
  }
}

async function handleFormSubmit(): Promise<void> {
  if (!validateForm()) {
    alert('请填写科目、具体内容和截止日期');
    return;
  }

  const task: TaskInput = {
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

async function submitTask(task: TaskInput): Promise<void> {
  const imageFile = formImage.files?.[0];
  const taskId = await addTask(task);
  if (taskId && imageFile) {
    await uploadImage(taskId, imageFile);
  }
  if (taskId) {
    closeModal();
    loadAndRender();
  }
}

async function toggleComplete(id: string): Promise<void> {
  const res = await apiPut(`/tasks/${encodeURIComponent(id)}/toggle-complete`);
  if (res.ok) loadAndRender();
}

async function togglePin(id: string): Promise<void> {
  const res = await apiPut(`/tasks/${encodeURIComponent(id)}/toggle-pin`);
  if (res.ok) loadAndRender();
}

async function deleteTask(id: string): Promise<void> {
  const res = await apiDelete(`/tasks/${encodeURIComponent(id)}`);
  if (res.ok) loadAndRender();
}

// ===== 弹窗控制 =====
function openModal(): void {
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

function closeModal(): void {
  modalOverlay.classList.remove('visible');
}

function showDeleteConfirm(id: string): void {
  deleteTargetId = id;
  const card = document.querySelector(`[data-id="${id}"]`);
  const subject = card ? (card.querySelector('.subject-tag') as HTMLSpanElement)?.textContent || '' : '';
  const content = card ? (card.querySelector('.content-text') as HTMLDivElement)?.textContent || '' : '';
  confirmTaskInfo.textContent = `${subject} - ${content}`;
  confirmOverlay.classList.add('visible');
}

function hideDeleteConfirm(): void {
  confirmOverlay.classList.remove('visible');
  deleteTargetId = null;
}

function hideOverdueConfirm(): void {
  overdueOverlay.classList.remove('visible');
  pendingTask = null;
}

// ===== 表单验证 =====
function validateForm(): boolean {
  if (!formSubject.value.trim()) return false;
  if (!formContent.value.trim()) return false;
  if (!formDdl.value) return false;
  return true;
}

// ===== 事件监听 =====
btnAdd.addEventListener('click', openModal);
btnCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e: MouseEvent) => {
  if (e.target === modalOverlay) closeModal();
});

btnSubmit.addEventListener('click', handleFormSubmit);

formImage.addEventListener('change', () => {
  const file = formImage.files?.[0];
  imagePreview.innerHTML = '';
  imagePreview.classList.remove('visible');
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      imagePreview.innerHTML = `<img src="${e.target?.result}" alt="预览">`;
      imagePreview.classList.add('visible');
    };
    reader.readAsDataURL(file);
  }
});

btnConfirmCancel.addEventListener('click', hideDeleteConfirm);
confirmOverlay.addEventListener('click', (e: MouseEvent) => {
  if (e.target === confirmOverlay) hideDeleteConfirm();
});
btnConfirmDelete.addEventListener('click', () => {
  if (deleteTargetId) {
    deleteTask(deleteTargetId);
    hideDeleteConfirm();
  }
});

btnOverdueCancel.addEventListener('click', hideOverdueConfirm);
overdueOverlay.addEventListener('click', (e: MouseEvent) => {
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
let searchTimer: ReturnType<typeof setTimeout> | null = null;
searchInput.addEventListener('input', () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    render();
    updateSubjectFilters();
  }, 300);
});

// 键盘快捷键
document.addEventListener('keydown', (e: KeyboardEvent) => {
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
