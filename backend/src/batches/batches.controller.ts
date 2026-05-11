import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { Prisma } from '@prisma/client';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(@Body() createBatchDto: Prisma.BatchUncheckedCreateInput) {
    return this.batchesService.create(createBatchDto);
  }

  @Get()
  findAll() {
    return this.batchesService.findAll();
  }

  @Get('expiring')
  findExpiring() {
    return this.batchesService.findExpiring();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBatchDto: Prisma.BatchUpdateInput) {
    return this.batchesService.update(id, updateBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.batchesService.remove(id);
  }
}
