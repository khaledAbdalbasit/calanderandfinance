import { getUser, logout, onAuthChange } from './netlify-identity.js';

const button = document.getElementById('planSignOut');
const status = document.getElementById('sessionStatus');
const signIn = () => window.location.replace('/index.html');

// Recheck when restoring a page from the browser's back/forward cache.
window.addEventListener('pageshow', async () => {
  if (!await getUser()) signIn();
});
onAuthChange((_event, user) => {
  if (!user) signIn();
});
if (!await getUser()) signIn();

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'جارٍ تسجيل الخروج…';
  try {
    await logout();
    signIn();
  } catch {
    status.textContent = 'تعذر تسجيل الخروج. تحقق من الاتصال وحاول مرة أخرى.';
    button.disabled = false;
  }
});
