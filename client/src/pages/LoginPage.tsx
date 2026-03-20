import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', data);
      
      // We only pass the user data since the token is stored in an HTTP-Only cookie now
      login(res.data.user);
      
      toast.success('Login successful');
      
      if (res.data.user.role === 'super_admin') {
        navigate('/admin/hotels');
      } else if (res.data.user.hotel?.slug) {
        navigate(`/${res.data.user.hotel.slug}/dashboard`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-gray-900 font-sans">
      <div className="hidden lg:flex lg:w-1/2 bg-navy text-gold flex-col justify-center border-r-[8px] border-gold p-12">
        <h1 className="text-6xl font-serif font-bold mb-4">Beverly PMS</h1>
        <p className="text-xl opacity-80 max-w-md leading-relaxed">
          Premium property management system for the Beverly Hotels network.
        </p>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-4xl font-serif font-bold text-navy">Beverly PMS</h1>
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Sign In</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-gold outline-none transition ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="you@beverly.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                {...register('password')}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-gold outline-none transition ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy hover:bg-navy/90 text-white font-medium p-3 rounded-lg transition disabled:opacity-70 mt-4"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
