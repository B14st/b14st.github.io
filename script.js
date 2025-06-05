document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const startBtn = document.getElementById("startScan");
  const scanBtn = document.getElementById("scanNow");
  const beep = document.getElementById("beep");

  let expectedItems = {};
  let scannedItems = {};

  // Load and parse PDF
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
        fullText += content.items.map(item => item.str).join(" ") + "\n";
      }

      expectedItems = {};
      const lines = fullText.split("\n");
      const regex = /(\d{13})\s+(.*?)\s+(\d+)\s+STK/gi;

      lines.forEach(line => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          const code = match[1];
          const name = match[2].replace(/\s+/g, " ").trim();
          const quantity = parseInt(match[3]);
          if (!expectedItems[code]) {
            expectedItems[code] = { name, quantity };
          } else {
            expectedItems[code].quantity += quantity;
          }
        }
      });

      requestAnimationFrame(updateTable);
    };
    reader.readAsArrayBuffer(file);
  });

  startBtn.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        video.srcObject = stream;
        video.style.display = "block";
        scanBtn.disabled = false;

        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: video,
            constraints: { facingMode: "environment" }
          },
          decoder: { readers: ["ean_reader"] }
        }, err => {
          if (err) return alert("Quagga init error: " + err);
          Quagga.start();
        });

        Quagga.onDetected(result => {
          const code = result.codeResult.code;
          const expectedQty = expectedItems[code]?.quantity || 0;
          const qtyStr = prompt(`Scanned barcode ${code}\nHow many? (Expected: ${expectedQty})`);
          const qty = parseInt(qtyStr);
          if (!isNaN(qty)) {
            scannedItems[code] = (scannedItems[code] || 0) + qty;
            beep.play();
            updateTable();
          }
        });

      })
      .catch((err) => alert("Camera error: " + err.message));
  });

  scanBtn.addEventListener("click", () => {
    if (!video.srcObject) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    Tesseract.recognize(canvas, 'eng')
      .then(({ data: { text } }) => {
        const matches = text.match(/\d{8,14}/g);
        if (matches) {
          matches.forEach(code => {
            const expectedQty = expectedItems[code]?.quantity || 0;
            const qtyStr = prompt(`Scanned OCR ${code}\nHow many? (Expected: ${expectedQty})`);
            const qty = parseInt(qtyStr);
            if (!isNaN(qty)) {
              scannedItems[code] = (scannedItems[code] || 0) + qty;
              beep.play();
            }
          });
        }
        updateTable();
      });
  });

  function updateTable() {
    const tbody = document.querySelector("#resultsTable tbody");
    tbody.innerHTML = "";

    const allCodes = new Set([...Object.keys(expectedItems), ...Object.keys(scannedItems)]);
    allCodes.forEach(code => {
      const expectedQty = expectedItems[code]?.quantity || 0;
      const scannedQty = scannedItems[code] || 0;
      const name = expectedItems[code]?.name || "";
      let status = expectedQty === scannedQty ? "✅ Match" :
                   expectedQty === 0 ? "❗ Unexpected" :
                   scannedQty === 0 ? `⚠️ Missing: -${expectedQty}` :
                   scannedQty > expectedQty ? `⚠️ Extra: +${scannedQty - expectedQty}` :
                   `⚠️ Missing: -${expectedQty - scannedQty}`;

      const row = `<tr>
        <td>${code}</td>
        <td>${name}</td>
        <td>${expectedQty}</td>
        <td>${scannedQty}</td>
        <td>${status}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  }
});
