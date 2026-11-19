import { supabase } from "./supabase.js";
import { requireProduct } from "./product-access.js";

if (await requireProduct("todo")) {

const button = document.getElementById("planSignOut");
const status = document.getElementById("sessionStatus");
const signIn = () => window.location.replace("/index.html");

let checking = true;

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session && !checking) signIn();
});

try {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  checking = false;
  if (!data.session) signIn();
  else if (status) status.textContent = `متصل: ${data.session.user.email || ""}`;
} catch {
  checking = false;
  signIn();
}

window.addEventListener("pageshow", async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) signIn();
});

button?.addEventListener("click", async () => {
  button.disabled = true;
  if (status) status.textContent = "جارٍ تسجيل الخروج…";
  const { error } = await supabase.auth.signOut();
  if (error) {
    if (status) status.textContent = "تعذر تسجيل الخروج. تحقق من الاتصال وحاول مرة أخرى.";
    button.disabled = false;
    return;
  }
  signIn();
});

}
