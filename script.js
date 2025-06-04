document.addEventListener("DOMContentLoaded", () => {
  let expectedItems = {};
  let scannedItems = {};
  let currentVideoStream = null;

  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const resultDiv = document.getElementById("ocrResult");
  const scanButton = document.getElementById("scanNow");
  const beep = document.getElementById("beep");

  function log(message) {
    console.log(message);
    resultDiv.innerText = message;
  }

  document.getElementById("pdfUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + " ";
      }

      extractExpectedItems(fullText);
    };
    reader.readAsArrayBuffer(file);
  });

  function extractExpectedItems(text) {
    const matches = text.match(/[A-Z0-9]{6,}/g);
    expectedItems = {};
    matches?.forEach(code => {
      expectedItems[code] = (expectedItems[code] || 0) + 1;
    });
    document.getElementById("pdfStatus").textContent =
      `Loaded ${Object.keys(expectedItems).length} unique product codes.`;
    updateTable();
  }

  document.getElementById("scanNow").addEventListener("click", () => {
    if (!video.videoWidth || !video.videoHeight) {
      log("❌ Camera not ready.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    log("🔍 Running OCR...");
    Tesseract.recognize(canvas, 'eng')
      .then(({ data: { text } }) => {
        const match = text.match(/[A-Z0-9]{6,}/g);
        if (match) {
          match.forEach(code => {
            scannedItems[code] = (scannedItems[code] || 0) + 1;
          });
          resultDiv.innerHTML = `✅ Scanned: ${match.join(", ")}`;
          beep.play();
        } else {
          log("❌ No valid product number found.");
        }
        updateTable();
      });
  });

  document.getElementById("captureNotePhoto").addEventListener("click", () => {
    const noteVideo = document.getElementById("noteVideo");
    noteVideo.hidden = false;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        noteVideo.srcObject = stream;

        noteVideo.onloadedmetadata = () => {
          setTimeout(() => {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = noteVideo.videoWidth;
            tempCanvas.height = noteVideo.videoHeight;
            tempCanvas.getContext("2d").drawImage(noteVideo, 0, 0);
            stream.getTracks().forEach(t => t.stop());
            noteVideo.hidden = true;

            Tesseract.recognize(tempCanvas, 'eng')
              .then(({ data: { text } }) => {
                extractExpectedItems(text);
              });
          }, 2000);
        };
      })
      .catch(err => {
        alert("Camera error: " + err.message);
      });
  });

  document.getElementById("startScanner").addEventListener("click", () => {
    video.hidden = false;
    scanButton.disabled = true;
    log("📷 Starting camera...");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        currentVideoStream = stream;
        video.srcObject = stream;

        const checkReady = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            scanButton.disabled = false;
            log("✅ Camera ready. Tap 'Scan Now' to scan.");
          } else {
            setTimeout(checkReady, 200);
          }
        };

        video.onloadedmetadata = checkReady;
        video.play();
      })
      .catch((err) => {
        alert("Camera error: " + err.message);
      });
  });

  function updateTable() {
    const tbody = document.querySelector("#resultsTable tbody");
    tbody.innerHTML = "";

    const allCodes = new Set([
      ...Object.keys(expectedItems),
      ...Object.keys(scannedItems)
    ]);

    allCodes.forEach(code => {
      const expected = expectedItems[code] || 0;
      const scanned = scannedItems[code] || 0;
      let status = expected === scanned ? "✅ Match" :
        expected === 0 ? "❗ Unexpected" :
        scanned === 0 ? `⚠️ Missing: -${expected}` :
        scanned > expected ? `⚠️ Extra: +${scanned - expected}` :
        `⚠️ Missing: -${expected - scanned}`;

      const row = `<tr>
        <td>${code}</td>
        <td>${expected}</td>
        <td>${scanned}</td>
        <td>${status}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  }
});
