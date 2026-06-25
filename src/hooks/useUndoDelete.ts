import { useCallback, useEffect, useRef, useState } from 'react';

const UNDO_MS = 10_000;

export type UndoDeleteState = {
  label: string;
};

export function useUndoDelete() {
  const [pending, setPending] = useState<UndoDeleteState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<(() => void | Promise<void>) | null>(null);
  const undoRef = useRef<(() => void | Promise<void>) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    commitRef.current = null;
    undoRef.current = null;
    setPending(null);
  }, [clearTimer]);

  const scheduleUndo = useCallback(
    (
      label: string,
      onCommit: () => void | Promise<void>,
      onUndo: () => void | Promise<void>
    ) => {
      clearTimer();
      const previousCommit = commitRef.current;
      commitRef.current = onCommit;
      undoRef.current = onUndo;
      setPending({ label });
      if (previousCommit) {
        void Promise.resolve(previousCommit());
      }
      timerRef.current = setTimeout(() => {
        void Promise.resolve(onCommit());
        commitRef.current = null;
        undoRef.current = null;
        setPending(null);
        timerRef.current = null;
      }, UNDO_MS);
    },
    [clearTimer]
  );

  const undo = useCallback(async () => {
    const onUndo = undoRef.current;
    if (!onUndo) return;
    clearTimer();
    commitRef.current = null;
    undoRef.current = null;
    await Promise.resolve(onUndo());
    setPending(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { pending, scheduleUndo, undo, dismiss };
}
