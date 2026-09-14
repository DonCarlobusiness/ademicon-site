import type Anthropic from '@anthropic-ai/sdk';
import type { Field, Locale, Producer } from '../../domain/types.js';

/** Estado que as ferramentas compartilham durante um turno. */
export interface ToolContext {
  producer: Producer;
  field: Field | null;
  locale: Locale;
  /** Imagens recebidas neste turno, para o diagnostico por foto. */
  pendingImages: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }[];
  /** PDFs recebidos neste turno (tipicamente o laudo de solo). */
  pendingDocuments: { base64: string; filename: string }[];
  /** Efeitos colaterais coletados: PNGs a enviar depois da resposta. */
  attachments: { path: string; caption: string }[];
  /** True quando alguma ferramenta de satelite retornou dado real. */
  satelliteToolSucceeded: boolean;
}

export interface AgentTool {
  definition: Anthropic.Tool;
  /** Nunca lanca: devolve texto para o modelo, inclusive em caso de erro. */
  run(input: unknown, ctx: ToolContext): Promise<string>;
}
