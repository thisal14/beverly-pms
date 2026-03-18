import { Plus, Trash2 } from 'lucide-react';
import type { PaymentMethod } from '../types';

export interface PaymentEntry {
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

interface Props {
  totalAmount: number;
  paidAmount: number;
  stage: 'reservation' | 'checkin' | 'checkout';
  requireFullPayment: boolean;
  payments: PaymentEntry[];
  onChange: (payments: PaymentEntry[]) => void;
}

export default function PaymentPanel({ totalAmount, paidAmount, stage, requireFullPayment, payments, onChange }: Props) {
  const remaining = totalAmount - paidAmount - payments.reduce((sum, p) => sum + p.amount, 0);

  const addRow = () => {
    onChange([...payments, { amount: remaining > 0 ? remaining : 0, method: 'cash' as PaymentMethod }]);
  };

  const updateRow = (index: number, field: keyof PaymentEntry, value: any) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    onChange(newPayments);
  };

  const removeRow = (index: number) => {
    const newPayments = payments.filter((_, i) => i !== index);
    onChange(newPayments);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
         <h3 className="font-bold text-gray-800">Payment details ({stage})</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center text-sm mb-4">
           <div className="text-gray-500">Total: <span className="font-bold text-navy ml-1">LKR {totalAmount.toFixed(2)}</span></div>
           <div className="text-gray-500">Paid: <span className="font-medium text-emerald-600 ml-1">LKR {paidAmount.toFixed(2)}</span></div>
           <div className={`font-medium ${remaining < 0 ? 'text-red-500' : 'text-orange-500'}`}>
             Remaining: LKR {remaining.toFixed(2)}
           </div>
        </div>

        {payments.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <input 
              type="number" 
              min="0"
              step="0.01"
              value={p.amount || ''}
              onChange={(e) => updateRow(i, 'amount', parseFloat(e.target.value) || 0)}
              className="flex-1 p-2 border rounded-lg outline-none focus:border-gold"
              placeholder="Amount"
            />
            <select 
              value={p.method}
              onChange={(e) => updateRow(i, 'method', e.target.value)}
              className="p-2 border rounded-lg outline-none focus:border-gold"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
            <input 
              type="text" 
              value={p.reference || ''}
              onChange={(e) => updateRow(i, 'reference', e.target.value)}
              className="flex-1 p-2 border rounded-lg outline-none focus:border-gold"
              placeholder="Ref (optional)"
            />
            <button type="button" onClick={() => removeRow(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        <button 
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 font-medium px-2 py-1"
        >
          <Plus size={16} /> Add Payment Method
        </button>
        
        {requireFullPayment && remaining > 0 && (
          <p className="text-red-500 text-sm mt-2">Full payment is required before checkout.</p>
        )}
      </div>
    </div>
  );
}
