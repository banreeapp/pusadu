import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  MaterialCategory,
  MaterialEntry,
} from '../types/inventory';
import {
  computeLedgerTotals,
  formatCurrency,
  formatNumber,
  getBeginningDateLabel,
} from '../utils/calculations';

interface MaterialLedgerTableProps {
  agency: AgencyProfile;
  onUpdateAgency: (next: AgencyProfile) => void;
  rows: ComputedMaterialRow[];
  categories: string[];
  selectedCategory: MaterialCategory | 'all';
  onSelectCategory: (cat: MaterialCategory | 'all') => void;
  onOpenCategorySettings: () => void;
  onAddMaterial: () => void;
  onAddVariant: (parent: MaterialEntry) => void;
  onEditMaterial: (entry: MaterialEntry) => void;
  onDeleteMaterial: (entry: MaterialEntry) => void;
  onRecordMovement: (row: ComputedMaterialRow) => void;
}

export const MaterialLedgerTable: React.FC<MaterialLedgerTableProps> = ({
  agency,
  onUpdateAgency,
  rows,
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenCategorySettings,
  onAddMaterial,
  onAddVariant,
  onEditMaterial,
  onDeleteMaterial,
  onRecordMovement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'normal'>('all');
  const [editingHeader, setEditingHeader] = useState(false);

  const filteredRows = rows.filter((row) => {
    const matchesCategory =
      selectedCategory === 'all' || row.category === selectedCategory;

    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      row.code.toLowerCase().includes(q) ||
      row.name.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'alert' &&
        !row.isPriceVariant &&
        (row.stockStatus === 'out' || row.stockStatus === 'low')) ||
      (statusFilter === 'normal' && row.stockStatus === 'normal');

    return matchesCategory && matchesQuery && matchesStatus;
  });

  const totals = computeLedgerTotals(filteredRows);
  const begDateLabel = getBeginningDateLabel(agency.fiscalYearBE);

  return (
    <div className="space-y-4">
      {/* Official Form Header Card (เอกสารหมายเลข 1) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {agency.documentNumber}
              </span>
              <span>·</span>
              <span>ประจำปีงบประมาณ พ.ศ. {agency.fiscalYearBE}</span>
              <span>·</span>
              <span>ยอดยกมา ณ {begDateLabel}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              แบบบัญชีรายงานวัสดุประจำปี
            </h2>
            <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
              <span>
                ชื่อหน่วยงาน:{' '}
                <strong className="font-medium text-slate-900">
                  {agency.agencyName}
                </strong>
              </span>
              <span>
                รหัสศูนย์ต้นทุน:{' '}
                <strong className="font-mono-tabular font-medium text-slate-900">
                  {agency.costCenterCode}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingHeader((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {editingHeader ? 'เสร็จสิ้นการตั้งค่าหัวเอกสาร' : 'แก้ไขข้อมูลหน่วยงาน / ปีงบประมาณ'}
          </button>
        </div>

        {editingHeader && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อหน่วยงาน
              </label>
              <input
                type="text"
                value={agency.agencyName}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, agencyName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสศูนย์ต้นทุน
              </label>
              <input
                type="text"
                value={agency.costCenterCode}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, costCenterCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ปีงบประมาณ พ.ศ.
              </label>
              <input
                type="number"
                min={2560}
                max={2600}
                value={agency.fiscalYearBE}
                onChange={(e) =>
                  onUpdateAgency({
                    ...agency,
                    fiscalYearBE: Number(e.target.value) || 2569,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้จัดทำรายงาน (สำหรับ PDF)
              </label>
              <input
                type="text"
                value={agency.preparerName}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, preparerName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้ตรวจสอบ (สำหรับ PDF)
              </label>
              <input
                type="text"
                value={agency.reviewerName}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, reviewerName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้อนุมัติ / หัวหน้าหน่วยงาน (สำหรับ PDF)
              </label>
              <input
                type="text"
                value={agency.approverName}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, approverName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Tabs + Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({rows.filter((r) => !r.isPriceVariant).length})
            </button>
            {categories.map((cat) => {
              const count = rows.filter(
                (r) => r.category === cat && !r.isPriceVariant
              ).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenCategorySettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Settings2 className="h-3.5 w-3.5 text-teal-700" />
            ตั้งค่าประเภทวัสดุ
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วยรหัสวัสดุ หรือชื่อรายการ..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                ทุกสถานะ
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('alert')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  statusFilter === 'alert'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                ใกล้หมด / หมด
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('normal')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  statusFilter === 'normal'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                ปกติ
              </button>
            </div>

            <button
              type="button"
              onClick={onAddMaterial}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              เพิ่มรายการวัสดุ
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table matching เอกสารหมายเลข 1 */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-sm font-semibold text-slate-900">
              ไม่พบรายการวัสดุที่ตรงกับเงื่อนไข
            </div>
            <p className="mt-1 text-xs text-slate-500">
              ลองเปลี่ยนคำค้นหา เลือกหมวดหมู่อื่น หรือเพิ่มรายการวัสดุใหม่เข้าสู่บัญชี
            </p>
            <button
              type="button"
              onClick={onAddMaterial}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" />
              เพิ่มรายการแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th
                    rowSpan={2}
                    className="border-r border-slate-200 px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                  >
                    รหัสวัสดุ
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-slate-200 px-3 py-2.5 text-left font-semibold min-w-[200px]"
                  >
                    รายการ / หมวดหมู่
                  </th>
                  <th
                    colSpan={3}
                    className="border-r border-slate-200 px-2 py-2 text-center font-semibold bg-slate-100/70"
                  >
                    (1) ยอดคงเหลือยกมา {begDateLabel}
                  </th>
                  <th
                    colSpan={3}
                    className="border-r border-slate-200 px-2 py-2 text-center font-semibold"
                  >
                    (2) จัดซื้อ / รับจากกรม
                  </th>
                  <th
                    colSpan={3}
                    className="border-r border-slate-200 px-2 py-2 text-center font-semibold bg-slate-100/70"
                  >
                    (3) วัสดุใช้ไป
                  </th>
                  <th
                    colSpan={2}
                    className="border-r border-slate-200 px-2 py-2 text-center font-semibold bg-teal-50/60 text-teal-900"
                  >
                    (4) คงเหลือสิ้นปี
                  </th>
                  <th
                    rowSpan={2}
                    className="px-3 py-2.5 text-center font-semibold whitespace-nowrap"
                  >
                    สถานะ / จัดการ
                  </th>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] text-slate-500">
                  <th className="px-2.5 py-1.5 text-right font-medium">จำนวน</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">ต่อหน่วย</th>
                  <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-700">
                    ราคารวม (1)
                  </th>
                  <th className="px-2.5 py-1.5 text-right font-medium">จำนวน</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">ต่อหน่วย</th>
                  <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-700">
                    ราคารวม (2)
                  </th>
                  <th className="px-2.5 py-1.5 text-right font-medium">จำนวน</th>
                  <th className="px-2.5 py-1.5 text-right font-medium">ต่อหน่วย</th>
                  <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-semibold text-slate-700">
                    ราคารวม (3)
                  </th>
                  <th className="px-2.5 py-1.5 text-right font-medium bg-teal-50/40">
                    คงเหลือ
                  </th>
                  <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-semibold text-teal-900 bg-teal-50/40">
                    ราคารวม (4)
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const isVariant = Boolean(row.isPriceVariant);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isVariant ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      <td className="border-r border-slate-100 px-3 py-2.5 font-mono-tabular font-medium text-slate-700 whitespace-nowrap">
                        {isVariant ? '' : row.code}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5">
                        <div
                          className={`font-medium ${
                            isVariant ? 'pl-3 text-slate-600 italic' : 'text-slate-900'
                          }`}
                        >
                          {row.name}
                        </div>
                        {!isVariant && (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {row.category} · หน่วย: {row.unit}
                          </div>
                        )}
                      </td>

                      {/* (1) ยกมา */}
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatNumber(row.beginningQty, true)}
                        {row.beginningQty > 0 ? ` ${row.unit}` : ''}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-500">
                        {formatCurrency(row.beginningUnitPrice, true)}
                      </td>
                      <td className="border-r border-slate-100 px-2.5 py-2.5 text-right font-mono-tabular font-medium text-slate-800">
                        {formatCurrency(row.beginningTotal, true)}
                      </td>

                      {/* (2) จัดซื้อ */}
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatNumber(row.purchasedQty, true)}
                        {row.purchasedQty > 0 ? ` ${row.unit}` : ''}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-500">
                        {formatCurrency(row.purchasedUnitPrice, true)}
                      </td>
                      <td className="border-r border-slate-100 px-2.5 py-2.5 text-right font-mono-tabular font-medium text-slate-800">
                        {formatCurrency(row.purchasedTotal, true)}
                      </td>

                      {/* (3) ใช้ไป */}
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatNumber(row.usedQty, true)}
                        {row.usedQty > 0 ? ` ${row.unit}` : ''}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular text-slate-500">
                        {formatCurrency(row.usedUnitPrice, true)}
                      </td>
                      <td className="border-r border-slate-100 px-2.5 py-2.5 text-right font-mono-tabular font-medium text-slate-800">
                        {formatCurrency(row.usedTotal, true)}
                      </td>

                      {/* (4) คงเหลือ */}
                      <td className="px-2.5 py-2.5 text-right font-mono-tabular font-semibold text-slate-900 bg-teal-50/20 whitespace-nowrap">
                        {formatNumber(row.remainingQty, true)}
                        {row.remainingQty !== 0 ? ` ${row.unit}` : ''}
                      </td>
                      <td className="border-r border-slate-100 px-2.5 py-2.5 text-right font-mono-tabular font-bold text-teal-900 bg-teal-50/20">
                        {formatCurrency(row.remainingTotal, true)}
                      </td>

                      {/* Status & Actions */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isVariant && (
                            <span
                              className={`mr-1.5 inline-flex items-center gap-1 text-[11px] font-medium ${
                                row.stockStatus === 'out'
                                  ? 'text-red-600'
                                  : row.stockStatus === 'low'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                              title={
                                row.stockStatus === 'out'
                                  ? 'หมดสต็อก'
                                  : row.stockStatus === 'low'
                                  ? `ใกล้หมด (ขั้นต่ำ ${row.minThreshold})`
                                  : 'สต็อกปกติ'
                              }
                            >
                              {row.stockStatus === 'out' ? (
                                <AlertCircle className="h-3.5 w-3.5" />
                              ) : row.stockStatus === 'low' ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              {row.stockStatus === 'out'
                                ? 'หมด'
                                : row.stockStatus === 'low'
                                ? 'ใกล้หมด'
                                : 'ปกติ'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onRecordMovement(row)}
                            title="บันทึกจัดซื้อ/เบิกใช้"
                            className="rounded p-1 text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>

                          {!isVariant && (
                            <button
                              type="button"
                              onClick={() => onAddVariant(row)}
                              title="เพิ่มล็อตต่างราคา"
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onEditMaterial(row)}
                            title="แก้ไขรายการ"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteMaterial(row)}
                            title="ลบรายการ"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td colSpan={2} className="border-r border-slate-200 px-3 py-3 text-right">
                    ยอดรวมสุทธิ (เฉพาะยอดเงิน)
                  </td>
                  <td colSpan={2} className="px-2.5 py-3" />
                  <td className="border-r border-slate-200 px-2.5 py-3 text-right font-mono-tabular">
                    {formatCurrency(totals.beginningTotal)}
                  </td>
                  <td colSpan={2} className="px-2.5 py-3" />
                  <td className="border-r border-slate-200 px-2.5 py-3 text-right font-mono-tabular">
                    {formatCurrency(totals.purchasedTotal)}
                  </td>
                  <td colSpan={2} className="px-2.5 py-3" />
                  <td className="border-r border-slate-200 px-2.5 py-3 text-right font-mono-tabular">
                    {formatCurrency(totals.usedTotal)}
                  </td>
                  <td className="px-2.5 py-3 bg-teal-50/50" />
                  <td className="border-r border-slate-200 px-2.5 py-3 text-right font-mono-tabular text-teal-900 bg-teal-50/50">
                    {formatCurrency(totals.remainingTotal)}
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] font-normal text-slate-500">
                    บาท
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 space-y-1">
          <div>1. แบบบัญชีวัสดุประจำปี ช่องรวมบรรทัดสุดท้ายคิดเฉพาะยอดเงินเท่านั้น</div>
          <div>
            2. วิธีการคิดยอดรวมราคาคงเหลือ: (1) ยอดยกมา + (2) ยอดจัดซื้อหรือรับจากกรม - (3) ยอดจ่ายไป = (4) ยอดคงเหลือประจำปีงบประมาณ
          </div>
        </div>
      </div>
    </div>
  );
};
