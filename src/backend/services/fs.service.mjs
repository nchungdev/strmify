import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";

export class FsService {
  static async listLocalDirs(localPath) {
    const entries = await readdir(localPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  }

  static async saveFiles(basePath, files) {
    for (const file of files) {
      const fullPath = path.join(basePath, file.path);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, file.content, "utf8");
    }
    return true;
  }

  static async createTempDir(prefix) {
    const tempPath = path.join(process.cwd(), `temp_${prefix}_${Date.now()}`);
    await mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  static async removeDir(dirPath) {
    await rm(dirPath, { recursive: true, force: true });
  }

  static async readStaticFile(filePath) {
    return await readFile(filePath, "utf8");
  }
}
