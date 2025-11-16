import { ReactNode } from 'react';

export type BillingUnit = 'CPX' | 'CPC' | 'CPA';

export interface OperatorConfig {
  operatorUrl: string;
  operatorApiKey: string;
  platformId: string;
  sessionId: string;
}

export interface PlatformRequestPayload {
  query_text?: string;
  locale?: string;
  geo?: string;
  metadata?: Record<string, unknown>;
}

export interface AIPCreative {
  label: string;
  title: string;
  body: string;
  cta: string;
  url: string;
}

export interface AIPAuctionWinner {
  brand_agent_id: string;
  agent_id?: string;
  wallet_id?: string;
  cpx_price: number;
  preferred_unit: BillingUnit;
  reserved_amount: number;
}

export interface AIPAuctionResult {
  auction_id: string;
  serve_token: string;
  winner: AIPAuctionWinner;
  render: AIPCreative;
}

export interface AIPExposureEvent {
  event_type: 'cpx_exposure';
  serve_token: string;
  session_id: string;
  platform_id: string;
  brand_agent_id: string;
  wallet_id?: string;
  pricing: { unit: 'CPX'; amount_cents: number };
  timestamp: string;
}

export interface AIPClickEvent {
  event_type: 'cpc_click';
  serve_token: string;
  session_id: string;
  platform_id: string;
  brand_agent_id: string;
  wallet_id?: string;
  pricing: { unit: 'CPC'; amount_cents: number };
  timestamp: string;
}

export interface AIPConversionEvent {
  event_type: 'cpa_conversion';
  serve_token: string;
  conversion_id: string;
  conversion_type: string;
  ts: string;
  order_value_cents?: number;
  currency?: string;
  conversion_metadata?: Record<string, unknown>;
}

export type CPARequestPayload = Pick<
  AIPConversionEvent,
  'conversion_id' | 'conversion_type' | 'ts' | 'order_value_cents' | 'currency' | 'conversion_metadata'
>;

export interface AIPWeaveLink {
  href: string;
  text?: string;
  messageId: string;
}

export interface RecommendationItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  cta?: string;
  image_url?: string;
  brand_agent_id?: string;
}

export interface RecommendationResponse {
  items: RecommendationItem[];
  serve_token?: string;
}

export interface AIPProviderContext extends OperatorConfig {
  theme?: Record<string, string | number>;
  auctionResult: AIPAuctionResult | null;
  serveToken: string | null;
  brandAgentId: string | null;
  walletId: string | null;
  reservedAmountCents: number;
  sendPlatformRequest: (payload?: PlatformRequestPayload) => Promise<AIPAuctionResult | null>;
  sendEventCPX: (overrides?: Partial<AIPExposureEvent>) => Promise<AIPExposureEvent | null>;
  sendEventCPC: (overrides?: Partial<AIPClickEvent>) => Promise<AIPClickEvent | null>;
  sendEventCPA: (payload: CPARequestPayload) => Promise<AIPConversionEvent | null>;
}

export interface AIPWeaveContainerProps {
  messageId: string;
  query: string;
  fallbackFormat: 'citation' | 'product';
  children: ReactNode;
}

export interface AIPRecommendationsProps {
  messageId: string;
  query: string;
  format: 'citation' | 'product';
}
