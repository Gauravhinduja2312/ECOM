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
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2">
            <span className="icon-pill">📦</span>
            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Manage Products</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">Add, edit, or remove products from your store</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="btn-gradient-secondary rounded-lg px-4 py-2 font-medium transition hover:scale-105"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <SuccessMessage message={successMessage} />
        <ErrorMessage message={errorMessage} />
      </div>

      {/* Form Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add/Edit Product Form */}
        <form onSubmit={saveProduct} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-6 shadow-xl shadow-indigo-100/20 space-y-4">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
            <span>{editingId ? '✏️' : '➕'}</span>
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>

          {/* Form Fields */}
          <div className="form-group">
            <label className="form-label">📝 Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Wireless Headphones"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">📄 Description</label>
            <textarea
              required
              placeholder="Describe your product..."
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              className="form-input min-h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">💸 Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={productForm.price}
                onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">📊 Stock</label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={productForm.stock}
                onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">🏷️ Category</label>
            <input
              type="text"
              required
              placeholder="e.g., Electronics"
              value={productForm.category}
              onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">🖼️ Product Image</label>
            <label className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-6 cursor-pointer transition hover:bg-indigo-100/50">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <span className="text-2xl">📸</span>
              <span className="text-sm font-medium text-indigo-600">{uploadingImage ? 'Uploading...' : 'Click to upload image'}</span>
              {productForm.image_url && <span className="text-xs text-emerald-600">✓ Image selected</span>}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="btn-gradient flex-1 rounded-lg px-4 py-2.5 font-semibold uppercase tracking-wide disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-indigo-200"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{editingId ? '💾' : '✨'}</span>
                  {editingId ? 'Update Product' : 'Create Product'}
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setProductForm(emptyProduct);
                  setErrorMessage('');
                }}
                className="btn-gradient-secondary rounded-lg px-4 py-2.5 font-semibold uppercase tracking-wide"
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </form>

        {/* Products List */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
            <span>📋</span>
            All Products <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-bold">{products.length}</span>
          </h2>

          <div className="space-y-2 max-h-96 overflow-auto">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📦</p>
                <p className="text-slate-600 font-medium">No products yet</p>
                <p className="text-sm text-slate-500">Add your first product to get started</p>
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="group rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:bg-white hover:shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 line-clamp-1">{product.name}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        💸 ₹{product.price.toFixed(2)} • 📊 {product.stock} in stock
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{product.category}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="flex-1 rounded px-3 py-1.5 text-sm font-medium transition bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1 rounded px-3 py-1.5 text-sm font-medium transition bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
