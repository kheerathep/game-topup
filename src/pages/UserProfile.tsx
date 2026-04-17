import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { getUserOrderHistory } from '../services/orders';
import type { OrderHistoryItem } from '../services/orders';
import { LiveChatWidget } from '../components/ui/LiveChatWidget';
import {
  UserCircle,
  Package,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  AlertCircle,
  Mail,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { th, enUS } from 'date-fns/locale';

export function UserProfile() {
  const { state: auth } = useAuth();
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (auth.user) {
      loadOrders();
    }
  }, [auth.user]);

  const loadOrders = async () => {
    if (!auth.user) return;
    setIsLoading(true);
    const { data } = await getUserOrderHistory(auth.user.id);
    setOrders(data);
    setIsLoading(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border border-emerald-500/30',
          label: t('statusPaid') || 'สำเร็จ'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border border-rose-500/30',
          label: t('statusCancelled') || 'ยกเลิก'
        };
      default:
        return {
          icon: Clock,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border border-amber-500/30',
          label: t('statusPending') || 'รอชำระเงิน'
        };
    }
  };

  const getProviderConfig = (provider: string, email?: string) => {
    const isGmail = email?.toLowerCase().endsWith('@gmail.com');
    const p = provider?.toLowerCase();
    
    if (p === 'facebook') {
      return {
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
        label: 'Facebook',
        className: 'bg-[#5F82FB] shadow-[#5F82FB]/20 hover:bg-[#4E71EA]'
      };
    }

    if (p === 'google' || (p === 'email' && isGmail)) {
      return {
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" /></svg>,
        label: 'Google',
        className: 'bg-[#EA4335] shadow-[#EA4335]/20 hover:bg-[#D62D20]'
      };
    }

    return {
      icon: <Mail className="w-4 h-4" />,
      label: 'Email',
      className: 'bg-transparent border border-white/20 text-white shadow-none hover:bg-white/5'
    };
  };

  if (!auth.user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24 text-white selection:bg-[#b4c5ff]/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#628aff]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#b4c5ff]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 pt-8 sm:px-8">
        {/* Profile Section */}
        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-white/5 bg-[#16161D]/40 p-6 sm:p-10 backdrop-blur-3xl shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#b4c5ff] to-[#628aff] flex items-center justify-center shadow-lg shadow-[#628aff]/20">
                  <UserCircle className="w-12 h-12 sm:w-14 sm:h-14 text-[#00174c]" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#6BCB45] border-4 border-[#16161D] pulse-soft" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
                  {t('profileNameLabel') || 'สวัสดี,'} 
                  <span className="text-gradient uppercase italic">{auth.user.display_name || auth.user.email?.split('@')[0]}</span>
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#6BCB45] bg-[#6BCB45]/10 px-3 py-1 rounded-full uppercase tracking-widest border border-[#6BCB45]/20">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('statusActive') || 'Active Account'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{auth.user.email}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const provider = getProviderConfig(auth.user?.app_metadata?.provider || 'email', auth.user?.email);
                return (
                  <div className={cn("inline-flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 border border-white/5", provider.className)}>
                    {provider.icon}
                    <span className="tracking-wide uppercase font-black">{provider.label}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* Order History Navigation */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
               <ShoppingBag className="w-6 h-6 text-[#b4c5ff]" />
             </div>
             <div>
               <h2 className="text-2xl font-black tracking-tight">{t('orderHistory') || 'Order History'}</h2>
               <p className="text-sm text-gray-500 font-medium">{t('orderHistoryDesc') || 'Manage and track your digital purchases'}</p>
             </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex h-96 items-center justify-center rounded-[2rem] glass-card">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#b4c5ff]/20 border-t-[#b4c5ff] rounded-full animate-spin" />
              <p className="text-[#b4c5ff] font-bold tracking-widest uppercase text-xs">{t('loading') || 'Syncing data...'}</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-96 items-center justify-center rounded-[2rem] glass-card text-center px-6">
            <div className="max-w-sm">
              <Package className="mx-auto w-16 h-16 text-white/10 mb-6" strokeWidth={1} />
              <h3 className="text-xl font-bold mb-2">{t('noOrdersYet') || 'No orders found'}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {t('noOrdersPrompt') || "Your quest inventory is empty. Start shopping for top-ups and game IDs!"}
              </p>
              <button onClick={() => navigate('/')} className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest">
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Desktop View Table */}
            <div className="hidden lg:block overflow-hidden rounded-[2rem] border border-white/5 bg-[#16161D]/40 backdrop-blur-xl shadow-2xl">
              <table className="w-full text-left text-sm table-auto border-separate border-spacing-0">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">#</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Order ID</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Category</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Product</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Config / UID</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Date</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Payment</th>
                    <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#b4c5ff]/60 border-b border-white/5">Status</th>
                    <th className="px-6 py-5 border-b border-white/5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((order, i) => (
                    <React.Fragment key={order.id}>
                      {order.order_items.map((item, itemIdx) => {
                        const conf = getStatusConfig(order.status);
                        const isFirst = itemIdx === 0;
                        return (
                          <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors">
                            <td className="px-6 py-5 text-xs font-bold text-gray-500">{isFirst ? (i + 1).toString().padStart(2, '0') : ''}</td>
                            <td className="px-6 py-5">
                              {isFirst && <span className="text-xs font-black font-mono text-[#b4c5ff] bg-[#b4c5ff]/10 px-3 py-1 rounded-lg">SO-{order.id.split('-')[0]}</span>}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-wider">{item.products.category === 'account' ? 'บัญชีเกม' : 'เติมเกม'}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">{item.products.category}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <img src={item.products.image_url} className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-lg" alt="" />
                                <span className="text-sm font-black truncate max-w-[200px]">{item.products.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex flex-col gap-0.5">
                                 <span className="text-xs font-bold text-gray-400">{item.selected_option || '-'}</span>
                                 <span className="text-[10px] font-mono text-gray-600 italic">{item.player_id || 'N/A'}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-xs text-gray-400 font-medium">
                              {isFirst && format(new Date(order.created_at), 'dd MMM yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-5 text-right">
                              {isFirst && (
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-white">฿{order.total_price.toLocaleString()}</span>
                                  <span className="text-[10px] text-gray-500 uppercase font-black">Success</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center">
                              {isFirst && (
                                <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", conf.bg, conf.color)}>
                                  <conf.icon className="w-3.5 h-3.5" />
                                  {conf.label}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5">
                               {isFirst && (
                                 <button onClick={() => window.dispatchEvent(new CustomEvent('openLiveChat', { detail: { orderId: order.id } }))} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#b4c5ff]/20 hover:border-[#b4c5ff]/50 hover:text-[#b4c5ff] transition-all">
                                   <MessageSquare className="w-5 h-5" />
                                 </button>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {orders.map((order) => {
                const conf = getStatusConfig(order.status);
                return (
                  <div key={order.id} className="rounded-3xl border border-white/5 bg-[#16161D]/60 p-6 space-y-4 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-[#b4c5ff] bg-[#b4c5ff]/10 px-2 py-0.5 rounded uppercase tracking-widest">SO-{order.id.split('-')[0]}</span>
                        <p className="text-[10px] text-gray-500 font-bold">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", conf.bg, conf.color)}>
                         <conf.icon className="w-3 h-3" />
                         {conf.label}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                           <img src={item.products.image_url} className="w-12 h-12 rounded-xl object-cover shrink-0" alt="" />
                           <div className="min-w-0 flex-1">
                             <p className="text-sm font-black truncate">{item.products.name}</p>
                             <p className="text-[10px] text-gray-400 font-bold">{item.selected_option || 'Standard'}</p>
                             {item.player_id && <p className="text-[9px] text-gray-600 font-mono mt-1 italic">UID: {item.player_id}</p>}
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Price</span>
                         <span className="text-xl font-black text-white">฿{order.total_price.toLocaleString()}</span>
                       </div>
                       <button onClick={() => window.dispatchEvent(new CustomEvent('openLiveChat', { detail: { orderId: order.id } }))} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 font-bold text-xs uppercase tracking-widest hover:bg-[#b4c5ff]/10 transition-colors">
                         <MessageSquare className="w-4 h-4" />
                         {t('support') || 'แจ้งปัญหา'}
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <LiveChatWidget />
    </div>
  );
}

// Keep the ShieldCheckIcon helper at the bottom...

function ShieldCheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
