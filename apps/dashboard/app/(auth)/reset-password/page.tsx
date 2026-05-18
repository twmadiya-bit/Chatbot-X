'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!token) { setError('Invalid or missing reset token.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch {
      setError('Invalid or expired reset link. Please request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl">Chatbot-X</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">Choose a new password</h2>
          <p className="text-indigo-200 text-lg">Make it strong and memorable.</p>
        </div>
        <p className="text-indigo-300 text-sm">© 2025 Chatbot-X. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Chatbot-X</span>
          </div>

          {done ? (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h1>
              <p className="text-gray-500">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Set new password</h1>
              <p className="text-gray-500 mb-8">Enter your new password below.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              {!token && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  No reset token found. Please use the link from your email.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    leftIcon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    leftIcon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>
                <Button type="submit" loading={loading} disabled={!token} className="w-full">
                  Reset password
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/forgot-password" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Request a new reset link
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
