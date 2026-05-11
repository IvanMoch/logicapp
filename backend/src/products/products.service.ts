import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private pdfService: PdfService) {}

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        batches: true,
      },
    });
  }

  async findLowStock() {
    const products = await this.findAll();
    return products.filter(product => {
      const totalStock = product.batches.reduce((acc, batch) => acc + batch.currentQuantity, 0);
      return totalStock < product.minStockLevel;
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        batches: {
          include: { locations: true },
        },
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!found;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const product = await this.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.pdfService.generateProductPdf(product);
  }

  async generateAllPdf(): Promise<Buffer> {
    const products = await this.findAll();
    return this.pdfService.generateAllProductsPdf(products);
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}

