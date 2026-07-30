import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { adminLoginSchema, adminLoginDefaultValues } from '../../schemas/adminLoginSchema';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import FormField from '../../components/checkout/FormField';

// Friendlier copy for the Firebase Auth error codes we're likely to hit.
const FIREBASE_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-not-found': 'No admin account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/user-disabled': 'This admin account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: adminLoginDefaultValues,
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirectTo = location.state?.from?.pathname || '/admin';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Admin login failed', err);
      const message = FIREBASE_ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#050505] px-4 py-10">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-[100px]" />

      <div className="surface-3d relative w-full max-w-sm rounded-2xl px-6 py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="orb-3d mb-3 flex h-12 w-12 items-center justify-center !rounded-full text-orange">
            <ShieldCheck size={22} />
          </span>
          <h1 className="text-[17px] font-extrabold tracking-wide text-gradient-gold">ABS Crackers World</h1>
          <p className="mt-1 text-[12px] font-semibold text-muted">Admin Panel Login</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Admin Email"
            required
            type="email"
            autoComplete="username"
            placeholder="admin@abscrackersworld.com"
            registration={register('email')}
            error={errors.email}
          />

          <div className="relative">
            <FormField
              label="Password"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              registration={register('password')}
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-[30px] text-muted transition-colors hover:text-orange"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-3d mt-2 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold uppercase tracking-wide text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Lock size={14} />
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-[10.5px] font-medium leading-relaxed text-muted">
          Restricted access — for ABS Crackers World staff only. No self-signup;
          accounts are created by the site owner in Firebase.
        </p>
      </div>
    </div>
  );
}
