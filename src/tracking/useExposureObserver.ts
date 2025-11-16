import { useCallback, useRef } from 'react';

export const useExposureObserver = <T extends HTMLElement>(
  onExpose: () => void,
  options?: IntersectionObserverInit
) => {
  const hasFiredRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  };

  const handleEntries = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasFiredRef.current) {
        hasFiredRef.current = true;
        onExpose();
        disconnect();
      }
    });
  };

  const setNode = useCallback(
    (node: T | null) => {
      disconnect();

      if (!node || typeof IntersectionObserver === 'undefined') {
        return;
      }

      observerRef.current = new IntersectionObserver(handleEntries, {
        threshold: 0.4,
        ...(options ?? {})
      });

      observerRef.current.observe(node);
    },
    [options, onExpose]
  );

  return setNode;
};
