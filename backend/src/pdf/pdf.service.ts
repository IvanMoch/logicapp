import { Injectable } from "@nestjs/common";
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { AlertRecommendation } from '../ai/ai.service';

@Injectable()
export class PdfService {
  private printer: any;

  constructor() {
    // Configuramos las fuentes estándar predefinidas
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    // @ts-ignore
    this.printer = new PdfPrinter(fonts);
  }

  generateMovementPdf(movement: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const isInput = movement.type === 'IN';
        const typeLabel = isInput ? 'Comprobante de Entrada' : (movement.type === 'OUT' ? 'Comprobante de Salida' : 'Comprobante de Ajuste');
        
        const docDefinition: TDocumentDefinitions = {
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
          },
          content: [
            { text: 'Agropecuaria - Gestión de Inventarios', style: 'header' },
            { text: typeLabel, style: 'subheader' },
            { text: '\n' },
            {
              columns: [
                { text: `ID Transacción: ${movement.id}`, width: '*' },
                { text: `Fecha: ${new Date(movement.date).toLocaleString()}`, width: '*' },
              ],
            },
            { text: `Documento de Referencia: ${movement.referenceDoc || 'N/A'}\n\n` },
            {
              table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto'],
                body: [
                  [{ text: 'SKU', bold: true }, { text: 'Producto', bold: true }, { text: 'Lote', bold: true }, { text: 'Cantidad', bold: true }],
                  ...(movement.details as Array<{
                    quantity: number;
                    batch: { batchCode: string; product: { sku: string; name: string } };
                  }>).map(detail => [
                    detail.batch.product.sku,
                    detail.batch.product.name,
                    detail.batch.batchCode,
                    detail.quantity.toString()
                  ])
                ]
              }
            }
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              alignment: 'center',
            },
            subheader: {
              fontSize: 14,
              bold: true,
              alignment: 'center',
              margin: [0, 5, 0, 0]
            }
          }
        };

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));
        
        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateProductPdf(product: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const docDefinition: TDocumentDefinitions = {
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
          },
          content: [
            { text: 'Agropecuaria - Gestión de Inventarios', style: 'header' },
            { text: 'Ficha de Producto', style: 'subheader' },
            { text: '\n' },
            {
              columns: [
                { text: `Producto: ${product.name}`, style: 'fieldLabel', width: '*' },
                { text: `SKU: ${product.sku}`, style: 'fieldLabel', width: '*' },
              ],
            },
            { text: `Categoría: ${product.category}\n` },
            { text: `Descripción: ${product.description || 'Sin descripción'}\n\n` },
            { text: 'Existencias por Lote', style: 'sectionTitle' },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Código de Lote', bold: true },
                    { text: 'Fecha Exp.', bold: true },
                    { text: 'Ubicación', bold: true },
                    { text: 'Stock Actual', bold: true }
                  ],
                  ...(product.batches && product.batches.length > 0
                    ? product.batches.map((batch: any) => [
                        batch.batchCode,
                        batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString() : 'N/A',
                        batch.location ? `${batch.location.area}-${batch.location.section}-${batch.location.row}-${batch.location.shelf}` : 'N/A',
                        batch.currentQuantity.toString()
                      ])
                    : [[{ text: 'No hay lotes registrados', colSpan: 4, alignment: 'center' }, {}, {}, {}]])
                ]
              }
            },
            { text: `\nStock Total: ${product.batches ? product.batches.reduce((acc: number, b: any) => acc + b.currentQuantity, 0) : 0}`, bold: true }
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              alignment: 'center',
            },
            subheader: {
              fontSize: 14,
              bold: true,
              alignment: 'center',
              margin: [0, 5, 0, 0]
            },
            sectionTitle: {
              fontSize: 12,
              bold: true,
              margin: [0, 10, 0, 5]
            },
            fieldLabel: {
              bold: true
            }
          }
        };

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateAllProductsPdf(products: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const docDefinition: TDocumentDefinitions = {
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
          },
          content: [
            { text: 'Agropecuaria - Gestión de Inventarios', style: 'header' },
            { text: 'Inventario Consolidado de Productos', style: 'subheader' },
            { text: '\n' },
            { text: `Fecha de emisión: ${new Date().toLocaleString()}\n\n` },
            {
              table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto'],
                body: [
                  [
                    { text: 'SKU', bold: true },
                    { text: 'Producto', bold: true },
                    { text: 'Categoría', bold: true },
                    { text: 'Stock Total', bold: true }
                  ],
                  ...products.map(product => {
                    const totalStock = product.batches ? product.batches.reduce((acc: number, b: any) => acc + b.currentQuantity, 0) : 0;
                    return [
                      product.sku,
                      product.name,
                      product.category,
                      { text: totalStock.toString(), alignment: 'right' }
                    ];
                  })
                ]
              }
            }
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              alignment: 'center',
            },
            subheader: {
              fontSize: 14,
              bold: true,
              alignment: 'center',
              margin: [0, 5, 0, 0]
            }
          }
        };

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateAlertsPdf(
    expiringBatches: any[],
    lowStockProducts: any[],
    recommendations: Map<string, AlertRecommendation> = new Map(),
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const severityTiers: Array<{
          key: 'critical' | 'urgent' | 'caution';
          title: string;
          criterion: string;
          action: string;
          fill: string;
          accent: string;
        }> = [
          {
            key: 'critical',
            title: 'Crítico (Rojo)',
            criterion: 'Productos con menos de 15 días para vencer',
            action: 'Retirar del anaquel o tramitar devolución al proveedor.',
            fill: '#FBE5DD',
            accent: '#B7472A',
          },
          {
            key: 'urgent',
            title: 'Urgente (Naranja)',
            criterion: 'Productos con 15 a 30 días para vencer',
            action: 'Ofrecer con descuento, priorizar en despacho, contactar clientes frecuentes.',
            fill: '#FBF1DE',
            accent: '#C9851F',
          },
          {
            key: 'caution',
            title: 'Precaución (Amarillo)',
            criterion: 'Productos con 30 a 60 días para vencer',
            action: 'Monitorear rotación, activar estrategia de venta proactiva.',
            fill: '#FAF1D2',
            accent: '#D4A52A',
          },
        ];

        const formatDays = (d: number | undefined) => {
          if (typeof d !== 'number') return 'N/A';
          if (d < 0) return `Vencido hace ${Math.abs(d)}d`;
          if (d === 0) return 'Hoy';
          return `${d}d`;
        };

        const renderRecommendationBlock = (rec: AlertRecommendation | undefined): any => {
          if (!rec) {
            return {
              text: 'Sin recomendación IA disponible (revisar configuración de GEMINI_API_KEY o conexión).',
              italics: true,
              color: '#888',
              fontSize: 9,
              margin: [0, 2, 0, 0],
            };
          }
          return {
            stack: [
              {
                text: 'Recomendación IA',
                bold: true,
                fontSize: 9,
                color: '#1B4A87',
                margin: [0, 0, 0, 3],
              },
              {
                columns: [
                  {
                    width: '*',
                    stack: [
                      { text: [{ text: 'Acción inmediata: ', bold: true }, rec.accionInmediata], fontSize: 9, margin: [0, 0, 0, 2] },
                      { text: [{ text: 'Canal sugerido: ', bold: true }, rec.canalSugerido], fontSize: 9, margin: [0, 0, 0, 2] },
                      { text: [{ text: 'Cliente objetivo: ', bold: true }, rec.clienteObjetivo], fontSize: 9, margin: [0, 0, 0, 2] },
                    ],
                  },
                  {
                    width: 80,
                    stack: [
                      { text: 'Descuento', fontSize: 8, color: '#666', alignment: 'center' },
                      { text: `${rec.descuentoPct}%`, fontSize: 16, bold: true, alignment: 'center', color: '#1B4A87' },
                    ],
                  },
                ],
              },
              {
                text: [{ text: 'Estacionalidad Venezuela: ', bold: true }, rec.justificacionEstacional],
                fontSize: 9,
                italics: true,
                color: '#444',
                margin: [0, 4, 0, 0],
              },
            ],
          };
        };

        const renderBatchEntry = (b: any, tier: typeof severityTiers[number]): any => {
          const rec = recommendations.get(`batch:${b.id}`);
          return {
            margin: [0, 4, 0, 8],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: tier.fill,
                    stack: [
                      {
                        text: [
                          { text: `Lote ${b.batchCode} `, bold: true },
                          { text: `— ${b.product?.name ?? 'Producto'}`, bold: true },
                        ],
                        fontSize: 11,
                      },
                      {
                        text: `Vence ${new Date(b.expirationDate).toLocaleDateString()} (${formatDays(b.daysUntilExpiration)}) · Stock actual: ${b.currentQuantity} · Categoría: ${b.product?.category ?? 'N/A'}`,
                        fontSize: 9,
                        color: '#333',
                        margin: [0, 2, 0, 0],
                      },
                    ],
                    margin: [6, 4, 6, 4],
                  },
                ],
                [
                  {
                    stack: [renderRecommendationBlock(rec)],
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => tier.accent,
              vLineColor: () => tier.accent,
            },
          };
        };

        const renderLowStockEntry = (p: any): any => {
          const totalStock = Array.isArray(p.batches)
            ? p.batches.reduce((acc: number, b: any) => acc + b.currentQuantity, 0)
            : 0;
          const rec = recommendations.get(`product:${p.id}`);
          return {
            margin: [0, 4, 0, 8],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#E6EFFA',
                    stack: [
                      {
                        text: [
                          { text: `${p.name} `, bold: true },
                          { text: `(${p.sku})`, italics: true, color: '#555' },
                        ],
                        fontSize: 11,
                      },
                      {
                        text: `Stock actual: ${totalStock} · Mínimo requerido: ${p.minStockLevel} · Categoría: ${p.category ?? 'N/A'}`,
                        fontSize: 9,
                        color: '#333',
                        margin: [0, 2, 0, 0],
                      },
                    ],
                    margin: [6, 4, 6, 4],
                  },
                ],
                [
                  {
                    stack: [renderRecommendationBlock(rec)],
                    margin: [6, 4, 6, 4],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#1B4A87',
              vLineColor: () => '#1B4A87',
            },
          };
        };

        const expirationSections: any[] = [];
        severityTiers.forEach((tier, idx) => {
          const tierBatches = expiringBatches.filter(b => b.severity === tier.key);
          expirationSections.push(
            { text: `1.${idx + 1} ${tier.title}`, style: 'sectionTitle' },
            { text: `Criterio: ${tier.criterion}`, style: 'criterion' },
            { text: `Acción recomendada: ${tier.action}`, style: 'action' },
            ...(tierBatches.length > 0
              ? tierBatches.map(b => renderBatchEntry(b, tier))
              : [{ text: `Sin lotes en nivel ${tier.title.toLowerCase()}.`, italics: true, color: '#888', margin: [0, 4, 0, 8] }]),
          );
        });

        const lowStockSection: any[] = lowStockProducts.length > 0
          ? lowStockProducts.map(p => renderLowStockEntry(p))
          : [{ text: 'No hay productos con stock bajo.', italics: true, color: '#888', margin: [0, 4, 0, 0] }];

        const aiNote = recommendations.size > 0
          ? `Las recomendaciones IA fueron generadas automáticamente considerando la temporada actual en Venezuela y la categoría de cada producto. Verificar antes de ejecutar acciones comerciales.`
          : `No se generaron recomendaciones IA en este reporte (verificar configuración de GEMINI_API_KEY o disponibilidad del servicio).`;

        const docDefinition: TDocumentDefinitions = {
          defaultStyle: {
            font: 'Helvetica',
            fontSize: 10,
          },
          content: [
            { text: 'Agropecuaria - Gestión de Inventarios', style: 'header' },
            { text: 'Reporte de Alertas de Inventario', style: 'subheader' },
            { text: '\n' },
            { text: `Fecha de emisión: ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}` },
            { text: aiNote, fontSize: 9, italics: true, color: '#555', margin: [0, 4, 0, 8] },

            { text: '1. Niveles de Alerta por Vencimiento', style: 'sectionTitle' },
            ...expirationSections,

            { text: '2. Productos con Stock Bajo', style: 'sectionTitle' },
            ...lowStockSection,
          ],
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              alignment: 'center',
            },
            subheader: {
              fontSize: 14,
              bold: true,
              alignment: 'center',
              margin: [0, 5, 0, 0]
            },
            sectionTitle: {
              fontSize: 12,
              bold: true,
              margin: [0, 10, 0, 5]
            },
            criterion: {
              fontSize: 10,
              italics: true,
              margin: [0, 0, 0, 2],
            },
            action: {
              fontSize: 10,
              margin: [0, 0, 0, 5],
            },
          }
        };

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: any) => reject(err));

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}