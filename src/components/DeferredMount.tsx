import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Delay after first paint before mounting children (default: next frame). */
  delayMs?: number;
};

/** Mount children after the current frame so above-the-fold UI can paint first. */
export function DeferredMount({ children, delayMs = 0 }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (delayMs <= 0) {
      const frame = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setMounted(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!mounted) return null;
  return children;
}
