const bar = document.createElement("div");
bar.id = "connectionStatus";
bar.setAttribute("role", "status");
bar.style.cssText = "position:fixed;z-index:2000;top:0;left:0;right:0;padding:8px 14px;text-align:center;background:#8b5e18;color:#fff;font:13px Tahoma,sans-serif;display:none;box-shadow:0 3px 14px #0004";
document.body.append(bar);

let installPrompt = null;

function showConnectionState() {
  if (!navigator.onLine) {
    bar.style.display = "block";
    bar.textContent = "أنت دلوقتي بدون إنترنت. تقدر تكمل شغلك، والتغييرات هتتحفظ على جهازك وتتزامن لما الاتصال يرجع.";
  } else {
    bar.style.display = "none";
    window.dispatchEvent(new CustomEvent("app-online"));
  }
}

window.addEventListener("online", showConnectionState);
window.addEventListener("offline", showConnectionState);
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
  if (document.getElementById("installAppButton")) return;
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
});
