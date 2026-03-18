import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useHotel } from '../../context/HotelContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Users, Shield } from 'lucide-react';

export default function UsersPage() {
  const { activeHotelId } = useHotel();
  const { user } = useAuth();
  
  // Super admin fetches all users (or filter heavily). Admin fetches hotel users.
  const qs = user?.role === 'super_admin' ? '' : `?hotel_id=${activeHotelId}`;

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', qs],
    queryFn: async () => (await api.get(`/admin/users${qs}`)).data.data
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
           <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3"><Users className="text-gold" size={32} /> Staff Management</h1>
           <p className="text-gray-500 mt-2 font-medium">Manage system users, roles, and access per property</p>
        </div>
        <button className="bg-navy hover:bg-navy/90 text-white font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition transform hover:-translate-y-0.5">
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
               <tr>
                 <th className="px-6 py-4">Name</th>
                 <th className="px-6 py-4">Email</th>
                 <th className="px-6 py-4">Role</th>
                 <th className="px-6 py-4">Property</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {isLoading && <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-medium animate-pulse">Loading directory...</td></tr>}
               {!isLoading && users?.map((u: any) => (
                 <tr key={u.id} className="hover:bg-gray-50/50 transition">
                   <td className="px-6 py-4 font-bold text-gray-800 flex items-center gap-3">
                     <span className="w-9 h-9 rounded-full bg-navy/5 text-navy flex items-center justify-center font-bold text-sm shadow-sm border border-navy/10">{u.name[0]}</span>
                     {u.name}
                   </td>
                   <td className="px-6 py-4 text-gray-600 font-medium">{u.email}</td>
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-navy/80 tracking-wide capitalize text-xs">
                        {u.role === 'super_admin' ? <Shield size={14} className="text-gold" /> : null}
                        {u.role.replace('_', ' ')}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-gray-500 text-sm font-medium">
                      {u.hotel_id ? `Hotel #${u.hotel_id}` : 'Global Network'}
                   </td>
                   <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-navy hover:bg-gray-100 p-2 rounded-lg transition border border-transparent hover:border-gray-200"><Edit2 size={16} /></button>
                   </td>
                 </tr>
               ))}
               {!isLoading && users?.length === 0 && (
                 <tr><td colSpan={6} className="p-12 text-center text-gray-500">No users found.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
