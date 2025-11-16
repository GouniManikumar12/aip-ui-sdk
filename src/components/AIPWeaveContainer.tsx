import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STREAMING_COMPLETE_EVENT, STREAMING_START_EVENT } from '../utils/constants';
import { useAIP } from '../provider/AIPProvider';
import { useExposureObserver } from '../tracking/useExposureObserver';
import { useTracking } from '../tracking/useTracking';
import { AIPWeaveContainerProps } from '../utils/types';
import { AIPRecommendations } from './AIPRecommendations';

const normalizeUrl = (value?: string | null) => {
  if (!value) return '';
  try {
    return new URL(value, typeof window !== 'undefined' ? window.location.href : 'https://localhost').href;
  } catch (error) {
    return value;
  }
};

export const AIPWeaveContainer: React.FC<AIPWeaveContainerProps> = ({
  messageId,
  query,
  fallbackFormat,
  children
}) => {
  const { auctionResult } = useAIP();
  const { sendCPX, sendCPC } = useTracking();
  const [streamingComplete, setStreamingComplete] = useState(true);
  const [hasAipLink, setHasAipLink] = useState(false);
  const [fallbackKey, setFallbackKey] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const creativeUrl = useMemo(() => normalizeUrl(auctionResult?.render.url), [auctionResult?.render.url]);

  const exposureRef = useExposureObserver<HTMLDivElement>(() => {
    void sendCPX();
  });

  const assignRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      exposureRef(node);
    },
    [exposureRef]
  );

  const evaluateLinks = useCallback(() => {
    if (!containerRef.current || !creativeUrl) {
      setHasAipLink(false);
      return;
    }

    const anchors = containerRef.current.querySelectorAll<HTMLAnchorElement>('a[href]');
    const found = Array.from(anchors).some((anchor) => normalizeUrl(anchor.href) === creativeUrl);
    setHasAipLink(found);
  }, [creativeUrl]);

  useEffect(() => {
    if (!streamingComplete) {
      return;
    }

    evaluateLinks();
  }, [children, creativeUrl, streamingComplete, evaluateLinks]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStart = (event: Event) => {
      const detail = (event as CustomEvent<{ messageId: string }>).detail;
      if (detail?.messageId === messageId) {
        setStreamingComplete(false);
        setHasAipLink(false);
      }
    };

    const handleComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ messageId: string }>).detail;
      if (detail?.messageId === messageId) {
        setStreamingComplete(true);
        evaluateLinks();
        setFallbackKey((prev) => prev + 1);
      }
    };

    window.addEventListener(STREAMING_START_EVENT, handleStart);
    window.addEventListener(STREAMING_COMPLETE_EVENT, handleComplete);

    return () => {
      window.removeEventListener(STREAMING_START_EVENT, handleStart);
      window.removeEventListener(STREAMING_COMPLETE_EVENT, handleComplete);
    };
  }, [evaluateLinks, messageId]);

  const shouldRenderFallback = streamingComplete && !hasAipLink;

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!creativeUrl) return;
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      if (normalizeUrl(anchor.getAttribute('href') ?? anchor.dataset.href) === creativeUrl) {
        void sendCPC();
      }
    },
    [creativeUrl, sendCPC]
  );

  return (
    <div ref={assignRef} className="aip-weave-container" onClick={onClick}>
      {children}
      {shouldRenderFallback && (
        <AIPRecommendations key={fallbackKey} messageId={messageId} query={query} format={fallbackFormat} />
      )}
    </div>
  );
};
