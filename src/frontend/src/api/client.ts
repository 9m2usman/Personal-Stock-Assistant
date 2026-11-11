/**
 * Institutional Financial API Client
 * Connects React UI to FastAPI backend endpoints.
 */

const BASE_URL = '/api/v1';

export async function fetchQuote(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/market/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Quote error: ${res.statusText}`);
  return res.json();
}

export async function fetchMarketSummary(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/market/summary?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Market summary error: ${res.statusText}`);
  return res.json();
}

export async function fetchTechnicals(symbol: string, limit: number = 100): Promise<any> {
  const res = await fetch(`${BASE_URL}/market/technicals?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
  if (!res.ok) throw new Error(`Technicals error: ${res.statusText}`);
  return res.json();
}

export async function fetchFundamentals(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/fundamentals/overview?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Fundamentals error: ${res.statusText}`);
  return res.json();
}

export async function sendChatMessage(content: string, sessionId: string = 'default_session'): Promise<any> {
  const res = await fetch(`${BASE_URL}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, content }),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.statusText}`);
  return res.json();
}

export async function fetchChatHistory(sessionId: string = 'default_session'): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/chat/history?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Chat history error: ${res.statusText}`);
  return res.json();
}

export async function uploadPortfolioSpreadsheet(file: File, baseCurrency: string = 'USD'): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('base_currency', baseCurrency);

  const res = await fetch(`${BASE_URL}/portfolio/upload-spreadsheet`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Spreadsheet upload error: ${res.statusText}`);
  return res.json();
}

export async function evaluatePortfolio(holdings: any[], baseCurrency: string = 'USD'): Promise<any> {
  const res = await fetch(`${BASE_URL}/portfolio/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, base_currency: baseCurrency }),
  });
  if (!res.ok) throw new Error(`Portfolio evaluation error: ${res.statusText}`);
  return res.json();
}

export async function simulateWhatIf(holdings: any[], scenario: any, baseCurrency: string = 'USD'): Promise<any> {
  const res = await fetch(`${BASE_URL}/portfolio/simulate-what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, scenario, base_currency: baseCurrency }),
  });
  if (!res.ok) throw new Error(`Simulation error: ${res.statusText}`);
  return res.json();
}

export async function fetchCompanySentiment(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/news/sentiment?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Sentiment error: ${res.statusText}`);
  return res.json();
}

export async function searchNews(query: string, limit: number = 10): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/news/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error(`News search error: ${res.statusText}`);
  return res.json();
}

export async function executePythonSandbox(code: string, timeoutSeconds: number = 5): Promise<any> {
  const res = await fetch(`${BASE_URL}/sandbox/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, timeout_seconds: timeoutSeconds }),
  });
  if (!res.ok) throw new Error(`Sandbox execution error: ${res.statusText}`);
  return res.json();
}

export async function enqueueResearchJob(symbol: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/jobs/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error(`Research job error: ${res.statusText}`);
  return res.json();
}

export async function pollJobStatus(taskId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/jobs/status/${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error(`Job status error: ${res.statusText}`);
  return res.json();
}

export interface NormalizedInstrument {
  id: string;
  company_name: string;
  display_symbol: string;
  provider_symbols?: Record<string, string>;
  exchange_mic: string;
  exchange_name: string;
  country: string;
  currency: string;
  instrument_type: string;
  listing_type: string;
  is_adr: boolean;
  related_adr_symbol?: string;
  cik?: string;
  provider_availability?: Record<string, boolean>;
}

export interface WatchlistItem {
  symbol: string;
  company_name: string;
  exchange: string;
  currency: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  volume?: number;
  as_of: string;
  freshness: string;
  provider: string;
  is_adr?: boolean;
  listing_type?: string;
  error?: string;
}

export async function searchInstruments(query: string = '', exchange?: string, limit: number = 15): Promise<NormalizedInstrument[]> {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (exchange) params.append('exchange', exchange);
  params.append('limit', String(limit));
  const res = await fetch(`${BASE_URL}/market/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search error: ${res.statusText}`);
  return res.json();
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const res = await fetch(`${BASE_URL}/market/watchlist`);
  if (!res.ok) throw new Error(`Watchlist error: ${res.statusText}`);
  return res.json();
}

export async function fetchWorkerHealth(): Promise<any> {
  const res = await fetch(`${BASE_URL}/jobs/health`);
  if (!res.ok) throw new Error(`Jobs health error: ${res.statusText}`);
  return res.json();
}

