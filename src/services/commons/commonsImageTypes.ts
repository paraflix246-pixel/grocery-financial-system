export type CommonsFoodImage = {
  term: string;
  thumbnailUrl: string;
  filePageUrl: string;
  title?: string;
  author?: string;
  license?: string;
};

export type CommonsFoodImageSearchResponse = {
  image: CommonsFoodImage | null;
  error?: string;
};
