import { OperatorConfig } from './types';

export interface ApiClient {
  post: <T>(path: string, body: unknown, init?: RequestInit) => Promise<T>;
}

const buildUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path}`;
};

export const createApiClient = ({ operatorUrl, operatorApiKey }: OperatorConfig): ApiClient => {
  const post = async <T>(path: string, body: unknown, init?: RequestInit): Promise<T> => {
    const response = await fetch(buildUrl(operatorUrl, path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': operatorApiKey,
        ...(init?.headers ?? {})
      },
      body: JSON.stringify(body),
      ...init
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AIP API error (${response.status}): ${message}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  };

  return { post };
};
