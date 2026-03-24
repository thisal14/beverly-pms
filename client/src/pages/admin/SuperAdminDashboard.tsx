import { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Building2, BedDouble, 
  DollarSign, Activity, ArrowUpRight,
  Users
} from 'lucide-react';
import { DashboardApi } from '../../api/DashboardApi';
import type { DashboardSummary } from '../../api/DashboardApi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const summary = await DashboardApi.getSummary();
      setData(summary);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load global dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-gold rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Aggregating Global Metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Group Executive Overview</h1>
          <p className="text-gray-500">Real-time performance across all hotel properties</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            <Activity size={16} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Group Revenue" 
          value={`$${Number(data?.kpis.totalRevenue).toLocaleString()}`} 
          icon={<DollarSign className="text-emerald-600" size={20} />} 
          trend="+12.5%"
          color="bg-emerald-50"
        />
        <KPICard 
          title="Active Properties" 
          value={data?.kpis.totalHotels || 0} 
          icon={<Building2 className="text-blue-600" size={20} />} 
          trend="Stable"
          color="bg-blue-50"
        />
        <KPICard 
          title="Group Occupancy" 
          value={data?.kpis.occupancyRate || '0%'} 
          icon={<Users className="text-purple-600" size={20} />} 
          trend="+4.2%"
          color="bg-purple-50"
        />
        <KPICard 
          title="Inventory" 
          value={`${data?.kpis.totalRooms} Rooms`} 
          icon={<BedDouble className="text-orange-600" size={20} />} 
          trend="Check-ins Today: 24"
          color="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" />
              Revenue Leaderboard
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueByProperty}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={12} stroke="#9ca3af" />
                <YAxis fontSize={12} stroke="#9ca3af" tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="revenue" fill="#B79B5D" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Statistics */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-900">Platform Health</h3>
          <div className="space-y-4">
            <HealthItem label="Database Latency" value="14ms" status="good" />
            <HealthItem label="Server Uptime" value="99.98%" status="good" />
            <HealthItem label="Pending Approvals" value="3" status="warning" />
          </div>
          
          <div className="pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming check-ins</h4>
            <div className="text-3xl font-serif font-bold text-gray-900">
              {data?.kpis.upcomingCheckinsToday}
              <span className="text-sm font-normal text-gray-400 ml-2">across all sites</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs / Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Activity size={18} className="text-navy" />
            Global Activity Feed
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Property</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.recentActivity.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <span className="capitalize font-medium text-gray-700">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-gray-400" />
                      {log.hotel_name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{log.user_name || 'Automated System'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono uppercase tracking-tighter">
                      {log.table_name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <ArrowUpRight size={12} className="mr-0.5" />
          {trend}
        </span>
      </div>
      <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
      <p className="text-2xl font-serif font-bold text-gray-900">{value}</p>
    </div>
  );
}

function HealthItem({ label, value, status }: any) {
  const statusColors: any = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500'
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
        <span className="text-gray-600">{label}</span>
      </div>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
