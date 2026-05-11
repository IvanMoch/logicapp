import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.LocationCreateInput) {
    return this.prisma.location.create({ data });
  }

  async assignBatch(batchId: string, locationId: string, quantity: number) {
    // Upsert logic: if batch is already in that location, update quantity. Else create.
    const existing = await this.prisma.batchLocation.findUnique({
      where: {
        batchId_locationId: {
          batchId,
          locationId
        }
      }
    });

    if (existing) {
      return this.prisma.batchLocation.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity }
      });
    }

    return this.prisma.batchLocation.create({
      data: {
        batchId,
        locationId,
        quantity
      }
    });
  }

  async moveBatch(
    batchId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a cero.');
    }
    if (fromLocationId === toLocationId) {
      throw new BadRequestException('La ubicación origen y destino son la misma.');
    }

    return this.prisma.$transaction(async tx => {
      const source = await tx.batchLocation.findUnique({
        where: { batchId_locationId: { batchId, locationId: fromLocationId } },
      });
      if (!source) {
        throw new NotFoundException('El lote no está asignado a la ubicación origen.');
      }
      if (source.quantity < quantity) {
        throw new BadRequestException(
          `Cantidad insuficiente en origen (disponible: ${source.quantity}).`,
        );
      }

      if (source.quantity === quantity) {
        await tx.batchLocation.delete({ where: { id: source.id } });
      } else {
        await tx.batchLocation.update({
          where: { id: source.id },
          data: { quantity: source.quantity - quantity },
        });
      }

      const target = await tx.batchLocation.findUnique({
        where: { batchId_locationId: { batchId, locationId: toLocationId } },
      });
      if (target) {
        return tx.batchLocation.update({
          where: { id: target.id },
          data: { quantity: target.quantity + quantity },
        });
      }
      return tx.batchLocation.create({
        data: { batchId, locationId: toLocationId, quantity },
      });
    });
  }

  findAll() {
    return this.prisma.location.findMany({
      include: {
        batches: {
          include: { batch: { include: { product: true } } }
        }
      }
    });
  }

  findOne(id: string) {
    return this.prisma.location.findUnique({ 
      where: { id },
      include: {
        batches: {
          include: { batch: { include: { product: true } } }
        }
      }
    });
  }

  update(id: string, data: Prisma.LocationUpdateInput) {
    return this.prisma.location.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }
}
