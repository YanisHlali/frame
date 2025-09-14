import "dotenv/config";
import { firestore } from "../config/firebase";

const CONTENT_ID = process.env.CONTENT_ID;

export async function nextEpisode(): Promise<void> {
  if (!CONTENT_ID) {
    throw new Error("Missing CONTENT_ID environment variable.");
  }
  
  const contentRef = firestore.collection("content").doc(CONTENT_ID);
  const contentDoc = await contentRef.get();

  if (!contentDoc.exists) throw new Error("Content document not found");

  const contentData = contentDoc.data()!;
  const currentSeasonKey = contentData.order[contentData.current];
  const currentSeason = contentData.items[currentSeasonKey];
  
  if (!currentSeason || !currentSeason.episodes || !currentSeason.current) {
    throw new Error("Current season or episode not found.");
  }

  const episodeIds = Object.keys(currentSeason.episodes).sort((a, b) => {
    const episodeA = currentSeason.episodes![a].episodeNumber;
    const episodeB = currentSeason.episodes![b].episodeNumber;
    return episodeA - episodeB;
  });
  
  const currentEpisodeIndex = episodeIds.indexOf(currentSeason.current.episodeId);
  
  if (currentEpisodeIndex === -1) {
    throw new Error("Current episode not found.");
  }

  if (currentEpisodeIndex + 1 >= episodeIds.length) {
    console.log(
      "All episodes are completed. Moving to the next season."
    );
    return await nextSeason();
  }

  const nextEpisodeId = episodeIds[currentEpisodeIndex + 1];
  const currentSeasonPath = `items.${currentSeasonKey}.current.episodeId`;
  const nextEpisodeLastIndexPath = `items.${currentSeasonKey}.episodes.${nextEpisodeId}.lastIndex`;
  const nextEpisodeIndexFolderPath = `items.${currentSeasonKey}.episodes.${nextEpisodeId}.indexFolder`;

  await contentRef.update({
    [currentSeasonPath]: nextEpisodeId,
    [nextEpisodeLastIndexPath]: 0,
    [nextEpisodeIndexFolderPath]: 0,
  });

  console.log("Moving to the next episode");
}

export async function nextSeason(): Promise<void> {
  if (!CONTENT_ID) {
    throw new Error("Missing CONTENT_ID environment variable.");
  }
  
  const contentRef = firestore.collection("content").doc(CONTENT_ID);
  const contentDoc = await contentRef.get();
  if (!contentDoc.exists) throw new Error("Content document not found");

  const contentData = contentDoc.data()!;
  const currentSeasonIndex = contentData.current;

  if (currentSeasonIndex + 1 >= contentData.order.length) {
    console.log("All seasons are completed.");
    return;
  }

  const nextSeasonKey = contentData.order[currentSeasonIndex + 1];
  const nextSeason = contentData.items[nextSeasonKey];
  
  if (!nextSeason || !nextSeason.episodes) {
    throw new Error("Next season not found or has no episodes.");
  }

  const episodeIds = Object.keys(nextSeason.episodes).sort((a, b) => {
    const episodeA = nextSeason.episodes![a].episodeNumber;
    const episodeB = nextSeason.episodes![b].episodeNumber;
    return episodeA - episodeB;
  });
  
  if (episodeIds.length === 0) {
    throw new Error("No episodes found in the next season.");
  }

  const firstEpisodeId = episodeIds[0];
  const nextSeasonCurrentPath = `items.${nextSeasonKey}.current.episodeId`;
  const firstEpisodeLastIndexPath = `items.${nextSeasonKey}.episodes.${firstEpisodeId}.lastIndex`;
  const firstEpisodeIndexFolderPath = `items.${nextSeasonKey}.episodes.${firstEpisodeId}.indexFolder`;

  await contentRef.update({
    current: currentSeasonIndex + 1,
    [nextSeasonCurrentPath]: firstEpisodeId,
    [firstEpisodeLastIndexPath]: 0,
    [firstEpisodeIndexFolderPath]: 0,
  });

  console.log(`Moving to the next season: ${nextSeasonKey}`);
}
