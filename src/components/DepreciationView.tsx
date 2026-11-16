import React, { useMemo, useState } from 'react';
import { Calculator, CheckSquare, Square } from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  MaterialEntry,
} from '../types/inventory';
import {
  computeLedgerTotals,
  formatCurrency,
  generateDepreciationSchedule,
} from '../utils/calculations';

interface DepreciationViewProps {
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  onUpdateEntry: (updated: MaterialEntry) => void;
}

export const DepreciationView: React.FC<DepreciationViewProps> = ({
  agency,
  rows,
  onUpdateEntry,
}) => {
  const mainRows = rows.filter((r) => !r.isPriceVariant);
  const activeDepRows = mainRows.filter((r) => r.depreciation.enabled);
  const [selectedId, setSelectedId] = useState<string>(
    activeDepRows[0]?.id || mainRows[0]?.id || ''
  );

  const selectedRow =
    mainRows.find((r) => r.id === selectedId) || activeDepRows[0] || mainRows[0];

  const schedule = useMemo(() => {
    if (!selectedRow) return [];
    return generateDepreciationSchedule(selectedRow, agency.fiscalYearBE);
  }, [selectedRow, agency.fiscalYearBE]);

  const totals = computeLedgerTotals(activeDepRows);
  const totalCostBasis = activeDepRows.reduce(
    (s, r) => s + r.depreciationCostBasis,
    0
  );
  const totalAccumulated = activeDepRows.reduce(
    (s, r) => s + r.accumulatedDepreciation,
    0
  );

  const updateDepField = (
    row: ComputedMaterialRow,
    patch: Partial<MaterialEntry['depreciation']>
  ) => {
    const {
      beginningTotal: _bt,
      purchasedTotal: _pt,
      usedTotal: _ut,
      remainingQty: _rq,
      remainingTotal: _rt,
      stockStatus: _ss,
      suggestedRestockQty: _sr,
      depreciationCostBasis: _dc,
      annualDepreciation: _ad,
      depreciationRatePct: _dr,
      accumulatedDepreciation: _acd,
      netBookValue: _nbv,
      ...baseEntry
    } = row;

    onUpdateEntry({
      ...baseEntry,
      depreciation: {
        ...baseEntry.depreciation,
        ...patch,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Formula Banner + Totals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
            <Calculator className="h-4 w-4" />
            หลักการคำนวณค่าเสื่อมราคาแบบเส้นตรงรายปี (Straight-Line Method)
          </div>
          <div className="mt-2 font-mono-tabular text-sm font-semibold text-slate-900">
            ค่าเสื่อมราคาต่อปี = (ราคาทุนตั้งต้น - มูลค่าซาก) ÷ อายุการใช้งาน (ปี)
          </div>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            เลือกเปิดใช้งานการคิดค่าเสื่อมราคาสำหรับวัสดุคงทนหรือครุภัณฑ์ที่ต้องการติดตามมูลค่าตามบัญชีรายปี
            และปรับเปลี่ยนฐานราคาทุน มูลค่าซาก หรืออายุการใช้งานได้ทันที
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            ค่าเสื่อมราคาต่อปีรวม ({activeDepRows.length} รายการ)
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">
            {formatCurrency(totals.totalAnnualDepreciation)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท/ปี</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono-tabular">
            ทุนรวม {formatCurrency(totalCostBasis)} ฿
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">
            มูลค่าตามบัญชีสุทธิรวม (NBV)
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-teal-800">
            {formatCurrency(totals.totalNetBookValue)}
            <span className="ml-1.5 text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono-tabular">
            ค่าเสื่อมสะสมรวม {formatCurrency(totalAccumulated)} ฿
          </div>
        </div>
      </div>

      {/* Material Depreciation Config Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              ตารางตั้งค่าและคำนวณค่าเสื่อมราคาแบบเส้นตรงรายรายการ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่แถวเพื่อดูตารางค่าเสื่อมราคารายปีแบบเต็ม (ปีที่ 1 ถึงครบอายุการใช้งาน)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold">คิดค่าเสื่อม</th>
                <th className="px-3 py-3 text-left font-semibold">รหัส / รายการ</th>
                <th className="px-3 py-3 text-left font-semibold">ฐานราคาทุน</th>
                <th className="px-3 py-3 text-right font-semibold">ราคาทุน (บาท)</th>
                <th className="px-3 py-3 text-right font-semibold">มูลค่าซาก</th>
                <th className="px-3 py-3 text-right font-semibold">อายุ (ปี)</th>
                <th className="px-3 py-3 text-right font-semibold">ใช้แล้ว (ปี)</th>
                <th className="px-3 py-3 text-right font-semibold">ค่าเสื่อม/ปี</th>
                <th className="px-3 py-3 text-right font-semibold">ค่าเสื่อมสะสม</th>
                <th className="px-4 py-3 text-right font-semibold text-teal-900">
                  มูลค่าสุทธิ (NBV)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mainRows.map((row) => {
                const isSelected = selectedRow?.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td
                      className="px-4 py-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateDepField(row, { enabled: !row.depreciation.enabled });
                      }}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-teal-700"
                      >
                        {row.depreciation.enabled ? (
                          <CheckSquare className="h-4 w-4 text-teal-700" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-[11px]">
                          {row.depreciation.enabled ? 'คำนวณ' : 'ไม่คำนวณ'}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">
                        <span className="font-mono-tabular text-slate-500 mr-1.5">
                          {row.code}
                        </span>
                        {row.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{row.category}</div>
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={row.depreciation.costBasisMode}
                        disabled={!row.depreciation.enabled}
                        onChange={(e) =>
                          updateDepField(row, {
                            costBasisMode: e.target.value as
                              | 'ending'
                              | 'total_in'
                              | 'custom',
                          })
                        }
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="ending">คงเหลือ (4)</option>
                        <option value="total_in">รับเข้า (1)+(2)</option>
                        <option value="custom">กำหนดเอง</option>
                      </select>
                    </td>
                    <td
                      className="px-3 py-2.5 text-right font-mono-tabular"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.depreciation.costBasisMode === 'custom' &&
                      row.depreciation.enabled ? (
                        <input
                          type="number"
                          min={0}
                          value={row.depreciation.customCostBasis}
                          onChange={(e) =>
                            updateDepField(row, {
                              customCostBasis: Number(e.target.value) || 0,
                            })
                          }
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs font-mono-tabular"
                        />
                      ) : (
                        formatCurrency(row.depreciationCostBasis)
                      )}
                    </td>
                    <td
                      className="px-3 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        min={0}
                        disabled={!row.depreciation.enabled}
                        value={row.depreciation.salvageValue}
                        onChange={(e) =>
                          updateDepField(row, {
                            salvageValue: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-right text-xs font-mono-tabular disabled:opacity-50"
                      />
                    </td>
                    <td
                      className="px-3 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        min={1}
                        max={50}
                        disabled={!row.depreciation.enabled}
                        value={row.depreciation.usefulLifeYears}
                        onChange={(e) =>
                          updateDepField(row, {
                            usefulLifeYears: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-2 py-1 text-right text-xs font-mono-tabular disabled:opacity-50"
                      />
                    </td>
                    <td
                      className="px-3 py-2.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        min={0}
                        max={row.depreciation.usefulLifeYears}
                        disabled={!row.depreciation.enabled}
                        value={row.depreciation.elapsedYears}
                        onChange={(e) =>
                          updateDepField(row, {
                            elapsedYears: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-2 py-1 text-right text-xs font-mono-tabular disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-tabular font-semibold text-slate-900">
                      {row.depreciation.enabled
                        ? formatCurrency(row.annualDepreciation)
                        : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-tabular text-slate-600">
                      {row.depreciation.enabled
                        ? formatCurrency(row.accumulatedDepreciation)
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono-tabular font-bold text-teal-800">
                      {row.depreciation.enabled
                        ? formatCurrency(row.netBookValue)
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-by-Year Straight-Line Schedule for Selected Item */}
      {selectedRow && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  ตารางค่าเสื่อมราคารายปี: {selectedRow.code} · {selectedRow.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ราคาทุน {formatCurrency(selectedRow.depreciationCostBasis)} บาท ·
                  มูลค่าซาก {formatCurrency(selectedRow.depreciation.salvageValue)} บาท ·
                  อายุ {selectedRow.depreciation.usefulLifeYears} ปี
                </p>
              </div>
              {selectedRow.depreciation.enabled && (
                <span className="font-mono-tabular text-xs font-semibold text-teal-800">
                  อัตราเสื่อม {selectedRow.depreciationRatePct.toFixed(2)}% / ปี
                </span>
              )}
            </div>

            {!selectedRow.depreciation.enabled ? (
              <div className="py-10 text-center text-xs text-slate-500">
                รายการนี้ยังไม่ได้เปิดคำนวณค่าเสื่อมราคา กดช่อง "คิดค่าเสื่อม" ด้านบนเพื่อสร้างตารางรายปี
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 text-left font-medium">ปีที่</th>
                      <th className="py-2 pr-3 text-left font-medium">ปีงบประมาณ</th>
                      <th className="py-2 pr-3 text-right font-medium">มูลค่าต้นงวด</th>
                      <th className="py-2 pr-3 text-right font-medium">ค่าเสื่อมประจำปี</th>
                      <th className="py-2 pr-3 text-right font-medium">ค่าเสื่อมสะสม</th>
                      <th className="py-2 text-right font-semibold text-teal-900">
                        มูลค่าสุทธิปลายงวด
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedule.map((yr) => {
                      const isCurrentElapsed =
                        yr.yearIndex === selectedRow.depreciation.elapsedYears;
                      return (
                        <tr
                          key={yr.yearIndex}
                          className={isCurrentElapsed ? 'bg-teal-50/50 font-medium' : ''}
                        >
                          <td className="py-2 pr-3 font-mono-tabular text-slate-700">
                            ปีที่ {yr.yearIndex}
                          </td>
                          <td className="py-2 pr-3 text-slate-700">
                            {yr.fiscalYearLabel}
                            {isCurrentElapsed ? ' (ปัจจุบัน)' : ''}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono-tabular text-slate-600">
                            {formatCurrency(yr.openingBookValue)}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono-tabular text-slate-900">
                            {formatCurrency(yr.annualExpense)}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono-tabular text-slate-600">
                            {formatCurrency(yr.accumulatedDepreciation)}
                          </td>
                          <td className="py-2 text-right font-mono-tabular font-semibold text-teal-800">
                            {formatCurrency(yr.endingBookValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Straight-Line Book Value Curve Visual */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                กราฟเส้นตรงมูลค่าตามบัญชีสุทธิ (Net Book Value)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                แสดงมูลค่าลดลงคงที่ทุกปีจนถึงมูลค่าซาก
              </p>
            </div>

            {selectedRow.depreciation.enabled && schedule.length > 0 ? (
              <div className="mt-4">
                <div className="space-y-2.5">
                  {schedule.map((yr) => {
                    const maxVal = Math.max(1, selectedRow.depreciationCostBasis);
                    const widthPct = Math.round((yr.endingBookValue / maxVal) * 100);
                    return (
                      <div key={yr.yearIndex} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">
                            ปีที่ {yr.yearIndex} ({yr.fiscalYearLabel})
                          </span>
                          <span className="font-mono-tabular font-medium text-slate-900">
                            {formatCurrency(yr.endingBookValue)} ฿
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-600"
                            style={{ width: `${Math.max(widthPct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                กราฟจะแสดงเมื่อเปิดคำนวณค่าเสื่อมราคาสำหรับรายการที่เลือก
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
