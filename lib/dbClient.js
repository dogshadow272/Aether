import initSqlJs from 'sql.js';

let dbInstance = null;
let SQL = null;

// Raw IndexedDB helper to save binary SQLite database file
function saveToIndexedDB(binaryArray) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('apiron-wasm-db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('backup')) {
        db.createObjectStore('backup');
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('backup', 'readwrite');
      const store = tx.objectStore('backup');
      const putReq = store.put(binaryArray, 'db');
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Raw IndexedDB helper to load binary SQLite database file
function loadFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('apiron-wasm-db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('backup')) {
        db.createObjectStore('backup');
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction('backup', 'readonly');
      const store = tx.objectStore('backup');
      const getReq = store.get('db');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

// Helper to format parameter bindings (e.g. mapping { id: 1 } to { '@id': 1 })
function formatBindParams(params) {
  if (!params || Array.isArray(params)) return params;
  const formatted = {};
  for (const [key, val] of Object.entries(params)) {
    if (key.startsWith('@') || key.startsWith(':') || key.startsWith('$')) {
      formatted[key] = val;
    } else {
      formatted['@' + key] = val;
    }
  }
  return formatted;
}

export async function initDb() {
  if (dbInstance) return dbInstance;

  try {
    // Initialize sql.js pointing to our public folder wasm
    SQL = await initSqlJs({
      locateFile: (file) => `/sql-wasm/${file}`,
    });

    // Try loading existing database from browser's IndexedDB first
    let binaryDb = await loadFromIndexedDB();

    if (!binaryDb) {
      console.log('No local database found in IndexedDB. Fetching initial DB from server...');
      const res = await fetch('/api/db/export');
      if (!res.ok) throw new Error('Failed to fetch initial database from server');
      const buffer = await res.arrayBuffer();
      binaryDb = new Uint8Array(buffer);
      // Persist the fetched database locally immediately
      await saveToIndexedDB(binaryDb);
    } else {
      console.log('Restored database from local IndexedDB.');
    }

    dbInstance = new SQL.Database(binaryDb);
    console.log('Client-side WebAssembly SQLite initialized successfully.');
    return dbInstance;
  } catch (err) {
    console.error('Failed to initialize client-side SQLite Wasm:', err);
    throw err;
  }
}

export async function saveDb() {
  if (!dbInstance) return;
  try {
    const binary = dbInstance.export();
    await saveToIndexedDB(binary);
  } catch (err) {
    console.error('Failed to save database to IndexedDB:', err);
  }
}

export const dbClient = {
  getDb() {
    return dbInstance;
  },

  // Runs queries like INSERT, UPDATE, DELETE
  run(sql, params = {}) {
    if (!dbInstance) throw new Error('Database not initialized');
    const formattedParams = formatBindParams(params);
    dbInstance.run(sql, formattedParams);
    // Persist changes to IndexedDB in the background
    saveDb();
  },

  // Returns all rows matching the query
  all(sql, params = {}) {
    if (!dbInstance) throw new Error('Database not initialized');
    const formattedParams = formatBindParams(params);
    
    const stmt = dbInstance.prepare(sql);
    try {
      stmt.bind(formattedParams);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  },

  // Returns first row matching the query
  get(sql, params = {}) {
    const rows = this.all(sql, params);
    return rows[0];
  }
};
