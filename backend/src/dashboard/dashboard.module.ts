import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BatchesModule } from '../batches/batches.module';
import { ProductsModule } from '../products/products.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [BatchesModule, ProductsModule, PdfModule],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
