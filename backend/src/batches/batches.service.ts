import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.BatchUncheckedCreateInput) {
    return this.prisma.batch.create({ data });
  }

  findAll() {
    return this.prisma.batch.findMany({
      include: { product: true, locations: { include: { location: true } } },
    });
  }

  async findExpiring() {
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const batches = await this.prisma.batch.findMany({
      where: {
        expirationDate: { lte: sixtyDaysFromNow },
        currentQuantity: { gt: 0 },
      },
      include: { product: true },
      orderBy: { expirationDate: 'asc' },
    });

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return batches.map(batch => {
      const daysUntilExpiration = Math.ceil(
        (new Date(batch.expirationDate).getTime() - now.getTime()) / MS_PER_DAY,
      );
      let severity: 'critical' | 'urgent' | 'caution';
      if (daysUntilExpiration < 15) severity = 'critical';
      else if (daysUntilExpiration < 30) severity = 'urgent';
      else severity = 'caution';
      return { ...batch, daysUntilExpiration, severity };
    });
  }

  findOne(id: string) {
    return this.prisma.batch.findUnique({
      where: { id },
      include: { product: true, locations: { include: { location: true } } },
    });
  }

  update(id: string, data: Prisma.BatchUpdateInput) {
    return this.prisma.batch.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.batch.delete({ where: { id } });
  }
}
