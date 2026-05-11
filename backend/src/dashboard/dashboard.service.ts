import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { ProductsService } from '../products/products.service';
import { PdfService } from '../pdf/pdf.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private batchesService: BatchesService,
    private productsService: ProductsService,
    private pdfService: PdfService,
    private aiService: AiService,
  ) {}

  async getKPIs() {
    const totalStockResult = await this.prisma.batch.aggregate({
      _sum: {
        currentQuantity: true,
      },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const movements = await this.prisma.movement.groupBy({
      by: ['type'],
      where: {
        date: {
          gte: startOfMonth,
        },
      },
      _count: {
        _all: true,
      },
    });

    let inputsThisMonth = 0;
    let outputsThisMonth = 0;

    movements.forEach(m => {
      if (m.type === 'IN') inputsThisMonth = m._count._all;
      if (m.type === 'OUT') outputsThisMonth = m._count._all;
    });

    // Mock projected outputs (could be complex historical average logic)
    const projectedOutputs = outputsThisMonth * 1.5; 

    return {
      totalStock: totalStockResult._sum.currentQuantity || 0,
      inputsThisMonth,
      outputsThisMonth,
      projectedOutputs: Math.round(projectedOutputs),
    };
  }

  async getStockByCategory() {
    // We need to join batches with products to group by category.
    // Prisma groupBy doesn't fully support relations yet for sums, so we do it via findMany and JS reduce.
    const batches = await this.prisma.batch.findMany({
      include: {
        product: true,
      },
    });

    const categoryMap = batches.reduce((acc, batch) => {
      const category = batch.product.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += batch.currentQuantity;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));
  }

  async generateAlertsPdf(): Promise<Buffer> {
    const [expiringBatches, lowStockProducts] = await Promise.all([
      this.batchesService.findExpiring(),
      this.productsService.findLowStock(),
    ]);

    const recommendations = await this.aiService.getRecommendationsForAlerts(
      expiringBatches,
      lowStockProducts,
    );

    return this.pdfService.generateAlertsPdf(expiringBatches, lowStockProducts, recommendations);
  }
}
