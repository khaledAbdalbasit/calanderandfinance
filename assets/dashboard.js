import { supabase } from "./supabase.js";
import { getProductAccess } from "./product-access.js";

const status = document.getElementById("status");
const signOutButton = document.getElementById("signOut");
const todoProduct = document.getElementById("todoProduct");
const financeProduct = document.getElementById("financeProduct");

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.replace("/");
    return false;
  }

  try {
    const access = await getProductAccess(data.session.user.id);

    todoProduct.hidden = !access.todo;
    financeProduct.hidden = !access.finance;

    if (access.finance && access.todo) return true;
    if (access.finance) {
      window.location.replace("/finance");
      return false;
    }
    if (access.todo) {
      window.location.replace("/learning-plan");
      return false;
    }

    window.location.replace("/");
    return false;
  } catch {
    status.textContent = "تعذر تحميل صلاحيات المنتجات. افتح التطبيق بالإنترنت مرة واحدة لتجهيز وضع Offline.";
    return false;
  }
}

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  status.textContent = "جارٍ تسجيل الخروج...";
  const { error } = await supabase.auth.signOut();
  if (error) {
    status.textContent = "تعذر تسجيل الخروج. حاول مرة أخرى.";
    signOutButton.disabled = false;
    return;
  }
  window.location.replace("/");
});

await requireSession();
