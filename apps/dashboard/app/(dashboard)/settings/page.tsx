'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Colombo',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
];

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
        role="switch" aria-checked={checked}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', timezone: 'UTC' });
  const [notifs, setNotifs] = useState({ billingEmails: true, usageReportEmails: true, handoffEmails: true, sentimentAlertEmails: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, prefRes] = await Promise.all([
          api.get('/api/v1/tenants/me'),
          api.get('/api/v1/tenants/me/notification-preferences').catch(() => ({ data: { data: null } })),
        ]);
        const p = profileRes.data.data as Record<string, unknown>;
        setProfile({ name: (p.name as string) ?? '', email: (p.email as string) ?? '', phone: (p.phone as string) ?? '', timezone: (p.timezone as string) ?? 'UTC' });
        const prefs = prefRes.data.data as Record<string, unknown> | null;
        if (prefs) {
          setNotifs({
            billingEmails: (prefs.billingEmails as boolean) ?? true,
            usageReportEmails: (prefs.usageReportEmails as boolean) ?? true,
            handoffEmails: (prefs.handoffEmails as boolean) ?? true,
            sentimentAlertEmails: (prefs.sentimentAlertEmails as boolean) ?? true,
          });
        }
      } catch { setError('Failed to load settings.'); } finally { setLoading(false); }
    };
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/api/v1/tenants/me', { name: profile.name, phone: profile.phone, timezone: profile.timezone });
      setSuccess('Profile saved successfully.');
    } catch { setError('Failed to save profile.'); } finally { setSaving(false); }
  };

  const requestExport = async () => {
    setExporting(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/api/v1/tenants/me/export');
      const data = res.data.data as object;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-x-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Your data export has been downloaded.');
    } catch { setError('Export failed. Please try again.'); } finally { setExporting(false); }
  };

  const saveNotifications = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.patch('/api/v1/tenants/me/notification-preferences', notifs).catch(() => {});
      setSuccess('Notification preferences saved.');
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Profile */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Business Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              value={profile.email}
              disabled
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={profile.timezone}
              onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Button onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-2">Email Notifications</h2>
        <p className="text-sm text-gray-500 mb-4">Choose which emails you receive from Chatbot-X.</p>
        <Toggle checked={notifs.billingEmails} onChange={v => setNotifs(p => ({ ...p, billingEmails: v }))} label="Billing & Invoices" description="Monthly invoices and payment confirmations" />
        <Toggle checked={notifs.usageReportEmails} onChange={v => setNotifs(p => ({ ...p, usageReportEmails: v }))} label="Usage Reports" description="Monthly usage summary and AI cost breakdown" />
        <Toggle checked={notifs.handoffEmails} onChange={v => setNotifs(p => ({ ...p, handoffEmails: v }))} label="Human Handoff Alerts" description="When a conversation is escalated to a human agent" />
        <Toggle checked={notifs.sentimentAlertEmails} onChange={v => setNotifs(p => ({ ...p, sentimentAlertEmails: v }))} label="Sentiment Alerts" description="When customers show signs of frustration" />
        <div className="mt-4">
          <Button onClick={saveNotifications} disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-2">Account</h2>
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium text-gray-900">Export Data</div>
            <div className="text-xs text-gray-500">Download all your conversations and data (GDPR)</div>
          </div>
          <Button variant="secondary" onClick={requestExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Download Export'}</Button>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <div className="text-sm font-medium text-red-700">Delete Account</div>
            <div className="text-xs text-gray-500">Permanently delete all data. This cannot be undone.</div>
          </div>
          <Button variant="danger">Delete Account</Button>
        </div>
      </Card>
    </div>
  );
}
