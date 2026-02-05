import { Request, Response } from 'express';
import { StatsService } from '../services/stats.service.js';

export class AdminStatsController {
  
  /**
   * Get CS Performance Stats
   * GET /api/v1/admin/stats/cs-performance
   */
  static async getCSPerformance(req: Request, res: Response) {
    const { timeRange, startDate, endDate } = req.query;
    
    const data = await StatsService.getCSPerformance(
      timeRange as string, 
      startDate as string, 
      endDate as string
    );

    res.json({
      code: 0,
      message: 'success',
      data
    });
  }

  /**
   * Get Platform Finance Stats
   * GET /api/v1/admin/stats/platform-finance
   */
  static async getPlatformFinance(req: Request, res: Response) {
    const { timeRange, startDate, endDate } = req.query;
    
    const data = await StatsService.getPlatformFinance(
      timeRange as string, 
      startDate as string, 
      endDate as string
    );

    res.json({
      code: 0,
      message: 'success',
      data
    });
  }
}
