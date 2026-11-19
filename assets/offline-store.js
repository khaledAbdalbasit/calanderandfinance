const DB_NAME = "personal-dashboard-offline";
const DB_VERSION = 1;
const STORES = ["transactions", "budgets", "plans", "queue"];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("transactions")) db.createObjectStore("transactions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("budgets")) db.createObjectStore("budgets", { keyPath: "id" });
      if (!db.objectStoreNames.contains("plans")) db.createObjectStore("plans", { keyPath: "userId" });
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(name, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(name, mode);
    const store = transaction.objectStore(name);
    let result;
    try { result = action(store); } catch (error) { reject(error); db.close(); return; }
    transaction.oncomplete = () => { db.close(); resolve(result?.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

export async function getCachedRows(storeName, userId) {
  if (!STORES.includes(storeName) || storeName === "plans" || storeName === "queue") throw new Error("Invalid cache store.");
  const rows = await withStore(storeName, "readonly", store => store.getAll());
  return (rows || []).filter(row => row.user_id === userId);
}

export function putCachedRow(storeName, row) {
  if (!["transactions", "budgets"].includes(storeName)) throw new Error("Invalid cache store.");
  return withStore(storeName, "readwrite", store => store.put(row));
}

export function deleteCachedRow(storeName, id) {
  if (!["transactions", "budgets"].includes(storeName)) throw new Error("Invalid cache store.");
  return withStore(storeName, "readwrite", store => store.delete(id));
}

export function getCachedPlan(userId) {
  return withStore("plans", "readonly", store => store.get(userId));
}

export function putCachedPlan(userId, state) {
  return withStore("plans", "readwrite", store => store.put({ userId, state, updatedAt: new Date().toISOString() }));
}

export function queueOfflineChange(id, userId, type, payload) {
  return withStore("queue", "readwrite", store => store.put({
    id, userId, type, payload, updatedAt: new Date().toISOString()
  }));
}

export async function getPendingChanges(userId) {
  const rows = await withStore("queue", "readonly", store => store.getAll());
  return (rows || []).filter(row => row.userId === userId).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function syncOfflineQueue(supabase, userId) {
  if (!navigator.onLine) return { synced: 0, pending: (await getPendingChanges(userId)).length };
  const pending = await getPendingChanges(userId);
  let synced = 0;

  for (const item of pending) {
    let result;
    if (item.type === "transaction-upsert") {
      result = await supabase.from("finance_transactions").upsert(item.payload, { onConflict: "id" });
    } else if (item.type === "transaction-delete") {
      result = await supabase.from("finance_transactions").delete().eq("id", item.payload.id).eq("user_id", userId);
    } else if (item.type === "budget-upsert") {
      result = await supabase.from("finance_budgets").upsert(item.payload, { onConflict: "id" });
    } else if (item.type === "budget-delete") {
      result = await supabase.from("finance_budgets").delete().eq("id", item.payload.id).eq("user_id", userId);
    } else if (item.type === "plan-upsert") {
      result = await supabase.from("user_learning_plans").upsert(
        { user_id: userId, plan_data: item.payload },
        { onConflict: "user_id" }
      );
    } else {
      continue;
    }

    if (result.error) continue;
    await withStore("queue", "readwrite", store => store.delete(item.id));
    synced++;
  }

  return { synced, pending: (await getPendingChanges(userId)).length };
}
