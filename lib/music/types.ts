export interface JioSaavnDownloadUrl {
  quality: string;
  url?: string;
  link?: string;
}

export interface JioSaavnImage {
  quality: string;
  url?: string;
  link?: string;
}

export interface JioSaavnRawSong {
  id?: string;
  song?: string;
  name?: string;
  title?: string;
  singers?: string;
  primaryArtists?: string;
  artist?: string;
  album?: string | { name?: string };
  image?: string | JioSaavnImage[];
  artwork?: string;
  duration?: number | string;
  downloadUrl?: JioSaavnDownloadUrl[];
  media_url?: string;
}

export interface JioSaavnApiResponse {
  status?: string;
  success?: boolean;
  data?: JioSaavnRawSong | JioSaavnRawSong[];
  results?: JioSaavnRawSong[];
}
