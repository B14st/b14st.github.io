const startWord = "fire";
const goalWord = "hospital";
const maxMoves = 5;
const minSimilarity = 0.35;

let path = [startWord];
let moveCount = 0;
let gameOver = false;

function getSemanticSimilarity(a, b) {
  const fakePairs = {
    "fire-burn": 0.84, "fire-flames": 0.83, "fire-smoke": 0.78,
    "fire-hazard": 0.76, "fire-alarm": 0.74, "fire-accident": 0.71,
    "fire-panic": 0.66, "fire-evacuation": 0.72, "fire-rescue": 0.74,
    "fire-heat": 0.81, "fire-explosion": 0.79,
    "rescue-paramedic": 0.78, "rescue-response": 0.82, "rescue-emergency": 0.80,
    "dispatch-response": 0.75, "siren-ambulance": 0.76,
    "ambulance-paramedic": 0.83, "ambulance-er": 0.87, "ambulance-doctor": 0.75,
    "ambulance-patient": 0.70, "emergency-triage": 0.77, "emergency-hospital": 0.78,
    "burn-injury": 0.81, "injury-wound": 0.76, "injury-pain": 0.74,
    "injury-trauma": 0.79, "trauma-shock": 0.73, "wound-bleeding": 0.75,
    "pain-treatment": 0.77, "treatment-triage": 0.71, "triage-er": 0.84,
    "er-hospital": 0.90, "er-icu": 0.85, "treatment-doctor": 0.76,
    "treatment-hospital": 0.82, "injury-ambulance": 0.78,
    "injury-er": 0.70, "hospital-doctor": 0.84, "hospital-nurse": 0.81,
    "hospital-room": 0.74, "hospital-bed": 0.76, "hospital-recovery": 0.78,
    "hospital-rehab": 0.73, "hospital-operation": 0.80,
    "hospital-prescription": 0.71, "hospital-patient": 0.75,
    "hospital-registration": 0.68, "hospital-discharge": 0.70,
    "hospital-records": 0.66, "hospital-lab": 0.65, "hospital-clinic": 0.77
  };

  a = a.toLowerCase();
  b = b.toLowerCase();
  const key = `${a}-${b}`;
  const reverseKey = `${b}-${a}`;

  if (fakePairs[key]) return fakePairs[key];
  if (fakePairs[reverseKey]) return fakePairs[reverseKey];

  const knownMedicalTerms = ["injury", "ambulance", "er", "hospital", "trauma", "treatment", "paramedic", "victim", "emergency", "rescue"];
  const aIsMedical = knownMedicalTerms.includes(a);
  const bIsMedical = knownMedicalTerms.includes(b);
  if (aIsMedical && bIsMedical) return 0.45;
  if (a.includes(b) || b.includes(a)) return 0.4;
  return 0.15;
}

function submitWord() {
  if (gameOver) return;

  const input = document.getElementById("input-word");
  const newWord = input.value.trim().toLowerCase();
  const messageBox = document.getElementById("message-box");

  if (!newWord) {
    messageBox.textContent = "Please enter a word.";
    return;
  }

  if (path.includes(newWord)) {
    messageBox.textContent = `⚠️ You already used "${newWord}".`;
    input.value = "";
    return;
  }

  const prevWord = path[path.length - 1];
  const similarity = getSemanticSimilarity(prevWord, newWord);

  const slot = document.getElementById(`slot-${moveCount + 1}`);
  let colorClass = "";

  if (similarity < minSimilarity) {
    colorClass = "red";
    messageBox.textContent = `❌ "${newWord}" was too unrelated. Move wasted. ${maxMoves - (moveCount + 1)} left.`;
  } else {
    if (similarity >= 0.70) colorClass = "green";
    else if (similarity >= 0.50) colorClass = "yellow";
    else colorClass = "orange";

    path.push(newWord); // Only advance the path if word is valid
    messageBox.textContent = `✅ "${newWord}" accepted. Moves left: ${maxMoves - (moveCount + 1)}`;
  }

  moveCount++;

  if (slot) {
    slot.textContent = newWord;
    slot.classList.add("filled", colorClass);
    slot.title = `Similarity: ${Math.round(similarity * 100)}%`;
  }

  if (newWord === goalWord.toLowerCase()) {
    document.querySelector(".goal").textContent = goalWord;
    messageBox.textContent = `🎉 Success! You reached "${goalWord}" in ${moveCount} moves.`;
    gameOver = true;
    input.disabled = true;
    return;
  }

  if (moveCount === maxMoves) {
    messageBox.textContent = `❌ Out of moves. You didn’t reach the goal.`;
    gameOver = true;
    input.disabled = true;
  }

  input.value = "";
}
