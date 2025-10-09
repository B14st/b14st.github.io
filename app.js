// Global state
let db = null;
let SQL = null;
let currentFileName = '';
let attachments = new Map(); // Store attachments in memory: path -> Uint8Array
let isToolpack = false; // Track if loaded file is .toolpack

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
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    notesCategoryFilter: document.getElementById('notesCategoryFilter'),
    notesSortBy: document.getElementById('notesSortBy')
};

// Current editing state
let currentEditingNote = null;
let currentEditingProduct = null;
let noteEditor = null;
let productSpecsEditor = null;
let productInstallEditor = null;
let currentNotePDF = null; // Store PDF file for upload
let currentProductPDF = null; // Store PDF file for product upload

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

// ===== UTILITY FUNCTIONS =====

// ZIP Utilities
async function unzipToolpack(arrayBuffer) {
    return new Promise((resolve, reject) => {
        try {
            const uint8 = new Uint8Array(arrayBuffer);
            fflate.unzip(uint8, (err, unzipped) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(unzipped);
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function createToolpackZip(dbData, attachmentsMap, libraryName) {
    return new Promise((resolve, reject) => {
        try {
            // Create manifest
            const manifest = {
                version: "1.0",
                libraryId: crypto.randomUUID(),
                schemaVersion: 1,
                createdAt: new Date().toISOString()
            };

            const files = {
                'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
                'library.sqlite': dbData
            };

            // Add attachments
            for (const [path, data] of attachmentsMap.entries()) {
                files[`attachments/${path}`] = data;
            }

            fflate.zip(files, (err, zipped) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(zipped);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Hash Utilities
async function calculateSHA256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Attachment Management
async function saveAttachment(pdfData, fileName) {
    // Calculate hash
    const hash = await calculateSHA256(pdfData);

    // Create path: first2chars/fullhash.ext
    const first2 = hash.substring(0, 2);
    const ext = fileName.split('.').pop() || 'pdf';
    const relativePath = `${first2}/${hash}.${ext}`;

    // Store in memory
    attachments.set(relativePath, new Uint8Array(pdfData));

    // Return metadata
    return {
        fileName: fileName,
        mimeType: 'application/pdf',
        size: pdfData.byteLength,
        hash: hash,
        relativePath: relativePath
    };
}

function getAttachment(relativePath) {
    return attachments.get(relativePath);
}

function deleteAttachment(relativePath) {
    attachments.delete(relativePath);
}

// File handling
async function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Loading file:', file.name);
    currentFileName = file.name;

    // Clear previous attachments
    attachments.clear();
    isToolpack = false;

    try {
        const arrayBuffer = await file.arrayBuffer();

        if (!SQL) {
            await initSQL();
        }

        // Check file extension
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'toolpack') {
            // Load .toolpack format
            isToolpack = true;
            console.log('Loading .toolpack file...');

            const unzipped = await unzipToolpack(arrayBuffer);

            // Debug: log all files in the archive
            console.log('Files in .toolpack:', Object.keys(unzipped));

            // Find the base directory (handle UUID prefix from iOS)
            let baseDir = '';
            const firstKey = Object.keys(unzipped)[0];
            if (firstKey && firstKey.includes('/')) {
                baseDir = firstKey.split('/')[0] + '/';
            }
            console.log('Base directory:', baseDir || '(root)');

            // Check for required files (with or without base directory)
            const libraryPath = baseDir + 'library.sqlite';
            const manifestPath = baseDir + 'manifest.json';

            if (!unzipped[libraryPath]) {
                throw new Error('Invalid .toolpack: missing library.sqlite');
            }

            if (!unzipped[manifestPath]) {
                throw new Error('Invalid .toolpack: missing manifest.json');
            }

            // Parse manifest
            const manifestText = new TextDecoder().decode(unzipped[manifestPath]);
            const manifest = JSON.parse(manifestText);
            console.log('Manifest:', manifest);

            // Load database
            db = new SQL.Database(unzipped[libraryPath]);

            // Load attachments into memory
            const attachmentsPrefix = baseDir + 'attachments/';
            for (const [path, data] of Object.entries(unzipped)) {
                if (path.startsWith(attachmentsPrefix)) {
                    const relativePath = path.replace(attachmentsPrefix, '');
                    attachments.set(relativePath, data);
                    console.log('Loaded attachment:', relativePath);
                }
            }

            console.log('Loaded', attachments.size, 'attachments');

        } else {
            // Load legacy .sqlite format
            console.log('Loading .sqlite file...');
            const uint8Array = new Uint8Array(arrayBuffer);
            db = new SQL.Database(uint8Array);
        }

        console.log('Database loaded successfully');

        // Verify database structure
        verifyDatabaseStructure();

        // Debug: Check row counts
        try {
            const notesCount = db.exec("SELECT COUNT(*) as count FROM ZINFOITEM")[0].values[0][0];
            const categoriesCount = db.exec("SELECT COUNT(*) as count FROM ZINFOCATEGORY")[0].values[0][0];
            const productsCount = db.exec("SELECT COUNT(*) as count FROM ZPRODUCTDOC")[0].values[0][0];
            console.log(`Database row counts - Notes: ${notesCount}, Categories: ${categoriesCount}, Products: ${productsCount}`);
        } catch (e) {
            console.error('Error checking row counts:', e);
        }

        // Update UI
        elements.welcomeScreen.style.display = 'none';
        elements.appContent.style.display = 'block';
        elements.downloadBtn.disabled = false;
        elements.dbName.textContent = file.name;

        // Load data
        loadAllData();
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading database:', error);
        alert('Error loading database: ' + error.message);
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
                    ZPDFDATABASE64 TEXT,
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
                    ZPRODUCTNAME TEXT,
                    ZMANUFACTURER TEXT,
                    ZSPECIFICATIONS TEXT,
                    ZINSTALLATIONNOTES TEXT,
                    ZTAGS TEXT,
                    ZVIEWCOUNT INTEGER,
                    ZCREATEDDATE REAL,
                    ZLASTVIEWEDDATE REAL,
                    ZPDFDATABASE64 TEXT,
                    ZPDFFILENAME TEXT
                )
            `);
        }
    });
}

// Download database
async function downloadDatabase() {
    if (!db) return;

    try {
        let blob;
        let filename;

        if (isToolpack) {
            // Export as .toolpack
            console.log('Exporting as .toolpack...');
            const dbData = db.export();
            const zipped = await createToolpackZip(dbData, attachments, currentFileName);
            blob = new Blob([zipped], { type: 'application/zip' });
            filename = currentFileName.replace(/\.(toolpack|sqlite)$/, '') + '.toolpack';
        } else {
            // Export as .sqlite for backward compatibility
            console.log('Exporting as .sqlite...');
            const data = db.export();
            blob = new Blob([data], { type: 'application/x-sqlite3' });
            filename = currentFileName.replace(/\.(toolpack|sqlite)$/, '') + '.sqlite';
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Database downloaded:', filename);
    } catch (error) {
        console.error('Error downloading database:', error);
        alert('Error downloading database: ' + error.message);
    }
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
            <div class="item-card category-item"
                 draggable="true"
                 data-category-id="${cat.id}"
                 data-sort-order="${cat.sortOrder}">
                <div class="item-header">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                        </svg>
                    </div>
                    <div onclick="openCategoryModal(${cat.id})" style="flex: 1; cursor: pointer;">
                        <div class="item-title">
                            <span style="margin-right: 8px;">${cat.icon}</span>
                            ${escapeHtml(cat.name)}
                        </div>
                    </div>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-danger" onclick="deleteCategory(${cat.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add drag and drop listeners
    setupCategoryDragAndDrop();
}

function setupCategoryDragAndDrop() {
    const categoryItems = document.querySelectorAll('.category-item');
    let draggedItem = null;

    categoryItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML);
        });

        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const afterElement = getDragAfterElement(elements.categoriesList, e.clientY);
            if (afterElement == null) {
                elements.categoriesList.appendChild(draggedItem);
            } else {
                elements.categoriesList.insertBefore(draggedItem, afterElement);
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            updateCategorySortOrder();
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.category-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateCategorySortOrder() {
    const categoryItems = document.querySelectorAll('.category-item');
    const updates = [];

    categoryItems.forEach((item, index) => {
        const categoryId = parseInt(item.dataset.categoryId);
        const newSortOrder = index;
        updates.push({ id: categoryId, sortOrder: newSortOrder });
    });

    // Update database
    updates.forEach(update => {
        db.run(`
            UPDATE ZINFOCATEGORY
            SET ZSORTORDER = ?
            WHERE Z_PK = ?
        `, [update.sortOrder, update.id]);
    });

    console.log('Updated category sort order');
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
        `, [maxId + 1, 1, 1, name, icon, sortOrder]);
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
        SELECT n.Z_PK, n.ZTITLE, n.ZCONTENT, n.ZVIEWCOUNT, n.ZCATEGORY,
               n.ZPDFFILENAME, n.ZPDFMIMETYPE, n.ZPDFSIZE, n.ZPDFHASH, n.ZPDFRELATIVEPATH,
               c.ZNAME as CATEGORYNAME
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
            pdfFileName: row.ZPDFFILENAME,
            pdfMimeType: row.ZPDFMIMETYPE,
            pdfSize: row.ZPDFSIZE,
            pdfHash: row.ZPDFHASH,
            pdfRelativePath: row.ZPDFRELATIVEPATH
        });
    }
    stmt.free();

    console.log(`Loaded ${notes.length} notes`);

    // Load categories into filter
    loadNotesCategories();

    // Render with current filters
    renderNotes(notes);
}

function loadNotesCategories() {
    const categoryFilter = elements.notesCategoryFilter;

    // Get all categories
    const stmt = db.prepare('SELECT Z_PK, ZNAME FROM ZINFOCATEGORY ORDER BY ZNAME');
    const categories = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();
        categories.push({
            id: row.Z_PK,
            name: row.ZNAME
        });
    }
    stmt.free();

    // Populate filter dropdown
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
}

function getFilteredAndSortedNotes() {
    // Get all notes
    const stmt = db.prepare(`
        SELECT n.Z_PK, n.ZTITLE, n.ZCONTENT, n.ZVIEWCOUNT, n.ZCATEGORY,
               n.ZPDFFILENAME, n.ZPDFMIMETYPE, n.ZPDFSIZE, n.ZPDFHASH, n.ZPDFRELATIVEPATH,
               c.ZNAME as CATEGORYNAME
        FROM ZINFOITEM n
        LEFT JOIN ZINFOCATEGORY c ON n.ZCATEGORY = c.Z_PK
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
            pdfFileName: row.ZPDFFILENAME,
            pdfMimeType: row.ZPDFMIMETYPE,
            pdfSize: row.ZPDFSIZE,
            pdfHash: row.ZPDFHASH,
            pdfRelativePath: row.ZPDFRELATIVEPATH
        });
    }
    stmt.free();

    // Apply category filter
    const selectedCategory = elements.notesCategoryFilter.value;
    let filtered = notes;
    if (selectedCategory) {
        filtered = notes.filter(note => note.categoryId == selectedCategory);
    }

    // Apply sorting
    const sortBy = elements.notesSortBy.value;
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return b.id - a.id;
            case 'oldest':
                return a.id - b.id;
            case 'title':
                return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
                return (b.title || '').localeCompare(a.title || '');
            default:
                return b.id - a.id;
        }
    });

    return filtered;
}

function refreshNotesList() {
    const notes = getFilteredAndSortedNotes();
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
            <div class="item-title">
                ${escapeHtml(note.title)}
                ${note.pdfFileName ? '<span style="margin-left: 8px; color: #e74c3c;" title="Has PDF attachment">📎</span>' : ''}
            </div>
            <div class="item-meta">
                <span class="category-badge">${escapeHtml(note.categoryName)}</span>
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
                pdfFileName: row.ZPDFFILENAME,
                pdfMimeType: row.ZPDFMIMETYPE,
                pdfSize: row.ZPDFSIZE,
                pdfHash: row.ZPDFHASH,
                pdfRelativePath: row.ZPDFRELATIVEPATH
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

async function saveNoteFromEditor() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = noteEditor ? noteEditor.value().trim() : '';
    const categoryId = document.getElementById('noteCategory').value;

    if (!title) {
        alert('Title is required');
        return;
    }

    const id = currentEditingNote?.id;

    // Handle PDF with file-based storage
    let pdfMetadata = null;

    if (currentNotePDF) {
        // New PDF uploaded - save to attachments
        pdfMetadata = await saveAttachment(currentNotePDF.data, currentNotePDF.name);
    } else if (currentEditingNote && !currentEditingNote.pdfRemoved && currentEditingNote.pdfRelativePath) {
        // Keep existing PDF metadata
        pdfMetadata = {
            fileName: currentEditingNote.pdfFileName,
            mimeType: currentEditingNote.pdfMimeType,
            size: currentEditingNote.pdfSize,
            hash: currentEditingNote.pdfHash,
            relativePath: currentEditingNote.pdfRelativePath
        };
    }

    try {
        if (id) {
            // Update existing
            if (pdfMetadata) {
                db.run(`
                    UPDATE ZINFOITEM
                    SET ZTITLE = ?, ZCONTENT = ?, ZCATEGORY = ?,
                        ZPDFFILENAME = ?, ZPDFMIMETYPE = ?, ZPDFSIZE = ?, ZPDFHASH = ?, ZPDFRELATIVEPATH = ?
                    WHERE Z_PK = ?
                `, [title, content, categoryId || null,
                    pdfMetadata.fileName, pdfMetadata.mimeType, pdfMetadata.size,
                    pdfMetadata.hash, pdfMetadata.relativePath, id]);
            } else {
                // Removing PDF or no PDF
                db.run(`
                    UPDATE ZINFOITEM
                    SET ZTITLE = ?, ZCONTENT = ?, ZCATEGORY = ?,
                        ZPDFFILENAME = NULL, ZPDFMIMETYPE = NULL, ZPDFSIZE = NULL, ZPDFHASH = NULL, ZPDFRELATIVEPATH = NULL
                    WHERE Z_PK = ?
                `, [title, content, categoryId || null, id]);
            }
            console.log('Note updated successfully, PDF:', pdfMetadata ? 'Yes' : 'No');
        } else {
            // Insert new
            const maxId = getMaxId('ZINFOITEM');
            db.run(`
                INSERT INTO ZINFOITEM (Z_PK, Z_ENT, Z_OPT, ZTITLE, ZCONTENT, ZCATEGORY, ZVIEWCOUNT,
                                      ZPDFFILENAME, ZPDFMIMETYPE, ZPDFSIZE, ZPDFHASH, ZPDFRELATIVEPATH)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [maxId + 1, 2, 1, title, content, categoryId || null, 0,
                pdfMetadata?.fileName || null, pdfMetadata?.mimeType || null,
                pdfMetadata?.size || null, pdfMetadata?.hash || null,
                pdfMetadata?.relativePath || null]);
            console.log('Note inserted successfully, PDF:', pdfMetadata ? 'Yes' : 'No');
        }

        // Verify the save worked
        const verifyStmt = db.prepare('SELECT COUNT(*) as count FROM ZINFOITEM');
        verifyStmt.step();
        const result = verifyStmt.getAsObject();
        verifyStmt.free();
        console.log('Total notes in database:', result.count);

        loadNotes();
        closeNoteEditor();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note: ' + error.message);
    }
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
    const relativePath = currentEditingNote?.pdfRelativePath;
    if (!relativePath) return;

    const pdfData = getAttachment(relativePath);
    if (!pdfData) {
        alert('PDF file not found');
        return;
    }

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

function downloadNotePDF() {
    const relativePath = currentEditingNote?.pdfRelativePath;
    const pdfFileName = currentEditingNote?.pdfFileName || 'document.pdf';
    if (!relativePath) return;

    const pdfData = getAttachment(relativePath);
    if (!pdfData) {
        alert('PDF file not found');
        return;
    }

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

// Product PDF handling functions
async function handleProductPDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    currentProductPDF = {
        data: uint8Array,
        name: file.name
    };

    // Update UI to show uploaded PDF
    document.getElementById('productPdfAttachment').innerHTML = `
        <div class="pdf-attachment">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
            </svg>
            <span>${escapeHtml(file.name)} (new)</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeProductPDF()">Remove</button>
        </div>
    `;
}

function viewProductPDF() {
    const relativePath = currentEditingProduct?.pdfRelativePath;
    if (!relativePath) return;

    const pdfData = getAttachment(relativePath);
    if (!pdfData) {
        alert('PDF file not found');
        return;
    }

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

function downloadProductPDF() {
    const relativePath = currentEditingProduct?.pdfRelativePath;
    const pdfFileName = currentEditingProduct?.pdfFileName || 'document.pdf';
    if (!relativePath) return;

    const pdfData = getAttachment(relativePath);
    if (!pdfData) {
        alert('PDF file not found');
        return;
    }

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFileName;
    a.click();
    URL.revokeObjectURL(url);
}

function removeProductPDF() {
    currentProductPDF = null;
    if (currentEditingProduct) {
        currentEditingProduct.pdfRemoved = true;
    }

    // Update UI to show upload button
    document.getElementById('productPdfAttachment').innerHTML = `
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('productPdfInput').click()">
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
        SELECT Z_PK, ZPRODUCTNAME, ZMANUFACTURER, ZSPECIFICATIONS, ZINSTALLATIONNOTES, ZVIEWCOUNT,
               ZPDFFILENAME, ZPDFMIMETYPE, ZPDFSIZE, ZPDFHASH, ZPDFRELATIVEPATH
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
            viewCount: row.ZVIEWCOUNT || 0,
            pdfFileName: row.ZPDFFILENAME,
            pdfMimeType: row.ZPDFMIMETYPE,
            pdfSize: row.ZPDFSIZE,
            pdfHash: row.ZPDFHASH,
            pdfRelativePath: row.ZPDFRELATIVEPATH
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
            <div class="item-title">
                ${escapeHtml(product.name)}
                ${product.pdfFileName ? '<span style="margin-left: 8px; color: #e74c3c;" title="Has PDF attachment">📎</span>' : ''}
            </div>
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
                installationNotes: row.ZINSTALLATIONNOTES || '',
                pdfFileName: row.ZPDFFILENAME,
                pdfMimeType: row.ZPDFMIMETYPE,
                pdfSize: row.ZPDFSIZE,
                pdfHash: row.ZPDFHASH,
                pdfRelativePath: row.ZPDFRELATIVEPATH
            };
        }
        stmt.free();
    }

    currentEditingProduct = product;
    currentProductPDF = null; // Reset PDF upload

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
                    <label>PDF Attachment</label>
                    <div class="pdf-upload-area">
                        <input type="file" id="productPdfInput" accept=".pdf" style="display: none;" onchange="handleProductPDFUpload(event)">
                        <div id="productPdfAttachment">
                            ${product && product.pdfFileName ? `
                                <div class="pdf-attachment">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
                                        <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
                                    </svg>
                                    <span>${escapeHtml(product.pdfFileName)}</span>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="viewProductPDF()">View</button>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadProductPDF()">Download</button>
                                    <button type="button" class="btn btn-danger btn-sm" onclick="removeProductPDF()">Remove</button>
                                </div>
                            ` : `
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('productPdfInput').click()">
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

async function saveProductFromEditor() {
    const name = document.getElementById('productName').value.trim();
    const manufacturer = document.getElementById('productManufacturer').value.trim();
    const specifications = productSpecsEditor ? productSpecsEditor.value().trim() : '';
    const installationNotes = productInstallEditor ? productInstallEditor.value().trim() : '';

    if (!name) {
        alert('Product name is required');
        return;
    }

    const id = currentEditingProduct?.id;

    // Handle PDF with file-based storage
    let pdfMetadata = null;

    if (currentProductPDF) {
        // New PDF uploaded - save to attachments
        pdfMetadata = await saveAttachment(currentProductPDF.data, currentProductPDF.name);
    } else if (currentEditingProduct && !currentEditingProduct.pdfRemoved && currentEditingProduct.pdfRelativePath) {
        // Keep existing PDF metadata
        pdfMetadata = {
            fileName: currentEditingProduct.pdfFileName,
            mimeType: currentEditingProduct.pdfMimeType,
            size: currentEditingProduct.pdfSize,
            hash: currentEditingProduct.pdfHash,
            relativePath: currentEditingProduct.pdfRelativePath
        };
    }

    if (id) {
        // Update existing
        if (pdfMetadata) {
            db.run(`
                UPDATE ZPRODUCTDOC
                SET ZPRODUCTNAME = ?, ZMANUFACTURER = ?, ZSPECIFICATIONS = ?, ZINSTALLATIONNOTES = ?,
                    ZPDFFILENAME = ?, ZPDFMIMETYPE = ?, ZPDFSIZE = ?, ZPDFHASH = ?, ZPDFRELATIVEPATH = ?
                WHERE Z_PK = ?
            `, [name, manufacturer, specifications, installationNotes,
                pdfMetadata.fileName, pdfMetadata.mimeType, pdfMetadata.size,
                pdfMetadata.hash, pdfMetadata.relativePath, id]);
        } else {
            db.run(`
                UPDATE ZPRODUCTDOC
                SET ZPRODUCTNAME = ?, ZMANUFACTURER = ?, ZSPECIFICATIONS = ?, ZINSTALLATIONNOTES = ?,
                    ZPDFFILENAME = NULL, ZPDFMIMETYPE = NULL, ZPDFSIZE = NULL, ZPDFHASH = NULL, ZPDFRELATIVEPATH = NULL
                WHERE Z_PK = ?
            `, [name, manufacturer, specifications, installationNotes, id]);
        }
    } else {
        // Insert new
        const maxId = getMaxId('ZPRODUCTDOC');
        db.run(`
            INSERT INTO ZPRODUCTDOC (Z_PK, Z_ENT, Z_OPT, ZPRODUCTNAME, ZMANUFACTURER, ZSPECIFICATIONS, ZINSTALLATIONNOTES, ZVIEWCOUNT,
                                    ZPDFFILENAME, ZPDFMIMETYPE, ZPDFSIZE, ZPDFHASH, ZPDFRELATIVEPATH)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [maxId + 1, 3, 1, name, manufacturer, specifications, installationNotes, 0,
            pdfMetadata?.fileName || null, pdfMetadata?.mimeType || null,
            pdfMetadata?.size || null, pdfMetadata?.hash || null,
            pdfMetadata?.relativePath || null]);
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

// Base64 conversion helpers for PDF data
// Base64 functions removed - no longer needed with file-based storage

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
window.handleProductPDFUpload = handleProductPDFUpload;
window.viewProductPDF = viewProductPDF;
window.downloadProductPDF = downloadProductPDF;
window.removeProductPDF = removeProductPDF;

// Initialize on load
// Theme management
const THEME_KEY = 'theme-preference';

function getThemePreference() {
    return localStorage.getItem(THEME_KEY) || 'auto';
}

function setThemePreference(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');

    // Apply new theme
    if (theme === 'light') {
        body.classList.add('light-theme');
    } else if (theme === 'dark') {
        body.classList.add('dark-theme');
    }
    // If 'auto', don't add any class - will use system preference

    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = elements.themeIcon;

    if (theme === 'dark') {
        // Moon icon
        icon.innerHTML = '<path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>';
    } else if (theme === 'light') {
        // Sun icon
        icon.innerHTML = '<path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>';
    } else {
        // Auto icon (circle half-filled)
        icon.innerHTML = '<path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>';
    }
}

function toggleTheme() {
    const current = getThemePreference();
    let next;

    // Cycle through: auto -> light -> dark -> auto
    if (current === 'auto') {
        next = 'light';
    } else if (current === 'light') {
        next = 'dark';
    } else {
        next = 'auto';
    }

    setThemePreference(next);
}

// Initialize theme on load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Database Editor loaded');

    // Apply saved theme preference
    const savedTheme = getThemePreference();
    applyTheme(savedTheme);

    // Add theme toggle listener
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Add filter listeners
    elements.notesCategoryFilter.addEventListener('change', refreshNotesList);
    elements.notesSortBy.addEventListener('change', refreshNotesList);
});
