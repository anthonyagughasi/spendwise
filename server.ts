import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CURRENCIES = new Set(['NGN', 'USD', 'GBP']);

interface CachedRateEntry {
  rates: Record<string, number>;
  effectiveDate: string;
  source: 'api';
  fetchedAt: number;
}

const rateCache = new Map<string, CachedRateEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'spendwise' });
});

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

  // Primary public key-free endpoint
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

  // Secondary public key-free endpoint
  const lower = base.toLowerCase();
  const fallbackRes = await fetchWithTimeout(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lower}.json`
  );
  if (!fallbackRes.ok) {
    throw new Error(`Exchange rate providers unavailable (${fallbackRes.status})`);
  }
  const fallbackPayload = (await fallbackRes.json()) as Record<string, Record<string, number>>;
  const baseMap = fallbackPayload[lower];
  if (!baseMap) {
    throw new Error('Invalid secondary exchange rate payload');
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

app.get('/api/exchange-rates', async (req: Request, res: Response) => {
  const rawBase = typeof req.query.base === 'string' ? req.query.base.toUpperCase().trim() : 'USD';
  if (!ALLOWED_CURRENCIES.has(rawBase)) {
    res.status(400).json({ error: 'Unsupported base currency. Supported: NGN, USD, GBP.' });
    return;
  }

  const forceRefresh = req.query.refresh === '1';
  const cached = rateCache.get(rawBase);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    res.json({
      available: true,
      baseCurrency: rawBase,
      rates: cached.rates,
      effectiveDate: cached.effectiveDate,
      source: 'api',
    });
    return;
  }

  try {
    const filteredRates = await fetchPublicRates(rawBase);
    const effectiveDate = new Date().toISOString().slice(0, 10);
    rateCache.set(rawBase, {
      rates: filteredRates,
      effectiveDate,
      source: 'api',
      fetchedAt: Date.now(),
    });

    res.json({
      available: true,
      baseCurrency: rawBase,
      rates: filteredRates,
      effectiveDate,
      source: 'api',
    });
  } catch {
    res.status(200).json({
      available: false,
      fallbackRequired: true,
      baseCurrency: rawBase,
      message: 'Live exchange rate service is currently unreachable. Using saved or manual rates.',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SpendWise server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SpendWise server:', err);
  process.exit(1);
});
