/***********************
 * PWA Registration
 ***********************/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('[PWA] SW registered:', reg.scope))
      .catch(err => console.warn('[PWA] SW register failed:', err));
  });
}

// ปุ่มติดตั้ง (เฉพาะเบราว์เซอร์ที่รองรับ)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBtn();
});

function showInstallBtn() {
  if (document.getElementById('installBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'installBtn';
  btn.className = 'install-btn';
  btn.innerHTML = '📲 ติดตั้งแอป';
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.remove();
  });
  document.body.appendChild(btn);
}
