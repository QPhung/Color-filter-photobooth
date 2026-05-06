// ─────────────────────────────
// STORAGE KEYS
// ─────────────────────────────
const PHOTO_KEY = "eigenbooth_photos";


// ─────────────────────────────
// SAVE A PHOTO
// ─────────────────────────────
function savePhoto(dataURL) {
    let photos = getPhotos();
    photos.push(dataURL);
    sessionStorage.setItem(PHOTO_KEY, JSON.stringify(photos));
}


// ─────────────────────────────
// GET PHOTOS
// ─────────────────────────────
function getPhotos() {
    const data = sessionStorage.getItem(PHOTO_KEY);
    return data ? JSON.parse(data) : [];
}


// ─────────────────────────────
// CLEAR PHOTOS
// ─────────────────────────────
function clearPhotos() {
    sessionStorage.removeItem(PHOTO_KEY);
}


// ─────────────────────────────
// RENDER PHOTOS INTO STRIP
// selector example: '#filter-strip' or '#final-strip'
// ─────────────────────────────
function renderPhotosToStrip(selector) {
    const container = document.querySelector(selector);
    if (!container) {
        console.warn("Strip container not found:", selector);
        return;
    }

    const slots = container.querySelectorAll(".photo-slot");
    const photos = getPhotos();

    if (!photos.length) {
        console.warn("No photos found in sessionStorage");
        return;
    }

    slots.forEach((slot, i) => {
        slot.innerHTML = "";

        if (photos[i]) {
            const img = document.createElement("img");
            img.src = photos[i];
            img.alt = "photo";

            slot.appendChild(img);
        }
    });
}


// ─────────────────────────────
// OPTIONAL: DEBUG HELPER
// ─────────────────────────────
function debugPhotos() {
    console.log("Stored photos:", getPhotos());
}