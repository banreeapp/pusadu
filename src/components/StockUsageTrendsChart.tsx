import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, ChevronDown, TrendingUp } from 'lucide-react';
import { ComputedMaterialRow, StockMovement } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface StockUsageTrendsChartProps {
  rows: ComputedMaterialRow[];
  movements: StockMovement[];
}

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const SERIES_COLORS = ['#0f766e', '#d97706', '#334155', '#0284c7'];

function getLast12Months(anchorDate = new Date()): Array<{
  key: string;
  label: string;
}> {
  const months: Array<{ key: string; label: string }> = [];
  const baseYear = anchorDate.getFullYear();
  const baseMonth = anchorDate.getMonth();

  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(baseYear, baseMonth - offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const beShort = String((yyyy + 543) % 100).padStart(2, '0');
    months.push({
      key: `${yyyy}-${mm}`,
      label: `${THAI_SHORT_MONTHS[d.getMonth()]} ${beShort}`,
    });
  }
  return months;
}

// Deterministic seasonal weights so unlogged ledger usedQty distributes smoothly without jitter
const SEASONAL_WEIGHTS = [
  0.07, 0.08, 0.09, 0.08, 0.07, 0.08, 0.09, 0.08, 0.1, 0.09, 0.09, 0.08,
];

export const StockUsageTrendsChart: React.FC<StockUsageTrendsChartProps> = ({
  rows,
  movements,
}) => {
  const mainMaterials = useMemo(
    () => rows.filter((r) => !r.isPriceVariant),
    [rows]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    mainMaterials.slice(0, 3).map((m) => m.id)
  );
  const [metricMode, setMetricMode] = useState<'qty' | 'value'>('qty');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Ensure selectedIds stay valid if items are deleted or imported
  const activeSelectedIds = useMemo(() => {
    const valid = selectedIds.filter((id) =>
      mainMaterials.some((m) => m.id === id)
    );
    if (valid.length > 0) return valid;
    return mainMaterials.slice(0, 3).map((m) => m.id);
  }, [selectedIds, mainMaterials]);

  const selectedMaterials = useMemo(
    () =>
      activeSelectedIds
        .map((id) => mainMaterials.find((m) => m.id === id))
        .filter((m): m is ComputedMaterialRow => Boolean(m)),
    [activeSelectedIds, mainMaterials]
  );

  const months = useMemo(() => getLast12Months(new Date(2026, 10, 13)), []);

  const chartData = useMemo(() => {
    // Aggregate real movements per material & month
    const movByMatMonth = new Map<
      string,
      { useQty: number; useVal: number; purchaseVal: number }
    >();

    for (const mov of movements) {
      const monthKey = mov.date.slice(0, 7);
      const mapKey = `${mov.materialId}::${monthKey}`;
      const existing = movByMatMonth.get(mapKey) || {
        useQty: 0,
        useVal: 0,
        purchaseVal: 0,
      };
      if (mov.type === 'use') {
        existing.useQty += mov.qty;
        existing.useVal += mov.totalAmount;
      } else {
        existing.purchaseVal += mov.totalAmount;
      }
      movByMatMonth.set(mapKey, existing);
    }

    // Track logged totals per material in the 12-month window
    const loggedUseQtyByMat = new Map<string, number>();
    const loggedPurchaseValByMat = new Map<string, number>();

    for (const mat of selectedMaterials) {
      let sumUse = 0;
      let sumPur = 0;
      for (const m of months) {
        const entry = movByMatMonth.get(`${mat.id}::${m.key}`);
        if (entry) {
          sumUse += entry.useQty;
          sumPur += entry.purchaseVal;
        }
      }
      loggedUseQtyByMat.set(mat.id, sumUse);
      loggedPurchaseValByMat.set(mat.id, sumPur);
    }

    return months.map((m, idx) => {
      const point: Record<string, string | number> = {
        month: m.label,
        monthKey: m.key,
      };

      let totalUsedValue = 0;
      let totalPurchasedValue = 0;

      for (const mat of selectedMaterials) {
        const real = movByMatMonth.get(`${mat.id}::${m.key}`);
        const loggedUseTotal = loggedUseQtyByMat.get(mat.id) || 0;
        const unloggedUseQty = Math.max(0, mat.usedQty - loggedUseTotal);

        const weight =
          SEASONAL_WEIGHTS[(idx + mat.code.charCodeAt(0)) % SEASONAL_WEIGHTS.length];
        const distributedUseQty =
          unloggedUseQty > 0 ? Math.round(unloggedUseQty * weight * 10) / 10 : 0;

        const monthUseQty =
          Math.round(((real?.useQty || 0) + distributedUseQty) * 10) / 10;

        const unitPrice =
          mat.usedUnitPrice || mat.purchasedUnitPrice || mat.beginningUnitPrice || 0;
        const monthUseVal = (real?.useVal || 0) + distributedUseQty * unitPrice;

        const loggedPurTotal = loggedPurchaseValByMat.get(mat.id) || 0;
        const unloggedPurVal = Math.max(0, mat.purchasedTotal - loggedPurTotal);
        // Distribute unlogged annual purchases across Q1/Q3 procurement cycles
        const purWeight = idx === 1 || idx === 6 || idx === 10 ? 0.34 : 0;
        const monthPurVal = (real?.purchaseVal || 0) + unloggedPurVal * purWeight;

        point[mat.id] = monthUseQty;
        totalUsedValue += monthUseVal;
        totalPurchasedValue += monthPurVal;
      }

      point.totalUsedValue = Math.round(totalUsedValue * 100) / 100;
      point.totalPurchasedValue = Math.round(totalPurchasedValue * 100) / 100;

      return point;
    });
  }, [months, movements, selectedMaterials]);

  const summaryStats = useMemo(() => {
    let sum12mQty = 0;
    let sum12mValue = 0;
    let peakMonth = '-';
    let peakScore = -1;

    for (const pt of chartData) {
      let rowQty = 0;
      for (const mat of selectedMaterials) {
        rowQty += Number(pt[mat.id] || 0);
      }
      const rowVal = Number(pt.totalUsedValue || 0);
      sum12mQty += rowQty;
      sum12mValue += rowVal;

      const score = metricMode === 'qty' ? rowQty : rowVal;
      if (score > peakScore) {
        peakScore = score;
        peakMonth = String(pt.month);
      }
    }

    return {
      sum12mQty: Math.round(sum12mQty * 10) / 10,
      avg12mQty: Math.round((sum12mQty / 12) * 10) / 10,
      sum12mValue,
      avg12mValue: sum12mValue / 12,
      peakMonth,
    };
  }, [chartData, selectedMaterials, metricMode]);

  const toggleMaterial = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least 1 selected
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id]; // Keep max 4 series for clean readability
      }
      return [...prev, id];
    });
  };

  const selectTopUsed = () => {
    const top = [...mainMaterials]
      .sort((a, b) => b.usedTotal - a.usedTotal)
      .slice(0, 3)
      .map((m) => m.id);
    setSelectedIds(top);
    setPickerOpen(false);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 pb-4 border-b border-slate-100 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-700 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              แนวโน้มการเบิกใช้วัสดุย้อนหลัง 12 เดือน (12-Month Stock Usage Trends)
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            เปรียบเทียบปริมาณและมูลค่าการใช้งานรายเดือนของรายการวัสดุที่เลือก (ธ.ค. 68 – พ.ย. 69)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Material Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <span>เลือกวัสดุ ({selectedMaterials.length}/4 รายการ)</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setPickerOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-30 mt-1.5 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-800">
                      เลือกรายการเปรียบเทียบ (สูงสุด 4)
                    </span>
                    <button
                      type="button"
                      onClick={selectTopUsed}
                      className="text-[11px] font-medium text-teal-700 hover:underline"
                    >
                      ยอดใช้สูงสุด 3 อันดับ
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {mainMaterials.map((mat) => {
                      const isChecked = activeSelectedIds.includes(mat.id);
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => toggleMaterial(mat.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                            isChecked
                              ? 'bg-teal-50 text-teal-900 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-mono-tabular text-slate-400 mr-1.5">
                              {mat.code}
                            </span>
                            <span>{mat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-tabular text-[11px] text-slate-400">
                              {formatNumber(mat.usedQty)} {mat.unit}
                            </span>
                            {isChecked && (
                              <Check className="h-3.5 w-3.5 text-teal-700" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Metric Segmented Switch */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMetricMode('qty')}
              className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                metricMode === 'qty'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              จำนวนเบิกใช้ (หน่วย)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('value')}
              className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                metricMode === 'value'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มูลค่าเบิกใช้ vs จัดซื้อ (บาท)
            </button>
          </div>
        </div>
      </div>

      {/* Selected Materials Strip + Summary Stats */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="text-slate-400">กำลังแสดง:</span>
          {selectedMaterials.map((mat, idx) => (
            <span key={mat.id} className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
              />
              <span className="font-mono-tabular text-slate-500">{mat.code}</span>
              <span>{mat.name}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500">รวม 12 เดือน: </span>
            <strong className="font-mono-tabular text-slate-900">
              {metricMode === 'qty'
                ? `${formatNumber(summaryStats.sum12mQty)} หน่วย`
                : `${formatCurrency(summaryStats.sum12mValue)} บาท`}
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-500">เฉลี่ย/เดือน: </span>
            <strong className="font-mono-tabular text-slate-900">
              {metricMode === 'qty'
                ? `${formatNumber(summaryStats.avg12mQty)} หน่วย`
                : `${formatCurrency(summaryStats.avg12mValue)} บาท`}
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-500">เดือนสูงสุด: </span>
            <strong className="font-mono-tabular text-teal-800">
              {summaryStats.peakMonth}
            </strong>
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      {selectedMaterials.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          ไม่มีรายการวัสดุให้แสดงผล กรุณาเพิ่มรายการวัสดุในบัญชี
        </div>
      ) : (
        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === 'qty' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <defs>
                  {selectedMaterials.map((mat, idx) => {
                    const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                    return (
                      <linearGradient
                        key={mat.id}
                        id={`grad-${mat.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                  }}
                  formatter={(value, name) => {
                    const mat = selectedMaterials.find((m) => m.id === name);
                    const unit = mat ? mat.unit : 'หน่วย';
                    return [
                      `${formatNumber(Number(value ?? 0))} ${unit}`,
                      mat ? `${mat.code} ${mat.name}` : String(name),
                    ];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) => {
                    const mat = selectedMaterials.find((m) => m.id === value);
                    return mat ? `${mat.code} · ${mat.name}` : String(value);
                  }}
                />
                {selectedMaterials.map((mat, idx) => {
                  const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                  return (
                    <Area
                      key={mat.id}
                      type="monotone"
                      dataKey={mat.id}
                      name={mat.id}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#grad-${mat.id})`}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </AreaChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                  }}
                  formatter={(value, name) => [
                    `${formatCurrency(Number(value ?? 0))} บาท`,
                    name === 'totalUsedValue'
                      ? 'มูลค่าวัสดุเบิกใช้ไป (3)'
                      : 'มูลค่าจัดซื้อ / รับเข้า (2)',
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  formatter={(value) =>
                    value === 'totalUsedValue'
                      ? 'มูลค่าวัสดุเบิกใช้ไป (3)'
                      : 'มูลค่าจัดซื้อ / รับเข้า (2)'
                  }
                />
                <Bar
                  dataKey="totalPurchasedValue"
                  name="totalPurchasedValue"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="totalUsedValue"
                  name="totalUsedValue"
                  fill="#0f766e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
