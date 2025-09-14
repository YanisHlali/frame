# 🎞️ Frame – Every Frame In Order [DEV]

> 🧪 Démo en ligne : [@TwinPeaksShot](https://x.com/TwinPeaksShot)

Ce projet automatise l'extraction, la publication et le suivi de chaque frame d'un épisode vidéo, image par image, sur Twitter. Il est conçu pour être utilisé avec **n'importe quelle série** ou contenu vidéo, en adaptant les métadonnées et le contenu de la base de données. Le répertoire actuel est configuré pour une série spécifique, mais le système est générique.

Il combine Puppeteer, Firebase, Google Drive et Twitter (via cookies) pour orchestrer l'ensemble du processus.

## ⚙️ Fonctionnalités

* **Extraction des frames** d'un épisode vidéo avec support des séries et films.
* **Interface Web interactive** pour visualiser et parcourir les frames :
  - 🖼️ **FrameViewer** avec Next.js Image pour un chargement optimisé
  - 📊 **Tableau de bord statistiques** avec métriques détaillées
  - 🌐 **Support multilingue** (i18next)
  - 🌙 **Mode sombre/clair** avec ThemeToggle
* **Upload sur Google Drive** avec organisation par épisode et intégration API.
* **Stockage des métadonnées** (frames, timestamps, liens) dans Firebase Firestore.
* **Publication automatique et planifiée** des frames sur Twitter via une API custom.
* **Import d'épisodes et films** via templates JSON configurables.
* **Gestion avancée de la pagination** avec chargement optimisé.
* **Système de proxy d'images** pour améliorer les performances.
* **Déploiement flexible** (Vercel, VPS avec PM2).

---

## 🚀 Étapes d’installation & d’utilisation

### 1. Récupérer l’épisode

Télécharge le fichier vidéo de l’épisode à traiter.

### 2. Extraire les frames

Utilise les scripts d'extraction pour extraire chaque image de l'épisode en format `.jpg` ou `.png`.

```bash
npm run extract:series       # Pour les séries TV
npm run extract:movies       # Pour les films
```

> 💡 Chaque image doit être nommée dans un format cohérent (ex: `frame_000001.jpg`).

### 3. Upload vers Google Drive

Les images doivent être uploadées sur un dossier Google Drive spécifique au projet. Le script utilise l’API Google Drive pour gérer les uploads et récupérer les URLs publiques.

#### 🗃️ Schéma d'organisation des frames sur Drive

```
Drive root
└── Twin Peaks
    └── Twin_Peaks_S01E01                      # Dossier principal de l’épisode
        ├── Twin_Peaks_S01_E01_1               # Dossier découpé contenant 100 frames
        │   ├── frame_0001.png
        │   └── ...
        └── Twin_Peaks_S01_E01_2
            ├── frame_0101.png
            └── ...
```

> 📂 Chaque sous-dossier correspond à un `folderId` référencé dans Firestore.

### 4. Configurer Firebase

Crée une base de données Firestore sur [Firebase Console](https://console.firebase.google.com/), puis :

* Crée une collection `series` contenant les données.
* Fournis un **Service Account JSON** encodé en base64.

#### 📁 Schéma de la base Firestore

```
[series-id] (document)
├── title: string                         # Titre de la série
├── current: number                       # Index du contenu actuellement publié
├── order: array<string>                  # Ordre de publication des contenus
└── items: {
     [content-id]: {
       // Pour les films
       type: "movie",
       title: string,
       year: number,
       folderIds: array<string>,          # Dossiers Drive contenant les frames
       totalFiles: number,
       lastIndex: number,
       indexFolder: number
       
       // Pour les saisons
       type: "season",
       title: string,
       seasonNumber: number,
       current: { episodeId: string },    # Épisode actuellement publié
       episodes: {
         [episode-id]: {
           episodeNumber: number,
           folderIds: array<string>,      # Dossiers Drive contenant les frames
           totalFiles: number,
           lastIndex: number,
           indexFolder: number
         }
       }
     }
   }
```

> 🔹 Le champ `current` (numérique) permet de suivre l'index dans l'`order` du contenu en cours de publication.  
> 🔹 Pour les saisons, un sous-champ `current.episodeId` indique l'épisode actuellement publié.

### 5. Remplir le fichier `.env`

Crée un fichier `.env` à la racine du projet avec les variables suivantes :

```env
CRON_SECRET=...
GOOGLE_APPLICATION_CREDENTIALS_BASE64=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
COOKIES_BASE64=...
CONTENT_ID=your-content-id
```

* `CRON_SECRET` : secret partagé pour sécuriser les requêtes cron.
* `GOOGLE_APPLICATION_CREDENTIALS_BASE64` : identifiants d’accès à l’API Google Drive.
* `FIREBASE_SERVICE_ACCOUNT_BASE64` : compte de service Firebase encodé.
* `COOKIES_BASE64` : cookies Twitter exportés au format base64.
* `CONTENT_ID` : ID du document `content` dans Firestore.

> ℹ️ Tu peux utiliser :

```bash
npm run auth:cookies         # Génère cookies.b64 depuis cookies.json  
npm run auth:setup           # Configure l'environnement d'authentification
```

### 6. Configuration des templates

Le système utilise des templates JSON pour importer les métadonnées d'épisodes et de films :

```bash
# Exemple de template d'épisode (episode-template.json)
{
  "season": "season-1",
  "episode": 1,
  "totalFiles": 5643,
  "folderIds": ["folder-id-1", "folder-id-2", ...]
}
```

Pour importer :
```bash
npm run db:import:episode:template    # Import le template d'épisode
npm run db:import:movie:template      # Import le template de film
```

### 7. Interface Web

Accède à l'interface de visualisation :
- **Page d'accueil** : Présentation multilingue avec thèmes
- **Page Twin Peaks** : Interface complète avec :
  - Vue grille pour parcourir les frames
  - Vue chronologique pour navigation temporelle  
  - Tableau de bord avec statistiques détaillées
  - Recherche et pagination optimisées

### 8. Déploiement

**Option 1 - Vercel (recommandé)** :
```bash
vercel deploy
```

**Option 2 - VPS avec PM2** :
```bash
npm run deploy:pm2            # Configuration PM2
npm run deploy:scheduler      # Scheduler de tweets
```

La publication est désormais gérée via des schedulers externes ou des déploiements VPS avec PM2.

---

## 🗓️ Scripts utiles

### 🔧 Développement
```bash
npm run dev                   # Démarre Next.js en mode développement
npm run build                 # Build de production
npm run start                 # Démarre le serveur de production
npm run lint                  # Vérification du code
```

### 🎬 Extraction de frames
```bash
npm run extract:series       # Extraction pour les séries TV
npm run extract:movies       # Extraction pour les films
```

### 🗄️ Base de données
```bash
npm run db:export             # Exporte la base Firestore
npm run db:clone              # Clone un document Firestore en test
npm run db:schema             # Affiche le schéma de la base
npm run db:import:episode:template    # Import avec template d'épisode
npm run db:import:movie:template      # Import avec template de film
npm run db:import:episode     # Import d'épisode personnalisé
npm run db:import:file        # Import depuis fichier
```

### 🔐 Authentification
```bash
npm run auth:cookies          # Génère cookies.b64 depuis cookies.json
npm run auth:setup            # Configure l'environnement d'authentification
```

### 🚀 Déploiement
```bash
npm run deploy:pm2            # Déploiement avec PM2
npm run deploy:server         # Démarre le serveur de production
npm run deploy:scheduler      # Lance le scheduler sur VPS
```

---

## 📁 Structure du projet

```
src/
├── components/       # Composants React
│   ├── ui/          # Composants UI réutilisables
│   ├── FrameViewer.tsx       # Visionneuse de frames optimisée
│   ├── StatsDashboard.tsx    # Tableau de bord statistiques
│   ├── LanguageSwitcher.tsx  # Sélecteur de langue
│   └── ThemeToggle.tsx       # Basculeur thème sombre/clair
├── hooks/            # Hooks React personnalisés
├── types/            # Définitions TypeScript
├── config/           # Configurations Firebase & Google
├── lib/              # Clients Twitter et utilitaires
├── pages/            # Pages Next.js
│   ├── api/         # Routes API (tweet, frames, proxy, etc.)
│   ├── index.tsx    # Page d'accueil multilingue
│   └── twin-peaks.tsx # Page principale de visualisation
├── scheduler/        # Scripts de planification
├── services/         # Logique métier (drive, firestore, tweets, episodes)
└── utils/            # Scripts manuels (export, cookies)

scripts/
├── auth/            # Scripts d'authentification
├── database/        # Scripts de gestion de la base
├── deploy/          # Scripts de déploiement
└── extract/         # Scripts d'extraction de frames

public/locales/      # Fichiers de traduction i18next
```

---

## 🛠️ Stack technique

### 🖥️ Frontend & UI
* **Next.js 15** - Framework React avec SSR/SSG
* **React 18** - Interface utilisateur
* **TypeScript** - Typage statique
* **Tailwind CSS** - Styling utilitaire
* **Lucide React** - Icônes modernes
* **Class Variance Authority** - Gestion des variantes de composants

### 🌐 Internationalisation & Thème
* **i18next** - Gestion multilingue
* **next-i18next** - Intégration Next.js
* **react-i18next** - Hooks de traduction

### ☁️ Services Cloud & APIs
* **Firebase Admin SDK** - Base de données Firestore
* **Google APIs** - Intégration Google Drive
* **Twitter (via cookies)** - Publication automatisée

### 🤖 Automatisation & Scraping  
* **Puppeteer Core** - Contrôle du navigateur
* **Sparticzu Chromium** - Runtime Chromium optimisé
* **Cron** - Planification des tâches

### 🚀 Déploiement & Infrastructure
* **Vercel** - Hébergement web
* **PM2** - Gestionnaire de processus pour VPS
* **Express** - Serveur HTTP pour déploiement VPS
* **Axios** - Client HTTP
* **Dotenv** - Gestion des variables d'environnement
