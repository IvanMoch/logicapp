import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { MovementType } from '@prisma/client';

@Injectable()
export class MovementsService {
  constructor(private prisma: PrismaService, private pdfService: PdfService) {}

  async create(data: {
    type: MovementType;
    referenceDoc?: string;
    details: { batchId: string; quantity: number }[];
  }) {
    if (!data.details || data.details.length === 0) {
      throw new BadRequestException('A movement must include at least one detail');
    }

    for (const d of data.details) {
      if (!d.batchId) {
        throw new BadRequestException('Each detail must reference a batch');
      }
      if (!Number.isFinite(d.quantity)) {
        throw new BadRequestException('Quantity must be a number');
      }
      if (data.type !== MovementType.ADJUSTMENT && d.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero for IN/OUT movements');
      }
      if (data.type === MovementType.ADJUSTMENT && d.quantity === 0) {
        throw new BadRequestException('Adjustment quantity cannot be zero');
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      const movement = await prisma.movement.create({
        data: {
          type: data.type,
          referenceDoc: data.referenceDoc,
          details: {
            create: data.details.map(d => ({
              batchId: d.batchId,
              quantity: d.quantity,
            })),
          },
        },
      });

      for (const detail of data.details) {
        const batch = await prisma.batch.findUnique({ where: { id: detail.batchId } });
        if (!batch) throw new BadRequestException(`Batch ${detail.batchId} not found`);

        let newQuantity = batch.currentQuantity;

        if (data.type === MovementType.IN) {
          newQuantity += detail.quantity;
        } else if (data.type === MovementType.OUT) {
          if (batch.currentQuantity < detail.quantity) {
            throw new BadRequestException(`Not enough stock in Batch ${batch.batchCode}`);
          }
          newQuantity -= detail.quantity;
        } else if (data.type === MovementType.ADJUSTMENT) {
          newQuantity += detail.quantity;
          if (newQuantity < 0) {
            throw new BadRequestException(`Adjustment would leave Batch ${batch.batchCode} with negative stock`);
          }
        }

        await prisma.batch.update({
          where: { id: detail.batchId },
          data: { currentQuantity: newQuantity },
        });
      }

      return movement;
    });
  }

  findAll() {
    return this.prisma.movement.findMany({
      include: {
        details: {
          include: { batch: { include: { product: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.movement.findUnique({
      where: { id },
      include: {
        details: {
          include: { batch: { include: { product: true } } },
        },
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const found = await this.prisma.movement.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!found;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const movement = await this.findOne(id);
    if (!movement) {
      throw new NotFoundException(`Movement with ID ${id} not found`);
    }
    return this.pdfService.generateMovementPdf(movement);
  }
}
