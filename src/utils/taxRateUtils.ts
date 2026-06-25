import type { ParsedReceiptDraft } from '@/src/models/types';

import { formatCurrency } from '@/src/utils/priceParser';
import { hasReceiptPrintedAddress } from '@/src/utils/storeLocationUtils';



/** Standard HST/GST rates by Canadian province when receipt prints a rate label. */

const CANADIAN_PROVINCE_TAX_RATE: Record<string, number> = {

  ON: 13,

  NB: 15,

  NL: 15,

  NS: 15,

  PE: 15,

  BC: 12,

  AB: 5,

  SK: 11,

  MB: 12,

  QC: 14.975,

};



function isCanadianTaxInclusiveFooter(

  subtotal?: number,

  tax?: number,

  total?: number

): boolean {

  return (

    subtotal != null &&

    subtotal > 0 &&

    total != null &&

    total > 0 &&

    tax != null &&

    tax > 0 &&

    Math.abs(subtotal - total) <= 0.01

  );

}



/** Parse "HST (13%)" / "GST 5%" style labels from OCR or DeepRead text. */

export function parsePrintedTaxRateFromText(text: string): number | null {

  if (!text.trim()) return null;

  const match = text.match(/\b(?:hst|gst|pst|tax)\s*(?:\(\s*)?(\d+(?:\.\d+)?)\s*%/i);

  if (!match?.[1]) return null;

  const rate = Number.parseFloat(match[1]);

  return Number.isFinite(rate) && rate > 0 && rate <= 30 ? rate : null;

}



function resolveCanadianTaxRate(

  draft: Pick<ParsedReceiptDraft, 'storeRegion' | 'storeCountry' | 'printedTaxRate'>

): number | null {

  if (draft.printedTaxRate != null && draft.printedTaxRate > 0) {

    return draft.printedTaxRate;

  }

  const region = draft.storeRegion?.trim().toUpperCase();

  if (region && CANADIAN_PROVINCE_TAX_RATE[region] != null) {

    return CANADIAN_PROVINCE_TAX_RATE[region];

  }

  if (draft.storeCountry === 'CA') return 13;

  return null;

}



export function getEffectiveTaxRateLabel(

  draft: Pick<

    ParsedReceiptDraft,

    'subtotal' | 'tax' | 'storeRegion' | 'storeCountry' | 'total' | 'printedTaxRate'

  >

): string | null {

  const subtotal = draft.subtotal ?? 0;

  const tax = draft.tax ?? 0;

  if (subtotal <= 0 || tax <= 0) return null;



  const region = draft.storeRegion?.trim();

  const country = draft.storeCountry;

  const isCanada = country === 'CA' || region === 'ON' || region === 'BC' || region === 'QC';



  if (isCanadianTaxInclusiveFooter(subtotal, tax, draft.total)) {

    const printedRate = resolveCanadianTaxRate(draft);

    if (printedRate != null) {

      const label = Number.isInteger(printedRate) ? `${printedRate}%` : `${printedRate.toFixed(3)}%`;

      return `HST ${label}`;

    }

  }



  const rate = (tax / subtotal) * 100;

  if (isCanada) {

    return `HST/GST ${rate.toFixed(2)}%`;

  }

  if (region && hasReceiptPrintedAddress(draft)) {

    return `${region} tax ${rate.toFixed(2)}%`;

  }

  return `Tax rate ${rate.toFixed(2)}%`;

}



export function formatTaxSummary(

  draft: Pick<

    ParsedReceiptDraft,

    'subtotal' | 'tax' | 'storeRegion' | 'storeCountry' | 'total' | 'printedTaxRate'

  >

): string | null {

  const label = getEffectiveTaxRateLabel(draft);

  if (!label || draft.tax == null) return null;

  return `${label} · ${formatCurrency(draft.tax)}`;

}


