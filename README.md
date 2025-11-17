# aip-ui-sdk

## Project Overview
`aip-ui-sdk` is an operator-agnostic UI SDK for embedding AIP-compliant creatives, tracking CPX → CPC → CPA flows, and powering Weave-styled recommendation surfaces. It hides the platform_request → context_request → bid → auction_result flow, renders creatives with reservation-based billing, and emits the AIP event payloads your operator expects.

## Installation
```bash
npm install aip-ui-sdk
# or
yarn add aip-ui-sdk
# or
pnpm add aip-ui-sdk
```

The package ships as an ES module with bundled TypeScript declarations and expects React 18 peer dependencies.

## Quick Start
```tsx
import { AIPProvider, AIPWeaveContainer } from 'aip-ui-sdk';

export function Root() {
  return (
    <AIPProvider
      operatorUrl={process.env.AIP_OPERATOR_URL!}
      operatorApiKey={process.env.AIP_OPERATOR_KEY!}
      platformId="weave-demo"
      sessionId="session-123"
    >
      <AIPWeaveContainer messageId="msg-1" query="best Tablets" fallbackFormat="product">
        <p>LLM response with inline links…</p>
      </AIPWeaveContainer>
    </AIPProvider>
  );
}
```
The provider issues the initial `POST /v1/platform/request`, caches the returned `auction_result`, and the container wires visibility/click tracking automatically.

## Usage Guide
### AIPProvider wrapper
Wrap your React tree with the provider so hooks and components share operator credentials, serve tokens, and auction metadata.

```tsx
import { AIPProvider } from 'aip-ui-sdk';

<AIPProvider
  operatorUrl="https://operator.example.com"
  operatorApiKey="sk-..."
  platformId="pf-weave"
  sessionId={session.id}
  theme={{ '--aip-primary': '#f97316' }}
>
  {children}
</AIPProvider>;
```

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `operatorUrl` | `string` | ✅ | Base Operator URL used for all `/v1/...` requests. |
| `operatorApiKey` | `string` | ✅ | Auth key sent as `x-api-key`. |
| `platformId` | `string` | ✅ | Platform identifier passed to platform/event endpoints. |
| `sessionId` | `string` | ✅ | Required session identifier for attribution. |
| `theme` | `Record<string, string \| number>` | optional | Overrides CSS variables (`--aip-primary`, `--aip-text`, `--aip-bg`, `--aip-border-radius`, `--aip-radius`). |

Provider exports the `useAIP` hook plus helpers: `sendPlatformRequest`, `sendEventCPX`, `sendEventCPC`, `sendEventCPA`, and cached `auctionResult` + `serveToken` + reservation metadata.

### AIPWeaveContainer (Weave ad format)
Wrap each assistant response or streaming block. The container inspects rendered DOM for the auction’s `render.url`, fires CPX exposure when visible, intercepts clicks for CPC, listens to `dispatchStreamingStart/Complete`, and renders fallback recommendations when no creative is found.

```tsx
import { AIPWeaveContainer } from 'aip-ui-sdk';

<AIPWeaveContainer
  messageId={message.id}
  query={message.query}
  fallbackFormat="citation"
>
  <AssistantMarkdown source={message.content} />
</AIPWeaveContainer>;
```

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `messageId` | `string` | ✅ | Unique identifier for the assistant turn (also sent to recommendations). |
| `query` | `string` | ✅ | Query text passed to fallback recommendations. |
| `fallbackFormat` | `'citation' \| 'product'` | ✅ | Determines fallback layout when no creative link is found. |
| `children` | `ReactNode` | ✅ | Rendered assistant response/Weave markup. |

Pair with `dispatchStreamingStart(messageId, sessionId)` / `dispatchStreamingComplete(...)` while streaming to ensure link detection triggers at the right time.

### AIPRecommendations component
Renders citations or product cards by calling `POST /v1/platform/recommendations`. It auto-fires CPX when visible, CPC on click, and can be used standalone or as the fallback UI.

```tsx
import { AIPRecommendations } from 'aip-ui-sdk';

<AIPRecommendations messageId="msg-1" query="new york hotels" format="citation" />;
```

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `messageId` | `string` | ✅ | Message/turn identifier sent with the recommendation request. |
| `query` | `string` | ✅ | Query string forwarded to the operator. |
| `format` | `'citation' \| 'product'` | ✅ | Layout preference for rendering results. |

## API Reference
Main exports:

| Export | Type | Description |
| --- | --- | --- |
| `AIPProvider`, `useAIP` | Component/Hook | Provider context + hook for accessing operator config, auctions, and senders. |
| `AIPWeaveContainer` | Component | Wraps assistant output, handles streaming coordination, fallback logic, CPX/CPC events. |
| `AIPRecommendations` | Component | Recommendation surface with automatic tracking. |
| `useTracking` | Hook | Returns `sendCPX`, `sendCPC`, `sendCPA`, `serveToken`, and reservation data. |
| `useExposureObserver` | Hook | Intersection Observer helper that fires once when an element is visible. |
| `dispatchStreamingStart/dispatchStreamingComplete` | Utility | Custom events to coordinate LLM streaming with link scanning. |
| Types (`AIPAuctionResult`, `AIPCreative`, `AIPExposureEvent`, `AIPClickEvent`, `AIPConversionEvent`, `AIPWeaveLink`, `AIPProviderContext`, `OperatorConfig`) | Interfaces | TypeScript definitions for all major payloads. |

## Tracking & Events
- **Exposure tracking (CPX)** – `useExposureObserver` is wired into `AIPWeaveContainer` and `AIPRecommendations` to emit `POST /v1/event/cpx` once per creative/fallback block. Pricing is derived from `auction_result.winner.cpx_price * 100` and respects reserved amounts.
- **Click tracking (CPC)** – Click interception ensures `POST /v1/event/cpc` fires before navigation. The billing ladder enforces CPX first, CPC second.
- **Conversion tracking (CPA)** – Call `sendEventCPA`/`sendCPA` with conversion metadata; the SDK automatically sequences CPX → CPC → CPA and reuses the cached `serve_token`, `brand_agent_id`, and reservation data.
- **Fallback reservations** – The provider stores `winner.reserved_amount` in cents, so downstream analytics can reconcile reservation-based billing.

## TypeScript Support
Full `.d.ts` declarations are generated from the TypeScript source and published with the package. Components, hooks, and event payloads ship with strict interfaces so IDEs autocomplete payloads and props by default.

## Development
Clone the repo, install dependencies, then run:
```bash
npm install
npm run lint   # type-checks via tsc --noEmit
npm run build  # emits dist/ with ESM + declarations
```
Use `npm run clean` to remove the `dist` folder before publishing.

## License
Licensed under the [Apache License 2.0](LICENSE) © 2024 AdMesh.
