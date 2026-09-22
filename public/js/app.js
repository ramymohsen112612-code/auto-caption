// ========== Firebase Config ==========
// ⚠️ استبدل ده بـ config بتاعك من Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCSsxPXHaXxfSr-RAdw_O2FM302EgAw5Bg",
  authDomain: "mohamed90-54881.firebaseapp.com",
  databaseURL: "https://mohamed90-54881-default-rtdb.firebaseio.com",
  projectId: "mohamed90-54881",
  storageBucket: "mohamed90-54881.appspot.com",
  messagingSenderId: "352861299540",
  appId: "1:352861299540:web:7cbf229f1d39131586dec1",
  measurementId: "G-SGSN7626XK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ========== DOM Elements ==========
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const regError = document.getElementById('regError');
const loginSpinner = document.getElementById('loginSpinner');
const regSpinner = document.getElementById('regSpinner');
const loginBtnText = document.getElementById('loginBtnText');
const regBtnText = document.getElementById('regBtnText');
const authTabs = document.querySelectorAll('.auth-tab');

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const logoutBtn = document.getElementById('logoutBtn');

const userChip = document.getElementById('userChip');
const userChipName = document.getElementById('userChipName');
const userChipAvatar = document.getElementById('userChipAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');

const historyList = document.getElementById('historyList');
const statUploads = document.getElementById('statUploads');
const statTime = document.getElementById('statTime');
const statSize = document.getElementById('statSize');
const monthFiles = document.getElementById('monthFiles');
const monthSize = document.getElementById('monthSize');
const monthDuration = document.getElementById('monthDuration');
const globalVisitors = document.getElementById('globalVisitors');


// ========== Global Loading ==========
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingTitle = document.getElementById('loadingTitle');
const loadingFill = document.getElementById('loadingFill');
const loadingText = document.getElementById('loadingText');

function showLoader(title, text, determinate = false) {
  loadingTitle.textContent = title || 'جاري التحميل';
  loadingText.innerHTML = (text || 'انتظر لحظة') + '<span class="loading-dots"></span>';
  loadingFill.classList.remove('indeterminate');
  loadingFill.style.width = '0%';
  
  if (!determinate) {
    loadingFill.classList.add('indeterminate');
  }
  
  loadingOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideLoader() {
  loadingOverlay.classList.remove('active');
  document.body.style.overflow = '';
  loadingFill.style.width = '0%';
  loadingFill.classList.remove('indeterminate');
}

function setLoaderProgress(percent, text) {
  loadingFill.classList.remove('indeterminate');
  loadingFill.style.width = percent + '%';
  if (text) {
    loadingText.innerHTML = text + '<span class="loading-dots"></span>';
  }
}

// ========== Cookie Helpers ==========
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

// ========== Device Info ==========
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'Desktop';
  let deviceModel = 'Unknown';

  if (/Android/.test(ua)) {
    deviceType = 'Android';
    const match = ua.match(/Android [\d.]+; ([^;)]+)/);
    deviceModel = match ? match[1].trim() : 'Android Device';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    deviceType = /iPad/.test(ua) ? 'iPad' : 'iPhone';
    const match = ua.match(/\(([^;]+);/);
    deviceModel = match ? match[1] : 'Apple Device';
  } else if (/Windows/.test(ua)) {
    deviceType = 'Windows';
    deviceModel = 'PC';
  } else if (/Mac/.test(ua)) {
    deviceType = 'Mac';
    deviceModel = 'Mac';
  } else if (/Linux/.test(ua)) {
    deviceType = 'Linux';
    deviceModel = 'PC';
  }

  return {
    type: deviceType,
    model: deviceModel,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 'unknown',
    memory: navigator.deviceMemory || 'unknown',
    connection: navigator.connection ? navigator.connection.effectiveType : 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: Date.now()
  };
}

// ========== Visitor Tracking ==========
function trackVisitor() {
  const visitedBefore = getCookie('captionai_visited');
  if (visitedBefore) return;

  setCookie('captionai_visited', '1', 365);

  const visitorRef = db.ref('visitors').push();
  visitorRef.set({
    ...getDeviceInfo(),
    firstVisit: true
  });

  const counterRef = db.ref('stats/visitorCount');
  counterRef.transaction(current => (current || 0) + 1);
}

db.ref('stats/visitorCount').on('value', snap => {
  const count = snap.val() || 0;
  globalVisitors.textContent = count.toLocaleString('ar-EG');
});

// ========== Auth State ==========
let currentUser = null;
let userDataRef = null;
let sessionStart = Date.now();

auth.onAuthStateChanged(user => {
  currentUser = user;

  if (user) {
    authOverlay.classList.add('hidden');
    userChip.style.display = 'flex';

    const displayName = user.displayName || 'مستخدم';
    const email = user.email || '-';

    userChipName.textContent = displayName;
    userChipAvatar.textContent = displayName.charAt(0).toUpperCase();

    userName.textContent = displayName;
    userEmail.textContent = email;
    userAvatar.textContent = displayName.charAt(0).toUpperCase();

    const safeEmail = email.replace(/[.#$\[\]]/g, '_');
    userDataRef = db.ref('users/' + safeEmail);

    loadUserData();
    sessionStart = Date.now();

  } else {
    authOverlay.classList.remove('hidden');
    userChip.style.display = 'none';
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');

    userName.textContent = 'زائر';
    userEmail.textContent = '-';
    userAvatar.textContent = '👤';

    historyList.innerHTML = '<div class="history-empty">سجّل دخول عشان تشوف السجل</div>';
    resetStats();
  }
});

// ========== Auth Forms ==========
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    loginForm.style.display = target === 'login' ? 'block' : 'none';
    registerForm.style.display = target === 'register' ? 'block' : 'none';
    loginError.textContent = '';
    regError.textContent = '';
  });
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  loginSpinner.style.display = 'block';
  loginBtnText.textContent = 'جاري الدخول...';
  loginError.textContent = '';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginError.textContent = translateError(err.code);
  } finally {
    loginSpinner.style.display = 'none';
    loginBtnText.textContent = 'دخول';
  }
});

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  regSpinner.style.display = 'block';
  regBtnText.textContent = 'جاري الإنشاء...';
  regError.textContent = '';

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    const safeEmail = email.replace(/[.#$\[\]]/g, '_');
    await db.ref('users/' + safeEmail + '/profile').set({
      name: name,
      email: email,
      createdAt: Date.now(),
      device: getDeviceInfo()
    });

  } catch (err) {
    regError.textContent = translateError(err.code);
  } finally {
    regSpinner.style.display = 'none';
    regBtnText.textContent = 'إنشاء الحساب';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await saveSessionTime();
  await auth.signOut();
});
// Google Sign In
const googleBtn = document.getElementById('googleBtn');
googleBtn.addEventListener('click', async () => {
  loginError.textContent = '';
  googleBtn.disabled = true;
  googleBtn.style.opacity = '0.6';

  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;

    // Save user to database if new
    const safeEmail = user.email.replace(/[.#$\[\]]/g, '_');
    const userRef = db.ref('users/' + safeEmail + '/profile');

    const snapshot = await userRef.once('value');
    if (!snapshot.exists()) {
      await userRef.set({
        name: user.displayName || 'مستخدم Google',
        email: user.email,
        photoURL: user.photoURL || '',
        createdAt: Date.now(),
        device: getDeviceInfo(),
        provider: 'google'
      });
    }

  } catch (err) {
    console.error('Google Sign In Error:', err);
    loginError.textContent = translateError(err.code) || 'فشل الدخول بـ Google، جرب تاني';
  } finally {
    googleBtn.disabled = false;
    googleBtn.style.opacity = '1';
  }
});

function translateError(code) {
  const errors = {
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
    'auth/user-disabled': 'الحساب معطل',
    'auth/user-not-found': 'مفيش حساب بالبريد ده',
    'auth/wrong-password': 'كلمة المرور غلط',
    'auth/email-already-in-use': 'البريد ده مستخدم قبل كده',
    'auth/weak-password': 'كلمة المرور ضعيفة (8 أحرف على الأقل)',
    'auth/invalid-credential': 'البريد أو الباسورد غلط',
    'auth/network-request-failed': 'مشكلة في الاتصال بالنت',
    'auth/too-many-requests': 'محاولات كتير، جرب بعدين',
    'auth/popup-closed-by-user': 'تم إغلاق النافذة قبل إكمال الدخول',
    'auth/popup-blocked': 'المتصفح منع النافذة المنبثقة، اسمح بالنوافذ المنبثقة',
    'auth/cancelled-popup-request': 'تم إلغاء طلب الدخول',
    'auth/account-exists-with-different-credential': 'الإيميل ده مسجل بطريقة تانية، جرب تسجيل الدخول العادي',
  };
  
  return errors[code] || 'حدث خطأ، جرب تاني';
}

// ========== User Data Management ==========
function loadUserData() {
  if (!userDataRef) return;

  userDataRef.on('value', snap => {
    const data = snap.val() || {};

    const uploads = data.uploads || {};
    const uploadList = Object.values(uploads);

    statUploads.textContent = uploadList.length;

    const totalSize = uploadList.reduce((sum, u) => sum + (u.size || 0), 0);
    statSize.textContent = formatSize(totalSize);

    const totalTime = uploadList.reduce((sum, u) => sum + (u.duration || 0), 0);
    statTime.textContent = formatDuration(totalTime);

    const now = new Date();
    const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthly = data.monthlyStats?.[monthKey] || { files: 0, size: 0, duration: 0 };

    monthFiles.textContent = monthly.files || 0;
    monthSize.textContent = formatSize(monthly.size || 0);
    monthDuration.textContent = formatDuration((monthly.duration || 0) * 60);

    renderHistory(uploadList);
  });
}

function renderHistory(uploads) {
  if (!uploads.length) {
    historyList.innerHTML = '<div class="history-empty">مفيش تحويلات لسه</div>';
    return;
  }

  historyList.innerHTML = uploads
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
    .map(item => `
      <div class="history-item" data-id="${item.id || ''}">
        <span class="history-icon">🎬</span>
        <div class="history-info">
          <span class="history-name">${escapeHtml(item.fileName || 'ملف')}</span>
          <span class="history-meta">${formatSize(item.size || 0)} · ${formatDate(item.timestamp)}</span>
        </div>
      </div>
    `).join('');
}

function resetStats() {
  statUploads.textContent = '0';
  statTime.textContent = '0د';
  statSize.textContent = '0MB';
  monthFiles.textContent = '0';
  monthSize.textContent = '0 MB';
  monthDuration.textContent = '0 دقيقة';
}

async function saveSessionTime() {
  if (!currentUser || !userDataRef) return;
  const sessionTime = Math.floor((Date.now() - sessionStart) / 1000);
  if (sessionTime < 10) return;

  const today = new Date().toISOString().split('T')[0];
  await userDataRef.child('usage/' + today).transaction(current => {
    return (current || 0) + sessionTime;
  });
}

window.addEventListener('beforeunload', () => {
  saveSessionTime();
});

// ========== Upload Tracking ==========
async function trackUpload(fileData) {
  if (!currentUser || !userDataRef) return;

  const uploadId = Date.now().toString();
  const uploadData = {
    id: uploadId,
    fileName: fileData.name,
    size: fileData.size,
    timestamp: Date.now(),
    language: fileData.language,
    duration: fileData.duration || 0
  };

  await userDataRef.child('uploads/' + uploadId).set(uploadData);

  const now = new Date();
  const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthRef = userDataRef.child('monthlyStats/' + monthKey);

  await monthRef.transaction(current => {
    if (!current) current = { files: 0, size: 0, duration: 0 };
    return {
      files: (current.files || 0) + 1,
      size: (current.size || 0) + (fileData.size || 0),
      duration: (current.duration || 0) + (fileData.duration || 0)
    };
  });
}

// ========== Helpers ==========
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '0د';
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return hrs + 'س';
  return mins + 'د';
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== Sidebar Toggle ==========
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
});

sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

// ========== Dark Mode ==========
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ========== Original App Logic ==========
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileRemove = document.getElementById('fileRemove');
const generateBtn = document.getElementById('generateBtn');
const languageSelect = document.getElementById('languageSelect');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const resetBtn = document.getElementById('resetBtn');
const previewContent = document.getElementById('previewContent');
const previewCount = document.getElementById('previewCount');
const resultsMeta = document.getElementById('resultsMeta');

const steps = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4')
];

let currentFile = null;
let currentFormat = 'all';
let resultData = null;

// Format chips
document.querySelectorAll('.format-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFormat = chip.dataset.format;
  });
});

// File upload
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleFile(file) {
  if (!file) return;
  const allowedTypes = [
    'video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/mp3'
  ];
  if (!allowedTypes.includes(file.type)) {
    showError('نوع الملف غير مدعوم. استخدم MP4, MOV, AVI, MKV, WEBM, MP3, أو WAV');
    return;
  }
  if (file.size > 500 * 1024 * 1024) {
    showError('حجم الملف أكبر من 500 ميجا. جرب ملف أصغر.');
    return;
  }
  currentFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  filePreview.style.display = 'flex';
  generateBtn.disabled = false;
  filePreview.style.animation = 'none';
  filePreview.offsetHeight;
  filePreview.style.animation = 'fadeIn 0.3s ease';
}

uploadZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

fileRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  currentFile = null;
  filePreview.style.display = 'none';
  generateBtn.disabled = true;
  fileInput.value = '';
});

// Progress
function setProgress(percent, status, stepIndex) {
  progressFill.style.width = percent + '%';
  progressPercent.textContent = Math.round(percent) + '%';
  progressStatus.textContent = status;
  steps.forEach((step, i) => {
    step.classList.remove('active', 'completed');
    if (i < stepIndex) step.classList.add('completed');
    else if (i === stepIndex) step.classList.add('active');
  });
}

function simulateProgress(callback) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 8;
    if (progress > 95) progress = 95;
    progressFill.style.width = progress + '%';
    progressPercent.textContent = Math.round(progress) + '%';
    if (progress >= 90) { clearInterval(interval); if (callback) callback(); }
  }, 300);
  return interval;
}

// Generate
generateBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  if (!currentUser) {
    showError('لازم تسجل دخول الأول!');
    authOverlay.classList.remove('hidden');
    return;
  }

  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';
  progressSection.style.display = 'block';
  generateBtn.disabled = true;
  setProgress(0, 'جاري رفع الملف...', 0);

  const formData = new FormData();
  formData.append('video', currentFile);
  formData.append('language', languageSelect.value);

  const progressInterval = simulateProgress();

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    clearInterval(progressInterval);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'حدث خطأ في السيرفر');
    }
    resultData = await response.json();
    setProgress(100, 'تم بنجاح!', 3);

    await trackUpload({
      name: currentFile.name,
      size: currentFile.size,
      language: languageSelect.value,
      duration: resultData.duration || 0
    });

    setTimeout(() => showResults(resultData), 500);
  } catch (error) {
    clearInterval(progressInterval);
    console.error(error);
    showError(error.message || 'فشل الاتصال بالسيرفر. تأكد إن السيرفر شغال.');
  }
});

// Show Results
function showResults(data) {
  progressSection.style.display = 'none';
  resultsSection.style.display = 'block';

  const langNames = {
    ar: 'العربية', en: 'English', fr: 'Français', es: 'Español',
    de: 'Deutsch', it: 'Italiano', pt: 'Português', ru: 'Русский',
    zh: '中文', ja: '日本語', ko: '한국어', tr: 'Türkçe', hi: 'हिन्दी'
  };
  const lang = langNames[data.language] || data.language || 'مكتشفة';
  const mins = Math.floor(data.duration / 60);
  const secs = Math.floor(data.duration % 60);
  resultsMeta.textContent = `اللغة: ${lang} | المدة: ${mins}:${String(secs).padStart(2, '0')}`;

  previewContent.innerHTML = '';
  const segments = data.segments.slice(0, 20);
  segments.forEach((seg, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.style.animationDelay = (i * 0.03) + 's';
    const start = formatTime(seg.start);
    const end = formatTime(seg.end);
    item.innerHTML = `
      <span class="preview-time">${start} → ${end}</span>
      <span class="preview-text">${escapeHtml(seg.text)}</span>
    `;
    previewContent.appendChild(item);
  });

  if (data.segments.length > 20) {
    const more = document.createElement('div');
    more.className = 'preview-item';
    more.style.justifyContent = 'center';
    more.innerHTML = `<span style="color: var(--text-muted); font-size: 12px;">... و ${data.segments.length - 20} جملة أخرى</span>`;
    previewContent.appendChild(more);
  }

  previewCount.textContent = `${data.segments.length} جملة`;
  document.getElementById('downloadSrt').href = data.files.srt;
  document.getElementById('downloadVtt').href = data.files.vtt;
  document.getElementById('downloadTxt').href = data.files.txt;
  updateDownloadButtons();
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateDownloadButtons() {
  const srtBtn = document.getElementById('downloadSrt').parentElement;
  const vttBtn = document.getElementById('downloadVtt').parentElement;
  const txtBtn = document.getElementById('downloadTxt').parentElement;
  srtBtn.style.display = (currentFormat === 'all' || currentFormat === 'srt') ? 'flex' : 'none';
  vttBtn.style.display = (currentFormat === 'all' || currentFormat === 'vtt') ? 'flex' : 'none';
  txtBtn.style.display = (currentFormat === 'all' || currentFormat === 'txt') ? 'flex' : 'none';
}

function showError(msg) {
  progressSection.style.display = 'none';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = msg;
  generateBtn.disabled = false;
  errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

retryBtn.addEventListener('click', () => {
  errorSection.style.display = 'none';
  generateBtn.disabled = false;
});

resetBtn.addEventListener('click', () => {
  currentFile = null;
  resultData = null;
  filePreview.style.display = 'none';
  progressSection.style.display = 'none';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';
  generateBtn.disabled = true;
  fileInput.value = '';
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ========== Init ==========
trackVisitor();

const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.style.animationPlayState = 'running';
  });
}, observerOptions);
document.querySelectorAll('.card').forEach(card => observer.observe(card));

console.log('%c CaptionAI ', 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-size: 20px; font-weight: bold; padding: 8px 16px; border-radius: 8px;');
console.log('%c توليد كابشن ذكي بالذكاء الاصطناعي ', 'color: #3b82f6; font-size: 14px;');


