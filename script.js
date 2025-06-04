document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const startBtn = document.getElementById("startScan");
  const scanBtn = document.getElementById("scanNow");
  const beep = document.getElementById("beep");

  let stream = null;
  let expectedItems = {};  // { EAN: { name: string, quantity: number } }
  let scannedItems = {};   // { EAN: number }

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

      const lines = fullText.split("\n");
      expectedItems = {};
      for (const line of lines) {
        const words = line.split(/\s+/);
        for (let i = 0; i < words.length; i++) {
          const code = words[i].match(/^\d{8,14}$/);
          if (code) {
            const nameParts = words.slice(i + 1, i + 4).filter(w => /[A-Za-zÆØÅæøå]/.test(w));
            const name = nameParts.join(" ");
            const productId = code[0];
            if (!expectedItems[productId]) {
              expectedItems[productId] = { name: name, quantity: 1 };
            } else {
              expectedItems[productId].quantity += 1;
            }
          }
        }
        if (match) {
          const code = match[1];
          const name = match[2].trim();
          if (!expectedItems[code]) {
            expectedItems[code] = { name: name, quantity: 1 };
          } else {
            expectedItems[code].quantity += 1;
          }
        }
      }
      updateTable();
    };
    reader.readAsArrayBuffer(file);
  });

  startBtn.addEventListener("click", () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        video.srcObject = stream;
        video.hidden = false;
        scanBtn.disabled = false;
      })
      .catch((err) => alert("Camera error: " + err.message));
  });

  scanBtn.addEventListener("click", () => {
    if (!stream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    Tesseract.recognize(canvas, 'eng')
      .then(({ data: { text } }) => {
        const matches = text.match(/\d{8,14}/g);
        if (matches) {
          matches.forEach(code => {
            const qtyStr = prompt(`How many of product ${code}?`);
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
