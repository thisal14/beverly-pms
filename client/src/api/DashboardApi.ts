import axios from './axios';

export interface DashboardKPIs {
  totalRevenue: string | number;
  totalHotels: number;
  totalRooms: number;
  occupancyRate: string;
  upcomingCheckinsToday: number;
}

export interface RevenueByProperty {
  id: number;
  name: string;
  revenue: string | number;
}

export interface RecentActivity {
  id: number;
  action: string;
  table_name: string | null;
  created_at: string;
  user_name: string | null;
  hotel_name: string | null;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  revenueByProperty: RevenueByProperty[];
  recentActivity: RecentActivity[];
}

export class DashboardApi {
  static async getSummary(): Promise<DashboardSummary> {
    const response = await axios.get('/dashboard/summary');
    return response.data.data;
  }

  static async getMetrics(): Promise<DashboardKPIs> {
    const response = await axios.get('/dashboard/metrics');
    return response.data.data;
  }

  static async getRevenueStats(): Promise<RevenueByProperty[]> {
    const response = await axios.get('/dashboard/revenue');
    return response.data.data;
  }
}
