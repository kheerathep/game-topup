import { useCallback, useEffect, useState } from 'react';
import type { SiteSettings } from '../../types';
import { getSiteSettingsAdmin, updateSiteSettingsAdmin } from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

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
          {/* Processing Stats */}
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Pending Payouts</p>
                <p className="text-3xl font-headline font-black mt-1"
                  style={{ color: 'var(--nc-on-surface)' }}>
                  ฿42,890
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest"
                  style={{ color: 'var(--nc-on-surface-variant)' }}>Processing</p>
                <p className="text-2xl font-headline font-black mt-1" style={{ color: 'var(--nc-on-surface)' }}>
                  128 <span className="text-sm font-normal" style={{ color: 'var(--nc-on-surface-variant)' }}>txns</span>
                </p>
              </div>
            </div>
          </div>

          {/* Recent Payout Activity */}
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--nc-surface-low)', border: '1px solid rgba(67,70,84,0.05)' }}>
            <h4 className="text-[10px] uppercase font-bold tracking-widest mb-4"
              style={{ color: 'var(--nc-on-surface-variant)' }}>
              Recent Payout Activity
            </h4>
            <div className="space-y-4">
              {[
                { name: 'ShadowMercenary_88', amount: '฿18,450', time: '2 days ago', status: 'badge-completed' },
                { name: 'DigitalDrift_Global', amount: '฿7,200', time: '4 days ago', status: 'badge-pending' },
                { name: 'Vendor_Vortex', amount: '฿35,600', time: '1 week ago', status: 'badge-flagged' },
              ].map((payout) => (
                <div key={payout.name} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: 'var(--nc-surface-highest)', color: 'var(--nc-primary)' }}>
                    {payout.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{payout.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--nc-on-surface-variant)' }}>
                      Payout: {payout.amount} • {payout.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button className="nc-btn-ghost w-full mt-4 text-[10px]">
              <span className="material-symbols-outlined text-sm">download</span>
              Download Audit Report
            </button>
          </div>

          {/* Secure Infrastructure */}
          <div className="rounded-xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--nc-surface-low), rgba(98,138,255,0.05))',
              border: '1px solid rgba(67,70,84,0.1)',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nc-secondary-dim)' }}>
                verified_user
              </span>
              <h4 className="text-sm font-headline font-bold">Secure Infrastructure</h4>
            </div>
            <p className="text-xs" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Military-grade encryption for all financial transactions. SOC2 compliant.
            </p>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-1 flex-1 rounded-full"
                  style={{ backgroundColor: i <= 4 ? 'var(--nc-secondary-dim)' : 'var(--nc-surface-highest)' }}
                />
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--nc-on-surface-variant)' }}>
              Security score: 95/100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
