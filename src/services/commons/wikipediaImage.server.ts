import { normalizeCommonsFoodTerm } from '@/src/services/commons/commonsImageLogic';
import {
  meetsCommonsRelevanceThreshold,
  scoreCommonsImageTitle,
  toWikipediaPageTitle,
} from '@/src/services/commons/commonsImageRelevanceLogic';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { buildCommonsFilePageUrl } from '@/src/services/commons/curatedFoodImages';

const USER_AGENT = 'PennyPantry/1.0 (grocery-financial-system; contact: dev@pennypantry.app)';
export const WIKIPEDIA_SUMMARY_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary';

type WikipediaSummaryResponse = {
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: {
    source?: string;
    width?: number;
    height?: number;
  };
  originalimage?: {
    source?: string;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

export function buildWikipediaSummaryUrl(term: string): string {
  const pageTitle = toWikipediaPageTitle(term);
  return `${WIKIPEDIA_SUMMARY_BASE}/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;
}

export function extractCommonsFileTitleFromUploadUrl(uploadUrl: string): string | null {
  const thumbMatch = uploadUrl.match(/\/commons\/thumb\/[^/]+\/[^/]+\/([^/]+)\/\d+px-/i);
  if (thumbMatch?.[1]) {
    return decodeURIComponent(thumbMatch[1].replace(/_/g, ' '));
  }

  const directMatch = uploadUrl.match(/\/commons\/[a-f0-9]\/[a-f0-9]{2}\/([^/?#]+)$/i);
  if (directMatch?.[1]) {
    return decodeURIComponent(directMatch[1].replace(/_/g, ' '));
  }

  return null;
}

export function parseWikipediaSummaryResponse(
  payload: WikipediaSummaryResponse,
  term: string
): CommonsFoodImage | null {
  const thumbnailUrl = payload.thumbnail?.source?.trim();
  if (!thumbnailUrl) return null;

  const fileTitle =
    extractCommonsFileTitleFromUploadUrl(payload.originalimage?.source ?? thumbnailUrl) ??
    undefined;

  if (fileTitle) {
    const score = scoreCommonsImageTitle(`File:${fileTitle}`, normalizeCommonsFoodTerm(term));
    if (!meetsCommonsRelevanceThreshold(score)) return null;
  }

  const filePageUrl = fileTitle
    ? buildCommonsFilePageUrl(fileTitle)
    : payload.content_urls?.desktop?.page?.trim();

  if (!filePageUrl) return null;

  return {
    term: normalizeCommonsFoodTerm(term),
    thumbnailUrl,
    filePageUrl,
    title: fileTitle ?? payload.title,
    author: payload.description ? `Wikipedia — ${payload.description}` : 'Wikipedia',
    license: 'Wikipedia',
  };
}

export async function fetchWikipediaLeadFoodImage(input: {
  term: string;
}): Promise<CommonsFoodImage | null> {
  const normalizedTerm = normalizeCommonsFoodTerm(input.term);
  if (!normalizedTerm) return null;

  const url = buildWikipediaSummaryUrl(normalizedTerm);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Wikipedia summary failed (${response.status})`);
  }

  const payload = (await response.json()) as WikipediaSummaryResponse;
  return parseWikipediaSummaryResponse(payload, normalizedTerm);
}
