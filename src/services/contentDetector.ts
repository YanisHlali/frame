import * as seriesService from './firestoreService';
import * as movieService from './movieService';

export type ContentType = 'movie' | 'series';

export function getContentType(): ContentType {
  if (process.env.MOVIE_ID) return 'movie';
  if (process.env.CONTENT_ID) return 'series';
  
  throw new Error("Neither MOVIE_ID nor CONTENT_ID found in environment");
}

export async function getIndexFolder(): Promise<number> {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getMovieIndexFolder();
  } else {
    return seriesService.getIndexFolder();
  }
}

export async function getLastIndex(): Promise<number> {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getMovieLastIndex();
  } else {
    return seriesService.getLastIndex();
  }
}

export async function getTotalFiles(): Promise<number> {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getMovieTotalFiles();
  } else {
    return seriesService.getTotalFiles();
  }
}

export async function getFolderIds(): Promise<string[]> {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getMovieFolderIds();
  } else {
    return seriesService.getFolderIds();
  }
}

export async function getFolderId(): Promise<string> {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getMovieFolderId();
  } else {
    return seriesService.getFolderId();
  }
}

export async function nextLastIndex(): Promise<void> {
  const type = getContentType();
  
  if (type === 'movie') {
    await movieService.nextMovieLastIndex();
  } else {
    await seriesService.nextLastIndex();
  }
}

export async function resetLastIndex(): Promise<void> {
  const type = getContentType();
  
  if (type === 'movie') {
    await movieService.resetMovieLastIndex();
  } else {
    await seriesService.resetLastIndex();
  }
}

export async function nextIndexFolder(): Promise<void> {
  const type = getContentType();
  
  if (type === 'movie') {
    await movieService.nextMovieIndexFolder();
  } else {
    await seriesService.nextIndexFolder();
  }
}

export async function getCurrentContentDoc() {
  const type = getContentType();
  
  if (type === 'movie') {
    return movieService.getCurrentPartDoc();
  } else {
    return seriesService.getCurrentEpisodeDoc();
  }
}

export async function getContentTitle(): Promise<string> {
  const type = getContentType();
  
  if (type === 'movie') {
    const doc = await movieService.getMovieDoc();
    return doc.title;
  } else {
    const doc = await seriesService.getContentDoc();
    return doc.title || 'Series';
  }
}

export async function getMovieMetadata(): Promise<{ title: string; year: number }> {
  const type = getContentType();
  
  if (type !== 'movie') {
    throw new Error("getMovieMetadata can only be called for movies");
  }
  
  return {
    title: await movieService.getCurrentMovieTitle(),
    year: await movieService.getCurrentMovieYear(),
  };
}