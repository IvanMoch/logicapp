import {
  Controller,
  Get,
  Head,
  Post,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementType } from '@prisma/client';
import type { Response } from 'express';

class CreateMovementDto {
  type: MovementType;
  referenceDoc?: string;
  details: {
    batchId: string;
    quantity: number;
  }[];
}

@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.movementsService.create(createMovementDto);
  }

  @Get()
  findAll() {
    return this.movementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(id);
  }

  /**
   * HEAD /movements/:id/pdf — usado por el cliente para verificar
   * que el movimiento existe antes de abrir el PDF en un visor externo.
   * No genera el PDF: sólo confirma 200/404.
   */
  @Head(':id/pdf')
  async checkPdf(@Param('id') id: string): Promise<void> {
    const exists = await this.movementsService.exists(id);
    if (!exists) {
      throw new NotFoundException(`Movement with ID ${id} not found`);
    }
  }

  /**
   * GET /movements/:id/pdf — devuelve el comprobante en PDF.
   * Por defecto se sirve `inline` para que el navegador lo renderice.
   * Pasar `?download=1` fuerza descarga (Content-Disposition: attachment).
   */
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.movementsService.generatePdf(id);

    const disposition = download === '1' || download === 'true' ? 'attachment' : 'inline';
    const filename = `comprobante-${id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-store',
    });

    return new StreamableFile(buffer);
  }
}
