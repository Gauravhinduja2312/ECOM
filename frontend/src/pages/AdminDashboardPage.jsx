import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { socketService } from '../services/socket';
import { useToast } from '../services/ToastContext';
import Loader from '../components/Loader';
import { generateAndDownloadInvoice } from '../utils/invoiceGenerator';

export default function AdminDashboardPage() {
  const { session, profile } = useAuth();
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState({});
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('hub');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchData = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [analyticsRes, submissionsRes, ordersRes] = await Promise.allSettled([
        apiRequest('/api/admin/analytics', 'GET', session.access_token),
        apiRequest('/api/admin/product-submissions', 'GET', session.access_token),
        apiRequest('/api/admin/orders', 'GET', session.access_token),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (submissionsRes.status === 'fulfilled') setSubmissions(submissionsRes.value.submissions || []);
      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.orders || []);
        setOrderItems(ordersRes.value.orderItems || {});
      }

      const { data: tickets } = await supabase.from('support_tickets').select('*, user:users(id, email, pseudonym)').order('updated_at', { ascending: false });
      setSupportTickets(tickets || []);

    } catch (err) {
      addToast('Data synchronization failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchData();
      socketService.connect(profile.id, 'admin');
    }
    socketService.onAdminNotification(() => {
        addToast('New pipeline update received!', 'info');
        fetchData();
    });
    return () => socketService.off('admin_notification');
  }, [session?.access_token]);

  useEffect(() => {
    if (activeTicket) {
      socketService.joinTicket(activeTicket.id);
      const handleMsg = (msg) => {
          if (msg.ticket_id === activeTicket.id) setTicketMessages(prev => [...prev, msg]);
      };
      socketService.onNewMessage(handleMsg);
      return () => socketService.off('new_message');
    }
  }, [activeTicket]);

  const handleSelectTicket = async (ticket) => {
    setActiveTicket(ticket);
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setTicketMessages(data || []);
  };

  const handleSendReply = () => {
    if (!chatInput.trim() || !activeTicket) return;
    socketService.sendMessage({ ticketId: activeTicket.id, senderId: profile.id, message: chatInput.trim() });
    setChatInput('');
  };

  const handleReview = async (id, action, p) => {
     try {
        await apiRequest(`/api/admin/product-submissions/${id}/review`, 'PATCH', session.access_token, { action, proposedPrice: p });
        addToast('Action synchronized successfully.', 'success');
        fetchData();
     } catch (e) {
        addToast(e.message, 'error');
     }
  };

  const handleUpdateOrderStatus = async (id, status) => {
     try {
        await apiRequest(`/api/admin/orders/${id}/status`, 'PATCH', session.access_token, { status });
        addToast('Order finalized.', 'success');
        fetchData();
     } catch (e) {
        addToast(e.message, 'error');
     }
  };

  if (loading && activeTab === 'hub') return <Loader text="Synchronizing Admin Command Center..." />;

  const DashboardTile = ({ title, sub, icon, color, tab }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className="glass-elite p-8 rounded-[2rem] text-left group transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/5 hover:border-indigo-500/30 overflow-hidden relative"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
      <span className="text-4xl mb-6 block">{icon}</span>
      <h3 className="text-xl font-bold tracking-tight text-white/90">{title}</h3>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">{sub}</p>
    </button>
  );

  return (
    <div className="bg-[#020617] min-h-screen pt-40 pb-20 text-white font-['Outfit']">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Persistent Branding */}
        <div className="flex justify-between items-center mb-16">
          <div className="stagger-elite">
            {activeTab !== 'hub' && (
              <button 
                onClick={() => setActiveTab('hub')}
                className="mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:translate-x-1 transition-transform"
              >
                ← Return to Hub
              </button>
            )}
            <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-4">
              <span className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-600/20">A</span>
              {activeTab === 'hub' ? 'Admin Hub' : activeTab.toUpperCase() + ' Management'}
            </h1>
            <p className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-500 mt-2">Elite Operations Suite</p>
          </div>
        </div>

        {activeTab === 'hub' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 stagger-elite">
            <DashboardTile title="SCM Pipeline" sub="Acquisition & Kanban" icon="🚚" color="indigo" tab="scm" />
            <DashboardTile title="Live Orders" sub="Fulfillment Control" icon="🛒" color="emerald" tab="orders" />
            <DashboardTile title="Revenue Center" sub="Financial Intelligence" icon="📊" color="amber" tab="analytics" />
            <DashboardTile title="Support Chat" sub="Real-time Messaging" icon="💬" color="rose" tab="chat" />
            
            <div className="md:col-span-2 glass-elite p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-center">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Network Intelligence</p>
               <div className="grid grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-4xl font-black">{analytics?.totalOrders || 0}</h4>
                    <p className="text-[9px] uppercase font-bold text-slate-600 mt-1">Order Pipeline Volume</p>
                  </div>
                  <div>
                    <h4 className="text-4xl font-black text-indigo-500">₹{analytics?.totalRevenue || 0}</h4>
                    <p className="text-[9px] uppercase font-bold text-slate-600 mt-1">Gross Merchandise Value</p>
                  </div>
               </div>
            </div>
            
            <DashboardTile title="Student CRM" sub="Loyalty & Accounts" icon="👥" color="blue" tab="crm" />
            <DashboardTile title="Operations Log" sub="System Events" icon="📜" color="slate" tab="logs" />
          </div>
        )}

        {activeTab === 'scm' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px] animate-in slide-in-from-bottom-5 duration-500">
             {[
               { id: 'pending', label: 'New Submissions', items: submissions.filter(s => s.verification_status === 'pending') },
               { id: 'prep', label: 'Handover Pipeline', items: submissions.filter(s => s.verification_status === 'verified' && s.handover_status !== 'confirmed') },
               { id: 'active', label: 'Active Inventory', items: submissions.filter(s => s.handover_status === 'confirmed') },
               { id: 'reject', label: 'Rejection Bin', items: submissions.filter(s => s.verification_status === 'rejected') },
             ].map(col => (
               <div key={col.id} className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{col.label}</h3>
                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-bold">{col.items.length}</span>
                  </div>
                  {col.items.map(p => (
                    <div key={p.id} className="glass-card p-6 border border-white/5 hover:border-indigo-500/20 transition-all group">
                      <p className="text-sm font-black uppercase tracking-tight truncate">{p.name}</p>
                      <p className="text-[9px] text-indigo-400 mt-1 font-black">₹{p.price} • {p.seller_email}</p>
                      <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                        {p.verification_status === 'pending' && (
                          <button onClick={() => handleReview(p.id, 'verify')} className="flex-1 py-2 bg-indigo-600 rounded-xl text-[9px] font-black tracking-widest uppercase">Verify</button>
                        )}
                        {p.verification_status === 'verified' && p.handover_status !== 'confirmed' && (
                             <div className="w-full text-center py-2 bg-amber-500/10 text-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Awaiting Handover</div>
                        )}
                      </div>
                    </div>
                  ))}
               </div>
             ))}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="glass-elite rounded-[2.5rem] p-10 space-y-4 animate-in fade-in duration-500">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Live Fulfillment Queue</h3>
             <div className="space-y-4">
               {orders.map(order => (
                 <div key={order.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5">
                    <div className="flex-1">
                       <p className="text-sm font-black uppercase tracking-tight">Order #{order.id} • SKU: {(orderItems[order.id] || []).length} items</p>
                       <p className="text-[9px] text-slate-500 mt-1 uppercase font-black">Status: <span className="text-indigo-400">{order.status.replace('_', ' ')}</span> • Total: ₹{order.total_price}</p>
                    </div>
                    <div className="flex gap-4">
                       <select 
                         onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                         className="elite-input rounded-xl text-[9px] font-black px-4 py-3 bg-[#0f172a]"
                         value={order.status}
                       >
                          <option value="order_placed">Placed</option>
                          <option value="processing">Processing</option>
                          <option value="ready_for_pickup">Ready</option>
                          <option value="shipped">Shipped</option>
                          <option value="completed">Completed</option>
                       </select>
                       <button 
                         onClick={() => generateAndDownloadInvoice(order, orderItems[order.id] || [])}
                         className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                       >Invoice</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
           <div className="glass-elite rounded-[2.5rem] overflow-hidden min-h-[600px] flex animate-in zoom-in-95 duration-500">
              <div className="w-1/3 border-r border-white/5 p-8 overflow-y-auto">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Student Conversations</h3>
                 <div className="space-y-3">
                   {supportTickets.map(ticket => (
                     <button 
                       key={ticket.id} 
                       onClick={() => handleSelectTicket(ticket)}
                       className={`w-full text-left p-5 rounded-2xl transition-all ${activeTicket?.id === ticket.id ? 'bg-indigo-600 shadow-xl' : 'bg-white/[0.02] hover:bg-white/5 border border-white/5'}`}
                     >
                       <p className="text-sm font-black">{ticket.user?.pseudonym || `Student #${ticket.id}`}</p>
                       <p className="text-[9px] text-white/40 uppercase mt-1 truncate">{ticket.subject}</p>
                     </button>
                   ))}
                 </div>
              </div>
              <div className="flex-1 flex flex-col p-10">
                 {activeTicket ? (
                   <>
                     <div className="flex-1 overflow-y-auto mb-8 pr-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                        {ticketMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[70%] p-4 rounded-2xl text-[11px] font-black ${msg.sender_id === profile.id ? 'bg-indigo-600' : 'bg-white/5 border border-white/10 text-slate-400'}`}>
                               {msg.message}
                             </div>
                          </div>
                        ))}
                     </div>
                     <div className="flex gap-4">
                        <input 
                          className="elite-input flex-1 py-4" 
                          placeholder="Reply to Student..." 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                        />
                        <button onClick={handleSendReply} className="px-10 bg-indigo-600 rounded-2xl text-[10px] font-black tracking-widest">SEND</button>
                     </div>
                   </>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                      <span className="text-5xl mb-4">🛡️</span>
                      <p className="text-[10px] font-black uppercase tracking-widest">Select a ticket to begin</p>
                   </div>
                 )}
              </div>
           </div>
        )}

        {activeTab === 'crm' && (
           <div className="glass-elite rounded-[2.5rem] p-10 space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Account Relationship Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(analytics?.crmUsers || []).map(u => (
                  <div key={u.id} className="glass-card p-6 border border-white/5 flex justify-between items-center group">
                     <div>
                        <p className="text-sm font-black uppercase tracking-tight">{u.email}</p>
                        <p className="text-[9px] uppercase font-black text-slate-600 mt-1">{u.role} • LTV: ₹{u.total_spending || 0}</p>
                     </div>
                     <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="Active Account"></span>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'analytics' && (
           <div className="glass-elite rounded-[2.5rem] p-10 flex flex-col items-center justify-center h-[500px]">
              <span className="text-6xl mb-8">📈</span>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Financial Intelligence Suite</h3>
              <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-2xl text-center">
                 <div className="glass-card p-6">
                    <p className="text-2xl font-black">₹{analytics?.totalCommission || 0}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-600">Platform Revenue</p>
                 </div>
                 <div className="glass-card p-6">
                    <p className="text-2xl font-black">₹{analytics?.totalLogisticsRevenue || 0}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-600">Logistics Income</p>
                 </div>
                 <div className="glass-card p-6">
                    <p className="text-2xl font-black">{analytics?.lowStockCount || 0}</p>
                    <p className="text-[9px] uppercase font-bold text-slate-600">Stock Alerts</p>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}
