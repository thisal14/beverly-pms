import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  
  static async getSummary(req: Request, res: Response) {
    try {
      const kpis = await DashboardService.getGlobalKPIs();
      const revenueByProperty = await DashboardService.getRevenueByProperty();
      const recentActivity = await DashboardService.getRecentActivity();

      return res.status(200).json({
        success: true,
        data: {
          kpis,
          revenueByProperty,
          recentActivity
        }
      });
    } catch (error: any) {
      console.error('Super Admin Dashboard Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch global dashboard data',
        error: error.message
      });
    }
  }

  static async getGlobalMetrics(req: Request, res: Response) {
      try {
          const kpis = await DashboardService.getGlobalKPIs();
          return res.status(200).json({ success: true, data: kpis });
      } catch (error: any) {
          return res.status(500).json({ success: false, message: error.message });
      }
  }

  static async getRevenueStats(req: Request, res: Response) {
      try {
          const stats = await DashboardService.getRevenueByProperty();
          return res.status(200).json({ success: true, data: stats });
      } catch (error: any) {
          return res.status(500).json({ success: false, message: error.message });
      }
  }
}
