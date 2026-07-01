import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { ParsedReceiptDraft } from '@/src/models/types';
import { scanReceiptFromImage } from '@/src/services/receiptParsePipeline';
import type { OcrSource } from '@/src/services/ocrTypes';
import type { ReceiptParseMethod } from '@/src/services/receiptParsePipeline';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';
import type { ReceiptParseWarning } from '@/src/utils/receiptValidation';
import type { ReceiptScanStage } from '@/src/utils/scanWaitTime';

export type ReceiptQueueJobStatus = 'queued' | 'processing' | 'done' | 'failed';

export type ReceiptQueueJobResult = {
  draft: ParsedReceiptDraft;
  ocrText: string;
  ocrSource: OcrSource;
  ocrConfidence?: number;
  parseMethod: ReceiptParseMethod;
  parseVerified: boolean;
  parseWarnings: ReceiptParseWarning[];
};

export type ReceiptQueueJob = {
  id: string;
  imageUri: string;
  status: ReceiptQueueJobStatus;
  stage: ReceiptScanStage;
  error?: string;
  result?: ReceiptQueueJobResult;
  createdAt: number;
  finishedAt?: number;
};

type ReceiptProcessingQueueState = {
  hydrated: boolean;
  jobs: ReceiptQueueJob[];
  activeJobId: string | null;
  enqueue: (imageUri: string) => string;
  processNext: () => Promise<void>;
  clearFinished: () => void;
  dismissJob: (jobId: string) => void;
  getActiveJob: () => ReceiptQueueJob | null;
  hasPendingWork: () => boolean;
  consumeJobResult: (jobId: string) => ReceiptQueueJob | null;
  hydrateFromStorage: () => Promise<void>;
};

const STORAGE_KEY = '@receipt_processing_queue_v1';
const MAX_JOBS = 8;

let jobCounter = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function nextJobId(): string {
  jobCounter += 1;
  return `receipt_job_${Date.now()}_${jobCounter}`;
}

function schedulePersist(getState: () => ReceiptProcessingQueueState): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistQueue(getState());
  }, 250);
}

async function persistQueue(state: Pick<ReceiptProcessingQueueState, 'jobs' | 'activeJobId'>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        jobs: state.jobs,
        activeJobId: null,
        jobCounter,
      })
    );
  } catch (error) {
    console.warn('[receiptQueue] persist failed:', error);
  }
}

export const useReceiptProcessingQueue = create<ReceiptProcessingQueueState>((set, get) => ({
  hydrated: false,
  jobs: [],
  activeJobId: null,

  hydrateFromStorage: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          jobs?: ReceiptQueueJob[];
          jobCounter?: number;
        };
        if (typeof parsed.jobCounter === 'number') {
          jobCounter = parsed.jobCounter;
        }
        const jobs = (parsed.jobs ?? []).map((job) =>
          job.status === 'processing' ? { ...job, status: 'queued' as const, stage: 'preparing' as const } : job
        );
        set({ jobs: jobs.slice(0, MAX_JOBS), hydrated: true });
        void get().processNext();
        return;
      }
    } catch (error) {
      console.warn('[receiptQueue] hydrate failed:', error);
    }
    set({ hydrated: true });
  },

  enqueue: (imageUri) => {
    const id = nextJobId();
    set((state) => {
      const jobs = [
        {
          id,
          imageUri,
          status: 'queued' as const,
          stage: 'preparing' as const,
          createdAt: Date.now(),
        },
        ...state.jobs,
      ].slice(0, MAX_JOBS);
      schedulePersist(get);
      return { jobs };
    });
    void get().processNext();
    return id;
  },

  processNext: async () => {
    if (!get().hydrated) return;
    if (get().activeJobId) return;

    const next = get().jobs.find((job) => job.status === 'queued');
    if (!next) return;

    set({ activeJobId: next.id });
    set((state) => {
      const jobs = state.jobs.map((job) =>
        job.id === next.id
          ? ({ ...job, status: 'processing' as const, stage: 'preparing' as const })
          : job
      );
      schedulePersist(get);
      return { jobs };
    });

    try {
      const result = await scanReceiptFromImage(next.imageUri, {
        onStage: (stage) => {
          set((state) => {
            const jobs = state.jobs.map((job) =>
              job.id === next.id ? { ...job, stage } : job
            );
            schedulePersist(get);
            return { jobs };
          });
        },
      });

      const parseWarnings = validateParsedReceipt(result.draft, {
        ocrSource: result.ocrResult.source,
        ocrConfidence: result.ocrResult.confidence,
      });

      const jobResult: ReceiptQueueJobResult = {
        draft: result.draft,
        ocrText: result.ocrResult.text,
        ocrSource: result.ocrResult.source,
        ocrConfidence: result.ocrResult.confidence,
        parseMethod: result.parseMethod,
        parseVerified: result.parseVerified ?? false,
        parseWarnings,
      };

      set((state) => {
        const jobs = state.jobs.map((job) =>
          job.id === next.id
            ? ({
                ...job,
                status: 'done' as const,
                stage: 'refining' as const,
                result: jobResult,
                finishedAt: Date.now(),
              })
            : job
        );
        schedulePersist(get);
        return { jobs };
      });

      const { notifyReceiptProcessed } = await import('@/src/services/notificationService');
      await notifyReceiptProcessed();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Receipt processing failed.';
      set((state) => {
        const jobs = state.jobs.map((job) =>
          job.id === next.id
            ? ({ ...job, status: 'failed' as const, error: message, finishedAt: Date.now() })
            : job
        );
        schedulePersist(get);
        return { jobs };
      });
    } finally {
      set({ activeJobId: null });
      void get().processNext();
    }
  },

  clearFinished: () => {
    set((state) => {
      const jobs = state.jobs.filter((job) => job.status === 'queued' || job.status === 'processing');
      schedulePersist(get);
      return { jobs };
    });
  },

  dismissJob: (jobId) => {
    set((state) => {
      const jobs = state.jobs.filter((job) => job.id !== jobId);
      schedulePersist(get);
      return { jobs };
    });
  },

  getActiveJob: () => {
    const { jobs, activeJobId } = get();
    if (activeJobId) {
      return jobs.find((job) => job.id === activeJobId) ?? null;
    }
    return jobs.find((job) => job.status === 'queued' || job.status === 'processing') ?? null;
  },

  hasPendingWork: () => {
    return get().jobs.some((job) => job.status === 'queued' || job.status === 'processing');
  },

  consumeJobResult: (jobId) => {
    const job = get().jobs.find((entry) => entry.id === jobId && entry.status === 'done' && entry.result);
    if (!job) return null;
    set((state) => {
      const jobs = state.jobs.filter((entry) => entry.id !== jobId);
      schedulePersist(get);
      return { jobs };
    });
    return job;
  },
}));

/** Clears persisted queue between unit tests. */
export async function resetReceiptProcessingQueueForTests(): Promise<void> {
  jobCounter = 0;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
  useReceiptProcessingQueue.setState({ hydrated: true, jobs: [], activeJobId: null });
}
