function calculateDifference() {
  const googleInput = document.getElementById("googleRate").value.replace(',', '.');
  const shopInput = document.getElementById("shopRate").value.replace(',', '.');

  const google = parseFloat(googleInput);
  const shop = parseFloat(shopInput);

  if (isNaN(google) || isNaN(shop) || google <= 0) {
      console.log("Invalid input");
      return;
  }

  const result = (google - shop) / google * 100;

  console.log(result.toFixed(2));

  let colorClass = "result-green";
  if (result > 3) colorClass = "result-red";
  else if (result > 2.5) colorClass = "result-yellow";

  const resultDiv = document.getElementById("result");
  resultDiv.className = colorClass;
  resultDiv.textContent = `Difference: ${result.toFixed(2)}%`;
}
