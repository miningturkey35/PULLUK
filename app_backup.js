/* =============================================
   PULLUK — app.js
   Google Drive API integration, theme, search,
   filtering, scroll reveal, mobile menu
   ============================================= */

'use strict';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  // Your Google Drive folder ID (extracted from the URL)
  DRIVE_FOLDER_ID: '11AeW1GWpmhOk28Xt-AD65e6eH12Bk4t8',

  // Paste your Google Cloud API Key here to enable live Drive integration.
  // Leave empty to use demo/mock data.
  // Instructions: https://console.cloud.google.com/ → APIs & Services → Credentials → Create API Key
  // Enable: "Google Drive API" for the key.
  GOOGLE_API_KEY: 'AIzaSyD1aCCMa-7dGRxOT3IS19CToJcRfrfF_Vs',

  // Number of PDF cards to show per page
  PAGE_SIZE: 9,
};

// ─── STATE ─────────────────────────────────────────────────────────────────
const state = {
  allFiles: [],
  filteredFiles: [],
  visibleCount: CONFIG.PAGE_SIZE,
  currentPage: 1,
  currentFilter: 'all',
  searchQuery: '',
  activeSection: 'stamps', // which collection section is open in gallery
};

// ─── MOCK DATA (shown when no API key is configured) ───────────────────────
function generateMockFiles() {
  const categories = ['Türkiye', 'Avrupa', 'Asya', 'Amerika', 'Afrika', 'Nadir', 'Tematik'];
  const themes = ['Doğa', 'Mimari', 'Spor', 'Sanat', 'Ulaşım', 'Tarih', 'Flora', 'Fauna'];
  const files = [];

  for (let i = 1; i <= 120; i++) {
    const cat = categories[i % categories.length];
    const theme = themes[i % themes.length];
    const year = 1950 + Math.floor(Math.random() * 73);
    files.push({
      id: `mock_${i}`,
      name: `${cat} - ${theme} ${year} No.${String(i).padStart(4, '0')}.pdf`,
      category: cat,
      webViewLink: `https://drive.google.com/drive/folders/${CONFIG.DRIVE_FOLDER_ID}`,
      isMock: true,
    });
  }
  return files;
}

// ─── GOOGLE DRIVE API ──────────────────────────────────────────────────────
async function fetchDriveFiles() {
  const apiKey = CONFIG.GOOGLE_API_KEY.trim();
  if (!apiKey) {
    console.info('[PULLUK] No API key configured — using demo data.');
    return generateMockFiles();
  }

  // Hide the notice banner when API key is present
  document.getElementById('apiNotice').classList.add('is-hidden');

  const baseUrl = 'https://www.googleapis.com/drive/v3/files';
  let allFiles = [];
  let pageToken = null;

  try {
    do {
      const params = new URLSearchParams({
        // List ALL files (PDF, HTML, or any format) that are not trashed
        q: `'${CONFIG.DRIVE_FOLDER_ID}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, size, description)',
        pageSize: 100,
        key: apiKey,
        orderBy: 'name',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`${baseUrl}?${params}`);
      if (!res.ok) throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
      const data = await res.json();

      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return allFiles;
  } catch (err) {
    console.error('[PULLUK] Drive API fetch failed:', err);
    // Fallback to mock data
    showError(`Google Drive bağlantısı kurulamadı: ${err.message}. Demo veriler gösteriliyor.`);
    return generateMockFiles();
  }
}

function showError(msg) {
  const notice = document.getElementById('apiNotice');
  notice.classList.remove('is-hidden');
  notice.querySelector('.api-notice-text').innerHTML = `<b>⚠️ Bağlantı Hatası</b>${msg}`;
}

// ─── RENDER FUNCTIONS ──────────────────────────────────────────────────────
const BG_CLASSES = ['pdf-bg-1', 'pdf-bg-2', 'pdf-bg-3', 'pdf-bg-4', 'pdf-bg-5', 'pdf-bg-6'];

// Returns an appropriate icon and label based on MIME type
function getFileType(mimeType, name) {
  if (!mimeType) mimeType = '';
  if (mimeType === 'application/pdf' || name.endsWith('.pdf')) return { icon: '📄', label: 'PDF' };
  if (mimeType === 'text/html' || name.endsWith('.html')) return { icon: '🌐', label: 'HTML' };
  if (mimeType.startsWith('image/')) return { icon: '🖼️', label: 'Görsel' };
  if (mimeType === 'application/vnd.google-apps.document') return { icon: '📝', label: 'Doküman' };
  if (mimeType === 'application/vnd.google-apps.folder') return { icon: '📁', label: 'Klasör' };
  return { icon: '🗒️', label: 'Dosya' };
}

const previewQueue = [];
let isPreviewProcessing = false;

// HTML içeriğinden H1 Başlığı, Alt Başlığı, Fotoğraf ve Kod çıkaran fonksiyon
function extractStampInfoFromHtml(html) {
  if (!html) return { title: '', subtitle: '', image: '', code: '' };
  
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const subMatch = html.match(/class=["'][^"']*subtitle[^"']*["'][^>]*>([\s\S]*?)<\//i);
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const codeMatch = html.match(/class=["'][^"']*collection-number[^"']*["'][^>]*>([\s\S]*?)<\//i) || html.match(/<title[^>]*>([^—–-]+)/i);
  
  let title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
  let subtitle = subMatch ? subMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  let image = imgMatch ? imgMatch[1].trim() : '';
  let code = codeMatch ? codeMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  
  // Koleksiyon adı ve dosya kodlarını temizle
  title = title.replace(/MERT GÜVENTÜRK KOLEKSİYONU/gi, '')
               .replace(/MG\s*\d+/gi, '')
               .replace(/^(?:no[:.]?\s*\d+|[\s\d\-.:|•]+)+/gi, '')
               .trim();
               
  subtitle = subtitle.replace(/MERT GÜVENTÜRK KOLEKSİYONU/gi, '')
                     .replace(/MG\s*\d+/gi, '')
                     .trim();

  return { title, subtitle, image, code };
}

// ─── CACHE HELPERS ─────────────────────────────────────────────────────────
function getFileFromCache(file) {
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
  } catch(e) { console.warn('[PULLUK] Cache read error', e); }
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
      _htmlContent: file._htmlContent
    };
    localStorage.setItem('pulluk_file_' + file.id, JSON.stringify(data));
  } catch(e) { 
    console.warn('[PULLUK] Cache write error (possibly full)', e); 
    // Ignore, localStorage might be full.
  }
}

async function processPreviewQueue() {
  if (isPreviewProcessing || previewQueue.length === 0) return;
  isPreviewProcessing = true;
  
  while (previewQueue.length > 0) {
    const item = previewQueue.shift();
    if (!item) continue;
    const { file, titleEl, subEl, imgEl, fallbackEl, codeEl, card } = item;
    const apiKey = CONFIG.GOOGLE_API_KEY.trim();
    
    if (file._title) {
      if (titleEl) titleEl.textContent = file._title;
      if (subEl) subEl.textContent = file._subtitle || '';
      if (codeEl && file._code) {
        codeEl.textContent = file._code;
        codeEl.style.display = 'inline-block';
      }
      if (imgEl && file._image) {
        imgEl.src = file._image;
        imgEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
      }
      if (card) {
        card.setAttribute('aria-label', `${file._title} — görüntüle`);
        card.dataset.name = (file._title || file.name).toLowerCase();
      }
      continue;
    }
    
    // Try loading from cache first
    if (!file._title && getFileFromCache(file)) {
      if (titleEl) titleEl.textContent = file._title;
      if (subEl) subEl.textContent = file._subtitle || '';
      if (codeEl && file._code) {
        codeEl.textContent = file._code;
        codeEl.style.display = 'inline-block';
      }
      if (imgEl && file._image) {
        imgEl.src = file._image;
        imgEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
      }
      if (card) {
        card.setAttribute('aria-label', `${file._title} — görüntüle`);
        card.dataset.name = (file._title || file.name).toLowerCase();
        if (file.category) card.dataset.category = file.category.toLowerCase();
      }
      continue;
    }
    
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
      if (res.ok) {
        const html = await res.text();
        const { title, subtitle, image, code } = extractStampInfoFromHtml(html);
        
        file._title = title || file.name.replace(/\.(html|htm|pdf)$/i, '');
        file._subtitle = subtitle;
        file._image = image;
        file._code = code;
        file._htmlContent = html; // Gelecekte viewer için önbelleğe al
        
        saveFileToCache(file);
        
        if (titleEl) titleEl.textContent = file._title;
        if (subEl) subEl.textContent = file._subtitle || '';
        if (codeEl && file._code) {
          codeEl.textContent = file._code;
          codeEl.style.display = 'inline-block';
        }
        if (imgEl && file._image) {
          imgEl.src = file._image;
          imgEl.style.display = 'block';
          if (fallbackEl) fallbackEl.style.display = 'none';
        }
        if (card) {
          card.setAttribute('aria-label', `${file._title} — görüntüle`);
          card.dataset.name = (file._title || file.name).toLowerCase();
          
          // Yeni çekilen veriden yılı bul ve kategoriyi güncelle
          const yearMatch = (file._title + ' ' + file._subtitle).match(/\b(18|19|20)\d{2}\b/);
          if (yearMatch) {
            file.category = yearMatch[0];
            card.dataset.category = file.category.toLowerCase();
            // Yeni bir yıl bulunduysa filtre butonlarını güncellemek gerekebilir
            // (Basitlik için mevcut filtreleri yeniden oluşturuyoruz)
            updateFilterButtonsDynamically();
          }
        }
      } else {
        if (titleEl) titleEl.textContent = file.name.replace(/\.(html|htm|pdf)$/i, '');
      }
    } catch (err) {
      console.warn('[PULLUK] Preview extraction error for', file.name, err);
      if (titleEl) titleEl.textContent = file.name.replace(/\.(html|htm|pdf)$/i, '');
    }
    
    // İstekler arası yumuşak geçiş
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isPreviewProcessing = false;
}

function createPdfCard(file, index) {
  const bgClass = BG_CLASSES[index % BG_CLASSES.length];
  const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
  const { icon, label } = getFileType(file.mimeType, file.name);

  const initialTitle = file._title || (file.isMock ? file.name.replace(/\.(pdf|html|htm)$/i, '') : 'İçerik yükleniyor...');
  const initialSub = file._subtitle || (file.category || '');
  const hasImage = Boolean(file._image);
  const code = file._code || '';

  const card = document.createElement('div');
  card.className = 'pdf-card reveal';
  card.style.cursor = 'pointer';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${file._title || file.name || 'Pul'} — görüntüle`);
  card.dataset.name = (file._title || file.name).toLowerCase();
  card.dataset.category = (file.category || '').toLowerCase();
  card.dataset.fileId = file.id || '';
  card.dataset.viewUrl = viewUrl;
  card.dataset.mimeType = file.mimeType || '';
  if (file.isMock) card.dataset.mock = '1';

  card.innerHTML = `
    <div class="pdf-card-thumb">
      <div class="pdf-icon-frame ${bgClass}">
        <img class="pdf-icon-img card-img-el" src="${hasImage ? file._image : ''}" alt="${initialTitle}" ${hasImage ? '' : 'style="display:none;"'} />
        <span class="pdf-icon-fallback card-fallback-el" ${hasImage ? 'style="display:none;"' : ''} aria-hidden="true">${icon}</span>
      </div>
    </div>
    <div class="pdf-card-main">
      <div class="pdf-card-badges">
        <span class="pdf-code-badge card-code-el" ${code ? '' : 'style="display:none;"'}>${code}</span>
        <span class="pdf-ext-badge">${label}</span>
      </div>
      <div class="pdf-name card-title-el">${initialTitle}</div>
      <div class="pdf-meta card-sub-el">${initialSub}</div>
    </div>
    <div class="pdf-card-action">
      <span class="pdf-open-btn" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    </div>
  `;

  const titleEl = card.querySelector('.card-title-el');
  const subEl = card.querySelector('.card-sub-el');
  const imgEl = card.querySelector('.card-img-el');
  const fallbackEl = card.querySelector('.card-fallback-el');
  const codeEl = card.querySelector('.card-code-el');

  // Önbellekte yoksa ve HTML ise kuyruğa ekle
  if (!file.isMock && (!file._title || !file._image) && (file.mimeType === 'text/html' || file.name.endsWith('.html'))) {
    if (CONFIG.GOOGLE_API_KEY.trim()) {
      previewQueue.push({ file, titleEl, subEl, imgEl, fallbackEl, codeEl, card });
      processPreviewQueue();
    }
  }

  const openCard = () => {
    if (file.isMock) {
      window.open(`https://drive.google.com/drive/folders/${CONFIG.DRIVE_FOLDER_ID}`, '_blank', 'noopener,noreferrer');
    } else {
      openViewer(file._title || 'Pul Detayı', file.id, viewUrl, file.mimeType);
    }
  };
  card.addEventListener('click', openCard);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); }
  });

  return card;
}

function renderGallery() {
  const grid = document.getElementById('pdfGrid');
  const loadingEl = document.getElementById('galleryLoading');
  const emptyEl = document.getElementById('galleryEmpty');
  const metaEl = document.getElementById('galleryMeta');

  // Clear existing cards
  Array.from(grid.querySelectorAll('.pdf-card')).forEach(c => c.remove());
  loadingEl.style.display = 'none';
  emptyEl.classList.remove('is-visible');

  if (state.filteredFiles.length === 0) {
    emptyEl.classList.add('is-visible');
    metaEl.innerHTML = `<span>0</span> sonuç bulundu`;
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(state.filteredFiles.length / CONFIG.PAGE_SIZE);
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIndex = (state.currentPage - 1) * CONFIG.PAGE_SIZE;
  const endIndex = startIndex + CONFIG.PAGE_SIZE;
  const slice = state.filteredFiles.slice(startIndex, endIndex);

  // Insert cards
  slice.forEach((file, i) => {
    const card = createPdfCard(file, startIndex + i);
    grid.appendChild(card);
  });

  const displayingEnd = Math.min(endIndex, state.filteredFiles.length);
  metaEl.innerHTML = `<span>${startIndex + 1}-${displayingEnd}</span> / ${state.filteredFiles.length} dosya gösteriliyor`;

  // Re-run reveal observer on new cards
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '❮';
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderGallery();
    }
  });
  container.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === state.currentPage ? ' is-active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      if (state.currentPage !== i) {
        state.currentPage = i;
        renderGallery();
      }
    });
    container.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '❯';
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderGallery();
    }
  });
  container.appendChild(nextBtn);
}

// ─── FILTERING & SEARCH ────────────────────────────────────────────────────
function applyFilters() {
  const q = state.searchQuery.toLowerCase();
  const cat = state.currentFilter;

  state.filteredFiles = state.allFiles.filter(file => {
    const nameMatch = (file._title || '').toLowerCase().includes(q) ||
                      (file._subtitle || '').toLowerCase().includes(q) ||
                      (file._code || '').toLowerCase().includes(q) ||
                      file.name.toLowerCase().includes(q);
    const catMatch = cat === 'all' || (file.category || '').toLowerCase() === cat;
    return nameMatch && catMatch;
  });

  state.currentPage = 1;
  renderGallery();
}

// ─── VIEWER MODAL ──────────────────────────────────────────────────────────
let viewerOpen = false;
let currentBlobUrl = null;
let currentFileHtml = null;  // Ham HTML içeriği — print için saklanır

async function openViewer(title, fileId, viewUrl, mimeType) {
  const modal    = document.getElementById('viewerModal');
  const frame    = document.getElementById('viewerFrame');
  const titleEl  = document.getElementById('viewerTitle');
  const loading  = document.getElementById('viewerLoading');

  const cachedFile = state.allFiles.find(f => f.id === fileId);
  const displayTitle = (cachedFile && cachedFile._title) || title || 'Pul Detayı';

  // Show modal immediately with loading state
  titleEl.textContent = displayTitle;
  loading.classList.remove('is-hidden');
  frame.src = '';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  viewerOpen = true;

  const apiKey = CONFIG.GOOGLE_API_KEY.trim();
  let content = cachedFile && cachedFile._htmlContent;
  let loaded = false;
  
  const isHtml = (mimeType === 'text/html' || (cachedFile && cachedFile.name.endsWith('.html')));

  // Strategy 1: Try cached or fetched HTML content via alt=media
  if (!content && apiKey && fileId && isHtml) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`
      );
      if (res.ok) {
        content = await res.text();
        if (cachedFile) {
          cachedFile._htmlContent = content;
          saveFileToCache(cachedFile);
        }
      } else {
        console.warn(`[PULLUK] alt=media fetch failed with status: ${res.status}`);
      }
    } catch (err) {
      console.warn('[PULLUK] alt=media fetch failed:', err.message);
    }
  }

  if (content) {
    // Render fetched HTML via blob URL
    currentFileHtml = content;
    const mime = mimeType || 'text/html';
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    const blob = new Blob([content], { type: mime });
    currentBlobUrl = URL.createObjectURL(blob);
    frame.onload = () => loading.classList.add('is-hidden');
    frame.src = currentBlobUrl;
    loaded = true;
  }

  // Strategy 2: Fallback to Google Drive's native embed/preview URL
  // NEVER use this for HTML files, as Drive shows HTML source code instead of rendering it
  if (!loaded && fileId && !isHtml) {
    console.info('[PULLUK] Using Google Drive embed fallback for', fileId);
    currentFileHtml = null;
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    frame.onload = () => loading.classList.add('is-hidden');
    frame.src = embedUrl;
    loaded = true;
  }

  // Strategy 3: Last resort — use webViewLink directly
  if (!loaded) {
    currentFileHtml = null;
    loading.classList.add('is-hidden');
    frame.srcdoc = `<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#aaa;flex-direction:column;gap:12px;background:#0B132B}</style>
      <p>&#9888; Dosya içeriği yüklenemedi. Ağ hatası veya kota aşımı olabilir.</p>
      <a href="${viewUrl}" target="_blank" style="color:#4FC3F7">Google Drive'da Aç</a>`;
  }
}

function closeViewer() {
  const modal = document.getElementById('viewerModal');
  const frame = document.getElementById('viewerFrame');
  frame.src = '';
  frame.removeAttribute('srcdoc');
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
  currentFileHtml = null;
  modal.hidden = true;
  document.body.style.overflow = '';
  viewerOpen = false;
}

function initViewer() {
  document.getElementById('viewerClose').addEventListener('click', closeViewer);
  document.getElementById('viewerBackdrop').addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && viewerOpen) closeViewer();
  });

  // PDF kaydet — HTML'e CSS enjekte edip yeni pencerede yazdır
  document.getElementById('viewerSaveBtn').addEventListener('click', () => {
    if (!currentFileHtml) {
      alert('Henüz dosya yüklenmedi, lütfen bekleyin.');
      return;
    }

    const printCSS = `
      <style id="pulluk-print">
        @page { margin: 0; size: auto; }
        html {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          background: #0B132B !important;
          color: #F1F4F9 !important;
          margin: 0 !important;
        }
        /* Tüm elementlerin arka planını koru */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Buton, nav, footer gizle */
        button, nav, footer, .no-print,
        input[type="button"], input[type="submit"] {
          display: none !important;
        }
        /* Sayfa tasmanı engelle */
        * {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      </style>
      <script>
        window.addEventListener('load', function() {
          // İçerik yüksekliğine göre zoom hesapla
          var h = document.body.scrollHeight || 1122;
          var pageH = 1056;
          var zoom = Math.min(1, pageH / h);
          document.documentElement.style.zoom = zoom;
          setTimeout(function() { window.print(); window.close(); }, 400);
        });
      <\/script>
    `;

    // Print CSS'i HTML'e göm
    const html = currentFileHtml.includes('</head>')
      ? currentFileHtml.replace('</head>', printCSS + '</head>')
      : printCSS + currentFileHtml;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank', 'width=900,height=700');
    if (!win) {
      alert('Pop-up engelleyici aktif olabilir. Lütfen bu site için pop-up\'lara izin verin.');
    }
    // URL'yi temizle
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
}


// ─── SCROLL REVEAL ─────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

function initReveal() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ─── THEME ─────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('pulluk_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pulluk_theme', next);
}

// ─── COLLECTION TABS (for gallery section) ─────────────────────────────────
function initCollectionTabs() {
  const tabs = document.querySelectorAll('[data-collection-tab]');
  const panels = document.querySelectorAll('[data-collection-panel]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.collectionTab;

      tabs.forEach(t => t.classList.remove('is-active'));
      panels.forEach(p => p.hidden = true);

      tab.classList.add('is-active');
      const panel = document.querySelector(`[data-collection-panel="${target}"]`);
      if (panel) panel.hidden = false;
    });
  });
}

// ─── SMOOTH SCROLL ─────────────────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '66');
      const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile menu if open
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ─── MOBILE NAV ────────────────────────────────────────────────────────────
let navLinks, navToggle;

function initMobileNav() {
  navLinks = document.getElementById('navLinks');
  navToggle = document.getElementById('navToggle');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (navLinks.classList.contains('is-open') &&
      !navLinks.contains(e.target) &&
      !navToggle.contains(e.target)) {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

// ─── COLLECTION CARDS CLICK (scroll to gallery) ────────────────────────────
function initCollectionCardLinks() {
  document.querySelectorAll('[data-scroll-to]').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = el.dataset.scrollTo;
      const target = document.getElementById(targetId);
      if (!target) return;
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target || el.textContent);
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(eased * target);
    el.textContent = value.toLocaleString('tr-TR') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCounters() {
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));
}

// ─── CATEGORIES FROM FILE NAMES / CONTENT ──────────────────────────────────
function extractCategories(files) {
  const catSet = new Set();
  files.forEach(file => {
    // Yılı title, subtitle veya dosya adından bul
    const textToSearch = (file._title || '') + ' ' + (file._subtitle || '') + ' ' + file.name;
    const yearMatch = textToSearch.match(/\b(18|19|20)\d{2}\b/);
    if (yearMatch) {
      file.category = yearMatch[0]; // Örn: "1974"
      catSet.add(file.category);
    } else {
      file.category = '';
    }
  });
  // Yılları küçükten büyüğe sırala
  return Array.from(catSet).sort((a, b) => parseInt(a) - parseInt(b));
}

function updateFilterButtonsDynamically() {
  const categories = extractCategories(state.allFiles);
  buildFilterButtons(categories);
}

function buildFilterButtons(categories) {
  const filterRow = document.getElementById('filterRow');
  
  // Mevcut dinamik butonları temizle (TÜMÜ kalacak)
  Array.from(filterRow.querySelectorAll('.filter-btn')).forEach(btn => {
    if (btn.dataset.filter !== 'all') {
      btn.remove();
    }
  });

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat.toLowerCase();
    btn.textContent = cat;
    // Eğer şu an seçili olan filtre buysa aktif yap
    if (state.currentFilter === cat.toLowerCase()) {
      btn.classList.add('is-active');
    }
    filterRow.appendChild(btn);
  });
}

// ─── MAIN INIT ─────────────────────────────────────────────────────────────
async function init() {
  // Theme (early init)
  initTheme();

  // Viewer modal
  initViewer();

  // Mobile nav
  initMobileNav();

  // Smooth scroll
  initSmoothScroll();

  // Collection card click links
  initCollectionCardLinks();

  // Collection tabs
  initCollectionTabs();

  // Reveal observer (for static elements)
  initReveal();

  // Animated counters
  initCounters();

  // Theme toggle button
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);

  // ── Gallery: Search ──
  const searchBox = document.getElementById('searchBox');
  searchBox.addEventListener('input', () => {
    state.searchQuery = searchBox.value;
    applyFilters();
  });


  // ── Load Drive files ──
  const loadingEl = document.getElementById('galleryLoading');
  loadingEl.style.display = 'flex';

  const files = await fetchDriveFiles();
  state.allFiles = files;

  // Event delegation on the row (yalnızca 1 kere eklenmeli)
  const filterRow = document.getElementById('filterRow');
  if (!filterRow.hasAttribute('data-events-bound')) {
    filterRow.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.currentFilter = btn.dataset.filter;
      applyFilters();
    });
    filterRow.setAttribute('data-events-bound', 'true');
  }

  // Cache'den verileri ön yükleme yap ki yılları hemen bulabilelim
  files.forEach(file => getFileFromCache(file));

  // Extract & apply categories for filter buttons
  const categories = extractCategories(files);
  buildFilterButtons(categories);

  state.filteredFiles = [...state.allFiles];
  renderGallery();

  // Update dynamic counter in hero
  const liveCounter = document.getElementById('liveFileCount');
  if (liveCounter) {
    liveCounter.dataset.target = files.length;
    animateCounter(liveCounter);
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
