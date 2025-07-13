
let selectedDifficulty = 'mid_core'; // or 'advanced'


// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.getElementById('toggle-icon');

    sidebar.classList.toggle('collapsed');
    toggleIcon.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
}

// Load saved notes on page load
window.addEventListener('DOMContentLoaded', () => {
    const note = localStorage.getItem('agent_notes');
    if (note) {
        document.getElementById('notepad-area').value = note;
    }
});

// Save notes on input
document.addEventListener('input', (e) => {
    if (e.target.id === 'notepad-area') {
        localStorage.setItem('agent_notes', e.target.value);
    }
});


// CLI Command Handler Stub
function handleCommand(event) {
    if (event.key === 'Enter') {
        const input = event.target.value.toLowerCase().trim();
        const output = executeCommand(input);
        displayOutput(output);
        event.target.value = '';
    }
}

// Command execution logic
function executeCommand(input) {
    if (input === 'help') {
        return 'Available commands: help, hint, status';
    }
    if (input === 'status') {
        return 'Mission: ACTIVE\nLocation: Prague\nOperatives: RED, BLUE, YELLOW';
    }
    if (input === 'hint') {
        return 'Try reviewing the intercepted email for hidden location clues.';
    }
    return 'Unknown command: ' + input;
}

function displayOutput(text) {
    alert(text); // Placeholder – you can update to append to a CLI log later
}

// Modal Logic

window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('imageModal');
  if (modal) modal.style.display = 'none'; // just in case
});

function openModal(contentId) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    body.innerHTML = '<p>[Intel for ' + contentId + ' will load here]</p>';
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Handle outside click to close modal
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// === Mission Loader ===
let currentMission = null;

async function loadMission(missionId) {
    console.log(`🔄 Loading mission: ${missionId}`);
    const response = await fetch(`missions/${missionId}.json`);
    const mission = await response.json();
    console.log('✅ Mission JSON loaded:', mission);
    currentMission = mission;

    // Load external intel file
    const intelResponse = await fetch(`missions/${mission.intel_file}`);
    const fullIntel = await intelResponse.json();
    console.log('📦 Full intel file loaded:', fullIntel);


    // Extract correct intel IDs for the selected difficulty
    const ids = mission.difficulty_modes[selectedDifficulty]?.intel_ids || [];
    console.log(`📌 Selected difficulty: ${selectedDifficulty}`);
    console.log('🧠 Intel IDs to load:', ids);

    // Build a filtered intel object
    const difficultyIntel = fullIntel[selectedDifficulty] || [];
    const filteredIntel = {};

    difficultyIntel.forEach(entry => {
    if (ids.includes(entry.id)) {
        filteredIntel[entry.id] = entry;
    }
});
    console.log('📑 Filtered intel for current difficulty:', filteredIntel);


    // Assign filtered intel to mission.intel
    mission.intel = filteredIntel;
    console.log('🖼️ Rendering intel:', mission.intel);


    renderMission(mission);
}



function renderMission(mission) {
    const container = document.getElementById('content-area');
    container.innerHTML = ''; // Clear previous content

    // Create and append the mission brief
    const briefDiv = document.createElement('div');
    briefDiv.className = 'mission-brief';
    briefDiv.innerHTML = `
        <div class="section-title">${mission.title.toUpperCase()}</div>
        <div class="priority-medium">PRIORITY: HIGH</div>
        <div style="margin-top: 15px;"><strong>BRIEFING:</strong> ${mission.brief}</div>
        <div style="margin-top: 15px;"><strong>OBJECTIVE:</strong> ${mission.objective}</div>
    `;
    container.appendChild(briefDiv);

    // Render intelligence section
    renderIntel(mission);  // This appends intel to the same container

    // Create and append the solution area after the intel section
    const solutionDiv = document.createElement('div');
    solutionDiv.className = 'solution-area';
    solutionDiv.innerHTML = `
        <div class="section-title">MISSION SOLUTION (EXACT LOCATION)</div>
        <input type="text" id="solution-input" class="solution-input" placeholder="Enter the location...">
        <div style="margin: 10px 0;">
            <button class="btn btn-danger" onclick="submitSolution()">SUBMIT SOLUTION</button>
            <button class="btn btn-warning" onclick="requestHint()">REQUEST HINT</button>
        </div>
        <div id="feedback" style="margin-top: 10px; min-height: 20px; font-size: 12px;"></div>
    `;
    container.appendChild(solutionDiv);
}


function submitSolution() {
    const input = document.getElementById('solution-input').value.toLowerCase().trim();
    const feedback = document.getElementById('feedback');
    const answers = currentMission.acceptedAnswers.map(a => a.toLowerCase());

    if (answers.some(ans => input.includes(ans))) {
        feedback.innerHTML = `<div style="color: #00ff41;"><strong>✓ MISSION COMPLETE:</strong> Correct location identified.</div>`;
        return;
    }

    for (let key in currentMission.partialFeedback) {
        if (input.includes(key)) {
            feedback.innerHTML = `<div style="color: #ffeb3b;">⚠ ${currentMission.partialFeedback[key]}</div>`;
            return;
        }
    }

    feedback.innerHTML = `<div style="color: #ff6b6b;">✗ Incorrect. Re-analyze the clues.</div>`;
}

function requestHint() {
    const feedback = document.getElementById('feedback');
    const hints = currentMission.hints;
    const hint = hints[Math.floor(Math.random() * hints.length)];
    feedback.innerHTML = `<div style="color: #ffeb3b;">💡 ${hint}</div>`;
}

// === Load default mission on start ===
window.onload = () => {
    loadMission('mission001');
};

function renderIntel(mission) {
    // Remove old intel section if present
    const existingSection = document.querySelector('.section');
    if (existingSection) existingSection.remove();

    const container = document.createElement('div');
    container.className = 'section';
    container.innerHTML = '<div class="section-title">INTERCEPTED INTELLIGENCE</div>';

    const intelEntries = Object.entries(mission.intel || {});
    if (intelEntries.length === 0) {
        const emptyNote = document.createElement('div');
        emptyNote.style.marginTop = '10px';
        emptyNote.textContent = 'No intel available for this difficulty.';
        container.appendChild(emptyNote);
    } else {
        intelEntries.forEach(([_, data]) => {
            const intelItem = document.createElement('div');
            intelItem.className = 'intel-item';
            intelItem.style.cursor = 'pointer';

            const title = document.createElement('div');
            title.className = 'intel-title';
            title.textContent = data.title;  // Not innerHTML


            const content = document.createElement('div');
            content.className = 'intel-content';
            content.style.display = 'none';
            content.style.marginTop = '8px';

            // Build content based on type
let html = '<div>';

if (typeof data.content === 'string') {
    const formatted = data.content.replace(/\n/g, '<br>');
    html += `<div style="white-space: normal; line-height: 1.5;">${formatted}</div>`;
} else if (typeof data.content === 'object' && data.content !== null) {

    const keys = Object.keys(data.content);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = data.content[key];

        // Audio block
        if (key === 'audio' && typeof value === 'string') {
            html += `
                <audio controls style="margin-top: 10px; width: 50%; background: #111; border: 1px solid #00ff41; border-radius: 4px;">
                    <source src="${value}" type="audio/wav">
                    Your browser does not support the audio element.
                </audio>
            `;
            continue; // skip other rendering for this key
        }

        // Image grid block
        if (key === 'images' && Array.isArray(value)) {
            html += `<div class="intel-image-grid">`;

            value.forEach(img => {
                const imgPath = `assets/images/${img.filename}`;
                const description = img.description || '';
                const metadata = img.metadata || '';

                html += `
                    <div class="intel-image-card" onclick="openImageModal('${imgPath}', \`${description}\`, \`${metadata}\`)">
                        <img src="${imgPath}" alt="${description}" class="intel-photo">
                        <div class="intel-image-meta">
                            <strong>${description}</strong>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            continue; // skip further rendering for 'images'
        }

        // Handle other content normally
        if (Array.isArray(value)) {
            html += `<strong>${key}:</strong><ul>` + value.map(item => {
                if (typeof item === 'string') {
                    return `<li>${item}</li>`;
                } else if (typeof item === 'object') {
                    return `<li>` + Object.entries(item).map(([k, v]) => `<strong>${k}</strong>: ${v}`).join('<br>') + `</li>`;
                } else {
                    return `<li>${item}</li>`;
                }
            }).join('') + '</ul>';
        } else if (typeof value === 'object') {
            html += `<strong>${key}:</strong><ul>`;
            for (let subKey in value) {
                html += `<li><em>${subKey}</em>: ${value[subKey]}</li>`;
            }
            html += '</ul>';
        } else if (typeof value === 'string') {
            const formatted = value.replace(/\n/g, '<br>');
            html += `<strong>${key}</strong>: <div>${formatted}</div>`;
        }
    }
}

html += '</div>';
content.innerHTML = html;



            intelItem.onclick = (e) => {
                e.stopPropagation();
                if (modalIsOpen) return; // prevent toggling if modal is active

                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
            };

            intelItem.appendChild(title);
            intelItem.appendChild(content);
            container.appendChild(intelItem);
        });
    }

    const contentArea = document.getElementById('content-area');
    contentArea.appendChild(container);
}
let modalIsOpen = false;

function openImageModal(src, caption = '') {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const modalCaption = document.getElementById('modal-caption');

    modalImg.src = src;
    modalCaption.innerText = caption;
    modal.style.display = 'flex';  // show modal

    modalIsOpen = true;
    document.body.classList.add('modal-open');  // disable background interaction
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'none';  // hide modal

    modalIsOpen = false;
    document.body.classList.remove('modal-open');
}
// Optional: allow Esc key to close modal
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeImageModal();
  }
});



function showIntelModal(type, data) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');

    let html = '<div class="section-title">' + type.toUpperCase() + '</div>';
    html += '<div style="margin-top: 10px;">';

    for (let key in data) {
        const value = data[key];
        if (Array.isArray(value)) {
            html += `<strong>${key}:</strong><ul>` + value.map(item => `<li>${item}</li>`).join('') + '</ul>';
        } else {
            html += `<strong>${key}:</strong> ${value}<br>`;
        }
    }

    html += '</div>';
    body.innerHTML = html;
    modal.style.display = 'block';
}


// Extend command execution to search intel
function executeCommand(input) {
    const [cmd, ...args] = input.toLowerCase().trim().split(" ");
    const query = args.join(" ");

    if (cmd === 'help') {
        return 'Available commands: help, hint, status, search [keyword], intel [type]';
    }
    if (cmd === 'status') {
        return `Mission: ${currentMission.title}\nObjective: ${currentMission.objective}`;
    }
    if (cmd === 'hint') {
        const hint = currentMission.hints[Math.floor(Math.random() * currentMission.hints.length)];
        return `Hint: ${hint}`;
    }
    if (cmd === 'search') {
        if (!query) return 'Usage: search [keyword]';
        return searchIntel(query);
    }
    if (cmd === 'intel') {
        if (!query || !currentMission.intel[query]) return 'Usage: intel [email|radio|surveillance]';
        return formatIntel(currentMission.intel[query]);
    }
if (cmd === 'difficulty') {
    if (query === 'mid_core' || query === 'advanced') {
        selectedDifficulty = query;
        loadMission(currentMission.mission_id); // reloads the mission with the new difficulty
        return `Difficulty set to: ${query}`;
    }
    return 'Usage: difficulty [mid_core|advanced]';
}


    return 'Unknown command: ' + cmd;
}

function searchIntel(keyword) {
    let result = '';
    for (const [key, block] of Object.entries(currentMission.intel)) {
        for (const [subkey, value] of Object.entries(block)) {
            if (typeof value === 'string' && value.toLowerCase().includes(keyword)) {
                result += `[${key.toUpperCase()}] ${subkey}: ${value}\n`;
            }
            if (Array.isArray(value)) {
                value.forEach(line => {
                    if (line.toLowerCase().includes(keyword)) {
                        result += `[${key.toUpperCase()}] ${subkey}: ${line}\n`;
                    }
                });
            }
        }
    }
    return result || 'No matches found.';
}

function formatIntel(data) {
    let output = '';
    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            output += `\n${key.toUpperCase()}:\n` + value.map(line => `- ${line}`).join('\n') + '\n';
        } else {
            output += `${key}: ${value}\n`;
        }
    }
    return output;
}

function displayOutput(text) {
    alert(text); // You can change this to append to a terminal log instead
}
