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

let TMDB_API_KEY = "";
let currentTmdbData = { type: "", seasons: [] },
  currentBrowserPath = "",
  targetInput = null;
const collapsedSeasons = new Set();

// --- Initialization ---

window.onload = async () => {
  // Fetch Config
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

  // Auto-fetch if it's a valid TMDB URL
  if (query.match(/\/(tv|movie)\/(\d+)/)) {
    searchSuggestions.style.display = "none";
    fetchTmdbBtn.click(); // Trigger Go
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
    // Remove old load more button if it exists
    const oldBtn = searchSuggestions.querySelector(".load-more-btn");
    if (oldBtn) oldBtn.remove();
  }

  if (!results || results.length === 0) {
    if (!append) searchSuggestions.style.display = "none";
    return;
  }

  // Filter for only movie or tv types
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
      fetchTmdbBtn.click(); // Auto fetch
    };
    searchSuggestions.appendChild(div);
  });

  // Add Load More Button if needed
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

// Close suggestions on click outside
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
  
  // Toggle Visibility & Update Link Counter (Left)
  const linkCountEl = el("linkCount");
  linkCountEl.style.display = total > 0 ? "inline-block" : "none";
  linkCountEl.innerText = `${total} tập`;
  
  // Toggle Visibility & Update Stats (Right)
  const statsEl = document.querySelector(".stats");
  statsEl.style.display = total > 0 ? "flex" : "none";
  
  // Only show Season count for TV Shows
  const seasonStat = el("seasonStat");
  seasonStat.style.display = currentTmdbData.type === "tv" ? "flex" : "none";
  
  const uniqueSeasons = new Set(items.map(it => it.sFolder).filter(Boolean));
  el("seasonCount").innerText = uniqueSeasons.size;
  el("successTotal").innerText = `${items.length} / ${total}`;

  // Disable Save button if no items
  el("saveToNasBtn").disabled = items.length === 0;

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
