import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('API connection resilience', () => {
  it('returns data from a healthy response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.restaurants()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('preserves the server error message when the service responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: '服务维护中' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(api.restaurants()).rejects.toThrow('服务维护中');
  });

  it('turns an unreachable service into a recoverable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.restaurants()).rejects.toThrow('暂时无法连接服务，请稍后重试');
  });

  it('times out a stalled request after twelve seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));

    const expectation = expect(api.restaurants()).rejects.toThrow('请求超时，请检查网络后重试');
    await vi.advanceTimersByTimeAsync(12000);
    await expectation;
  });
});
