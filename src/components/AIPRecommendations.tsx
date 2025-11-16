import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PLATFORM_RECOMMENDATIONS_ENDPOINT } from '../utils/constants';
import { createApiClient } from '../utils/apiClient';
import { useAIP } from '../provider/AIPProvider';
import { useExposureObserver } from '../tracking/useExposureObserver';
import { useTracking } from '../tracking/useTracking';
import { AIPRecommendationsProps, RecommendationItem } from '../utils/types';

export const AIPRecommendations: React.FC<AIPRecommendationsProps> = ({ messageId, query, format }) => {
  const config = useAIP();
  const apiClient = useMemo(
    () =>
      createApiClient({
        operatorUrl: config.operatorUrl,
        operatorApiKey: config.operatorApiKey,
        platformId: config.platformId,
        sessionId: config.sessionId
      }),
    [config.operatorApiKey, config.operatorUrl, config.platformId, config.sessionId]
  );
  const { sendCPX, sendCPC } = useTracking();
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post<{ items: RecommendationItem[] }>(PLATFORM_RECOMMENDATIONS_ENDPOINT, {
          message_id: messageId,
          session_id: config.sessionId,
          platform_id: config.platformId,
          query_text: query,
          format
        });
        if (mounted) {
          setItems(response.items ?? []);
        }
      } catch (err) {
        if (mounted) {
          setError((err as Error).message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [apiClient, config.platformId, config.sessionId, format, messageId, query]);

  const exposureRef = useExposureObserver<HTMLDivElement>(() => {
    void sendCPX();
  });

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor) return;
      void sendCPC();
    },
    [sendCPC]
  );

  if (loading) {
    return (
      <div className="aip-recommendations" ref={exposureRef}>
        <p className="aip-recommendations__status">Loading curated options…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aip-recommendations" ref={exposureRef}>
        <p className="aip-recommendations__status">Unable to load fallback results: {error}</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="aip-recommendations" ref={exposureRef}>
        <p className="aip-recommendations__status">No operator suggestions available.</p>
      </div>
    );
  }

  return (
    <div ref={exposureRef} className="aip-recommendations" onClick={handleClick}>
      {format === 'citation' ? (
        <ol className="aip-recommendations__list">
          {items.map((item) => (
            <li key={item.id} className="aip-recommendations__citation">
              <a href={item.url} target="_blank" rel="noreferrer" className="aip-recommendations__link">
                <span className="aip-recommendations__title">{item.title}</span>
                {item.description && <span className="aip-recommendations__description">{item.description}</span>}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <div className="aip-recommendations__grid">
          {items.map((item) => (
            <article key={item.id} className="aip-recommendations__card">
              {item.image_url && (
                <div className="aip-recommendations__media">
                  <img src={item.image_url} alt={item.title} />
                </div>
              )}
              <div className="aip-recommendations__body">
                <h4>{item.title}</h4>
                {item.description && <p>{item.description}</p>}
                <a href={item.url} target="_blank" rel="noreferrer" className="aip-recommendations__cta">
                  {item.cta ?? 'View'}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
