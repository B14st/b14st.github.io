document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const startBtn = document.getElementById("startScan");
  const scanNowBtn = document.getElementById("scanNow");
  const result = document.getElementById("ocrResult");
  const beep = document.getElementById("beep");

  let stream = null;

  startBtn.addEventListener("click", async () => {
    result.innerText = "📷 Starting camera...";
    scanNowBtn.disabled = true;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
      video.hidden = false;
      video.onloadedmetadata = () => {
        scanNowBtn.disabled = false;
        result.innerText = "✅ Camera ready. Tap 'Scan Now'.";
      };
    } catch (err) {
      result.innerText = "❌ Camera error: " + err.message;
    }
  });

  scanNowBtn.addEventListener("click", async () => {
    if (!video.videoWidth || !video.videoHeight) {
      result.innerText = "❌ Video not ready.";
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    result.innerText = "🔍 Scanning...";
    const { data: { text } } = await Tesseract.recognize(canvas, "eng");
    const matches = text.match(/[A-Z0-9]{6,}/g);

    if (matches) {
      result.innerText = "✅ Found: " + matches.join(", ");
      beep.play();
    } else {
      result.innerText = "❌ No valid product number found.";
    }
  });
});
