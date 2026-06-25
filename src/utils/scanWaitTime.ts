/** Typical DeepRead scan duration (compress + upload + API processing). */
export const DEEPREAD_SCAN_ESTIMATE_MIN_SEC = 20;
export const DEEPREAD_SCAN_ESTIMATE_TYPICAL_MAX_SEC = 60;
export const DEEPREAD_SCAN_ESTIMATE_LONG_SEC = 120;
export const DEEPREAD_SCAN_ESTIMATE_MAX_SEC = 180;

export type ReceiptScanStage =
  | 'preparing'
  | 'uploading'
  | 'reading'
  | 'extracting'
  | 'refining';

export const SCAN_PROCESSING_TITLE = 'Scanning your receipt...';

const STAGE_LABELS: Record<ReceiptScanStage, string> = {
  preparing: 'Preparing image…',
  uploading: 'Uploading…',
  reading: 'Reading receipt…',
  extracting: 'Reading your items…',
  refining: 'Almost done…',
};

export function formatScanElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function getDeepReadScanWaitMessages(
  elapsedSec: number,
  stage: ReceiptScanStage = 'reading'
): {
  label: string;
  hint: string;
} {
  const estimate = `Usually ${DEEPREAD_SCAN_ESTIMATE_MIN_SEC}–${DEEPREAD_SCAN_ESTIMATE_TYPICAL_MAX_SEC} seconds`;
  const stageLabel = STAGE_LABELS[stage];

  if (elapsedSec === 0) {
    return {
      label: stageLabel,
      hint: `${estimate}. Long or busy receipts can take up to 2 minutes.`,
    };
  }

  const elapsed = formatScanElapsed(elapsedSec);

  if (elapsedSec < DEEPREAD_SCAN_ESTIMATE_TYPICAL_MAX_SEC) {
    return {
      label: `${stageLabel} ${elapsed}`,
      hint: estimate,
    };
  }

  if (elapsedSec < DEEPREAD_SCAN_ESTIMATE_LONG_SEC) {
    return {
      label: `${stageLabel} ${elapsed}`,
      hint: 'Long receipts take a bit longer. Hang tight — you can review before saving.',
    };
  }

  if (elapsedSec < DEEPREAD_SCAN_ESTIMATE_MAX_SEC) {
    return {
      label: `Still working… ${elapsed}`,
      hint: 'This is taking a bit longer on complex receipts. Hang tight — you can review before saving.',
    };
  }

  return {
    label: `Still working… ${elapsed}`,
    hint: 'This is taking longer than usual. Check your connection if it keeps going.',
  };
}
