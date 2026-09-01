# 📍 GeoPhoto Log — Offline-First Geotagged Photo Field App

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**GeoPhoto Log** is a modern, high-performance, offline-first Progressive Web Application (PWA) designed for field surveys, site inspections, environmental research, travel journaling, and spatial data collection. It enables seamless photo capture with high-precision GPS telemetry, automatic image compression, customizable GPS telemetry watermarks, voice-to-text notes, multi-layer mapping, and complete local IndexedDB persistence without requiring any remote backend.

---

## 🌟 Key Features

### 📸 Camera & Capture Engine
- **Hardware-Accelerated Viewfinder**: Live camera feed with front/rear facing camera switching and torch (flashlight) support on compatible mobile devices.
- **Composition Grid**: 3x3 rule-of-thirds grid overlay for precise field framing.
- **File Upload Fallback**: Upload existing photos from your device storage if the live camera is unavailable or not permitted.
- **Manual Coordinate Override**: Manually adjust or mock latitude, longitude, and accuracy for desktop testing or remote field simulation.

### 🛰️ Real-Time GPS & Telemetry Tracking
- **High-Accuracy Geolocation**: Continuous GPS polling with real-time accuracy indicators ($\pm \text{meters}$), altitude, heading (compass angle), and ground speed.
- **Telemetry Overlay**: Visual live telemetry HUD embedded in the viewfinder and photo review modals.
- **Offline Reverse Geocoding**: Smart caching and network-safe reverse geocoding via OpenStreetMap Nominatim with zero-failure offline fallback.

### 🎨 Image Processing & GPS Watermarking
- **Automatic Compression & Scaling**: Intelligent canvas-based downscaling and thumbnail generation (240x240) to conserve local storage space.
- **Burn-In GPS Watermark**: Optional high-contrast metadata banner embedded onto saved images showing coordinates, timestamp, accuracy, and note excerpts.

### 🗺️ Multi-Layer Interactive Map (Leaflet)
- **5 Map Tile Layers**:
  - OpenStreetMap (Standard)
  - OpenStreetMap Humanitarian (HOT)
  - Esri World Imagery (Satellite)
  - CartoDB Dark Matter (Sleek Dark Mode)
  - OpenTopoMap (Topographic with elevation contours)
- **Chronological Breadcrumb Route**: Polyline trajectory connecting captured photo locations in chronological sequence.
- **Interactive Pin Clusters**: Clickable location markers displaying photo thumbnail previews, coordinate formatting (Decimal & DMS), and instant navigation links.
- **Real-Time GPS User Marker**: Live pulsed marker showing current device position and accuracy radius.

### 🗃️ Offline-First IndexedDB Storage & Analytics
- **100% Local & Private**: All photos, thumbnails, coordinates, and notes are saved directly in the browser's IndexedDB. No tracking, accounts, or cloud dependencies.
- **Storage Metrics**: Real-time storage estimation dashboard measuring database size against browser quota limits.

### 📝 Rich Annotation & Voice Dictation
- **Voice-to-Text Input**: Integrated Web Speech API for hands-free voice notes dictation in the field.
- **Tagging & Filtering**: Quick preset tags (`#fieldwork`, `#inspection`, `#site-survey`, etc.), custom tag creation, and star/favorite marking.
- **External Map Deep Links**: 1-click navigation links to Google Maps, Apple Maps, OpenStreetMap, and native `geo:` URIs.

### 📤 Full Data Export & Portability
- **JSON Backup**: Complete database dump including image Base64 payloads with 1-click restore/import.
- **GeoJSON Export**: Standard GIS format ready for import into QGIS, ArcGIS, Google Earth, or Mapbox.
- **CSV Export**: Clean spreadsheet export for reporting, Excel analysis, or database import.

### 📱 Progressive Web App (PWA)
- Fully installable on iOS (Safari Add to Home Screen), Android (Chrome install prompt), macOS, Windows, and Linux.
- Offline Service Worker caching for instant loading in remote field areas without cellular reception.

---

## 🏗️ Architecture & Project Structure

```plaintext
geotag-photo-sample-app/
├── public/
│   ├── assets/              # App icons and graphics
│   ├── icon.svg             # Vector app icon
│   ├── manifest.webmanifest # PWA Web App Manifest
│   └── sw.js                # Service Worker for offline asset caching
├── src/
│   ├── components/          # Modular UI components
│   │   ├── BottomNav.tsx          # Mobile bottom tab navigation
│   │   ├── CameraViewfinder.tsx   # Camera feed, HUD overlay, and controls
│   │   ├── CaptureReviewModal.tsx # Review photo, notes, tags & watermarking
│   │   ├── EntriesGallery.tsx     # Gallery view with search, filter & sort
│   │   ├── EntryDetailModal.tsx   # Detailed view, coordinate copy & edits
│   │   ├── Header.tsx             # Top bar with GPS telemetry & status badges
│   │   ├── MapView.tsx            # Leaflet map, multi-tiles & route visualizer
│   │   ├── PWAInstallBanner.tsx   # Floating PWA install prompt banner
│   │   └── StatsExportModal.tsx   # Storage stats, JSON/GeoJSON/CSV exports
│   ├── db/
│   │   └── indexedDB.ts     # IndexedDB client, migrations, export/import
│   ├── hooks/
│   │   ├── useCamera.ts     # MediaDevices camera stream & torch hook
│   │   └── useGps.ts        # Geolocation tracking and state management
│   ├── services/
│   │   ├── gpsUtils.ts      # Coordinate formatting (DMS), distance & geocoding
│   │   └── imageUtils.ts    # Compression, thumbnail generation & watermarking
│   ├── types.ts             # TypeScript interfaces and data models
│   ├── App.tsx              # Root component & tab state coordinator
│   ├── index.css            # Tailwind CSS imports & global map styles
│   └── main.tsx             # React DOM root entry
├── .env.example             # Example environment configuration
├── index.html               # HTML entry point with PWA meta tags
├── package.json             # Scripts & dependency definitions
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite + Tailwind + React configuration
```

---

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite` |
| **Mapping Engine** | [Leaflet 1.9](https://leafletjs.com/) & `@types/leaflet` |
| **Icons & UI** | [Lucide React](https://lucide.dev/) |
| **Animations** | [Motion](https://motion.dev/) |
| **Storage** | HTML5 IndexedDB API |
| **APIs Used** | MediaDevices (Camera), Geolocation API, Web Speech API, Service Workers |

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
Make sure you have installed:
- **Node.js**: Version `18.0.0` or higher (recommended: `20.x` or `22.x LTS`)
- **Package Manager**: `npm`, `pnpm`, `yarn`, or `bun`

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/geotag-photo-sample-app.git
cd geotag-photo-sample-app
```

### 2. Install Dependencies

Using **npm**:
```bash
npm install
```

*(Or using **bun** / **pnpm** / **yarn**)*:
```bash
bun install
# or
pnpm install
# or
yarn install
```

### 3. Configure Environment Variables (Optional)
Copy the example environment file if you wish to configure app parameters:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini AI API key for AI extensions | `""` |
| `APP_URL` | *(Optional)* Base URL where the app is hosted | `http://localhost:3000` |

### 4. Start the Development Server
```bash
npm run dev
```

The application will start on **`http://localhost:3000`** (or `http://0.0.0.0:3000`).

---

## 📱 Testing on Mobile Devices (Local Network)

Since camera and geolocation access require secure origins (`https://` or `localhost`), follow these tips when testing on physical mobile phones on your local Wi-Fi:

1. **Vite Host Binding**: The dev server is preconfigured with `--host=0.0.0.0` to expose the port on your local network.
2. **Access URL**: Open `http://<YOUR_COMPUTER_LOCAL_IP>:3000` on your mobile browser.
3. **Grant Permissions**:
   - Allow **Camera** permission when prompted to enable the live viewfinder.
   - Allow **Location / GPS** permission (with "Precise Location" enabled on iOS/Android).
4. **Desktop Coordinate Simulation**: If testing on a desktop without GPS, use the **Override / Manual Coordinates** button in the camera viewfinder header to enter test coordinates.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with hot module reloading on port 3000 |
| `npm run build` | Compiles TypeScript and creates an optimized production bundle in `dist/` |
| `npm run preview` | Runs a local web server to preview the production build output |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) to validate types |
| `npm run clean` | Cleans build artifacts (`dist/` directory) |

---

## 🔒 Privacy & Offline Capability

- **Zero Cloud Uploads by Default**: All captured imagery, location coordinates, notes, and tags remain on your device in local browser IndexedDB storage.
- **Air-Gapped Operation**: Once loaded, the core photo capture, GPS tagging, watermarking, and gallery browsing functions operate completely offline without cellular or Wi-Fi connectivity.
- **Data Portability**: You retain full ownership of your data with one-click exports to standard **GeoJSON**, **JSON**, and **CSV** formats.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it for personal, commercial, or academic field research projects.
