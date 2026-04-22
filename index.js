function navigateTo(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const target = document.getElementById(pageId);
    target.classList.add('active');

    // Reset scroll to top when switching pages
    window.scrollTo(0, 0);

    // Dynamic cloning for later stages
    const strip = document.getElementById('main-photo-strip');
    if(pageId === 'page-filters' && strip) {
        const area = document.getElementById('filter-preview-area');
        area.innerHTML = '';
        area.appendChild(strip.cloneNode(true));
    }
    if(pageId === 'page-end' && strip) {
        const area = document.getElementById('final-result-container');
        area.innerHTML = '';
        area.appendChild(strip.cloneNode(true));
    }
}

// Logic for skipping camera if uploading
function handleUpload() {
    navigateTo('page-frames');
}

async function startBooth() {
    navigateTo('page-camera');
    const video = document.getElementById('webcam');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error("Camera access blocked", err);
    }
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