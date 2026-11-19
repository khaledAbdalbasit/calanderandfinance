import { supabase } from "./supabase.js";
import { getPendingChanges, syncOfflineQueue } from "./offline-store.js";

const bar = document.createElement("div");
bar.id = "connectionStatus";
bar.setAttribute("role", "status");
bar.style.cssText = "position:fixed;z-index:2000;top:0;left:0;right:0;padding:8px 14px;text-align:center;background:#8b5e18;color:#fff;font:13px Tahoma,sans-serif;display:none;box-shadow:0 3px 14px #0004";
document.body.append(bar);

let installPrompt = null;

function showConnectionState() {
  bar.style.display = navigator.onLine ? "none" : "block";
  bar.textContent = "أنت غير متصل بالإنترنت — التغييرات هتتحفظ على الجهاز وتتزامن عند عودة الاتصال.";
}

async function syncWhenOnline() {
  showConnectionState();
  if (!navigator.onLine) return;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    const result = await syncOfflineQueue(supabase, userId);
    if (result.pending) {
      bar.style.display = "block";
      bar.style.background = "#8b5e18";
      bar.textContent = "في تغييرات مستنية المزامنة. هنحاول تاني تلقائيًا.";
    } else {
      bar.style.display = "none";
      window.dispatchEvent(new CustomEvent("offline-sync-complete"));
    }
  } catch (error) {
    console.error("Offline sync failed:", error);
  }
}

window.addEventListener("online", syncWhenOnline);
window.addEventListener("offline", showConnectionState);
window.addEventListener("focus", syncWhenOnline);
showConnectionState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  if (!document.getElementById("installAppButton")) {
    const button = document.createElement("button");
    button.id = "installAppButton";
    button.type = "button";
    button.textContent = "تثبيت التطبيق";
    button.style.cssText = "position:fixed;z-index:1999;bottom:18px;left:16px;border:0;border-radius:12px;padding:10px 14px;background:#356bb1;color:white;font:14px Tahoma,sans-serif;box-shadow:0 4px 16px #0005";
    button.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.remove();
    });
    document.body.append(button);
  }
});
