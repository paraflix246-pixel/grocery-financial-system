import type { ParsedReceiptDraft } from '@/src/models/types';
import { HIDDEN_ITEM_NAME } from '@/src/utils/receiptDraftNormalizer';

export const RECEIPT_JSON_SCHEMA = `{
  "storeName": "string",
  "date": "YYYY-MM-DD",
  "items": [{ "name": "string (use \\"${HIDDEN_ITEM_NAME}\\" when the name is unreadable)", "price": number, "quantity": number, "unitPrice": number, "unit": "string (optional: lb, oz, ea, L, gal, kg, g)" }],
  "subtotal": number,
  "tax": number,
  "total": number,
  "storeAddress": "string (optional, full street address from header)",
  "storeCity": "string (optional)",
  "storeRegion": "string (optional, 2-letter state or province code)",
  "storePostalCode": "string (optional, ZIP or postal code)",
  "storeCountry": "string (optional, US or CA)"
}`;

export const RECEIPT_PARSE_SYSTEM_PROMPT = `You extract grocery receipt data from images.
Output valid JSON only. Missing receipt rows is the worst error.
Never invent rows not on the receipt.`;

export const RECEIPT_PARSE_TEXT_SYSTEM_PROMPT = `You extract grocery receipt data from OCR text.
Output valid JSON only. Missing receipt rows is the worst error.
Never invent rows not supported by the OCR text.`;

export const RECEIPT_VERIFY_SYSTEM_PROMPT = `You audit a receipt extraction against the receipt image.
Find missing rows and wrong prices. Output valid JSON only.`;

const EXTRACTION_RULES = `Rules

Line items
- One item per priced row on the receipt, in top-to-bottom order.
- Same product on two separate rows = two separate items. Never merge or deduplicate.
- quantity = 1 unless that row shows QTY n.
- If a product name is on one line and its price is on the next line, combine those adjacent lines into one item.

Names
- Copy names from the receipt. Fix obvious typos only (CARATOES → Potatoes).
- Keep specific names (Spaghetti, not Pasta). Remove trailing " H" or " _" from names.
- If a row has a visible price but the product name is obscured, cropped, or unreadable, use exactly "${HIDDEN_ITEM_NAME}" for name. Do NOT guess or invent a product name.
- If you cannot read the price digits on a row, omit that row — do NOT guess a price.
- FRAGMENT RULE — bad OCR is better than wrong OCR. If the name text appears truncated, starts mid-word, ends mid-word, or contains OCR noise characters (* ! ? # ~), use "${HIDDEN_ITEM_NAME}" instead. Examples of fragments you MUST reject: "OWELS", "ET PAPER", "ASH BAGS", "ISH SOAP", "GAT*", "CEREA!". A complete readable name (e.g. "PAPER TOWELS", "TRASH BAGS", "DISH SOAP") is only valid when you can see the full text clearly.

Prices
- Only use prices you can read clearly on that same row. Never infer or shift a price from another line.
- When a unit price is printed (e.g. @ 2.48/lb, 0.59 ea), include unitPrice and unit on that item.
- Exactly as printed with 2 decimals: 4.20, 6.75, 14.50.
- Read every digit. 6.75 is not 6.7 or 0.75.
- Each price belongs to the item name on the SAME horizontal row — never shift prices to the next or previous item.
- After extraction, the sum of item prices must equal the printed subtotal (within $0.05). If not, re-read row-by-row.

Include
- Every grocery or charge row with a price, including QTY lines (e.g. Charge pymt D68 QTY 1 4.04).
- Product rows whose price is printed on the following line.

Store location (header only)
- Extract store address from the receipt header into storeAddress, storeCity, storeRegion, storePostalCode, and storeCountry when visible.
- US format: City, ST ZIP. Canada: City, ON A1A 1A1.
- Never put address or phone lines in items[].
- Omit location fields if not readable — do not guess.
- Do not infer state from store number, tax lines, or totals. Only copy text printed in the header address block.

Exclude only
- Subtotal, tax, and total footer rows — put these in subtotal/tax/total fields only, never in items[]
- Card payment / Interac approval lines, change due, footer ads.

Totals
- Copy printed subtotal, tax/HST, and TOTAL from the footer.
- Canadian receipts: line prices often include tax. Do not add tax on top of the printed total.`;

export function buildReceiptParseTextOnlyPrompt(
  ocrText: string,
  initialDraft?: ParsedReceiptDraft
): string {
  const sections = [
    'Extract every priced row from this receipt OCR text.',
    EXTRACTION_RULES,
    `Steps
1. Read line-by-line from top to bottom.
2. Check for split rows: product name on one line, price on the next.
3. Count priced rows — items.length must equal that count.
4. Copy footer subtotal, tax, and total exactly.
5. Verify subtotal + tax ≈ total (within $0.05).`,
    `Return JSON only:\n${RECEIPT_JSON_SCHEMA}`,
    `OCR text (primary source):\n"""\n${ocrText.trim()}\n"""`,
  ];

  if (initialDraft?.items.length) {
    sections.push(
      `Draft to improve (verify every row against OCR text):\n${JSON.stringify(initialDraft, null, 2)}`
    );
  }

  return sections.join('\n\n');
}

export function buildReceiptParsePrompt(ocrText?: string, initialDraft?: ParsedReceiptDraft): string {
  const sections = [
    'Extract every priced row from this receipt. You may receive a full image plus overlapping vertical slices.',
    EXTRACTION_RULES,
    `Steps
1. Use the vertical slices as the primary source for line items because they are easier to read than the full image.
2. Read slice 1, then slice 2, then slice 3, then slice 4; preserve top-to-bottom order.
3. Because slices overlap, include repeated rows only when they appear as separate rows on the receipt, not because of slice overlap.
4. Check for split rows: product name on one line, price on the next.
5. Count priced rows on the receipt — items.length must equal that count.
6. Copy footer subtotal, tax, and total exactly.`,
    `Return JSON only:\n${RECEIPT_JSON_SCHEMA}`,
  ];

  if (ocrText?.trim()) {
    sections.push(
      `OCR reference (may help find missed rows or digits):\n"""\n${ocrText.trim()}\n"""`
    );
  }

  if (initialDraft?.items.length) {
    sections.push(
      `Draft to improve (likely incomplete — verify every row against the image):\n${JSON.stringify(initialDraft, null, 2)}`
    );
  }

  return sections.join('\n\n');
}

export const RECEIPT_DEEPSEEK_AUDIT_SYSTEM_PROMPT = `You audit a grocery receipt JSON draft using OCR text as the primary reference.
Output valid JSON only. Do not invent rows not supported by OCR text.
Item prices in your output are placeholders — code will overwrite prices from OCR later.`;

export function buildReceiptDeepSeekAuditPrompt(options: {
  primaryDraft: ParsedReceiptDraft;
  ocrText?: string;
  ocrDraft?: ParsedReceiptDraft;
}): string {
  const sections = [
    'Audit this receipt draft using OCR text as the primary source of truth.',
    `Rules
- Prefer OCR line text over the OpenAI draft when names or row count conflict.
- FRAGMENT RULE — bad OCR is better than wrong OCR. If either the OpenAI draft or OCR text shows a name that is truncated, starts mid-word, ends mid-word, or contains noise characters (* ! ? # ~), use "${HIDDEN_ITEM_NAME}" for that row. Do NOT preserve fragments like "OWELS", "ET PAPER", "ASH BAGS", "ISH SOAP", "GAT*", "CEREA!" — these are OCR capture errors.
- Only keep a name if you are confident it is the complete, full name of the product.
- Only use "${HIDDEN_ITEM_NAME}" when the name is a fragment, obscured, or completely unreadable.
- Do NOT include subtotal, tax, or total footer amounts in items[].
- Keep duplicate rows when the receipt repeats the same product on separate lines.
- Copy storeName, date, subtotal, tax, and total from the best available source.`,
    `OpenAI vision draft:\n${JSON.stringify(options.primaryDraft, null, 2)}`,
    `Return corrected JSON only:\n${RECEIPT_JSON_SCHEMA}`,
  ];

  if (options.ocrText?.trim()) {
    sections.splice(
      2,
      0,
      `OCR reference (primary — trust this over OpenAI for row names and count):\n"""\n${options.ocrText.trim()}\n"""`
    );
  }

  if (options.ocrDraft?.items.length) {
    sections.splice(
      2,
      0,
      `OCR parsed rows:\n${JSON.stringify(options.ocrDraft, null, 2)}`
    );
  }

  return sections.join('\n\n');
}

export function buildReceiptVerifyPrompt(options: {
  primaryDraft: ParsedReceiptDraft;
  ocrText?: string;
  ocrDraft?: ParsedReceiptDraft;
}): string {
  const rowCount = options.primaryDraft.items.length;
  const ocrRowCount = options.ocrDraft?.items.length ?? 0;

  const sections = [
    `Audit this extraction against the receipt image. First pass found ${rowCount} item(s).`,
    ocrRowCount > rowCount
      ? `OCR found ${ocrRowCount} priced row(s) — your output MUST include at least ${ocrRowCount} items unless a row is clearly not a product.`
      : null,
    EXTRACTION_RULES,
    `Audit steps
1. Use the vertical slices first; re-read every priced row slice-by-slice.
2. ADD any rows missing from the extraction — missing rows is the worst error.
3. Keep duplicate rows — if Milk appears twice on the receipt, include two Milk items.
4. Check for split rows: product name on one line, price on the next.
5. Do not create duplicates caused only by slice overlap.
6. FIX wrong prices digit-by-digit — never guess a price you cannot read.
7. Replace guessed/invented names on obscured rows with "${HIDDEN_ITEM_NAME}" and keep the visible price.
8. Do NOT merge rows that repeat the same product.
9. Do NOT return fewer items than the OCR parse unless you are certain those rows are payment/footer lines.
10. Match footer subtotal, tax, and total exactly.`,
    `First extraction:\n${JSON.stringify(options.primaryDraft, null, 2)}`,
    `Return corrected JSON only:\n${RECEIPT_JSON_SCHEMA}`,
  ].filter(Boolean) as string[];

  if (options.ocrText?.trim()) {
    sections.splice(
      4,
      0,
      `OCR reference:\n"""\n${options.ocrText.trim()}\n"""`
    );
  }

  if (options.ocrDraft?.items.length) {
    sections.splice(
      4,
      0,
      `OCR line parse (may contain rows the first pass missed):\n${JSON.stringify(options.ocrDraft, null, 2)}`
    );
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Fragment repair prompt — targeted micro-correction for individual items
// ---------------------------------------------------------------------------

export type FragmentRepairInput = {
  index: number;
  /** 1-based line number on the finalized receipt (for image lookup). */
  row: number;
  fragment: string;
  price: number;
  before: string[];
  after: string[];
  /** Readable vision-draft name at this price, if any — use only when it fits the fragment. */
  visionHint?: string;
};

export type FragmentRepairOutput = {
  index: number;
  corrected_name: string;
  confidence: number;
};

export const FRAGMENT_REPAIR_SYSTEM_PROMPT =
  'You are a retail receipt correction engine. Output valid JSON only.';

/**
 * Builds a batched repair prompt for all fragment candidates.
 * Each fragment gets its price (never to be changed) and the names of adjacent
 * items for local context.
 *
 * GPT returns a "repairs" array; confidence < MIN_REPAIR_CONFIDENCE means the
 * corrected_name should be discarded and the item stays as unscanned.
 */
export function buildFragmentRepairPrompt(fragments: FragmentRepairInput[]): string {
  return `You are a retail receipt correction engine.

You are NOT extracting data or reconstructing layout.
You are ONLY correcting ambiguous or corrupted item names in an already-structured receipt.

RULES:
- NEVER change the price — each row's price is the anchor; find the product name on the receipt line with that EXACT price.
- Use the attached receipt image: locate the row with this price and read the product text on that same line.
- NEVER return footer labels as item names (SUBTOTAL, TAX, TOTAL, BARCODE, CHANGE DUE, etc.).
- NEVER invent items not suggested by the fragment, visionHint, or visible receipt text.
- ONLY correct clearly truncated or corrupted text (e.g. "OWELS" → "PAPER TOWELS").
- If text is too ambiguous to repair confidently, set confidence to 0 and return the original fragment unchanged.
- If fragment is "(no text visible)" or empty, set confidence to 0 — do NOT guess a product name.
- Use before/after neighbor names only as weak context — the price + image on that line are primary.
- Do NOT assign a generic category name (e.g. "DOG FOOD") unless the receipt line clearly shows it at that price.

OUTPUT FORMAT — return exactly this JSON structure:
{
  "repairs": [
    { "index": 0, "corrected_name": "PAPER TOWELS", "confidence": 0.87 },
    { "index": 1, "corrected_name": "GAT*", "confidence": 0 }
  ]
}

Fragments to repair:
${JSON.stringify(fragments, null, 2)}`;
}

/** Minimum confidence for a repair to be accepted. */
export const MIN_REPAIR_CONFIDENCE = 0.75;

export function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(jsonText);
}

export type AiReceiptProvider = 'openai' | 'deepseek';

export type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};
