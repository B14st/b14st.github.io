// 📌 Main function to calculate the percentage difference between Google rate and shop rate
function calculateDifference() {
  // Get and normalize user input (replace comma with dot for decimal compatibility)
  const googleInput = document.getElementById("googleRate").value.replace(',', '.');
  const shopInput = document.getElementById("shopRate").value.replace(',', '.');

  // Convert the cleaned string inputs to numbers
  const google = parseFloat(googleInput);
  const shop = parseFloat(shopInput);

  // Validate inputs: must be valid numbers and Google rate must be greater than zero
  if (isNaN(google) || isNaN(shop) || google <= 0) {
      console.log("Invalid input");
      return;
  }

  // Calculate percentage difference using the formula
  const result = (google - shop) / google * 100;

  // Log result for debugging
  console.log(result.toFixed(2));

  // Determine which color class to apply based on the thresholds
  let colorClass = "result-green";
  if (result > 3) colorClass = "result-red";
  else if (result > 2.5) colorClass = "result-yellow";

  // Update the result text and style based on the calculated value
  const resultDiv = document.getElementById("result");
  resultDiv.className = colorClass;
  resultDiv.textContent = `Difference: ${result.toFixed(2)}%`; 
}

// Track whether live mode is currently active
let liveMode = false;

// Get references to the toggle button and the container for the Google rate input
const toggleBtn = document.getElementById("toggleModeBtn");
const googleRateContainer = document.getElementById("googleRateContainer");

// Add click event listener to toggle between manual input and live rate selection
toggleBtn.addEventListener("click", () => {
  // Toggle the mode flag
  liveMode = !liveMode;

  if (liveMode) {
    // Switch to live mode: replace input with currency dropdown
    googleRateContainer.innerHTML = `
      <label for="currencySelect">Choose Currency</label>
      <select id="currencySelect">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="NOK">NOK</option>
        <option value="GBP">GBP</option>
        <option value="SEK">SEK</option>
        <option value="JPY">JPY</option>
      </select>
    `;
    toggleBtn.textContent = "Switch to manual input";
  } else {
    // Switch back to manual input mode
    googleRateContainer.innerHTML = `
      <label for="googleRate">Google Rate:</label>
      <input type="text" id="googleRate" inputmode="decimal" pattern="[0-9.]*" />
    `;
    toggleBtn.textContent = "Switch To Live Rates";
  }
});
