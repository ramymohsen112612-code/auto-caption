(function() {
  'use strict';

  // ========== Sound Engine ==========
  let soundEnabled = localStorage.getItem('adminSound') !== 'false';

  function playNotificationSound() {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // صوت "ding" لطيف (C5 → C6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
      
      // Echo ثانوي
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.4);
      }, 120);
      
    } catch(e) {
      console.log('Sound play failed:', e);
    }
  }

  // ========== Browser Notification ==========
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showBrowserNotification(text) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('رسالة من الأدمن 📢', {
        body: text,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'admin-message',
        requireInteraction: false
      });
    }
  }

  // ========== Main Init ==========
  function init() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      setTimeout(init, 300);
      return;
    }

    const db = firebase.database();
    const auth = firebase.auth();

    if (document.getElementById('adminToastOverlay')) return;

    // Request notification permission on first interaction
    document.addEventListener('click', requestNotificationPermission, { once: true });

    // Create Toast HTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="admin-toast-overlay" id="adminToastOverlay">
        <div class="admin-toast">
          <button class="admin-toast-close" id="adminToastClose">✕</button>
          <div class="admin-toast-icon">📢</div>
          <div class="admin-toast-text" id="adminToastText">...</div>
          <div class="admin-toast-bar">
            <div class="admin-toast-progress" id="adminToastProgress"></div>
          </div>
          <div class="admin-toast-meta">
            <span>🔔</span>
            <span>رسالة من الأدمن</span>
            <button class="sound-toggle" id="soundToggle" title="تشغيل/إيقاف الصوت">🔊</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);

    const overlay = document.getElementById('adminToastOverlay');
    const textEl = document.getElementById('adminToastText');
    const progressEl = document.getElementById('adminToastProgress');
    const closeBtn = document.getElementById('adminToastClose');
    const soundBtn = document.getElementById('soundToggle');

    // Sound toggle button
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEnabled = !soundEnabled;
      localStorage.setItem('adminSound', soundEnabled);
      soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    });

    let hideTimer = null;
    let shownMsgId = null;

    function show(text, msgId) {
      if (hideTimer) clearTimeout(hideTimer);
      
      textEl.textContent = text;
      shownMsgId = msgId;

      // Play sound
      playNotificationSound();
      
      // Browser notification
      showBrowserNotification(text);

      // Reset progress animation
      progressEl.style.animation = 'none';
      void progressEl.offsetWidth;
      progressEl.style.animation = '';

      overlay.classList.add('active');

      hideTimer = setTimeout(() => {
        overlay.classList.remove('active');
        shownMsgId = null;
      }, 10000);
    }

    function hide() {
      overlay.classList.remove('active');
      if (hideTimer) clearTimeout(hideTimer);
      shownMsgId = null;
    }

    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

    // Firebase Listener
    db.ref('adminMessages').on('value', (snap) => {
      const messages = snap.val();
      if (!messages) return;
      
      const now = Date.now();
      const user = auth.currentUser;
      const userEmail = user ? user.email : null;
      
      let latest = null;
      let latestId = null;

      Object.entries(messages).forEach(([id, msg]) => {
        if (!msg || typeof msg !== 'object') return;
        if (!msg.expiresAt || msg.expiresAt <= now) return;
        
        const isTarget = msg.target === 'all' || msg.target === userEmail;
        if (!isTarget) return;
        
        if (!latest || msg.timestamp > latest.timestamp) {
          latest = msg;
          latestId = id;
        }
      });

      if (latest && latestId !== shownMsgId) {
        show(latest.text, latestId);
      }
    }, (err) => {
      console.error('AdminMessages error:', err);
    });

    console.log('%c 📢 Admin Messages + Sound Ready ', 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 13px; font-weight: bold; padding: 4px 10px; border-radius: 6px;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();