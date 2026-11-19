import { supabase } from "./supabase.js";
import { redirectToUserHome } from "./product-access.js";

const $ = id => document.getElementById(id);
const form = $("authForm");
const status = $("authStatus");
const signInButton = $("signInBtn");
const signUpButton = $("signUpBtn");
const signOutButton = $("signOutBtn");
const createAccountButton = $("createAccountBtn");
const cancelSignupButton = $("cancelSignupBtn");
const productChoice = $("productChoice");
let busy = false;
let authMode = "login";
let redirecting = false;

function message(text, error = false) {
  status.textContent = text;
  status.style.color = error ? "var(--red)" : "";
}

function setBusy(value) {
  busy = value;
  form.setAttribute("aria-busy", String(value));
  form.querySelectorAll("button, input").forEach(element => {
    element.disabled = value;
  });
}

function renderSession(session) {
  const user = session?.user ?? null;
  $("authFields").hidden = Boolean(user);
  signInButton.hidden = Boolean(user) || authMode === "signup";
  signUpButton.hidden = Boolean(user) || authMode === "signup";
  createAccountButton.hidden = Boolean(user) || authMode !== "signup";
  cancelSignupButton.hidden = Boolean(user) || authMode !== "signup";
  productChoice.hidden = Boolean(user) || authMode !== "signup";
  signOutButton.hidden = !user;
  $("authEmail").required = !user;
  $("authPassword").required = !user;

  if (user) {
    message(`تم تسجيل الدخول: ${user.email || ""} — جارٍ فتح المنتجات المتاحة…`);
    if (!redirecting) {
      redirecting = true;
      redirectToUserHome(user).catch(() => {
        redirecting = false;
        message("تعذر تحميل صلاحيات المنتجات. شغّل ملف user-products-schema.sql في Supabase ثم حاول مرة أخرى.", true);
      });
    }
  } else {
    message("سجّل الدخول أو أنشئ حسابًا جديدًا للوصول إلى منتجاتك.");
  }
}

function showError(error) {
  const detail = String(error?.message || "").toLowerCase();
  let text = "تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وحاول مرة أخرى.";

  if (/invalid login credentials|invalid.*credentials/.test(detail)) {
    text = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  } else if (/email not confirmed/.test(detail)) {
    text = "يجب تأكيد بريدك الإلكتروني من رسالة التفعيل قبل تسجيل الدخول.";
  } else if (/already registered|user already registered/.test(detail)) {
    text = "هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.";
  } else if (/password/.test(detail) && /at least|characters|short|weak/.test(detail)) {
    text = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  } else if (/rate limit|too many requests/.test(detail)) {
    text = "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
  } else if (/expired|invalid.*token|token.*invalid/.test(detail)) {
    text = "رابط التفعيل غير صالح أو انتهت صلاحيته. اطلب رابط تفعيل جديدًا.";
  }

  message(text, true);
}

async function authenticate(action) {
  if (busy) return;
  $("authEmail").value = $("authEmail").value.trim();
  if (!form.reportValidity()) return;

  const email = $("authEmail").value;
  const password = $("authPassword").value;

  if (action === "signup" && password.length < 8) {
    message("استخدم كلمة مرور من 8 أحرف على الأقل.", true);
    return;
  }

  setBusy(true);
  message(action === "signup" ? "جارٍ إنشاء الحساب…" : "جارٍ تسجيل الدخول…");

  try {
    if (action === "signup") {
      const products = [...document.querySelectorAll('input[name="products"]:checked')].map(input => input.value);
      if (!products.length) {
        message("اختار Finance أو To-Do List أو الاتنين قبل إنشاء الحساب.", true);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { products },
          emailRedirectTo: `${window.location.origin}/index.html`
        }
      });
      if (error) throw error;

      if (data.session) {
        await redirectToUserHome(data.user);
      } else {
        message("تم إنشاء الحساب واختيار المنتجات. افتح رسالة التفعيل التي أرسلناها إلى بريدك الإلكتروني، ثم اضغط رابط التأكيد لتفعيل الحساب.");
        $("authPassword").value = "";
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await redirectToUserHome(data.user);
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  authenticate(authMode);
});
signUpButton.addEventListener("click", () => {
  authMode = "signup";
  renderSession(null);
});
cancelSignupButton.addEventListener("click", () => {
  authMode = "login";
  renderSession(null);
});

signOutButton.addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    message("تم تسجيل الخروج.");
    $("authPassword").value = "";
    renderSession(null);
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});



try {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) {
    renderSession(data.session);
  } else {
    message("سجّل الدخول أو أنشئ حسابًا جديدًا للوصول إلى خطتك.");
  }
} catch (error) {
  showError(error);
} finally {
  setBusy(false);
}
