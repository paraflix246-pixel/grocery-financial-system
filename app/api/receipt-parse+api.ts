import type { ParsedReceiptDraft } from '@/src/models/types';
import { parseReceiptText } from '@/src/services/receiptParser';
import { fetchOcrSpaceText } from '@/src/services/ocr/ocrSpaceServer';
import {
  buildReceiptParsePrompt,
  buildReceiptVerifyPrompt,
  parseJsonContent,
  RECEIPT_PARSE_SYSTEM_PROMPT,
  RECEIPT_VERIFY_SYSTEM_PROMPT,
  type ChatCompletionResponse,
} from '@/src/services/receiptAiPrompt';
import {
  appendMissingReceiptItems,
  mergeReceiptDrafts,
  normalizeParsedReceiptDraft,
  reconcileItemPricesFromOcrText,
  supplementMissingReceiptItems,
} from '@/src/utils/receiptDraftNormalizer';

const OPENAI_MODEL = process.env.OPENAI_RECEIPT_MODEL?.trim() || 'gpt-4o-mini';

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

async function verifyWithOpenAI(options: {
  apiKey: string;
  primaryDraft: ParsedReceiptDraft;
  ocrText?: string;
  ocrDraft?: ParsedReceiptDraft;
  imageBase64?: string | null;
  imageBase64Segments?: string[];
}): Promise<ParsedReceiptDraft | null> {
  const parsed = await callOpenAiJson({
    apiKey: options.apiKey,
    systemPrompt: RECEIPT_VERIFY_SYSTEM_PROMPT,
    userContent: withImage(
      buildReceiptVerifyPrompt({
        primaryDraft: options.primaryDraft,
        ocrText: options.ocrText,
        ocrDraft: options.ocrDraft,
      }),
      options.imageBase64,
      options.imageBase64Segments
    ),
  });

  if (!parsed) return null;
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
      model: 'deepseek-chat',
      temperature: 0.1,
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

async function doubleCheckReceipt(options: {
  apiKey: string;
  imageBase64: string;
  imageBase64Segments?: string[];
  primaryDraft: ParsedReceiptDraft;
  ocrSpaceKey?: string;
}): Promise<ParsedReceiptDraft> {
  const ocrText = options.ocrSpaceKey
    ? await fetchOcrSpaceText(options.imageBase64, options.ocrSpaceKey)
    : null;
  const ocrDraft = ocrText ? parseReceiptText(ocrText) : null;
  const merged = supplementMissingReceiptItems(options.primaryDraft, ocrDraft);

  const verified = await verifyWithOpenAI({
    apiKey: options.apiKey,
    primaryDraft: merged,
    ocrText: ocrText ?? undefined,
    ocrDraft: ocrDraft ?? undefined,
    imageBase64: options.imageBase64,
    imageBase64Segments: options.imageBase64Segments,
  });

  let result = verified ?? merged;

  // Verification can drop rows — union back anything the audit removed.
  if (verified && verified.items.length < merged.items.length) {
    result = supplementMissingReceiptItems(verified, merged, ocrDraft);
  } else if (ocrDraft) {
    result = supplementMissingReceiptItems(result, ocrDraft);
  }

  if (ocrText) {
    result = reconcileItemPricesFromOcrText(result, ocrText);
    result = appendMissingReceiptItems(result, ocrDraft);
  }

  return result;
}

export async function POST(request: Request): Promise<Response> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  const ocrSpaceKey = process.env.OCR_SPACE_API_KEY?.trim();

  if (!openaiKey && !deepseekKey) {
    return Response.json(
      {
        error:
          'AI receipt cleanup is not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY in your environment.',
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
  const doubleCheck = body.doubleCheck !== false;

  if (!ocrText && !imageBase64) {
    return Response.json({ error: 'ocrText or imageBase64 is required' }, { status: 400 });
  }

  try {
    if (openaiKey) {
      const openaiDraft = await parseWithOpenAI({
        apiKey: openaiKey,
        ocrText,
        initialDraft: body.initialDraft,
        imageBase64,
        imageBase64Segments,
      });

      if (openaiDraft) {
        const finalDraft =
          doubleCheck && imageBase64
            ? await doubleCheckReceipt({
                apiKey: openaiKey,
                imageBase64,
                imageBase64Segments,
                primaryDraft: openaiDraft,
                ocrSpaceKey,
              })
            : openaiDraft;

        return Response.json({
          draft: finalDraft,
          provider: 'openai',
          verified: doubleCheck && Boolean(imageBase64),
        });
      }
    }

    if (deepseekKey && ocrText) {
      const deepseekDraft = await parseWithDeepSeek({
        apiKey: deepseekKey,
        ocrText,
        initialDraft: body.initialDraft,
      });
      if (deepseekDraft) {
        return Response.json({ draft: deepseekDraft, provider: 'deepseek', verified: false });
      }
    }

    return Response.json({ error: 'Could not parse receipt with AI' }, { status: 422 });
  } catch (error) {
    console.warn('Receipt parse API failed:', error);
    return Response.json({ error: 'AI receipt cleanup failed' }, { status: 500 });
  }
}
