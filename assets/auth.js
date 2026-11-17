const $ = id => document.getElementById(id);
const form = $('authForm');
const status = $('authStatus');
let identity;
let currentUser = null;
let busy = false;

function message(text, error = false) {
  status.textContent = text;
  status.style.color = error ? 'var(--red)' : '';
}

function renderUser(user) {
  currentUser = user;
  $('authFields').hidden = !!user;
  $('signInBtn').hidden = !!user;
  $('signUpBtn').hidden = !!user;
  $('signOutBtn').hidden = !user;
  // Hidden login fields must not block signing out.
  $('authEmail').required = !user;
  $('authPassword').required = !user;
  message(user ? `تم تسجيل الدخول: ${user.email}` : 'يمكنك تسجيل الدخول أو إنشاء حساب جديد.');
  if (user) window.location.replace('/learning-plan.html');
}

function setBusy(value) {
  busy = value;
  form.setAttribute('aria-busy', String(value));
  form.querySelectorAll('button, input').forEach(el => { el.disabled = value; });
}

function showError(error) {
  const detail = String(error.message || '').toLowerCase();
  let text = 'تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وحاول مرة أخرى.';
  if (/confirm|verified/.test(detail)) text = 'أكّد بريدك الإلكتروني من رسالة التفعيل قبل تسجيل الدخول، وراجع البريد غير المرغوب فيه.';
  else if (/already|registered|exists/.test(detail)) text = 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول.';
  else if (error.status === 401 || /invalid.*(credentials|password)|invalid_grant/.test(detail)) text = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  else if (error.status === 403) text = 'إنشاء الحسابات غير متاح حاليًا. حاول مرة أخرى لاحقًا.';
  else if (error.status === 422 || /password.*(short|least|weak)/.test(detail)) text = 'تحقق من البريد الإلكتروني، واستخدم كلمة مرور من 8 أحرف على الأقل.';
  else if (error.status === 429 || /rate|too many/.test(detail)) text = 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  else if (/token|expired/.test(detail)) text = 'رابط التفعيل غير صالح أو انتهت صلاحيته. أعد طلب إنشاء الحساب للحصول على رابط جديد.';
  message(text, true);
}

async function authenticate(action) {
  if (busy || !identity) return;
  $('authEmail').value = $('authEmail').value.trim();
  if (!form.reportValidity()) return;
  const email = $('authEmail').value;
  const password = $('authPassword').value;
  if (action === 'signup' && password.length < 8) {
    message('استخدم كلمة مرور من 8 أحرف على الأقل لإنشاء الحساب.', true);
    return;
  }
  setBusy(true);
  message(action === 'signup' ? 'جارٍ إنشاء الحساب…' : 'جارٍ تسجيل الدخول…');
  try {
    if (action === 'signup') {
      await identity.signup(email, password);
      renderUser(await identity.getUser());
      if (!currentUser) message('تم إرسال رابط التفعيل إلى بريدك الإلكتروني. افتح الرابط ثم سجّل الدخول، وراجع البريد غير المرغوب فيه.');
    } else {
      renderUser(await identity.login(email, password));
    }
    $('authPassword').value = '';
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  authenticate('login');
});
$('signUpBtn').addEventListener('click', () => authenticate('signup'));
$('signOutBtn').addEventListener('click', async () => {
  if (busy || !identity) return;
  setBusy(true);
  try {
    await identity.logout();
    renderUser(null);
    $('authPassword').value = '';
    message('تم تسجيل الخروج. تقدم الخطة ما زال محفوظًا في هذا المتصفح.');
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
});

try {
  identity = await import('./netlify-identity.js');
  identity.onAuthChange((_event, user) => renderUser(user));
  await identity.handleAuthCallback();
  renderUser(await identity.getUser());
} catch (error) {
  showError(error);
} finally {
  if (identity) setBusy(false);
}
