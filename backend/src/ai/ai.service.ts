import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { AlertRecommendationType } from '@prisma/client';
import { BatchesService } from '../batches/batches.service';
import { ProductsService } from '../products/products.service';

export type AlertRecommendation = {
  id: string;
  alertKey: string;
  alertType: 'EXPIRATION' | 'LOW_STOCK';
  accionInmediata: string;
  canalSugerido: string;
  descuentoPct: number;
  clienteObjetivo: string;
  justificacionEstacional: string;
  generatedAt: string;
};

type AlertInput =
  | {
      kind: 'EXPIRATION';
      alertKey: string;
      batchId: string;
      productId: string;
      promptPayload: any;
      contextSignature: string;
    }
  | {
      kind: 'LOW_STOCK';
      alertKey: string;
      productId: string;
      promptPayload: any;
      contextSignature: string;
    };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: GoogleGenAI | null;
  private readonly model = 'gemini-2.0-flash';

  constructor(
    private prisma: PrismaService,
    private batchesService: BatchesService,
    private productsService: ProductsService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY no está configurada. Las recomendaciones IA estarán deshabilitadas.',
      );
      this.client = null;
    } else {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  private buildExpirationInput(batch: any): AlertInput {
    const monthVE = this.getMonthInVenezuela();
    const yearVE = this.getYearInVenezuela();
    return {
      kind: 'EXPIRATION',
      alertKey: `batch:${batch.id}`,
      batchId: batch.id,
      productId: batch.productId ?? batch.product?.id,
      contextSignature: `EXPIRATION:${batch.severity ?? 'caution'}:${monthVE}:${yearVE}`,
      promptPayload: {
        id: `batch:${batch.id}`,
        tipo: 'vencimiento',
        producto: batch.product?.name,
        categoria: batch.product?.category,
        lote: batch.batchCode,
        diasRestantes: batch.daysUntilExpiration,
        severidad: batch.severity,
        stockActual: batch.currentQuantity,
      },
    };
  }

  private buildLowStockInput(product: any): AlertInput {
    const monthVE = this.getMonthInVenezuela();
    const yearVE = this.getYearInVenezuela();
    const stock = Array.isArray(product.batches)
      ? product.batches.reduce((acc: number, b: any) => acc + b.currentQuantity, 0)
      : 0;
    return {
      kind: 'LOW_STOCK',
      alertKey: `product:${product.id}`,
      productId: product.id,
      contextSignature: `LOW_STOCK:${monthVE}:${yearVE}`,
      promptPayload: {
        id: `product:${product.id}`,
        tipo: 'stockBajo',
        producto: product.name,
        categoria: product.category,
        stockActual: stock,
        stockMinimo: product.minStockLevel,
      },
    };
  }

  private getMonthInVenezuela(): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Caracas',
      month: 'numeric',
    });
    return parseInt(fmt.format(new Date()), 10);
  }

  private getYearInVenezuela(): number {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Caracas',
      year: 'numeric',
    });
    return parseInt(fmt.format(new Date()), 10);
  }

  async getRecommendationsForAlerts(
    expiringBatches: any[],
    lowStockProducts: any[],
  ): Promise<Map<string, AlertRecommendation>> {
    const inputs: AlertInput[] = [
      ...expiringBatches.map(b => this.buildExpirationInput(b)),
      ...lowStockProducts.map(p => this.buildLowStockInput(p)),
    ];

    const result = new Map<string, AlertRecommendation>();
    if (inputs.length === 0) return result;

    const cached = await this.prisma.alertRecommendation.findMany({
      where: { alertKey: { in: inputs.map(i => i.alertKey) } },
    });
    const cachedByKey = new Map(cached.map(r => [r.alertKey, r]));

    const toGenerate: AlertInput[] = [];
    for (const input of inputs) {
      const existing = cachedByKey.get(input.alertKey);
      if (existing && existing.contextSignature === input.contextSignature) {
        result.set(input.alertKey, this.toDto(existing));
      } else {
        toGenerate.push(input);
      }
    }

    if (toGenerate.length > 0 && this.client) {
      const generated = await this.generateBatch(toGenerate);
      for (const [alertKey, rec] of generated) {
        result.set(alertKey, rec);
      }
    } else if (toGenerate.length > 0) {
      this.logger.warn(
        `Faltan ${toGenerate.length} recomendaciones, pero GEMINI_API_KEY no está configurada.`,
      );
    }

    return result;
  }

  async getActiveRecommendations(): Promise<Map<string, AlertRecommendation>> {
    const [expiringBatches, lowStockProducts] = await Promise.all([
      this.batchesService.findExpiring(),
      this.productsService.findLowStock(),
    ]);
    return this.getRecommendationsForAlerts(expiringBatches, lowStockProducts);
  }

  async regenerateOne(alertKey: string): Promise<AlertRecommendation> {
    const input = await this.resolveAlertInput(alertKey);
    if (!input) {
      throw new NotFoundException(`Alerta ${alertKey} no encontrada o ya no está activa.`);
    }
    if (!this.client) {
      throw new NotFoundException(
        'GEMINI_API_KEY no está configurada. No se pueden regenerar recomendaciones.',
      );
    }
    const generated = await this.generateBatch([input], { force: true });
    const rec = generated.get(alertKey);
    if (!rec) {
      throw new NotFoundException(`No se pudo generar recomendación para ${alertKey}.`);
    }
    return rec;
  }

  private async resolveAlertInput(alertKey: string): Promise<AlertInput | null> {
    const [kind, id] = alertKey.split(':');
    if (kind === 'batch') {
      const batches = await this.batchesService.findExpiring();
      const match = batches.find(b => b.id === id);
      return match ? this.buildExpirationInput(match) : null;
    }
    if (kind === 'product') {
      const products = await this.productsService.findLowStock();
      const match = products.find((p: any) => p.id === id);
      return match ? this.buildLowStockInput(match) : null;
    }
    return null;
  }

  private async generateBatch(
    inputs: AlertInput[],
    opts: { force?: boolean } = {},
  ): Promise<Map<string, AlertRecommendation>> {
    const result = new Map<string, AlertRecommendation>();
    if (!this.client) return result;

    const fechaVenezuela = new Date().toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      dateStyle: 'full',
    } as Intl.DateTimeFormatOptions);

    const prompt = `
Eres un asesor comercial de inventario para una empresa agropecuaria en Venezuela.

Fecha actual en Venezuela: ${fechaVenezuela}

CALENDARIO ESTACIONAL DE REFERENCIA (Venezuela):
- Ene–Mar: temporada seca, demanda alta de agroquímicos preventivos y riego.
- Abr–Jun: inicio de lluvias, alta demanda de semillas y fertilizantes.
- Jul–Sep: temporada lluviosa, demanda alta de productos veterinarios; inicio de clases.
- Oct–Nov: cosecha de café y cacao, alta rotación de granos.
- Dic: navidad/hallacas — demanda alta de carnes, harinas, aceitunas, condimentos y especias.
- Carnaval/Semana Santa (feb–abr): alta demanda de pescado, atún enlatado, sardinas.

Para CADA alerta a continuación, genera una recomendación de comercialización tomando en cuenta la temporada actual en Venezuela. Considera la severidad del vencimiento, la categoría del producto y si la fecha actual cae dentro de una temporada favorable o de baja rotación.

Devuelve un ARRAY JSON donde cada elemento tenga EXACTAMENTE estos campos:
{
  "id": "<id de la alerta, copiado tal cual del input>",
  "accionInmediata": "<1 frase clara con la acción comercial más urgente>",
  "canalSugerido": "<canal de venta sugerido (ej: minorista directo, distribuidor mayorista, feria local, donación, retiro)>",
  "descuentoPct": <número entero entre 0 y 50>,
  "clienteObjetivo": "<perfil del cliente al cual dirigir el producto>",
  "justificacionEstacional": "<máx 2 frases explicando por qué la temporada actual en Venezuela favorece o complica la rotación de este producto>"
}

ALERTAS:
${JSON.stringify(inputs.map(i => i.promptPayload), null, 2)}

Responde ÚNICAMENTE con el array JSON válido. Sin markdown, sin texto introductorio, sin explicación adicional.
`.trim();

    let parsed: Array<Record<string, any>> = [];
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });
      const text = response.text;
      if (!text) return result;
      const json = JSON.parse(text);
      if (!Array.isArray(json)) return result;
      parsed = json;
    } catch (err: any) {
      this.logger.error(`Error al generar recomendaciones IA: ${err?.message ?? err}`, err?.stack);
      return result;
    }

    const inputByKey = new Map(inputs.map(i => [i.alertKey, i]));
    for (const item of parsed) {
      const input = inputByKey.get(item?.id);
      if (!input) continue;
      const data = {
        accionInmediata: String(item.accionInmediata ?? ''),
        canalSugerido: String(item.canalSugerido ?? ''),
        descuentoPct: this.clampPct(item.descuentoPct),
        clienteObjetivo: String(item.clienteObjetivo ?? ''),
        justificacionEstacional: String(item.justificacionEstacional ?? ''),
      };

      const saved = await this.prisma.alertRecommendation.upsert({
        where: { alertKey: input.alertKey },
        create: {
          alertKey: input.alertKey,
          alertType: input.kind as AlertRecommendationType,
          contextSignature: input.contextSignature,
          batchId: input.kind === 'EXPIRATION' ? input.batchId : null,
          productId: input.productId ?? null,
          ...data,
        },
        update: {
          contextSignature: input.contextSignature,
          generatedAt: new Date(),
          ...data,
        },
      });

      result.set(input.alertKey, this.toDto(saved));
    }

    return result;
  }

  private clampPct(v: any): number {
    const n = typeof v === 'number' ? v : parseInt(v, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(50, Math.round(n)));
  }

  private toDto(row: any): AlertRecommendation {
    return {
      id: row.id,
      alertKey: row.alertKey,
      alertType: row.alertType,
      accionInmediata: row.accionInmediata,
      canalSugerido: row.canalSugerido,
      descuentoPct: row.descuentoPct,
      clienteObjetivo: row.clienteObjetivo,
      justificacionEstacional: row.justificacionEstacional,
      generatedAt:
        row.generatedAt instanceof Date ? row.generatedAt.toISOString() : String(row.generatedAt),
    };
  }
}
