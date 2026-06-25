import {

  DEEPREAD_API_BASE,

  DEEPREAD_PIPELINE,

  DEEPREAD_REQUEST_TIMEOUT_MS,

  mapDeepReadJobToDraft,

  RECEIPT_EXTRACTION_SCHEMA,

  type DeepReadJobResponse,

  type DeepReadScanResult,

} from '@/src/services/deepreadReceiptMapper';

import { pollWithBackoff } from '@/src/services/deepreadReceiptPoll';



async function submitDeepReadReceiptJob(

  apiKey: string,

  imageBytes: Buffer,

  mimeType: string,

  fileName: string

): Promise<string> {

  const form = new FormData();

  form.append('file', new Blob([Uint8Array.from(imageBytes)], { type: mimeType }), fileName);

  form.append('schema', JSON.stringify(RECEIPT_EXTRACTION_SCHEMA));

  form.append('pipeline', DEEPREAD_PIPELINE);

  form.append('include_images', 'false');



  const response = await fetch(`${DEEPREAD_API_BASE}/v1/process`, {

    method: 'POST',

    headers: { 'X-API-Key': apiKey },

    body: form,

    signal: AbortSignal.timeout(60_000),

  });



  if (!response.ok) {

    const detail = await response.text();

    throw new Error(`DeepRead submit failed (${response.status}): ${detail}`);

  }



  const payload = (await response.json()) as { id?: string };

  if (!payload.id) {

    throw new Error('DeepRead submit did not return a job id.');

  }



  return payload.id;

}



async function pollDeepReadJob(apiKey: string, jobId: string): Promise<DeepReadJobResponse> {

  return pollWithBackoff({

    fetchStatus: async () => {

      const response = await fetch(`${DEEPREAD_API_BASE}/v1/jobs/${jobId}`, {

        headers: { 'X-API-Key': apiKey },

        signal: AbortSignal.timeout(30_000),

      });



      if (!response.ok) {

        const detail = await response.text();

        throw new Error(`DeepRead job poll failed (${response.status}): ${detail}`);

      }



      return (await response.json()) as DeepReadJobResponse;

    },

    isTerminal: (job) => job.status === 'completed' || job.status === 'failed',

    timeoutMs: DEEPREAD_REQUEST_TIMEOUT_MS,

  });

}



export async function processReceiptImageWithDeepRead(

  apiKey: string,

  imageBase64: string,

  mimeType = 'image/jpeg'

): Promise<DeepReadScanResult> {

  const imageBytes = Buffer.from(imageBase64, 'base64');

  const extension = mimeType.includes('png') ? 'png' : 'jpg';

  const jobId = await submitDeepReadReceiptJob(

    apiKey,

    imageBytes,

    mimeType,

    `receipt.${extension}`

  );

  const job = await pollDeepReadJob(apiKey, jobId);



  if (job.status === 'failed') {

    throw new Error(job.error ?? 'DeepRead could not process this receipt image.');

  }



  const mapped = mapDeepReadJobToDraft(job);

  if (!mapped) {

    throw new Error('DeepRead returned no structured receipt data.');

  }



  if (!mapped.draft.items.length && mapped.draft.total <= 0) {

    throw new Error(

      'DeepRead could not read any line items from this photo. Try a clearer, flatter shot with all text visible.'

    );

  }



  return mapped;

}


