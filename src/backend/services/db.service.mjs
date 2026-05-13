import sqlite3
import "dotenv/config";

export class DbService {
  static get dbPath() { return process.env.INTRO_DB_PATH; }

  static async saveSegments(segments) {
    return new Promise((resolve, reject) => {
      if (!this.dbPath) return reject(new Error("INTRO_DB_PATH not configured"));

      const db = new sqlite3.Database(this.dbPath);
      
      db.serialize(() => {
        const stmt = db.prepare(`
          INSERT INTO DbSegment (ItemId, Type, Start, End, IsUserProvided)
          VALUES (?, ?, ?, ?, 1)
        `);

        for (const seg of segments) {
          const { itemId, type, start, end } = seg;
          stmt.run(itemId, type, start, end);
        }

        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
          db.close();
        });
      });
    });
  }

  static async getExistingSegments(itemIds) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath);
      const placeholders = itemIds.map(() => '?').join(',');
      db.all(`SELECT ItemId FROM DbSegment WHERE ItemId IN (${placeholders})`, itemIds, (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows.map(r => r.ItemId));
      });
    });
  }
}
