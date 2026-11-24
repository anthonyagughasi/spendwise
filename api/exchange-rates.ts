const ALLOWED_CURRENCIES = new Set(['NGN', 'USD', 'GBP']);

async function fetchPublicRates(base: string): Promise<Record<string, number>> {
  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const res = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${base}`);
    if (res.ok) {
      const payload = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (payload.result !== 'error' && payload.rates) {
        const filtered: Record<string, number> = {};
        for (const code of ALLOWED_CURRENCIES) {
          const val = payload.rates[code];
          if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
            filtered[code] = val;
          }
        }
        if (Object.keys(filtered).length === ALLOWED_CURRENCIES.size) {
          return filtered;
        }
      }
    }
  } catch {
    // Fall through to secondary public provider
  }

  const lower = base.toLowerCase();
  const fallbackRes = await fetchWithTimeout(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lower}.json`
  );
  if (!fallbackRes.ok) {
    throw new Error(`Upstream status ${fallbackRes.status}`);
  }
  const fallbackPayload = (await fallbackRes.json()) as Record<string, Record<string, number>>;
  const baseMap = fallbackPayload[lower];
  if (!baseMap) {
    throw new Error('Invalid exchange rate response');
  }
  const filtered: Record<string, number> = {};
  for (const code of ALLOWED_CURRENCIES) {
    const val = code === base ? 1 : baseMap[code.toLowerCase()];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      filtered[code] = val;
    }
  }
  if (Object.keys(filtered).length !== ALLOWED_CURRENCIES.size) {
    throw new Error('Incomplete currency coverage');
  }
  return filtered;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawBase = (url.searchParams.get('base') ?? 'USD').toUpperCase().trim();

  if (!ALLOWED_CURRENCIES.has(rawBase)) {
    return Response.json(
      { error: 'Unsupported base currency. Supported: NGN, USD, GBP.' },
      { status: 400 }
    );
  }

  try {
    const filteredRates = await fetchPublicRates(rawBase);
    return Response.json({
      available: true,
      baseCurrency: rawBase,
      rates: filteredRates,
      effectiveDate: new Date().toISOString().slice(0, 10),
      source: 'api',
    });
  } catch {
    return Response.json({
      available: false,
      fallbackRequired: true,
      baseCurrency: rawBase,
      message: 'Live exchange rate service is currently unreachable. Using saved or manual rates.',
    });
  }
}
