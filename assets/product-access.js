import { supabase } from "./supabase.js";

const cacheKey = userId => `productAccess:${userId}`;

export async function getProductAccess(userId) {
  try {
    const { data, error } = await supabase
      .from("user_products")
      .select("finance_enabled,todo_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Product access is not configured for this account.");

    const access = {
      finance: Boolean(data.finance_enabled),
      todo: Boolean(data.todo_enabled)
    };
    localStorage.setItem(cacheKey(userId), JSON.stringify(access));
    return access;
  } catch (error) {
    const cached = localStorage.getItem(cacheKey(userId));
    if (!cached) throw error;
    return JSON.parse(cached);
  }
}

export async function redirectToUserHome(user) {
  const access = await getProductAccess(user.id);
  const destination = access.finance && access.todo
    ? "/dashboard.html"
    : access.finance
      ? "/finance.html"
      : "/learning-plan.html";

  window.location.replace(destination);
}

export async function requireProduct(product) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.replace("/index.html");
    return false;
  }

  let access;
  try {
    access = await getProductAccess(data.session.user.id);
  } catch {
    window.location.replace("/index.html?productAccess=setup");
    return false;
  }

  if (!access[product]) {
    window.location.replace("/dashboard.html");
    return false;
  }

  return true;
}
