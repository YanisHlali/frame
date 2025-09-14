import "dotenv/config";
import { firestore } from "../config/firebase";
import admin from "firebase-admin";

const FieldValue = admin.firestore.FieldValue;

const CONTENT_ID = process.env.CONTENT_ID;

export interface EpisodeData {
  episodeNumber: number;
  folderIds: string[];
  totalFiles: number;
  lastIndex: number;
  indexFolder: number;
}

export async function getContentDoc() {
  if (!CONTENT_ID) {
    throw new Error("CONTENT_ID environment variable is required.");
  }

  const doc = await firestore.collection("content").doc(CONTENT_ID).get();
  return doc.data() as {
    title: string;
    current: number;
    order: string[];
    items: {
      [key: string]: {
        type: string;
        title: string;
        seasonNumber?: number;
        year?: number;
        current?: {
          episodeId: string;
        };
        episodes?: {
          [episodeId: string]: EpisodeData;
        };
        folderIds?: string[];
        totalFiles?: number;
        lastIndex?: number;
        indexFolder?: number;
      };
    };
  };
}

export async function getCurrentEpisodeDoc(): Promise<EpisodeData> {
  if (!CONTENT_ID) {
    throw new Error("CONTENT_ID environment variable is required.");
  }

  const contentDoc = await getContentDoc();
  const currentSeasonKey = contentDoc.order[contentDoc.current];
  const currentSeason = contentDoc.items[currentSeasonKey];
  
  if (!currentSeason || !currentSeason.current || !currentSeason.episodes) {
    throw new Error("Current season or episode not found");
  }
  
  const currentEpisode = currentSeason.episodes[currentSeason.current.episodeId];
  if (!currentEpisode) {
    throw new Error("Current episode not found");
  }
  
  return currentEpisode;
}

export async function getIndexFolder(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.indexFolder ?? 0;
}

export async function getLastIndex(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.lastIndex ?? 0;
}

export async function getTotalFiles(): Promise<number> {
  const ep = await getCurrentEpisodeDoc();
  return ep.totalFiles ?? 0;
}

export async function getFolderIds(): Promise<string[]> {
  const ep = await getCurrentEpisodeDoc();
  return ep.folderIds ?? [];
}

export async function getFolderId(): Promise<string> {
  const ep = await getCurrentEpisodeDoc();
  const folderId = ep.folderIds?.[ep.indexFolder];
  if (!folderId) throw new Error("No Drive folder available.");
  return folderId;
}

export async function nextLastIndex(): Promise<void> {
  if (!CONTENT_ID) {
    throw new Error("CONTENT_ID environment variable is required.");
  }

  const contentDoc = await getContentDoc();
  const currentSeasonKey = contentDoc.order[contentDoc.current];
  const currentSeason = contentDoc.items[currentSeasonKey];
  
  if (!currentSeason || !currentSeason.current) {
    throw new Error("Current season or episode not found");
  }

  const updatePath = `items.${currentSeasonKey}.episodes.${currentSeason.current.episodeId}.lastIndex`;
  
  await firestore.collection("content").doc(CONTENT_ID).update({
    [updatePath]: FieldValue.increment(1),
  });
}

export async function resetLastIndex(): Promise<void> {
  if (!CONTENT_ID) {
    throw new Error("CONTENT_ID environment variable is required.");
  }

  const contentDoc = await getContentDoc();
  const currentSeasonKey = contentDoc.order[contentDoc.current];
  const currentSeason = contentDoc.items[currentSeasonKey];
  
  if (!currentSeason || !currentSeason.current) {
    throw new Error("Current season or episode not found");
  }

  const updatePath = `items.${currentSeasonKey}.episodes.${currentSeason.current.episodeId}.lastIndex`;
  
  await firestore.collection("content").doc(CONTENT_ID).update({
    [updatePath]: 0,
  });
}

export async function nextIndexFolder(): Promise<void> {
  if (!CONTENT_ID) {
    throw new Error("CONTENT_ID environment variable is required.");
  }

  const contentDoc = await getContentDoc();
  const currentSeasonKey = contentDoc.order[contentDoc.current];
  const currentSeason = contentDoc.items[currentSeasonKey];
  
  if (!currentSeason || !currentSeason.current) {
    throw new Error("Current season or episode not found");
  }

  const updatePath = `items.${currentSeasonKey}.episodes.${currentSeason.current.episodeId}.indexFolder`;
  
  await firestore.collection("content").doc(CONTENT_ID).update({
    [updatePath]: FieldValue.increment(1),
  });
}
