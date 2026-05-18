'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, Lock, Bot } from 'lucide-react';
import { authApi, setToken } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    try {
      const res = await authApi.login(data.email, data.password);
      const { accessToken, tenant } = res.data.data;
      setToken(accessToken);
      localStorage.setItem('tenant_id', tenant.id);
      localStorage.setItem('user_data', JSON.stringify(tenant));
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setServerError(
        axiosErr.response?.data?.error ??
          axiosErr.response?.data?.message ??
          'Invalid email or password. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl">Chatbot-X</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Intelligent AI chatbots for your business
          </h1>
          <p className="text-indigo-200 text-lg">
            Deploy, manage and optimize AI-powered conversations across all your channels.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Chatbots', value: '12,400+' },
              { label: 'Conversations / mo', value: '2.8M+' },
              { label: 'Avg. Resolution Rate', value: '87%' },
              { label: 'Industries', value: '10+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-indigo-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-300 text-sm">
          © {new Date().getFullYear()} Chatbot-X. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Chatbot-X</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="mt-1.5 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
