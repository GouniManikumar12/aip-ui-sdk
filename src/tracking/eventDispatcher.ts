import { STREAMING_COMPLETE_EVENT, STREAMING_START_EVENT } from '../utils/constants';

type StreamingDetail = {
  messageId: string;
  sessionId: string;
};

const dispatch = (eventName: string, detail: StreamingDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<StreamingDetail>(eventName, { detail }));
};

export const dispatchStreamingStart = (messageId: string, sessionId: string) => {
  dispatch(STREAMING_START_EVENT, { messageId, sessionId });
};

export const dispatchStreamingComplete = (messageId: string, sessionId: string) => {
  dispatch(STREAMING_COMPLETE_EVENT, { messageId, sessionId });
};
