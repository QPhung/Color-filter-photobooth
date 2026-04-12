// =============================================================================
//  Eigenbooth — Homepage & Countdown Logic
// =============================================================================
//
//  EXPECTED ELEMENT IDs
//  ──────────────────────────────────────────────────────────────────────────
//  Screens (toggled via .active class):
//    #home-screen          — the homepage/intro screen
//    #countdown-screen     — the camera + countdown screen
//    #frame-screen         — (yours) frame & filter selection
//
//  Homepage:
//    #start-btn            — "Start Photobooth" button
//    #upload-btn-toggle    — "Upload Images" button (shows/hides upload zone)
//    #upload-zone          — the drop zone div
//    #upload-input         — <input type="file" accept="image/*" multiple>
//    #upload-preview       — container for thumbnail <img> elements
//    #upload-count         — text node showing "N images selected"
//
//  Countdown:
//    #camera-video         — <video autoplay playsinline muted>
//    #camera-frame         — the visual frame box (sized via JS)
//    #camera-error         — error state div (shown on permission denied)
//    #countdown-overlay    — fullscreen overlay inside the frame
//    #countdown-number     — the big 3 / 2 / 1 text
//    #countdown-message    — "Get ready..." / "Smile!" subtitle
//    #shot-indicator       — "Shot 1 of 3" label
//    #shots-strip          — container for captured thumbnail <img>s
//    #shoot-btn            — "Start Countdown" / "Next Shot" / "Choose Filters →"
//    #back-btn             — returns to homepage
//    #frame-w              — <input type="range"> for frame width
//    #frame-h              — <input type="range"> for frame height
//    #frame-w-val          — display span for width value
//    #frame-h-val          — display span for height value
//    .preset-btn           — frame aspect-ratio preset buttons
//                            each needs data-w and data-h attributes
//    #flash                — full-page white div for camera flash effect
//    #capture-canvas       — hidden <canvas> used for frame capture
// =============================================================================


// =============================================================================
//  GLOBAL APP STATE
//  Shared across all screens — attach to window so other page scripts can read it
// =============================================================================
window.PhotoBoothApp = {
  uploadedImages: [],   // { file, url } objects from the upload screen
  capturedShots: [],    // base64 data URLs of each taken photo

  // Countdown config — change these to adjust photobooth behaviour
  totalShots: 3,        // how many photos to take per session
  countdownFrom: 5,     // countdown start number (e.g. 3 → 3, 2, 1)
  getReadyMs: 1800,     // duration of "Get ready..." message in ms
  betweenShotMs: 600,   // pause between shots (overlay hide → next shot)

  // Camera
  stream: null,         // active MediaStream (kept for cleanup)

  // Frame dimensions (synced with sliders/presets)
  frameW: 480,
  frameH: 360,

  // Internal flags
  _isCountingDown: false,
  _currentShot: 0,
};

const App = window.PhotoBoothApp; // local shorthand


// =============================================================================
//  UTILITIES
// =============================================================================

/** Resolves after `ms` milliseconds. */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Show one screen, hide all others. */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


// =============================================================================
//  HOMEPAGE
// =============================================================================

function initHomepage() {
  const startBtn       = document.getElementById('start-btn');
  const uploadToggle   = document.getElementById('upload-btn-toggle');
  const uploadZone     = document.getElementById('upload-zone');
  const uploadInput    = document.getElementById('upload-input');

  // ── "Start Photobooth" ──────────────────────────────────────────────────
  startBtn.addEventListener('click', () => {
    showScreen('countdown-screen');
    initCountdownScreen();
  });

  // ── "Upload Images" toggle ──────────────────────────────────────────────
  uploadToggle.addEventListener('click', () => {
    const isHidden = uploadZone.style.display === 'none' || !uploadZone.style.display;
    uploadZone.style.display = isHidden ? 'block' : 'none';
    if (isHidden) uploadInput.click();
  });

  // ── File input (browse) ─────────────────────────────────────────────────
  uploadInput.addEventListener('change', e => {
    handleUploadedFiles([...e.target.files]);
  });

  // ── Drag-and-drop ───────────────────────────────────────────────────────
  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const imageFiles = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    handleUploadedFiles(imageFiles);
  });

  // Clicking anywhere on the zone also opens the picker
  uploadZone.addEventListener('click', e => {
    if (e.target !== uploadInput) uploadInput.click();
  });
}

/**
 * Accepts an array of File objects, stores them in App state,
 * and renders thumbnail previews inside #upload-preview.
 */
function handleUploadedFiles(files) {
  if (!files.length) return;

  const preview    = document.getElementById('upload-preview');
  const countLabel = document.getElementById('upload-count');

  files.forEach(file => {
    const url = URL.createObjectURL(file);
    App.uploadedImages.push({ file, url });

    const img = document.createElement('img');
    img.src       = url;
    img.alt       = file.name;
    img.className = 'upload-thumb';
    preview.appendChild(img);
  });

  if (countLabel) {
    countLabel.textContent = `${App.uploadedImages.length} image${App.uploadedImages.length !== 1 ? 's' : ''} selected`;
  }

  // Ensure the zone stays visible after drop/browse
  document.getElementById('upload-zone').style.display = 'block';
}


// =============================================================================
//  COUNTDOWN SCREEN
// =============================================================================

function initCountdownScreen() {
  App._currentShot    = 0;
  App._isCountingDown = false;
  App.capturedShots   = [];

  buildShotStrip();
  updateShotIndicator();
  updateShootButton();
  startCamera();
  initFrameControls();

  // ── Back button ─────────────────────────────────────────────────────────
  document.getElementById('back-btn').addEventListener('click', () => {
    stopCamera();
    resetCountdownScreen();
    showScreen('home-screen');
  });

  // ── Shoot / Next / Finish button ────────────────────────────────────────
  document.getElementById('shoot-btn').addEventListener('click', () => {
    if (App._isCountingDown) return;

    if (App._currentShot >= App.totalShots) {
      // All shots done → hand off to the frame/filter screen
      stopCamera();
      onAllShotsTaken();
    } else {
      runCountdownAndCapture();
    }
  });
}

// ── Camera ──────────────────────────────────────────────────────────────────

async function startCamera() {
  const video    = document.getElementById('camera-video');
  const errorDiv = document.getElementById('camera-error');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    App.stream     = stream;
    video.srcObject = stream;
    errorDiv.classList.remove('show');
  } catch (err) {
    console.error('Camera access denied:', err);
    errorDiv.classList.add('show');
  }
}

function stopCamera() {
  if (App.stream) {
    App.stream.getTracks().forEach(t => t.stop());
    App.stream = null;
  }
}

// ── Frame size controls ──────────────────────────────────────────────────────

function initFrameControls() {
  const wSlider = document.getElementById('frame-w');
  const hSlider = document.getElementById('frame-h');

  wSlider.addEventListener('input', () => {
    deselectPresets();
    applyFrameSize(+wSlider.value, App.frameH);
  });

  hSlider.addEventListener('input', () => {
    deselectPresets();
    applyFrameSize(App.frameW, +hSlider.value);
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deselectPresets();
      btn.classList.add('active');
      applyFrameSize(+btn.dataset.w, +btn.dataset.h);
    });
  });
}

/**
 * Resizes the camera frame element and keeps App state + sliders in sync.
 * @param {number} w - width in px
 * @param {number} h - height in px
 */
function applyFrameSize(w, h) {
  App.frameW = w;
  App.frameH = h;

  const frame = document.getElementById('camera-frame');
  frame.style.width  = w + 'px';
  frame.style.height = h + 'px';

  document.getElementById('frame-w').value       = w;
  document.getElementById('frame-h').value       = h;
  document.getElementById('frame-w-val').textContent = w;
  document.getElementById('frame-h-val').textContent = h;
}

function deselectPresets() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
}

// ── Countdown + capture sequence ─────────────────────────────────────────────

async function runCountdownAndCapture() {
  App._isCountingDown = true;
  document.getElementById('shoot-btn').disabled = true;

  const overlay  = document.getElementById('countdown-overlay');
  const numberEl = document.getElementById('countdown-number');
  const messageEl = document.getElementById('countdown-message');

  // Show overlay
  overlay.classList.remove('hidden');

  // Phase 1 — "Get ready..."
  numberEl.textContent  = '';
  messageEl.textContent = 'Get ready...';
  await sleep(App.getReadyMs);

  // Phase 2 — Countdown numbers
  for (let n = App.countdownFrom; n >= 1; n--) {
    numberEl.textContent  = n;
    messageEl.textContent = n === 1 ? 'Smile!' : '';

    // Restart CSS animation on each number change
    numberEl.style.animation = 'none';
    void numberEl.offsetWidth; // force reflow
    numberEl.style.animation  = '';

    await sleep(900);
  }

  // Phase 3 — Capture
  numberEl.textContent  = '✦';
  messageEl.textContent = 'Click!';
  await sleep(180);

  capturePhoto();

  await sleep(500);
  overlay.classList.add('hidden');

  App._currentShot++;
  App._isCountingDown = false;

  updateShotIndicator();
  updateShootButton();

  document.getElementById('shoot-btn').disabled = false;

  // Auto-trigger next shot after a short pause (optional — remove if you prefer manual)
  if (App._currentShot < App.totalShots) {
    await sleep(App.betweenShotMs);
    // Uncomment the line below to auto-advance without the user pressing the button:
    // runCountdownAndCapture();
  }
}

/**
 * Draws the current video frame onto a hidden canvas,
 * stores the result as a base64 JPEG, and updates the shot strip thumbnail.
 */
function capturePhoto() {
  const video  = document.getElementById('camera-video');
  const canvas = document.getElementById('capture-canvas');
  const { frameW, frameH } = App;

  canvas.width  = frameW;
  canvas.height = frameH;

  const ctx = canvas.getContext('2d');

  // Mirror the frame to match the mirrored video display
  ctx.save();
  ctx.translate(frameW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, frameW, frameH);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  App.capturedShots.push(dataUrl);

  // Update the corresponding thumbnail in the strip
  const thumb = document.getElementById(`shot-thumb-${App._currentShot}`);
  if (thumb) {
    thumb.src = dataUrl;
    thumb.classList.add('captured');
  }

  triggerFlash();
}

/** Brief white flash that mimics a camera shutter. */
function triggerFlash() {
  const flash = document.getElementById('flash');
  flash.style.transition = 'none';
  flash.style.opacity    = '1';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flash.style.transition = 'opacity 0.45s ease';
      flash.style.opacity    = '0';
    });
  });
}

// ── Shot strip ───────────────────────────────────────────────────────────────

/** Builds empty placeholder thumbnails — one per shot. */
function buildShotStrip() {
  const strip = document.getElementById('shots-strip');
  strip.innerHTML = '';

  for (let i = 0; i < App.totalShots; i++) {
    const img = document.createElement('img');
    img.id        = `shot-thumb-${i}`;
    img.className = 'shot-thumb';
    img.alt       = `Shot ${i + 1}`;
    strip.appendChild(img);
  }
}

function updateShotIndicator() {
  const indicator = document.getElementById('shot-indicator');
  if (App._currentShot < App.totalShots) {
    indicator.textContent = `Shot ${App._currentShot + 1} of ${App.totalShots}`;
  } else {
    indicator.textContent = 'All shots taken!';
  }
}

function updateShootButton() {
  const btn = document.getElementById('shoot-btn');
  if (App._currentShot === 0) {
    btn.textContent = 'Start Countdown';
  } else if (App._currentShot < App.totalShots) {
    btn.textContent = `Next Shot (${App._currentShot + 1}/${App.totalShots})`;
  } else {
    btn.textContent = 'Choose Filters →';
  }
}

// ── Screen reset ─────────────────────────────────────────────────────────────

/** Resets countdown screen state for a fresh session. */
function resetCountdownScreen() {
  App._currentShot    = 0;
  App._isCountingDown = false;
  App.capturedShots   = [];

  const overlay = document.getElementById('countdown-overlay');
  if (overlay) overlay.classList.add('hidden');

  updateShootButton();
  updateShotIndicator();

  const strip = document.getElementById('shots-strip');
  if (strip) strip.innerHTML = '';
}

// ── Handoff to screen 3 ──────────────────────────────────────────────────────

/**
 * Called when all shots have been captured.
 * Fires a custom event so your frame/filter screen can listen and react,
 * then navigates to that screen.
 *
 * In your screen-3 script, listen like this:
 *   window.addEventListener('photobooth:shotsComplete', e => {
 *     const shots = e.detail.shots; // array of base64 JPEGs
 *     // ... render frames and filters
 *   });
 */
function onAllShotsTaken() {
  window.dispatchEvent(new CustomEvent('photobooth:shotsComplete', {
    detail: { shots: App.capturedShots },
  }));
  showScreen('frame-screen');
}


// =============================================================================
//  BOOT — run once DOM is ready
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initHomepage();
});
