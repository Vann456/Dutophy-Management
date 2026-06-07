import { useState, useEffect } from 'react';
import { createTransaction, fetchCategories } from '../../api';

const CreateExpenseModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    loadCategories();
    const handleCategoriesUpdated = () => loadCategories();
    window.addEventListener('categories:updated', handleCategoriesUpdated);
    return () => window.removeEventListener('categories:updated', handleCategoriesUpdated);
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories('Pengeluaran');
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load expense categories:', err);
      setCategories([]);
    }
  };

  if (!isOpen) return null;

  const isFormValid = form.title && form.amount && form.category;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.category) return alert('Isi semua field wajib');
    try {
      setLoading(true);
      await createTransaction({
        description: form.title,
        amount: Number(form.amount),
        type: 'Pengeluaran',
        category: form.category,
        createdAt: form.date,
      });
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={handleSave} className="w-full max-w-2xl bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl">
        <div className="p-md border-b flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Buat Pengeluaran</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-md space-y-md">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant">Nama Pengeluaran</label>
            <input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Nominal (Rp)</label>
              <input value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value.replace(/\D/g,'')})} className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface" />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Tanggal</label>
              <input type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface" />
            </div>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant">Kategori</label>
            <select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface">
              <option value="">Pilih Kategori</option>
              {categories.map(cat=> <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant">Keterangan</label>
            <textarea value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface" />
          </div>
        </div>
        <div className="p-md border-t flex justify-end gap-sm bg-surface-container-lowest">
          <button type="button" onClick={onClose} className="px-md py-sm rounded-lg border border-outline-variant text-on-surface">Batal</button>
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`px-md py-sm rounded-lg font-bold transition-all duration-200 ${
              loading || !isFormValid
                ? 'bg-slate-600 text-slate-400 opacity-50 cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20'
            }`}
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateExpenseModal;
