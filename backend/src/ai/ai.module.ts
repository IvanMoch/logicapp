import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BatchesModule } from '../batches/batches.module';
import { ProductsModule } from '../products/products.module';

@Global()
@Module({
  imports: [BatchesModule, ProductsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
