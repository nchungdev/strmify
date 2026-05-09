import { SshService } from "../services/ssh.service.mjs";
import { FsService } from "../services/fs.service.mjs";

export class ApiController {
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
