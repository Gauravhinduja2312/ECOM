import { useState } from 'react';
import { apiRequest } from '../services/api';
import { uploadProductImage } from '../utils/storage';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';

const STEPS = [
  { id: 'identity', title: 'Product Identity', icon: '📝' },
  { id: 'visuals', title: 'Visual Evidence', icon: '📸' },
  { id: 'details', title: 'Value & Description', icon: '💎' },
  { id: 'logistics', title: 'Handover Protocol', icon: '📍' }
];

export default function ListingWizard({ onComplete, onCancel }) {
  const { session } = useAuth();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '1',
    image_url: '',
    pickupTime: '',
    pickupLocation: ''
  });

  const updateData = (fields) => setFormData(prev => ({ ...prev, ...fields }));

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/products/store/offer', 'POST', session.access_token, {
        listingDraft: {
          name: formData.name,
          category: formData.category,
          description: formData.description,
          price: Number(formData.price),
          stock: Number(formData.stock),
          image_url: formData.image_url,
          seller_pickup_time: formData.pickupTime,
          seller_pickup_location: formData.pickupLocation
        }
      });
      addToast('Listing submission successful. Awaiting review.', 'success');
      if (onComplete) onComplete();
    } catch (err) {
      addToast(err.message || 'Submission failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadProductImage(file);
      updateData({ image_url: url });
      addToast('Product vision digitized.', 'info');
    } catch (err) {
      addToast('Upload failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-10 max-w-2xl mx-auto stagger-elite">
      {/* Step Indicator */}
      <div className="flex justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0"></div>
        {STEPS.map((step, idx) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
              idx <= currentStep ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-slate-900 text-slate-500 border border-white/5'
            }`}>
              {idx < currentStep ? '✓' : step.icon}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest mt-2 transition-colors ${idx <= currentStep ? 'text-indigo-400' : 'text-slate-600'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px] mb-12">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
           <span className="text-sm px-3 py-1 bg-white/5 rounded-lg text-slate-500 font-mono">0{currentStep + 1}</span>
           {STEPS[currentStep].title}
        </h2>

        {currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">What are you selling?</label>
              <input 
                className="elite-input" 
                placeholder="Product Name..." 
                value={formData.name}
                onChange={e => updateData({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Category</label>
              <select 
                className="elite-input bg-[#0f172a]"
                value={formData.category}
                onChange={e => updateData({ category: e.target.value })}
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Books">Books</option>
                <option value="Hostel Gear">Hostel Gear</option>
                <option value="Fashion">Fashion</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
             <label className="elite-input flex flex-col items-center justify-center py-20 border-dashed border-white/10 hover:border-indigo-500/50 cursor-pointer group transition-all">
                <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                {formData.image_url ? (
                  <div className="text-center">
                    <p className="text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">Image Captured</p>
                    <img src={formData.image_url} className="h-32 rounded-xl border border-white/10 mx-auto" />
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">📸</span>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover:text-white transition">Capture Product Visuals</p>
                  </div>
                )}
            </label>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Item Condition & Details</label>
              <textarea 
                className="elite-input min-h-32" 
                placeholder="Describe usage, scratches, or unique features..."
                value={formData.description}
                onChange={e => updateData({ description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Proposed Price (₹)</label>
                <input 
                  type="number" 
                  className="elite-input" 
                  placeholder="0.00"
                  value={formData.price}
                  onChange={e => updateData({ price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Stock Count</label>
                <input 
                  type="number" 
                  className="elite-input" 
                  value={formData.stock}
                  onChange={e => updateData({ stock: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl mb-8">
               <p className="text-[10px] text-indigo-300 font-medium leading-relaxed">
                 Finally, let us know when and where the Store Admin can collect this item from you for verification.
               </p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Preferred Handover Time</label>
              <input 
                type="datetime-local" 
                className="elite-input" 
                value={formData.pickupTime}
                onChange={e => updateData({ pickupTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Handover Location (Hostel/Gate)</label>
              <input 
                className="elite-input" 
                placeholder="e.g. Hostel A Main Gate"
                value={formData.pickupLocation}
                onChange={e => updateData({ pickupLocation: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        {currentStep > 0 && (
          <button onClick={handleBack} className="px-8 py-4 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition">
            Previous
          </button>
        )}
        <button 
          onClick={handleNext} 
          disabled={loading}
          className="flex-1 btn-elite py-4 text-[9px] tracking-[0.2em] font-black"
        >
          {loading ? 'PROCESSING...' : currentStep === STEPS.length - 1 ? 'FINALIZE SUBMISSION' : 'PROCEED'}
        </button>
      </div>
      
      <button onClick={onCancel} className="w-full text-[9px] font-black text-slate-700 hover:text-slate-500 transition uppercase tracking-[0.3em] mt-8">
        Abort Listing
      </button>
    </div>
  );
}
