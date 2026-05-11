import { Controller, Get, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import express from 'express';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKPIs() {
    return this.dashboardService.getKPIs();
  }

  @Get('stock-by-category')
  getStockByCategory() {
    return this.dashboardService.getStockByCategory();
  }

  /**
   * GET /dashboard/report/alerts — devuelve el reporte de alertas en PDF.
   */
  @Get('report/alerts')
  async downloadAlertsPdf(@Res() res: express.Response) {
    const buffer = await this.dashboardService.generateAlertsPdf();
    const filename = `alertas-inventario-${new Date().toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
