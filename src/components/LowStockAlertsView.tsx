import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
} from 'lucide-react';
import { ComputedMaterialRow, MaterialEntry } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface LowStockAlertsViewProps {
  rows: ComputedMaterialRow[];
  onQuickRestock: (row: ComputedMaterialRow) => void;
  onUpdateThreshold: (entry: MaterialEntry, nextThreshold: number) => void;
}

export const LowStockAlertsView: React.FC<LowStockAlertsViewProps> = ({
  rows,
  onQuickRestock,
  onUpdateThreshold,
}) => {
  const [filter, setFilter] = useState<'alerts' | 'all'>('alerts');

  const mainRows = rows.filter((r) => !r.isPriceVariant);
  const outRows = mainRows.filter((r) => r.stockStatus === 'out');
  const lowRows = mainRows.filter((r) => r.stockStatus === 'low');
  const visibleRows =
    filter === 'alerts'
      ? [...outRows, ...lowRows]
      : [...outRows, ...lowRows, ...mainRows.filter((r) => r.stockStatus === 'normal')];

  const estimatedBudget = [...outRows, ...lowRows].reduce((sum, r) => {
    const unitPrice = r.purchasedUnitPrice || r.beginningUnitPrice || 0;
    return sum + r.suggestedRestockQty * unitPrice;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertCircle className="h-4 w-4" />
            วัสดุหมดสต็อก (คงเหลือ ≤ 0)
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {outRows.length}
            <span className="ml-1.5 text-xs font-normal text-slate-500">รายการ</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">ต้องจัดซื้อเติมคลังเร่งด่วน</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            วัสดุใกล้หมด (≤ เกณฑ์ขั้นต่ำ)
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {lowRows.length}
            <span className="ml-1.5 text-xs font-normal text-slate-500">รายการ</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ควรเตรียมขออนุมัติจัดซื้อรอบถัดไป
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            งบประมาณจัดซื้อทดแทนโดยประมาณ
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-teal-800">
            {formatCurrency(estimatedBudget)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            คำนวณจากจำนวนแนะนำ × ราคาต่อหน่วยล่าสุด
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              รายการติดตามเกณฑ์แจ้งเตือนวัสดุใกล้หมด
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สามารถปรับแก้ "เกณฑ์ขั้นต่ำ" ของแต่ละรายการได้ทันทีในตาราง
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilter('alerts')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                filter === 'alerts'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              เฉพาะรายการแจ้งเตือน ({outRows.length + lowRows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              แสดงทุกรายการ ({mainRows.length})
            </button>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
            <div className="mt-2 text-sm font-semibold text-slate-900">
              ไม่มีรายการวัสดุใกล้หมดหรือหมดสต็อก
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ทุกรายการมีจำนวนคงเหลือสูงกว่าเกณฑ์ขั้นต่ำที่กำหนดไว้
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-left font-semibold">รหัส</th>
                  <th className="px-3 py-3 text-left font-semibold">รายการวัสดุ</th>
                  <th className="px-3 py-3 text-left font-semibold">หมวดหมู่</th>
                  <th className="px-3 py-3 text-right font-semibold">คงเหลือ</th>
                  <th className="px-3 py-3 text-right font-semibold">เกณฑ์ขั้นต่ำ</th>
                  <th className="px-3 py-3 text-left font-semibold">สถานะ</th>
                  <th className="px-3 py-3 text-right font-semibold">แนะนำจัดซื้อ</th>
                  <th className="px-4 py-3 text-right font-semibold">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const isOut = row.stockStatus === 'out';
                  const isLow = row.stockStatus === 'low';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono-tabular font-medium text-slate-700">
                        {row.code}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {row.name}
                      </td>
                      <td className="px-3 py-3 text-slate-500">{row.category}</td>
                      <td className="px-3 py-3 text-right font-mono-tabular font-semibold text-slate-900">
                        {formatNumber(row.remainingQty)} {row.unit}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={row.minThreshold}
                          onChange={(e) =>
                            onUpdateThreshold(
                              row,
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-right font-mono-tabular text-xs"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            หมดสต็อก
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            ใกล้หมด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            ปกติ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-tabular text-slate-700">
                        {row.suggestedRestockQty > 0
                          ? `${formatNumber(row.suggestedRestockQty)} ${row.unit}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onQuickRestock(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 whitespace-nowrap"
                        >
                          <PackagePlus className="h-3.5 w-3.5 text-teal-700" />
                          บันทึกจัดซื้อเพิ่ม
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
