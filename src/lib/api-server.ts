/**
 * Server-Side API Client Utility
 *
 * SSR/SSG용 API 클라이언트입니다.
 * getServerSideProps, getStaticProps에서 사용합니다.
 * 인증 토큰은 쿠키나 헤더에서 가져올 수 있습니다.
 */

import { API_BASE_URL, API_TIMEOUT } from '@/config/api';
import { GetServerSidePropsContext, GetStaticPropsContext } from 'next';

// API 응답 타입
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

// 요청 옵션 타입
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeout?: number;
  token?: string | null; // 서버 사이드에서 토큰을 명시적으로 전달
}

/**
 * 타임아웃이 있는 fetch
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * 서버 사이드 API 요청 함수
 */
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { body, timeout = API_TIMEOUT, headers: customHeaders, token, ...restOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  // GET 요청이 아니거나 body가 있을 때만 Content-Type 추가
  const method = restOptions.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD' || body) {
    headers['Content-Type'] = 'application/json';
  }

  // 서버 사이드에서 토큰 전달 (선택적)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    ...restOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetchWithTimeout(url, fetchOptions, timeout);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: data?.message || `HTTP Error: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          error: '요청 시간이 초과되었습니다.',
          status: 408,
        };
      }
      return {
        error: error.message,
        status: 0,
      };
    }
    return {
      error: '알 수 없는 오류가 발생했습니다.',
      status: 0,
    };
  }
};

/**
 * GET 요청 (서버 사이드)
 */
export const get = <T = unknown>(endpoint: string, options?: RequestOptions) =>
  apiRequest<T>(endpoint, { ...options, method: 'GET' });

/**
 * POST 요청 (서버 사이드)
 */
export const post = <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(endpoint, { ...options, method: 'POST', body });

/**
 * PATCH 요청 (서버 사이드)
 */
export const patch = <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(endpoint, { ...options, method: 'PATCH', body });

/**
 * DELETE 요청 (서버 사이드)
 */
export const del = <T = unknown>(endpoint: string, options?: RequestOptions) =>
  apiRequest<T>(endpoint, { ...options, method: 'DELETE' });

/**
 * 쿠키에서 토큰 가져오기 (서버 사이드)
 * Note: Only works with getServerSideProps, not getStaticProps (no request context at build time)
 */
export const getTokenFromCookies = (context: GetServerSidePropsContext): string | null => {
  const cookies = context.req.headers.cookie || '';
  if (!cookies) return null;

  const tokenMatch = cookies.match(/(?:^|;\s*)accessToken=([^;]*)/);
  return tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
};

export default {
  get,
  post,
  patch,
  del,
  request: apiRequest,
  getTokenFromCookies,
};
