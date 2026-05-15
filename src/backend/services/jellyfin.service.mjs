import "dotenv/config";

export class JellyfinService {
  static get url() { return process.env.JELLYFIN_URL; }
  static get apiKey() { return process.env.JELLYFIN_API_KEY; }

  static async fetch(endpoint, params = {}) {
    const url = new URL(`${this.url}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const response = await fetch(url, {
      headers: {
        'X-Emby-Token': this.apiKey,
        'Accept': 'application/json'
      }
    });
    return response.json();
  }

  static async getLibraries() {
    return this.fetch('/Library/VirtualFolders');
  }

  static async getItems(parentId = null, includeItemTypes = "Series,Movie") {
    const params = {
      Recursive: true,
      Fields: "ProviderIds,Path",
      IncludeItemTypes: includeItemTypes,
      StartIndex: 0,
      Limit: 1000
    };
    if (parentId) params.ParentId = parentId;
    return this.fetch('/Items', params);
  }

  static async getEpisodes(seriesId) {
    const params = {
      Fields: "ProviderIds,Path,IndexNumber",
      Recursive: true,
    };
    return this.fetch(`/Shows/${seriesId}/Episodes`, params);
  }

  static async getMediaSegments(itemId) {
    return this.fetch(`/Items/${itemId}/MediaSegments`);
  }

  static async saveMediaSegments(itemId, segments) {
    const url = new URL(`${this.url}/Items/${itemId}/MediaSegments`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Emby-Token': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(segments)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jellyfin API Error: ${text}`);
    }
    return true;
  }
}
