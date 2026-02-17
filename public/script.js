// --- KONFIGURASI API BARU ---
const API_PROXY = "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=";
const API_BASE = "https://www.sankavollerei.com/comic/softkomik";
const BACKEND_URL = window.location.origin;

// Element References
const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

// State Variables
let currentChapterList = [];
let currentComicContext = { slug: null, title: null, image: null };
let isNavigating = false;

/* ---------------- Helpers ---------------- */

// Generate UUID untuk menyembunyikan Slug Asli
async function getUuidFromSlug(slug, type) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type })
    });
    const data = await res.json();
    return data.uuid;
  } catch (e) {
    console.warn("Gagal mendapatkan UUID, menggunakan slug asli:", e);
    return slug;
  }
}

// Decode UUID kembali ke Slug Asli
async function getSlugFromUuid(uuid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// Update URL Browser
function updateURL(path) {
  if (window.location.pathname !== path) history.pushState(null, null, path);
}

// Menentukan Warna Badge Berdasarkan Tipe Komik
function getTypeClass(type) {
  if (!type) return 'type-default';
  const t = String(type).toLowerCase();
  if (t.includes('manga')) return 'type-manga';
  if (t.includes('manhwa')) return 'type-manhwa';
  if (t.includes('manhua')) return 'type-manhua';
  return 'type-default';
}

function redirectTo404() {
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500">Error 404: Halaman tidak ditemukan.</div>`;
}

// --- FUNGSI FETCH UTAMA YANG DIPERBAIKI ---
async function fetchAPI(endpoint) {
  try {
    // Construct Full URL untuk Proxy
    const targetUrl = API_BASE + endpoint;
    const proxyUrl = API_PROXY + encodeURIComponent(targetUrl);
    
    console.log("Fetching:", targetUrl); // Debugging

    const response = await fetch(proxyUrl);
    const json = await response.json();

    // API Proxy Vercel mengembalikan struktur: 
    // { result: { content: { ...SoftkomikJSON... } } }
    if (json.success && json.result && json.result.content) {
       return json.result.content;
    }
    
    console.error("Format JSON tidak dikenali:", json);
    return null;
  } catch (e) {
    console.error("Fetch Error:", e);
    return null;
  }
}

function toggleFilter() {
  filterPanel.classList.toggle('hidden');
}

function resetNavs() {
  mainNav.classList.remove('-translate-y-full');
  mobileNav.classList.remove('translate-y-full');
  filterPanel.classList.add('hidden');
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function setLoading() {
  contentArea.innerHTML = `
    <div class="flex flex-col items-center justify-center py-40 gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500 border-r-2 border-transparent"></div>
      <p class="text-xs text-gray-500 animate-pulse">Memuat Komik...</p>
    </div>`;
}

function lockNav() {
  isNavigating = true;
  setProgress(0);
}

function unlockNav() {
  isNavigating = false;
}

function setProgress(percent) {
  if (!progressBar) return;
  const p = Math.max(0, Math.min(100, percent));
  progressBar.style.width = `${p}%`;
}

function bindReaderProgress() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) return setProgress(0);
    const percent = (scrollTop / scrollHeight) * 100;
    setProgress(percent);
  };
  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------- Fitur Static (Karena endpoint Genre hilang) ---------------- */
// Genre list manual karena endpoint genre tidak tersedia di dokumentasi baru
function populateStaticGenres() {
  const select = document.getElementById('filter-genre');
  // Genre umum
  const genres = [
    {slug: "action", title: "Action"}, {slug: "adventure", title: "Adventure"}, 
    {slug: "comedy", title: "Comedy"}, {slug: "drama", title: "Drama"}, 
    {slug: "fantasy", title: "Fantasy"}, {slug: "isekai", title: "Isekai"},
    {slug: "romance", title: "Romance"}, {slug: "sci-fi", title: "Sci-Fi"},
    {slug: "slice-of-life", title: "Slice of Life"}, {slug: "horror", title: "Horror"}
  ];
  
  if(select.options.length <= 1) {
    genres.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.slug;
        opt.text = g.title;
        select.appendChild(opt);
    });
  }
}

/* ---------------- Tampilan Home ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const result = await fetchAPI(`/home`);
  
  // Handling data home structure: result.data.trending & result.data.latest
  if (!result || !result.success || !result.data) { 
    contentArea.innerHTML = `<div class="text-center py-20">Gagal memuat Home. Coba refresh.</div>`; 
    return; 
  }

  const trending = result.data.trending || [];
  const latest = result.data.latest || [];

  contentArea.innerHTML = `
    <!-- Trending Slider -->
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Sedang Trending
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${trending.map(item => `
          <div class="min-w-[140px] md:min-w-[180px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
            <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Hot'}</span>
            <img src="${item.image}" loading="lazy" class="h-60 md:h-72 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-xs md:text-sm font-bold truncate text-white drop-shadow-md">${item.title}</h3>
              <p class="text-amber-400 text-[10px] font-bold mt-1">${item.latestChapter}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Latest Update Grid -->
    <div>
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          ${latest.map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group card-hover"
                onclick="showDetail('${item.slug}')">
              <div class="relative overflow-hidden aspect-[3/4]">
                <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto">${item.type || 'UP'}</span>
                <img src="${item.image}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
              </div>
              <div class="p-3">
                <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed group-hover:text-amber-500 transition">${item.title}</h3>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                  <span class="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-bold">${item.latestChapter}</span>
                  <!-- Visitor tidak ada di data terbaru, hilangkan atau ganti icon lain -->
                  <span class="text-[10px] text-gray-600"><i class="fa fa-clock"></i> New</span> 
                </div>
              </div>
            </div>
          `).join('')}
        </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Tampilan List (Ongoing / Completed / Filter) ---------------- */

async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs();
  setLoading();
  // API: /ongoing?page=1 -> return { data: { latestUpdates: [], pagination: {} } }
  const result = await fetchAPI(`/ongoing?page=${page}`);
  
  if (result && result.data && result.data.latestUpdates) {
      // Mapping untuk standardisasi renderGrid
      const standardData = {
          data: result.data.latestUpdates,
          pagination: result.data.pagination
      };
      renderGrid(standardData, "Komik Ongoing", "showOngoing");
  } else {
      redirectTo404();
  }
}

async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs();
  setLoading();
  // API: /completed?page=1 -> return { data: [], pagination: {} } (Data langsung array)
  const result = await fetchAPI(`/completed?page=${page}`);
  
  if (result && Array.isArray(result.data)) {
       // Struktur completed sedikit berbeda (data langsung array)
       const standardData = {
          data: result.data,
          pagination: result.pagination
      };
      renderGrid(standardData, "Komik Tamat", "showCompleted");
  } else {
      redirectTo404();
  }
}

// Logic untuk Filter Type (Manga/Manhwa/Manhua)
async function showType(type, page = 1) {
    resetNavs();
    setLoading();
    // API: /type/:type?page=1
    const result = await fetchAPI(`/type/${type}?page=${page}`);
    if (result && Array.isArray(result.data)) {
        renderGrid(result, `Kategori: ${type.toUpperCase()}`, "showType", type);
    } else {
        redirectTo404();
    }
}


/* ---------------- Advanced Filter & Search ---------------- */

async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value;
  const type = document.getElementById('filter-type').value;
  // const genre = document.getElementById('filter-genre').value; // API genre blm supported sepenuhnya

  filterPanel.classList.add('hidden');
  setLoading();

  // Prioritas: Jika ada Query -> Search API
  if (query) {
    // API: /search?q={text}
    const result = await fetchAPI(`/search?q=${encodeURIComponent(query)}`);
    if (result && Array.isArray(result.data)) {
        renderGrid({ data: result.data }, `Hasil Pencarian: "${query}"`, null); // Search biasanya return array semua tanpa pagination explicit di contoh
    } else {
        contentArea.innerHTML = `<div class="text-center py-20">Komik tidak ditemukan.</div>`;
    }
    return;
  }

  // Jika Type filter dipilih
  if (type) {
      showType(type, 1);
      return;
  }
  
  // Default fallback
  showHome(false);
}

// Render Data ke Grid
function renderGrid(dataObj, title, funcName, extraArg = null) {
  const list = dataObj.data || [];
  
  if (list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-folder-open text-4xl opacity-50"></i>
        <p>Tidak ada data ditampilkan.</p>
      </div>`;
    return;
  }

  // Handle Pagination UI
  let paginationHTML = '';
  if (dataObj.pagination && funcName) {
    const current = parseInt(dataObj.pagination.currentPage);
    // Jika tidak ada 'hasNext', kita asumsi true kalau bukan halaman terakhir (logika kasar)
    const hasNext = dataObj.pagination.hasNext !== undefined ? dataObj.pagination.hasNext : (current < dataObj.pagination.maxPage);
    
    const argStr = extraArg ? `'${extraArg}', ` : ''; // passing type arguments
    
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition"><i class="fa fa-chevron-left"></i> Prev</button>` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold shadow-lg">${current}</span>
        ${hasNext ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">Next <i class="fa fa-chevron-right"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
            <p class="text-[10px] text-amber-500 mt-1 font-medium">${item.latestChapter || item.chapter || 'Baca'}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Halaman Detail Komik ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  // Handle UUID Reverse Lookup jika input adalah UUID
  if (idOrSlug.length === 36 && idOrSlug.includes('-')) {
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }

  // Push State UUID
  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  
  // API: /detail/${slug}
  const result = await fetchAPI(`/detail/${slug}`);
  if (!result || !result.success || !result.data) { redirectTo404(); return; }

  const res = result.data;
  currentChapterList = res.chapters || [];
  currentComicContext = { slug: res.slug, title: res.title, image: res.image };

  // Cek Riwayat Baca Terakhir
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === res.slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  // Karena chapter list mungkin berurutan 0 (terbaru) -> End (terlama), kita ambil yg terakhir di array sbg 'first'
  const firstCh = (res.chapters && res.chapters.length > 0) ? res.chapters[res.chapters.length - 1].slug : null;
  
  // Logic Tombol Mulai Baca
  const startBtnText = lastCh ? "Lanjut Baca" : "Mulai Baca";
  const startBtnTarget = lastCh || firstCh;
  const startBtnAction = startBtnTarget 
    ? `readChapter('${startBtnTarget}', '${res.slug}')` 
    : "alert('Chapter belum tersedia')";

  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 via-[#0b0b0f]/80 to-[#0b0b0f]"></div>
    </div>
  `;

  // Safe Text Processing
  const synopsisText = res.synopsis || "Sinopsis tidak tersedia.";
  const isLongSynopsis = synopsisText.length > 250;
  // API Rating kadang object {average:1}, kadang angka.
  const ratingVal = typeof res.rating === 'object' ? res.rating.average : (res.rating || '-');

  contentArea.innerHTML = `
    ${backdropHTML}

    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">
      
      <!-- Left: Cover & Actions -->
      <div class="md:w-[260px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group">
          <span class="type-badge ${getTypeClass(res.type)} scale-110 top-4 left-4 shadow-lg">${res.type || 'Comic'}</span>
          <img src="${res.image}" referrerpolicy="no-referrer" class="w-full rounded-2xl shadow-2xl border border-white/10 group-hover:border-amber-500/30 transition duration-500">
        </div>

        <div class="flex flex-col gap-3 mt-6">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-book-open"></i> ${startBtnText}
          </button>
          <button onclick="toggleBookmark('${res.slug}', '${String(res.title).replace(/'/g, "")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 rounded-xl glass font-semibold border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fa fa-bookmark"></i> Simpan
          </button>
        </div>
      </div>

      <!-- Right: Info -->
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl md:text-4xl font-extrabold mb-4 leading-tight text-white">${res.title}</h1>

        <div class="flex flex-wrap gap-3 mb-6">
          <div class="glass px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold text-amber-400 border border-amber-500/20">
            <i class="fa fa-star"></i> ${ratingVal}
          </div>
          <div class="glass px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-bold text-green-400 border border-green-500/20">
            <i class="fa fa-circle text-[6px]"></i> ${res.status}
          </div>
           <!-- Alternative Titles -->
           ${res.alternativeTitle ? 
             `<div class="glass px-3 py-1 rounded-lg text-[10px] text-gray-400 border border-white/10 truncate max-w-xs" title="${res.alternativeTitle}">
                ${res.alternativeTitle}
              </div>` : ''
           }
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          ${res.genres ? res.genres.map(g => `
            <span class="cursor-default text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">
              ${g}
            </span>`).join('') : '<span class="text-xs text-gray-600">No Genre Info</span>'}
        </div>

        <!-- Synopsis -->
        <div class="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 backdrop-blur-sm">
          <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase tracking-wide">Sinopsis</h3>
          <p id="synopsis-text" class="text-gray-300 text-sm leading-relaxed text-justify ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
            <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 text-xs font-bold mt-2 hover:text-white transition flex items-center gap-1">
              Baca Selengkapnya <i class="fa fa-chevron-down"></i>
            </button>` : ''}
        </div>

        <!-- Chapter List -->
        <div class="glass rounded-2xl border border-white/10 overflow-hidden">
          <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <i class="fa fa-list-ul text-amber-500"></i> Chapter
              <span class="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">${res.chapters?.length || 0}</span>
            </h3>
            <div class="relative w-full sm:w-auto group">
              <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
              <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari Chapter..."
                class="w-full sm:w-64 bg-black/30 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-amber-500 transition text-white">
            </div>
          </div>

          <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto chapter-list-scroll p-2 bg-black/20"></div>
        </div>
      </div>
    </div>
  `;

  renderChapterList(res.chapters || [], res.slug);
  checkBookmarkStatus(res.slug);
  // Simpan data dasar ke history agar thumbnail ada
  saveHistory(res.slug, res.title, res.image);
  window.scrollTo(0, 0);
}

function toggleSynopsis() {
  const txt = document.getElementById('synopsis-text');
  const btn = document.getElementById('synopsis-btn');
  if (!txt || !btn) return;
  if (txt.classList.contains('line-clamp-4')) {
    txt.classList.remove('line-clamp-4');
    btn.innerHTML = `Tutup <i class="fa fa-chevron-up"></i>`;
  } else {
    txt.classList.add('line-clamp-4');
    btn.innerHTML = `Baca Selengkapnya <i class="fa fa-chevron-down"></i>`;
  }
}

function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  // Riwayat local untuk menandai chapter yang sudah dibaca
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-gray-500 text-sm">Tidak ada chapter.</div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    // API kadang mengembalikan ch.slug atau kita harus compose. 
    // Tapi di response softkomik di user prompt: {title: "Chapter 001", chapter: "001", slug: "001"} ?? 
    // WARNING: Di list detail, slug chapter kadang cuma angkanya. 
    // Tapi di endpoint /chapter/ butuh "parent-slug/chapter-slug". 
    // Mari cek contoh response di endpoint read chapter user: ".../chapter/chapter-001/..." 
    // User provide sample API detail: slug: "001".
    // Kita harus panggil endpoint chapter dengan benar. Jika list slugnya "001", 
    // API read butuh slug lengkap atau API logic kita handle combinasi parent+slug? 
    // Biasanya softkomik URL structure: /chapter/{parent_slug}/{chapter_slug}.
    // Namun proxy call detail chapter yang dikasih user: endpointnya ".../chapter/{chapter_full_slug_or_id}". 
    // Untuk keamanan, saya asumsikan ch.slug yang dikasih di list chapter bisa langsung dipanggil ATAU digabung.
    // Berdasarkan request: "readChapter automatically get images". 
    // Saya gunakan parameter ch.slug dari list.
    
    // Perbaikan LOGIC SLUG:
    // Detail Response ch: { slug: "001", ... }
    // Chapter Read URL sample: .../chapter/title-slug-indonesia/001
    // Jadi kita harus pass kombinasi: `parentSlug/${ch.slug}` KE fungsi readChapter.
    
    const fullChapterSlug = `${comicSlug}/${ch.slug}`; 
    const isLastRead = fullChapterSlug === lastReadSlug || ch.slug === lastReadSlug; 
    
    return `
      <div onclick="safeReadChapter('${fullChapterSlug}', '${comicSlug}')"
        class="chapter-item group flex items-center justify-between p-3 mb-1 rounded-xl cursor-pointer border border-transparent transition-all duration-200
        ${isLastRead ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 hover:bg-white/10 hover:border-amber-500/30'}">

        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-gray-400 group-hover:text-amber-500 group-hover:bg-amber-500/10 transition shrink-0">
            <i class="fa ${isLastRead ? 'fa-history' : 'fa-hashtag'} text-xs"></i>
          </div>
          <span class="text-sm font-medium truncate group-hover:text-amber-500 transition ${isLastRead ? 'text-amber-500' : 'text-gray-300'}">
            ${ch.title}
          </span>
        </div>
        <div class="text-[10px] text-gray-500 bg-black/20 px-2 py-1 rounded group-hover:bg-amber-500 group-hover:text-black transition font-bold shrink-0">
          Baca
        </div>
      </div>
    `;
  }).join('');
}

function safeReadChapter(chFullSlug, comicSlug) {
  if (isNavigating) return;
  readChapter(chFullSlug, comicSlug, true);
}

function filterChapters() {
  const input = document.getElementById('chapter-search');
  const filter = (input?.value || '').toLowerCase();
  const container = document.getElementById('chapter-list-container');
  const items = container.getElementsByClassName('chapter-item');
  for (let i = 0; i < items.length; i++) {
    const span = items[i].getElementsByTagName("span")[0];
    const txtValue = span.textContent || span.innerText;
    items[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? "" : "none";
  }
}

/* ---------------- Reader (Baca Komik) ---------------- */

async function readChapter(chSlugParam, comicSlug = null, push = true) {
  if (isNavigating) return;
  lockNav();
  setLoading();

  try {
    let targetSlug = chSlugParam;
    
    // UUID Reverse Lookup for Chapter (Jika param UUID)
    if (chSlugParam.length === 36 && !chSlugParam.includes('/')) {
        const mapping = await getSlugFromUuid(chSlugParam);
        if (mapping) targetSlug = mapping.slug;
    }

    if (push) {
      // UUID mask creation for URL (cleaner look)
      const uuid = await getUuidFromSlug(targetSlug, 'chapter');
      updateURL(`/chapter/${uuid}`);
    }

    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');

    // API: /chapter/parent-slug/001  <-- Kita expect targetSlug sudah berformat ini dari renderChapterList
    const result = await fetchAPI(`/chapter/${targetSlug}`);
    if (!result || !result.success || !result.data) { redirectTo404(); return; }

    const res = result.data;
    
    // Coba detect comicSlug yang benar jika param null
    let parentSlug = comicSlug; 
    // Softkomik api result biasanya mengandung info 'slug' yg berupa parentSlug atau kombinasi.
    // Kita pakai yang di param jika ada.
    if (!parentSlug) {
       // Coba extract dari URL kalau kepepet: url.split/ ...
       // Atau asumsi user datang dari Detail, comicContext ada
       if(currentComicContext.slug) parentSlug = currentComicContext.slug;
    }

    // Judul & Gambar
    const comicTitle = res.comicTitle || currentComicContext.title || "Unknown Title";
    const headerTitle = `${comicTitle} - ${res.title}`;
    
    const backAction = parentSlug ? `showDetail('${parentSlug}')` : `showHome()`;

    // Dropdown Logic
    let dropdownHTML = `<div id="dropdown-placeholder" class="text-[10px] text-gray-500">Memuat list...</div>`;
    // Kalau list chapter kosong (langsung masuk URL), fetch dulu list-nya di background untuk populate dropdown
    if (parentSlug && (!currentChapterList || currentChapterList.length === 0)) {
        fetchAndPopulateDropdown(parentSlug, targetSlug); // Async
    } else if (currentChapterList.length > 0) {
        // Cari slug 'pure' dari targetSlug (misal: "comic-x/001" -> "001")
        const currentShortSlug = targetSlug.split('/').pop(); 
        dropdownHTML = generateDropdownHTML(currentChapterList, currentShortSlug, parentSlug);
    }

    // Navigation Logic
    // API Result mengandung res.prev dan res.next (bisa null) -> usually returns Full URL or short slug? 
    // Di contoh user: "prev": null, "next": null (mungkin chapter 1).
    // Asumsikan null = disable button.
    // Jika tidak null, pastikan formatnya (softkomik suka kasih full url atau relative).
    // Untuk aman: Kita cari index current chapter di currentChapterList lalu ambil prev/next.
    // KARENA API res.prev/next sering tidak konsisten.
    
    // Kita manipulasi navigasi MANUAL berdasarkan List jika API nav kosong
    let prevSlug = res.prev; // Nullable
    let nextSlug = res.next; // Nullable
    
    // Logic fallback navigasi array
    if(currentChapterList.length > 0) {
        const currentShortSlug = targetSlug.split('/').pop();
        const currentIndex = currentChapterList.findIndex(c => c.slug == currentShortSlug);
        // Chapter list biasanya urutan DESC (Chapter 10, 9, 8). 
        // Maka Next Chapter adalah Index - 1 (Chapter 9). Prev adalah Index + 1.
        if (currentIndex !== -1) {
             if (currentIndex < currentChapterList.length - 1) {
                 prevSlug = `${parentSlug}/${currentChapterList[currentIndex+1].slug}`; // Prev logic: Old chapter
             }
             if (currentIndex > 0) {
                 nextSlug = `${parentSlug}/${currentChapterList[currentIndex-1].slug}`; // Next logic: New chapter
             }
        }
    }
    
    contentArea.innerHTML = `
      <div class="relative min-h-screen bg-[#0b0b0f] -mx-4 -mt-24">

        <!-- Reader Header -->
        <div id="reader-top" class="reader-ui fixed top-0 w-full bg-gradient-to-b from-black/90 to-transparent z-[60] p-4 flex justify-between items-center transition-all duration-300">
          <div class="flex items-center gap-3">
            <button onclick="${backAction}" class="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-amber-500 hover:text-black transition text-white">
              <i class="fa fa-arrow-left"></i>
            </button>
            <div class="flex flex-col drop-shadow-md min-w-0">
              <span class="text-[9px] text-amber-500 uppercase tracking-widest font-bold">Reading</span>
              <h2 class="text-xs font-bold text-white max-w-[200px] md:max-w-md truncate">${headerTitle}</h2>
            </div>
          </div>
          <button onclick="toggleFullScreen()" class="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/20 transition text-white">
            <i class="fa fa-expand text-xs"></i>
          </button>
        </div>

        <!-- Images Container -->
        <div id="reader-images" class="flex flex-col items-center pt-0 pb-0 min-h-screen w-full max-w-4xl mx-auto bg-[#111]" onclick="toggleReaderUI()">
        </div>

        <!-- Reader Footer / Nav -->
        <div id="reader-bottom" class="reader-ui fixed bottom-6 left-0 w-full z-[60] px-4 flex justify-center transition-all duration-300">
          <div class="glass p-2 rounded-2xl flex gap-1 items-center shadow-2xl border border-white/10 bg-black/80 backdrop-blur-xl">
            <!-- Tombol Previous (Chapter Lama) -->
            <button id="btn-prev"
              onclick="${prevSlug ? `readChapter('${prevSlug}', '${parentSlug}')` : ''}"
              class="w-10 h-10 flex items-center justify-center rounded-xl ${!prevSlug ? 'opacity-30 cursor-not-allowed text-gray-500' : 'hover:bg-amber-500 hover:text-black transition text-white'}" ${!prevSlug?'disabled':''}>
              <i class="fa fa-chevron-left"></i>
            </button>

            <div id="chapter-dropdown-container">
              ${dropdownHTML}
            </div>

            <!-- Tombol Next (Chapter Baru) -->
            <button id="btn-next"
              onclick="${nextSlug ? `readChapter('${nextSlug}', '${parentSlug}')` : ''}"
              class="w-10 h-10 flex items-center justify-center rounded-xl ${!nextSlug ? 'opacity-30 cursor-not-allowed text-gray-500' : 'amber-gradient text-black hover:scale-105 transition shadow-lg shadow-amber-500/20'}" ${!nextSlug?'disabled':''}>
              <i class="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Render Images
    const imageContainer = document.getElementById('reader-images');
    const imgs = res.images || [];

    let loadedCount = 0;
    const total = Math.max(1, imgs.length);
    setProgress(10);

    imgs.forEach((imgUrl) => {
      const wrapper = document.createElement('div');
      wrapper.className = "w-full relative min-h-[400px] bg-[#1a1a1a]"; // Placeholder height
      
      const img = new Image();
      img.src = imgUrl;
      img.className = "comic-page opacity-0 transition-opacity duration-500 relative z-20";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer"; // Critical for bypassing hotlink protection

      img.onload = () => {
        loadedCount++;
        img.classList.remove('opacity-0');
        wrapper.style.minHeight = "auto";
        wrapper.style.backgroundColor = "transparent";
        setProgress(10 + (loadedCount / total) * 70);
      };

      img.onerror = () => {
        loadedCount++;
        wrapper.innerHTML = `
          <div class="flex flex-col items-center justify-center py-20 bg-zinc-900 text-gray-500 gap-3 border-y border-red-900/30 w-full text-center">
             <i class="fa fa-image text-red-500/50 text-2xl"></i>
             <span class="text-xs">Gambar Gagal Dimuat</span>
             <button onclick="const i=document.createElement('img');i.src='${imgUrl}';i.referrerPolicy='no-referrer';i.className='comic-page';this.parentElement.replaceWith(i)" class="text-[10px] underline">Reload</button>
          </div>`;
        setProgress(10 + (loadedCount / total) * 70);
      };

      wrapper.appendChild(img);
      imageContainer.appendChild(wrapper);
    });

    // Save History
    if (parentSlug) {
      // Simpan slug chapter sebagai "parent/chapter" agar saat diklik di history langsung masuk readChapter
      saveHistory(parentSlug, currentComicContext?.title, currentComicContext?.image, targetSlug, res.title);
    }
    
    setProgress(100);
    window.scrollTo(0, 0);
    bindReaderProgress();

  } catch (e) {
    console.error("Read Error:", e);
    contentArea.innerHTML = `<div class="py-40 text-center text-red-400">Terjadi kesalahan saat memuat chapter.<br><button onclick="location.reload()" class="mt-4 px-4 py-2 glass rounded-lg text-xs">Refresh</button></div>`;
  } finally {
    unlockNav();
  }
}

// Logic Navigasi Dropdown Chapter
function generateDropdownHTML(list, currentShortSlug, parentSlug) {
  return `
    <div class="relative group mx-2">
      <select onchange="safeReadChapter('${parentSlug}/' + this.value, '${parentSlug}')"
        class="appearance-none bg-black/50 backdrop-blur text-white border border-white/10 rounded-xl text-xs py-2.5 pl-3 pr-8 focus:outline-none focus:border-amber-500 cursor-pointer hover:bg-white/10 transition w-32 md:w-auto truncate max-w-[150px]">
        ${list.map(ch => {
            // Slug di list kadang string "001"
            const isSelected = ch.slug === currentShortSlug; 
            return `<option value="${ch.slug}" ${isSelected ? 'selected' : ''}>${ch.title}</option>`;
        }).join('')}
      </select>
      <i class="fa fa-chevron-up absolute right-3 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-gray-400"></i>
    </div>
  `;
}

async function fetchAndPopulateDropdown(parentSlug, currentTargetSlug) {
    // Helper background process jika user langsung buka chapter url
    const result = await fetchAPI(`/detail/${parentSlug}`);
    if (result && result.success && result.data) {
        currentChapterList = result.data.chapters || [];
        currentComicContext = { slug: parentSlug, title: result.data.title, image: result.data.image };
        const container = document.getElementById('chapter-dropdown-container');
        if (container && currentChapterList.length > 0) {
            const shortSlug = currentTargetSlug.split('/').pop();
            container.innerHTML = generateDropdownHTML(currentChapterList, shortSlug, parentSlug);
            
            // Re-render footer buttons if logic allows
            // (Kompleks untuk di-rerender live, biarkan user manual navigasi jika via deep link)
        }
    }
}

function toggleReaderUI() {
  const top = document.getElementById('reader-top');
  const bottom = document.getElementById('reader-bottom');
  if (!top || !bottom) return;
  top.classList.toggle('ui-hidden-top');
  bottom.classList.toggle('ui-hidden-bottom');
}

/* ---------------- System Functions (Search/History/Bookmark) ---------------- */

function handleSearch(e) { if (e.key === 'Enter') applyAdvancedFilter(); }

// Save History (Max 50)
function saveHistory(slug, title, image, chSlug, chTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  
  // Clean duplikat lama
  history = history.filter(h => h.slug !== slug);
  
  const data = {
    slug,
    title: title || 'Loading...',
    image: image || 'assets/icon.png',
    lastChapterSlug: chSlug || null,
    lastChapterTitle: chTitle || null,
    timestamp: new Date().getTime()
  };

  history.unshift(data);
  if (history.length > 50) history.pop();
  localStorage.setItem('fmc_history', JSON.stringify(history));
}

function showHistory() {
  updateURL('/history'); resetNavs();
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  if(history.length === 0) {
      contentArea.innerHTML = `<div class="text-center py-40 text-gray-500">Belum ada riwayat baca.</div>`;
      return;
  }
  
  // Manual Grid Render untuk history (karena structure field agak beda -> map ke standard)
  const mappedData = history.map(h => ({
      slug: h.slug,
      title: h.title,
      image: h.image,
      type: 'History', 
      latestChapter: h.lastChapterTitle || 'Belum Dibaca'
  }));
  
  renderGrid({ data: mappedData }, "Riwayat Bacaan Anda", null);
}

// Bookmarks
function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  
  if (idx > -1) {
    bookmarks.splice(idx, 1);
  } else {
    bookmarks.push({ slug, title, image, type: 'Saved' });
  }
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;

  if (bookmarks.some(b => b.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-check text-amber-500"></i> Tersimpan`;
    btn.classList.add('border-amber-500/50', 'bg-amber-500/10');
    btn.classList.remove('glass');
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark"></i> Simpan`;
    btn.classList.remove('border-amber-500/50', 'bg-amber-500/10');
    btn.classList.add('glass');
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  renderGrid({ data: bookmarks }, "Koleksi Tersimpan", null);
}

/* ---------------- Init Application ---------------- */

async function handleInitialLoad() {
  const path = window.location.pathname;
  resetNavs();
  
  populateStaticGenres();

  if (path === '/404.html') return;

  // UUID Detection -> Show Series
  if (path.startsWith('/series/')) {
    const uuid = path.split('/')[2];
    if (uuid) showDetail(uuid, false);
    else showHome(false);
  }
  // UUID Detection -> Read Chapter
  else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/')[2];
    if (uuid) readChapter(uuid, null, false);
    else showHome(false);
  }
  else if (path === '/ongoing') showOngoing(1);
  else if (path === '/completed') showCompleted(1);
  else if (path === '/history') showHistory();
  else if (path === '/bookmarks') showBookmarks();
  else showHome(false); // Default route
}

// Handle Browser Back Button
window.addEventListener('popstate', () => handleInitialLoad());

document.addEventListener('DOMContentLoaded', handleInitialLoad);
