import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Message } from '../../types';

type MessageRow = Message & { order_id?: string | null };

const OPEN_LIVE_CHAT = 'openLiveChat';

export function LiveChatWidget() {
  const { state: auth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    if (!auth.user || !supabase) return;

    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', auth.user.id);

    if (activeOrderId) {
      query = query.eq('order_id', activeOrderId);
    } else {
      query = query.is('order_id', null);
    }

    const { data } = await query.order('created_at', { ascending: true });

    if (data) setMessages(data as MessageRow[]);
  }

  useEffect(() => {
    function handleOpenChatEvent(e: Event) {
      const ce = e as CustomEvent<{ orderId?: string }>;
      setIsOpen(true);
      if (ce.detail?.orderId) {
        setActiveOrderId(ce.detail.orderId);
      }
    }

    window.addEventListener(OPEN_LIVE_CHAT, handleOpenChatEvent);
    return () => window.removeEventListener(OPEN_LIVE_CHAT, handleOpenChatEvent);
  }, []);

  useEffect(() => {
    if (!isOpen || !auth.user || !supabase) return;

    const client = supabase;
    void fetchMessages();

    const channel = client
        .channel(`public:messages:${auth.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${auth.user.id}`
          },
          (payload) => {
            const row = payload.new as MessageRow;
            const isSameOrder = (row.order_id || null) === (activeOrderId || null);
            if (isSameOrder) {
              setMessages((prev) => [...prev, row]);
            }
          }
        )
        .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isOpen, auth.user, activeOrderId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.user || isLoading || !supabase) return;

    setIsLoading(true);
    const text = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: auth.user.id,
        message: text,
        is_admin: false,
        order_id: activeOrderId
      });

    if (error) {
      console.error('Failed to send message:', error);
      setNewMessage(text);
    }
    setIsLoading(false);
  };

  if (!auth.user) return null;

  return (
    <>
      <button
        id="global-live-chat-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary] text-white shadow-lg shadow-[--color-primary]/30 hover:scale-105 transition-transform"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[350px] flex-col rounded-2xl border border-white/10 bg-[#13131A] shadow-2xl sm:bottom-24 sm:right-6">
          <div className="flex items-center justify-between border-b border-white/5 p-4 bg-[#1c1c24] rounded-t-2xl">
            <div>
              <h3 className="font-bold text-white">ติดต่อเจ้าหน้าที่</h3>
              <p className="text-xs text-[--color-on-surface-variant]">
                {activeOrderId ? `รหัสออเดอร์: SO-${activeOrderId.split('-')[0]}` : 'Live Chat ออนไลน์'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setActiveOrderId(null);
                setMessages([]);
              }}
              className="rounded-full p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-gray-500 mt-10">
                {activeOrderId ? 'สอบถามเกี่ยวกับรายการสั่งซื้อนี้ได้เลยครับ' : 'ส่งข้อความหาแอดมิน แอดมินจะรีบตอบกลับโดยเร็วที่สุด'}
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.is_admin
                        ? 'bg-[#1c1c24] text-white border border-white/5 rounded-tl-sm'
                        : 'bg-[--color-primary] text-white rounded-tr-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-white/5 p-4 bg-[#1c1c24] rounded-b-2xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 rounded-full border border-white/10 bg-[#13131A] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[--color-primary]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--color-primary] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[--color-primary]/90 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
