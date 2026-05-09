import { spawn } from "node:child_process";

export class SshService {
  static async testConnection({ host, user, password }) {
    const args = password
      ? ["-p", password, "ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", `${user}@${host}`, "exit"]
      : ["ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", `${user}@${host}`, "exit"];

    const cmd = password ? "sshpass" : "ssh";
    return this._runCommand(cmd, args);
  }

  static async listRemoteDirs({ host, user, password, path: remotePath }) {
    const lsCmd = `ls -F "${remotePath}" | grep / | sed 's/\\///'`;
    const args = password
      ? ["-p", password, "ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", `${user}@${host}`, lsCmd]
      : ["ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no", `${user}@${host}`, lsCmd];

    const cmd = password ? "sshpass" : "ssh";
    return this._runCommand(cmd, args, true);
  }

  static async pushFiles({ host, user, password, remotePath, sourceDir }) {
    const rsyncArgs = ["-avz", "--mkpath", sourceDir + "/", `${user}@${host}:${remotePath}/`];
    const args = password ? ["-p", password, "rsync", ...rsyncArgs] : rsyncArgs;
    const cmd = password ? "sshpass" : "rsync";

    return this._runCommand(cmd, args);
  }

  static _runCommand(cmd, args, captureOutput = false) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let output = "";
      let error = "";

      proc.stdout.on("data", (data) => (output += data));
      proc.stderr.on("data", (data) => (error += data));

      proc.on("error", (err) => {
        reject(err.code === "ENOENT" ? new Error(`Công cụ "${cmd}" chưa được cài đặt trên server.`) : err);
      });

      proc.on("close", (code) => {
        if (code === 0 || (captureOutput && code === 1 && output === "")) {
          resolve(captureOutput ? output.split("\n").map((d) => d.trim()).filter(Boolean) : true);
        } else {
          reject(new Error(error.trim() || `Command failed with exit code ${code}`));
        }
      });
    });
  }
}
