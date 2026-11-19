import { supabase } from "./supabase.js";
import { getProductAccess } from "./product-access.js";

const status = document.getElementById("status");
const signOutButton = document.getElementById("signOut");

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.replace("/index.html");
    return false;
  }

  try {
    const access = await getProductAccess(data.session.user.id);
    if (access.finance && !access.todo) {
      window.location.replace("/finance.html");
      return false;
    }
    if (access.todo && !access.finance) {
      window.location.replace("/learning-plan.html");
      return false;
    }
    if (!access.finance && !access.todo) {
      window.location.replace("/index.html");
      return false;
    }
    return true;
  } catch {
    status.textContent = "تعذر تحميل صلاحيات المنتجات. شغّل ملف user-products-schema.sql في Supabase.";
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
  window.location.replace("/index.html");
});

await requireSession();
