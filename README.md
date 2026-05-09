# Strmify 🎬

**Strmify** is a professional, high-performance pipeline designed to streamline the discovery and integration of media into your NAS or local library using `.strm` files.

![Strmify UI Placeholder](https://via.placeholder.com/1200x600?text=Strmify+Arctic+White+Interface)

## ✨ Features

- **🔍 Intelligent Discovery**: Integrated TMDB search with real-time suggestions, pagination, and automatic metadata fetching.
- **⚡ Automated Pipeline**: Convert batches of M3U8 links into structured `.strm` files instantly.
- **💾 Dual Storage Modes**:
  - **Remote Push**: Sync files directly to your NAS via SSH/Rsync.
  - **Local Storage**: Save files directly to your local or mounted drives.
- **📂 Directory Browser**: Built-in visual explorer to navigate and select destination folders on your server.
- **🚀 OMV Optimized**: Fully compatible with OpenMediaVault, including PUID/PGID support for seamless permissions.
- **🎨 Premium UI**: A clean, "Arctic White" design with floating toast notifications and a step-by-step workflow.

## 🛠️ Tech Stack

- **Backend**: Node.js (ESM)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Styling**: Arctic White Design System (custom CSS)
- **Integration**: TMDB API, SSH/Rsync

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- TMDB API Key (Get one at [themoviedb.org](https://www.themoviedb.org/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nchungdev/strmify.git
   cd strmify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Add your TMDB_API_KEY to .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## 🐳 Docker Deployment

Strmify is fully containerized and optimized for NAS environments like OMV.

### Using Docker Compose

```yaml
version: '3.8'
services:
  strmify:
    image: ghcr.io/nchungdev/strmify:latest
    container_name: strmify
    ports:
      - "3000:3000"
    environment:
      - PUID=1000
      - PGID=100
      - TMDB_API_KEY=your_tmdb_key_here
    volumes:
      - /path/to/your/media:/srv/media
    restart: always
```

## 📖 Usage Workflow

1. **Search**: Enter the name of a movie or TV show in the search bar.
2. **Select**: Choose from the suggestions. Strmify will automatically fetch the correct title and structure.
3. **Input**: Paste your M3U8 links in the format `Episode Name|URL`.
4. **Target**: Select your destination folder using the browser.
5. **Sync**: Click **ĐẨY LÊN NAS** and watch the magic happen.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---
Built with ❤️ for the media community.
