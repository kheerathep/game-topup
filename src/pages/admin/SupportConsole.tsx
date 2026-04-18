import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import {
  Search,
  Send,
  Monitor,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export function SupportConsole() {
  const [activeQueues, setActiveQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    fetchActiveQueues();

    const channel = client
      .channel('public:messages_admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          handleIncomingMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [selectedQueue]);

  useEffect(() => {
    if (selectedQueue) {
      fetchChatMessages(selectedQueue.user_id, selectedQueue.order_id);
    } else {
      setChatMessages([]);
    }
  }, [selectedQueue]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchActiveQueues = async () => {
    if (!supabase) return;
    // For MVP: Fetch latest 200 messages and group them by user_id and order_id in JS
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !msgs) return;

    // Fetch profiles manually to avoid foreign key Join errors (Status 400)
    const userIds = [...new Set(msgs.map(m => m.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    const profileMap = new Map();
    if (profilesData) {
      profilesData.forEach(p => profileMap.set(p.id, p));
    }

    const queuesMap = new Map();
    msgs.forEach((msg) => {
      const key = `${msg.user_id}-${msg.order_id || 'general'}`;
      if (!queuesMap.has(key)) {
        queuesMap.set(key, {
          user_id: msg.user_id,
          order_id: msg.order_id,
          profile: profileMap.get(msg.user_id),
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unread: !msg.is_admin
        });
      }
    });

    setActiveQueues(Array.from(queuesMap.values()));
  };

  const handleIncomingMessage = (newMsg: any) => {
    fetchActiveQueues();
    if (selectedQueue) {
      const isSameUser = newMsg.user_id === selectedQueue.user_id;
      const isSameOrder = (newMsg.order_id || null) === (selectedQueue.order_id || null);
      if (isSameUser && isSameOrder) {
        setChatMessages(prev => [...prev, newMsg]);
      }
    }
  };

  const fetchChatMessages = async (userId: string, orderId: string | null) => {
    if (!supabase) return;
    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId);
      
    if (orderId) {
      query = query.eq('order_id', orderId);
    } else {
      query = query.is('order_id', null);
    }

    const { data } = await query.order('created_at', { ascending: true });
    if (data) setChatMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedQueue || isLoading || !supabase) return;

    setIsLoading(true);
    const text = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: selectedQueue.user_id,
        order_id: selectedQueue.order_id,
        message: text,
        is_admin: true
      });

    if (error) {
      console.error(error);
      setNewMessage(text);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden bg-[#0e141c] text-white rounded-xl border border-white/5 shadow-2xl">
      <section className="w-full md:w-80 h-full flex flex-col bg-[#161c24] border-r border-white/5 shrink-0">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold tracking-tight">Active Queues</h2>
            <span className="bg-[#00e3fd]/20 text-[#00e3fd] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {activeQueues.filter(q => q.unread).length} Wait
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input className="w-full bg-[#2f353e] text-white text-sm rounded-md py-2 pl-10 pr-4 focus:outline-none border-none" placeholder="Search user..." type="text" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
          {activeQueues.map((queue) => (
            <div key={`${queue.user_id}-${queue.order_id}`} onClick={() => setSelectedQueue(queue)} className={`p-4 rounded-lg cursor-pointer relative overflow-hidden transition-colors ${selectedQueue?.user_id === queue.user_id && selectedQueue?.order_id === queue.order_id ? 'bg-[#1a2028]' : 'bg-[#242a33]'}`}>
              {selectedQueue?.user_id === queue.user_id && selectedQueue?.order_id === queue.order_id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b4c5ff]"></div>}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2f353e] flex items-center justify-center font-bold text-xs uppercase border border-white/10">
                    {(queue.profile?.display_name || 'U').substring(0,2)}
                  </div>
                  <div><h3 className="font-bold text-sm">{queue.profile?.display_name || 'User'}</h3><p className="text-[10px] text-gray-400 uppercase">{queue.order_id ? `Order: SO-${queue.order_id.split('-')[0]}` : 'General'}</p></div>
                </div>
                <span className="text-[10px] text-gray-500">{format(new Date(queue.lastMessageTime), 'HH:mm')}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">{queue.lastMessage}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="flex-1 flex flex-col h-full bg-[#0e141c] relative z-0 min-w-0 border-r border-white/5">
        {selectedQueue ? (
          <>
            <header className="h-20 px-6 flex justify-between items-center bg-[#161c24]/50 backdrop-blur-md shrink-0 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#2f353e] flex items-center justify-center font-bold uppercase border border-[#b4c5ff]/30">{(selectedQueue.profile?.display_name || 'US').substring(0,2)}</div>
                <div><h2 className="text-lg font-bold">{selectedQueue.profile?.display_name || 'User'}</h2><p className="text-xs text-gray-400">{selectedQueue.order_id ? `Ticket #SO-${selectedQueue.order_id.split('-')[0]}` : 'General Support'}</p></div>
              </div>
              <button onClick={() => setSelectedQueue(null)} className="w-8 h-8 rounded-md bg-[#2f353e] text-gray-400 hover:text-white flex items-center justify-center border border-white/10"><X className="w-5 h-5" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-4 max-w-2xl ${msg.is_admin ? 'flex-row-reverse self-end ml-auto' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 mt-1 flex items-center justify-center border ${msg.is_admin ? 'bg-[#b4c5ff]/20 border-[#b4c5ff]/30' : 'bg-[#2f353e] border-white/10'}`}>
                    {msg.is_admin ? <Monitor className="w-4 h-4 text-[#b4c5ff]" /> : <span className="text-xs font-bold uppercase">U</span>}
                  </div>
                  <div className={`flex flex-col gap-1 ${msg.is_admin ? 'items-end' : ''}`}>
                    <div className={`flex items-baseline gap-2 ${msg.is_admin ? 'flex-row-reverse' : ''}`}><span className={`font-bold text-sm ${msg.is_admin ? 'text-[#b4c5ff]' : 'text-white'}`}>{msg.is_admin ? 'Support' : (selectedQueue.profile?.display_name || 'User')}</span><span className="text-[10px] text-gray-500">{format(new Date(msg.created_at), 'HH:mm')}</span></div>
                    <div className={`p-4 rounded-lg text-sm text-white border ${msg.is_admin ? 'bg-[#343a42]/60 border-[#b4c5ff]/20 rounded-tr-none' : 'bg-[#1a2028] border-white/10 rounded-tl-none'}`}>{msg.message}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-[#161c24] border-t border-white/5 shrink-0">
               <form onSubmit={handleSendMessage} className="bg-[#2f353e] rounded-lg border border-white/10 flex flex-col focus-within:border-[#b4c5ff]/40 transition-all">
                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} className="w-full bg-transparent text-white text-sm p-4 focus:outline-none resize-none placeholder-gray-500" placeholder="Type a message..." rows={3} disabled={isLoading} />
                <div className="flex justify-between items-center p-3 border-t border-white/5">
                  <div />
                  <button type="submit" disabled={!newMessage.trim() || isLoading} className="bg-gradient-to-br from-[#b4c5ff] to-[#628aff] text-[#00174c] px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider hover:opacity-90 flex items-center gap-2 disabled:opacity-50">Send <Send className="w-3.5 h-3.5" /></button>
                </div>
              </form>
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-gray-500">Select a chat queue to begin</div>}
      </section>
      {selectedQueue && (
        <aside className="w-80 h-full bg-[#161c24] hidden xl:flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-400 tracking-wide uppercase mb-6">User Context</h3>
            <div className="bg-[#1a2028] rounded-lg p-5 border border-white/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#2f353e] border border-[#b4c5ff]/20 flex items-center justify-center font-bold text-lg uppercase">{(selectedQueue.profile?.display_name || 'U').substring(0,2)}</div>
                <div className="overflow-hidden"><h4 className="font-bold text-base text-white truncate">{selectedQueue.profile?.display_name || 'User'}</h4><p className="text-xs text-gray-400">ID: {selectedQueue.user_id.split('-')[0]}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#2f353e] p-3 rounded-md"><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Status</p><p className="text-sm font-bold text-[#bdf4ff]">Customer</p></div>
                <div className="bg-[#2f353e] p-3 rounded-md"><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Associated Order</p><p className="text-xs font-bold text-white font-mono mt-1 truncate">{selectedQueue.order_id ? `SO-${selectedQueue.order_id.split('-')[0]}` : 'None'}</p></div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
