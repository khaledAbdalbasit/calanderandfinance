import { supabase } from "./supabase.js";

const cacheKey = userId => `productAccess:${userId}`;

function readCachedAccess(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const access = JSON.parse(raw);
    if (typeof access?.finance !== "boolean" || typeof access?.todo !== "boolean") return null;
    return access;
  } catch {
    return null;
  }
}

export async function getProductAccess(userId) {
  const cached = readCachedAccess(userId);

  if (!navigator.onLine) {
    if (cached) return cached;
    throw new Error("Product access is not cached for offline use.");
  }

  try {
    const query = supabase
      .from("user_products")
      .select("finance_enabled,todo_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Product access request timed out.")), 5000);
    });

    const { data, error } = await Promise.race([query, timeout]);
    if (error) throw error;
    if (!data) throw new Error("Product access is not configured for this account.");

    const access = {
      finance: Boolean(data.finance_enabled),
      todo: Boolean(data.todo_enabled)
    };
    localStorage.setItem(cacheKey(userId), JSON.stringify(access));
    return access;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export async function redirectToUserHome(user) {
  const access = await getProductAccess(user.id);
  const destination = access.finance && access.todo
    ? "/dashboard"
    : access.finance
      ? "/finance"
      : "/learning-plan";

  window.location.replace(destination);
}

export async function requireProduct(product) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.replace("/");
    return false;
  }

  let access;
  try {
    access = await getProductAccess(data.session.user.id);
  } catch {
    window.location.replace("/offline");
    return false;
  }

  if (!access[product]) {
    await redirectToUserHome(data.session.user);
    return false;
  }

  return true;
}
