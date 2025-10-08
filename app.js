// Global state
let db = null;
let SQL = null;
let currentFileName = '';

// Initialize SQL.js
async function initSQL() {
    if (!window.initSqlJs) {
        throw new Error('SQL.js library not loaded. Please check your internet connection.');
    }
    SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    console.log('SQL.js initialized successfully');
}

// DOM Elements
const elements = {
    fileInput: document.getElementById('fileInput'),
    loadBtn: document.getElementById('loadBtn'),
    welcomeLoadBtn: document.getElementById('welcomeLoadBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    dbName: document.getElementById('dbName'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    appContent: document.getElementById('appContent'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
    modalCancel: document.getElementById('modalCancel'),
    modalSave: document.getElementById('modalSave'),
    notesList: document.getElementById('notesList'),
    productsList: document.getElementById('productsList'),
    categoriesList: document.getElementById('categoriesList'),
    noteEditor: document.getElementById('noteEditor'),
    productEditor: document.getElementById('productEditor'),
    addNoteBtn: document.getElementById('addNoteBtn'),
    addProductBtn: document.getElementById('addProductBtn'),
    addCategoryBtn: document.getElementById('addCategoryBtn')
};

// Current editing state
let currentEditingNote = null;
let currentEditingProduct = null;
let noteEditor = null;
let productSpecsEditor = null;
let productInstallEditor = null;
let currentNotePDF = null; // Store PDF file for upload

// Event Listeners
elements.loadBtn.addEventListener('click', () => elements.fileInput.click());
elements.welcomeLoadBtn.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFileLoad);
elements.downloadBtn.addEventListener('click', downloadDatabase);
elements.modalClose.addEventListener('click', closeModal);
elements.modalCancel.addEventListener('click', closeModal);
elements.addNoteBtn.addEventListener('click', () => openNoteEditor());
elements.addProductBtn.addEventListener('click', () => openProductEditor());
elements.addCategoryBtn.addEventListener('click', () => openCategoryModal());

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// File handling
async function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Loading file:', file.name);
    currentFileName = file.name;

    try {
        console.log('Reading file as array buffer...');
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        console.log('File size:', uint8Array.length, 'bytes');

        console.log('Initializing SQL.js...');
        if (!SQL) {
            await initSQL();
        }

        console.log('Creating database from file...');
        db = new SQL.Database(uint8Array);
        console.log('Database loaded successfully');

        // Verify database structure
        console.log('Verifying database structure...');
        verifyDatabaseStructure();

        // Update UI
        console.log('Updating UI...');
        elements.welcomeScreen.style.display = 'none';
        elements.appContent.style.display = 'block';
        elements.downloadBtn.disabled = false;
        elements.dbName.textContent = currentFileName;

        // Load data
        console.log('Loading data...');
        loadAllData();
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading database:', error);
        console.error('Error stack:', error.stack);
        alert('Error loading database: ' + error.message + '\n\nCheck the browser console for details.');
    }

    // Reset file input
    event.target.value = '';
}

function verifyDatabaseStructure() {
    // Check if required tables exist
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
    const existingTables = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();
        existingTables.push(row.name);
    }
    stmt.free();

    console.log('Existing tables:', existingTables);

    // Inspect schema of each table
    existingTables.forEach(tableName => {
        if (tableName.startsWith('Z')) {
            console.log(`\nSchema for ${tableName}:`);
            const schemaStmt = db.prepare(`PRAGMA table_info(${tableName})`);
            const columns = [];
            while (schemaStmt.step()) {
                const col = schemaStmt.getAsObject();
                columns.push(`${col.name} (${col.type})`);
            }
            schemaStmt.free();
            console.log(columns.join(', '));
        }
    });
}

function createMissingTables(missingTables) {
    missingTables.forEach(table => {
        console.log('Creating table:', table);

        if (table === 'ZINFOCATEGORY') {
            db.run(`
                CREATE TABLE IF NOT EXISTS ZINFOCATEGORY (
                    Z_PK INTEGER PRIMARY KEY,
                    Z_ENT INTEGER,
                    Z_OPT INTEGER,
                    ZNAME TEXT,
                    ZICON TEXT,
                    ZCOLORRED REAL,
                    ZCOLORGREEN REAL,
                    ZCOLORBLUE REAL
                )
            `);
        } else if (table === 'ZINFOITEM') {
            db.run(`
                CREATE TABLE IF NOT EXISTS ZINFOITEM (
                    Z_PK INTEGER PRIMARY KEY,
                    Z_ENT INTEGER,
                    Z_OPT INTEGER,
                    ZTITLE TEXT,
                    ZCONTENT TEXT,
                    ZTAGS TEXT,
                    ZCATEGORY INTEGER,
                    ZPDFDATA BLOB,
                    ZPDFFILENAME TEXT,
                    ZVIEWCOUNT INTEGER,
                    ZCREATEDDATE REAL,
                    ZLASTVIEWEDDATE REAL
                )
            `);
        } else if (table === 'ZPRODUCTDOC') {
            db.run(`
                CREATE TABLE IF NOT EXISTS ZPRODUCTDOC (
                    Z_PK INTEGER PRIMARY KEY,
                    Z_ENT INTEGER,
                    Z_OPT INTEGER,
                    ZNAME TEXT,
                    ZMANUFACTURER TEXT,
                    ZSPECIFICATIONS TEXT,
                    ZINSTALLATIONNOTES TEXT,
                    ZTAGS TEXT,
                    ZVIEWCOUNT INTEGER,
                    ZCREATEDDATE REAL,
                    ZLASTVIEWEDDATE REAL,
                    ZPDFDATA BLOB,
                    ZPDFFILENAME TEXT
                )
            `);
        }
    });
}

// Download database
function downloadDatabase() {
    if (!db) return;

    const data = db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName || 'database.sqlite';
    a.click();
    URL.revokeObjectURL(url);
}

// Load all data
function loadAllData() {
    try {
        loadCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        elements.categoriesList.innerHTML = '<div class="empty-state"><p>Error loading categories</p></div>';
    }

    try {
        loadNotes();
    } catch (error) {
        console.error('Error loading notes:', error);
        elements.notesList.innerHTML = '<div class="empty-state"><p>Error loading notes</p></div>';
    }

    try {
        loadProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        elements.productsList.innerHTML = '<div class="empty-state"><p>Error loading products</p></div>';
    }
}

// === CATEGORIES ===

function loadCategories() {
    console.log('Loading categories...');

    // Check if table exists first
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ZINFOCATEGORY'");
    const hasTable = tableCheck.step();
    tableCheck.free();

    if (!hasTable) {
        console.log('ZINFOCATEGORY table does not exist, creating it...');
        createMissingTables(['ZINFOCATEGORY']);
    }

    const stmt = db.prepare(`
        SELECT Z_PK, ZNAME, ZICON, ZSORTORDER
        FROM ZINFOCATEGORY
        ORDER BY ZSORTORDER, ZNAME
    `);

    const categories = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        categories.push({
            id: row.Z_PK,
            name: row.ZNAME || '',
            icon: row.ZICON || '',
            sortOrder: row.ZSORTORDER || 0
        });
    }
    stmt.free();

    console.log(`Loaded ${categories.length} categories`);
    renderCategories(categories);
}

function renderCategories(categories) {
    if (categories.length === 0) {
        elements.categoriesList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                </svg>
                <h3>No Categories</h3>
                <p>Add a category to organize your notes</p>
            </div>
        `;
        return;
    }

    elements.categoriesList.innerHTML = categories.map(cat => {
        return `
            <div class="item-card" onclick="openCategoryModal(${cat.id})">
                <div class="item-header">
                    <div>
                        <div class="item-title">
                            <span style="margin-right: 8px;">${cat.icon}</span>
                            ${escapeHtml(cat.name)}
                        </div>
                        <div class="item-meta">
                            <span>Sort Order: ${cat.sortOrder}</span>
                        </div>
                    </div>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-danger" onclick="deleteCategory(${cat.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openCategoryModal(id = null) {
    let category = null;
    if (id) {
        const stmt = db.prepare('SELECT * FROM ZINFOCATEGORY WHERE Z_PK = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            category = {
                id: row.Z_PK,
                name: row.ZNAME || '',
                icon: row.ZICON || '',
                sortOrder: row.ZSORTORDER || 0
            };
        }
        stmt.free();
    }

    elements.modalTitle.textContent = category ? 'Edit Category' : 'Add Category';
    elements.modalBody.innerHTML = `
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" id="categoryName" value="${category ? escapeHtml(category.name) : ''}" placeholder="Enter category name">
        </div>
        <div class="form-group">
            <label>Icon (Emoji)</label>
            <input type="text" id="categoryIcon" value="${category ? escapeHtml(category.icon) : ''}" placeholder="📁">
        </div>
        <div class="form-group">
            <label>Sort Order</label>
            <input type="number" id="categorySortOrder" value="${category ? category.sortOrder : 0}" placeholder="0">
        </div>
    `;

    elements.modalSave.onclick = () => saveCategory(category?.id);
    openModal();
}

function saveCategory(id) {
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value.trim();
    const sortOrder = parseInt(document.getElementById('categorySortOrder').value) || 0;

    if (!name) {
        alert('Category name is required');
        return;
    }

    if (id) {
        // Update existing
        db.run(`
            UPDATE ZINFOCATEGORY
            SET ZNAME = ?, ZICON = ?, ZSORTORDER = ?
            WHERE Z_PK = ?
        `, [name, icon, sortOrder, id]);
    } else {
        // Insert new
        const maxId = getMaxId('ZINFOCATEGORY');
        const now = Date.now() / 1000 - 978307200; // Apple epoch
        db.run(`
            INSERT INTO ZINFOCATEGORY (Z_PK, Z_ENT, Z_OPT, ZNAME, ZICON, ZSORTORDER)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [maxId + 1, 2, 1, name, icon, sortOrder]);
    }

    closeModal();
    loadCategories();
}

function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    db.run('DELETE FROM ZINFOCATEGORY WHERE Z_PK = ?', [id]);
    loadCategories();
}

// === NOTES ===

function loadNotes() {
    console.log('Loading notes...');

    // Check if table exists first
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ZINFOITEM'");
    const hasTable = tableCheck.step();
    tableCheck.free();

    if (!hasTable) {
        console.log('ZINFOITEM table does not exist, creating it...');
        createMissingTables(['ZINFOITEM']);
    }

    const stmt = db.prepare(`
        SELECT n.Z_PK, n.ZTITLE, n.ZCONTENT, n.ZVIEWCOUNT, n.ZCATEGORY, n.ZPDFDATA, n.ZPDFFILENAME, c.ZNAME as CATEGORYNAME
        FROM ZINFOITEM n
        LEFT JOIN ZINFOCATEGORY c ON n.ZCATEGORY = c.Z_PK
        ORDER BY n.Z_PK DESC
    `);

    const notes = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        notes.push({
            id: row.Z_PK,
            title: row.ZTITLE || '',
            content: row.ZCONTENT || '',
            viewCount: row.ZVIEWCOUNT || 0,
            categoryId: row.ZCATEGORY,
            categoryName: row.CATEGORYNAME || 'Uncategorized',
            pdfData: row.ZPDFDATA,
            pdfFileName: row.ZPDFFILENAME
        });
    }
    stmt.free();

    console.log(`Loaded ${notes.length} notes`);
    renderNotes(notes);
}

function renderNotes(notes) {
    if (notes.length === 0) {
        elements.notesList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z"/>
                </svg>
                <h3>No Notes</h3>
                <p>Add your first note to get started</p>
            </div>
        `;
        return;
    }

    elements.notesList.innerHTML = notes.map(note => `
        <div class="item-card" data-note-id="${note.id}">
            <div class="item-title">${escapeHtml(note.title)}</div>
            <div class="item-meta">
                <span class="category-badge">${escapeHtml(note.categoryName)}</span>
                ${note.pdfFileName ? `<span class="pdf-badge" title="${escapeHtml(note.pdfFileName)}">📎 PDF</span>` : ''}
            </div>
            <div class="item-content">${escapeHtml(note.content.substring(0, 80))}${note.content.length > 80 ? '...' : ''}</div>
        </div>
    `).join('');

    // Add click listeners
    document.querySelectorAll('#notesList .item-card').forEach(card => {
        card.addEventListener('click', () => {
            const noteId = parseInt(card.dataset.noteId);
            openNoteEditor(noteId);
        });
    });
}

function openNoteEditor(id = null) {
    let note = null;
    if (id) {
        const stmt = db.prepare('SELECT * FROM ZINFOITEM WHERE Z_PK = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            note = {
                id: row.Z_PK,
                title: row.ZTITLE || '',
                content: row.ZCONTENT || '',
                categoryId: row.ZCATEGORY,
                pdfData: row.ZPDFDATA,
                pdfFileName: row.ZPDFFILENAME
            };
        }
        stmt.free();
    }

    currentEditingNote = note;
    currentNotePDF = null; // Reset PDF upload

    // Get categories for dropdown
    const categoriesStmt = db.prepare('SELECT Z_PK, ZNAME FROM ZINFOCATEGORY ORDER BY ZNAME');
    const categories = [];
    while (categoriesStmt.step()) {
        const row = categoriesStmt.getAsObject();
        categories.push({ id: row.Z_PK, name: row.ZNAME });
    }
    categoriesStmt.free();

    // Render editor
    elements.noteEditor.innerHTML = `
        <form class="editor-form" onsubmit="return false;">
            <div class="editor-header">
                <input type="text" id="noteTitle" class="form-control-title" value="${note ? escapeHtml(note.title) : ''}" placeholder="Note title..." style="border: none; background: transparent; font-size: 24px; font-weight: 600; width: 100%; padding: 0; outline: none; color: inherit;">
            </div>
            <div class="editor-body">
                <div class="form-group">
                    <label>Category</label>
                    <select id="noteCategory">
                        <option value="">Uncategorized</option>
                        ${categories.map(cat => `
                            <option value="${cat.id}" ${note && note.categoryId === cat.id ? 'selected' : ''}>
                                ${escapeHtml(cat.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>PDF Attachment</label>
                    <div class="pdf-upload-area">
                        <input type="file" id="notePdfInput" accept=".pdf" style="display: none;" onchange="handleNotePDFUpload(event)">
                        <div id="pdfAttachment">
                            ${note && note.pdfFileName ? `
                                <div class="pdf-attachment">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                                        <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
                                    </svg>
                                    <span>${escapeHtml(note.pdfFileName)}</span>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="viewNotePDF()">View</button>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadNotePDF()">Download</button>
                                    <button type="button" class="btn btn-danger btn-sm" onclick="removeNotePDF()">Remove</button>
                                </div>
                            ` : `
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('notePdfInput').click()">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                                    </svg>
                                    Attach PDF
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Content</label>
                    <textarea id="noteContent">${note ? escapeHtml(note.content) : ''}</textarea>
                </div>
            </div>
            <div class="editor-footer">
                <div class="editor-footer-left">
                    ${note ? '<button type="button" class="btn btn-danger" onclick="deleteNoteFromEditor(' + note.id + ')">Delete</button>' : ''}
                </div>
                <div class="editor-footer-right">
                    <button type="button" class="btn btn-secondary" onclick="closeNoteEditor()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveNoteFromEditor()">Save</button>
                </div>
            </div>
        </form>
    `;

    // Initialize EasyMDE
    if (noteEditor) {
        noteEditor.toTextArea();
        noteEditor = null;
    }

    noteEditor = new EasyMDE({
        element: document.getElementById('noteContent'),
        spellChecker: false,
        status: false,
        toolbar: false,
        minHeight: '400px',
        placeholder: 'Write your note here...',
    });

    // Highlight active note in list
    document.querySelectorAll('#notesList .item-card').forEach(card => {
        card.classList.toggle('active', note && parseInt(card.dataset.noteId) === note.id);
    });

    // Focus title on new note
    if (!note) {
        setTimeout(() => document.getElementById('noteTitle')?.focus(), 100);
    }
}

function closeNoteEditor() {
    currentEditingNote = null;

    // Clean up EasyMDE instance
    if (noteEditor) {
        noteEditor.toTextArea();
        noteEditor = null;
    }

    elements.noteEditor.innerHTML = `
        <div class="editor-placeholder">
            <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z"/>
            </svg>
            <p>Select a note to edit or create a new one</p>
        </div>
    `;

    // Remove active state from all cards
    document.querySelectorAll('#notesList .item-card').forEach(card => {
        card.classList.remove('active');
    });
}

function saveNoteFromEditor() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = noteEditor ? noteEditor.value().trim() : '';
    const categoryId = document.getElementById('noteCategory').value;

    if (!title) {
        alert('Title is required');
        return;
    }

    const id = currentEditingNote?.id;

    // Determine PDF data and filename
    let pdfData = currentEditingNote?.pdfData;
    let pdfFileName = currentEditingNote?.pdfFileName;

    if (currentNotePDF) {
        // New PDF uploaded
        pdfData = currentNotePDF.data;
        pdfFileName = currentNotePDF.name;
    } else if (currentEditingNote?.pdfRemoved) {
        // PDF removed
        pdfData = null;
        pdfFileName = null;
    }

    if (id) {
        // Update existing
        db.run(`
            UPDATE ZINFOITEM
            SET ZTITLE = ?, ZCONTENT = ?, ZCATEGORY = ?, ZPDFDATA = ?, ZPDFFILENAME = ?
            WHERE Z_PK = ?
        `, [title, content, categoryId || null, pdfData, pdfFileName, id]);
    } else {
        // Insert new
        const maxId = getMaxId('ZINFOITEM');
        db.run(`
            INSERT INTO ZINFOITEM (Z_PK, Z_ENT, Z_OPT, ZTITLE, ZCONTENT, ZCATEGORY, ZPDFDATA, ZPDFFILENAME, ZVIEWCOUNT)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [maxId + 1, 1, 1, title, content, categoryId || null, pdfData, pdfFileName, 0]);
    }

    loadNotes();
    closeNoteEditor();
}

// PDF handling functions
async function handleNotePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    currentNotePDF = {
        data: uint8Array,
        name: file.name
    };

    // Update UI to show uploaded PDF
    document.getElementById('pdfAttachment').innerHTML = `
        <div class="pdf-attachment">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
            </svg>
            <span>${escapeHtml(file.name)} (new)</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeNotePDF()">Remove</button>
        </div>
    `;
}

function viewNotePDF() {
    const pdfData = currentEditingNote?.pdfData;
    if (!pdfData) return;

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

function downloadNotePDF() {
    const pdfData = currentEditingNote?.pdfData;
    const pdfFileName = currentEditingNote?.pdfFileName || 'document.pdf';
    if (!pdfData) return;

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFileName;
    a.click();
    URL.revokeObjectURL(url);
}

function removeNotePDF() {
    currentNotePDF = null;
    if (currentEditingNote) {
        currentEditingNote.pdfRemoved = true;
    }

    // Update UI to show upload button
    document.getElementById('pdfAttachment').innerHTML = `
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('notePdfInput').click()">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            Attach PDF
        </button>
    `;
}

function deleteNoteFromEditor(id) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    db.run('DELETE FROM ZINFOITEM WHERE Z_PK = ?', [id]);
    closeNoteEditor();
    loadNotes();
}

function openNoteModal(id = null) {
    let note = null;
    if (id) {
        const stmt = db.prepare('SELECT * FROM ZINFOITEM WHERE Z_PK = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            note = {
                id: row.Z_PK,
                title: row.ZTITLE || '',
                content: row.ZCONTENT || '',
                categoryId: row.ZCATEGORY
            };
        }
        stmt.free();
    }

    // Get categories for dropdown
    const categoriesStmt = db.prepare('SELECT Z_PK, ZNAME FROM ZINFOCATEGORY ORDER BY ZNAME');
    const categories = [];
    while (categoriesStmt.step()) {
        const row = categoriesStmt.getAsObject();
        categories.push({ id: row.Z_PK, name: row.ZNAME });
    }
    categoriesStmt.free();

    elements.modalTitle.textContent = note ? 'Edit Note' : 'Add Note';
    elements.modalBody.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="noteTitle" value="${note ? escapeHtml(note.title) : ''}" placeholder="Enter title">
        </div>
        <div class="form-group">
            <label>Category</label>
            <select id="noteCategory">
                <option value="">Uncategorized</option>
                ${categories.map(cat => `
                    <option value="${cat.id}" ${note && note.categoryId === cat.id ? 'selected' : ''}>
                        ${escapeHtml(cat.name)}
                    </option>
                `).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Content (Markdown supported)</label>
            <textarea id="noteContent" placeholder="Write your note here...">${note ? escapeHtml(note.content) : ''}</textarea>
        </div>
    `;

    elements.modalSave.onclick = () => saveNote(note?.id);
    openModal();
}


// === PRODUCTS ===

function loadProducts() {
    console.log('Loading products...');

    // Check if table exists first
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ZPRODUCTDOC'");
    const hasTable = tableCheck.step();
    tableCheck.free();

    if (!hasTable) {
        console.log('ZPRODUCTDOC table does not exist, creating it...');
        createMissingTables(['ZPRODUCTDOC']);
    }

    const stmt = db.prepare(`
        SELECT Z_PK, ZPRODUCTNAME, ZMANUFACTURER, ZSPECIFICATIONS, ZINSTALLATIONNOTES, ZVIEWCOUNT
        FROM ZPRODUCTDOC
        ORDER BY Z_PK DESC
    `);

    const products = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        products.push({
            id: row.Z_PK,
            name: row.ZPRODUCTNAME || '',
            manufacturer: row.ZMANUFACTURER || '',
            specifications: row.ZSPECIFICATIONS || '',
            installationNotes: row.ZINSTALLATIONNOTES || '',
            viewCount: row.ZVIEWCOUNT || 0
        });
    }
    stmt.free();

    console.log(`Loaded ${products.length} products`);
    renderProducts(products);
}

function renderProducts(products) {
    if (products.length === 0) {
        elements.productsList.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                </svg>
                <h3>No Products</h3>
                <p>Add product documentation to get started</p>
            </div>
        `;
        return;
    }

    elements.productsList.innerHTML = products.map(product => `
        <div class="item-card" data-product-id="${product.id}">
            <div class="item-title">${escapeHtml(product.name)}</div>
            <div class="item-meta">
                <span>${escapeHtml(product.manufacturer)}</span>
            </div>
            <div class="item-content">${escapeHtml(product.specifications.substring(0, 80))}${product.specifications.length > 80 ? '...' : ''}</div>
        </div>
    `).join('');

    // Add click listeners
    document.querySelectorAll('#productsList .item-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = parseInt(card.dataset.productId);
            openProductEditor(productId);
        });
    });
}

function openProductEditor(id = null) {
    let product = null;
    if (id) {
        const stmt = db.prepare('SELECT * FROM ZPRODUCTDOC WHERE Z_PK = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            product = {
                id: row.Z_PK,
                name: row.ZPRODUCTNAME || '',
                manufacturer: row.ZMANUFACTURER || '',
                specifications: row.ZSPECIFICATIONS || '',
                installationNotes: row.ZINSTALLATIONNOTES || ''
            };
        }
        stmt.free();
    }

    currentEditingProduct = product;

    // Render editor
    elements.productEditor.innerHTML = `
        <form class="editor-form" onsubmit="return false;">
            <div class="editor-header">
                <input type="text" id="productName" class="form-control-title" value="${product ? escapeHtml(product.name) : ''}" placeholder="Product name..." style="border: none; background: transparent; font-size: 24px; font-weight: 600; width: 100%; padding: 0; outline: none; color: inherit;">
            </div>
            <div class="editor-body">
                <div class="form-group">
                    <label>Manufacturer</label>
                    <input type="text" id="productManufacturer" value="${product ? escapeHtml(product.manufacturer) : ''}" placeholder="Enter manufacturer">
                </div>
                <div class="form-group">
                    <label>Specifications</label>
                    <textarea id="productSpecifications">${product ? escapeHtml(product.specifications) : ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Installation Notes</label>
                    <textarea id="productInstallation">${product ? escapeHtml(product.installationNotes) : ''}</textarea>
                </div>
            </div>
            <div class="editor-footer">
                <div class="editor-footer-left">
                    ${product ? '<button type="button" class="btn btn-danger" onclick="deleteProductFromEditor(' + product.id + ')">Delete</button>' : ''}
                </div>
                <div class="editor-footer-right">
                    <button type="button" class="btn btn-secondary" onclick="closeProductEditor()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveProductFromEditor()">Save</button>
                </div>
            </div>
        </form>
    `;

    // Clean up existing editors
    if (productSpecsEditor) {
        productSpecsEditor.toTextArea();
        productSpecsEditor = null;
    }
    if (productInstallEditor) {
        productInstallEditor.toTextArea();
        productInstallEditor = null;
    }

    // Initialize EasyMDE instances
    productSpecsEditor = new EasyMDE({
        element: document.getElementById('productSpecifications'),
        spellChecker: false,
        status: false,
        toolbar: false,
        minHeight: '200px',
        placeholder: 'Enter specifications...',
    });

    productInstallEditor = new EasyMDE({
        element: document.getElementById('productInstallation'),
        spellChecker: false,
        status: false,
        toolbar: false,
        minHeight: '200px',
        placeholder: 'Enter installation notes...',
    });

    // Highlight active product in list
    document.querySelectorAll('#productsList .item-card').forEach(card => {
        card.classList.toggle('active', product && parseInt(card.dataset.productId) === product.id);
    });

    // Focus title on new product
    if (!product) {
        setTimeout(() => document.getElementById('productName')?.focus(), 100);
    }
}

function closeProductEditor() {
    currentEditingProduct = null;

    // Clean up EasyMDE instances
    if (productSpecsEditor) {
        productSpecsEditor.toTextArea();
        productSpecsEditor = null;
    }
    if (productInstallEditor) {
        productInstallEditor.toTextArea();
        productInstallEditor = null;
    }

    elements.productEditor.innerHTML = `
        <div class="editor-placeholder">
            <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
            </svg>
            <p>Select a product to edit or create a new one</p>
        </div>
    `;

    // Remove active state from all cards
    document.querySelectorAll('#productsList .item-card').forEach(card => {
        card.classList.remove('active');
    });
}

function saveProductFromEditor() {
    const name = document.getElementById('productName').value.trim();
    const manufacturer = document.getElementById('productManufacturer').value.trim();
    const specifications = productSpecsEditor ? productSpecsEditor.value().trim() : '';
    const installationNotes = productInstallEditor ? productInstallEditor.value().trim() : '';

    if (!name) {
        alert('Product name is required');
        return;
    }

    const id = currentEditingProduct?.id;

    if (id) {
        // Update existing
        db.run(`
            UPDATE ZPRODUCTDOC
            SET ZPRODUCTNAME = ?, ZMANUFACTURER = ?, ZSPECIFICATIONS = ?, ZINSTALLATIONNOTES = ?
            WHERE Z_PK = ?
        `, [name, manufacturer, specifications, installationNotes, id]);
    } else {
        // Insert new
        const maxId = getMaxId('ZPRODUCTDOC');
        db.run(`
            INSERT INTO ZPRODUCTDOC (Z_PK, Z_ENT, Z_OPT, ZPRODUCTNAME, ZMANUFACTURER, ZSPECIFICATIONS, ZINSTALLATIONNOTES, ZVIEWCOUNT)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [maxId + 1, 3, 1, name, manufacturer, specifications, installationNotes, 0]);
    }

    loadProducts();
    closeProductEditor();
}

function deleteProductFromEditor(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    db.run('DELETE FROM ZPRODUCTDOC WHERE Z_PK = ?', [id]);
    closeProductEditor();
    loadProducts();
}

function openProductModal(id = null) {
    let product = null;
    if (id) {
        const stmt = db.prepare('SELECT * FROM ZPRODUCTDOC WHERE Z_PK = ?');
        stmt.bind([id]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            product = {
                id: row.Z_PK,
                name: row.ZPRODUCTNAME || '',
                manufacturer: row.ZMANUFACTURER || '',
                specifications: row.ZSPECIFICATIONS || '',
                installationNotes: row.ZINSTALLATIONNOTES || ''
            };
        }
        stmt.free();
    }

    elements.modalTitle.textContent = product ? 'Edit Product' : 'Add Product';
    elements.modalBody.innerHTML = `
        <div class="form-group">
            <label>Product Name</label>
            <input type="text" id="productName" value="${product ? escapeHtml(product.name) : ''}" placeholder="Enter product name">
        </div>
        <div class="form-group">
            <label>Manufacturer</label>
            <input type="text" id="productManufacturer" value="${product ? escapeHtml(product.manufacturer) : ''}" placeholder="Enter manufacturer">
        </div>
        <div class="form-group">
            <label>Specifications (Markdown supported)</label>
            <textarea id="productSpecifications" placeholder="Enter specifications...">${product ? escapeHtml(product.specifications) : ''}</textarea>
        </div>
        <div class="form-group">
            <label>Installation Notes (Markdown supported)</label>
            <textarea id="productInstallation" placeholder="Enter installation notes...">${product ? escapeHtml(product.installationNotes) : ''}</textarea>
        </div>
    `;

    elements.modalSave.onclick = () => saveProduct(product?.id);
    openModal();
}


// === UTILITIES ===

function getMaxId(tableName) {
    const stmt = db.prepare(`SELECT MAX(Z_PK) as maxId FROM ${tableName}`);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return result.maxId || 0;
}

function openModal() {
    elements.modal.classList.add('active');
}

function closeModal() {
    elements.modal.classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sidebar toggle functions
function toggleNotesSidebar() {
    const sidebar = document.getElementById('notesSidebar');
    const splitPane = document.getElementById('notesSplitPane');
    sidebar.classList.toggle('collapsed');
    splitPane.classList.toggle('sidebar-collapsed');
}

function toggleProductsSidebar() {
    const sidebar = document.getElementById('productsSidebar');
    const splitPane = document.getElementById('productsSplitPane');
    sidebar.classList.toggle('collapsed');
    splitPane.classList.toggle('sidebar-collapsed');
}


// Make functions globally accessible for onclick handlers
window.openCategoryModal = openCategoryModal;
window.deleteCategory = deleteCategory;
window.closeNoteEditor = closeNoteEditor;
window.saveNoteFromEditor = saveNoteFromEditor;
window.deleteNoteFromEditor = deleteNoteFromEditor;
window.closeProductEditor = closeProductEditor;
window.saveProductFromEditor = saveProductFromEditor;
window.deleteProductFromEditor = deleteProductFromEditor;
window.toggleNotesSidebar = toggleNotesSidebar;
window.toggleProductsSidebar = toggleProductsSidebar;
window.handleNotePDFUpload = handleNotePDFUpload;
window.viewNotePDF = viewNotePDF;
window.downloadNotePDF = downloadNotePDF;
window.removeNotePDF = removeNotePDF;

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Database Editor loaded');
});
