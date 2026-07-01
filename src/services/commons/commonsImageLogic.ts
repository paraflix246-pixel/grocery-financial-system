import {
  meetsCommonsRelevanceThreshold,
  scoreCommonsImageTitle,
} from '@/src/services/commons/commonsImageRelevanceLogic';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { buildCommonsFilePageUrl } from '@/src/services/commons/curatedFoodImages';

export const COMMONS_API_BASE = 'https://commons.wikimedia.org/w/api.php';
export const COMMONS_THUMB_WIDTH = 200;
export const COMMONS_SEARCH_RESULT_LIMIT = 15;

type CommonsExtMetadataField = { value?: string };
type CommonsExtMetadata = Record<string, CommonsExtMetadataField | undefined>;

type CommonsImageInfo = {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  user?: string;
  extmetadata?: CommonsExtMetadata;
};

type CommonsPage = {
  title?: string;
  missing?: string;
  imageinfo?: CommonsImageInfo[];
};

type CommonsQueryResponse = {
  query?: {
    pages?: Record<string, CommonsPage>;
  };
};

export function normalizeCommonsFoodTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildCommonsSearchTerm(foodName: string): string {
  const normalized = normalizeCommonsFoodTerm(foodName);
  if (!normalized) return '';
  return `${normalized} food`;
}

export function buildCommonsApiUrl(input: {
  searchTerm: string;
  thumbWidth?: number;
  limit?: number;
}): string {
  const url = new URL(COMMONS_API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', input.searchTerm);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', String(input.limit ?? COMMONS_SEARCH_RESULT_LIMIT));
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|extmetadata|user');
  url.searchParams.set('iiurlwidth', String(input.thumbWidth ?? COMMONS_THUMB_WIDTH));
  url.searchParams.set('format', 'json');
  return url.toString();
}

export function stripCommonsHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function readExtMetadataField(metadata: CommonsExtMetadata | undefined, key: string): string | undefined {
  const raw = metadata?.[key]?.value;
  if (!raw?.trim()) return undefined;
  const cleaned = stripCommonsHtml(raw);
  return cleaned || undefined;
}

export function buildCommonsFileInfoUrl(input: {
  fileTitle: string;
  thumbWidth?: number;
}): string {
  const url = new URL(COMMONS_API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', `File:${input.fileTitle}`);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|extmetadata|user');
  url.searchParams.set('iiurlwidth', String(input.thumbWidth ?? COMMONS_THUMB_WIDTH));
  url.searchParams.set('format', 'json');
  return url.toString();
}

function buildCommonsFoodImageFromPage(
  page: CommonsPage,
  term: string,
  fallbackAuthor?: string,
  fallbackLicense?: string
): CommonsFoodImage | null {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl) return null;

  const fileTitle = page.title?.replace(/^File:/i, '').trim();
  const filePageUrl =
    info.descriptionurl?.trim() ?? (fileTitle ? buildCommonsFilePageUrl(fileTitle) : undefined);
  if (!filePageUrl) return null;

  const author =
    readExtMetadataField(info.extmetadata, 'Artist') ??
    readExtMetadataField(info.extmetadata, 'Credit') ??
    info.user?.trim() ??
    fallbackAuthor;

  const license =
    readExtMetadataField(info.extmetadata, 'LicenseShortName') ??
    readExtMetadataField(info.extmetadata, 'UsageTerms') ??
    fallbackLicense;

  return {
    term,
    thumbnailUrl: info.thumburl,
    filePageUrl,
    title: fileTitle ? stripCommonsHtml(fileTitle) : undefined,
    author,
    license,
  };
}

export function pickBestScoredCommonsPage(
  pages: Record<string, CommonsPage>,
  term: string
): { page: CommonsPage; score: number } | null {
  let best: { page: CommonsPage; score: number } | null = null;

  for (const page of Object.values(pages)) {
    const title = page.title ?? '';
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;

    const score = scoreCommonsImageTitle(title, term);
    if (score < 0) continue;
    if (!best || score > best.score) {
      best = { page, score };
    }
  }

  return best;
}

export function parseCommonsFileInfoResponse(
  payload: CommonsQueryResponse,
  term: string,
  options?: { fallbackAuthor?: string; fallbackLicense?: string }
): CommonsFoodImage | null {
  const pages = payload.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages)) {
    if (page.missing !== undefined) continue;
    const image = buildCommonsFoodImageFromPage(
      page,
      term,
      options?.fallbackAuthor,
      options?.fallbackLicense
    );
    if (image) return image;
  }

  return null;
}

export function parseCommonsSearchResponse(
  payload: CommonsQueryResponse,
  term: string
): CommonsFoodImage | null {
  const pages = payload.query?.pages;
  if (!pages) return null;

  const best = pickBestScoredCommonsPage(pages, term);
  if (!best || !meetsCommonsRelevanceThreshold(best.score)) return null;

  return buildCommonsFoodImageFromPage(best.page, term);
}
