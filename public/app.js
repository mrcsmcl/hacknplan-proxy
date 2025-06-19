async function fetchTasks(projectId, forceRefresh = false) {
  try {
    const url = `/projects/${projectId}/tasks${forceRefresh ? '?refresh=1' : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.tasks || [];
  } catch (e) {
    return [];
  }
}

function renderTable(tasks) {
  if (!tasks.length) return '<p>No tasks found.</p>';
  const keys = Object.keys(tasks[0]).filter(k => k !== 'user' && k !== 'picture');
  const columnNames = {
    id: 'ID',
    name: 'Name',
    description: 'Description',
    status: 'Status',
    assignedUser: 'Assigned User',
    assignedUsers: 'Assigned Users',
    creationDate: 'Created At',
    dueDate: 'Due Date',
    type: 'Type',
    priority: 'Priority',
    // Add more mappings as needed
  };
  let html = '<table><thead><tr>';
  keys.forEach(key => {
    html += `<th>${columnNames[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>`;
  });
  html += '</tr></thead><tbody>';
  tasks.forEach(task => {
    html += '<tr>';
    keys.forEach(key => {
      html += `<td>${renderValue(task[key], key)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderValue(val, key) {
  if (val == null) return '';
  if (key === 'assignedUser' && typeof val === 'object') {
    return val.name || val.username || val.id || '';
  }
  if (key === 'assignedUsers' && Array.isArray(val)) {
    return val.map(u => {
      if (!u) return '';
      if (u.user && (u.user.name || u.user.username || u.user.id)) {
        return u.user.name || u.user.username || u.user.id;
      }
      if (u.name || u.username || u.id) {
        return u.name || u.username || u.id;
      }
      return JSON.stringify(u);
    }).filter(Boolean).join(', ');
  }
  if (Array.isArray(val)) {
    return val.map(item => renderValue(item)).join(', ');
  }
  if (["string","number","boolean"].includes(typeof val)) {
    return val;
  }
  if (typeof val === 'object') {
    if (val.name) return val.name;
    if (val.title) return val.title;
    return JSON.stringify(val);
  }
  return String(val);
}

document.getElementById('download-cache').addEventListener('click', function() {
  const url = new URL(window.location.href);
  const projectId = url.searchParams.get('projectId') || '';
  if (!projectId) return;
  const cacheKey = 'tasks_cache_' + projectId;
  let cacheData = localStorage.getItem(cacheKey);
  if (!cacheData) {
    // fallback to lastTasks in memory
    cacheData = JSON.stringify(lastTasks, null, 2);
  }
  const blob = new Blob([cacheData], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tasks-cache-${projectId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

let lastTasks = [];

async function fetchTasksAndUpdate(projectId) {
  const tasks = await fetchTasks(projectId, true);
  lastTasks = tasks;
  localStorage.setItem('tasks_cache_' + projectId, JSON.stringify(tasks, null, 2));
  document.getElementById('table-container').innerHTML = renderTable(tasks);
}

async function main() {
  const url = new URL(window.location.href);
  const projectId = url.searchParams.get('projectId') || '';
  if (!projectId) {
    document.getElementById('project-title').textContent = 'No projectId provided in URL.';
    return;
  }
  document.getElementById('project-title').textContent = `Project ${projectId} Tasks`;
  // Show last loaded tasks (site cache) if available
  let cacheData = localStorage.getItem('tasks_cache_' + projectId);
  if (cacheData) {
    lastTasks = JSON.parse(cacheData);
    document.getElementById('table-container').innerHTML = renderTable(lastTasks);
  }
  // Always fetch fresh data and update table and cache
  const tasks = await fetchTasks(projectId);
  lastTasks = tasks;
  localStorage.setItem('tasks_cache_' + projectId, JSON.stringify(tasks, null, 2));
  document.getElementById('table-container').innerHTML = renderTable(tasks);
  // Fetch again in background to keep cache fresh
  fetchTasksAndUpdate(projectId);
}

main();
