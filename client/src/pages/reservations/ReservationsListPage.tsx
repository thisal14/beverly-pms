import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar } from 'lucide-react';

export default function ReservationsListPage() {
  const { activeHotelId } = useHotel();
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', activeHotelId, filterStatus],
    queryFn: async () => {
      const qs = filterStatus ? `?hotel_id=${activeHotelId}&status=${filterStatus}` : `?hotel_id=${activeHotelId}`;
      return (await api.get(`/reservations${qs}`)).data;
    },
    enabled: !!activeHotelId
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-serif font-bold text-navy">Reservations</h1>
          <p className="text-gray-500 mt-1">Manage network bookings and guest stays</p>
        </div>
        <Link to={`/${hotelSlug}/reservations/new`} className="bg-gold hover:bg-gold/90 text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition transform hover:-translate-y-0.5">
          <Plus size={18} /> New Reservation
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
           <div className="flex items-center gap-2">
             <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-gold focus:ring-1 focus:ring-gold min-w-[160px] cursor-pointer">
               <option value="">All Statuses</option>
               <option value="reserved">Reserved</option>
               <option value="checked_in">Checked In</option>
               <option value="checked_out">Checked Out</option>
               <option value="cancelled">Cancelled</option>
               <option value="no_show">No Show</option>
             </select>
           </div>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input type="text" placeholder="Search guests or REF..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm w-full sm:w-64 outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Reservation #</th>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Room & Package</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-medium animate-pulse">Loading reservations...</td></tr>}
              {!isLoading && data?.data?.map((res: any) => (
                <tr key={res.id} className="hover:bg-gray-50/80 transition group">
                  <td className="px-6 py-4 font-mono font-medium text-navy">{res.reservation_number}</td>
                  <td className="px-6 py-4">
                     <div className="font-medium text-gray-900">{res.customer_name}</div>
                     <div className="text-xs text-gray-500 mt-0.5">{res.customer_phone}</div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-gray-900 font-medium">Room {res.room_number}</div>
                     <div className="text-xs text-gray-500 mt-0.5">{res.package_name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                     <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {new Date(res.scheduled_checkin).toLocaleDateString()}</div>
                     <div className="text-xs text-gray-400 mt-1 pl-4">to {new Date(res.scheduled_checkout).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize tracking-wide
                      ${res.status === 'reserved' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                        res.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        res.status === 'checked_out' ? 'bg-gray-50 text-gray-700 border border-gray-200' : 
                        'bg-red-50 text-red-700 border border-red-100'}`}>
                      {res.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); navigate(`/${hotelSlug}/reservations/${res.id}`); }} className="text-navy hover:text-gold font-medium text-sm transition relative z-10 cursor-pointer">View</button>
                     {res.status === 'reserved' && <button onClick={(e) => { e.stopPropagation(); navigate(`/${hotelSlug}/reservations/${res.id}/checkin`); }} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition bg-emerald-50 px-3 py-1.5 rounded-md relative z-10 cursor-pointer">Check In</button>}
                     {res.status === 'checked_in' && <button onClick={(e) => { e.stopPropagation(); navigate(`/${hotelSlug}/reservations/${res.id}/checkout`); }} className="text-orange-500 hover:text-orange-600 font-medium text-sm transition bg-orange-50 px-3 py-1.5 rounded-md relative z-10 cursor-pointer">Check Out</button>}
                  </td>
                </tr>
              ))}
              {!isLoading && data?.data?.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-500">No reservations found for the selected criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
