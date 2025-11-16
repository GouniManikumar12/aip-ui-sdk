import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { createApiClient } from '../utils/apiClient';
import {
  AIPAuctionResult,
  AIPClickEvent,
  AIPConversionEvent,
  AIPExposureEvent,
  AIPProviderContext,
  CPARequestPayload,
  OperatorConfig,
  PlatformRequestPayload
} from '../utils/types';
import {
  DEFAULT_THEME,
  EVENT_CPA_ENDPOINT,
  EVENT_CPC_ENDPOINT,
  EVENT_CPX_ENDPOINT,
  PLATFORM_REQUEST_ENDPOINT
} from '../utils/constants';
import '../styles/theme.css';

interface AIPProviderProps extends OperatorConfig {
  theme?: Record<string, string | number>;
}

interface PlatformRequestResponse {
  context_request_id: string;
  auction_result?: AIPAuctionResult;
}

const AIPContext = createContext<AIPProviderContext | undefined>(undefined);

const timestamp = () => new Date().toISOString();

const ensureAuction = (auction: AIPAuctionResult | null) => {
  if (!auction) {
    throw new Error('AIPProvider: auction data not ready. Wait for sendPlatformRequest to resolve.');
  }

  return auction;
};

const normalizeTheme = (overrides?: Record<string, string | number>) => {
  const merged = { ...DEFAULT_THEME, ...(overrides ?? {}) } as Record<string, string | number>;
  return Object.entries(merged).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});
};

export const AIPProvider = ({ children, theme, ...config }: PropsWithChildren<AIPProviderProps>) => {
  const { operatorUrl, operatorApiKey, platformId, sessionId } = config;
  const [auctionResult, setAuctionResult] = useState<AIPAuctionResult | null>(null);
  const [billingState, setBillingState] = useState({ cpx: false, cpc: false, cpa: false });

  const apiClient = useMemo(
    () => createApiClient({ operatorUrl, operatorApiKey, platformId, sessionId }),
    [operatorUrl, operatorApiKey, platformId, sessionId]
  );

  const reservedAmountCents = useMemo(() => {
    if (!auctionResult) return 0;
    return Math.round((auctionResult.winner.reserved_amount ?? 0) * 100);
  }, [auctionResult]);

  const serveToken = auctionResult?.serve_token ?? null;
  const brandAgentId = auctionResult?.winner.brand_agent_id ?? null;
  const walletId = auctionResult?.winner.wallet_id ?? null;

  const resetBillingState = useCallback(() => setBillingState({ cpx: false, cpc: false, cpa: false }), []);

  const sendPlatformRequest = useCallback(
    async (payload?: PlatformRequestPayload) => {
      const body = {
        session_id: sessionId,
        platform_id: platformId,
        query_text: payload?.query_text ?? '',
        locale: payload?.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
        geo: payload?.geo ?? 'unknown',
        metadata: payload?.metadata
      };

      const response = await apiClient.post<PlatformRequestResponse>(PLATFORM_REQUEST_ENDPOINT, body);
      if (response.auction_result) {
        setAuctionResult(response.auction_result);
        resetBillingState();
      }

      return response.auction_result ?? null;
    },
    [apiClient, platformId, sessionId, resetBillingState]
  );

  useEffect(() => {
    sendPlatformRequest().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('AIPProvider platform_request failed', error);
    });
  }, [sendPlatformRequest]);

  const sendEventCPX = useCallback(
    async (overrides?: Partial<AIPExposureEvent>): Promise<AIPExposureEvent | null> => {
      const auction = ensureAuction(auctionResult);
      if (billingState.cpx) {
        return null;
      }

      const base: AIPExposureEvent = {
        event_type: 'cpx_exposure',
        serve_token: auction.serve_token,
        session_id: sessionId,
        platform_id: platformId,
        brand_agent_id: auction.winner.brand_agent_id,
        wallet_id: auction.winner.wallet_id,
        pricing: { unit: 'CPX', amount_cents: Math.round(auction.winner.cpx_price * 100) },
        timestamp: timestamp()
      };

      const event = { ...base, ...overrides };
      await apiClient.post(EVENT_CPX_ENDPOINT, event);
      setBillingState((prev) => ({ ...prev, cpx: true }));
      return event;
    },
    [apiClient, auctionResult, billingState.cpx, platformId, sessionId]
  );

  const sendEventCPC = useCallback(
    async (overrides?: Partial<AIPClickEvent>): Promise<AIPClickEvent | null> => {
      const auction = ensureAuction(auctionResult);
      if (billingState.cpc) {
        return null;
      }

      if (!billingState.cpx) {
        await sendEventCPX();
      }

      const base: AIPClickEvent = {
        event_type: 'cpc_click',
        serve_token: auction.serve_token,
        session_id: sessionId,
        platform_id: platformId,
        brand_agent_id: auction.winner.brand_agent_id,
        wallet_id: auction.winner.wallet_id,
        pricing: { unit: 'CPC', amount_cents: Math.round(auction.winner.cpx_price * 100) },
        timestamp: timestamp()
      };

      const event = { ...base, ...overrides };
      await apiClient.post(EVENT_CPC_ENDPOINT, event);
      setBillingState((prev) => ({ ...prev, cpc: true }));
      return event;
    },
    [apiClient, auctionResult, billingState.cpc, billingState.cpx, platformId, sessionId, sendEventCPX]
  );

  const sendEventCPA = useCallback(
    async (payload: CPARequestPayload): Promise<AIPConversionEvent | null> => {
      const auction = ensureAuction(auctionResult);
      if (billingState.cpa) {
        return null;
      }

      if (!billingState.cpc) {
        await sendEventCPC();
      }

      if (!payload.conversion_id || !payload.conversion_type || !payload.ts) {
        throw new Error('CPA payload requires conversion_id, conversion_type, and ts');
      }

      const event: AIPConversionEvent = {
        event_type: 'cpa_conversion',
        serve_token: auction.serve_token,
        conversion_id: payload.conversion_id,
        conversion_type: payload.conversion_type,
        ts: payload.ts,
        order_value_cents: payload.order_value_cents,
        currency: payload.currency,
        conversion_metadata: payload.conversion_metadata
      };

      await apiClient.post(EVENT_CPA_ENDPOINT, event);
      setBillingState((prev) => ({ ...prev, cpa: true }));
      return event;
    },
    [apiClient, auctionResult, billingState.cpa, billingState.cpc, sendEventCPC]
  );

  const themeStyles = useMemo(() => normalizeTheme(theme), [theme]);

  const value: AIPProviderContext = {
    operatorUrl,
    operatorApiKey,
    platformId,
    sessionId,
    theme: themeStyles,
    auctionResult,
    serveToken,
    brandAgentId,
    walletId,
    reservedAmountCents,
    sendPlatformRequest,
    sendEventCPX,
    sendEventCPC,
    sendEventCPA
  };

  return (
    <AIPContext.Provider value={value}>
      <div className="aip-theme-root" style={themeStyles as React.CSSProperties}>
        {children}
      </div>
    </AIPContext.Provider>
  );
};

export const useAIP = () => {
  const context = useContext(AIPContext);
  if (!context) {
    throw new Error('useAIP must be used inside an AIPProvider');
  }

  return context;
};
