
import { supabase } from "./supabase.js";
import { getProductAccess } from "./product-access.js";
import {
  getCachedPlan,
  putCachedPlan,
  queueOfflineChange,
  getPendingChanges,
  syncOfflineQueue
} from "./offline-store.js";

let currentUserId = null;
let saveTimer = null;
let channel = null;

export function getUserPlanStorageKey() {
  return currentUserId ? `learningPlanState:${currentUserId}` : null;
}

async function syncPlan() {
  if (!currentUserId || !navigator.onLine) return;

  try {
    await syncOfflineQueue(supabase, currentUserId);
  } catch (error) {
    console.error("Cloud plan sync failed:", error);
  }
}

window.addEventListener("app-online", syncPlan);
window.addEventListener("online", syncPlan);

export async function loadPlanState(localState, onRemoteUpdate, preferLocal = false) {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    throw sessionError || new Error("يجب تسجيل الدخول أولًا.");
  }

  currentUserId = session.user.id;

  const access = await getProductAccess(currentUserId);

  if (!access.todo) {
    throw new Error("هذا الحساب لا يملك صلاحية استخدام To-Do List.");
  }

  const cached = await getCachedPlan(currentUserId);
  let initialState = preferLocal || !cached ? localState : cached.state;

  const pending = await getPendingChanges(currentUserId);
  const hasPendingPlan = pending.some(item => item.type === "plan-upsert");

  if (navigator.onLine) {
    await syncPlan();

    const remaining = await getPendingChanges(currentUserId);
    const stillHasPendingPlan = remaining.some(
      item => item.type === "plan-upsert"
    );

    if (!stillHasPendingPlan) {
      const { data, error } = await supabase
        .from("user_learning_plans")
        .select("plan_data")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!error && data?.plan_data && typeof data.plan_data === "object") {
        initialState = {
          ...localState,
          ...(cached?.state || {}),
          ...data.plan_data
        };

        await putCachedPlan(currentUserId, initialState);
      } else if (error) {
        console.error("Cloud plan load failed; using local copy:", error);
      }
    }
  }

  if (!cached && !hasPendingPlan) {
    await putCachedPlan(currentUserId, initialState);
  }

  if (navigator.onLine) {
    if (channel) {
      await supabase.removeChannel(channel);
      channel = null;
    }

    channel = supabase
      .channel(`learning-plan-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_learning_plans",
          filter: `user_id=eq.${currentUserId}`
        },
        async payload => {
          if (payload.eventType === "DELETE" || !payload.new?.plan_data) return;

          const queue = await getPendingChanges(currentUserId);

          if (queue.some(item => item.type === "plan-upsert")) return;

          initialState = payload.new.plan_data;

          await putCachedPlan(currentUserId, initialState);
          onRemoteUpdate(initialState);
        }
      )
      .subscribe();
  }

  return initialState;
}

export function queuePlanSave(state) {
  if (!currentUserId) return;

  const snapshot = structuredClone(state);

  clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    await putCachedPlan(currentUserId, snapshot);

    await queueOfflineChange(
      `plan:${currentUserId}`,
      currentUserId,
      "plan-upsert",
      snapshot
    );

    if (navigator.onLine) {
      await syncPlan();
    }
  }, 0);
}
