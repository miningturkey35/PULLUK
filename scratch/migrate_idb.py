import re
import os

with open("app.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Replace the old getFileFromCache and saveFileToCache
old_cache_logic = """function getFileFromCache(file) {
  if (file.isMock) return false;
  try {
    const cachedStr = localStorage.getItem('pulluk_file_' + file.id);
    if (!cachedStr) return false;
    const cached = JSON.parse(cachedStr);
    if (cached.modifiedTime === file.modifiedTime) {
      file._title = cached._title;
      file._subtitle = cached._subtitle;
      file._image = cached._image;
      file._code = cached._code;
      file._htmlContent = cached._htmlContent;
      return true;
    }
  } catch(e) {}
  return false;
}

function saveFileToCache(file) {
  if (file.isMock) return;
  try {
    const data = {
      modifiedTime: file.modifiedTime,
      _title: file._title,
      _subtitle: file._subtitle,
      _image: file._image,
      _code: file._code,
      // _htmlContent: file._htmlContent
    };
    localStorage.setItem('pulluk_file_' + file.id, JSON.stringify(data));
  } catch(e) {}
}"""

new_cache_logic = """const DB_NAME = 'PullukDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileCache';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

let dbPromise = initDB();

async function getFileFromCache(file) {
  if (file.isMock) return false;
  try {
    const db = await dbPromise;
    const cached = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(file.id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (cached && cached.modifiedTime === file.modifiedTime) {
      file._title = cached._title;
      file._subtitle = cached._subtitle;
      file._image = cached._image;
      file._code = cached._code;
      file._htmlContent = cached._htmlContent;
      return true;
    }
  } catch(e) {
    console.warn('IDB get error', e);
  }
  return false;
}

async function saveFileToCache(file) {
  if (file.isMock) return;
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data = {
      id: file.id,
      modifiedTime: file.modifiedTime,
      _title: file._title,
      _subtitle: file._subtitle,
      _image: file._image,
      _code: file._code,
      _htmlContent: file._htmlContent
    };
    store.put(data);
  } catch(e) {
    console.warn('IDB put error', e);
  }
}"""

js = js.replace(old_cache_logic, new_cache_logic)

# 2. Update usages: 
# a) processPreviewQueue -> `await getFileFromCache(file)`
js = js.replace("if (!file._title && getFileFromCache(file)) {", "if (!file._title && await getFileFromCache(file)) {")

# b) load() -> Promise.all
js = js.replace("this.allFiles.forEach(file => getFileFromCache(file));", "await Promise.all(this.allFiles.map(file => getFileFromCache(file)));")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Migration script executed.")
