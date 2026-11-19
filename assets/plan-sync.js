import { supabase } from "./supabase.js";

let currentUserId = null;
let saveTimer = null;
let channel = null;
let latestState = null;

async function savePlanNow(state) {
  if (!currentUserId) return;
  const { error } = await supabase
    .from("user_learning_plans")
    .upsert(
      { user_id: currentUserId, plan_data: state },
      { onConflict: "user_id" }
    );

  if (error) throw error;
  latestState = null;
}

window.addEventListener("online", () => {
  if (!latestState || !currentUserId) return;
  savePlanNow(latestState).catch(error => {
    console.error("Cloud plan sync retry failed:", error);
  });
});

export async function loadPlanState(localState, onRemoteUpdate) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    throw sessionError || new Error("يجب تسجيل الدخول أولًا.");
  }

  currentUserId = session.user.id;

  const { data: productAccess, error: accessError } = await supabase
    .from("user_products")
    .select("todo_enabled")
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (accessError || !productAccess?.todo_enabled) {
    throw accessError || new Error("هذا الحساب لا يملك صلاحية استخدام To-Do List.");
  }

  const { data, error } = await supabase
    .from("user_learning_plans")
    .select("plan_data")
    .eq("user_id", currentUserId)
    .maybeSingle();

  let initialState;
  if (!error && data?.plan_data && typeof data.plan_data === "object") {
    initialState = { ...localState, ...data.plan_data };
  } else {
    initialState = localState;
    latestState = structuredClone(initialState);
    if (!error) {
      try {
        await savePlanNow(initialState);
      } catch (saveError) {
        console.error("Initial cloud plan save failed:", saveError);
      }
    } else {
      console.error("Cloud plan load failed; using local copy:", error);
    }
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

export function queuePlanSave(state) {
  if (!currentUserId) return;
  clearTimeout(saveTimer);
  latestState = structuredClone(state);
  saveTimer = setTimeout(() => {
    savePlanNow(latestState).catch(error => {
      console.error("Cloud plan sync failed:", error);
    });
  }, 700);
}
