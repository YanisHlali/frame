import fs from "fs";
import {
  getCurrentContentDoc,
  getIndexFolder,
  getTotalFiles,
  getContentType,
  getMovieMetadata,
} from "./contentDetector";
import { getContentDoc } from "./firestoreService";
import { downloadImage } from "./driveService";
import TwitterClient from "../lib/twitterClient";

function extractSeasonNumber(seasonId: string): number {
  const match = seasonId.match(/season-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function generateTweetText(
  index: number,
  folder: number,
  totalFiles: number
): Promise<string> {
  const contentType = getContentType();
  const indexText = index + folder * 100 + 1;

  if (contentType === 'movie') {
    const { title, year } = await getMovieMetadata();
    return `${title} (${year}) - Frame ${indexText} of ${totalFiles}`;
  } else {
    const [episodeData, contentData] = await Promise.all([
      getCurrentContentDoc(),
      getContentDoc(),
    ]);

    const episode = (episodeData as any).episodeNumber;
    const currentSeasonKey = contentData.order[contentData.current];
    const currentSeason = contentData.items[currentSeasonKey];
    const season = currentSeason.seasonNumber || extractSeasonNumber(currentSeasonKey);

    const seasonText = season < 10 ? `0${season}` : `${season}`;
    const episodeText = episode < 10 ? `0${episode}` : `${episode}`;

    return `${contentData.title} - S${seasonText}E${episodeText} - Frame ${indexText} of ${totalFiles}`;
  }
}

export async function tweetImage(
  file: { id: string; name: string },
  index: number
): Promise<void> {
  if (!file?.id || !file?.name) {
    throw new Error("Invalid file object: id and name are required");
  }
  
  if (typeof index !== 'number' || index < 0) {
    throw new Error("Invalid index: must be a non-negative number");
  }

  const [folder, totalFiles] = await Promise.all([
    getIndexFolder(),
    getTotalFiles(),
  ]).catch(error => {
    console.error("Failed to fetch required data:", error);
    throw new Error(`Failed to fetch required data: ${error.message}`);
  });

  const localImagePath = await downloadImage(file.id, file.name);
  if (!localImagePath) {
    console.error("Image download failed.");
    throw new Error("Image download failed");
  }

  try {
    const tweetText = await generateTweetText(index, folder, totalFiles);

    const twitter = new TwitterClient({
      debug: process.env.NODE_ENV !== "production",
    });

    await twitter.init();
    await twitter.tweetWithImages({
      content: tweetText,
      imagePaths: [localImagePath],
    });

    console.log(`Tweeted: ${tweetText}`, new Date());
  } catch (error) {
    console.error("Error tweeting image:", error);
    throw error;
  } finally {
    if (fs.existsSync(localImagePath)) {
      try {
        fs.unlinkSync(localImagePath);
        console.log(`Deleted image: ${localImagePath}`);
      } catch (err) {
        console.error("Failed to delete image:", err);
      }
    }
  }
}