// ── EigenBooth shared state via sessionStorage ──────────────────────────────
const STATE_KEY = 'eigenbooth_photos';

function getPhotos() {
    try {
        return JSON.parse(sessionStorage.getItem(STATE_KEY)) || [];
    } catch {
        return [];
    }
}

function setPhotos(photos) {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(photos));
}

function clearPhotos() {
    sessionStorage.removeItem(STATE_KEY);
}

// Fill every .photo-slot inside a given container with stored photos
function renderPhotosToStrip(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const photos = getPhotos();
    container.querySelectorAll('.photo-slot').forEach((slot, i) => {
        slot.innerHTML = '';
        if (photos[i]) {
            const img = document.createElement('img');
            img.src = photos[i];
            slot.appendChild(img);
        }
    });
}
