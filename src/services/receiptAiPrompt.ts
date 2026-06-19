import type { ParsedReceiptDraft } from '@/src/models/types';

export const RECEIPT_JSON_SCHEMA = `{
  "storeName": "string",
  "date": "YYYY-MM-DD",
  "items": [{ "name": "string", "price": number, "quantity": number }],
  "subtotal": number,
  "tax": number,
  "total": number
}`;

export const RECEIPT_PARSE_SYSTEM_PROMPT = `You extract grocery receipt data from images.
Output valid JSON only. Missing receipt rows is the worst error.
Never invent rows not on the receipt.`;

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

Prices
- Exactly as printed with 2 decimals: 4.20, 6.75, 14.50.
- Read every digit. 6.75 is not 6.7 or 0.75.

Include
- Every grocery or charge row with a price, including QTY lines (e.g. Charge pymt D68 QTY 1 4.04).
- Product rows whose price is printed on the following line.

Exclude only
- Card payment / Interac approval lines, change due, footer ads, address, phone.

Totals
- Copy printed subtotal, tax/HST, and TOTAL from the footer.
- Canadian receipts: line prices often include tax. Do not add tax on top of the printed total.`;

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
6. FIX wrong prices digit-by-digit.
7. Do NOT merge rows that repeat the same product.
8. Do NOT return fewer items than the OCR parse unless you are certain those rows are payment/footer lines.
9. Match footer subtotal, tax, and total exactly.`,
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
