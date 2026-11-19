import { supabase } from "./supabase.js";

let currentUserId = null;
let saveTimer = null;
let channel = null;

export async function loadPlanState(localState, onRemoteUpdate) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError || new Error("يجب تسجيل الدخول أولًا.");

  currentUserId = user.id;

  const { data, error } = await supabase
    .from("user_learning_plans")
    .select("plan_data")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (error) throw error;

  let initialState;
  if (data?.plan_data && typeof data.plan_data === "object") {
    initialState = { ...localState, ...data.plan_data };
  } else {
    initialState = localState;
    await savePlanNow(initialState);
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
      payload => {
        if (payload.eventType === "DELETE" || !payload.new?.plan_data) return;
        onRemoteUpdate(payload.new.plan_data);
      }
    )
    .subscribe();

  return initialState;
}

async function savePlanNow(state) {
  if (!currentUserId) return;
  const { error } = await supabase
    .from("user_learning_plans")
    .upsert(
      { user_id: currentUserId, plan_data: state },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export function queuePlanSave(state) {
  if (!currentUserId) return;
  clearTimeout(saveTimer);
  const snapshot = structuredClone(state);
  saveTimer = setTimeout(() => {
    savePlanNow(snapshot).catch(error => {
      console.error("Cloud plan sync failed:", error);
    });
  }, 700);
}
