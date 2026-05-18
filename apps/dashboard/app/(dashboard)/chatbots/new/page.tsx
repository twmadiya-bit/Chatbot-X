'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingCart,
  Heart,
  Home,
  UtensilsCrossed,
  GraduationCap,
  Landmark,
  Plane,
  Car,
  Briefcase,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ChatPreview } from '@/components/chat-preview';
import { useCreateChatbot } from '@/hooks/use-chatbots';
import { cn } from '@/lib/utils';

// ---- Step 1: Industry ----
const industries = [
  { key: 'ecommerce', label: 'E-Commerce', icon: ShoppingCart, color: 'bg-orange-50 text-orange-600' },
  { key: 'healthcare', label: 'Healthcare', icon: Heart, color: 'bg-red-50 text-red-600' },
  { key: 'real-estate', label: 'Real Estate', icon: Home, color: 'bg-green-50 text-green-600' },
  { key: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'bg-yellow-50 text-yellow-600' },
  { key: 'education', label: 'Education', icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  { key: 'finance', label: 'Finance', icon: Landmark, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'travel', label: 'Travel', icon: Plane, color: 'bg-purple-50 text-purple-600' },
  { key: 'automotive', label: 'Automotive', icon: Car, color: 'bg-slate-100 text-slate-600' },
  { key: 'professional-services', label: 'Professional Services', icon: Briefcase, color: 'bg-indigo-50 text-indigo-600' },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell, color: 'bg-pink-50 text-pink-600' },
];

// ---- Step 2: Plan ----
const plans = [
  {
    tier: 'BUDGET' as const,
    name: 'Starter',
    price: '$29/mo',
    desc: 'Perfect for small businesses getting started.',
    includedCredits: '$5 AI credits',
    features: ['1 chatbot', 'Widget channel', 'Basic analytics', '5K messages/mo', 'Email support'],
    color: 'border-slate-200',
    badge: null,
  },
  {
    tier: 'STANDARD' as const,
    name: 'Growth',
    price: '$79/mo',
    desc: 'For growing businesses with higher volume.',
    includedCredits: '$20 AI credits',
    features: ['5 chatbots', 'Widget + WhatsApp', 'Advanced analytics', '25K messages/mo', 'Sentiment analysis', 'Priority support'],
    color: 'border-indigo-500',
    badge: 'Most Popular',
  },
  {
    tier: 'PREMIUM' as const,
    name: 'Enterprise',
    price: '$199/mo',
    desc: 'For large scale deployments with full features.',
    includedCredits: '$60 AI credits',
    features: ['Unlimited chatbots', 'All channels', 'Revenue attribution', 'Outbound campaigns', 'HIPAA mode', 'Dedicated support'],
    color: 'border-slate-200',
    badge: null,
  },
];

// ---- Step 3: Configuration schema ----
const configSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  systemPrompt: z.string().min(20, 'System prompt must be at least 20 characters'),
  channels: z.array(z.enum(['WIDGET', 'WHATSAPP'])).min(1, 'Select at least one channel'),
});
type ConfigFormData = z.infer<typeof configSchema>;

// ---- Step 4: Branding defaults ----
const defaultBranding = {
  primaryColor: '#6366f1',
  botBubbleColor: '#f1f5f9',
  userBubbleColor: '#6366f1',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderRadius: 12,
  headerTitle: 'Chat with us',
  welcomeMessage: 'Hi! How can I help you today?',
  placeholderText: 'Type a message...',
  position: 'bottom-right' as 'bottom-right' | 'bottom-left',
};

const STEPS = ['Industry', 'Plan', 'Configure', 'Branding'];

export default function NewChatbotPage() {
  const router = useRouter();
  const createChatbot = useCreateChatbot();

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [planTier, setPlanTier] = useState<'BUDGET' | 'STANDARD' | 'PREMIUM'>('STANDARD');
  const [branding, setBranding] = useState(defaultBranding);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: { channels: ['WIDGET'] },
  });

  const watchedChannels = watch('channels');

  const toggleChannel = (ch: 'WIDGET' | 'WHATSAPP') => {
    const current = watchedChannels ?? [];
    if (current.includes(ch)) {
      setValue('channels', current.filter((c) => c !== ch));
    } else {
      setValue('channels', [...current, ch]);
    }
  };

  const handleFinalSubmit = async (configData: ConfigFormData) => {
    setSubmitError('');
    try {
      const bot = await createChatbot.mutateAsync({
        name: configData.name,
        systemPrompt: configData.systemPrompt,
        channel: configData.channels,
      });
      router.push(`/chatbots/${bot.id}`);
    } catch {
      setSubmitError('Failed to create chatbot. Please try again.');
    }
  };

  const defaultSystemPrompts: Record<string, string> = {
    ecommerce: 'You are a helpful e-commerce assistant. Help customers find products, track orders, process returns, and answer questions about our store policies. Be friendly and solution-oriented.',
    healthcare: 'You are a helpful healthcare information assistant. Provide general health information, help schedule appointments, and answer questions about our services. Always recommend consulting a doctor for medical advice.',
    'real-estate': 'You are a knowledgeable real estate assistant. Help users find properties, schedule viewings, answer questions about the buying/renting process, and provide neighborhood information.',
    restaurant: 'You are a friendly restaurant assistant. Help customers with menu questions, reservations, dietary restrictions, operating hours, and special events.',
    education: 'You are a supportive educational assistant. Help students with course information, enrollment, schedules, and academic resources. Guide them to the right department when needed.',
    finance: 'You are a professional financial services assistant. Provide information about our products, help with account inquiries, and guide customers through our services. Never give specific investment advice.',
    travel: 'You are an enthusiastic travel assistant. Help customers plan trips, find deals, manage bookings, and answer questions about destinations, visas, and travel requirements.',
    automotive: 'You are a knowledgeable automotive assistant. Help customers with vehicle information, service scheduling, parts inquiries, and financing options.',
    'professional-services': 'You are a professional business assistant. Help clients understand our services, schedule consultations, answer FAQs, and connect them with the right team members.',
    fitness: 'You are an energetic fitness assistant. Help members with class schedules, membership options, trainer bookings, and general fitness questions.',
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/chatbots')} className="mb-4">
          <ChevronLeft className="h-4 w-4" />
          Back to Chatbots
        </Button>
        <h1 className="text-xl font-bold text-slate-900">Create New Chatbot</h1>
        <p className="text-sm text-slate-500 mt-0.5">Follow the steps below to launch your AI chatbot.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  i < step
                    ? 'bg-indigo-600 text-white'
                    : i === step
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-slate-100 text-slate-400'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  i <= step ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 sm:w-20 mx-1 mb-4',
                  i < step ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Industry */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Select your industry</h2>
            <p className="text-sm text-slate-500 mt-1">
              We&apos;ll pre-configure your chatbot with industry-specific settings.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {industries.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setIndustry(key)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all',
                  industry === key
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                )}
              >
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!industry}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Plan */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Choose your plan</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select the plan that best fits your needs. You can upgrade anytime.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.tier}
                onClick={() => setPlanTier(plan.tier)}
                className={cn(
                  'relative flex flex-col text-left p-5 rounded-xl border-2 transition-all',
                  planTier === plan.tier
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : `${plan.color} bg-white hover:border-indigo-200`
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold text-slate-900">{plan.price}</span>
                </div>
                <span className="font-semibold text-slate-900">{plan.name}</span>
                <p className="text-xs text-slate-500 mt-1 mb-3">{plan.desc}</p>
                <div className="text-xs text-indigo-600 font-medium mb-3">{plan.includedCredits} included</div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Configure */}
      {step === 2 && (
        <form
          onSubmit={handleSubmit(() => setStep(3))}
          className="space-y-6"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configure your chatbot</h2>
            <p className="text-sm text-slate-500 mt-1">
              Give your bot a name, define its behavior, and select channels.
            </p>
          </div>

          <Input
            label="Chatbot name"
            placeholder="e.g. Support Bot, Sales Assistant"
            error={errors.name?.message}
            required
            {...register('name')}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                System prompt <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-indigo-600 text-xs"
                onClick={() => {
                  const prompt = defaultSystemPrompts[industry] ?? '';
                  setValue('systemPrompt', prompt);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Suggest
              </Button>
            </div>
            <Textarea
              placeholder="Describe how your AI should behave, what it knows, and how it should respond..."
              rows={6}
              error={errors.systemPrompt?.message}
              {...register('systemPrompt')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Channels <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['WIDGET', 'WHATSAPP'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                    (watchedChannels ?? []).includes(ch)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-indigo-200'
                  )}
                >
                  {(watchedChannels ?? []).includes(ch) && <Check className="h-4 w-4" />}
                  {ch === 'WIDGET' ? '🌐 Website Widget' : '💬 WhatsApp'}
                </button>
              ))}
            </div>
            {errors.channels && (
              <p className="text-xs text-red-600">{errors.channels.message}</p>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button type="submit">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Step 4: Branding */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Customize branding</h2>
            <p className="text-sm text-slate-500 mt-1">
              Match your chatbot to your brand identity.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Primary color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value, userBubbleColor: e.target.value })}
                      className="h-9 w-12 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Background color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.backgroundColor}
                      onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })}
                      className="h-9 w-12 rounded cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={branding.backgroundColor}
                      onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              <Input
                label="Header title"
                value={branding.headerTitle}
                onChange={(e) => setBranding({ ...branding, headerTitle: e.target.value })}
              />
              <Input
                label="Welcome message"
                value={branding.welcomeMessage}
                onChange={(e) => setBranding({ ...branding, welcomeMessage: e.target.value })}
              />
              <Input
                label="Placeholder text"
                value={branding.placeholderText}
                onChange={(e) => setBranding({ ...branding, placeholderText: e.target.value })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Border radius: {branding.borderRadius}px</label>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={branding.borderRadius}
                  onChange={(e) => setBranding({ ...branding, borderRadius: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Position</label>
                <div className="flex gap-3">
                  {(['bottom-right', 'bottom-left'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setBranding({ ...branding, position: pos })}
                      className={cn(
                        'flex-1 py-2 px-3 text-sm rounded-lg border-2 font-medium transition-all',
                        branding.position === pos
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-indigo-200'
                      )}
                    >
                      {pos === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-700">Live Preview</p>
              <ChatPreview
                branding={branding}
                className="w-full h-[440px] rounded-xl overflow-hidden border border-slate-200"
              />
            </div>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit(handleFinalSubmit)}
              loading={createChatbot.isPending}
            >
              <Check className="h-4 w-4" />
              Launch Chatbot
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
