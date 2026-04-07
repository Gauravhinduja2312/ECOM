import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadProductImage } from '../utils/storage';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  category: '',
  image_url: '',
  stock: '',
};

export default function AddProductPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchProducts = async () => {
    const { data: productsData } = await supabase.from('products').select('*').order('id', { ascending: false });
    setProducts(productsData || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const saveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      };

      if (editingId) {
        await supabase.from('products').update(payload).eq('id', editingId);
        setSuccessMessage('Product updated successfully! ✨');
      } else {
        await supabase.from('products').insert(payload);
        setSuccessMessage('Product added successfully! 🎉');
      }

      setProductForm(emptyProduct);
      setEditingId(null);
      await fetchProducts();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadProductImage(file);
      setProductForm((prev) => ({ ...prev, image_url: url }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      image_url: product.image_url,
      stock: String(product.stock),
    });
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure? This action cannot be undone.')) {
      try {
        await supabase.from('products').delete().eq('id', id);
        setSuccessMessage('Product deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchProducts();
      } catch (error) {
        setErrorMessage('Failed to delete product');
      }
    }
  };

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 stagger-elite text-white">
      <section className="mx-auto max-w-6xl px-6 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase inline-flex items-center gap-4">
              <span className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shadow-[0_0_30px_rgba(79,70,229,0.3)]">📦</span>
              Terminal Inventory
            </h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Asset Management Module</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="btn-elite px-6 py-3 text-[10px]"
          >
            ← EXIT TERMINAL
          </button>
        </div>

        <div className="space-y-2">
          <SuccessMessage message={successMessage} />
          <ErrorMessage message={errorMessage} />
        </div>

        <form onSubmit={saveProduct} className="glass-elite p-8 rounded-[2.5rem] space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <span>{editingId ? '✏️' : '➕'}</span>
            {editingId ? 'Modify Asset' : 'Register New Asset'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Asset Name</label>
              <input
                type="text"
                required
                placeholder="Unique Identifier..."
                value={productForm.name}
                onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                className="elite-input"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Technical Description</label>
              <textarea
                required
                placeholder="Asset specifications and status..."
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                className="elite-input min-h-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Price (INR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.price}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                  className="elite-input"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Stock Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0"
                  value={productForm.stock}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                  className="elite-input"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Domain Category</label>
              <input
                type="text"
                required
                placeholder="Fulfillment Category..."
                value={productForm.category}
                onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                className="elite-input"
              />
            </div>

            <div className="pt-4">
              <label className="elite-input flex flex-col items-center justify-center gap-3 border-dashed border-white/10 hover:border-indigo-500/50 py-10 cursor-pointer group transition-all">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">📸</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{uploadingImage ? 'TRANSFORMING...' : 'Acquire Visual Representation'}</span>
                {productForm.image_url && <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">✓ Encrypted Link Ready</span>}
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="btn-elite flex-1 py-5 text-[10px] tracking-[0.2em]"
            >
              {saving ? 'TRANSMITTING...' : editingId ? 'UPDATE BASELINE' : 'EXECUTE REGISTRATION'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setProductForm(emptyProduct);
                  setErrorMessage('');
                }}
                className="px-8 py-5 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
              >
                ✕ ABORT
              </button>
            )}
          </div>
        </form>

        <div className="glass-elite p-8 rounded-[2.5rem]">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 mb-8">
            <span>📋</span>
            Asset Ledger <span className="ml-2 inline-flex items-center justify-center h-8 px-3 rounded-xl bg-indigo-600/20 text-indigo-400 text-xs font-black">{products.length} Items</span>
          </h2>

          <div className="space-y-4 max-h-[40rem] overflow-auto pr-2">
            {products.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl">
                <p className="text-6xl mb-6">📦</p>
                <p className="text-xl font-black uppercase tracking-widest">Null Records</p>
                <p className="text-slate-500 font-medium mt-2">Initialize enrollment to populate terminal.</p>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="group rounded-[1.5rem] bg-white/5 border border-white/5 p-6 transition-all hover:bg-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xl font-black uppercase tracking-tighter line-clamp-1">{product.name}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Price: ₹{product.price.toFixed(2)}</span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Stock: {product.stock} Units</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-2 italic">{product.category}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="flex-1 rounded-xl bg-indigo-600/10 border border-indigo-600/20 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 transition hover:bg-indigo-600 hover:text-white"
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 rounded-xl bg-red-600/10 border border-red-600/20 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white"
                    >
                      PURGE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
