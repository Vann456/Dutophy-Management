import { useState, useMemo } from 'react';

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** 6 bulan terakhir mundur dari sekarang */
function getLast6MonthLabels() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('id-ID', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() };
  });
}

/** Jan–Des tahun berjalan */
function getFullYearLabels(year) {
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return MONTHS.map((label, month) => ({ label, year, month }));
}

/** 2023–2029 */
const YEAR_SLOTS = [2023, 2024, 2025, 2026, 2027, 2028, 2029].map(y => ({ label: String(y), year: y, month: null }));

const FILTER_OPTIONS = [
  { value: '6months', label: '6 Bulan Terakhir' },
  { value: 'thisyear', label: 'Tahun Ini' },
  { value: 'yearly', label: 'Tahunan' },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const CashFlowChart = ({ transactions = [] }) => {
  const [filter, setFilter] = useState('6months');
  const txList = Array.isArray(transactions) ? transactions : [];
  const now = new Date();

  // Tentukan slot berdasarkan filter
  const slots = useMemo(() => {
    if (filter === '6months')  return getLast6MonthLabels();
    if (filter === 'thisyear') return getFullYearLabels(now.getFullYear());
    return YEAR_SLOTS;
  }, [filter, now.getFullYear()]);

  // Hitung income/expense per slot
  const summary = useMemo(() => {
    const map = {};
    slots.forEach(s => { map[s.label] = { income: 0, expense: 0 }; });

    txList.forEach(tx => {
      const d = new Date(tx?.createdAt);
      if (isNaN(d.getTime())) return;

      let key = null;
      if (filter === 'yearly') {
        key = String(d.getFullYear());
      } else {
        // match by year + month
        const slot = slots.find(s => s.year === d.getFullYear() && s.month === d.getMonth());
        if (slot) key = slot.label;
      }

      if (!key || !map[key]) return;
      if (tx?.type === 'Pemasukan')   map[key].income  += Number(tx?.amount || 0);
      if (tx?.type === 'Pengeluaran') map[key].expense += Number(tx?.amount || 0);
    });

    return map;
  }, [txList, slots, filter]);

  const maxValue = Math.max(1, ...Object.values(summary).flatMap(v => [v.income, v.expense]));

  return (
    <div className="lg:col-span-2 bg-surface-container p-md rounded-xl border border-surface-variant flex flex-col">
      <div className="flex justify-between items-center mb-lg">
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Arus Kas</h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-surface border border-surface-variant text-label-md font-label-md rounded-lg focus:ring-primary text-on-surface py-sm px-md cursor-pointer"
        >
          {FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 flex items-end justify-between h-40 md:h-56 mt-auto pb-sm relative border-b border-surface-variant">
        {/* Chart area */}
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-label-md font-label-md text-on-surface-variant pb-sm pl-3">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Bars */}
        <div className="w-full flex items-end justify-between gap-1 px-2 ml-8">
          {slots.map(slot => {
            const data = summary[slot.label] ?? { income: 0, expense: 0 };
            const incomePct  = Math.max(4, Math.round((data.income  / maxValue) * 100));
            const expensePct = Math.max(4, Math.round((data.expense / maxValue) * 100));
            return (
              <div key={slot.label} className="flex flex-col items-center gap-1 w-full">
                <div className="flex items-end gap-1 h-28 md:h-40 w-full">
                  <div
                    className="w-full bg-surface-container-high rounded-t-sm transition-all duration-300"
                    style={{ height: `${expensePct}%` }}
                    title={`Pengeluaran: Rp ${data.expense.toLocaleString('id-ID')}`}
                  />
                  <div
                    className="w-full bg-primary rounded-t-sm transition-all duration-300"
                    style={{ height: `${incomePct}%` }}
                    title={`Pemasukan: Rp ${data.income.toLocaleString('id-ID')}`}
                  />
                </div>
                <span className="text-label-sm text-on-surface-variant text-center leading-tight">{slot.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-md mt-sm">
        <span className="inline-flex items-center gap-xs font-label-md text-label-md text-on-surface-variant">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block"></span>Pemasukan
        </span>
        <span className="inline-flex items-center gap-xs font-label-md text-label-md text-on-surface-variant">
          <span className="w-3 h-3 rounded-sm bg-surface-container-high inline-block"></span>Pengeluaran
        </span>
      </div>
    </div>
  );
};

export default CashFlowChart;
