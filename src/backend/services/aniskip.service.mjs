export class AniskipService {
  static async getSkipTimes(malId, episode) {
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episode}?types=op&types=ed`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.found ? data.results : [];
    } catch (err) {
      console.error(`AniSkip fetch error for MAL ${malId} EP ${episode}:`, err);
      return [];
    }
  }

  // Helper to find MAL ID from other IDs if needed
  static async findMalId(tmdbId, type = 'tv') {
    try {
      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (!tmdbApiKey) return null;
      
      // 1. Get TVDB ID from TMDB
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${tmdbApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const tvdbId = data.tvdb_id;
      if (!tvdbId) return null;

      // 2. Map TVDB to MAL via MALSync
      const malSyncUrl = `https://api.malsync.moe/mal/anime/tvdb/${tvdbId}`;
      const msRes = await fetch(malSyncUrl);
      if (msRes.ok) {
        const msData = await msRes.json();
        return msData.id; // MAL ID
      }
      return null;
    } catch (e) {
      console.error("Error finding MAL ID:", e);
      return null;
    }
  }
}
