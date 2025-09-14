require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccountJSON = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJSON);

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

function extractDriveIds(urls) {
  if (typeof urls === 'string') {
    urls = [urls];
  }
  
  const regex = /https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/g;
  const ids = [];
  
  for (const url of urls) {
    let match;
    while ((match = regex.exec(url)) !== null) {
      ids.push(match[1]);
    }
  }
  
  return ids;
}

async function importEpisode(data) {
  const contentId = process.env.CONTENT_ID || 'twin-peaks-complete';
  
  const contentRef = db.collection('content').doc(contentId);
  const contentDoc = await contentRef.get();
  
  if (!contentDoc.exists) {
    console.log(`Error: Document content/${contentId} not found.`);
    console.log('Run first: node scripts/database/create-twin-peaks-content.js');
    return;
  }
  
  let folderIds = data.folderIds || [];
  if (folderIds.length > 0 && typeof folderIds[0] === 'string' && folderIds[0].includes('drive.google.com')) {
    folderIds = extractDriveIds(folderIds);
    console.log(`Extracted ${folderIds.length} IDs from URLs`);
  }

  if (folderIds.length === 0) {
    console.log('No folderIds found');
    return;
  }
  
  const updateData = {
    [`items.${data.season}.episodes.episode-${data.episode}.folderIds`]: folderIds,
    [`items.${data.season}.episodes.episode-${data.episode}.totalFiles`]: data.totalFiles || 0,
  };
  
  if (data.lastIndex !== undefined) {
    updateData[`items.${data.season}.episodes.episode-${data.episode}.lastIndex`] = data.lastIndex;
  }
  if (data.indexFolder !== undefined) {
    updateData[`items.${data.season}.episodes.episode-${data.episode}.indexFolder`] = data.indexFolder;
  }
  if (data.episodeNumber !== undefined) {
    updateData[`items.${data.season}.episodes.episode-${data.episode}.episodeNumber`] = data.episodeNumber;
  }
  
  await contentRef.update(updateData);

  console.log(`Episode updated: ${data.season}/episode-${data.episode}`);
  console.log(`${folderIds.length} folders, ${data.totalFiles || 0} files`);
}

async function importMovie(data) {
  const contentId = process.env.CONTENT_ID || 'twin-peaks-complete';
  
  const contentRef = db.collection('content').doc(contentId);
  
  let folderIds = data.folderIds || [];
  if (folderIds.length > 0 && typeof folderIds[0] === 'string' && folderIds[0].includes('drive.google.com')) {
    folderIds = extractDriveIds(folderIds);
    console.log(`Extracted ${folderIds.length} IDs from URLs`);
  }
  
  const updateData = {
    [`items.${data.movie}.folderIds`]: folderIds,
    [`items.${data.movie}.totalFiles`]: data.totalFiles || 0,
  };
  
  if (data.lastIndex !== undefined) {
    updateData[`items.${data.movie}.lastIndex`] = data.lastIndex;
  }
  if (data.indexFolder !== undefined) {
    updateData[`items.${data.movie}.indexFolder`] = data.indexFolder;
  }
  
  await contentRef.update(updateData);

  console.log(`Movie updated: ${data.movie}`);
  console.log(`${folderIds.length} folders, ${data.totalFiles || 0} files`);
}

function generateEpisodeTemplate() {
  const template = {
    season: "season-2",
    episode: 2,
    totalFiles: 2894,
    folderIds: [
      "FOLDER_ID1",
      "FOLDER_ID2",
      "FOLDER_ID3"
    ]
  };
  
  fs.writeFileSync('episode-template.json', JSON.stringify(template, null, 2));
  console.log('Template created: episode-template.json');
  console.log('Replace the URLs and run: node scripts/database/import-episode.js episode-template.json');
}

function generateMovieTemplate() {
  const template = {
    movie: "fire-walk-with-me",
    totalFiles: 165000,
    urls: [
      "FOLDER_ID1",
      "FOLDER_ID2",
      "FOLDER_ID3"
    ]
  };
  
  fs.writeFileSync('movie-template.json', JSON.stringify(template, null, 2));
  console.log('Template created: movie-template.json');
  console.log('Replace the URLs and run: node scripts/database/import-episode.js movie-template.json');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'episode-template') {
    generateEpisodeTemplate();
    return;
  }
  
  if (args[0] === 'movie-template') {
    generateMovieTemplate();
    return;
  }
  
  if (args.length === 0) {
    console.log('Import Episode/Movie - Twin Peaks');
    console.log('Usage:');
    console.log('  node scripts/database/import-episode.js episode-template');
    console.log('  node scripts/database/import-episode.js movie-template');
    console.log('  node scripts/database/import-episode.js <file.json>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/database/import-episode.js episode-template');
    console.log('  node scripts/database/import-episode.js s2e2.json');
    return;
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (data.season && data.episode) {
      await importEpisode(data);
    } else if (data.movie) {
      await importMovie(data);
    } else {
      console.log('Unrecognized format. JSON must contain either {season, episode} or {movie}');
    }
    
  } catch (error) {
    console.error('Import error:', error);
  }
}

if (require.main === module) {
  main();
}