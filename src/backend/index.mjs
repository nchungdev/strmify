import "dotenv/config";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FsService } from "./services/fs.service.mjs";
import { ApiController } from "./controllers/api.controller.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "../../");
const FRONTEND_DIR = path.join(ROOT_DIR, "src/frontend");
const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // TMDB Search Proxy
  if (req.method === "GET" && url.pathname === "/api/tmdb-search") {
    const query = url.searchParams.get("q");
    const page = url.searchParams.get("page") || "1";
    if (!query) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Query required" }));
      return;
    }
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=vi-VN&page=${page}`;
      const tmdbRes = await fetch(tmdbUrl);
      const data = await tmdbRes.json();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Config Endpoint
  if (req.method === "GET" && url.pathname === "/api/config") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ TMDB_API_KEY: process.env.TMDB_API_KEY }));
    return;
  }

  // Jellyfin Items Endpoint
  if (req.method === "GET" && url.pathname === "/api/jf-items") {
    await ApiController.listJellyfinMedia(req, res);
    return;
  }

  // Static File Serving
  if (req.method === "GET") {
    let filePath = "";
    let contentType = "text/html";

    if (url.pathname === "/") {
      filePath = path.join(FRONTEND_DIR, "index.html");
    } else if (url.pathname.startsWith("/css/")) {
      filePath = path.join(FRONTEND_DIR, url.pathname);
      contentType = "text/css";
    } else if (url.pathname.startsWith("/js/")) {
      filePath = path.join(FRONTEND_DIR, url.pathname);
      contentType = "application/javascript";
    }

    if (filePath) {
      try {
        const content = await FsService.readStaticFile(filePath);
        res.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
        res.end(content);
        return;
      } catch (err) {
        if (url.pathname !== "/") {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
      }
    }
  }

  // API Routes
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      switch (url.pathname) {
        case "/api/list-dirs-local":
          await ApiController.listLocalDirs(req, res, body);
          break;
        case "/api/save-local":
          await ApiController.saveLocal(req, res, body);
          break;
        case "/api/list-dirs":
          await ApiController.listRemoteDirs(req, res, body);
          break;
        case "/api/test-ssh":
          await ApiController.testSsh(req, res, body);
          break;
        case "/api/push":
          await ApiController.pushRemote(req, res, body);
          break;
        case "/api/jf-episodes":
          await ApiController.listJellyfinEpisodes(req, res, body);
          break;
        case "/api/aniskip-fetch":
          await ApiController.fetchAniskip(req, res, body);
          break;
        case "/api/segments-save":
          await ApiController.saveSegments(req, res, body);
          break;
        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: "API Route Not Found" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\n🚀 Strmify Backend running at http://localhost:${PORT}`);
  console.log(`📂 Serving frontend from: ${FRONTEND_DIR}\n`);
});
