import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader } from 'lucide-react';
import { UserRole } from '@beverly-pms/shared';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useQuery } from '@tanstack/react-query';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.nativeEnum(UserRole),
  hotel_id: z.coerce.number().optional().nullable(),
  is_active: z.boolean().default(true)
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any;
  isSuperAdmin: boolean;
}

export default function UserModal({ isOpen, onClose, onSuccess, user, isSuperAdmin }: UserModalProps) {
  const isEdit = !!user;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      role: user.role,
      hotel_id: user.hotel_id,
      is_active: user.is_active,
      password: ''
    } : {
      role: UserRole.FRONT_OFFICE,
      is_active: true
    }
  });

  const { data: hotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => (await api.get('/hotels')).data.data,
    enabled: isSuperAdmin
  });

  const onSubmit = async (values: UserFormValues) => {
    try {
      // Clean up password if empty on edit
      if (isEdit && !values.password) {
        delete (values as any).password;
      }

      if (isEdit) {
        await api.put(`/admin/users/${user.id}`, values);
        toast.success('User updated successfully');
      } else {
        await api.post('/admin/users', values);
        toast.success('User created successfully');
      }
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-serif font-bold text-navy">
            {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-transparent hover:border-gray-200">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
            <input
              {...register('name')}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition font-medium text-gray-700"
              placeholder="e.g. John Doe"
            />
            {errors.name && <p className="text-red-500 text-xs font-medium ml-1 mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition font-medium text-gray-700"
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs font-medium ml-1 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
              Password {isEdit && <span className="text-[10px] text-gray-400 normal-case">(leave blank to keep current)</span>}
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition font-medium text-gray-700"
              placeholder={isEdit ? '••••••••' : 'At least 6 characters'}
            />
            {errors.password && <p className="text-red-500 text-xs font-medium ml-1 mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Access Role</label>
              <select
                {...register('role')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition font-medium text-gray-700 appearance-none"
              >
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.FRONT_OFFICE}>Front Office / Receptionist</option>
                <option value={UserRole.PURCHASING_MANAGER}>Purchasing Manager</option>
                {isSuperAdmin && <option value={UserRole.SUPER_ADMIN}>Super Admin</option>}
              </select>
            </div>

            {isSuperAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Property</label>
                <select
                  {...register('hotel_id')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none transition font-medium text-gray-700 appearance-none"
                >
                  <option value="">Global/None</option>
                  {hotels?.map((h: any) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-navy hover:bg-navy/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-navy/10 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader size={18} className="animate-spin" /> : null}
              {isEdit ? 'Update Personnel' : 'Initialize Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
