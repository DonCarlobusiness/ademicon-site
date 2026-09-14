import type { AgentTool } from './types.js';
import { getNdviTool } from './getNdvi.js';
import { getWeatherTool } from './getWeather.js';
import { diagnosePhotoTool } from './diagnosePhoto.js';
import { fertilizerCalcTool } from './fertilizerCalc.js';
import { marketPriceTool } from './marketPrice.js';
import { readSoilReportTool } from './readSoilReport.js';

/**
 * Ordem FIXA. A lista de tools e renderizada antes do system prompt no
 * calculo do cache: se a ordem variar entre requisicoes, o prefixo muda e
 * o cache nunca acerta.
 */
export const TOOLS: AgentTool[] = [
  getNdviTool,
  getWeatherTool,
  diagnosePhotoTool,
  fertilizerCalcTool,
  marketPriceTool,
  readSoilReportTool,
];

export const TOOL_DEFINITIONS = TOOLS.map((tool) => tool.definition);

const BY_NAME = new Map(TOOLS.map((tool) => [tool.definition.name, tool]));

export function findTool(name: string): AgentTool | undefined {
  return BY_NAME.get(name);
}

export type { AgentTool, ToolContext } from './types.js';
