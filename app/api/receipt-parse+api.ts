import type { ParsedReceiptDraft } from '@/src/models/types';

import { parseReceiptText } from '@/src/services/receiptParser';
import { resolveProductionSafeUrl } from '@/src/utils/productionEnvGuard';

import { fetchReceiptOcrOverlay } from '@/src/services/ocr/fetchReceiptOcrOverlay';
import {
  applyFragmentRepairsToDraft,
  buildLineItemsFromOverlay,
  buildRepairCandidatesFromDraft,
  pickOcrDraftLineItems,
  type FragmentRepairCandidate,
} from '@/src/utils/ocrSpatialLayout';

import {

  buildReceiptDeepSeekAuditPrompt,

  buildReceiptParsePrompt,

  buildReceiptParseTextOnlyPrompt,

  buildFragmentRepairPrompt,

  FRAGMENT_REPAIR_SYSTEM_PROMPT,

  MIN_REPAIR_CONFIDENCE,

  parseJsonContent,

  RECEIPT_DEEPSEEK_AUDIT_SYSTEM_PROMPT,

  RECEIPT_PARSE_SYSTEM_PROMPT,

  RECEIPT_PARSE_TEXT_SYSTEM_PROMPT,

  type ChatCompletionResponse,

  type FragmentRepairInput,

  type FragmentRepairOutput,

} from '@/src/services/receiptAiPrompt';

import {
  finalizeReceiptDraft,
  normalizeParsedReceiptDraft,
  restoreReadableNamesFromPrimary,
  stripFooterLineItems,
  buildOcrUnreadablePriceSlots,
} from '@/src/utils/receiptDraftNormalizer';



const OPENAI_MODEL = process.env.OPENAI_RECEIPT_MODEL?.trim() || 'gpt-4o-mini';

const DEEPSEEK_MODEL = process.env.DEEPSEEK_RECEIPT_MODEL?.trim() || 'deepseek-chat';



type OpenAiContentPart =

  | { type: 'text'; text: string }

  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };



async function callOpenAiJson(options: {

  apiKey: string;

  systemPrompt: string;

  userContent: OpenAiContentPart[];

}): Promise<unknown | null> {

  const response = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${options.apiKey}`,

    },

    body: JSON.stringify({

      model: OPENAI_MODEL,

      temperature: 0,

      response_format: { type: 'json_object' },

      messages: [

        { role: 'system', content: options.systemPrompt },

        { role: 'user', content: options.userContent },

      ],

    }),

  });



  if (!response.ok) {

    console.warn('OpenAI API error:', response.status, await response.text());

    return null;

  }



  const payload = (await response.json()) as ChatCompletionResponse;

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) return null;



  return parseJsonContent(content);

}



function withImage(

  prompt: string,

  imageBase64?: string | null,

  imageBase64Segments?: string[]

): OpenAiContentPart[] {

  const content: OpenAiContentPart[] = [{ type: 'text', text: prompt }];

  if (imageBase64) {

    content.push({ type: 'text', text: 'Full receipt image:' });

    content.push({

      type: 'image_url',

      image_url: {

        url: `data:image/jpeg;base64,${imageBase64}`,

        detail: 'high',

      },

    });

  }

  if (imageBase64Segments?.length) {

    content.push({

      type: 'text',

      text:

        'The following overlapping vertical slices are the same receipt at higher readable resolution. Use them to find rows missed in the full image.',

    });

    imageBase64Segments.forEach((segment, index) => {

      content.push({ type: 'text', text: `Receipt slice ${index + 1} of ${imageBase64Segments.length}:` });

      content.push({

        type: 'image_url',

        image_url: {

          url: `data:image/jpeg;base64,${segment}`,

          detail: 'high',

        },

      });

    });

  }

  return content;

}



async function parseWithOpenAITextOnly(options: {
  apiKey: string;
  ocrText: string;
  initialDraft?: ParsedReceiptDraft;
}): Promise<ParsedReceiptDraft | null> {
  const parsed = await callOpenAiJson({
    apiKey: options.apiKey,
    systemPrompt: RECEIPT_PARSE_TEXT_SYSTEM_PROMPT,
    userContent: [
      {
        type: 'text',
        text: buildReceiptParseTextOnlyPrompt(options.ocrText, options.initialDraft),
      },
    ],
  });

  if (!parsed) return null;
  return normalizeParsedReceiptDraft(parsed as Record<string, unknown>, options.initialDraft);
}

async function parseWithOpenAI(options: {

  apiKey: string;

  ocrText?: string;

  initialDraft?: ParsedReceiptDraft;

  imageBase64?: string | null;

  imageBase64Segments?: string[];

}): Promise<ParsedReceiptDraft | null> {

  const parsed = await callOpenAiJson({

    apiKey: options.apiKey,

    systemPrompt: RECEIPT_PARSE_SYSTEM_PROMPT,

    userContent: withImage(

      buildReceiptParsePrompt(options.ocrText, options.initialDraft),

      options.imageBase64,

      options.imageBase64Segments

    ),

  });



  if (!parsed) return null;

  return normalizeParsedReceiptDraft(parsed as Record<string, unknown>, options.initialDraft);

}



/**
 * Targeted micro-repair pass: sends only the fragment items (with neighbor
 * context) to GPT-4o, asks it to recover full product names.
 * Returns a map of itemIndex → repaired name for repairs above the confidence
 * threshold. The image is included so GPT can use visual context.
 */
async function repairFragmentsWithOpenAI(options: {
  apiKey: string;
  candidates: FragmentRepairCandidate[];
  imageBase64?: string | null;
}): Promise<Map<number, string>> {
  if (options.candidates.length === 0) return new Map();

  const fragments: FragmentRepairInput[] = options.candidates.map((candidate, index) => ({
    index,
    row: candidate.itemIndex + 1,
    fragment: candidate.rawFragment || '(no text visible)',
    price: candidate.price,
    before: candidate.before,
    after: candidate.after,
    ...(candidate.visionHint ? { visionHint: candidate.visionHint } : {}),
  }));

  const content: OpenAiContentPart[] = [
    { type: 'text', text: buildFragmentRepairPrompt(fragments) },
  ];
  if (options.imageBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${options.imageBase64}`, detail: 'high' },
    });
  }

  const result = await callOpenAiJson({
    apiKey: options.apiKey,
    systemPrompt: FRAGMENT_REPAIR_SYSTEM_PROMPT,
    userContent: content,
  });

  if (!result || typeof result !== 'object') return new Map();
  const repairs = (result as Record<string, unknown>).repairs;
  if (!Array.isArray(repairs)) return new Map();

  const repairMap = new Map<number, string>();
  for (const repair of repairs as FragmentRepairOutput[]) {
    if (
      typeof repair.index === 'number' &&
      typeof repair.corrected_name === 'string' &&
      typeof repair.confidence === 'number' &&
      repair.confidence >= MIN_REPAIR_CONFIDENCE &&
      repair.corrected_name.trim().length >= 3
    ) {
      repairMap.set(repair.index, repair.corrected_name.trim());
    }
  }
  return repairMap;
}

async function auditWithDeepSeek(options: {

  apiKey: string;

  primaryDraft: ParsedReceiptDraft;

  ocrText?: string;

  ocrDraft?: ParsedReceiptDraft;

}): Promise<ParsedReceiptDraft | null> {

  const response = await fetch('https://api.deepseek.com/chat/completions', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${options.apiKey}`,

    },

    body: JSON.stringify({

      model: DEEPSEEK_MODEL,

      temperature: 0,

      response_format: { type: 'json_object' },

      messages: [

        { role: 'system', content: RECEIPT_DEEPSEEK_AUDIT_SYSTEM_PROMPT },

        {

          role: 'user',

          content: buildReceiptDeepSeekAuditPrompt({

            primaryDraft: options.primaryDraft,

            ocrText: options.ocrText,

            ocrDraft: options.ocrDraft,

          }),

        },

      ],

    }),

  });



  if (!response.ok) {

    console.warn('DeepSeek audit error:', response.status, await response.text());

    return null;

  }



  const payload = (await response.json()) as ChatCompletionResponse;

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) return null;



  const parsed = parseJsonContent(content);

  return normalizeParsedReceiptDraft(parsed as Record<string, unknown>, options.primaryDraft);

}



async function parseWithDeepSeek(options: {

  apiKey: string;

  ocrText: string;

  initialDraft?: ParsedReceiptDraft;

}): Promise<ParsedReceiptDraft | null> {

  const response = await fetch('https://api.deepseek.com/chat/completions', {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      Authorization: `Bearer ${options.apiKey}`,

    },

    body: JSON.stringify({

      model: DEEPSEEK_MODEL,

      temperature: 0,

      response_format: { type: 'json_object' },

      messages: [

        { role: 'system', content: RECEIPT_PARSE_SYSTEM_PROMPT },

        {

          role: 'user',

          content: buildReceiptParsePrompt(options.ocrText, options.initialDraft),

        },

      ],

    }),

  });



  if (!response.ok) {

    console.warn('DeepSeek API error:', response.status, await response.text());

    return null;

  }



  const payload = (await response.json()) as ChatCompletionResponse;

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) return null;



  const parsed = parseJsonContent(content);

  return normalizeParsedReceiptDraft(parsed as Record<string, unknown>, options.initialDraft);

}



async function processReceiptScan(options: {

  openaiKey?: string;

  deepseekKey?: string;

  paddleOcrUrl?: string;

  ocrSpaceKey?: string;

  imageBase64?: string;

  imageBase64Segments?: string[];

  ocrText?: string;

  initialDraft?: ParsedReceiptDraft;
  doubleCheck?: boolean;
  textOnly?: boolean;
}): Promise<{

  draft: ParsedReceiptDraft | null;

  provider: 'openai' | 'deepseek';

  deepseekAudited: boolean;

  finalized: boolean;

}> {
  const enableDoubleCheck = options.doubleCheck !== false;
  const textOnly = options.textOnly === true;

  let draft: ParsedReceiptDraft | null = null;

  let provider: 'openai' | 'deepseek' = 'openai';

  let deepseekAudited = false;



  // Fetch word-level overlay — PaddleOCR when configured, else OCR.space (vision path only).
  const ocrResult =
    !textOnly && options.imageBase64
      ? await fetchReceiptOcrOverlay(options.imageBase64, {
          paddleOcrUrl: options.paddleOcrUrl,
          ocrSpaceKey: options.ocrSpaceKey,
        })
      : { overlay: null, provider: 'none' as const };

  const ocrOverlay = ocrResult.overlay;

  const ocrText = ocrOverlay?.rawText ?? options.ocrText ?? null;

  // Build OCR draft: spatial layout for items, text parsing for metadata.
  let repairCandidates: FragmentRepairCandidate[] = [];
  const ocrDraft = (() => {
    if (!ocrText) return null;
    const textDraft = parseReceiptText(ocrText);
    if (!ocrOverlay) return textDraft;
    const spatialLayout = buildLineItemsFromOverlay(ocrOverlay.lines);
    repairCandidates = spatialLayout.repairCandidates;
    return {
      ...textDraft,
      items: pickOcrDraftLineItems(
        textDraft.items,
        spatialLayout.items,
        textDraft.subtotal,
        ocrText
      ),
    };
  })();



  if (options.openaiKey && textOnly && ocrText) {
    draft = await parseWithOpenAITextOnly({
      apiKey: options.openaiKey,
      ocrText,
      initialDraft: options.initialDraft,
    });
    provider = 'openai';
  }

  if (options.openaiKey && options.imageBase64) {

    draft = await parseWithOpenAI({

      apiKey: options.openaiKey,

      ocrText: ocrText ?? undefined,

      initialDraft: options.initialDraft,

      imageBase64: options.imageBase64,

      imageBase64Segments: options.imageBase64Segments,

    });

    provider = 'openai';

  }



  const openAiDraft = draft;



  if (!draft && enableDoubleCheck && options.deepseekKey && ocrText) {

    draft = await parseWithDeepSeek({

      apiKey: options.deepseekKey,

      ocrText,

      initialDraft: options.initialDraft,

    });

    provider = 'deepseek';

  }



  if (!draft) {

    return { draft: null, provider, deepseekAudited: false, finalized: false };

  }



  if (enableDoubleCheck && options.deepseekKey && ocrText && provider === 'openai') {

    const audited = await auditWithDeepSeek({

      apiKey: options.deepseekKey,

      primaryDraft: draft,

      ocrText,

      ocrDraft: ocrDraft ?? undefined,

    });

    if (audited) {

      const ocrUnreadableSlots = ocrDraft?.items.length
        ? buildOcrUnreadablePriceSlots(ocrDraft.items)
        : undefined;

      const restored = openAiDraft
        ? restoreReadableNamesFromPrimary(audited, openAiDraft, ocrUnreadableSlots)
        : audited;

      draft = {

        ...restored,

        subtotal: audited.subtotal ?? draft.subtotal ?? ocrDraft?.subtotal,

        tax: audited.tax ?? draft.tax ?? ocrDraft?.tax,

        total: audited.total ?? draft.total ?? ocrDraft?.total,

      };

      deepseekAudited = true;

    }

  }



  const finalizedDraft = finalizeReceiptDraft(draft, ocrText, ocrDraft);

  // Fragment repair runs AFTER finalize so alignNamesToPrices cannot wipe repairs.
  let outputDraft = finalizedDraft;
  if (enableDoubleCheck && options.openaiKey && options.imageBase64 && finalizedDraft && !textOnly) {
    const repairCandidatesForDraft = buildRepairCandidatesFromDraft(
      finalizedDraft,
      repairCandidates,
      openAiDraft
    ).filter((candidate) => candidate.rawFragment.trim().length >= 2);
    if (repairCandidatesForDraft.length > 0) {
      const repairMap = await repairFragmentsWithOpenAI({
        apiKey: options.openaiKey,
        candidates: repairCandidatesForDraft,
        imageBase64: options.imageBase64,
      });
      if (repairMap.size > 0) {
        outputDraft = applyFragmentRepairsToDraft(
          finalizedDraft,
          repairCandidatesForDraft,
          repairMap
        );
        outputDraft = stripFooterLineItems(outputDraft);
      }
    }
  }



  return {

    draft: outputDraft,

    provider,

    deepseekAudited,

    finalized: true,

  };

}



export async function POST(request: Request): Promise<Response> {

  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();

  const ocrSpaceKey = process.env.OCR_SPACE_API_KEY?.trim();
  const paddleOcrUrl = resolveProductionSafeUrl(process.env.PADDLEOCR_API_URL, 'PADDLEOCR_API_URL');



  if (!openaiKey && !deepseekKey) {

    return Response.json(

      {

        error:

          'Receipt cleanup is not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY in your environment.',

      },

      { status: 503 }

    );

  }



  let body: {

    ocrText?: string;

    initialDraft?: ParsedReceiptDraft;

    imageBase64?: string;

    imageBase64Segments?: string[];

    doubleCheck?: boolean;

    textOnly?: boolean;

  };

  try {

    body = await request.json();

  } catch {

    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

  }



  const ocrText = body.ocrText?.trim();

  const imageBase64 = body.imageBase64?.trim();

  const imageBase64Segments = Array.isArray(body.imageBase64Segments)

    ? body.imageBase64Segments.filter((segment) => typeof segment === 'string' && segment.trim())

    : [];



  if (!ocrText && !imageBase64) {

    return Response.json({ error: 'ocrText or imageBase64 is required' }, { status: 400 });

  }



  try {

    const result = await processReceiptScan({

      openaiKey,

      deepseekKey,

      ocrSpaceKey,
      paddleOcrUrl: paddleOcrUrl ?? undefined,

      imageBase64,

      imageBase64Segments,

      ocrText,

      initialDraft: body.initialDraft,
      doubleCheck: body.doubleCheck,
      textOnly: body.textOnly,

    });



    if (result.draft) {

      return Response.json({

        draft: result.draft,

        provider: result.provider,

        verified: result.finalized,

        deepseekAudited: result.deepseekAudited,

      });

    }



    return Response.json({ error: 'Could not parse receipt' }, { status: 422 });

  } catch (error) {

    console.warn('Receipt parse API failed:', error);

    return Response.json({ error: 'Receipt cleanup failed' }, { status: 500 });

  }

}


