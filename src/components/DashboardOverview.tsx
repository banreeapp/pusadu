import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  PackagePlus,
  Settings2,
} from 'lucide-react';
import {
  AgencyProfile,
  AppView,
  ComputedMaterialRow,
  MaterialCategory,
  StockMovement,
} from '../types/inventory';
import {
  computeLedgerTotals,
  formatCurrency,
  formatNumber,
  groupTotalsByCategory,
} from '../utils/calculations';
import { StockUsageTrendsChart } from './StockUsageTrendsChart';

interface DashboardOverviewProps {
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  categories: string[];
  movements: StockMovement[];
  onNavigate: (view: AppView) => void;
  onSelectCategory: (category: MaterialCategory | 'all') => void;
  onQuickRestock: (row: ComputedMaterialRow) => void;
  onOpenCategorySettings: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  agency,
  rows,
  categories,
  movements,
  onNavigate,
  onSelectCategory,
  onQuickRestock,
  onOpenCategorySettings,
}) => {
  const totals = computeLedgerTotals(rows);
  const categoryBreakdown = groupTotalsByCategory(rows, categories);
  const maxCategoryValue = Math.max(
    1,
    ...categoryBreakdown.map((c) => c.remainingTotal)
  );

  const alertRows = rows
    .filter((r) => !r.isPriceVariant && (r.stockStatus === 'out' || r.stockStatus === 'low'))
    .sort((a, b) => a.remainingQty - b.remainingQty);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            มูลค่าวัสดุคงเหลือสุทธิ (4)
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {formatCurrency(totals.remainingTotal)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>จาก {totals.itemCount} รายการหลัก</span>
            <span className="mx-1.5">·</span>
            <span>พ.ศ. {agency.fiscalYearBE}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            ยอดจัดซื้อและใช้ไประหว่างปี
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {formatCurrency(totals.purchasedTotal)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>เบิกใช้ไป</span>{' '}
            <span className="font-mono-tabular font-medium text-slate-700">
              {formatCurrency(totals.usedTotal)} ฿
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            ค่าเสื่อมราคาเส้นตรงต่อปี
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {formatCurrency(totals.totalAnnualDepreciation)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท/ปี</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>มูลค่าสุทธิตามบัญชี</span>{' '}
            <span className="font-mono-tabular font-medium text-slate-700">
              {formatCurrency(totals.totalNetBookValue)} ฿
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            สถานะแจ้งเตือนสต็อกวัสดุ
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-mono-tabular text-2xl font-bold ${
                totals.outOfStockCount > 0
                  ? 'text-red-600'
                  : totals.lowStockCount > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {totals.outOfStockCount + totals.lowStockCount}
            </span>
            <span className="text-xs text-slate-500">รายการต้องดำเนินการ</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              หมดสต็อก {totals.outOfStockCount}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              ใกล้หมด {totals.lowStockCount}
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown + Low Stock Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                สรุปมูลค่าวัสดุคงเหลือแยกตามประเภท ({categoryBreakdown.length} หมวดหมู่)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่หมวดหมู่เพื่อเปิดดูบัญชีรายงานวัสดุประจำปีของหมวดนั้น
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenCategorySettings}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Settings2 className="h-3.5 w-3.5" />
                ตั้งค่าประเภทวัสดุ
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  onNavigate('ledger');
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
              >
                ดูบัญชีทั้งหมด
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            {categoryBreakdown.map((cat) => {
              const pct = Math.round((cat.remainingTotal / maxCategoryValue) * 100);
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.category);
                    onNavigate('ledger');
                  }}
                  className="w-full text-left group rounded-lg p-2 -mx-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-800 group-hover:text-teal-700 truncate">
                        {cat.category}
                      </span>
                      <span className="text-slate-400 shrink-0">
                        · {cat.itemCount} รายการ
                      </span>
                    </div>
                    <div className="font-mono-tabular font-semibold text-slate-900 shrink-0">
                      {formatCurrency(cat.remainingTotal)} บาท
                    </div>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all"
                      style={{ width: `${Math.max(pct, cat.remainingTotal > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
                    <span>ยกมา {formatCurrency(cat.beginningTotal)}</span>
                    <span>จัดซื้อ {formatCurrency(cat.purchasedTotal)}</span>
                    <span>ใช้ไป {formatCurrency(cat.usedTotal)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                รายการแจ้งเตือนวัสดุใกล้หมด / หมดสต็อก
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบวัสดุที่ต่ำกว่าเกณฑ์ขั้นต่ำเพื่อวางแผนจัดซื้อ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              ดูทั้งหมด
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {alertRows.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div className="mt-2 text-sm font-medium text-slate-900">
                วัสดุทุกรายการอยู่ในเกณฑ์ปกติ
              </div>
              <div className="mt-1 text-xs text-slate-500">
                ไม่มีรายการที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำในขณะนี้
              </div>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {alertRows.slice(0, 5).map((item) => {
                const isOut = item.stockStatus === 'out';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono-tabular font-semibold text-slate-700">
                          {item.code}
                        </span>
                        <span className="truncate font-medium text-slate-900">
                          {item.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isOut ? 'text-red-600' : 'text-amber-600'
                          }`}
                        >
                          {isOut ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {isOut ? 'หมดสต็อก' : 'ใกล้หมด'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono-tabular text-slate-600">
                          เหลือ {formatNumber(item.remainingQty)} / ขั้นต่ำ{' '}
                          {formatNumber(item.minThreshold)} {item.unit}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickRestock(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <PackagePlus className="h-3.5 w-3.5 text-teal-700" />
                      จัดซื้อเพิ่ม
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 12-Month Stock Usage Trends Chart (Recharts) */}
      <StockUsageTrendsChart rows={rows} movements={movements} />

      {/* Recent Stock Movements */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            ประวัติความเคลื่อนไหวรับเข้าและเบิกใช้ล่าสุด
          </h2>
          <span className="text-xs text-slate-500">
            แสดง {Math.min(movements.length, 6)} รายการล่าสุด
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            ยังไม่มีประวัติการเคลื่อนไหววัสดุในรอบบัญชีนี้
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">วันที่</th>
                  <th className="py-2.5 pr-4 font-medium">รหัส / รายการ</th>
                  <th className="py-2.5 pr-4 font-medium">ประเภท</th>
                  <th className="py-2.5 pr-4 font-medium text-right">จำนวน</th>
                  <th className="py-2.5 pr-4 font-medium text-right">มูลค่ารวม (บาท)</th>
                  <th className="py-2.5 font-medium">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.slice(0, 6).map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {mov.date}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      <span className="font-mono-tabular text-slate-500 mr-2">
                        {mov.materialCode}
                      </span>
                      {mov.materialName}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {mov.type === 'purchase' ? (
                        <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          รับเข้า / จัดซื้อ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          เบิกใช้ไป
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono-tabular text-slate-800">
                      {formatNumber(mov.qty)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono-tabular font-medium text-slate-900">
                      {formatCurrency(mov.totalAmount)}
                    </td>
                    <td className="py-2.5 text-slate-500">{mov.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
