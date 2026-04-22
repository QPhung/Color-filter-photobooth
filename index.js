
const pages = document.querySelectorAll('.page');
const video = document.getElementById('webcam');
const canvas = document.getElementById('capture-canvas');
const countdownEl = document.getElementById('countdown-overlay');
let capturedImages = [];

function navigateTo(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// 1. Start Webcam
async function startBooth() {
    navigateTo('page-camera');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        alert("Webcam access denied or not found.");
    }
}

// 2. Countdown Logic
function beginSequence() {
    let count = 5;
    capturedImages = []; // Reset
    const btn = document.getElementById('start-timer-btn');
    btn.disabled = true;

    const timer = setInterval(() => {
        countdownEl.innerText = count;
        
        if (count === 0) {
            clearInterval(timer);
            countdownEl.innerText = "SMILE!";
            takePhoto();
            setTimeout(() => {
                countdownEl.innerText = "";
                navigateTo('page-frames');
                stopCamera();
            }, 1000);
        }
        count--;
    }, 1000);
}

function takePhoto() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const data = canvas.toDataURL('image/png');
    capturedImages.push(data);
    // In a real loop, you'd repeat this 4 times for the strip
}

function stopCamera() {
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

// 3. Handle File Upload (Alternative Path)
function handleUpload(input) {
    if (input.files && input.files[0]) {
        // Just logic to jump to frames after upload
        navigateTo('page-frames');
    }
}

// 4. Frame selection helper
function setFrame(color) {
    const display = document.querySelector('.strip-container');
    display.className = `strip-container color-${color}`;
    // You'd inject capturedImages here as <img> tags
}