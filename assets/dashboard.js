import { supabase } from "./supabase.js";

const status = document.getElementById("status");
const signOutButton = document.getElementById("signOut");

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.replace("/index.html");
    return false;
  }
  return true;
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
