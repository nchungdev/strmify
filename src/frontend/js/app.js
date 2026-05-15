const el = (id) => document.getElementById(id);
const tmdbUrl = el("tmdbUrl"),
  fetchTmdbBtn = el("fetchTmdbBtn"),
  seriesName = el("seriesName"),
  bulkInput = el("bulkInput");
const storageMode = el("storageMode"),
  remoteConfig = el("remoteConfig"),
  nasStatus = el("nasStatus"),
  sshHost = el("sshHost"),
  sshUser = el("sshUser"),
  sshPassword = el("sshPassword"),
  rememberAuth = el("rememberAuth"),
  disconnectNasBtn = el("disconnectNasBtn"),
  testNasBtn = el("testNasBtn"),
  passwordFieldContainer = el("passwordFieldContainer");
const destPath = el("destPath"),
  browseBtn = el("browseBtn"),
  saveToNasBtn = el("saveToNasBtn"),
  statusEl = el("status"),
  preview = el("preview");
const tvRoot = el("tvRoot"),
  movieRoot = el("movieRoot"),
  browseTvBtn = el("browseTvBtn"),
  testTvBtn = el("testTvBtn"),
  browseMovieBtn = el("browseMovieBtn"),
  testMovieBtn = el("testMovieBtn");
const dirBrowser = el("dirBrowser"),
  browserList = el("browserList"),
  browserPath = el("browserPath"),
  settingsModal = el("settingsModal"),
  serverNameDisplay = el("serverNameDisplay");

// New elements
const tabPipeline = el("tabPipeline"),
  tabManage = el("tabManage"),
  pipelineView = el("pipelineView"),
  manageView = el("manageView"),
  jfMediaList = el("jfMediaList"),
  jfEpisodeList = el("jfEpisodeList"),
  middleTitle = el("middleTitle"),
  aniskipPreview = el("aniskipPreview"),
  saveSegmentsBtn = el("saveSegmentsBtn"),
  refreshJfBtn = el("refreshJfBtn"),
  filterSeries = el("filterSeries"),
  filterMovies = el("filterMovies");

let TMDB_API_KEY = "";
let currentTmdbData = { type: "", seasons: [] },
  currentBrowserPath = "",
  targetInput = null;
const collapsedSeasons = new Set();
let pendingSegments = [];
let allJfItems = [],
  currentJfFilter = "Series";

// --- Initialization ---

window.onload = async () => {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    TMDB_API_KEY = config.TMDB_API_KEY;
  } catch (err) {
    console.error("Failed to load config:", err);
  }

  const lastId = localStorage.getItem("last_server_id"),
    configs = JSON.parse(localStorage.getItem("nas_configs") || "{}");
  if (lastId && configs[lastId]) {
    const cfg = configs[lastId];
    storageMode.value = cfg.mode || "remote";
    if (storageMode.value === "remote") {
      const [u, h] = lastId.split("@");
      sshUser.value = u;
      sshHost.value = h;
    }
  }
  handleStorageModeChange();
  if (storageMode.value === "remote" && sshHost.value && sshUser.value) {
    const cfg = configs[getServerId()];
    if (cfg?.password) setTimeout(testConnection, 500);
  }
  renderPreview();
};

// --- Tab Switching ---

tabPipeline.onclick = () => {
  tabPipeline.classList.add("active");
  tabManage.classList.remove("active");
  pipelineView.style.display = "block";
  manageView.style.display = "none";
};

tabManage.onclick = () => {
  tabManage.classList.add("active");
  tabPipeline.classList.remove("active");
  manageView.style.display = "flex";
  pipelineView.style.display = "none";
  loadJellyfinMedia();
};

// --- Jellyfin & AniSkip Management ---

filterSeries.onclick = () => {
  currentJfFilter = "Series";
  filterSeries.classList.add("active");
  filterMovies.classList.remove("active");
  renderJellyfinMedia();
};

filterMovies.onclick = () => {
  currentJfFilter = "Movie";
  filterMovies.classList.add("active");
  filterSeries.classList.remove("active");
  renderJellyfinMedia();
};

async function loadJellyfinMedia() {
  jfMediaList.innerHTML = "<div style='padding:20px;text-align:center;'>Đang tải...</div>";
  try {
    const res = await fetch("/api/jf-items");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    allJfItems = data.items;
    renderJellyfinMedia();
  } catch (e) {
    jfMediaList.innerHTML = `<div style='padding:20px;color:var(--bad);'>Lỗi: ${e.message}</div>`;
  }
}

function renderJellyfinMedia() {
  jfMediaList.innerHTML = "";
  const filtered = allJfItems.filter((item) => item.Type === currentJfFilter);

  if (filtered.length === 0) {
    jfMediaList.innerHTML = `<div style='padding:20px;text-align:center;color:#999;'>Không có ${currentJfFilter === "Series" ? "phim bộ" : "phim lẻ"} nào.</div>`;
    return;
  }

  filtered.forEach((item) => {
    const d = document.createElement("div");
    d.className = "media-item";
    const year = item.ProductionYear ? `(${item.ProductionYear})` : "";
    d.innerHTML = `
        <span class="title">${item.Name}</span>
        <span class="meta">${item.Type} ${year}</span>
      `;
    d.onclick = () => {
      document.querySelectorAll(".media-item").forEach((i) => i.classList.remove("active"));
      d.classList.add("active");
      
      // Reset UI
      jfEpisodeList.innerHTML = "<div style='padding:20px;text-align:center;'>Đang tải...</div>";
      aniskipPreview.innerHTML = "<div style='text-align: center; color: #999; padding-top: 100px;'>Chọn một tập để xem thông tin Skip</div>";
      saveSegmentsBtn.style.display = "none";
      
      if (item.Type === "Series") {
        loadEpisodes(item);
      } else {
        middleTitle.innerText = "THÔNG TIN PHIM";
        showItemDetails(item);
      }
    };
    jfMediaList.append(d);
  });
}

refreshJfBtn.onclick = loadJellyfinMedia;

async function loadEpisodes(series) {
  middleTitle.innerText = "DANH SÁCH TẬP";
  try {
    const res = await fetch("/api/jf-episodes", {
      method: "POST",
      body: JSON.stringify({ seriesId: series.Id })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    
    jfEpisodeList.innerHTML = "";
    data.items.forEach(ep => {
      const d = document.createElement("div");
      d.className = "media-item";
      d.innerHTML = `
        <span class="title">${ep.Name}</span>
        <span class="meta">Tập ${ep.IndexNumber}</span>
        <div id="segments-curr-${ep.Id}" class="meta" style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;"></div>
      `;
      d.onclick = () => {
        document.querySelectorAll("#jfEpisodeList .media-item").forEach(i => i.classList.remove("active"));
        d.classList.add("active");
        showItemDetails(ep, series);
      };
      jfEpisodeList.append(d);
    });
  } catch (e) {
    jfEpisodeList.innerHTML = `<div style='padding:20px;color:var(--bad);'>Lỗi: ${e.message}</div>`;
  }
}

async function showItemDetails(item, series = null) {
  // If it's a movie, we need to show the "movie entry" in middle column
  if (item.Type === "Movie") {
    jfEpisodeList.innerHTML = "";
    const d = document.createElement("div");
    d.className = "media-item active";
    d.innerHTML = `
      <span class="title">${item.Name}</span>
      <span class="meta">Movie</span>
      <div id="segments-curr-${item.Id}" class="meta" style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;"></div>
    `;
    jfEpisodeList.append(d);
  }

  // 1. Fetch current segments
  try {
    const res = await fetch("/api/item-segments", {
      method: "POST",
      body: JSON.stringify({ itemId: item.Id })
    });
    const data = await res.json();
    const container = el(`segments-curr-${item.Id}`);
    if (container) {
      if (data.ok && data.segments.length > 0) {
        container.innerHTML = data.segments.map(s => 
          `<span class="skip-tag ${s.Type.toLowerCase()}" style="font-size:8px; padding:1px 4px;">${s.Type}</span>`
        ).join("");
      } else {
        container.innerHTML = "<span style='font-size:8px; color:#ccc;'>Chưa có segment</span>";
      }
    }
  } catch (e) { console.error(e); }

  // 2. Fetch AniSkip Preview (Right Column)
  fetchAniSkipPreview(item, series);
}

async function fetchAniSkipPreview(item, series = null) {
  aniskipPreview.innerHTML = "<div style='padding:20px;text-align:center;'>Đang tìm AniSkip...</div>";
  saveSegmentsBtn.style.display = "none";
  pendingSegments = [];

  const malId = (series || item).ProviderIds?.AniList || (series || item).ProviderIds?.Mal || (series || item).ProviderIds?.AniDB;
  const tmdbId = (series || item).ProviderIds?.Tmdb;

  try {
    const episodes = [{ id: item.Id, number: item.IndexNumber || 1, name: item.Name }];
    const aniRes = await fetch("/api/aniskip-fetch", {
      method: "POST",
      body: JSON.stringify({ malId, tmdbId, episodes, type: item.Type })
    });
    const aniData = await aniRes.json();
    
    if (!aniData.ok) {
      if (aniData.error.includes("MAL ID")) {
        aniskipPreview.innerHTML = `
          <div style='padding:20px;text-align:center;'>
            <p style='color:var(--bad);margin-bottom:15px;'>Không tìm được MAL ID. Nhập thủ công:</p>
            <div style="display:flex; gap:8px; justify-content:center;">
              <input id="manualMalId" type="text" placeholder="MAL ID" style="height:32px; width:80px;">
              <button id="manualSearchBtn" class="primary" style="height:32px;">TÌM</button>
            </div>
          </div>
        `;
        el("manualSearchBtn").onclick = () => {
          const id = el("manualMalId").value.trim();
          if (!id) return;
          fetchAniSkipPreview(item, { ...series, ProviderIds: { Mal: id } });
        };
        return;
      }
      throw new Error(aniData.error);
    }
    
    if (!aniData.results || aniData.results.length === 0) {
      aniskipPreview.innerHTML = `<div style='padding:20px;text-align:center;'>Không có dữ liệu AniSkip cho tập này.</div>`;
      return;
    }

    aniskipPreview.innerHTML = "";
    aniData.results.forEach(res => {
      const row = document.createElement("div");
      row.className = "skip-row";
      row.style.flexDirection = "column";
      row.style.alignItems = "flex-start";
      row.style.gap = "10px";
      
      const segs = (res.segments || []).map(s => {
        const type = s.skipType === 'op' ? 'Intro' : 'Outro';
        const cls = s.skipType === 'op' ? 'op' : 'ed';
        pendingSegments.push({ itemId: res.itemId, type: s.skipType === 'op' ? 0 : 1, start: s.interval.startTime, end: s.interval.endTime });
        return `
          <div style="display:flex; justify-content:space-between; width:100%; border-bottom:1px solid #f0f0f0; padding-bottom:5px;">
            <span class="skip-tag ${cls}">${type}</span>
            <span style="font-size:11px; font-weight:700;">${Math.round(s.interval.startTime)}s - ${Math.round(s.interval.endTime)}s</span>
          </div>`;
      }).join("");
      
      row.innerHTML = `<div style="font-weight:800; font-size:11px; color:var(--muted);">${item.Name}</div>${segs}`;
      aniskipPreview.append(row);
    });

    saveSegmentsBtn.style.display = "block";
    saveSegmentsBtn.innerText = `ĐỒNG BỘ LÊN JELLYFIN`;
  } catch (e) {
    aniskipPreview.innerHTML = `<div style='padding:20px;color:var(--bad);'>Lỗi: ${e.message}</div>`;
  }
}

saveSegmentsBtn.onclick = async () => {
  saveSegmentsBtn.disabled = true;
  setStatus("Đang đồng bộ...", "ok");
  try {
    const res = await fetch("/api/segments-save", {
      method: "POST",
      body: JSON.stringify({ segments: pendingSegments })
    });
    const data = await res.json();
    if (data.ok) {
      setStatus("Đồng bộ thành công!", "ok");
      // Refresh current item UI
      const activeEp = document.querySelector("#jfEpisodeList .media-item.active");
      if (activeEp) activeEp.click();
      else {
          const activeMedia = document.querySelector("#jfMediaList .media-item.active");
          if (activeMedia) activeMedia.click();
      }
    } else throw new Error(data.error);
  } catch (e) {
    setStatus("Lỗi: " + e.message, "error");
  } finally {
    saveSegmentsBtn.disabled = false;
  }
};

// --- Storage & Config ---

const getServerId = () => (storageMode.value === "local" ? "local" : `${sshUser.value.trim()}@${sshHost.value.trim()}`);

const updateServerDisplay = () => {
  const id = getServerId();
  serverNameDisplay.innerText = storageMode.value === "local" ? "Local" : id;
  serverNameDisplay.style.color = storageMode.value === "remote" && nasStatus.innerText !== "ONLINE" ? "var(--bad)" : "var(--muted)";
};

const loadServerConfig = () => {
  const configs = JSON.parse(localStorage.getItem("nas_configs") || "{}");
  const id = getServerId();
  const cfg = configs[id] || {};
  tvRoot.value = cfg.tvRoot || "";
  movieRoot.value = cfg.movieRoot || "";
  if (currentTmdbData.type === "tv") destPath.value = cfg.lastTvPath || cfg.tvRoot || "";
  else if (currentTmdbData.type === "movie") destPath.value = cfg.lastMoviePath || cfg.movieRoot || "";
  else destPath.value = cfg.lastPath || "";

  if (storageMode.value === "remote") {
    sshPassword.value = cfg.password || "";
    rememberAuth.checked = cfg.remember !== false;
    setConnectedState(!!cfg.password);
  }
  updateServerDisplay();
};

const saveServerConfig = () => {
  const configs = JSON.parse(localStorage.getItem("nas_configs") || "{}"),
    id = getServerId();
  if (!id || id.endsWith("@")) return;
  const cfg = configs[id] || {};
  cfg.tvRoot = tvRoot.value;
  cfg.movieRoot = movieRoot.value;
  cfg.mode = storageMode.value;
  if (currentTmdbData.type === "tv") cfg.lastTvPath = destPath.value;
  else if (currentTmdbData.type === "movie") cfg.lastMoviePath = destPath.value;
  else cfg.lastPath = destPath.value;
  if (storageMode.value === "remote") {
    cfg.remember = rememberAuth.checked;
    if (rememberAuth.checked) cfg.password = sshPassword.value;
    else delete cfg.password;
  }
  configs[id] = cfg;
  localStorage.setItem("nas_configs", JSON.stringify(configs));
  localStorage.setItem("last_server_id", id);
  updateServerDisplay();
};

// --- Handlers ---

const handleStorageModeChange = () => {
  const isLocal = storageMode.value === "local";
  remoteConfig.style.display = isLocal ? "none" : "block";
  nasStatus.style.visibility = isLocal ? "hidden" : "visible";
  saveToNasBtn.innerText = isLocal ? "LƯU VÀO THƯ MỤC" : "ĐẨY LÊN NAS";
  loadServerConfig();
  updateServerDisplay();
};

storageMode.onchange = handleStorageModeChange;

el("openSettingsBtn").onclick = () => (settingsModal.style.display = "flex");
el("closeSettingsBtn").onclick = () => (settingsModal.style.display = "none");
el("saveSettingsBtn").onclick = () => {
  saveServerConfig();
  settingsModal.style.display = "none";
};

// --- SSH Operations ---

async function testConnection() {
  const host = sshHost.value.trim(),
    user = sshUser.value.trim(),
    password = sshPassword.value.trim();
  if (!host || !user) return;
  nasStatus.innerText = "CONNECTING...";
  try {
    const res = await fetch("/api/test-ssh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, user, password }),
    });
    const data = await res.json();
    if (data.ok) {
      setConnectedState(true);
      saveServerConfig();
      updateServerDisplay();
    } else {
      setConnectedState(false);
      nasStatus.innerText = "OFFLINE";
      updateServerDisplay();
    }
  } catch {
    nasStatus.innerText = "ERROR";
    updateServerDisplay();
  }
}

function setConnectedState(connected) {
  if (connected) {
    nasStatus.innerText = "ONLINE";
    nasStatus.style.color = "var(--good)";
    passwordFieldContainer.style.display = "none";
    testNasBtn.style.display = "none";
    disconnectNasBtn.style.display = "inline-block";
  } else {
    nasStatus.innerText = "OFFLINE";
    nasStatus.style.color = "#888";
    passwordFieldContainer.style.display = "block";
    testNasBtn.style.display = "inline-block";
    disconnectNasBtn.style.display = "none";
  }
}

testNasBtn.onclick = testConnection;
disconnectNasBtn.onclick = () => {
  setConnectedState(false);
  if (!rememberAuth.checked) sshPassword.value = "";
  saveServerConfig();
};

// --- Directory Browser ---

browseBtn.onclick = () => {
  let start = destPath.value || (currentTmdbData.type === "tv" ? tvRoot.value : movieRoot.value);
  targetInput = destPath;
  currentBrowserPath = start || "/";
  openBrowser();
};
browseTvBtn.onclick = () => {
  targetInput = tvRoot;
  currentBrowserPath = tvRoot.value || "/";
  openBrowser();
};
browseMovieBtn.onclick = () => {
  targetInput = movieRoot;
  currentBrowserPath = movieRoot.value || "/";
  openBrowser();
};

async function openBrowser() {
  dirBrowser.style.display = "flex";
  browserList.innerHTML = "<div style='padding:20px;text-align:center;'>Đang tải...</div>";
  browserPath.innerText = currentBrowserPath;
  const isL = storageMode.value === "local",
    ep = isL ? "/api/list-dirs-local" : "/api/list-dirs";
  const b = isL
    ? { path: currentBrowserPath }
    : { host: sshHost.value, user: sshUser.value, password: sshPassword.value, path: currentBrowserPath };
  try {
    const res = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    browserList.innerHTML = "";
    if (currentBrowserPath !== "/" && currentBrowserPath !== "") addItem(".. (Lên trên)", "up");
    data.dirs.forEach((d) => addItem(d, "dir"));
  } catch (e) {
    browserList.innerHTML = "<div style='padding:20px;color:var(--bad);'>Lỗi: " + e.message + "</div>";
  }
}

function addItem(name, type) {
  const d = document.createElement("div");
  d.className = "browser-item";
  d.innerHTML = `<span>${type === "dir" ? "📁" : "⬆️"}</span><span>${name}</span>`;
  d.onclick = () => {
    if (type === "up") {
      const p = currentBrowserPath.split("/").filter(Boolean);
      p.pop();
      currentBrowserPath = "/" + p.join("/");
    } else {
      currentBrowserPath = currentBrowserPath.endsWith("/") ? currentBrowserPath + name : currentBrowserPath + "/" + name;
    }
    openBrowser();
  };
  browserList.append(d);
}

el("closeBrowserBtn").onclick = () => (dirBrowser.style.display = "none");
el("selectDirBtn").onclick = () => {
  if (targetInput) {
    targetInput.value = currentBrowserPath;
    saveServerConfig();
  }
  dirBrowser.style.display = "none";
};

const searchSuggestions = el("searchSuggestions");
let searchTimeout = null;
let currentSearchPage = 1;
let totalSearchPages = 1;
let currentSearchQuery = "";
let isSearching = false;

// --- Search Logic ---

tmdbUrl.oninput = () => {
  const query = tmdbUrl.value.trim();
  if (searchTimeout) clearTimeout(searchTimeout);

  if (query.match(/\/(tv|movie)\/(\d+)/)) {
    searchSuggestions.style.display = "none";
    fetchTmdbBtn.click();
    return;
  }

  if (query.length < 2) {
    searchSuggestions.style.display = "none";
    return;
  }

  searchTimeout = setTimeout(() => {
    currentSearchQuery = query;
    currentSearchPage = 1;
    performSearch(query, 1, false);
  }, 300);
};

async function performSearch(query, page, append = false) {
  if (isSearching) return;
  isSearching = true;
  try {
    const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}&page=${page}`);
    const data = await res.json();
    currentSearchPage = Number(data.page);
    totalSearchPages = Number(data.total_pages);
    renderSuggestions(data.results, append);
  } catch (err) {
    console.error("Search failed:", err);
  } finally {
    isSearching = false;
  }
}

function renderSuggestions(results, append = false) {
  if (!append) {
    searchSuggestions.innerHTML = "";
    searchSuggestions.scrollTop = 0;
  } else {
    const oldBtn = searchSuggestions.querySelector(".load-more-btn");
    if (oldBtn) oldBtn.remove();
  }

  if (!results || results.length === 0) {
    if (!append) searchSuggestions.style.display = "none";
    return;
  }

  const filtered = results.filter((r) => r.media_type === "movie" || r.media_type === "tv");

  filtered.forEach((item) => {
    const div = document.createElement("div");
    div.className = "search-item";
    const title = item.name || item.title;
    const date = item.release_date || item.first_air_date || "";
    const year = date ? `(${date.split("-")[0]})` : "";
    const type = item.media_type === "movie" ? "MOVIE" : "TV SHOW";

    div.innerHTML = `
      <div>
        <span class="title">${title}</span>
        <span class="meta">${year}</span>
      </div>
      <span class="type-pill ${item.media_type}">${type}</span>
    `;

    div.onclick = () => {
      tmdbUrl.value = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
      searchSuggestions.style.display = "none";
      fetchTmdbBtn.click();
    };
    searchSuggestions.appendChild(div);
  });

  if (currentSearchPage < totalSearchPages) {
    const loadMore = document.createElement("div");
    loadMore.className = "search-item load-more-btn";
    loadMore.style.justifyContent = "center";
    loadMore.style.background = "#f8f9fb";
    loadMore.style.color = "var(--accent)";
    loadMore.style.fontSize = "11px";
    loadMore.style.fontWeight = "800";
    loadMore.innerText = "XEM THÊM KẾT QUẢ...";
    loadMore.onclick = (e) => {
      e.stopPropagation();
      loadMore.innerText = "ĐANG TẢI...";
      const nextPage = Number(currentSearchPage) + 1;
      performSearch(currentSearchQuery, nextPage, true);
    };
    searchSuggestions.appendChild(loadMore);
  }

  searchSuggestions.style.display = "block";
}

document.addEventListener("click", (e) => {
  if (e.target !== tmdbUrl && e.target !== searchSuggestions) {
    searchSuggestions.style.display = "none";
  }
});

// --- TMDB & Parsing ---

  fetchTmdbBtn.onclick = async () => {
    if (!TMDB_API_KEY) return alert("TMDB API Key chưa được cấu hình trên server (.env)");
    const m = tmdbUrl.value.match(/\/(tv|movie)\/(\d+)/);
    if (!m) return alert("Link TMDB không đúng");
    fetchTmdbBtn.disabled = true;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${m[1]}/${m[2]}?api_key=${TMDB_API_KEY}&language=vi-VN`);
      const data = await res.json();
      currentTmdbData = {
        type: m[1],
        title: data.name || data.title,
        seasons:
          m[1] === "tv"
            ? data.seasons
                .filter((s) => s.season_number > 0)
                .map((s) => ({ number: s.season_number, name: s.name, count: s.episode_count }))
            : [],
      };
      seriesName.value = currentTmdbData.title;
      el("toolRow2").style.display = "grid";
      el("mainWorkspace").style.display = "grid";
      
      const configs = JSON.parse(localStorage.getItem("nas_configs") || "{}"),
        cfg = configs[getServerId()] || {};
      destPath.value =
        currentTmdbData.type === "tv" ? cfg.lastTvPath || cfg.tvRoot || "" : cfg.lastMoviePath || cfg.movieRoot || "";
      renderPreview();
      updateServerDisplay();
    } catch (e) {
      alert("Lỗi TMDB: " + e.message);
    } finally {
      fetchTmdbBtn.disabled = false;
    }
  };

bulkInput.oninput = () => renderPreview();

function parseInput() {
  const items = [],
    errors = [];
  bulkInput.value.split("\n").forEach((l, i) => {
    const line = l.trim();
    if (!line) return;
    const m3u8 = line.match(/https?:\/\/\S+?\.m3u8(?:\?\S*)?/i);
    if (!m3u8) return errors.push({ line: i + 1, message: "URL không hợp lệ" });
    let title = line.slice(0, m3u8.index).replace(/[|,\t]+$/g, "").trim() || `Tập ${String(items.length + 1).padStart(2, "0")}`;
    const epNum = (title.match(/Tập\s*([\d.]+)/i) || [])[1];
    let sInfo = null;
    if (currentTmdbData.type === "tv" && epNum) {
      let start = 1;
      for (const s of currentTmdbData.seasons) {
        const end = start + s.count - 1;
        if (parseFloat(epNum) >= start && parseFloat(epNum) <= end + 0.99) {
          sInfo = { folder: `Season ${String(s.number).padStart(2, "0")}`, label: `Season ${s.number} - ${s.name}` };
          break;
        }
        start = end + 1;
      }
    }
    const fname =
      title
        .normalize("NFC")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "") + ".strm";
    items.push({
      title,
      url: m3u8[0],
      path: sInfo ? `${sInfo.folder}/${fname}` : fname,
      sFolder: sInfo?.folder,
      sLabel: sInfo?.label,
    });
  });
  return { items, errors };
}

function renderPreview() {
  const { items, errors } = parseInput();
  const total = items.length + errors.length;
  
  const linkCountEl = el("linkCount");
  linkCountEl.style.display = total > 0 ? "inline-block" : "none";
  linkCountEl.innerText = `${total} tập`;
  
  const statsEl = document.querySelector(".stats");
  if (statsEl) statsEl.style.display = total > 0 ? "flex" : "none";
  
  const seasonStat = el("seasonStat");
  if (seasonStat) seasonStat.style.display = currentTmdbData.type === "tv" ? "flex" : "none";
  
  const uniqueSeasons = new Set(items.map(it => it.sFolder).filter(Boolean));
  if (el("seasonCount")) el("seasonCount").innerText = uniqueSeasons.size;
  if (el("successTotal")) el("successTotal").innerText = `${items.length} / ${total}`;

  saveToNasBtn.disabled = items.length === 0;

  if (!total)
    return (preview.innerHTML =
      '<div style="text-align:center;color:#999;padding:100px;font-size:13px;">Dán link để xem trước</div>');
  preview.innerHTML = "";
  let curS = "";
  items.forEach((it) => {
    if (it.sFolder && it.sFolder !== curS) {
      curS = it.sFolder;
      const isC = collapsedSeasons.has(curS);
      const b = document.createElement("div");
      b.className = "row season-break";
      b.style.cursor = "pointer";
      b.innerHTML = `<span class="season-toggle ${isC ? "collapsed" : ""}">▼</span> 📂 ${it.sLabel}`;
      b.onclick = () => {
        if (collapsedSeasons.has(it.sFolder)) collapsedSeasons.delete(it.sFolder);
        else collapsedSeasons.add(it.sFolder);
        renderPreview();
      };
      preview.append(b);
    }
    if (it.sFolder && collapsedSeasons.has(it.sFolder)) return;
    const r = document.createElement("div");
    r.className = "row";
    r.style.paddingLeft = it.sFolder ? "20px" : "4px";
    r.innerHTML = `<span class="pill">.strm</span>📄 ${it.title}<div style="font-size:10px;color:#888;margin-top:2px;font-family:monospace;">${it.path}</div>`;
    preview.append(r);
  });
}

// --- Save Action ---

saveToNasBtn.onclick = async () => {
  const { items } = parseInput();
  if (!items.length) return;
  saveToNasBtn.disabled = true;
  setStatus("Đang lưu...", "ok");
  const isL = storageMode.value === "local",
    ep = isL ? "/api/save-local" : "/api/push";
  const body = {
    host: sshHost.value,
    user: sshUser.value,
    password: sshPassword.value,
    remotePath: destPath.value,
    files: items.map((it) => ({ path: it.path, content: it.url + "\n" })),
  };
  try {
    const res = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus(`Thành công! Đã lưu ${items.length} file.`, "ok");
      saveServerConfig();
    } else throw new Error(data.error);
  } catch (e) {
    setStatus("Lỗi: " + e.message, "error");
  } finally {
    saveToNasBtn.disabled = false;
  }
};

function setStatus(m, t) {
  statusEl.innerText = m;
  statusEl.className = "status " + (t || "");
  if (t === "ok") {
    setTimeout(() => {
      if (statusEl.innerText === m) {
        statusEl.className = "status";
        statusEl.innerText = "";
      }
    }, 4000);
  }
}

el("clearBtn").onclick = () => {
  bulkInput.value = "";
  renderPreview();
};
