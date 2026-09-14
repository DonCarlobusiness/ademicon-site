import { env } from '../../config/env.js';
import { httpJson } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import type { Crop, MarketPrice, ToolResult } from '../../domain/types.js';

/**
 * Preco spot regional.
 *
 * Sem feed contratado (CEPEA/B3/corretora) isto devolve 'not_configured' —
 * de proposito. Preco errado faz o produtor vender errado, entao e melhor
 * dizer "nao tenho" do que chutar.
 */
export async function getMarketPrice(crop: Crop, region: string): Promise<ToolResult<MarketPrice>> {
  if (!env.MARKET_PRICE_BASE_URL) {
    return { ok: false, reason: 'not_configured', detail: 'feed de precos nao contratado' };
  }
  try {
    const res = await httpJson<{
      price: number; unit: string; currency: string; reference_date: string; source: string;
    }>(
      `${env.MARKET_PRICE_BASE_URL}/prices?crop=${encodeURIComponent(crop)}&region=${encodeURIComponent(region)}`,
      { label: 'market.price', timeoutMs: 10_000 },
    );
    return {
      ok: true,
      data: {
        crop,
        region,
        unit: res.unit,
        price: res.price,
        currency: res.currency,
        referenceDate: res.reference_date,
        source: res.source,
      },
    };
  } catch (err) {
    logger.warn({ err: String(err), crop, region }, 'feed de precos falhou');
    return { ok: false, reason: 'upstream_error' };
  }
}
