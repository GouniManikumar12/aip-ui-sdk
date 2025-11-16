# aip-ui-sdk

Operator-agnostic React SDK that knows how to talk to the AIP specification, handle platform → context → bid → auction → event flows, and render creatives inside conversational experiences.

## Installation

```bash
npm install aip-ui-sdk
# or
pnpm add aip-ui-sdk
```

The package ships TypeScript definitions, a React provider, Weave-ready container components, exposure tracking hooks, and event dispatch helpers.

## Bootstrapping the provider

```tsx
import { AIPProvider } from 'aip-ui-sdk';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <AIPProvider
      operatorUrl={process.env.AIP_OPERATOR_URL!}
      operatorApiKey={process.env.AIP_OPERATOR_KEY!}
      platformId="weave-demo"
      sessionId="session-123"
      theme={{ '--aip-primary': '#14b8a6' }}
    >
      {children}
    </AIPProvider>
  );
}
```

`AIPProvider` automatically issues a `platform_request` (`POST /v1/platform/request`) with the session/platform identifiers, caches the returned `auction_result`, and exposes helper functions for emitting CPX → CPC → CPA events. The provider maintains the most recent `serve_token`, `brand_agent_id`, wallet, and reserved CPC/CPA amount so every component uses the exact payload mandated by AIP.

## Talking to the AIP server

Use the exported `useAIP` hook (re-exported from the provider) or the `useTracking` helper to reach the Operator endpoints:

```tsx
import { useEffect } from 'react';
import { useAIP, useTracking } from 'aip-ui-sdk';

const AskForNewAuction = () => {
  const { sendPlatformRequest } = useAIP();
  const { sendCPX, sendCPC, sendCPA } = useTracking();

  useEffect(() => {
    void sendPlatformRequest({ query_text: 'best hiking backpacks', locale: 'en-US', geo: 'US' });
  }, [sendPlatformRequest]);

  const handleManualConversion = () => {
    void sendCPA({
      conversion_id: crypto.randomUUID(),
      conversion_type: 'purchase',
      ts: new Date().toISOString(),
      order_value_cents: 12900,
      currency: 'USD'
    });
  };

  return (
    <button onClick={() => void sendCPC()}>
      Fire CPC manually
      <button onClick={handleManualConversion}>Confirm CPA</button>
    </button>
  );
};
```

Every event call automatically injects the serve token, operator identifiers, reserved billing metadata, and enforces the progressive CPX → CPC → CPA ladder so you cannot accidentally bill out of order.

## Weave integration

`AIPWeaveContainer` wraps the assistant response block, detects rendered creatives, and manages fallback recommendations if the response lacks AIP links.

```tsx
import { AIPWeaveContainer, dispatchStreamingComplete, dispatchStreamingStart } from 'aip-ui-sdk';

export const AssistantTurn = ({ messageId, query, response }: Props) => (
  <AIPWeaveContainer messageId={messageId} query={query} fallbackFormat="citation">
    <div>{response}</div>
  </AIPWeaveContainer>
);

// Stream handlers inside your LLM runtime:
function onStreamingStart(messageId: string, sessionId: string) {
  dispatchStreamingStart(messageId, sessionId);
}

function onStreamingComplete(messageId: string, sessionId: string) {
  dispatchStreamingComplete(messageId, sessionId);
}
```

The container:

- Watches the DOM for links that match the `render.url` returned in the `auction_result`.
- Auto-fires a CPX exposure once the creative is visible (uses `IntersectionObserver`).
- Intercepts clicks, emits `POST /v1/event/cpc`, and honors reservation-based billing.
- Falls back to operator recommendations when the assistant response doesn’t reference the auctioned creative.

## Recommendation surfaces

`AIPRecommendations` fetches citations or product cards through `POST /v1/platform/recommendations` and automatically emits CPX/CPC events when visible/clicked.

```tsx
import { AIPRecommendations } from 'aip-ui-sdk';

export const RelatedProducts = ({ messageId, query }: Props) => (
  <AIPRecommendations messageId={messageId} query={query} format="product" />
);
```

When used inside `AIPWeaveContainer`, the component becomes the fallback UI. You can also render it directly anywhere in your experience to boost recall even when Weave already linked to the creative.

## Event tracking & billing logic

- **serve_token attribution** – Every event payload is scoped to the cached `serve_token` from the last auction result. Consumers never touch the token directly.
- **Progressive CPX → CPC → CPA** – The provider keeps billing state in memory. CPC cannot fire before CPX, and CPA cannot fire before CPC.
- **Reservation-based billing** – The winner’s `reserved_amount` is recorded when the creative is served, making full CPC/CPA funds available for later settlement.
- **Pricing** – All pricing events use `winner.cpx_price * 100` to convert to cents, matching the spec.

## Fallback behavior

When Weave responses omit AIP links, the SDK:

1. Calls `POST /v1/platform/recommendations` using the message/query metadata.
2. Renders either citations or product cards using isolated `aip-` styles.
3. Fires CPX as soon as the fallback block intersects the viewport and CPC when a link is clicked.

This keeps the conversation monetizable even if the LLM response never referenced the auctioned creative.

## Custom theme tokens

Override any of the AIP-specific CSS variables (`--aip-primary`, `--aip-text`, `--aip-bg`, `--aip-border-radius`, `--aip-radius`) by passing a theme object into the provider:

```tsx
<AIPProvider
  operatorUrl={...}
  operatorApiKey={...}
  platformId="pf-demo"
  sessionId="sess-1"
  theme={{
    '--aip-primary': '#f97316',
    '--aip-bg': '#0f172a',
    '--aip-text': '#f8fafc',
    '--aip-border-radius': '16px'
  }}
>
  {...}
</AIPProvider>
```

The provider scopes these variables to a `.aip-theme-root` wrapper so they never leak into the host application namespace.

## API surface

Exports include:

- `AIPProvider`, `useAIP`
- `AIPWeaveContainer`, `AIPRecommendations`
- `useTracking`, `useExposureObserver`
- `dispatchStreamingStart`, `dispatchStreamingComplete`
- Type definitions for auctions, creatives, events, and provider context

Bundle it, publish to npm, and the SDK is ready for production use.
