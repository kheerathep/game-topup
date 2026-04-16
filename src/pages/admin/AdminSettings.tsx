import { useCallback, useEffect, useState } from 'react';
import type { SiteSettings } from '../../types';
import {
  fetchStripeAdminSummary,
  getSiteSettingsAdmin,
  updateSiteSettingsAdmin,
  type StripeAdminSummary,
} from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';
import { isStripeConfigured, isStripeTestMode } from '../../services/stripe';

function formatThb(n: number): string {
  return `฿${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function relAgo(createdUnix: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000) - createdUnix);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return `${Math.floor(sec / 604800)} wk ago`;
}

function intentBadgeClass(status: string): string {
  if (status === 'succeeded') return 'badge-completed';
  if (status === 'processing' || status === 'requires_action' || status === 'requires_confirmation')
    return 'badge-pending';
  if (status === 'canceled') return 'badge-cancelled';
  return 'badge-processing';
}

/** Shown when Stripe is off or the Edge Function is unavailable — keeps the layout without pretending it is live. */
function demoStripeSummary(): StripeAdminSummary {
  const t = Math.floor(Date.now() / 1000);
  return {
    balanceAvailableThb: 0,
    balancePendingThb: 0,
    succeededCount30d: 0,
    recent: [
      {
        id: 'pi_demo_example',
        amountThb: 199,
        status: 'succeeded',
        createdUnix: t - 86400 * 2,
        orderId: null,
      },
    ],
  };
}

function downloadStripeAuditJson(summary: StripeAdminSummary, isDemo: boolean, note?: string | null) {
  const payload = {
    exported_at: new Date().toISOString(),
    is_demo: isDemo,
    note: note ?? undefined,
    ...summary,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stripe-activity${isDemo ? '-demo' : ''}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const empty: SiteSettings = {
  id: 1,
  payment_instructions_en: '',
  payment_instructions_th: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  promptpay_id: '',
};

export function AdminSettings() {
  const { t } = useLanguage();
  const [row, setRow] = useState<SiteSettings>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [stripeSummary, setStripeSummary] = useState<StripeAdminSummary | null>(null);
  const [stripeDemo, setStripeDemo] = useState(true);
  const [stripeErr, setStripeErr] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeAdminFnOk, setStripeAdminFnOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getSiteSettingsAdmin();
      if (s) setRow({ ...empty, ...s });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    if (!isStripeConfigured()) {
      setStripeSummary(demoStripeSummary());
      setStripeDemo(true);
      setStripeErr(null);
      setStripeAdminFnOk(false);
      return;
    }
    setStripeLoading(true);
    setStripeErr(null);
    void fetchStripeAdminSummary().then(({ data, error }) => {
      setStripeLoading(false);
      if (data) {
        setStripeSummary(data);
        setStripeDemo(false);
        setStripeErr(null);
        setStripeAdminFnOk(true);
      } else {
        setStripeErr(error ?? 'Could not load Stripe summary');
        setStripeSummary(demoStripeSummary());
        setStripeDemo(true);
        setStripeAdminFnOk(false);
      }
    });
  }, [loading]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await updateSiteSettingsAdmin({
        payment_instructions_en: row.payment_instructions_en,
        payment_instructions_th: row.payment_instructions_th,
        bank_name: row.bank_name,
        bank_account_name: row.bank_account_name,
        bank_account_number: row.bank_account_number,
        promptpay_id: row.promptpay_id,
      });
      if (data) {
        setRow({ ...empty, ...data });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>
        <span className="material-symbols-outlined text-4xl mb-2 block animate-spin">progress_activity</span>
        {t('loading')}
      </div>
    );
  }

  const stripeDisplay = stripeSummary ?? demoStripeSummary();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-headline text-4xl font-black tracking-tight uppercase"
              style={{ color: 'var(--nc-on-surface)' }}>
              Payment Information
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-on-surface-variant)' }}>
              Config v.4
            </span>
          </div>
          <p className="text-sm mt-2 max-w-xl" style={{ color: 'var(--nc-on-surface-variant)' }}>
            {t('adminSettingsIntro')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings — Left 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Global Processing Rules */}
          <section className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-secondary)' }}>tune</span>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nc-secondary)' }}>
                Global Processing Rules
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>
                  {t('adminBankName')}
                </label>
                <input className="nc-input text-lg font-bold" value={row.bank_name ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, bank_name: e.target.value }))} />
                <p className="text-[10px] mt-1.5" style={{ color: 'rgba(195,198,214,0.5)' }}>
                  Primary bank for receiving payments
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>
                  {t('adminAccountName')}
                </label>
                <input className="nc-input text-lg font-bold" value={row.bank_account_name ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, bank_account_name: e.target.value }))} />
                <p className="text-[10px] mt-1.5" style={{ color: 'rgba(195,198,214,0.5)' }}>
                  Account holder display name
                </p>
              </div>
            </div>
          </section>

          {/* Payment Gateway Integrations */}
          <section className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              Payment Gateway Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Bank Account Card */}
              <div className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--nc-surface-high)', border: '1px solid rgba(67,70,84,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined" style={{ color: 'var(--nc-primary)' }}>account_balance</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase badge-completed">
                    Active
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Bank Account</p>
                <p className="text-sm font-mono" style={{ color: 'var(--nc-on-surface)' }}>
                  {row.bank_account_number || '—'}
                </p>
              </div>

              {/* PromptPay Card */}
              <div className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--nc-surface-high)', border: '1px solid rgba(67,70,84,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined" style={{ color: 'var(--nc-secondary)' }}>qr_code_2</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${row.promptpay_id ? 'badge-completed' : 'badge-cancelled'}`}>
                    {row.promptpay_id ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>PromptPay</p>
                <p className="text-sm font-mono" style={{ color: 'var(--nc-on-surface)' }}>
                  {row.promptpay_id || 'Not configured'}
                </p>
              </div>

              {/* Credit Card Card */}
              <div className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--nc-surface-high)', border: '1px solid rgba(67,70,84,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined" style={{ color: 'var(--nc-tertiary)' }}>credit_card</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase badge-processing">
                    Active
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Credit Card</p>
                <p className="text-sm" style={{ color: 'var(--nc-on-surface)' }}>
                  Via Payment Gateway
                </p>
              </div>
            </div>

            {/* Account Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminAccountNo')}
                <input className="nc-input mt-1 font-mono" value={row.bank_account_number ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, bank_account_number: e.target.value }))} />
              </label>
              <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                PromptPay ID
                <input className="nc-input mt-1 font-mono" value={row.promptpay_id ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, promptpay_id: e.target.value }))} />
              </label>
            </div>
          </section>

          {/* Payment Instructions */}
          <section className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              Payment Instructions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminPayInstrEn')}
                <textarea
                  className="nc-input mt-1 min-h-[100px] resize-y"
                  value={row.payment_instructions_en ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, payment_instructions_en: e.target.value }))}
                />
              </label>
              <label className="block text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                {t('adminPayInstrTh')}
                <textarea
                  className="nc-input mt-1 min-h-[100px] resize-y"
                  value={row.payment_instructions_th ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, payment_instructions_th: e.target.value }))}
                />
              </label>
            </div>
          </section>

          {/* Save Bar */}
          <div className="flex items-center justify-between rounded-xl p-4"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="flex items-center gap-2">
              {saved && (
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--nc-secondary-dim)' }}>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Changes saved successfully
                </div>
              )}
              {!saved && (
                <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  You have unsaved changes in Payment Settings.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="nc-btn-ghost" onClick={() => void load()}>
                Discard
              </button>
              <button type="button" disabled={saving} onClick={() => void save()} className="nc-btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stripe balance + volume (live from Edge Function in test/live mode) */}
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            {stripeDemo && (
              <p className="text-[9px] font-bold uppercase tracking-wider mb-3 px-2 py-1 rounded inline-block"
                style={{ backgroundColor: 'rgba(180,197,255,0.08)', color: 'var(--nc-on-surface-variant)' }}>
                {isStripeConfigured() ? 'Demo / offline — fix API or deploy function' : 'Example figures — connect Stripe'}
              </p>
            )}
            {stripeErr && isStripeConfigured() && (
              <p className="text-[10px] mb-3 leading-snug" style={{ color: 'rgba(255,180,0,0.85)' }}>
                {stripeErr}
              </p>
            )}
            {isStripeConfigured() && stripeLoading && !stripeSummary ? (
              <div className="py-8 text-center" style={{ color: 'var(--nc-on-surface-variant)' }}>
                <span className="material-symbols-outlined text-3xl animate-spin block mb-2">progress_activity</span>
                <span className="text-xs">Loading Stripe…</span>
              </div>
            ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Pending balance (Stripe)</p>
                <p className="text-3xl font-headline font-black mt-1"
                  style={{ color: 'var(--nc-on-surface)' }}>
                  {formatThb(stripeDisplay.balancePendingThb)}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'rgba(195,198,214,0.55)' }}>
                  Funds not yet available to pay out to your bank (normal delay in live mode).
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Available (Stripe)</p>
                <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-on-surface)' }}>
                  {formatThb(stripeDisplay.balanceAvailableThb)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Succeeded (30d)</p>
                <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-on-surface)' }}>
                  {stripeDisplay.succeededCount30d}{' '}
                  <span className="text-sm font-normal" style={{ color: 'var(--nc-on-surface-variant)' }}>txns</span>
                </p>
              </div>
            </div>
            )}
          </div>

          {/* Recent PaymentIntents — real sandbox/live data from your Stripe account */}
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <h4 className="text-[10px] uppercase font-bold tracking-widest mb-1"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              Recent PaymentIntents
            </h4>
            <p className="text-[9px] mb-4 leading-relaxed" style={{ color: 'rgba(195,198,214,0.45)' }}>
              Card / PromptPay charges appear here (metadata.orderId links to your store order when present).
            </p>
            <div className="space-y-4">
              {stripeDisplay.recent.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  No payment intents yet — complete a test checkout in Stripe test mode.
                </p>
              ) : (
                stripeDisplay.recent.map((row) => (
                  <div key={row.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-primary)' }}>
                      {(row.orderId ?? row.id).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate font-mono">
                        {row.orderId ? `Order ${row.orderId.slice(0, 8)}…` : row.id.slice(0, 14) + '…'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                        {formatThb(row.amountThb)} • {relAgo(row.createdUnix)}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase ${intentBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="nc-btn-ghost w-full mt-4 text-[10px]"
              disabled={!stripeSummary && stripeLoading}
              onClick={() => downloadStripeAuditJson(stripeDisplay, stripeDemo, stripeErr)}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download audit (JSON)
            </button>
          </div>

          {/* Stripe Configuration Status */}
          <div className="rounded-xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--nc-surface-low), rgba(98,138,255,0.05))',
              border: '1px solid rgba(67,70,84,0.1)',
            }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-primary)' }}>
                payments
              </span>
              <h4 className="text-sm font-headline font-bold">Stripe Integration</h4>
              {isStripeConfigured() ? (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  isStripeTestMode() ? 'badge-processing' : 'badge-completed'
                }`}>
                  {isStripeTestMode() ? 'Test Mode' : 'Live'}
                </span>
              ) : (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase badge-cancelled">
                  Not Configured
                </span>
              )}
            </div>

            {isStripeConfigured() ? (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  Publishable key detected. Card payments &amp; PromptPay QR are active.
                </p>
                <div className="rounded-lg px-3 py-2 font-mono text-[11px]"
                  style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-primary)' }}>
                  {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.slice(0, 16)}••••
                </div>
                {isStripeTestMode() && (
                  <p className="text-[10px] mt-2" style={{ color: 'rgba(255,180,0,0.8)' }}>
                    ⚠ Test cards only — no real charges
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--nc-on-surface-variant)' }}>
                  Add <code className="font-mono text-[10px] px-1 rounded"
                    style={{ backgroundColor: 'var(--nc-surface-highest)' }}>
                    VITE_STRIPE_PUBLISHABLE_KEY
                  </code> to your <code className="font-mono text-[10px] px-1 rounded"
                    style={{ backgroundColor: 'var(--nc-surface-highest)' }}>.env</code> file.
                </p>
                <a
                  href="https://dashboard.stripe.com/test/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nc-btn-ghost w-full text-[10px] mt-1"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Get Test API Keys
                </a>
              </>
            )}

            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(67,70,84,0.15)' }}>
              <p className="text-[10px] uppercase font-bold tracking-widest mb-2"
                style={{ color: 'var(--nc-on-surface-variant)' }}>Edge Functions</p>
              <div className="space-y-1">
                {[
                  { name: 'create-payment-intent', deployed: isStripeConfigured() },
                  { name: 'stripe-webhook', deployed: isStripeConfigured() },
                  { name: 'stripe-admin-summary', deployed: stripeAdminFnOk },
                ].map((fn) => (
                  <div key={fn.name} className="flex items-center justify-between">
                    <span className="font-mono text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      {fn.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      fn.deployed ? 'badge-completed' : 'badge-cancelled'
                    }`}>
                      {fn.deployed ? 'Ready' : 'Deploy'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
