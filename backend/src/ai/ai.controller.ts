import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai/recommendations')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('active')
  async getActive() {
    const map = await this.aiService.getActiveRecommendations();
    return Array.from(map.values());
  }

  @Post('regenerate')
  async regenerate(@Body() body: { alertKey?: string }) {
    if (!body?.alertKey) {
      throw new BadRequestException('alertKey es requerido en el body.');
    }
    return this.aiService.regenerateOne(body.alertKey);
  }
}
