// Main function that runs when the "Check" button is clicked
// It compares the shop's rate to the real exchange rate
async function calculateDifference() {
  let google;

  // If live mode is enabled, fetch live exchange rate from the API
  if (liveMode) {
    // Get the currencies I selected in the dropdowns
    const baseCurrency = document.getElementById("baseCurrency").value;
    const selectedCurrency = document.getElementById("currencySelect").value;

    // Make a request to the API for exchange rates based on my base currency
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    const data = await response.json();

    // Get the exchange rate from the base currency to the selected currency
    google = data.rates[selectedCurrency];

    // Show the live exchange rate under the result (e.g., 1 NOK = 0.09 USD)
    const rateInfoDiv = document.getElementById("liveRateInfo");
    rateInfoDiv.textContent = `1 ${baseCurrency} = ${google.toFixed(4)} ${selectedCurrency}`;
  } else {
    // If manual mode, get the rate I typed into the input field
    const googleInput = document.getElementById("googleRate").value.replace(',', '.');
    google = parseFloat(googleInput);

    // Show an alert if I entered something invalid
    if (!google) {
      alert("Could not get exchange rate.");
      return;
    }
  }

  // Get and clean the shop rate I typed in (replace comma with dot)
  const shopInput = document.getElementById("shopRate").value.replace(',', '.');
  const shop = parseFloat(shopInput);

  // Make sure both rates are valid numbers
  if (isNaN(google) || isNaN(shop) || google <= 0) {
    console.log("Invalid input");
    return;
  }

  // Calculate how much the shop is charging over or under the real rate (in %)
  const result = (shop - google) / google * 100;

  // Log the result in the console so I can check it
  console.log(result.toFixed(2));

  // Decide what color to show based on how big the difference is
  let colorClass = "result-green"; // Green = acceptable
  if (result < 0 || result > 3) {
    colorClass = "result-red"; // Red = bad deal
  } else if (result > 2.5) {
    colorClass = "result-yellow"; // Yellow = borderline
  }

  // Show the result and apply the color style
  const resultDiv = document.getElementById("result");
  resultDiv.className = colorClass;
  resultDiv.textContent = `Difference: ${result.toFixed(2)}%`;
}

// Whether live mode is active or not (starts as manual input mode)
let liveMode = false;

// These are references to HTML elements I’ll be updating
const toggleBtn = document.getElementById("toggleModeBtn");
const googleRateContainer = document.getElementById("googleRateContainer");

// When I click the toggle button, switch between live and manual input
toggleBtn.addEventListener("click", () => {
  liveMode = !liveMode; // Flip the mode

  if (liveMode) {
    // Live mode: replace input with dropdowns
    googleRateContainer.innerHTML = `
      <label for="baseCurrency">Your Currency</label>
      <select id="baseCurrency">
        <option value="NOK">NOK</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="SEK">SEK</option>
        <option value="JPY">JPY</option>
        <option value="AUD">AUD</option>
        <option value="CAD">CAD</option>
        <option value="CHF">CHF</option>
        <option value="CNY">CNY</option>
        <option value="INR">INR</option>
        <option value="KRW">KRW</option>
        <option value="ZAR">ZAR</option>
        <option value="MXN">MXN</option>
        <option value="BRL">BRL</option>
        <option value="PLN">PLN</option>
        <option value="TRY">TRY</option>
        <option value="SGD">SGD</option>
        <option value="HKD">HKD</option>
        <option value="DKK">DKK</option>
      </select>

      <label for="currencySelect">Choose Currency</label>
      <select id="currencySelect">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="NOK">NOK</option>
        <option value="GBP">GBP</option>
        <option value="SEK">SEK</option>
        <option value="JPY">JPY</option>
        <option value="AUD">AUD</option>
        <option value="CAD">CAD</option>
        <option value="CHF">CHF</option>
        <option value="CNY">CNY</option>
        <option value="INR">INR</option>
        <option value="KRW">KRW</option>
        <option value="ZAR">ZAR</option>
        <option value="MXN">MXN</option>
        <option value="BRL">BRL</option>
        <option value="PLN">PLN</option>
        <option value="TRY">TRY</option>
        <option value="SGD">SGD</option>
        <option value="HKD">HKD</option>
        <option value="DKK">DKK</option>
      </select>
    `;
    toggleBtn.textContent = "Switch to manual input";
  } else {
    // Manual mode: show the regular input field again
    googleRateContainer.innerHTML = `
      <label for="googleRate">Google Rate:</label>
      <input type="text" id="googleRate" inputmode="decimal" pattern="[0-9.]*" />
    `;
    toggleBtn.textContent = "Switch To Live Rates";
  }
});
