import { useState, useEffect } from 'react';
import { createTransaction, fetchCategories } from '../../api';
import ModalFooter from '../../components/layout/ModalFooter';

const AddTransactionModal = (props) => {
  const { isOpen, onClose, onTransactionCreated, initialType = 'Pemasukan' } = props;
  const [formData, setFormData] = useState({
    type: initialType || 'Pemasukan',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  // Load dynamic categories from backend
  useEffect(() => {
    if (!isOpen) return;
    loadCategories();
    const handleCategoriesUpdated = () => loadCategories();
    window.addEventListener('categories:updated', handleCategoriesUpdated);
    return () => window.removeEventListener('categories:updated', handleCategoriesUpdated);
  }, [isOpen, formData.type]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories(formData.type);
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
    }
  };

  if (!isOpen) return null;

  const isFormValid = formData.amount && formData.category;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      setError('Mohon isi jumlah dan kategori.');
      return;
    }

    const parsedAmount = Number(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah transaksi harus berupa angka positif lebih dari 0.');
      return;
    }

    if (formData.description && formData.description.length > 500) {
      setError('Keterangan terlalu panjang (maksimal 500 karakter).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await createTransaction({
        description: formData.description || formData.category,
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        createdAt: formData.date,
      });

      // Reset form
      setFormData({
        type: initialType || 'Pemasukan',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
      });

      // Trigger refresh callback
      if (props.onTransactionCreated) {
        props.onTransactionCreated?.();
      }

      // Dispatch global events for pages to listen to (real-time refresh)
      try {
        window.dispatchEvent(new Event('transactions:updated'));
        if (formData.type === 'Pemasukan') window.dispatchEvent(new Event('pemasukan:updated'));
        if (formData.type === 'Pengeluaran') window.dispatchEvent(new Event('pengeluaran:updated'));
      } catch (err) {
        // ignore if window not available in test env
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('❌ AddTransactionModal: Error creating transaction:', err);
      setError(err.message || 'Gagal membuat transaksi. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: initialType || 'Pemasukan',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
    });
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-margin-mobile">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 border-b border-outline-variant/20 p-md bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">Tambah Transaksi Baru</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Catat rincian transaksi finansial untuk dokumentasi dan persetujuan.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0 ml-md"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-md space-y-md">
          {/* Type Selection */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-md shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></div>
            <fieldset>
              <legend className="font-label-md text-label-md text-on-surface-variant mb-sm block">Jenis Transaksi</legend>
              <div className="grid grid-cols-2 gap-sm">
                {['Pemasukan', 'Pengeluaran'].map((type) => (
                  <label key={type} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="transaction_type"
                      value={type}
                      checked={formData.type === type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
                      className="sr-only peer"
                    />
                    <div className="flex items-center justify-center gap-sm py-sm px-md rounded-lg border border-outline-variant/30 bg-surface text-on-surface-variant peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all duration-200">
                      <span className="material-symbols-outlined">
                        {type === 'Pemasukan' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                      <span className="font-label-md text-label-md">{type}</span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Details */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-md shadow-sm relative overflow-hidden space-y-md">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {/* Amount */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="amount">Jumlah</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-sm flex items-center pointer-events-none">
                    <span className="text-on-surface-variant font-body-md">Rp</span>
                  </div>
                  <input
                    id="amount"
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    className="block w-full pl-xl pr-sm py-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-on-surface placeholder-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 font-body-md text-body-md"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="date">Tanggal</label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="block w-full px-sm py-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 font-body-md text-body-md"
                />
              </div>
            </div>

            {/* Category - Dynamic from backend */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="category">Kategori</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full px-sm py-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 font-body-md text-body-md"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="description">Keterangan</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Rincian tambahan mengenai transaksi..."
                rows="3"
                className="block w-full px-sm py-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-on-surface placeholder-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 font-body-md text-body-md resize-y"
              />
            </div>
          </div>

          {error && <p className="text-error font-body-md text-body-md">{error}</p>}

          {/* Actions */}
          <ModalFooter>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`h-11 w-full md:w-auto px-md rounded-lg font-bold font-label-md text-label-md transition-all duration-200 flex items-center justify-center ${
                loading || !isFormValid
                  ? 'bg-slate-600 text-slate-400 opacity-50 cursor-not-allowed'
                  : 'text-white bg-primary hover:bg-primary/90 hover:shadow-[0_0_15px_rgba(0,35,102,0.5)]'
              }`}
            >
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="h-11 w-full md:w-auto px-md rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md flex items-center justify-center"
            >
              Batal
            </button>
          </ModalFooter>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
