import { useEffect, useState } from 'react';

/** Elapsed whole seconds while a receipt scan is in progress. */
export function useScanElapsedTime(active: boolean): number {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(0);
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [active]);

  return elapsedSec;
}
