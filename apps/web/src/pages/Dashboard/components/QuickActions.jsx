import React, { useState } from 'react';
import SettingsModal from '../../../components/modals/SettingsModal';
import CreateInvoiceModal from '../../../components/modals/CreateInvoiceModal';
import PayDuesModal from '../../../components/modals/PayDuesModal';
import CreateExpenseModal from '../../../components/modals/CreateExpenseModal';

const QuickActions = ({ onTransactionCreated, onOpenAddTransaction, user }) => {
  const [openSettings, setOpenSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('kas');
  const [openInvoice, setOpenInvoice] = useState(false);
  const [openPay, setOpenPay] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  return (
    <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex flex-col h-auto md:h-[300px]">
      <div className="flex items-center justify-between mb-lg">
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Aksi Cepat</h3>
      </div>

      <div className="grid grid-cols-2 gap-sm flex-1">
        <button type="button" onClick={() => setOpenInvoice(true)} className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
          <span className="material-symbols-outlined text-[32px] mb-sm">receipt_long</span>
          <span className="font-label-md text-label-md text-on-surface text-center">Buat Tagihan</span>
        </button>

        <button type="button" onClick={() => setOpenPay(true)} className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
          <span className="material-symbols-outlined text-[32px] mb-sm">payments</span>
          <span className="font-label-md text-label-md text-on-surface text-center">Bayar Iuran</span>
        </button>

        <button type="button" onClick={() => setOpenExpense(true)} className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
          <span className="material-symbols-outlined text-[32px] mb-sm">description</span>
          <span className="font-label-md text-label-md text-on-surface text-center">Buat Pengeluaran</span>
        </button>

        <button type="button" onClick={() => {
          setSettingsTab('kas');
          setOpenSettings(true);
        }} className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
          <span className="material-symbols-outlined text-[32px] mb-sm">settings</span>
          <span className="font-label-md text-label-md text-on-surface text-center">Pengaturan</span>
        </button>
      </div>

      <SettingsModal isOpen={openSettings} onClose={() => setOpenSettings(false)} initialTab={settingsTab} user={user} />
      <CreateInvoiceModal isOpen={openInvoice} onClose={() => setOpenInvoice(false)} onCreated={onTransactionCreated} user={user} />
      <PayDuesModal isOpen={openPay} onClose={() => setOpenPay(false)} onPaid={onTransactionCreated} />
      <CreateExpenseModal isOpen={openExpense} onClose={() => setOpenExpense(false)} onCreated={onTransactionCreated} />
    </div>
  );
};

export default QuickActions;
