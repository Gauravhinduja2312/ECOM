import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { socketService } from '../services/socket';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../services/ToastContext';

export default function SupportChatWidget() {
  const { session, profile } = useAuth();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (session && isOpen) {
      socketService.connect(profile.id, profile.role);
      syncConversation();
    }
    
    return () => {
      // Don't disconnect socket here to keep notifications working globally
    };
  }, [session, isOpen]);

  useEffect(() => {
    if (activeTicket) {
      socketService.joinTicket(activeTicket.id);
      
      const handleNewMessage = (msg) => {
        if (msg.ticket_id === activeTicket.id) {
          setMessages(prev => [...prev, msg]);
        }
      };

      socketService.onNewMessage(handleNewMessage);
      return () => socketService.off('new_message');
    }
  }, [activeTicket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const syncConversation = async () => {
    setLoading(true);
    try {
      // Find latest open ticket for this user
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', profile.id)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket) {
        setActiveTicket(ticket);
        const { data: history } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true });
        
        setMessages(history || []);
      }
    } catch (err) {
      console.error('Chat Sync Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    let ticketId = activeTicket?.id;

    // 1. Create ticket if none exists
    if (!ticketId) {
      const { data: newTicket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: profile.id,
          subject: 'Direct Support Chat',
          description: 'Live support session',
          status: 'open'
        })
        .select()
        .single();
      
      if (error) {
        addToast('Failed to start chat.', 'error');
        return;
      }
      ticketId = newTicket.id;
      setActiveTicket(newTicket);
      socketService.joinTicket(ticketId);
    }

    // 2. Send via Socket (Backend handles persistence)
    socketService.sendMessage({
      ticketId,
      senderId: profile.id,
      message: inputValue.trim()
    });

    setInputValue('');
  };

  if (!session) return null;

  return (
    <div className="fixed bottom-10 right-10 z-[100] font-['Outfit']">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:scale-110 transition-all border border-indigo-400/20"
        >
          💬
        </button>
      ) : (
        <div className="w-[380px] h-[550px] glass-card flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border-white/10 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-6 bg-indigo-600 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Live Support</h3>
              <p className="text-[10px] text-indigo-200 uppercase font-black tracking-tighter mt-0.5">Anonymous Peer Support</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white opacity-50 hover:opacity-100 transition">✕</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-10">
                <div className="text-4xl mb-4">🛡️</div>
                <p className="text-[10px] font-black uppercase tracking-widest">Chat anonymously with Platform Admin for orders & support.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] leading-relaxed font-black rounded-tl-none ${
                   m.sender_id === profile.id 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white/5 text-slate-300 border border-white/5'
                }`}>
                  {m.message}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5 bg-white/[0.02]">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type your message..."
                className="elite-input flex-1 py-3 text-xs"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                className="bg-indigo-600 px-5 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
              >
                🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
