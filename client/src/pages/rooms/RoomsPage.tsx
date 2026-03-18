import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import { Plus, Edit2, Bed } from 'lucide-react';

export default function RoomsPage() {
  const { activeHotelId } = useHotel();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', activeHotelId],
    queryFn: async () => {
      // We join category inside the UI usually, backend might return it if joined. Let's assume the endpoint handles it or we map categories.
      // For simplicity in mock, assuming it returns `category_name`
      return (await api.get(`/admin/rooms?hotel_id=${activeHotelId}`)).data.data;
    },
    enabled: !!activeHotelId
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
           <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><Bed className="text-gold" size={32} /> Room Management</h1>
           <p className="text-gray-500 mt-2 font-medium">Manage hotel inventory and operating status</p>
        </div>
        <button className="bg-navy hover:bg-navy/90 text-white font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition transform hover:-translate-y-0.5">
          <Plus size={18} /> Add New Room
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
               <tr>
                 <th className="px-6 py-4">Room #</th>
                 <th className="px-6 py-4">Floor</th>
                 <th className="px-6 py-4">Capacity</th>
                 <th className="px-6 py-4">Features</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {isLoading && <tr><td colSpan={7} className="p-12 text-center text-gray-400 font-medium animate-pulse">Loading room inventory...</td></tr>}
               {!isLoading && rooms?.map((r: any) => (
                 <tr key={r.id} className="hover:bg-gray-50/50 transition">
                   <td className="px-6 py-4 font-bold text-navy font-mono text-base">{r.room_number}</td>
                   <td className="px-6 py-4 font-medium text-gray-700">{r.floor}</td>
                   <td className="px-6 py-4 font-medium text-gray-700">{r.capacity} Persons</td>
                   <td className="px-6 py-4 text-gray-500 max-w-[250px] truncate">{(() => {
                        try { return JSON.parse(r.features || '[]').join(', ') || 'Standard'; } 
                        catch { return r.features || 'Standard'; }
                   })()}</td>
                   <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${r.status !== 'maintenance' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {r.status === 'maintenance' ? 'Maintenance' : 'Available'}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-navy hover:bg-gray-100 p-2 rounded-lg transition border border-transparent hover:border-gray-200"><Edit2 size={16} /></button>
                   </td>
                 </tr>
               ))}
               {!isLoading && rooms?.length === 0 && (
                 <tr><td colSpan={7} className="p-12 text-center text-gray-500">No rooms found. Add some inventory to start.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
