# 🎞️ Every Frame In Order

> 🧪 Online demo: [@TwinPeaksShot](https://x.com/TwinPeaksShot)

This project automates the extraction, posting, and tracking of every frame of a video episode, image by image, on Twitter. It is designed to be used with **any series** or video content by adapting the metadata and database content. The current directory is configured for a specific series, but the system is generic.

It combines Puppeteer, Firebase, Google Drive, and Twitter (via cookies) to orchestrate the entire process.

## ⚙️ Features

* **Frame extraction** from a video episode with support for series and movies.
* **Interactive web interface** to view and browse frames:
  - 🖼️ **FrameViewer** with Next.js Image for optimized loading
  - 📊 **Statistics dashboard** with detailed metrics
  - 🌐 **Multilingual support** (i18next)
  - 🌙 **Dark/Light mode** with ThemeToggle
* **Upload to Google Drive** with organization by episode and API integration.
* **Metadata storage** (frames, timestamps, links) in Firebase Firestore.
* **Automatic and scheduled posting** of frames on Twitter via a custom API.
* **Import episodes and movies** via configurable JSON templates.
* **Advanced pagination management** with optimized loading.
* **Image proxy system** to improve performance.
* **Flexible deployment** (Vercel, VPS with PM2).

---

## 🚀 Installation & Usage Steps

### 1. Get the episode

Download the video file of the episode to process.

### 2. Extract frames

Use the extraction scripts to extract each image of the episode in `.jpg` or `.png` format.

```bash
npm run extract:series       # For TV series
npm run extract:movies       # For movies
```

> 💡 Each image must be named in a consistent format (e.g., `frame_0001.jpg`).

### 3. Upload to Google Drive

Images must be uploaded to a specific Google Drive folder for the project. The script uses the Google Drive API to manage uploads and retrieve public URLs.

#### 🗃️ Frame organization schema on Drive

```
Drive root
└── Twin Peaks
    └── Twin_Peaks_S01E01                      # Main folder for the episode
        ├── Twin_Peaks_S01_E01_1               # Subfolder containing 100 frames
        │   ├── frame_0001.png
        │   └── ...
        └── Twin_Peaks_S01_E01_2
            ├── frame_0101.png
            └── ...
```

> 📂 Each subfolder corresponds to a `folderId` referenced in Firestore.

### 4. Configure Firebase

Create a Firestore database on [Firebase Console](https://console.firebase.google.com/), then:

* Create a `series` collection containing the data.
* Provide a **Service Account JSON** encoded in base64.

#### 📁 Firestore database schema

```
[series-id] (document)
├── title: string                         # Series title
├── current: number                       # Index of the currently published content
├── order: array<string>                  # Publication order of contents
└── items: {
     [content-id]: {
       // For movies
       type: "movie",
       title: string,
       year: number,
       folderIds: array<string>,          # Drive folders containing frames
       totalFiles: number,
       lastIndex: number,
       indexFolder: number
       
       // For seasons
       type: "season",
       title: string,
       seasonNumber: number,
       current: { episodeId: string },    # Currently published episode
       episodes: {
         [episode-id]: {
           episodeNumber: number,
           folderIds: array<string>,      # Drive folders containing frames
           totalFiles: number,
           lastIndex: number,
           indexFolder: number
         }
       }
     }
   }
```

> 🔹 The `current` field (numeric) tracks the index in the `order` of the content being published.  
> 🔹 For seasons, a subfield `current.episodeId` indicates the currently published episode.

### 5. Fill in the `.env` file

Create a `.env` file at the root of the project with the following variables:

```env
CRON_SECRET=...
GOOGLE_APPLICATION_CREDENTIALS_BASE64=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
COOKIES_BASE64=...
CONTENT_ID=your-content-id
```

* `CRON_SECRET`: shared secret to secure cron requests.
* `GOOGLE_APPLICATION_CREDENTIALS_BASE64`: Google Drive API access credentials.
* `FIREBASE_SERVICE_ACCOUNT_BASE64`: encoded Firebase service account.
* `COOKIES_BASE64`: Twitter cookies exported in base64 format.
* `CONTENT_ID`: ID of the `content` document in Firestore.

> ℹ️ You can use:

```bash
npm run auth:cookies         # Generates cookies.b64 from cookies.json  
npm run auth:setup           # Sets up the authentication environment
```

### 6. Template configuration

The system uses JSON templates to import episode and movie metadata:

```bash
# Example episode template (episode-template.json)
{
  "season": "season-1",
  "episode": 1,
  "totalFiles": 5643,
  "folderIds": ["folder-id-1", "folder-id-2", ...]
}
```

To import:
```bash
npm run db:import:episode:template    # Import episode template
npm run db:import:movie:template      # Import movie template
```

### 7. Web Interface

Access the visualization interface:
- **Home page**: Multilingual presentation with themes
- **Twin Peaks page**: Full interface with:
  - Grid view to browse frames
  - Timeline view for temporal navigation  
  - Dashboard with detailed statistics
  - Optimized search and pagination

### 8. Deployment

**Option 1 - Vercel (recommended)**:
```bash
vercel deploy
```

**Option 2 - VPS with PM2**:
```bash
npm run deploy:pm2            # PM2 configuration
npm run deploy:scheduler      # Tweet scheduler
```

Publishing is now managed via external schedulers or VPS deployments with PM2.

---

## 🗓️ Useful scripts

### 🔧 Development
```bash
npm run dev                   # Start Next.js in development mode
npm run build                 # Production build
npm run start                 # Start production server
npm run lint                  # Code check
```

### 🎬 Frame extraction
```bash
npm run extract:series       # Extraction for TV series
npm run extract:movies       # Extraction for movies
```

### 🗄️ Database
```bash
npm run db:export             # Export Firestore database
npm run db:clone              # Clone a Firestore document for testing
npm run db:schema             # Show database schema
npm run db:import:episode:template    # Import with episode template
npm run db:import:movie:template      # Import with movie template
npm run db:import:episode     # Custom episode import
npm run db:import:file        # Import from file
```

### 🔐 Authentication
```bash
npm run auth:cookies          # Generate cookies.b64 from cookies.json
npm run auth:setup            # Set up authentication environment
```

### 🚀 Deployment
```bash
npm run deploy:pm2            # Deploy with PM2
npm run deploy:server         # Start production server
npm run deploy:scheduler      # Start scheduler on VPS
```

---

## 📁 Project structure

```
src/
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── FrameViewer.tsx       # Optimized frame viewer
│   ├── StatsDashboard.tsx    # Statistics dashboard
│   ├── LanguageSwitcher.tsx  # Language selector
│   └── ThemeToggle.tsx       # Dark/Light theme toggle
├── hooks/            # Custom React hooks
├── types/            # TypeScript definitions
├── config/           # Firebase & Google configurations
├── lib/              # Twitter clients and utilities
├── pages/            # Next.js pages
│   ├── api/         # API routes (tweet, frames, proxy, etc.)
│   ├── index.tsx    # Multilingual home page
│   └── twin-peaks.tsx # Main visualization page
├── scheduler/        # Scheduling scripts
├── services/         # Business logic (drive, firestore, tweets, episodes)
└── utils/            # Manual scripts (export, cookies)

scripts/
├── auth/            # Authentication scripts
├── database/        # Database management scripts
├── deploy/          # Deployment scripts
└── extract/         # Frame extraction scripts

public/locales/      # i18next translation files
```

---

## 🛠️ Tech stack

### 🖥️ Frontend & UI
* **Next.js 15** - React framework with SSR/SSG
* **React 18** - User interface
* **TypeScript** - Static typing
* **Tailwind CSS** - Utility-first styling
* **Lucide React** - Modern icons
* **Class Variance Authority** - Component variant management

### 🌐 Internationalization & Theme
* **i18next** - Multilingual management
* **next-i18next** - Next.js integration
* **react-i18next** - Translation hooks

### ☁️ Cloud Services & APIs
* **Firebase Admin SDK** - Firestore database
* **Google APIs** - Google Drive integration
* **Twitter (via cookies)** - Automated posting

### 🤖 Automation & Scraping  
* **Puppeteer Core** - Browser control
* **Sparticzu Chromium** - Optimized Chromium runtime
* **Cron** - Task scheduling

### 🚀 Deployment & Infrastructure
* **Vercel** - Web hosting
* **PM2** - Process manager for VPS
* **Express** - HTTP server for VPS deployment
* **Axios** - HTTP client
* **Dotenv** - Environment variable management
