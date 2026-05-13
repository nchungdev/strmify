import { SshService } from "../services/ssh.service.mjs";
import { FsService } from "../services/fs.service.mjs";
import { JellyfinService } from "../services/jellyfin.service.mjs";
import { AniskipService } from "../services/aniskip.service.mjs";
import { DbService } from "../services/db.service.mjs";

export class ApiController {
  static async listJellyfinMedia(req, res) {
    try {
      const items = await JellyfinService.getItems();
      this.sendJson(res, { ok: true, items: items.Items });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async listJellyfinEpisodes(req, res, body) {
    try {
      const { seriesId } = JSON.parse(body);
      const items = await JellyfinService.getEpisodes(seriesId);
      this.sendJson(res, { ok: true, items: items.Items });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async fetchAniskip(req, res, body) {
    try {
      let { malId, tmdbId, episodes, type } = JSON.parse(body);
      
      // Auto-resolve MAL ID if missing
      if (!malId && tmdbId) {
        malId = await AniskipService.findMalId(tmdbId, type === 'Movie' ? 'movie' : 'tv');
      }

      if (!malId) {
        throw new Error("Không tìm thấy MAL ID. Vui lòng nhập thủ công.");
      }

      const results = [];
      for (const ep of episodes) {
        const skipTimes = await AniskipService.getSkipTimes(malId, ep.number);
        if (skipTimes.length > 0) {
          results.push({ itemId: ep.id, number: ep.number, segments: skipTimes });
        }
      }
      this.sendJson(res, { ok: true, results });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async saveSegments(req, res, body) {
    try {
      const { segments } = JSON.parse(body);
      await DbService.saveSegments(segments);
      this.sendJson(res, { ok: true });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }
  static async listLocalDirs(req, res, body) {
    try {
      const { path: localPath } = JSON.parse(body);
      const dirs = await FsService.listLocalDirs(localPath);
      this.sendJson(res, { ok: true, dirs });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async saveLocal(req, res, body) {
    try {
      const { remotePath, files } = JSON.parse(body);
      await FsService.saveFiles(remotePath, files);
      this.sendJson(res, { ok: true });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message }, 500);
    }
  }

  static async listRemoteDirs(req, res, body) {
    try {
      const config = JSON.parse(body);
      const dirs = await SshService.listRemoteDirs(config);
      this.sendJson(res, { ok: true, dirs });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async testSsh(req, res, body) {
    try {
      const config = JSON.parse(body);
      await SshService.testConnection(config);
      this.sendJson(res, { ok: true });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message });
    }
  }

  static async pushRemote(req, res, body) {
    let tempDir = null;
    try {
      const { host, user, password, remotePath, files } = JSON.parse(body);
      tempDir = await FsService.createTempDir("push");

      // Create files in temp dir
      await FsService.saveFiles(tempDir, files);

      // Push using rsync
      await SshService.pushFiles({ host, user, password, remotePath, sourceDir: tempDir });

      this.sendJson(res, { ok: true });
    } catch (err) {
      this.sendJson(res, { ok: false, error: err.message }, 500);
    } finally {
      if (tempDir) await FsService.removeDir(tempDir);
    }
  }

  static sendJson(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }
}
