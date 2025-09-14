import "dotenv/config";
import { firestore } from "../config/firebase";

const MOVIE_ID = process.env.MOVIE_ID;

export async function nextMoviePart(): Promise<void> {
  if (!MOVIE_ID) {
    throw new Error("Missing MOVIE_ID environment variable.");
  }

  const movieRef = firestore.collection("movies").doc(MOVIE_ID);
  const movieDoc = await movieRef.get();

  if (!movieDoc.exists) {
    throw new Error("Movie document not found");
  }

  const data = movieDoc.data();
  const currentIndex = data?.current || 0;
  const order = data?.order || [];

  if (!Array.isArray(order) || order.length === 0) {
    throw new Error("Order array not found or empty.");
  }

  if (currentIndex + 1 >= order.length) {
    console.log("All parts of the movie are completed.");
    return;
  }

  const nextIndex = currentIndex + 1;
  const nextPartId = order[nextIndex];

  const nextPartRef = movieRef.collection("parts").doc(nextPartId);
  const nextPartDoc = await nextPartRef.get();

  if (!nextPartDoc.exists) {
    throw new Error(`Next movie part ${nextPartId} not found in parts collection.`);
  }

  await movieRef.update({
    "current": nextIndex,
  });

  await nextPartRef.update({
    lastIndex: 0,
    indexFolder: 0,
  });

  const nextPartData = nextPartDoc.data();
  console.log(
    `Moving to the next part: ${nextPartData?.title} (${nextPartData?.year}) - Index ${nextIndex}`
  );
}