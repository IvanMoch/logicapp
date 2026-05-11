import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Prisma } from '@prisma/client';

class AssignBatchDto {
  batchId: string;
  locationId: string;
  quantity: number;
}

class MoveBatchDto {
  batchId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(@Body() createLocationDto: Prisma.LocationCreateInput) {
    return this.locationsService.create(createLocationDto);
  }

  @Post('assign')
  assignBatch(@Body() assignDto: AssignBatchDto) {
    return this.locationsService.assignBatch(assignDto.batchId, assignDto.locationId, assignDto.quantity);
  }

  @Post('move')
  moveBatch(@Body() dto: MoveBatchDto) {
    return this.locationsService.moveBatch(
      dto.batchId,
      dto.fromLocationId,
      dto.toLocationId,
      dto.quantity,
    );
  }

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLocationDto: Prisma.LocationUpdateInput) {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
