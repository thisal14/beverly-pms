import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { ArrowLeft, Clock, CreditCard, Users, LogIn, LogOut } from 'lucide-react';

export default function ReservationDetailPage() {
  const { id, hotelSlug } = useParams();
  
  const { data: res, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => (await api.get(`/reservations/${id}`)).data.data,
    enabled: !!id
  });

  if (isLoading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading details...</div>;
  if (!res) return <div className="p-12 text-center text-red-500">Reservation not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      <Link to={`/${hotelSlug}/reservations`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition font-medium">
        <ArrowLeft size={16} /> Back to Reservations
      </Link>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-serif font-bold text-navy flex items-center gap-3">
            {res.reservation_number}
            <span className={`px-3 py-1.5 text-xs rounded-md capitalize font-sans font-bold tracking-wide
              ${res.status === 'reserved' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                res.status === 'checked_in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                 res.status === 'checked_out' ? 'bg-gray-50 text-gray-700 border border-gray-200' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {res.status.replace('_', ' ')}
            </span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Booked by <span className="font-semibold text-gray-800">{res.customer_name}</span> • {res.customer_phone}</p>
        </div>
        
        <div className="flex gap-2">
           {res.status === 'reserved' && <Link to={`/${hotelSlug}/reservations/${res.id}/checkin`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-sm font-semibold text-sm transition transform hover:-translate-y-0.5">Check In Process</Link>}
           {res.status === 'checked_in' && <Link to={`/${hotelSlug}/reservations/${res.id}/checkout`} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl shadow-sm font-semibold text-sm transition transform hover:-translate-y-0.5">Check Out Process</Link>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex gap-8 flex-wrap">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><LogIn size={14} /> Scheduled In</div>
              <div className="font-medium text-lg text-navy">{new Date(res.scheduled_checkin).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><LogOut size={14} /> Scheduled Out</div>
              <div className="font-medium text-lg text-navy">{new Date(res.scheduled_checkout).toLocaleString()}</div>
            </div>
            <div className="border-l border-gray-200 pl-8">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Clock size={14} /> Actual Stay</div>
               <div className="text-sm font-medium">In: <span className="text-gray-600 font-normal">{res.actual_checkin ? new Date(res.actual_checkin).toLocaleString() : 'Pending'}</span></div>
               <div className="text-sm font-medium mt-0.5">Out: <span className="text-gray-600 font-normal">{res.actual_checkout ? new Date(res.actual_checkout).toLocaleString() : 'Pending'}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50/80 font-bold text-navy flex items-center gap-2"><Users size={18} className="text-gold" /> Registered Guests</div>
             <div className="p-0">
               {res.guests && res.guests.length > 0 ? (
                 <table className="w-full text-sm">
                   <tbody className="divide-y divide-gray-50">
                     {res.guests.map((g: any, i: number) => (
                       <tr key={i} className="hover:bg-gray-50/50"><td className="py-3 px-5 text-gray-500 font-mono w-40 text-xs">{g.nic_passport}</td><td className="py-3 px-5 font-semibold text-gray-800">{g.full_name}</td></tr>
                     ))}
                   </tbody>
                 </table>
               ) : <div className="p-6 text-sm text-gray-500 italic text-center">No guests registered yet (typically added at check-in).</div>}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-navy text-white font-bold flex items-center gap-2"><CreditCard size={18} className="text-gold" /> Billing Summary</div>
            <div className="p-5 space-y-3.5">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Base Amount</span><span className="font-semibold">LKR {parseFloat(res.base_amount || 0).toFixed(2)}</span></div>
              {parseFloat(res.early_checkin_fee) > 0 && <div className="flex justify-between text-sm text-orange-600 font-medium"><span>Early In Fee</span><span>+ LKR {parseFloat(res.early_checkin_fee).toFixed(2)}</span></div>}
              {parseFloat(res.late_checkout_fee) > 0 && <div className="flex justify-between text-sm text-orange-600 font-medium"><span>Late Out Fee</span><span>+ LKR {parseFloat(res.late_checkout_fee).toFixed(2)}</span></div>}
              {parseFloat(res.extra_person_fee) > 0 && <div className="flex justify-between text-sm text-orange-600 font-medium"><span>Extra Persons</span><span>+ LKR {parseFloat(res.extra_person_fee).toFixed(2)}</span></div>}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg text-navy"><span>Total</span><span>LKR {parseFloat(res.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-emerald-600 font-semibold"><span>Paid Amount</span><span>- LKR {parseFloat(res.paid_amount).toFixed(2)}</span></div>
              
              <div className={`mt-3 p-3.5 rounded-xl flex justify-between font-bold text-lg ${parseFloat(res.balance) > 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                <span>Balance Due</span>
                <span>LKR {parseFloat(res.balance).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-4 border-b border-gray-100 bg-gray-50/80 font-bold text-navy text-sm uppercase tracking-wider">Payment History</div>
             <div className="p-0">
               {res.payments && res.payments.length > 0 ? res.payments.map((p: any, i: number) => (
                 <div key={i} className="p-4 border-b border-gray-50 text-sm last:border-0 flex justify-between hover:bg-gray-50/50">
                   <div>
                     <div className="font-bold text-navy uppercase text-xs tracking-wider">{p.payment_method.replace('_', ' ')}</div>
                     <div className="text-xs text-gray-500 mt-1">{new Date(p.created_at).toLocaleString()} • {p.stage}</div>
                     {p.reference_number && <div className="text-xs text-gray-400 mt-0.5">Ref: {p.reference_number}</div>}
                   </div>
                   <div className="font-bold text-emerald-600 pt-0.5">LKR {parseFloat(p.amount).toFixed(2)}</div>
                 </div>
               )) : <div className="p-6 text-sm text-gray-500 text-center italic">No payments recorded.</div>}
             </div>
             {res.status !== 'checked_out' && res.status !== 'cancelled' && (
               <div className="p-4 bg-gray-50 border-t border-gray-100">
                 <button className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-navy font-semibold py-2.5 rounded-xl transition text-sm shadow-sm">Add New Payment</button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
