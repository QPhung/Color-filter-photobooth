function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    const strip = document.getElementById('main-photo-strip');
    if(pageId === 'page-filters') {
        document.getElementById('filter-preview-area').innerHTML = '';
        document.getElementById('filter-preview-area').appendChild(strip.cloneNode(true));
    }
    if(pageId === 'page-end') {
        document.getElementById('final-result-container').innerHTML = '';
        document.getElementById('final-result-container').appendChild(strip.cloneNode(true));
    }
}

async function startBooth() {
    navigateTo('page-camera');
    const video = document.getElementById('webcam');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}

function setFrame(color) {
    const strip = document.getElementById('main-photo-strip');
    strip.className = 'photo-strip frame-' + color;
}

function beginSequence() {
    let count = 5;
    const overlay = document.getElementById('countdown-overlay');
    const timer = setInterval(() => {
        overlay.innerText = count;
        if (count === 0) {
            clearInterval(timer);
            overlay.innerText = "CHEESE!";
            setTimeout(() => { navigateTo('page-frames'); }, 1000);
        }
        count--;
    }, 1000);
}