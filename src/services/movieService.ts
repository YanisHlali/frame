import "dotenv/config";
import { firestore } from "../config/firebase";
import admin from "firebase-admin";

const FieldValue = admin.firestore.FieldValue;
const MOVIE_ID = process.env.MOVIE_ID;

export interface MoviePartData {
  title: string;
  year: number;
  folderIds: string[];
  totalFiles: number;
  lastIndex: number;
  indexFolder: number;
}

export async function getMovieDoc() {
  if (!MOVIE_ID) {
    throw new Error("MOVIE_ID environment variable is required.");
  }

  const doc = await firestore.collection("movies").doc(MOVIE_ID).get();
  return doc.data() as {
    title: string;
    current: number;
    order: string[];
  };
}

export async function getCurrentPartId(): Promise<string> {
  const movieData = await getMovieDoc();
  const currentIndex = movieData.current || 0;
  const order = movieData.order || [];
  
  if (currentIndex >= order.length) {
    throw new Error("Current index exceeds order array length.");
  }
  
  return order[currentIndex];
}

export async function getCurrentPartDoc(): Promise<MoviePartData> {
  if (!MOVIE_ID) {
    throw new Error("MOVIE_ID environment variable is required.");
  }

  const currentPartId = await getCurrentPartId();

  const doc = await firestore
    .collection("movies")
    .doc(MOVIE_ID)
    .collection("parts")
    .doc(currentPartId)
    .get();

  if (!doc.exists) {
    throw new Error(`Current movie part ${currentPartId} not found.`);
  }

  return doc.data() as MoviePartData;
}

export async function getCurrentMovieTitle(): Promise<string> {
  const part = await getCurrentPartDoc();
  return part.title ?? 'Movie';
}

export async function getCurrentMovieYear(): Promise<number> {
  const part = await getCurrentPartDoc();
  return part.year ?? new Date().getFullYear();
}

export async function getMovieIndexFolder(): Promise<number> {
  const part = await getCurrentPartDoc();
  return part.indexFolder ?? 0;
}

export async function getMovieLastIndex(): Promise<number> {
  const part = await getCurrentPartDoc();
  return part.lastIndex ?? 0;
}

export async function getMovieTotalFiles(): Promise<number> {
  const part = await getCurrentPartDoc();
  return part.totalFiles ?? 0;
}

export async function getMovieFolderIds(): Promise<string[]> {
  const part = await getCurrentPartDoc();
  return part.folderIds ?? [];
}

export async function getMovieFolderId(): Promise<string> {
  const part = await getCurrentPartDoc();
  const folderId = part.folderIds?.[part.indexFolder];
  if (!folderId) throw new Error("No Drive folder available.");
  return folderId;
}

export async function nextMovieLastIndex(): Promise<void> {
  if (!MOVIE_ID) {
    throw new Error("MOVIE_ID environment variable is required.");
  }

  const currentPartId = await getCurrentPartId();
  const ref = firestore
    .collection("movies")
    .doc(MOVIE_ID)
    .collection("parts")
    .doc(currentPartId);

  await ref.update({
    lastIndex: FieldValue.increment(1),
  });
}

export async function resetMovieLastIndex(): Promise<void> {
  if (!MOVIE_ID) {
    throw new Error("MOVIE_ID environment variable is required.");
  }

  const currentPartId = await getCurrentPartId();
  const ref = firestore
    .collection("movies")
    .doc(MOVIE_ID)
    .collection("parts")
    .doc(currentPartId);

  await ref.update({ lastIndex: 0 });
}

export async function nextMovieIndexFolder(): Promise<void> {
  if (!MOVIE_ID) {
    throw new Error("MOVIE_ID environment variable is required.");
  }

  const currentPartId = await getCurrentPartId();
  const ref = firestore
    .collection("movies")
    .doc(MOVIE_ID)
    .collection("parts")
    .doc(currentPartId);

  await ref.update({
    indexFolder: FieldValue.increment(1),
    lastIndex: 0,
  });
}