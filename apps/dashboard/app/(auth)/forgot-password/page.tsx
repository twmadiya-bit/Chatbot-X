'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await authApi.requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">Forgot your password?</h2>
          <p className="text-indigo-200 text-lg">No worries — we'll send you a reset link.</p>
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

          {submitted ? (
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-gray-500 mb-6">
                If <strong>{email}</strong> is registered, we've sent a password reset link. Check your inbox (and spam folder).
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset password</h1>
              <p className="text-gray-500 mb-8">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    leftIcon={<Mail className="h-4 w-4" />}
                    required
                  />
                </div>
                <Button type="submit" loading={loading} className="w-full">
                  Send reset link
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Remembered it?{' '}
                <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
