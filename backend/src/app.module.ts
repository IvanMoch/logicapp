import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { BatchesModule } from './batches/batches.module';
import { LocationsModule } from './locations/locations.module';
import { MovementsModule } from './movements/movements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PdfModule } from './pdf/pdf.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, ProductsModule, BatchesModule, LocationsModule, MovementsModule, DashboardModule, PdfModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
