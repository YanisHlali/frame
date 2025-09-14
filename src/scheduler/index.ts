import {
  getIndexFolder,
  getLastIndex,
  nextLastIndex,
  nextIndexFolder,
  resetLastIndex,
  getCurrentContentDoc,
  getFolderIds,
  getContentType,
} from "../services/contentDetector";
import { getNextFrameFile } from "../services/driveService";
import { tweetImage } from "../services/tweetService";
import { nextEpisode } from "../services/episodeService";
import { nextMoviePart } from "../services/movieEpisodeService";

export async function startScheduledTweeting(): Promise<void> {
  try {
    let file: { id: string; name: string } | null = null;

    while (!file) {
      const [indexFolder, lastIndex, folderIds] = await Promise.all([
        getIndexFolder(),
        getLastIndex(),
        getFolderIds(),
      ]);

      try {
        file = await getNextFrameFile();
      } catch (err) {
        console.warn(`File not found for index ${lastIndex} in folder ${indexFolder}`);

        const moreFoldersAvailable = indexFolder + 1 < folderIds.length;
        if (moreFoldersAvailable) {
          console.log(`Moving to next folder ${indexFolder + 1}`);
          await nextIndexFolder();
          await resetLastIndex();
        } else {
          console.log("All folders completed. Moving to next content.");
          
          const contentType = getContentType();
          if (contentType === 'movie') {
            await nextMoviePart();
          } else {
            await nextEpisode();
          }
        }
      }
    }

    const lastIndex = await getLastIndex();

    try {
      await tweetImage(file, lastIndex);
      await nextLastIndex();

      if (lastIndex + 1 >= 100) {
        console.log("Last frame of the folder reached, moving to the next.");
        await nextIndexFolder();
        await resetLastIndex();
      }
    } catch (err) {
      console.error("Tweet failed:", err);
      throw err;
    }

    const contentDoc = await getCurrentContentDoc();
    const contentType = getContentType();
    
    if (contentType === 'movie') {
      console.log(`Movie part – folder ${contentDoc.indexFolder} – frame ${contentDoc.lastIndex}`);
    } else {
      console.log(`Episode ${(contentDoc as any).episodeNumber} – folder ${contentDoc.indexFolder} – frame ${contentDoc.lastIndex}`);
    }
  } catch (error) {
    console.error("Error in scheduler:", error);
  }
}