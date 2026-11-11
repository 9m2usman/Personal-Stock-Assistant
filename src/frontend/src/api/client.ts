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

export interface PaginatedInstrumentsResponse {
  items: NormalizedInstrument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CatalogueStatistics {
  total_instruments: number;
  total_exchanges: number;
  primary_listings: number;
  adr_listings: number;
  active_instruments: number;
  us_instruments: number;
  international_instruments: number;
  timestamp_utc: string;
}

export interface ReallocationScenarioRequest {
  holdings: Array<{
    symbol: string;
    quantity: number;
    average_cost: number;
    currency?: string;
  }>;
  sells?: Array<{
    symbol: string;
    sell_all?: boolean;
    quantity?: number;
    percent?: number;
  }>;
  buys?: Array<{
    symbol: string;
    allocation_percent?: number;
    target_amount?: number;
    target_shares?: number;
  }>;
  capital_injection?: number;
  natural_language_prompt?: string;
  base_currency?: string;
}

export interface ReallocationScenarioResponse {
  before_nav: number;
  after_nav: number;
  nav_change: number;
  nav_change_percent: number;
  before_cash: number;
  after_cash: number;
  total_sale_proceeds: number;
  total_purchase_cost: number;
  transactions: Array<{
    action: string;
    symbol: string;
    company_name: string;
    shares: number;
    price: number;
    total_amount: number;
    currency: string;
  }>;
  current_positions: Array<{
    symbol: string;
    company_name: string;
    quantity: number;
    market_price: number;
    market_value: number;
    weight_percent: number;
    currency: string;
    sector?: string;
  }>;
  hypothetical_positions: Array<{
    symbol: string;
    company_name: string;
    quantity: number;
    market_price: number;
    market_value: number;
    weight_percent: number;
    currency: string;
    sector?: string;
  }>;
  before_hhi: number;
  after_hhi: number;
  hhi_delta: number;
  before_sector_allocation: Record<string, number>;
  after_sector_allocation: Record<string, number>;
  risk_observations: string[];
  assumptions: string[];
  timestamp_utc: string;
}

export async function fetchPaginatedInstruments(params: {
  query?: string;
  exchange?: string;
  country?: string;
  asset_type?: string;
  sector?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedInstrumentsResponse> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.append('query', params.query);
  if (params.exchange && params.exchange !== 'ALL') searchParams.append('exchange', params.exchange);
  if (params.country && params.country !== 'ALL') searchParams.append('country', params.country);
  if (params.asset_type && params.asset_type !== 'ALL') searchParams.append('asset_type', params.asset_type);
  if (params.sector && params.sector !== 'ALL') searchParams.append('sector', params.sector);
  searchParams.append('page', String(params.page || 1));
  searchParams.append('page_size', String(params.page_size || 20));

  const res = await fetch(`${BASE_URL}/market/instruments/paginated?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Paginated instruments error: ${res.statusText}`);
  return res.json();
}

export async function fetchCatalogStats(): Promise<CatalogueStatistics> {
  const res = await fetch(`${BASE_URL}/market/instruments/stats`);
  if (!res.ok) throw new Error(`Catalog stats error: ${res.statusText}`);
  return res.json();
}

export async function triggerCatalogSync(source: 'curated' | 'sec_edgar' = 'curated'): Promise<any> {
  const res = await fetch(`${BASE_URL}/market/instruments/sync?source=${encodeURIComponent(source)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Catalog sync error: ${res.statusText}`);
  return res.json();
}

export async function simulateReallocationScenario(
  payload: ReallocationScenarioRequest
): Promise<ReallocationScenarioResponse> {
  const res = await fetch(`${BASE_URL}/portfolio/scenario/reallocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Reallocation error: ${res.statusText}`);
  }
  return res.json();
}

