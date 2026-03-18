import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import { Users, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeHotelId } = useHotel();
  const { hotelSlug } = useParams();
  const navigate = useNavigate();

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['dashboard_activity', activeHotelId],
    queryFn: async () => {
      // Fetch recent reservations (limit 5 for dashboard)
      const res = await api.get(`/reservations?hotel_id=${activeHotelId}&limit=5`);
      return res.data;
    },
    enabled: !!activeHotelId
  });

  const recentActivity = activityData?.data?.filter((r: any) => r.status !== 'cancelled' && r.status !== 'no_show').slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-navy">
        Welcome back, {user?.name}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Expected Arrivals" value="12" icon={<LogIn className="text-blue-500" />} />
         <StatCard title="Checked In" value="8" icon={<CheckCircle className="text-emerald-500" />} />
         <StatCard title="Departures" value="5" icon={<LogOut className="text-orange-500" />} />
         <StatCard title="Total Guests" value="45" icon={<Users className="text-purple-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Today's Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium">Reservation #</th>
                <th className="p-4 font-medium">Guest</th>
                <th className="p-4 font-medium">Room</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium animate-pulse">Loading activity...</td></tr>}
              {!isLoading && recentActivity.map((res: any) => (
                <tr key={res.id} className="hover:bg-gray-50 group">
                  <td className="p-4 font-medium text-navy">{res.reservation_number}</td>
                  <td className="p-4">{res.customer_name}</td>
                  <td className="p-4">{res.room_number} ({res.package_name})</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize tracking-wide
                      ${res.status === 'reserved' ? 'bg-blue-100 text-blue-700' : 
                        res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 
                        res.status === 'checked_out' ? 'bg-gray-100 text-gray-700' : 
                        'bg-red-100 text-red-700'}`}>
                      {res.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => navigate(`/${hotelSlug}/reservations/${res.id}`)} className="text-navy hover:text-gold font-medium text-sm transition">View</button>
                     {res.status === 'reserved' && <button onClick={() => navigate(`/${hotelSlug}/reservations/${res.id}/checkin`)} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition bg-emerald-50 px-3 py-1.5 rounded-md">Check In</button>}
                     {res.status === 'checked_in' && <button onClick={() => navigate(`/${hotelSlug}/reservations/${res.id}/checkout`)} className="text-orange-500 hover:text-orange-600 font-medium text-sm transition bg-orange-50 px-3 py-1.5 rounded-md">Check Out</button>}
                  </td>
                </tr>
              ))}
              {!isLoading && recentActivity.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No recent activity found.</td></tr>
              )}
            </tbody>
          </table>
          <div className="p-4 text-center border-t border-gray-100 text-sm text-gray-500">
            {recentActivity.length > 0 ? "Showing recent activity for today." : "No activity to show."}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100/50">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-navy">{value}</p>
      </div>
    </div>
  );
}
