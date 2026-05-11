import { Controller, Get, Post, Body, Patch, Param, Delete, Head, Res, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Prisma } from '@prisma/client';
import express from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: Prisma.ProductCreateInput) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  /**
   * GET /products/report/total — devuelve el inventario consolidado en PDF.
   */
  @Get('report/total')
  async downloadTotalPdf(@Res() res: express.Response) {
    const buffer = await this.productsService.generateAllPdf();
    const filename = `inventario-total-${new Date().toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * HEAD /products/:id/pdf — usado por el cliente para verificar
   * que el producto existe antes de abrir el PDF en un visor externo.
   */
  @Head(':id/pdf')
  async checkPdf(@Param('id') id: string): Promise<void> {
    const exists = await this.productsService.exists(id);
    if (!exists) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  /**
   * GET /products/:id/pdf — devuelve la ficha del producto en PDF.
   */
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: express.Response
  ) {
    const buffer = await this.productsService.generatePdf(id);
    const filename = `producto-${id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: Prisma.ProductUpdateInput) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

