import { supabase } from "./supabase.js";

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(Number(value || 0)) + " ج.م";
const today = new Date();
const state = { type: "expense", mode: "package", rows: [], transactions: [], userId: null, allTime: false };
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
  const date = new Date(tx.transaction_date + "T00:00:00");
  return date.getFullYear() === selectedYear() && (state.allTime || date.getMonth() === selectedMonth());
}
function sum(list, type) { return list.filter(tx => tx.type === type).reduce((total, tx) => total + Number(tx.amount), 0); }
function setStatus(message, error = false) {
  $("loadStatus").textContent = message;
  $("loadStatus").className = error ? "error" : "muted";
}
function renderMode() {
  $("packageFields").hidden = state.mode !== "package";
  $("detailedFields").hidden = state.mode !== "detailed";
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
    $("categoryBreakdown").innerHTML = '<div class="empty">لا توجد مصروفات في الفترة دي.</div>';
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
function renderYearComparison() {
  const year = selectedYear();
  const yearData = state.transactions.filter(tx => Number(tx.transaction_date.slice(0,4)) === year);
  const max = Math.max(1, ...yearData.map(tx => Number(tx.amount)));
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
function renderTransactions(list) {
  $("transactionsList").replaceChildren();
  $("listPeriod").textContent = state.allTime ? "كل الشهور" : monthNames[selectedMonth()] + " " + selectedYear();
  const ordered = [...list].sort((a,b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
  if (!ordered.length) {
    $("transactionsList").innerHTML = '<div class="empty">لسه مفيش عمليات في الفترة دي. ابدأ بإضافة أول عملية.</div>';
    return;
  }
  ordered.forEach(tx => {
    const row = document.createElement("div"); row.className = "transaction";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = tx.category;
    const meta = document.createElement("div"); meta.className = "meta";
    const date = new Date(tx.transaction_date + "T00:00:00").toLocaleDateString("ar-EG");
    meta.textContent = (tx.type === "income" ? "دخل" : "مصروف") + " · " + date + " · " + (tx.entry_mode === "package" ? "إجمالي" : "بالتفصيل");
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
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "danger"; remove.textContent = "حذف";
    remove.addEventListener("click", () => deleteTransaction(tx.id));
    side.append(amount, remove); row.append(info, side); $("transactionsList").append(row);
  });
}
function render() {
  const list = state.transactions.filter(isInSelectedPeriod);
  renderSummary(list);
  renderCategories(list);
  renderYearComparison();
  renderTransactions(list);
}
async function loadTransactions() {
  setStatus("جارٍ تحميل بياناتك...");
  const { data, error } = await supabase.from("finance_transactions").select("*").eq("user_id", state.userId).order("transaction_date", { ascending: false });
  if (error) {
    setStatus("تعذر تحميل البيانات. تأكد من تنفيذ إعدادات قاعدة البيانات في Supabase.", true);
    return;
  }
  state.transactions = data || [];
  fillFilters(); renderSuggestions(); render();
  setStatus("تم تحميل " + state.transactions.length + " عملية.");
}
async function deleteTransaction(id) {
  if (!window.confirm("متأكد إنك عايز تحذف العملية دي؟")) return;
  const { error } = await supabase.from("finance_transactions").delete().eq("id", id).eq("user_id", state.userId);
  if (error) { setStatus("تعذر حذف العملية.", true); return; }
  state.transactions = state.transactions.filter(tx => tx.id !== id);
  renderSuggestions(); render(); setStatus("تم حذف العملية.");
}
function setType(type) {
  state.type = type;
  document.querySelectorAll("[data-type]").forEach(button => button.classList.toggle("active", button.dataset.type === type));
}
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("active", button.dataset.mode === mode));
  renderMode();
}
document.querySelectorAll("[data-type]").forEach(button => button.addEventListener("click", () => setType(button.dataset.type)));
document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
$("addItem").addEventListener("click", addItemRow);
$("yearFilter").addEventListener("change", () => { state.allTime = false; render(); });
$("monthFilter").addEventListener("change", () => { state.allTime = false; render(); });
$("allTimeFilter").addEventListener("click", () => { state.allTime = true; render(); });
$("transactionDate").value = localDate(today);
state.rows.push({ name: "", amount: "" }); renderItems();
$("transactionForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("formError").textContent = "";
  const category = $("category").value.trim();
  const date = $("transactionDate").value;
  let amount = 0;
  let details = [];
  if (!category || !date) { $("formError").textContent = "اكتب البند وحدد التاريخ."; return; }
  if (state.mode === "package") {
    amount = Number($("amount").value);
    if (!Number.isFinite(amount) || amount <= 0) { $("formError").textContent = "اكتب مبلغ صحيح أكبر من صفر."; return; }
  } else {
    details = state.rows.map(row => ({ name: row.name.trim(), amount: Number(row.amount) }));
    if (!details.length || details.some(item => !item.name || !Number.isFinite(item.amount) || item.amount <= 0)) {
      $("formError").textContent = "كمّل اسم ومبلغ كل عنصر، ولازم المبالغ تكون أكبر من صفر."; return;
    }
    amount = details.reduce((total, item) => total + item.amount, 0);
  }
  const payload = {
    user_id: state.userId, type: state.type, entry_mode: state.mode,
    category, amount: Number(amount.toFixed(2)), transaction_date: date,
    details, note: $("note").value.trim() || null
  };
  $("saveTransaction").disabled = true;
  const { data, error } = await supabase.from("finance_transactions").insert(payload).select().single();
  $("saveTransaction").disabled = false;
  if (error) { $("formError").textContent = "تعذر حفظ العملية. تأكد من تنفيذ ملف إعداد قاعدة البيانات."; return; }
  state.transactions.unshift(data);
  $("transactionForm").reset();
  $("transactionDate").value = localDate(today);
  state.rows = [{ name: "", amount: "" }]; renderItems();
  setType("expense"); setMode("package");
  const savedDate = new Date(data.transaction_date + "T00:00:00");
  $("yearFilter").value = String(savedDate.getFullYear());
  $("monthFilter").value = String(savedDate.getMonth());
  state.allTime = false;
  fillFilters(); renderSuggestions(); render();
  setStatus("تم حفظ العملية بنجاح.");
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
}
