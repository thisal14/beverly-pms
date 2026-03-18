import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useHotel } from '../../context/HotelContext';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import PaymentPanel from '../../components/PaymentPanel';
import type { PaymentEntry } from '../../components/PaymentPanel';
import { AlertTriangle, LogOut, ArrowLeft, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CheckOutPage() {
  const { id, hotelSlug } = useParams();
  const navigate = useNavigate();
  const { activeHotel } = useHotel();
  const hotelTz = activeHotel?.timezone || 'Asia/Colombo';

  const [actualCheckout, setActualCheckout] = useState(
    formatInTimeZone(new Date(), hotelTz, "yyyy-MM-dd'T'HH:mm")
  );
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => (await api.get(`/reservations/${id}`)).data.data,
    enabled: !!id
  });

  if (isLoading) return <div className="p-12 text-center text-gray-400">Loading...</div>;
  if (!res) return null;

  const scheduledOut = new Date(res.scheduled_checkout).getTime();
  const actualOut = new Date(actualCheckout).getTime();
  const lateGracePeriod = 1 * 60 * 60 * 1000; // 1 hour

  const isLate = actualOut > (scheduledOut + lateGracePeriod);
  
  // Note: Fees will be calculated properly server side, we just preview warning here
  const totalPaid = parseFloat(res.paid_amount);
  const totalAmount = parseFloat(res.total_amount); // We use the current stored total, backend will adjust line-items when posted.
  const newPaymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingLocally = totalAmount - totalPaid - newPaymentsTotal;

  const onSubmit = async () => {
    try {
      setLoading(true);
      const utcDate = toDate(actualCheckout, { timeZone: hotelTz });
      await api.post(`/reservations/${id}/checkout`, {
        actual_checkout: utcDate.toISOString(),
        payments: payments
      });
      toast.success('Check-out completed successfully!');
      navigate(`/${hotelSlug}/reservations/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <Link to={`/${hotelSlug}/reservations/${id}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition font-medium">
        <ArrowLeft size={16} /> Back to Reservation
      </Link>

      <div className="border-b border-gray-200 pb-5 flex items-center gap-3">
        <LogOut className="text-orange-500" size={32} />
        <div>
          <h1 className="text-3xl font-serif font-bold text-navy">Check-Out Process</h1>
          <p className="text-gray-500 mt-2 font-medium">Reservation {res.reservation_number} • Room {res.room?.room_number}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
         <div className="w-full sm:w-1/2">
           <label className="block text-sm font-bold text-navy mb-2">Actual Check-Out Date & Time ({hotelTz})</label>
           <input type="datetime-local" value={actualCheckout} onChange={e => setActualCheckout(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-gold outline-none bg-gray-50 font-medium" />
           <p className="text-xs text-gray-500 mt-2 font-medium">Scheduled Out: {formatInTimeZone(new Date(res.scheduled_checkout), hotelTz, 'PPp')} ({hotelTz})</p>
         </div>
         {isLate && (
           <div className="w-full sm:w-1/2 bg-red-50/80 border border-red-200 p-5 rounded-xl flex items-start gap-4 shadow-sm self-stretch">
             <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
             <div>
               <h3 className="font-bold text-red-800">Late Check-Out Detected</h3>
               <p className="text-red-700 text-sm mt-1">Exceeds 1-hour grace period limit. The system will apply a late check-out fee.</p>
             </div>
           </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
           <div className="p-5 border-b bg-gray-50/80 font-bold text-navy flex items-center gap-2"><Receipt size={18} className="text-gold" /> Current Invoice Breakdown</div>
           <div className="p-5 space-y-3.5 text-sm">
             <div className="flex justify-between"><span className="text-gray-500">Base Room Rate</span><span className="font-semibold text-gray-800">LKR {parseFloat(res.base_amount).toFixed(2)}</span></div>
             {parseFloat(res.early_checkin_fee) > 0 && <div className="flex justify-between"><span className="text-gray-500">Early Check-In Fee</span><span className="font-semibold text-gray-800">LKR {parseFloat(res.early_checkin_fee).toFixed(2)}</span></div>}
             {parseFloat(res.extra_person_fee) > 0 && <div className="flex justify-between"><span className="text-gray-500">Extra Persons Surcharge</span><span className="font-semibold text-gray-800">LKR {parseFloat(res.extra_person_fee).toFixed(2)}</span></div>}
             <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-lg text-navy"><span>Current Total</span><span>LKR {totalAmount.toFixed(2)}</span></div>
             <div className="flex justify-between text-emerald-600 font-semibold"><span>Already Paid</span><span>- LKR {totalPaid.toFixed(2)}</span></div>
             <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-red-600"><span>Current Balance</span><span>LKR {(totalAmount - totalPaid).toFixed(2)}</span></div>
           </div>
         </div>

         <div className="space-y-6">
           <PaymentPanel 
             totalAmount={totalAmount} 
             paidAmount={totalPaid} 
             stage="checkout" 
             requireFullPayment={true} 
             payments={payments} 
             onChange={setPayments} 
           />

           <div className="bg-gray-50/80 border border-gray-200 p-6 rounded-2xl text-center shadow-sm">
             <p className="text-sm text-gray-500 font-medium mb-4">You must collect the remaining balance before completing the check-out process.</p>
             <button onClick={onSubmit} disabled={loading || remainingLocally > 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center gap-2">
               {loading ? 'Processing...' : 'Finalize Check-Out'} <LogOut size={20} />
             </button>
             {remainingLocally > 0 && <p className="text-red-500 text-xs font-bold mt-4 uppercase tracking-wider">Balance of LKR {remainingLocally.toFixed(2)} is still due.</p>}
           </div>
         </div>
      </div>
    </div>
  );
}
