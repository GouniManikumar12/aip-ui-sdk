import { useCallback } from 'react';
import { useAIP } from '../provider/AIPProvider';
import { CPARequestPayload } from '../utils/types';

export const useTracking = () => {
  const context = useAIP();

  const sendCPX = useCallback(() => context.sendEventCPX(), [context]);
  const sendCPC = useCallback(() => context.sendEventCPC(), [context]);
  const sendCPA = useCallback((payload: CPARequestPayload) => context.sendEventCPA(payload), [context]);

  return {
    sendCPX,
    sendCPC,
    sendCPA,
    serveToken: context.serveToken,
    brandAgentId: context.brandAgentId,
    reservedAmountCents: context.reservedAmountCents,
    auctionResult: context.auctionResult
  };
};
