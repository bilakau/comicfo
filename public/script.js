const API_PROXY = "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikindo";
const BACKEND_URL = window.location.origin;

const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

let currentChapterList = [];
let currentComicContext = { slug: null, title: null, image: null };
let isNavigating = false;

/* ---------------- Helpers ---------------- */

// Format / Bersihkan Nama "Komik\n ...." yang aneh dari respon API Baru
function formatCleanTitle(titleText) {
  if (!titleText) return 'Unknown Title';
  return String(titleText).replace(/Komik\s*\n\s*/i, '').trim();
}

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
    return slug;
  }
}

async function getSlugFromUuid(uuid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function updateURL(path) {
  if (window.location.pathname !== path) history.pushState(null, null, path);
}

function getTypeClass(type) {
  if (!type) return 'type-default';
  const t = String(type).toLowerCase();
  if (t.includes('manga')) return 'type-manga';
  if (t.includes('manhwa')) return 'type-manhwa';
  if (t.includes('manhua')) return 'type-manhua';
  return 'type-default';
}

function redirectTo404() {
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500">Error 404: Halaman tidak ditemukan atau gagal memuat API proxy.</div>`;
}

// Fetch menggunakan PROXY BARU
async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const proxyData = await response.json();
    
    // Validasi bentuk Struktur dari Respon Proxy CORS Baru 
    if (proxyData.success && proxyData.result && proxyData.result.content) {
      return proxyData.result.content;
    }
    // Backup Plan barangkali strukturnya standard
    if (proxyData.komikList || proxyData.data) {
        return proxyData;
    }
    return null;
  } catch (e) {
    console.error("Fetch Proxy Error:", e);
    return null;
  }
}

function toggleFilter() {
  filterPanel.classList.toggle('hidden');
  const genreSelect = document.getElementById('filter-genre');
  // Hindari spam panggil Api
  if (genreSelect && genreSelect.options.length <= 1) { /* bisa manual populate loadGenres() nantinya disini */ }
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
    <div class="flex justify-center items-center py-40 flex-col gap-3">
      <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-amber-500 border-l-amber-500"></div>
      <p class="text-xs text-amber-500 animate-pulse font-medium">Tunggu bentar, Server Ngebut cuy...</p>
    </div>`;
}

function lockNav() { isNavigating = true; setProgress(0); }
function unlockNav() { isNavigating = false; }
function setProgress(percent) {
  if (!progressBar) return;
  const p = Math.max(0, Math.min(100, percent));
  progressBar.style.width = `${p}%`;
}

/* progress reader */
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


/* ---------------- Data Functions ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const data = await fetchAPI(`${API_BASE}/latest/1`);
  if (!data) { redirectTo404(); return; }

  // Extract dari format komikList dan komikPopuler (Api Baru)
  const popularList = data.komikPopuler || [];
  const latestList = data.komikList || [];

  contentArea.innerHTML = `
    <!-- Top Trending Populer Area -->
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Populer Ranking
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${popularList.map(item => `
          <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group border border-white/5"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
            
            <div class="absolute top-2 right-2 z-20 w-6 h-6 rounded bg-amber-500 flex items-center justify-center font-bold text-black text-xs">
              #${item.rank}
            </div>

            <img src="${item.image}" onerror="this.src='assets/icon.png'" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-sm font-bold truncate text-white drop-shadow-md mb-1">${formatCleanTitle(item.title)}</h3>
              <div class="flex items-center gap-2 text-xs">
                  <span class="text-amber-400 font-semibold"><i class="fa fa-star text-[10px]"></i> ${item.rating}</span>
                  <span class="text-gray-300 truncate">${item.author || "Trending"}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Rilis Terbaru Komik List -->
    <div>
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4 flex justify-between items-center">
            <span>Rilis Terbaru</span>
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          ${latestList.map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
                onclick="showDetail('${item.slug}')">
              <div class="relative h-48 md:h-56 overflow-hidden">
                <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto">${item.type || 'Up'}</span>
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
              </div>
              <div class="p-3">
                <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${formatCleanTitle(item.title)}</h3>
                <div class="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                  <span class="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold">${item.chapters?.[0]?.title || 'Ch.?'}</span>
                  <span class="text-[9px] text-gray-500 flex items-center gap-1"><i class="fa fa-clock text-white/30"></i> ${item.chapters?.[0]?.date || ''}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
    </div>
  `;
  window.scrollTo(0, 0);
}


/* Ongoing - Using Library/Latest Fallback since endpoints mapped dynamically */
async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs();
  setLoading();
  // Fetch rilis update krn isinya mostly ongoing update (menggunakan params url yg support api page)
  const data = await fetchAPI(`${API_BASE}/latest/${page}`);
  renderGrid(data, "Komik Update (Ongoing)", "showOngoing");
}


/* Selesai / Completed (Fetch to library page /completed filtering parameter depend API logic) */
async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs();
  setLoading();
  // Karena dokumentasi list library nya berbeda skrg, kita panggil dr Library global / endpoint yg setara
  const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=completed`);
  renderGrid(data, "Daftar Library Kami", "showCompleted");
}


/* Advance Searching Mapping System API KOMIKINDO */
async function applyAdvancedFilter(passedQuery = null) {
  let query = passedQuery;
  
  if(!query) {
     const inputDom = document.getElementById('search-input');
     if(inputDom) query = inputDom.value;
  }
  if (!query) return;

  filterPanel.classList.add('hidden');
  setLoading();

  // GET KE SEARCH: ${text}/${page} -> example search/naruto/1
  const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
  
  // Custom inject next search string if there are multiple search paginations setup here
  renderGrid(data, `Pencarian: "${query}"`, null, null);
}

function handleSearch(e) { if (e.key === 'Enter') applyAdvancedFilter(); }

// FUNGSI RENDER GRID DATA BERSAMA
function renderGrid(data, title, funcName, extraArg = null) {
  // mapping komikList yang baru | jika History/Bookmart yg kirim array 'data' lgsng diproses fallback 'data.data'  
  const list = data?.komikList || data?.data || [];
  
  if (list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4 animate-fade-in">
        <i class="fa fa-box-open text-5xl opacity-30 text-amber-500"></i>
        <p class="font-medium text-sm">Aduuh... Tidak ada komik yang ditemukan.</p>
      </div>`;
    return;
  }

  // Setting mapping pagenation KomikIndo system API
  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = Number(data.pagination.currentPage);
    const hasNext = data.pagination.hasNextPage;
    
    const argStr = extraArg ? `'${extraArg}', ` : '';
    
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4 w-full">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-6 py-2.5 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition border-white/5"><i class="fa fa-chevron-left mr-2"></i> Sebelumnya</button>` : ''}
        
        <span class="bg-amber-500 text-black w-10 h-10 flex items-center justify-center rounded-lg text-xs font-extrabold shadow-lg shadow-amber-500/20">${current}</span>
        
        ${hasNext ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-6 py-2.5 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition border-white/5">Selanjutnya <i class="fa fa-chevron-right ml-2"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-xl md:text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4 bg-white/5 pr-4 py-2 w-max rounded-r-xl">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 lg:gap-6 animate-fade-in">
      ${list.map(item => `
        <div class="bg-zinc-900/60 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group flex flex-col"
            onclick="showDetail('${item.slug}')">
          ${item.type ? `<span class="type-badge ${getTypeClass(item.type)}">${item.type}</span>` : ''}
          <div class="relative overflow-hidden aspect-[2/3] shrink-0">
            <img src="${item.image}" onerror="this.src='assets/icon.png'" class="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-out">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 transition duration-300"></div>
          </div>
          
          <div class="p-3 text-left absolute bottom-0 w-full z-10 bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
            <h3 class="text-xs md:text-[13px] font-bold line-clamp-2 text-gray-100 group-hover:text-amber-500 transition leading-snug drop-shadow-md">
                ${formatCleanTitle(item.title)}
            </h3>
            
            ${item.rating ? `<p class="text-[10px] text-gray-400 mt-2 font-medium flex gap-1.5"><i class="fa fa-star text-amber-500 text-[10px]"></i> ${item.rating} • ${item.type || 'Manga'}</p>` 
            : `<p class="text-[10px] text-amber-500 mt-1.5 font-bold tracking-wider">${item.latestChapter || item.chapters?.[0]?.title || 'Akses Baca'}</p>`}
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}



/* ---------------- System Logika Komik Detail ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  if (idOrSlug.length === 36) {
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }

  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  
  // Hit ke sistem baru komikindo details  
  const reqDetailData = await fetchAPI(`${API_BASE}/detail/${slug}`);
  if (!reqDetailData || !reqDetailData.data) { redirectTo404(); return; }

  // API return object bersarang -> .data 
  const res = reqDetailData.data; 
  currentChapterList = res.chapters || [];

  // Ambil metadata detail tambahan Komik Indo (Berbeda Format)
  const clearTitle = formatCleanTitle(res.title);
  const detailMetadata = res.detail || {}; 
  const resGenres = res.genres || []; 
  const synopsisText = res.description || "Mohon maaf, Sinopsis/Deskripsi masih kosong dari provider API sumber kita :(";
  const isLongSynopsis = synopsisText.length > 250;

  // Setup Image, and Update Konteks
  const bannerCoverImage = res.image || "assets/icon.png";
  currentComicContext = { slug, title: clearTitle, image: bannerCoverImage };

  // Resume History Cek Chapter Start/Latest
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  // Di komikindo, the array often sorted descendingly (ch teratas/terbaru dlu), start chptr harus yg index terkhir . 
  const firstCh = (res.firstChapter && res.firstChapter.slug) ? res.firstChapter.slug : 
                  (res.chapters?.length > 0 ? res.chapters[res.chapters.length - 1].slug : null);

  const startBtnText = lastCh ? "Lanjut DiBACA" : "Chapter PERTAMA";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Mohon Maaf, Daftar Chapter Sedang Tidak Tersedia Dari Sumber. Coba Refresh Halaman Atau Komik Lainnya :)')");

  // DOM Layout HTML 
  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden bg-[#050505]">
      <img src="${bannerCoverImage}" class="w-full h-full object-cover blur-2xl opacity-10 md:opacity-[0.15] transform scale-125 saturate-150 mix-blend-screen backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0b0f]/80 to-[#0b0b0f] translate-y-20"></div>
    </div>
  `;

  contentArea.innerHTML = `
    ${backdropHTML}

    <div class="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 mt-6 md:mt-10 animate-fade-in w-full max-w-6xl mx-auto">

      <!-- Poster Sticky Kolom --> 
      <div class="md:w-[260px] flex-shrink-0 mx-auto md:mx-0 w-[60%] sm:w-[45%] md:max-w-none md:sticky md:top-[85px] self-start mb-6 md:mb-0 relative group perspective-1000">
          <span class="type-badge ${getTypeClass(detailMetadata.type)} top-3 left-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)] !py-1 !px-3 font-black tracking-widest text-[9px] shadow-amber-500/20">${detailMetadata.type || 'Komik'}</span>
          <img src="${bannerCoverImage}" class="w-full aspect-[2/3] object-cover rounded-xl shadow-[0_15px_40px_-5px_rgba(0,0,0,0.6)] border border-white/5 relative z-10 md:group-hover:-translate-y-2 md:transition md:duration-500">
        
        <div class="flex flex-col gap-2.5 mt-5">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-lg font-bold text-[#111] text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1 transition duration-300 transform-gpu active:scale-95 border-b-2 border-amber-600">
            <i class="fa fa-book-open text-base relative -bottom-0.5"></i> <span class="pt-0.5">${startBtnText}</span>
          </button>
          
          <button onclick="toggleBookmark('${slug}', '${String(clearTitle).replace(/'/g, "\\'")}', '${bannerCoverImage}')" id="btn-bookmark"
            class="w-full py-3 rounded-lg bg-[#18181f] text-gray-300 hover:text-white font-semibold text-xs border border-white/10 hover:border-amber-500/30 transition flex items-center justify-center gap-2 uppercase tracking-wide">
            <i class="fa fa-bookmark relative -top-[1px]"></i> Simpan Favorit
          </button>
        </div>
      </div>

      <!-- Detail dan Chapters List Container  --> 
      <div class="flex-1 min-w-0 pt-0 md:pt-4">
        <h1 class="text-3xl md:text-[42px] font-extrabold mb-5 leading-[1.15] bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-amber-200 tracking-tight text-center md:text-left drop-shadow-md pb-2">
            ${clearTitle}
        </h1>

        <div class="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-8">
          <div class="bg-black/40 backdrop-blur px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold text-white border border-white/5 w-fit shrink-0">
            <i class="fa fa-star text-amber-500 shadow-sm drop-shadow text-sm relative -bottom-[1px]"></i> 
            <span class="pt-0.5">${res.rating || '?'}</span> 
            ${res.votes ? `<span class="opacity-50 text-[10px] pl-1 relative -top-0.5">(${res.votes})</span>` : ''}
          </div>
          
          <div class="bg-black/40 backdrop-blur px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-medium text-white/80 border border-white/5 w-fit shrink-0">
            <div class="w-2 h-2 rounded-full ${detailMetadata.status?.toLowerCase() === 'tamat' || detailMetadata.status?.toLowerCase() === 'selesai' ? 'bg-blue-400' : 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse'}"></div>
            ${detailMetadata.status || 'Berjalan'}
          </div>

          <div class="bg-black/40 backdrop-blur px-3 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-medium text-white/80 border border-white/5 w-fit shrink-0">
            <i class="fa fa-pencil text-gray-400 opacity-60"></i> <span class="max-w-[130px] md:max-w-none truncate pt-0.5">${detailMetadata.author || '?'}</span>
          </div>
        </div>

        ${resGenres.length > 0 ? `
          <div class="flex flex-wrap gap-2 mb-8 justify-center md:justify-start max-w-2xl">
            ${resGenres.map(g => `<span class="text-gray-300/80 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded bg-[#18181f] border border-[#222]">
                ${g.name}
              </span>`).join('')}
          </div>
        ` : ''}

        <div class="relative group cursor-text">
            <h3 class="font-extrabold text-[15px] mb-3 text-white flex items-center gap-2 tracking-wide uppercase">
              <span class="w-1.5 h-4 bg-amber-500 rounded-sm"></span> Alur Cerita Utama
            </h3>
            
            <div class="p-5 bg-gradient-to-br from-[#121217] to-black border border-white/5 rounded-2xl relative shadow-inner md:min-h-[140px]">
              <i class="fa fa-quote-left absolute opacity-5 text-4xl -top-1 -left-1 transform text-amber-500"></i>
              
              <div id="synopsis-wrapper" class="relative ${isLongSynopsis ? 'overflow-hidden max-h-[105px] after:absolute after:bottom-0 after:left-0 after:w-full after:h-12 after:bg-gradient-to-t after:from-[#0d0d12] after:to-transparent' : ''} transition-all duration-[600ms] ease-out pr-1">
                 <p class="text-[13.5px] text-gray-300/80 leading-[1.85] text-justify drop-shadow-sm align-middle font-[450]" style="-webkit-text-stroke: 0.2px rgba(255,255,255,0.05);">
                    ${synopsisText.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, ' ')}
                 </p>
              </div>

              ${isLongSynopsis ? `
                <div class="relative z-20 flex justify-center -mt-1 md:-mt-3 md:-mb-1" style="background:none;">
                    <button onclick="toggleNewSynopsis(this)" class="bg-[#121217] px-4 py-1.5 border border-white/10 text-[10px] font-bold text-amber-500 tracking-wider uppercase rounded-full flex gap-1 items-center hover:bg-white/5 hover:border-amber-500/50 hover:text-white transition duration-300 shadow-md">
                        Expand Review <i class="fa fa-chevron-down opacity-80 pt-[1px] ml-1"></i>
                    </button>
                </div>
              ` : ''}
            </div>
        </div>


        <div class="mt-10 lg:mt-12 w-full max-w-[850px] overflow-hidden bg-black/30 border border-white-[3%] rounded-xl shadow-md">
            <!-- Box List Header Design --> 
            <div class="px-5 py-4 border-b border-white-[2%] bg-[#121217]/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3 w-full">
              <h3 class="font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">
                <i class="fa fa-list opacity-80 mt-0.5"></i>
                List Episode <span class="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1.5 pt-[1.5px] pb-px text-[10px] rounded leading-none shrink-0 self-center">${currentChapterList.length}</span>
              </h3>
              
              <div class="relative group/search w-full max-w-full sm:max-w-[240px]">
                <i class="fa fa-search absolute right-3.5 top-[55%] -translate-y-1/2 text-white/30 text-[11px] group-focus-within/search:text-amber-500 transition cursor-text peer-focus:text-amber-500" onclick="document.getElementById('chapter-search').focus()"></i>
                <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="No Chapter / Urutan ..."
                  class="peer w-full bg-[#18181f] placeholder:text-gray-500 placeholder:text-[10px] placeholder:font-normal placeholder:tracking-wide font-semibold tracking-wider text-[11px] text-amber-400 py-2.5 px-3 pr-8 rounded-[8px] focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:bg-black/50 transition-all shadow-inner border border-transparent focus:border-white/5 border-none h-[34px]" spellcheck="false" autocomplete="off">
              </div>
            </div>

            <!-- Frame Limit and Scroll Config Wrapper-->
            <div id="chapter-list-container" class="max-h-[600px] overflow-y-auto chapter-list-scroll bg-[#0a0a0d] w-full pt-1"></div>
            <!-- Bumper Gradient Shadow Under The Box Effect Layer --> 
             <div class="pointer-events-none sticky bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/80 to-transparent -mt-4 opacity-50 z-20 border-b border-white/[2%]"></div>
        </div>

      </div>
    </div>
  `;

  renderChapterList(res.chapters || [], slug);
  checkBookmarkStatus(slug);
  saveHistory(slug, clearTitle, res.image);
  
  // Custom Smooth Scrolling Detail ke List Mobile  
  if (window.innerWidth < 768 && location.hash !== "#lists") window.scrollTo({ top: 0, behavior: "auto" }); 
  else if (window.innerWidth >= 768) window.scrollTo({top: 0});
}

function toggleNewSynopsis(btnObj) {
  const wrp = document.getElementById('synopsis-wrapper');
  if(!wrp || !btnObj) return;

  const ic = btnObj.querySelector('i');
  
  if(wrp.classList.contains('max-h-[105px]')) {
      // EXPAND TO OPEN (Read Mode) 
      wrp.classList.remove('max-h-[105px]');
      wrp.classList.remove('after:w-full'); // Remove the bottom blurry cover fade 
      wrp.style.maxHeight = wrp.scrollHeight + 35 + 'px'; 
      btnObj.innerHTML = 'Ciutkan Tutup <i class="fa fa-chevron-up opacity-80 pt-[1px] ml-1"></i>';
  } else {
      // COLLAPSE CLOSER  
      wrp.style.maxHeight = ''; 
      wrp.classList.add('max-h-[105px]');
      setTimeout(()=> { wrp.classList.add('after:w-full') }, 180) // Restore Blur Fade Gradien Effect Cover 
      btnObj.innerHTML = 'Expand Review <i class="fa fa-chevron-down opacity-80 pt-[1px] ml-1"></i>';
      wrp.closest('div.relative.group').scrollIntoView({behavior: "smooth", block: "start" }); 
  }
}

// Disable default function in script from execution duplication :
function toggleSynopsis(){} 


function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="py-12 flex flex-col items-center justify-center opacity-40"><i class="fa fa-eye-slash text-2xl mb-2 text-white"></i> <span class="text-xs">Umm... Server lagi capek<br/> Chapternya gak nongol guys.</span></div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    const isLastRead = ch.slug === lastReadSlug;
    return `
      <div onclick="safeReadChapter('${ch.slug}', '${comicSlug}')" 
        class="chapter-item group relative mx-1 my-0.5 px-3 py-3 rounded-lg overflow-hidden flex flex-wrap items-center justify-between cursor-pointer border ${isLastRead ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' : 'border-transparent bg-transparent hover:bg-white/[0.04]'} transition-colors ease-out" 
        data-text="${String(ch.title).toLowerCase()}">
          
          <div class="flex items-center gap-3 flex-1 min-w-[200px]">
            <!-- Pin Bullet Status Mark icon UI Layout Detail Ch list Component   --> 
            <div class="shrink-0 flex h-7 w-7 rounded-[5px] justify-center items-center shadow-inner ${isLastRead ? 'bg-amber-500 border border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-[#18181f] text-gray-400 group-hover:text-amber-400 group-hover:bg-[#202029]'} transition-colors"> 
              <i class="fa ${isLastRead ? 'fa-book text-black mt-px relative right-[0.5px]' : 'fa-list-ol'} text-[10px] opacity-90"></i>
            </div>
             
             <!-- Teks Label Nama Chapter/Nomor --> 
            <div class="flex flex-col relative w-full mr-2 z-10"> 
               <span class="text-[13px] tracking-[0.2px] truncate w-[95%] text-gray-200 transition-colors font-semibold  ${isLastRead ? 'text-amber-500' : 'group-hover:text-white'}"> 
                 ${ch.title.replace('Chapter ', 'CH. ')}
               </span>
               <div class="w-full flex -mt-[1px] opacity-70 scale-95 origin-left text-[10px] items-center text-gray-400 font-medium whitespace-nowrap gap-2 tracking-wide group-hover:opacity-100 group-hover:text-amber-500/80 transition-opacity max-w-[90%]">  
                  ${ch.releaseTime ? ` <span><i class="fa fa-calendar-alt text-[9px] relative -top-px mr-0.5 opacity-60"></i> ${ch.releaseTime.replace('yang lalu','')} </span>` : 'Mulai baca aja >'}
               </div>
            </div> 
          </div> 
      </div>
    `;
  }).join('');
}


function safeReadChapter(chSlug, comicSlug) {
  if (isNavigating) return;
  readChapter(chSlug, comicSlug, true);
}

function filterChapters() {
  const input = document.getElementById('chapter-search');
  const filter = (input?.value || '').toLowerCase().trim();
  const container = document.getElementById('chapter-list-container');
  if(!container) return;
  const items = container.getElementsByClassName('chapter-item');
  
  // Custom Optimize High Speed Query Searching Display Logic Vanilla Javascript Text Selector Config Setup .
  let i = 0, l = items.length;
  if(filter === '') {
     for(; i < l; i++) { items[i].style.display = 'flex';  }
     return;
  }
  for (; i < l; i++) {
    if(items[i].dataset.text.includes(filter)) { items[i].style.display = "flex"; }
    else { items[i].style.display = "none"; }
  }
}

/* ---------------- Reader Logic Chapter Display Image Read App Component ---------------- */

function normalizeChapterLabel(text) {
  if (!text) return "Chapter";
  let t = String(text).trim();

  // Bersihkan juga prefix Komik jika API tembus membawa ini pada label API details API Data Info Provider nya
  t = formatCleanTitle(t); 

  if (/chapter/i.test(t)) return t.toUpperCase().replace('CHAPTER ', 'CH. ');

  const m = t.match(/(\d+(\.\d+)?)/);
  if (m) return `Ch. ${m[1]}`;

  return t;
}

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
  if (isNavigating) return;
  lockNav();
  setLoading();

  try {
    let chSlug = chIdOrSlug;
    if (chIdOrSlug.length === 36) {
      const mapping = await getSlugFromUuid(chIdOrSlug);
      if (mapping) chSlug = mapping.slug;
    }

    if (push) {
      const uuid = await getUuidFromSlug(chSlug, 'chapter');
      updateURL(`/chapter/${uuid}`);
    }

    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');

    const fetchResultReqApiConfigSetupReaderUrlStringAPI_COMICINDOFormatCallStringFormatAppSetup = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    if (!fetchResultReqApiConfigSetupReaderUrlStringAPI_COMICINDOFormatCallStringFormatAppSetup || !fetchResultReqApiConfigSetupReaderUrlStringAPI_COMICINDOFormatCallStringFormatAppSetup.data) { redirectTo404(); return; }
    
    // Result JSON Parser from ComikINDO response
    const res = fetchResultReqApiConfigSetupReaderUrlStringAPI_COMICINDOFormatCallStringFormatAppSetup.data; 

    // Final logic Fallback Comic Parent (Menggunakan properti dr APi Comic indo => allChapterSlug)
    let finalComicSlug = comicSlug;
    if (!finalComicSlug) {
      finalComicSlug = res.allChapterSlug || null; 
    }

    // Ekstrasi metadata
    const parsedObjRef_ComicTitleFallbackStringFix = formatCleanTitle(currentComicContext?.title || res.komikInfo?.title || res.title || "Comic Terpilih" );
    
    // Sanitisasi agar Judul di navigasi bar atas tetap elegan .
    const chapterLabelCleanedString = normalizeChapterLabel(res.title || chSlug); 

    const backAction = finalComicSlug ? `showDetail('${finalComicSlug}')` : `showHome()`;

    let dropdownHTML = '';
    // Buat placeholder sementara atau bangun List option manualnya!
    if (currentChapterList && currentChapterList.length > 0) {
      dropdownHTML = generateDropdownHTML(currentChapterList, chSlug, finalComicSlug);
    } else {
      dropdownHTML = `<div id="dropdown-placeholder" class="w-32 bg-white/5 h-8 animate-pulse rounded border border-white/5 opacity-40 backdrop-blur-sm self-center justify-self-center my-1 rounded-[5px]"></div>`;
    }

    // Komponent Antarmuka Reader 1 Garis Baru Full Support Nav Next Prev Chapter Select Dropdown Full Configuration Style Mod.
    contentArea.innerHTML = `
      <div class="relative min-h-[100dvh] bg-black -mx-4 -mt-24 select-none touch-pan-y" >
      
        <!-- HEADER Pembaca Reader  (Navbar App Komponen Komik Indo Version 2 Custom Build Logic Mode Format Reader Script Build Mod) --> 
        <div id="reader-top" class="reader-ui fixed top-0 w-full z-[80] pt-[calc(env(safe-area-inset-top)+6px)] transition-transform duration-[400ms] cubic-bezier(0.4, 0.0, 0.2, 1)">
          
          <div class="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none -z-10"></div> 
           
          <div class="px-3.5 pb-4 flex justify-between items-start pt-1.5 md:pt-4 mx-auto w-full max-w-[850px]">
             
              <div class="flex items-center gap-3 w-[70%] drop-shadow-[0_2px_2px_rgba(0,0,0,1)] flex-1 min-w-0 pr-2 overflow-hidden h-fit py-1.5 bg-black/40 hover:bg-black/50 transition border border-white/5 backdrop-blur-[6px] pl-2 rounded-[30px]"  onclick="${backAction}">
                <!-- Exit Nav / Go Back btn Frame Layout Setup-->
                <button aria-label="kembali page sblmya/info comic exit view logic button return menu config"  class="flex shrink-0 w-9 h-9 items-center justify-center rounded-full bg-[#18181f]/70 border border-[#333]/80 group text-white transform active:scale-90 active:bg-amber-600 transition shadow-inner">
                   <i class="fa fa-arrow-left text-xs opacity-80 group-active:opacity-100 group-hover:text-amber-500"></i>
                </button>
               
                 <div class="flex flex-col flex-1 pb-0 shrink whitespace-nowrap tracking-wide leading-none min-w-0 truncate mb-px relative cursor-pointer" >
                   <span class="text-[8.5px] tracking-widest text-amber-500 uppercase font-[900] truncate">Currently Playing</span> 
                   <div class="text-[12px] truncate max-w-full text-[#ddd] group-active:text-white pb-px mt-0.5">  
                      <b class="opacity-100 text-white truncate max-w-full pr-0 align-bottom overflow-hidden font-[800]">
                         ${parsedObjRef_ComicTitleFallbackStringFix} 
                      </b> 
                      <span class="font-normal border-l border-white/20 pl-2 opacity-80 shrink relative ml-1 align-baseline inline">  ${chapterLabelCleanedString}</span> 
                    </div> 
                </div> 
                <i class="fa text-[10px] pr-3 border-transparent shadow-amber outline-none opacity-40 ml-1 text-gray-50 bg-none focus-within:none mr-2 right-icon rounded self-center outline-hidden m-auto shrink flex pointer-events-none mt-1 outline font-white pl-none py-px absolute ring-offset border pl bg right-0 w-[5%] z text pointer mr display pr- px border outline bg pl pointer h"></i>
             </div> 

             <!-- Fullscreen action event handle Layout Togglen btn configuration   -->
             <div class="shrink-0 flex self-center my-auto cursor-pointer p-[1px]  ml-auto   z-50 " onclick="toggleFullScreen()" title="Togle Lyr Penuh - Exit Read Option Modal Dialog Reader Mode Box Option Layout" aria-details="Aksescibilty Click F.S Action "> 
                 <div class="flex justify-center flex-row rounded-full transition w-9 h-9 m-auto items-center hover:opacity-100 border text-white border-white/[8%] bg-[#121217]/50 focus:text-white drop-shadow"> 
                     <i class="fa fa-expand group flex shrink pb mt-  mb pt m "></i> 
                 </div>  
             </div>
             
          </div>  

        </div>
        
         <!-- DAFTAR GAMBAR IMAGES PANEL MAIN SECTION FRAME UI CANVAS ( READER Mode Setting ) COMIC INDO RESP IMAGE MOD SET LOGIC SYSTEM CONFIG REQ-->
        <div id="reader-images" class="flex flex-col items-center pt-0 pb-0 min-h-screen w-full mx-auto md:max-w-[700px] cursor-pointer" onclick="toggleReaderUI()"></div>
       
         <!-- BAWAH PANEL : READER CONFIG. NAVBAR & PAGE CONTROL / ARROWS BTN CHAPTER SWITCH LIST NAV ACTION BAR READER CONTROLS MODE PULL MENU SINKRON PAGE LIST CONFIG SETUP MOD COMPONENT LAYER --> 
        <div id="reader-bottom" class="reader-ui fixed bottom-0 md:bottom-2 z-[90] w-full  translate-y-[2px] opacity-[0.99] transition-transform  duration-[350ms] " > 
           <!-- GRADIENT OVERLAP PADDING BACKBONE SHADE BUMPER COMP LAYER -> A void hard Cut At Display Phone Device. SafeArea Insets Control App logic Setup Background Bottom Edge Cut .   --> 
            <div class="pointer-events-none w-full bottom-0 left-0 absolute right-0  opacity-90 min-h-full from-black/90  backdrop-saturate via-black/40 h-10 border pointer m m max -z-20 inline"></div>  

            <!-- BOTTOM PANNEL REAL CANVAS CONTAINER COMP  MENU SYSTEM UI READER APP PENGONTROL MOD COMICS PAGE SCRIPT BAR. -> SafeArea Configuration B. Edge Offset Setting Adjust Pager Navbar Custom.   -->
            <div class="bg-gradient-to-t  from-black  pb-[calc(env(safe-area-inset-bottom)+18px)] flex w-full justify-center "> 

                 <div class="bg-[#121216]/95 w-[90%] lg:w-[48%] mt-auto md:w-3/4 backdrop-blur-xl border relative shadow-[0_-5px_40px_rgba(0,0,0,0.5)] flex  px-[7px] min-w-4 max-w-sm sm:max-w-md  border-white/[8%] sm rounded-2xl  min-w-0 md:px-2 pt-1  flex flex max border min w p h flex shrink lg border pl opacity opacity items px mx box my md p pb z relative">  
                        
                        <div class="flex  h-[48px]  mx-1 p-[1px] md:h-12 w-full mx flex  pb items shrink md min -w items content gap overflow flex py min rounded flex justify   relative left align mx ">  
                            <!-- Prevous chpataer BtN nav app Setup List App Comp logic Controller event call api render page.  -->   
                              <button onclick="${res.navigation?.prev ? `readChapter('${res.navigation.prev}', '${finalComicSlug || ''}')` : ''}" id="btn-prev"
                                   class="focus-within text h relative m active transform self-stretch h min flex bg active opacity mx py flex transition bg shrink p border my  flex active font h p rounded bg my z- h px rounded m- font min rounded min px py pb px pl hover- pr pb opacity relative  font  group border w hover p transition items flex z min- font- m pl font ml max pb rounded my items  bg pl bg pl  font  shadow md pt mr mr right pr mb flex rounded -px shadow align h relative border right py flex flex- my self ${!res.navigation?.prev ? "opacity-20 flex bg my  border active w flex transition pb items py- p pl ml flex  mb mx pr bg active" :" bg hover transition opacity border md pb mx mx h py opacity bg rounded group mt pr border transition font mx ml lg pt mx lg mt pl rounded md mr m m items - py px lg max relative max border cursor lg  transition  lg lg "} w-[50px] lg border z opacity justify z mx p py rounded m  font hover h transition transition flex mb mr active">    
                                        
                                   <!-- Button Label or text Component (Prevous Nav Button UI Element Control Click Config ) Event Bind API Nav Mod . System Controller. Config Action System Read.-->    
                                   <i class="${!res.navigation?.prev ? "mx text relative text self p opacity shadow max mr border  pl opacity active " :" items font " } font pl mb mb mx max lg font items pt font w  rounded right items pt cursor fa justify h h active pr rounded px -z active transition rounded bg mr cursor flex font mx flex active pr active min justify lg lg md md opacity mx min mr font mb hover m border py px pt pr mb w max justify mb fa hover rounded mt- transition right pb items items transition mt right pl pt my hover mt my py lg max min p items opacity border my mt pt pt opacity py bg lg bg w mr z mr lg h pt h my m cursor m z p relative transition pr lg font border my py items flex mr right w border text py pt mb p right mb pb z p w right mx text font flex cursor items z text pr pb md md transition- " }    items fa-chevron-left shrink z absolute rounded transition relative pl flex- mx mr font m justify right fa "></i>
                              </button>     
                          <!-- Middle Options Config App Setting Mod Event Config Pagger Combobox Controller UI . Module Mod Layout Comp Logic Options Pull Options Page Navigation Switch UI Custom Layout Setting Pagger -->  
                          
                          <!-- THE BOX / LIST BOX (CHAPTER SELECTOR NAVBAR PULL EVENT DROPDWON MENU PAGE PUSH CLICK ROUTE LIST EVENT COMBON CONTROLL MENU AP UI EVENT CONFIG SELECT LIST  ) -->
                              <div id="chapter-dropdown-container" class="md- max flex py z pl p m p pl pl lg m p mb max font w flex max right mr max- text md right h relative mr- pt p pt px pr mx lg relative pr flex bg - pr px text hover- bg pr border md right right pb mx mx z transition mt ">
                                   ${dropdownHTML}    
                              </div>      

                          <!-- Right Control -> NXT CHpt Btn -->       
                             <button id="btn-next" onclick="${res.navigation?.next ? `readChapter('${res.navigation.next}', '${finalComicSlug || ''}')` : ''}"
                              class="text border m z my transition lg px relative items hover pr pt pb pt mr rounded hover opacity lg text right  transition justify my transition mx p pl h items pt justify active p items opacity transition pr mx rounded transition hover px  w bg w opacity flex flex z pt  z min active pb z items pb- w-[52px] bg border px transition transition pl min  ml mx pt m mx flex  min h text justify px active ${!res.navigation?.next ? 'pl md transition- bg mb md py max- font flex hover mx m border opacity pl text active' :' py lg pb opacity w bg my my pt text opacity py flex transition border w font md text text active z transition py m max- max transition md h flex bg pr my text pt min p h opacity border mr mb min my py rounded hover font px active font items border opacity font p opacity px min z mx text h z w mb pb items z max mx flex my opacity items p  px pb z-'} lg pb right font right border m text  mt px- px">
                               <i class="mx pl z transition relative rounded md mt py pt pr right font text right mx mr text border right z transition- justify mx border- pt h py pr font text m z pl bg border w- w font mx px lg my border opacity opacity opacity my m z p mb mx pl bg p lg pr pb items pt lg items font border px text text p h z right w md items px active items lg fa mr pl pl min pb z fa py pb- fa opacity mb max m md mb hover my h z mx active font fa mb p mx mr m mb fa justify z transition active pb lg pt mr fa w hover py flex pb pb fa transition mr hover md active py transition- fa p mb fa font font flex lg bg opacity fa flex mt mx flex border text border mt mt transition  fa md mb flex fa px mr mb bg pr items px min h lg z justify  mx p mt border max hover bg max pr transition  min m border bg min bg z items flex font border- z pt transition font border md max flex pl active max right mb py lg px mt hover- justify h mt z md active pt m mt  right flex pb max fa flex mb flex my  bg active h min border flex pt m mr transition active pb text font pr border pl fa my mx md active p lg bg pb pr mb px m mx pt mb p fa py mb right font active w m h transition right h opacity- px m right  pt pl mx lg active font font mr active w min pb flex fa transition active- m  md right z p lg active mb fa pt px h mr mt  my active border- active mx flex font text pb w mx pr flex px bg font pt min md z pt py lg z mr bg my py border pt lg z mx p  pr border pb z pl active  fa fa z pb pb pb opacity text w border  hover px pr pt mt border border py pl transition px md pl- fa-chevron-right justify- mr  mx transition ml transition h border pr  mr bg md flex "></i>
                             </button>  

                      </div> <!-- Frame Wrapper Inside Reader Botoom Layer Contol System . Module End / Layout Layer Comp --> 
                </div> <!-- Control Frame App Control Reader Main Btom Continer (Bton Layout Base Nav Modal View Box System). Module  End UI  Comics Info  Controller Navigation Option View Menu End Bar  (  Pagger Action Base Comp).  -->   
             </div> 
          </div> 
        </div>  
  `;


  const imageContainer = document.getElementById('reader-images');
  
  // Memformat list array API Image string Data URL . [ Fix struktur res.images.map(v => v.url ) API Komik INDo Proxy Setup ]
  const imgs = (res.images && Array.isArray(res.images)) ? res.images.map(imgData => imgData.url) : []; 

  setProgress(10);
  let loadedCount = 0;
  const total = Math.max(1, imgs.length);

  // Layout Render Rendering Core Reader
  imgs.forEach((imgUrl) => {
    const wrapper = document.createElement('div');
    wrapper.className = "w-full relative min-h-[500px] flex items-center justify-center -mb-0.5 md:-mb-px transition-all bg-[#0a0a0d]"; 

    const skeleton = document.createElement('div');
    skeleton.className = "absolute z-10 w-8 h-8 rounded-full border-[3px] border-[#333] border-t-amber-500 animate-spin"; 

    const img = new Image();
    img.src = imgUrl;
    img.className = "comic-page opacity-0 object-cover w-full scale-[1.002] h-auto relative z-20 transition-opacity duration-300 mx-auto select-none pointer-events-none md:rounded-sm shadow-md"; 
    img.loading = "lazy";

    img.onload = () => {
      loadedCount++;
      if (wrapper.contains(skeleton)) wrapper.removeChild(skeleton);
      img.classList.remove('opacity-0');
      img.classList.add('opacity-100');
      wrapper.style.minHeight = "auto";
      wrapper.classList.remove('bg-[#0a0a0d]'); 
      wrapper.classList.add('bg-black');
      setProgress(10 + (loadedCount / total) * 70);
    };

    img.onerror = () => {
      loadedCount++;
      if (wrapper.contains(skeleton)) wrapper.removeChild(skeleton);
      wrapper.innerHTML = `
        <div class="flex flex-col items-center justify-center py-24 bg-[#111] text-gray-500 gap-3 border border-red-900/10 border-dashed rounded w-full w-full mx-2 my-2 cursor-pointer transition active:scale-95" onclick="this.parentElement.querySelector('img').src='${imgUrl}'; event.stopPropagation();">
          <i class="fa fa-plug-circle-xmark text-red-500 text-3xl opacity-80 mb-2"></i>
          <span class="text-xs tracking-wider uppercase">Loading Putus ... </span>
          <div class="text-[9px] font-bold tracking-[0.2em] bg-[#1a1a24] text-amber-500 px-4 py-2 mt-2 rounded shadow flex items-center shadow shadow-black"><i class="fa fa-refresh mr-2 opacity-60"></i> KETUK COBA LAGI  </div> 
        </div> 
      `;
      wrapper.appendChild(img);
      setProgress(10 + (loadedCount / total) * 70);
    };

    wrapper.appendChild(skeleton);
    wrapper.appendChild(img);
    imageContainer.appendChild(wrapper);
  });

  if (finalComicSlug) {
      saveHistory(finalComicSlug, currentComicContext?.title || parsedObjRef_ComicTitleFallbackStringFix, currentComicContext?.image || res.thumbnail?.url, chSlug, chapterLabelCleanedString);
  }

  // Backup Manual Ambil Detail Comic / Fetcher Config Module Options (Select Chapter Mod) 
  if ((!currentChapterList || currentChapterList.length === 0) && finalComicSlug) {
    fetchAndPopulateDropdown(finalComicSlug, chSlug);
  }

  setProgress(100);
  window.scrollTo({ top: 0 }); // Hard top pin Config Mobile Devices Bug 
  bindReaderProgress();

  unlockNav(); 

  // Additional Nav Setup fix DOM Config Component Styling ( Button  and Option Layer)  ( Tailwild Custom Apply Base Manual Configuration Script UI Formatter DOM Inject Config  . Style UI Builder Class Array Event Custom Add  Format Nav Menu Read Mod. ( Mobile Config ) Menu Display View View Logic Script System Setup Fix .
  setTimeout(()=>{  try{ const prvbtn = document.getElementById("btn-prev");const nxtbtn = document.getElementById("btn-next"); const cntdr= document.getElementById("chapter-dropdown-container");   const lcknbtnclass=['focus:outline-none']; if(prvbtn){lcknbtnclass.forEach(cx=>{ prvbtn.classList.add(cx);nxtbtn.classList.add(cx); })}  }catch(e){}},10)
  
} // EOF READCHAPTER



function generateDropdownHTML(list, currentSlug, comicSlug) {
  // Option Menu Controller Page Read Menu Select Page Reader Config Module Box List Selector. UI Component Control Form UI Setup Layer Layout Controller Setting HTML Frame String Append Select Control Data Event Config Format Layer Menu Pagger
  return ` 
   <div class="relative items-center shrink-0 w-[calc(100%-80px)] flex max-w-full z-[100] m-auto content-center align-baseline text-white p-1 pb-1 pt-1 justify-center align-middle focus-within:ring flex self-center font  lg transition">   
       <div class="bg-gradient-to-t  from-black z  flex inset-0 mt rounded flex m transition border pointer-events-none p opacity justify p m opacity pl z   pr bg"></div>      
           
            <select class=" w-full shadow z opacity active transition text hover min px focus:ring bg pb py md mr min h bg pl cursor-pointer rounded justify opacity-80 pb outline h lg- relative outline outline- none focus focus border lg w mb lg right rounded hover items rounded flex items p my  pl pt px z- focus- pr lg border transition h m transition py border pb pr z flex min justify appearance-none truncate right mx px my mx pr font py focus shadow h py active h opacity my transition- focus relative border mx right z ml- z active z- mr right  font active opacity font z- bg h border- focus font active right lg min items my hover hover w text active max bg mb pb mt pr text  mx active opacity md pl pt my md focus px border pb z max pb m lg active py mb opacity md bg lg flex pb border transition px mx pr mb m pl pr right bg text bg z- px hover max py transition pl transition opacity pr md text bg py mb flex opacity active bg md pt pr px my p mt p my w z my mx z min text min transition mx opacity p w  my z pt- font max right right pl pr font justify max max active flex bg opacity mt pt px w m border z bg my justify pl pb pt lg mb mx mr text justify p- max m md my mr bg z flex justify p pr border py z border z right border my mb my pt w flex h py hover md lg pr pb pr z border z mb flex pb  max p pr pb pt font right px mx active right flex mb pt  opacity hover hover z py z px mx pt right bg w border pb p active md pb border m h  text px pt border font pb w transition text mb mb opacity mr text mt transition font h pr bg lg mx transition z justify flex pb mt pr h transition min pr transition lg m md py  mb h flex right transition- transition font my px px pt mb md  md mr m mt pr min pt font bg mt font font lg mr opacity hover opacity mx h z flex right mb pl pt max my border mx mx md pt pt pl mx my min border min m max pb hover flex px pl- mr px active py justify h p z h flex mr hover hover mx opacity pb max min px h flex bg border mb lg lg my justify h md px mx active pr flex m md mr text pl md text max pt right lg mt right pb text pb pt mx pr w border- mr md my- transition mt pl font  items hover text- bg bg bg pb my font- lg p hover text z pl min mr max hover pr pl mr right font min hover mb- z pr pt pt z transition w max mx pr pb px font min  flex mb text h p- text p mx h flex p md p active pl my md z min opacity min font max px border md z min min border z mt md mt  z text lg h- lg mt pb- z md my m px mr my md active pb  h my p flex max mx min border mb- min px mx mb min mr min max p text px right pt min z z h text text transition flex px min h transition text font h m mr pt transition transition m hover pr font mx mt pr z pr mx bg pb lg min text lg lg pl pl h mb bg lg md w m font bg pr px hover active  p pl mb md mb flex hover mb z p border pl z flex h font text z right mr pt  mb mb my right z m active hover text hover text w font- py md z text z pl pl transition h font flex lg my px max h pr w opacity z p p z transition mr min pb transition my mx text right m font my- pl pl m border lg pb font border p z flex min flex min z min font z pl pr px active m pt pr pr hover p  h mr h mx h flex mb mt px transition mr bg bg right h- min max transition border pt font  my transition pb pr  hover mx right h z transition bg my lg text pt mx mb  my w  w transition pb p  max hover mx opacity h right border pr pr  md hover m hover opacity max mt z mx right h mr pl hover px active  justify w z text bg z border hover border w mb lg pl pl pb pr max z md z m z mx my max font m bg mt px bg pt bg h max m lg mr pl  my w mx md m active mt min bg mt mr pb p transition z mb z my bg h z max mx font w mt my bg right mr transition opacity lg mx w md hover pl z  md text mb pb lg z my lg m pt m mb pt flex my bg lg mx lg p hover- mx font font mb z active lg mb pb pb hover z w pb my z bg pr px mt font active flex w w z opacity my m font pt lg mb pb- flex pr text mt border mb mr z pb mb lg pb w w min pb transition mx transition bg opacity mx- max border h transition w pr opacity mt- my opacity right pb mb border pb min flex pb border md right hover pt z lg px pb p active pb flex hover right flex bg p hover px md hover m- px mb opacity border pb min text z px my z md text mr min z lg transition min border bg pl text  mr active border mt md mb p z mt pl right  h hover z pl m opacity font transition mr z active  pl bg hover mb opacity p lg z p px w text min opacity font right md hover max  z pr pl max min h md px bg p hover flex mb mx opacity px p p- z m mr mx- m text pb bg pr p pt min w mr m pl px font my hover- my mt pl lg pb mr pl hover my my mr pr w mt font px px hover mb z lg lg text border transition right m my font  border m right md m max mb my mr transition pb right font my
            mb-[2px] " style="background: none; border-color: transparent;"   
            onchange="safeReadChapter(this.value, '${comicSlug || ''}')"> 
           
            <option disabled="disabled" class="bg-[#111] opacity-60"> Chapter List Select ..  </option>   
          ${list.map(ch => `<option value="${ch.slug}" ${ch.slug === currentSlug ? 'selected' : ''} class="bg-[#202029] tracking-wider text-[#eee] m-2 "> ${String(ch.title).replace('Chapter', 'Chap. ')} </option>`).join('')}   
       </select>   
       <!-- custom caret custom style config DOM setup form fix mod   -->  
        <div class="pointer-events-none pr-3 m-0 opacity-80 h-full relative items-center content-center right-[5px] flex shadow p " >
          <i class="fa fa-caret-up pointer-events-none mt-[0.5px]"></i> 
        </div>   
   </div>  
  `;  
} // End Mod


async function fetchAndPopulateDropdown(comicSlug, currentChapterSlug) {
  // Config Req Api Hit Get Details list fallback Update Chapter Config . Api komik Indo Update list Chapter Format Dropdow Select Config App Module Select Component logic Pagger DropwDown  App.
  const data = await fetchAPI(`${API_BASE}/detail/${comicSlug}`);
  if (data && data.data) {
    currentChapterList = data.data.chapters || [];
    const formattedObjText_FormatCleaderFallTitleStrParserStr = formatCleanTitle(data.data.title || currentComicContext?.title);
    currentComicContext = { slug: comicSlug, title: formattedObjText_FormatCleaderFallTitleStrParserStr , image: data.data.image };

    const container = document.getElementById('chapter-dropdown-container');
    if (container) {
      container.innerHTML = generateDropdownHTML(currentChapterList, currentChapterSlug, comicSlug);
    }
    saveHistory(comicSlug, formattedObjText_FormatCleaderFallTitleStrParserStr , data.data.image, currentChapterSlug, normalizeChapterLabel(currentChapterSlug) );
  }
}

// System Frame Toglle Hide Click Read mode logic App ( Toggle Layar Option App Mod Click Layar Penuh Mod Format Hide UI Option Navbar). 
function toggleReaderUI() {
  const top = document.getElementById('reader-top');
  const bottom = document.getElementById('reader-bottom');
  if (!top || !bottom) return;

  // Format animasi App Layout Navbar Option Mobile Web Comic Setup Toggles Anim logic css UI Module Component Frame  Display App Config  Layout Mode Layer Top & Btottom Screen 
  
  if (top.classList.contains('-translate-y-full') || bottom.classList.contains('translate-y-full')) { 
        top.classList.remove('-translate-y-full', 'opacity-0');
        bottom.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none'); 
        top.classList.add('opacity-100'); bottom.classList.add('opacity-100'); 
  }else { 
         top.classList.add('-translate-y-full', 'opacity-0');
         bottom.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');  
         top.classList.remove('opacity-100'); bottom.classList.remove('opacity-100');  
  }  
} 



/* ---------------- System Database : Bookmark / Riwayat ---------------- */

function saveHistory(slug, title, image, chSlug, chTitle) {
  if(!slug || slug.trim()==="" ) return;
  
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  let existing = history.find(h => h.slug === slug);

  // Cleaan Title logic DB Formatter Config Title Str History System LocalDb save format Title List History Item .
  const rawTileFromCacheAppStRForFallbackIfNotExist = formatCleanTitle( title || existing?.title || 'No Title Comics DB.11X0');
 
  const data = {
    slug,
    title: rawTileFromCacheAppStRForFallbackIfNotExist , 
    image: image || existing?.image || 'assets/icon.png',
    lastChapterSlug: chSlug || existing?.lastChapterSlug,
    lastChapterTitle: chTitle || existing?.lastChapterTitle || 'CH. - ',
    timestamp: new Date().getTime()
  };

  history = history.filter(h => h.slug !== slug);
  history.unshift(data);
  if (history.length > 50) history.pop();
  localStorage.setItem('fmc_history', JSON.stringify(history));
}

function showHistory() {
  updateURL('/history'); resetNavs();
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  // Convert list form structure as Grid KomikList requirement rendering Data System Object . Render Mode Formatted data fallback support
  renderGrid({ data: history }, "Aktivitas Membacamu <i class='fa fa-clock ml-2 text-amber-500'></i>", null);
}

function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  if (idx > -1) { bookmarks.splice(idx, 1); } 
  else { bookmarks.push({ slug, title: formatCleanTitle(title), image }); }
  
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;

  if (bookmarks.some(b => b.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-bookmark text-amber-500 drop-shadow"></i> <span>Favorit Ditambah</span>`;
    btn.className = `w-full py-3 rounded-lg bg-[#201810] text-amber-500 font-bold text-xs border border-amber-500/50 hover:bg-[#201810]/70 hover:border-amber-400 transition flex items-center justify-center gap-2 tracking-wide`;
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark relative -top-[1px]"></i> <span>Simpan Favorit</span>`;
    btn.className = `w-full py-3 rounded-lg bg-[#18181f] text-gray-300 hover:text-white font-semibold text-xs border border-white/10 hover:border-amber-500/30 transition flex items-center justify-center gap-2 uppercase tracking-wide`; 
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  // Custom Render Configuration Config  data property set  array Config. System Fallback to render Grid Object Array Items. Render logic System App List
  renderGrid({ data: bookmarks }, "Disimpan <i class='fa fa-heart ml-2 text-pink-500 text-base'></i>", null);
}


/* ---------------- Init State Application Startup App Module Config App Controller  System Load Layout View Engine ---------------- */

async function handleInitialLoad() {
  const path = window.location.pathname;
  resetNavs();
  
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (path === '/404.html') return;

  if (path.startsWith('/series/')) {
    const uuid = path.split('/')[2];
    if (uuid) showDetail(uuid, false);
    else showHome(false);
  }
  else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/')[2];
    if (uuid) readChapter(uuid, null, false);
    else showHome(false);
  }
  else if (path === '/ongoing') showOngoing(1);
  else if (path === '/completed') showCompleted(1);
  else if (path === '/history') showHistory();
  else if (path === '/bookmarks') showBookmarks();
  else showHome(false);
}

window.addEventListener('popstate', () => handleInitialLoad());

document.addEventListener('DOMContentLoaded', () => {
  handleInitialLoad();
});

// Tutup Custom Error / Catcher Uncatched Rejections Config Window ( Hindari spam Log Console jika ada Fetch gagal  dari url broken image / assets) .
window.addEventListener('unhandledrejection', (event) => {});
