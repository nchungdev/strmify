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
      const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${tmdbApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      // AniSkip usually uses MAL ID. 
      // If we only have TMDB, we might need a mapping service or just hope Jellyfin has it.
      return data.tvdb_id; // Some services use TVDB
    } catch (e) {
      return null;
    }
  }
}
