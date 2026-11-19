import { supabase } from "./supabase.js";
import { requireProduct } from "./product-access.js";
import { getCachedRows, putCachedRow, deleteCachedRow, queueOfflineChange, getPendingChanges, syncOfflineQueue } from "./offline-store.js";

if (await requireProduct("finance")) {

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(Number(value || 0)) + " ج.م";
const today = new Date();
const state = { type: "expense", hasDetails: false, rows: [], transactions: [], userId: null, allTime: false, editingId: null, selectedDay: null, budgets: [] };
const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function localDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}
function selectedYear() { return Number($("yearFilter").value); }
function selectedMonth() { return Number($("monthFilter").value); }
function isInSelectedPeriod(tx) {
  if (state.allTime) return true;
  const date = new Date(tx.transaction_date + "T00:00:00");
  return date.getFullYear() === selectedYear() && date.getMonth() === selectedMonth();
}
function sum(list, type) { return list.filter(tx => tx.type === type).reduce((total, tx) => total + Number(tx.amount), 0); }
function setStatus(message, error = false) {
  $("loadStatus").textContent = message;
  $("loadStatus").className = error ? "error" : "muted";
}
function renderMode() {
  $("packageFields").hidden = state.hasDetails;
  $("detailedFields").hidden = !state.hasDetails;
  $("toggleDetails").textContent = state.hasDetails ? "− إخفاء التفاصيل" : "+ تفاصيل إضافية (اختياري)";
  $("toggleDetails").setAttribute("aria-expanded", String(state.hasDetails));
}
function renderItems() {
  $("items").replaceChildren();
  state.rows.forEach((row, index) => {
    const line = document.createElement("div");
    line.className = "item-row";
    const name = document.createElement("input");
    name.type = "text"; name.maxLength = 100; name.required = true;
    name.placeholder = "اسم العنصر"; name.value = row.name;
    name.setAttribute("aria-label", "اسم العنصر");
    name.addEventListener("input", () => { row.name = name.value; });
    const amount = document.createElement("input");
    amount.type = "number"; amount.min = "0.01"; amount.step = "0.01"; amount.required = true;
    amount.placeholder = "المبلغ"; amount.value = row.amount;
    amount.setAttribute("aria-label", "مبلغ العنصر");
    amount.addEventListener("input", () => { row.amount = amount.value; updateDetailsTotal(); });
    const remove = document.createElement("button");
    remove.type = "button"; remove.textContent = "×"; remove.title = "حذف العنصر";
    remove.addEventListener("click", () => {
      state.rows.splice(index, 1);
      if (!state.rows.length) state.rows.push({ name: "", amount: "" });
      renderItems();
    });
    line.append(name, amount, remove);
    $("items").append(line);
  });
  updateDetailsTotal();
}
function updateDetailsTotal() {
  const total = state.rows.reduce((value, row) => value + (Number(row.amount) || 0), 0);
  $("detailsTotal").textContent = money(total);
}
function addItemRow() {
  state.rows.push({ name: "", amount: "" });
  renderItems();
}
function fillFilters() {
  const years = new Set([today.getFullYear()]);
  state.transactions.forEach(tx => years.add(Number(tx.transaction_date.slice(0, 4))));
  const currentYear = $("yearFilter").value || String(today.getFullYear());
  $("yearFilter").replaceChildren();
  [...years].sort((a,b) => b-a).forEach(year => {
    const option = document.createElement("option");
    option.value = year; option.textContent = year;
    $("yearFilter").append(option);
  });
  $("yearFilter").value = years.has(Number(currentYear)) ? currentYear : String(today.getFullYear());
  if (!$("monthFilter").options.length) {
    monthNames.forEach((name, index) => {
      const option = document.createElement("option");
      option.value = index; option.textContent = name;
      $("monthFilter").append(option);
    });
    $("monthFilter").value = today.getMonth();
  }
}
function renderSuggestions() {
  const categories = [...new Set(state.transactions.map(tx => tx.category).filter(Boolean))].sort();
  $("categorySuggestions").replaceChildren();
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    $("categorySuggestions").append(option);
  });
}
function renderSummary(list) {
  const income = sum(list, "income");
  const expense = sum(list, "expense");
  $("incomeTotal").textContent = money(income);
  $("expenseTotal").textContent = money(expense);
  $("balanceTotal").textContent = money(income - expense);
  $("balanceTotal").className = income >= expense ? "positive" : "negative";
  $("transactionsCount").textContent = money(list.length).replace(" ج.م", "");
}
function renderCategories(list) {
  const expenses = list.filter(tx => tx.type === "expense");
  const totals = new Map();
  expenses.forEach(tx => totals.set(tx.category, (totals.get(tx.category) || 0) + Number(tx.amount)));
  const sorted = [...totals.entries()].sort((a,b) => b[1]-a[1]);
  const grandTotal = sorted.reduce((total, item) => total + item[1], 0);
  $("categoryBreakdown").replaceChildren();
  $("categoryPeriod").textContent = state.allTime ? "كل الشهور" : monthNames[selectedMonth()] + " " + selectedYear();
  if (!sorted.length) {
    $("categoryBreakdown").innerHTML = '<div class="empty"><p>لسه مفيش مصروفات مسجلة في الفترة دي.</p><button type="button" class="primary" data-add-transaction>سجّل أول مصروف</button></div>';
    $("categoryBreakdown").querySelector("[data-add-transaction]").addEventListener("click", () => document.querySelector('.finance-tab[data-view="add"]').click());
    return;
  }
  sorted.forEach(([category, amount]) => {
    const row = document.createElement("div"); row.className = "category-row";
    const name = document.createElement("strong"); name.textContent = category;
    const track = document.createElement("div"); track.className = "track";
    const fill = document.createElement("div"); fill.className = "fill";
    fill.style.width = (grandTotal ? amount / grandTotal * 100 : 0) + "%";
    track.append(fill);
    const value = document.createElement("span"); value.textContent = money(amount);
    row.append(name, track, value);
    $("categoryBreakdown").append(row);
  });
}

function monthTransactions(year, month) {
  const prefix = year + "-" + String(month + 1).padStart(2, "0");
  return state.transactions.filter(tx => tx.transaction_date.startsWith(prefix));
}
function categoryExpenses(list) {
  const totals = new Map();
  list.filter(tx => tx.type === "expense").forEach(tx => {
    totals.set(tx.category, (totals.get(tx.category) || 0) + Number(tx.amount));
  });
  return totals;
}
function renderBudgets() {
  const year = selectedYear(), month = selectedMonth();
  const spentByCategory = categoryExpenses(monthTransactions(year, month));
  $("budgetPeriod").textContent = monthNames[month] + " " + year;
  $("budgetsList").replaceChildren();
  if (!state.budgets.length) {
    $("budgetsList").innerHTML = '<div class="empty">لسه مفيش ميزانيات للشهر ده. أضف حدًا شهريًا لأي تصنيف عشان تتابع مصروفاتك.</div>';
    return;
  }
  state.budgets.forEach(budget => {
    const spent = spentByCategory.get(budget.category) || 0;
    const limit = Number(budget.amount);
    const ratio = limit > 0 ? spent / limit : 0;
    const row = document.createElement("div"); row.className = "budget-row";
    const meta = document.createElement("div"); meta.className = "budget-meta";
    const label = document.createElement("strong"); label.textContent = budget.category;
    const value = document.createElement("span"); value.textContent = money(spent) + " من " + money(limit);
    meta.append(label, value);
    const track = document.createElement("div"); track.className = "budget-track";
    const fill = document.createElement("div"); fill.className = "budget-fill" + (ratio >= 1 ? " over" : ratio >= .8 ? " warning" : "");
    fill.style.width = Math.min(100, ratio * 100) + "%"; track.append(fill);
    const footer = document.createElement("div"); footer.className = "budget-meta";
    const status = document.createElement("small");
    status.textContent = ratio >= 1 ? "تجاوزت الميزانية بـ " + money(spent - limit) : ratio >= .8 ? "استخدمت " + Math.round(ratio * 100) + "% — اقتربت من الحد" : "متبقي " + money(limit - spent);
    if (ratio >= .8) status.className = "negative";
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "danger"; remove.textContent = "حذف";
    remove.addEventListener("click", () => deleteBudget(budget.id));
    footer.append(status, remove);
    row.append(meta, track, footer); $("budgetsList").append(row);
  });
}
function renderInsights() {
  const year = selectedYear(), month = selectedMonth();
  const current = monthTransactions(year, month);
  const previousDate = new Date(year, month - 1, 1);
  const previous = monthTransactions(previousDate.getFullYear(), previousDate.getMonth());
  const currentExpense = sum(current, "expense");
  const previousExpense = sum(previous, "expense");
  const currentMap = categoryExpenses(current);
  const previousMap = categoryExpenses(previous);
  const target = $("financialInsights");
  target.replaceChildren();
  $("insightPeriod").textContent = monthNames[month] + " " + year;
  const addInsight = (title, description, warning = false) => {
    const item = document.createElement("div"); item.className = "insight" + (warning ? " warning" : "");
    const heading = document.createElement("strong"); heading.textContent = title;
    const detail = document.createElement("small"); detail.textContent = description;
    item.append(heading, detail); target.append(item);
  };
  if (!current.length) {
    target.innerHTML = '<div class="empty">سجّل عملياتك عشان نقدر نحلل إنفاقك ونقدم اقتراحات مفيدة.</div>';
    return;
  }
  const top = [...currentMap.entries()].sort((a,b) => b[1] - a[1]).slice(0, 3);
  if (top.length) {
    addInsight("أعلى تصنيف إنفاقًا", top.map(([name, amount]) => name + ": " + money(amount)).join(" · "));
  }
  if (previous.length) {
    const difference = currentExpense - previousExpense;
    const percent = previousExpense > 0 ? Math.round(difference / previousExpense * 100) : null;
    if (previousExpense > 0) {
      addInsight(difference > 0 ? "مصروفاتك زادت عن الشهر السابق" : difference < 0 ? "مصروفاتك قلت عن الشهر السابق" : "مصروفاتك زي الشهر السابق",
        (difference > 0 ? "زيادة " : difference < 0 ? "توفير " : "فرق ") + money(Math.abs(difference)) + (percent === null ? "" : " (" + Math.abs(percent) + "%)") + " مقارنة بالشهر السابق.",
        difference > 0);
    } else {
      addInsight("بداية المقارنة", "الشهر السابق لا يحتوي على مصروفات مسجلة؛ سنستخدمه كخط أساس بعد تسجيل بيانات أكثر.");
    }
    const increases = [...currentMap.entries()].filter(([category, amount]) => {
      const old = previousMap.get(category) || 0;
      return old > 0 && amount >= old * 1.25 && amount - old >= 50;
    }).sort((a,b) => (b[1] - (previousMap.get(b[0]) || 0)) - (a[1] - (previousMap.get(a[0]) || 0))).slice(0,3);
    increases.forEach(([category, amount]) => {
      const old = previousMap.get(category);
      const delta = amount - old;
      addInsight("زيادة ملحوظة في " + category, "أنفقت " + money(amount) + " مقابل " + money(old) + " الشهر السابق؛ زيادة " + money(delta) + ".", true);
    });
  } else {
    addInsight("لسه محتاجين بيانات للمقارنة", "بعد تسجيل مصروفات في شهر سابق، هنقدر نحدد الزيادات والتغيّرات بدقة أكبر.");
  }
  const over = state.budgets.filter(b => (currentMap.get(b.category) || 0) > Number(b.amount));
  const near = state.budgets.filter(b => {
    const ratio = (currentMap.get(b.category) || 0) / Number(b.amount);
    return ratio >= .8 && ratio <= 1;
  });
  over.forEach(b => addInsight("تجاوزت ميزانية " + b.category, "تجاوزت الحد المحدد بمقدار " + money((currentMap.get(b.category) || 0) - Number(b.amount)) + ".", true));
  near.forEach(b => addInsight("اقتربت من ميزانية " + b.category, "استخدمت " + Math.round((currentMap.get(b.category) || 0) / Number(b.amount) * 100) + "% من الميزانية.", true));
  if (!target.children.length) addInsight("الأمور مستقرة", "لا توجد زيادات كبيرة أو تجاوزات في الميزانيات المسجلة حتى الآن.");
}
async function loadBudgets() {
  try {
    const cached = await getCachedRows("budgets", state.userId);
    state.budgets = cached.filter(item =>
      item.budget_month === selectedMonth() + 1 && item.budget_year === selectedYear()
    );
    renderBudgets(); renderInsights();
  } catch (error) {
    console.error("Offline budgets cache unavailable:", error);
  }

  if (!navigator.onLine) {
    $("budgetError").textContent = "Offline — بنعرض آخر ميزانيات محفوظة على الجهاز.";
    return;
  }

  try {
    await syncOfflineQueue(supabase, state.userId);
    const { data, error } = await supabase.from("finance_budgets").select("*")
      .eq("user_id", state.userId).eq("budget_month", selectedMonth() + 1)
      .eq("budget_year", selectedYear()).order("category");
    if (error) throw error;
    const pending = await getPendingChanges(state.userId);
    const pendingUpserts = pending.filter(item => item.type === "budget-upsert").map(item => item.payload);
    const pendingDeletes = new Set(pending.filter(item => item.type === "budget-delete").map(item => item.payload.id));
    const pendingIds = new Set(pendingUpserts.map(item => item.id));
    state.budgets = [
      ...(data || []).filter(item => !pendingDeletes.has(item.id) && !pendingIds.has(item.id)),
      ...pendingUpserts.filter(item => item.budget_month === selectedMonth() + 1 && item.budget_year === selectedYear())
    ];
    await Promise.all((data || []).map(row => putCachedRow("budgets", row)));
    $("budgetError").textContent = pending.length ? "بعض التغييرات ما زالت تنتظر المزامنة." : "";
  } catch (error) {
    console.error("Budget load failed; local cache remains active:", error);
    $("budgetError").textContent = "تعذر الاتصال — بنستخدم آخر نسخة محفوظة.";
  }
  renderBudgets(); renderInsights();
}

async function deleteBudget(id) {
  if (!window.confirm("متأكد إنك عايز تحذف الميزانية دي؟")) return;
  try {
    await deleteCachedRow("budgets", id);
    await queueOfflineChange(`budget:${state.userId}:${id}`, state.userId, "budget-delete", { id });
    state.budgets = state.budgets.filter(item => item.id !== id);
    renderBudgets(); renderInsights();
    if (navigator.onLine) await syncOfflineQueue(supabase, state.userId);
  } catch (error) {
    console.error("Offline budget delete failed:", error);
    $("budgetError").textContent = "تعذر حذف الميزانية من التخزين المحلي.";
  }
}

function renderYearComparison() {
  const year = selectedYear();
  const yearData = state.transactions.filter(tx => Number(tx.transaction_date.slice(0,4)) === year);
  const monthlyTotals = monthNames.map((_, month) => {
    const items = yearData.filter(tx => new Date(tx.transaction_date + "T00:00:00").getMonth() === month);
    return Math.max(sum(items, "income"), sum(items, "expense"));
  });
  const max = Math.max(1, ...monthlyTotals);
  $("yearComparison").replaceChildren();
  monthNames.forEach((name, month) => {
    const items = yearData.filter(tx => new Date(tx.transaction_date + "T00:00:00").getMonth() === month);
    const income = sum(items, "income"), expense = sum(items, "expense");
    const col = document.createElement("div"); col.className = "month-col";
    const bars = document.createElement("div"); bars.className = "bar-pair";
    const incomeBar = document.createElement("div"); incomeBar.className = "bar";
    incomeBar.style.height = (income ? Math.max(3, income / max * 100) : 2) + "%";
    incomeBar.title = "دخل: " + money(income);
    const expenseBar = document.createElement("div"); expenseBar.className = "bar expense";
    expenseBar.style.height = (expense ? Math.max(3, expense / max * 100) : 2) + "%";
    expenseBar.title = "مصروفات: " + money(expense);
    bars.append(incomeBar, expenseBar);
    const label = document.createElement("small"); label.textContent = name.slice(0,3);
    col.append(bars, label); $("yearComparison").append(col);
  });
}
function dayTransactions(date) {
  return state.transactions.filter(tx => tx.transaction_date === date);
}
function renderDailyChart() {
  const year = selectedYear(), month = selectedMonth();
  const monthData = state.transactions.filter(tx => {
    const d = new Date(tx.transaction_date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month && tx.type === "expense";
  });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const elapsedDays = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth())
    ? daysInMonth : isCurrentMonth ? today.getDate() : 0;
  const total = monthData.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const activeDays = new Set(monthData.map(tx => tx.transaction_date)).size;
  const averageElapsed = elapsedDays ? total / elapsedDays : 0;
  const averageActive = activeDays ? total / activeDays : 0;
  const daily = Array.from({length: daysInMonth}, (_, index) => {
    const day = index + 1;
    const date = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    return { day, date, amount: monthData.filter(tx => tx.transaction_date === date).reduce((sum, tx) => sum + Number(tx.amount), 0) };
  });
  const max = Math.max(1, ...daily.map(item => item.amount));
  const chart = $("dailyChart");
  chart.replaceChildren();
  daily.forEach(item => {
    const col = document.createElement("div"); col.className = "day-col";
    const button = document.createElement("button"); button.type = "button";
    button.title = item.day + " " + monthNames[month] + ": " + money(item.amount);
    button.setAttribute("aria-label", "عرض مصروفات يوم " + item.day);
    const bar = document.createElement("span"); bar.className = "day-bar" + (averageElapsed && item.amount > averageElapsed ? " above-average" : "") + (state.selectedDay === item.date ? " selected" : "");
    bar.style.height = (item.amount ? Math.max(3, item.amount / max * 100) : 2) + "%";
    button.append(bar);
    button.addEventListener("click", () => { state.selectedDay = item.date; renderDailyChart(); });
    const label = document.createElement("small"); label.textContent = item.day;
    col.append(button, label); chart.append(col);
  });
  $("dailyPeriod").textContent = monthNames[month] + " " + year;
  $("dailyAverage").textContent = "إجمالي مصروفات الشهر: " + money(total) +
    " · المتوسط اليومي حتى الآن: " + money(averageElapsed) +
    " · متوسط أيام الصرف فقط: " + money(averageActive) +
    " · أيام بها مصروفات: " + activeDays;
  if (!state.selectedDay || !state.selectedDay.startsWith(year + "-" + String(month + 1).padStart(2, "0"))) {
    state.selectedDay = localDate(new Date(year, month, Math.min(today.getDate(), daysInMonth)));
  }
  const selected = dayTransactions(state.selectedDay);
  const dayExpense = sum(selected, "expense");
  $("selectedDayTitle").textContent = "تفاصيل يوم " + Number(state.selectedDay.slice(-2)) + " " + monthNames[month];
  $("selectedDayTotal").textContent = "المصروف: " + money(dayExpense) + (averageElapsed ? (dayExpense > averageElapsed ? " · أعلى من المتوسط" : " · أقل من المتوسط") : "");
  const target = $("selectedDayTransactions"); target.replaceChildren();
  if (!selected.length) {
    target.innerHTML = '<div class="empty">مفيش عمليات مسجلة في اليوم ده.</div>';
    return;
  }
  selected.forEach(tx => {
    const row = document.createElement("div"); row.className = "transaction";
    const title = document.createElement("strong"); title.textContent = tx.category;
    const meta = document.createElement("div"); meta.className = "meta"; meta.textContent = tx.type === "income" ? "دخل" : "مصروف";
    const value = document.createElement("span"); value.className = "amount " + (tx.type === "income" ? "positive" : "negative");
    value.textContent = (tx.type === "income" ? "+" : "−") + money(tx.amount);
    row.append(title, meta, value); target.append(row);
  });
}
function startEdit(tx) {
  state.editingId = tx.id;
  state.type = tx.type;
  state.hasDetails = Array.isArray(tx.details) && tx.details.length > 0;
  state.rows = state.hasDetails ? tx.details.map(item => ({name:item.name, amount:String(item.amount)})) : [{name:"",amount:""}];
  $("category").value = tx.category;
  $("amount").value = tx.amount;
  $("transactionDate").value = tx.transaction_date;
  $("note").value = tx.note || "";
  setType(tx.type);
  renderItems(); renderMode();
  $("formTitle").textContent = "تعديل العملية";
  $("saveTransaction").textContent = "حفظ التعديلات";
  $("cancelEdit").hidden = false;
  $("transactionForm").scrollIntoView({behavior:"smooth", block:"start"});
}
function resetTransactionForm() {
  state.editingId = null; state.hasDetails = false; state.rows = [{name:"",amount:""}];
  $("transactionForm").reset(); $("transactionDate").value = localDate(today);
  renderItems(); renderMode(); setType("expense");
  $("formTitle").textContent = "إضافة مصروف أو دخل";
  $("saveTransaction").textContent = "حفظ العملية";
  $("cancelEdit").hidden = true;
  $("formError").textContent = "";
}
function renderTransactions(list) {
  $("transactionsList").replaceChildren();
  $("listPeriod").textContent = state.allTime ? "كل الشهور" : monthNames[selectedMonth()] + " " + selectedYear();
  const ordered = [...list].sort((a,b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
  if (!ordered.length) {
    $("transactionsList").innerHTML = '<div class="empty"><p>مفيش عمليات مسجلة في الفترة دي. أول ما تضيف عملية هتظهر هنا.</p><button type="button" class="primary" data-add-transaction>إضافة مصروف أو دخل</button></div>';
    $("transactionsList").querySelector("[data-add-transaction]").addEventListener("click", () => document.querySelector('.finance-tab[data-view="add"]').click());
    return;
  }
  ordered.forEach(tx => {
    const row = document.createElement("div"); row.className = "transaction";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = tx.category;
    const meta = document.createElement("div"); meta.className = "meta";
    const date = new Date(tx.transaction_date + "T00:00:00").toLocaleDateString("ar-EG");
    meta.textContent = (tx.type === "income" ? "دخل" : "مصروف") + " · " + date + (tx.details?.length ? " · بالتفصيل" : "");
    info.append(title, meta);
    if (Array.isArray(tx.details) && tx.details.length) {
      const detail = document.createElement("div"); detail.className = "detail-preview";
      detail.textContent = tx.details.map(item => item.name + " " + money(item.amount)).join("، ");
      info.append(detail);
    }
    if (tx.note) { const note = document.createElement("div"); note.className = "detail-preview"; note.textContent = tx.note; info.append(note); }
    const side = document.createElement("div");
    const amount = document.createElement("div"); amount.className = "amount " + (tx.type === "income" ? "positive" : "negative");
    amount.textContent = (tx.type === "income" ? "+" : "−") + money(tx.amount);
    const controls = document.createElement("div"); controls.className = "edit-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "تعديل"; edit.addEventListener("click", () => startEdit(tx));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "danger"; remove.textContent = "حذف";
    remove.addEventListener("click", () => deleteTransaction(tx.id));
    controls.append(edit, remove); side.append(amount, controls); row.append(info, side); $("transactionsList").append(row);
  });
}
function render() {
  const list = state.transactions.filter(isInSelectedPeriod);
  renderSummary(list);
  renderCategories(list);
  renderBudgets();
  renderInsights();
  renderDailyChart();
  renderYearComparison();
  renderTransactions(list);
}
async function loadTransactions() {
  setStatus("جارٍ تحميل بياناتك...");
  try {
    state.transactions = await getCachedRows("transactions", state.userId);
    fillFilters(); renderSuggestions(); render();
  } catch (error) {
    console.error("Offline transaction cache unavailable:", error);
  }

  if (!navigator.onLine) {
    setStatus("أنت Offline — بتعرض البيانات المحفوظة على الجهاز.");
    return;
  }

  try {
    await syncOfflineQueue(supabase, state.userId);
    const { data, error } = await supabase.from("finance_transactions").select("*")
      .eq("user_id", state.userId).order("transaction_date", { ascending: false });
    if (error) throw error;
    const pending = await getPendingChanges(state.userId);
    const pendingUpserts = pending.filter(item => item.type === "transaction-upsert").map(item => item.payload);
    const pendingDeletes = new Set(pending.filter(item => item.type === "transaction-delete").map(item => item.payload.id));
    const pendingIds = new Set(pendingUpserts.map(item => item.id));
    state.transactions = [
      ...(data || []).filter(item => !pendingDeletes.has(item.id) && !pendingIds.has(item.id)),
      ...pendingUpserts
    ];
    await Promise.all((data || []).map(row => putCachedRow("transactions", row)));
    fillFilters(); renderSuggestions(); render();
    setStatus(pending.length ? "تم تحميل البيانات، وهناك تغييرات تنتظر المزامنة." : "تم تحميل " + state.transactions.length + " عملية.");
  } catch (error) {
    console.error("Finance load failed; local cache remains active:", error);
    setStatus("تعذر الاتصال بـ Supabase — بتستخدم آخر نسخة محفوظة على الجهاز.", true);
  }
}
async function deleteTransaction(id) {
  if (!window.confirm("متأكد إنك عايز تحذف العملية دي؟")) return;
  try {
    await deleteCachedRow("transactions", id);
    await queueOfflineChange(`tx:${state.userId}:${id}`, state.userId, "transaction-delete", { id });
    state.transactions = state.transactions.filter(tx => tx.id !== id);
    if (state.editingId === id) resetTransactionForm();
    renderSuggestions(); render();
    setStatus(navigator.onLine ? "تم الحذف محليًا وجارٍ المزامنة." : "تم الحذف على الجهاز — هيتزامن لما الإنترنت يرجع.");
    if (navigator.onLine) {
      await syncOfflineQueue(supabase, state.userId);
      await loadTransactions();
    }
  } catch (error) {
    console.error("Offline transaction delete failed:", error);
    setStatus("تعذر حذف العملية من التخزين المحلي.", true);
  }
}
function setType(type) {
  state.type = type;
  document.querySelectorAll("[data-type]").forEach(button => button.classList.toggle("active", button.dataset.type === type));
}
function toggleDetails() {
  state.hasDetails = !state.hasDetails;
  if (state.hasDetails && !state.rows.length) { state.rows = [{ name: "", amount: "" }]; renderItems(); }
  renderMode();
}
document.querySelectorAll("[data-type]").forEach(button => button.addEventListener("click", () => setType(button.dataset.type)));
$("toggleDetails").addEventListener("click", toggleDetails);
$("addItem").addEventListener("click", addItemRow);
$("yearFilter").addEventListener("change", async () => { state.allTime = false; render(); await loadBudgets(); });
$("monthFilter").addEventListener("change", async () => { state.allTime = false; render(); await loadBudgets(); });
$("allTimeFilter").addEventListener("click", () => { state.allTime = true; render(); });
$("cancelEdit").addEventListener("click", resetTransactionForm);
$("budgetForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("budgetError").textContent = "";
  const category = $("budgetCategory").value.trim();
  const amount = Number($("budgetAmount").value);
  if (!category || !Number.isFinite(amount) || amount <= 0) {
    $("budgetError").textContent = "اكتب تصنيفًا ومبلغًا صحيحًا أكبر من صفر.";
    return;
  }

  const existing = state.budgets.find(item =>
    item.category.toLocaleLowerCase() === category.toLocaleLowerCase() &&
    item.budget_month === selectedMonth() + 1 && item.budget_year === selectedYear()
  );
  const now = new Date().toISOString();
  const payload = {
    id: existing?.id || crypto.randomUUID(),
    user_id: state.userId,
    category,
    amount: Number(amount.toFixed(2)),
    budget_month: selectedMonth() + 1,
    budget_year: selectedYear(),
    created_at: existing?.created_at || now,
    updated_at: now
  };

  $("saveBudget").disabled = true;
  try {
    await putCachedRow("budgets", payload);
    await queueOfflineChange(`budget:${state.userId}:${payload.id}`, state.userId, "budget-upsert", payload);
    state.budgets = [...state.budgets.filter(item => item.id !== payload.id &&
      !(item.category.toLocaleLowerCase() === category.toLocaleLowerCase())), payload]
      .sort((a,b) => a.category.localeCompare(b.category));
    $("budgetForm").reset();
    renderBudgets(); renderInsights();
    $("budgetError").textContent = navigator.onLine
      ? "تم الحفظ محليًا وجارٍ المزامنة."
      : "تم الحفظ على الجهاز — هيتزامن لما الإنترنت يرجع.";
    if (navigator.onLine) {
      await syncOfflineQueue(supabase, state.userId);
      $("budgetError").textContent = "";
    }
  } catch (error) {
    console.error("Budget save failed:", error);
    $("budgetError").textContent = "تعذر حفظ الميزانية محليًا.";
  } finally {
    $("saveBudget").disabled = false;
  }
});
$("transactionForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("formError").textContent = "";
  const category = $("category").value.trim();
  const date = $("transactionDate").value;
  let amount = 0;
  let details = [];
  if (!category || !date) { $("formError").textContent = "اكتب البند وحدد التاريخ."; return; }
  if (!state.hasDetails) {
    amount = Number($("amount").value);
    if (!Number.isFinite(amount) || amount <= 0) { $("formError").textContent = "اكتب مبلغ صحيح أكبر من صفر."; return; }
  } else {
    details = state.rows.map(row => ({ name: row.name.trim(), amount: Number(row.amount) }));
    if (!details.length || details.some(item => !item.name || !Number.isFinite(item.amount) || item.amount <= 0)) {
      $("formError").textContent = "كمّل اسم ومبلغ كل عنصر، ولازم المبالغ تكون أكبر من صفر."; return;
    }
    amount = details.reduce((total, item) => total + item.amount, 0);
  }

  const now = new Date().toISOString();
  const id = state.editingId || crypto.randomUUID();
  const previous = state.transactions.find(tx => tx.id === id);
  const payload = {
    id,
    user_id: state.userId,
    type: state.type,
    entry_mode: state.hasDetails ? "detailed" : "package",
    category,
    amount: Number(amount.toFixed(2)),
    transaction_date: date,
    details,
    note: $("note").value.trim() || null,
    created_at: previous?.created_at || now,
    updated_at: now
  };

  $("saveTransaction").disabled = true;
  try {
    await putCachedRow("transactions", payload);
    await queueOfflineChange(`tx:${state.userId}:${id}`, state.userId, "transaction-upsert", payload);
    const wasEditing = Boolean(state.editingId);
    state.transactions = wasEditing
      ? state.transactions.map(tx => tx.id === id ? payload : tx)
      : [payload, ...state.transactions];
    resetTransactionForm();
    const savedDate = new Date(payload.transaction_date + "T00:00:00");
    $("yearFilter").value = String(savedDate.getFullYear());
    $("monthFilter").value = String(savedDate.getMonth());
    state.allTime = false;
    fillFilters(); renderSuggestions(); render();
    $("formError").textContent = "";
    setStatus(navigator.onLine ? "تم الحفظ على الجهاز وجارٍ المزامنة." : "تم الحفظ بدون إنترنت — هيتزامن تلقائيًا لما الاتصال يرجع.");
    if (navigator.onLine) {
      try {
        await syncOfflineQueue(supabase, state.userId);
        setStatus(wasEditing ? "تم تحديث العملية ومزامنتها." : "تم حفظ العملية ومزامنتها.");
      } catch (syncError) {
        console.error("Transaction queued for later sync:", syncError);
      }
    }
  } catch (error) {
    console.error("Local transaction save failed:", error);
    $("formError").textContent = "تعذر حفظ العملية على الجهاز. تأكد من مساحة التخزين المتاحة.";
  } finally {
    $("saveTransaction").disabled = false;
  }
});
$("signOut").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.replace("/index.html");
  else setStatus("تعذر تسجيل الخروج.", true);
});

const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !sessionData.session) {
  window.location.replace("/index.html");
} else {
  state.userId = sessionData.session.user.id;
  await loadTransactions();
  await loadBudgets();
window.addEventListener("app-online", async () => {
  if (!state.userId) return;
  await loadTransactions();
  await loadBudgets();
});

}

}