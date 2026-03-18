import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Filter, TrendingUp, Calendar, CreditCard, Activity, Building, List } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#0F1F3D', '#C9A84C', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ReportsPage() {
  const { activeHotelId } = useHotel();
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'sales' | 'occupancy' | 'payments' | 'status' | 'top-rooms'>('sales');

  const qs = `?hotel_id=${activeHotelId || ''}&date_from=${dateFrom}&date_to=${dateTo}`;

  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['report-sales', qs],
    queryFn: async () => (await api.get(`/reports/sales${qs}`)).data.data
  });

  const { data: occupancy, isLoading: loadingOcc } = useQuery({
    queryKey: ['report-occupancy', qs],
    queryFn: async () => (await api.get(`/reports/occupancy${qs}`)).data.data
  });

  const { data: payments, isLoading: loadingPay } = useQuery({
    queryKey: ['report-payments', qs],
    queryFn: async () => (await api.get(`/reports/payments${qs}`)).data.data
  });
  
  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['report-status', qs],
    queryFn: async () => (await api.get(`/reports/status${qs}`)).data.data
  });

  const { data: topRooms, isLoading: loadingRooms } = useQuery({
    queryKey: ['report-top-rooms', qs],
    queryFn: async () => (await api.get(`/reports/top-rooms${qs}`)).data.data
  });

  const handleExport = (reportType: string) => {
    toast.loading('Preparing CSV export...', { id: 'export' });
    api.get(`/reports/${reportType}${qs}&format=csv`, { responseType: 'blob' })
      .then((response: any) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `beverly_${reportType}_report_${dateFrom}_to_${dateTo}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Exported ${reportType} report successfully.`, { id: 'export' });
      })
      .catch((err: any) => {
        console.error(err);
        toast.error('Export failed.', { id: 'export' });
      });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'sales':
        if (loadingSales) return <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Loading sales and revenue data...</div>;
        return (
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="period" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `LKR ${value}`} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} formatter={(val: any) => [`LKR ${val.toFixed(2)}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" fill="#0F1F3D" name="Daily Revenue" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'occupancy':
         if (loadingOcc) return <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Loading occupancy data...</div>;
         return (
           <div className="h-[400px] w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={occupancy || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="room_number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
                 <Tooltip cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }} formatter={(val: any) => [`${val.toFixed(1)}%`, 'Occupancy']} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Legend iconType="circle" />
                 <Line type="monotone" dataKey="occupancy_rate" stroke="#C9A84C" strokeWidth={3} name="Occupancy Rate" activeDot={{ r: 8, fill: '#C9A84C', stroke: '#fff', strokeWidth: 2 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
         );
      case 'payments':
         if (loadingPay) return <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Loading payment allocation data...</div>;
         return (
           <div className="h-[400px] w-full mt-4 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={payments || []} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" outerRadius={130} labelLine={false} label={({ name, percent }) => `${name!.replace('_', ' ').toUpperCase()} ${(percent! * 100).toFixed(0)}%`}>
                   {payments?.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                 </Pie>
                 <Tooltip formatter={(val: any) => [`LKR ${val.toFixed(2)}`, 'Amount']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" />
               </PieChart>
             </ResponsiveContainer>
           </div>
         );
      case 'status':
         if (loadingStatus) return <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Loading reservation status distribution...</div>;
         return (
           <div className="h-[400px] w-full mt-4 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={status || []} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} label={({ name, value }) => `${name!.replace('_', ' ').toUpperCase()}: ${value}`}>
                   {status?.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                 </Pie>
                 <Tooltip formatter={(val: any) => [val, 'Count']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                 <Legend iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
           </div>
         );
      case 'top-rooms':
         if (loadingRooms) return <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Loading top performing rooms...</div>;
         return (
           <div className="h-[400px] w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={topRooms || []} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                 <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis dataKey="room_number" type="category" tick={{ fill: '#0F1F3D', fontSize: 13, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Legend iconType="circle" />
                 <Bar dataKey="booking_count" fill="#10B981" name="Completed Bookings" radius={[0, 4, 4, 0]} barSize={32} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 pb-5 gap-6">
        <div>
           <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><Activity className="text-gold shadow-sm" size={32} /> Reporting & Analytics</h1>
           <p className="text-gray-500 mt-2 font-medium">Data-driven insights to optimize property operations</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
           <div className="flex items-center gap-2 px-3">
             <Filter size={18} className="text-navy" />
             <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 border-none outline-none text-sm font-bold text-gray-700 bg-transparent cursor-pointer" />
             <span className="text-gray-300 font-bold px-1">→</span>
             <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 border-none outline-none text-sm font-bold text-gray-700 bg-transparent cursor-pointer" />
           </div>
           {user?.role === 'super_admin' && !activeHotelId && (
             <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm border border-amber-200/50">
               <Building size={14} /> Showing Global Network Data
             </div>
           )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-0 custom-scrollbar mt-2">
        {[
          { id: 'sales', label: 'Sales & Revenue', icon: TrendingUp },
          { id: 'occupancy', label: 'Room Occupancy', icon: Calendar },
          { id: 'payments', label: 'Payment Sources', icon: CreditCard },
          { id: 'status', label: 'Operational Status', icon: Activity },
          { id: 'top-rooms', label: 'Top Rooms', icon: List },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all rounded-t-xl whitespace-nowrap outline-none ${activeTab === tab.id ? 'bg-navy text-white shadow-md transform -translate-y-0.5' : 'bg-transparent text-gray-500 hover:text-navy hover:bg-gray-100'}`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-gold drop-shadow-sm' : ''} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-lg font-bold text-navy flex items-center gap-2">
             {activeTab === 'sales' && 'Revenue Timeline'}
             {activeTab === 'occupancy' && 'Occupancy Distribution'}
             {activeTab === 'payments' && 'Revenue by Tender Type'}
             {activeTab === 'status' && 'Reservation State Metrics'}
             {activeTab === 'top-rooms' && 'Highest Yielding Rooms'}
           </h2>
           <button onClick={() => handleExport(activeTab)} className="text-xs font-bold bg-white text-navy hover:bg-navy hover:text-white px-5 py-2.5 rounded-xl transition-all border border-gray-200 hover:border-navy flex items-center gap-2 shadow-sm focus:ring-2 focus:ring-gold focus:outline-none">
             <Download size={16} /> Export CSV Data
           </button>
        </div>
        
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100/50 p-2">
           {renderContent()}
        </div>
      </div>
    </div>
  );
}
