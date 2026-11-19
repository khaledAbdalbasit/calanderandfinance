function makeId() {
  return window.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function normalizeTemplate(state, plan) {
  const legacyCompleted = state.completedTaskIds || state.completedTasks || [];
  if (legacyCompleted.length && !state.legacyProgress && !state.weekCycles?.length) {
    state.legacyProgress = { completedItems: legacyCompleted.length, preservedAt: new Date().toISOString() };
  }
  const source = Array.isArray(state.weeklyTemplate)
    ? state.weeklyTemplate
    : Array.isArray(state.tasksByDay)
      ? state.tasksByDay
      : plan.weekly_schedule.map(day => day.tasks || []);

  state.weeklyTemplate = plan.weekly_schedule.map((day, dayIndex) => {
    const tasks = Array.isArray(source[dayIndex]) ? source[dayIndex] : day.tasks || [];
    return tasks.map(task => {
      if (typeof task === "string") return { id: makeId(), text: task };
      return { id: task?.id || makeId(), text: String(task?.text ?? "") };
    });
  });
  delete state.tasksByDay;
  delete state.completedTaskIds;
  delete state.completedTasks;
}

export function initializeWeeklyCycles(state, plan) {
  normalizeTemplate(state, plan);
  if (!Array.isArray(state.weekCycles)) state.weekCycles = [];
  if (!Array.isArray(state.taskInstances)) state.taskInstances = [];
  if (!("activeWeekCycleId" in state)) state.activeWeekCycleId = null;
  return state;
}

function getActiveCycle(state) {
  return state.weekCycles.find(cycle =>
    cycle.id === state.activeWeekCycleId && cycle.status === "active"
  ) || null;
}

function createTaskInstance(templateTask, dayIndex, cycle, now) {
  return {
    id: makeId(),
    templateId: templateTask.id,
    text: templateTask.text,
    dayIndex,
    originWeek: cycle.weekNumber,
    originCycleId: cycle.id,
    currentCycleId: cycle.id,
    createdAt: now.toISOString(),
    completedAt: null,
    deleted: false,
    carryoverCount: 0
  };
}

function createCycle(state, startAt, carryoverIds = []) {
  const start = new Date(startAt);
  const weekNumber = state.weekCycles.length + 1;
  const cycle = {
    id: makeId(),
    weekNumber,
    startedAt: start.toISOString(),
    endsAt: new Date(start.getTime() + WEEK_MS).toISOString(),
    status: "active",
    scheduledTaskIds: [],
    carryoverTaskIds: []
  };

  for (let dayIndex = 0; dayIndex < state.weeklyTemplate.length; dayIndex++) {
    for (const templateTask of state.weeklyTemplate[dayIndex]) {
      const task = createTaskInstance(templateTask, dayIndex, cycle, start);
      state.taskInstances.push(task);
      cycle.scheduledTaskIds.push(task.id);
    }
  }

  const carryoverSet = new Set(carryoverIds);
  for (const task of state.taskInstances) {
    if (!carryoverSet.has(task.id) || task.deleted || task.completedAt) continue;
    task.currentCycleId = cycle.id;
    task.carryoverCount = (task.carryoverCount || 0) + 1;
    cycle.carryoverTaskIds.push(task.id);
  }

  state.weekCycles.push(cycle);
  state.activeWeekCycleId = cycle.id;
  state.currentWeek = Math.min(12, weekNumber);
  return cycle;
}

export function startWeeklyCycle(state, now = new Date()) {
  if (getActiveCycle(state)) return false;
  const previous = state.weekCycles[state.weekCycles.length - 1];
  const carryoverIds = previous
    ? [...new Set([...(previous.scheduledTaskIds || []), ...(previous.carryoverTaskIds || [])])]
        .filter(id => {
          const task = state.taskInstances.find(item => item.id === id);
          return task && !task.deleted && !task.completedAt;
        })
    : [];
  createCycle(state, now, carryoverIds);
  return true;
}

export function advanceWeeklyCycles(state, now = new Date()) {
  let changed = false;
  let active = getActiveCycle(state);

  while (active && now.getTime() >= new Date(active.endsAt).getTime()) {
    active.status = "completed";
    active.completedAt = active.endsAt;
    const carryoverIds = [...new Set([
      ...(active.scheduledTaskIds || []),
      ...(active.carryoverTaskIds || [])
    ])].filter(id => {
      const task = state.taskInstances.find(item => item.id === id);
      return task && !task.deleted && !task.completedAt;
    });

    createCycle(state, new Date(active.endsAt), carryoverIds);
    active = getActiveCycle(state);
    changed = true;
  }

  return changed;
}

export function getActiveWeeklyCycle(state) {
  return getActiveCycle(state);
}

export function getTaskInstance(state, taskId) {
  return state.taskInstances.find(task => task.id === taskId) || null;
}

export function createCurrentWeekTask(state, dayIndex, text, now = new Date()) {
  const templateTask = { id: makeId(), text };
  state.weeklyTemplate[dayIndex].push(templateTask);

  const cycle = getActiveCycle(state);
  if (!cycle) return { templateTask, task: null };

  const task = createTaskInstance(templateTask, dayIndex, cycle, now);
  state.taskInstances.push(task);
  cycle.scheduledTaskIds.push(task.id);
  return { templateTask, task };
}

export function updateTaskText(state, taskId, text) {
  const task = getTaskInstance(state, taskId);
  if (!task) return false;
  task.text = text;
  const templateTask = state.weeklyTemplate
    .flat()
    .find(item => item.id === task.templateId);
  if (templateTask) templateTask.text = text;
  return true;
}

export function updateTemplateTaskText(state, dayIndex, templateTaskId, text) {
  const task = state.weeklyTemplate[dayIndex]?.find(item => item.id === templateTaskId);
  if (!task) return false;
  task.text = text;
  return true;
}

export function deleteCurrentWeekTask(state, taskId) {
  const task = getTaskInstance(state, taskId);
  if (!task) return false;
  task.deleted = true;
  state.weeklyTemplate = state.weeklyTemplate.map(day =>
    day.filter(item => item.id !== task.templateId)
  );
  return true;
}

export function deleteTemplateTask(state, dayIndex, templateTaskId) {
  if (!state.weeklyTemplate[dayIndex]) return false;
  state.weeklyTemplate[dayIndex] =
    state.weeklyTemplate[dayIndex].filter(item => item.id !== templateTaskId);
  return true;
}

export function getWeeklyStatistics(state) {
  const tasks = state.taskInstances.filter(task => !task.deleted);
  const completed = tasks.filter(task => Boolean(task.completedAt)).length;
  const cycles = state.weekCycles || [];
  const scheduledTasks = cycles.flatMap(cycle =>
    (cycle.scheduledTaskIds || [])
      .map(id => tasks.find(task => task.id === id))
      .filter(Boolean)
  );

  const onTime = scheduledTasks.filter(task => {
    if (!task.completedAt) return false;
    const originCycle = cycles.find(cycle => cycle.id === task.originCycleId);
    return originCycle && new Date(task.completedAt).getTime() <= new Date(originCycle.endsAt).getTime();
  }).length;

  const overdue = tasks.filter(task => !task.completedAt).length;
  const weekly = cycles.map(cycle => {
    const weekTasks = (cycle.scheduledTaskIds || [])
      .map(id => tasks.find(task => task.id === id))
      .filter(Boolean);
    const weekOnTime = weekTasks.filter(task => {
      if (!task.completedAt) return false;
      return new Date(task.completedAt).getTime() <= new Date(cycle.endsAt).getTime();
    }).length;
    return {
      weekNumber: cycle.weekNumber,
      percentage: weekTasks.length ? Math.round(weekOnTime / weekTasks.length * 100) : 0,
      completed: weekOnTime,
      total: weekTasks.length,
      status: cycle.status
    };
  });

  return {
    completed,
    total: tasks.length,
    overallRate: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
    onTime,
    onTimeTotal: scheduledTasks.length,
    onTimeRate: scheduledTasks.length ? Math.round(onTime / scheduledTasks.length * 100) : 0,
    overdue,
    weekly
  };
}

export function formatCycleDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
