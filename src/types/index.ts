export interface Frame {
  id: string;
  url: string;
  seasonKey: string;
  episodeId: string;
  frameNumber: number;
  folderId: string;
  folderIndex: number;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalFrames: number;
  framesPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface Episode {
  episodeNumber: number;
  folderIds: string[];
  totalFiles: number;
  lastIndex: number;
  indexFolder: number;
}

export interface Season {
  type: string;
  title: string;
  seasonNumber?: number;
  year?: number;
  current?: {
    episodeId: string;
  };
  episodes?: Record<string, Episode>;
  folderIds?: string[];
  totalFiles?: number;
  lastIndex?: number;
  indexFolder?: number;
}

export interface ContentData {
  title: string;
  current: number;
  order: string[];
  items: Record<string, {
    type: string;
    title: string;
    seasonNumber?: number;
    year?: number;
    current?: {
      episodeId: string;
    };
    episodes?: Record<string, Episode>;
    folderIds?: string[];
    totalFiles?: number;
    lastIndex?: number;
    indexFolder?: number;
  }>;
}


export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface FramesApiResponse extends ApiResponse {
  frames: Frame[];
  pagination: Pagination;
  filters: {
    season: string | null;
    episode: string | null;
  };
  debug?: {
    method: string;
    note: string;
  };
}



export interface DriveFile {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  mimeType?: string;
}