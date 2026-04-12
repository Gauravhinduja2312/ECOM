import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useCart } from '../services/CartContext';
import { apiRequest } from '../services/api';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency } from '../utils/format';
import { useToast } from '../services/ToastContext';
import Loader from '../components/Loader';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { session, profile } = useAuth();
  const { items, clearCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const DELIVERY_FEE = 20;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Main Gate');
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup'); // 'pickup' or 'delivery'
  const [homeAddress, setHomeAddress] = useState('');

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.products?.price || 0) * Number(item.quantity),
    0
  );

  const appliedDeliveryFee = deliveryMethod === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + appliedDeliveryFee;

  const handlePayment = async () => {
    setError('');

    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }

    if (deliveryMethod === 'pickup') {
      if (!pickupLocation.trim()) {
        setError('Please enter a pickup location.');
        return;
      }
      if (!pickupTime) {
        setError('Please select a pickup time.');
        return;
      }
    } else {
      if (!homeAddress.trim()) {
        setError('Please enter your home/hostel address.');
        return;
      }
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      addToast('Failed to load payment gateway.', 'error');
      setError('Failed to load Razorpay checkout.');
      return;
    }

    setLoading(true);

    try {
      const paymentOrder = await apiRequest(
        '/api/payment/create-order',
        'POST',
        session.access_token,
        {
          amount: total,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Campus Marketplace',
        description: 'Order Payment',
        order_id: paymentOrder.id,
        handler: async function onPaymentSuccess(response) {
          try {
            const payloadItems = items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.products.price,
              name: item.products.name,
            }));

            const verification = await apiRequest(
              '/api/payment/verify-and-create-order',
              'POST',
              session.access_token,
              {
                ...response,
                items: payloadItems,
                total,
                subtotal,
                deliveryFee: appliedDeliveryFee,
                userId: profile.id,
                deliveryMethod,
                pickupLocation: deliveryMethod === 'pickup' ? pickupLocation.trim() : null,
                pickupTime: deliveryMethod === 'pickup' ? pickupTime : null,
                deliveryAddress: deliveryMethod === 'delivery' ? homeAddress.trim() : null,
              }
            );

            await clearCart();
            addToast('Order placed successfully!', 'success');
            navigate(`/order-success/${verification.order.id}`);
          } catch (verifyError) {
            setError(verifyError.message);
            addToast('Payment verification failed.', 'error');
          }
        },
        prefill: {
          email: profile?.email,
          name: profile?.name || 'Personnel',
        },
        theme: {
          color: '#6366f1',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (checkoutError) {
      setError(checkoutError.message);
      addToast('Payment failed to start.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !loading) {
     return (
       <div className="bg-[#020617] min-h-screen pt-64 flex flex-col items-center px-6">
        <div className="glass-card p-12 text-center max-w-lg">
          <p className="text-4xl mb-6">🧺</p>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Your cart is empty</h2>
          <button onClick={() => navigate('/products')} className="btn-elite px-10 py-4 text-[10px] tracking-widest">GO TO SHOP</button>
        </div>
      </div>
     );
  }

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 text-white">
      <section className="mx-auto max-w-4xl px-6 stagger-elite">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase inline-flex items-center gap-5">
              <span className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)]">🔐</span>
              Checkout
            </h1>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Secure Checkout · 100% Safe</p>
          </div>
           <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Amount</p>
            <p className="text-3xl font-black text-indigo-400 tracking-tighter">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Summary */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-10">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                    Fulfillment
                  </h2>
                  <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                    {['pickup', 'delivery'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setDeliveryMethod(method)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          deliveryMethod === method ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
               </div>

              {deliveryMethod === 'pickup' ? (
                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Pickup Location</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['Main Gate', 'Canteen', 'Library', 'Reception', 'Auditorium'].map((zone) => (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => setPickupLocation(zone)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            pickupLocation === zone ? 'bg-indigo-600 border-indigo-600' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      className="elite-input"
                      placeholder="Custom location..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Pickup Time</label>
                    <input
                      type="datetime-local"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="elite-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Home / Hostel Address</label>
                  <textarea
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    className="elite-input min-h-[120px] py-4"
                    placeholder="Enter your detailed address (Hostel Name, Room No, Floor)..."
                  />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">🚀 Delivery usually takes 2-4 hours inside campus.</p>
                </div>
              )}
            </div>

            <div className="glass-card p-10">
               <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                Payment Method
              </h2>
               <div className="p-6 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex items-start gap-4">
                <span className="text-2xl mt-1">🛡️</span>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Secure Payment via Razorpay</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Pay securely using UPI, Cards, or Netbanking. Your data is 100% safe.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
           <div className="space-y-6">
            <div className="glass-card p-8 bg-indigo-600/[0.03]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Order Summary</h3>
               <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Subtotal</span>
                  <span className="font-black text-white">{formatCurrency(subtotal)}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Delivery Fee</span>
                  {appliedDeliveryFee > 0 ? (
                    <span className="font-black text-indigo-400">{formatCurrency(appliedDeliveryFee)}</span>
                  ) : (
                    <span className="font-black text-emerald-400 uppercase tracking-widest text-[10px]">FREE</span>
                  )}
                </div>
                 <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <span className="text-white font-black uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-2xl font-black text-indigo-400 tracking-tighter">{formatCurrency(total)}</span>
                </div>
              </div>

              <ErrorMessage message={error} />
              
               <button
                type="button"
                className="btn-elite w-full py-5 text-[10px] tracking-[0.2em] shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? 'PROCESSING...' : 'PAY NOW'}
              </button>

              <p className="mt-6 text-[9px] text-center font-black text-slate-600 uppercase tracking-widest opacity-60">
                🔒 Secure Payment
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

