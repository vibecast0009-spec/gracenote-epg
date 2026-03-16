/** Grid API response types (Gracenote tvlistings) */

export interface Program {
  title: string;
  id: string;
  tmsId: string;
  shortDesc: string;
  season: string;
  releaseYear: string | null;
  episode: string;
  episodeTitle: string | null;
  seriesId: string;
  isGeneric: string;
}

export interface Event {
  callSign: string;
  duration: string;
  startTime: string;
  endTime: string;
  thumbnail: string;
  channelNo: string;
  filter: string[];
  seriesId: string;
  rating: string;
  flag: string[];
  tags: string[];
  program: Program;
}

export interface Channel {
  callSign: string;
  affiliateName: string;
  affiliateCallSign: string | null;
  channelId: string;
  channelNo: string;
  events: Event[];
  id: string;
  stationGenres: boolean[];
  stationFilters: string[];
  thumbnail: string;
}

export interface GridApiResponse {
  channels: Channel[];
}
