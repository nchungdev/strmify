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
}
