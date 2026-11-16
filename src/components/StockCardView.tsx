import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Edit3,
  FileDown,
  Printer,
  Save,
  Search,
  X,
} from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  MaterialEntry,
  RequisitionVoucher,
  StockMovement,
} from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { exportStockCardToExcel } from '../utils/exportExcel';
import { buildStockCardRows, StockCardRow } from '../utils/stockCard';

interface StockCardViewProps {
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  categories: string[];
  movements: StockMovement[];
  requisitions: RequisitionVoucher[];
  selectedMaterialId: string;
  onSelectMaterial: (id: string) => void;
  onUpdateMaterialMeta: (updated: MaterialEntry) => void;
  onRecordMovement: (row: ComputedMaterialRow) => void;
  onPrintStockCard: () => void;
}

export const PrintableStockCardDocument: React.FC<{
  material: ComputedMaterialRow;
  cardRows: StockCardRow[];
  agency: AgencyProfile;
}> = ({ material, cardRows, agency }) => {
  const minRows = 16;
  const blankRowCount = Math.max(0, minRows - cardRows.length);

  return (
    <div className="bg-white text-slate-900 text-xs">
      {/* Top 3-row metadata block matching official บัญชีวัสดุ form */}
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
        <span className="font-semibold text-slate-900 text-sm">บัญชีวัสดุ</span>
        <span>
          {agency.agencyName} · ปีงบประมาณ พ.ศ. {agency.fiscalYearBE}
        </span>
      </div>

      <div className="border border-b-0 border-slate-900 text-xs">
        <div className="grid grid-cols-12 border-b border-slate-300">
          <div className="col-span-2 border-r border-slate-300 px-2.5 py-1.5 font-semibold text-right bg-slate-50/70">
            ประเภท
          </div>
          <div className="col-span-3 border-r border-slate-300 px-2.5 py-1.5 text-slate-900">
            {material.category}
          </div>
          <div className="col-span-2 border-r border-slate-300 px-2.5 py-1.5 font-semibold text-right bg-slate-50/70">
            ชื่อหรือชนิดวัสดุ
          </div>
          <div className="col-span-3 border-r border-slate-300 px-2.5 py-1.5 font-medium text-slate-900">
            {material.name}
          </div>
          <div className="col-span-1 border-r border-slate-300 px-2 py-1.5 font-semibold text-right bg-slate-50/70">
            รหัส
          </div>
          <div className="col-span-1 px-2 py-1.5 font-mono-tabular font-semibold text-center text-slate-900">
            {material.code}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-slate-300">
          <div className="col-span-2 border-r border-slate-300 px-2.5 py-1.5 font-semibold text-right bg-slate-50/70">
            ขนาดหรือลักษณะ
          </div>
          <div className="col-span-8 border-r border-slate-300 px-2.5 py-1.5 text-slate-800">
            {material.specification || material.note || '-'}
          </div>
          <div className="col-span-1 border-r border-slate-300 px-1.5 py-1.5 font-semibold text-right bg-slate-50/70 whitespace-nowrap">
            จำนวนอย่างสูง
          </div>
          <div className="col-span-1 px-2 py-1.5 font-mono-tabular text-center text-slate-900">
            {material.maxThreshold && material.maxThreshold > 0
              ? formatNumber(material.maxThreshold)
              : '-'}
          </div>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-2 border-r border-slate-300 px-2.5 py-1.5 font-semibold text-right bg-slate-50/70">
            หน่วยที่นับ
          </div>
          <div className="col-span-8 border-r border-slate-300 px-2.5 py-1.5 text-slate-900">
            {material.unit}
          </div>
          <div className="col-span-1 border-r border-slate-300 px-1.5 py-1.5 font-semibold text-right bg-slate-50/70 whitespace-nowrap">
            จำนวนอย่างต่ำ
          </div>
          <div className="col-span-1 px-2 py-1.5 font-mono-tabular text-center text-slate-900">
            {formatNumber(material.minThreshold)}
          </div>
        </div>
      </div>

      {/* Main Stock Card Table */}
      <table className="print-table w-full border-collapse border border-slate-900 text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-24"
            >
              วัน/เดือน/ปี
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2.5 py-1.5 text-center font-semibold min-w-[150px]"
            >
              รับจาก/จ่ายให้
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-24"
            >
              เลขที่เอกสาร
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-24"
            >
              ราคาต่อหน่วย
              <br />
              (บาท)
            </th>
            <th
              colSpan={3}
              className="border border-slate-900 px-2 py-1 text-center font-semibold"
            >
              จำนวน
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-24"
            >
              ราคารวม
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2.5 py-1.5 text-center font-semibold min-w-[120px]"
            >
              หมายเหตุ
            </th>
          </tr>
          <tr className="bg-slate-50">
            <th className="border border-slate-900 px-2 py-1 text-center font-medium w-16">
              รับ
            </th>
            <th className="border border-slate-900 px-2 py-1 text-center font-medium w-16">
              จ่าย
            </th>
            <th className="border border-slate-900 px-2 py-1 text-center font-medium w-18">
              คงเหลือ
            </th>
          </tr>
        </thead>
        <tbody>
          {cardRows.map((row) => (
            <tr key={row.id}>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-center font-mono-tabular">
                {row.dateDisplay}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2.5 py-1.5 text-slate-900">
                {row.counterparty}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-center font-mono-tabular">
                {row.docNo}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-right font-mono-tabular">
                {formatCurrency(row.unitPrice)}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-right font-mono-tabular text-teal-800">
                {row.receivedQty !== null ? formatNumber(row.receivedQty) : ''}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-right font-mono-tabular text-slate-800">
                {row.issuedQty !== null ? formatNumber(row.issuedQty) : ''}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-right font-mono-tabular font-semibold text-slate-900">
                {formatNumber(row.balanceQty)}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-1.5 text-right font-mono-tabular">
                {formatCurrency(row.totalAmount)}
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2.5 py-1.5 text-slate-700">
                {row.note}
              </td>
            </tr>
          ))}
          {Array.from({ length: blankRowCount }).map((_, idx) => (
            <tr key={`sc-blank-${idx}`}>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5">
                &nbsp;
              </td>
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
              <td className="border-x border-b border-dotted border-slate-900 px-2 py-2.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const StockCardView: React.FC<StockCardViewProps> = ({
  agency,
  rows,
  categories,
  movements,
  requisitions,
  selectedMaterialId,
  onSelectMaterial,
  onUpdateMaterialMeta,
  onRecordMovement,
  onPrintStockCard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingMeta, setEditingMeta] = useState(false);
  const [specInput, setSpecInput] = useState('');
  const [maxInput, setMaxInput] = useState<string>('');
  const [minInput, setMinInput] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const mainMaterials = useMemo(
    () => rows.filter((r) => !r.isPriceVariant),
    [rows]
  );

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mainMaterials.filter((m) => {
      const matchCat =
        filterCategory === 'all' || m.category === filterCategory;
      const matchQ =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [mainMaterials, searchQuery, filterCategory]);

  const activeMaterial =
    mainMaterials.find((m) => m.id === selectedMaterialId) ||
    filteredMaterials[0] ||
    mainMaterials[0] ||
    null;

  const cardRows = useMemo(() => {
    if (!activeMaterial) return [];
    return buildStockCardRows(activeMaterial, movements, requisitions, agency);
  }, [activeMaterial, movements, requisitions, agency]);

  const handleStartEditMeta = () => {
    if (!activeMaterial) return;
    setSpecInput(activeMaterial.specification || activeMaterial.note || '');
    setMaxInput(
      activeMaterial.maxThreshold && activeMaterial.maxThreshold > 0
        ? String(activeMaterial.maxThreshold)
        : ''
    );
    setMinInput(String(activeMaterial.minThreshold));
    setEditingMeta(true);
  };

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMaterial) return;
    const parsedMax = Number(maxInput);
    const parsedMin = Number(minInput);
    onUpdateMaterialMeta({
      ...activeMaterial,
      specification: specInput.trim(),
      maxThreshold: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 0,
      minThreshold: Number.isFinite(parsedMin) && parsedMin >= 0 ? parsedMin : activeMaterial.minThreshold,
      updatedAt: new Date().toISOString(),
    });
    setEditingMeta(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Material Selector List */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="border-b border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                เลือกวัสดุ ({filteredMaterials.length} รายการ)
              </h2>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="all">ทุกประเภทวัสดุ</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัส หรือชื่อวัสดุ..."
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                ไม่พบรายการวัสดุที่ตรงกับเงื่อนไข
              </div>
            ) : (
              filteredMaterials.map((m) => {
                const isSelected = activeMaterial?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMaterial(m.id);
                      setEditingMeta(false);
                    }}
                    className={`w-full text-left p-3.5 transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-slate-900">
                        รหัส {m.code}
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-teal-800">
                        คงเหลือ {formatNumber(m.remainingQty)} {m.unit}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800 truncate">
                      {m.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {m.category}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Stock Card View & Actions */}
        <div className="lg:col-span-8 space-y-4">
          {!activeMaterial ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              กรุณาเพิ่มรายการวัสดุในระบบเพื่อแสดงรายงานบัญชีวัสดุ
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    บัญชีวัสดุ: {activeMaterial.code} · {activeMaterial.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    คงเหลือปัจจุบัน{' '}
                    <span className="font-mono-tabular font-semibold text-teal-800">
                      {formatNumber(activeMaterial.remainingQty)} {activeMaterial.unit}
                    </span>{' '}
                    · มูลค่าคงเหลือ{' '}
                    <span className="font-mono-tabular font-medium text-slate-800">
                      {formatCurrency(activeMaterial.remainingTotal)} บาท
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRecordMovement(activeMaterial)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <ArrowDownUp className="h-3.5 w-3.5 text-teal-700" />
                    บันทึก รับ/จ่าย
                  </button>

                  <button
                    type="button"
                    onClick={handleStartEditMeta}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    แก้ไขรายละเอียด
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportStockCardToExcel(activeMaterial, cardRows, agency)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <FileDown className="h-3.5 w-3.5 text-emerald-700" />
                    ส่งออก Excel
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    พิมพ์ / ส่งออก PDF
                  </button>
                </div>
              </div>

              {editingMeta && (
                <form
                  onSubmit={handleSaveMeta}
                  className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-900">
                      แก้ไขรายละเอียดหัวบัญชีวัสดุ ({activeMaterial.code})
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMeta(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      ยกเลิก
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        ขนาดหรือลักษณะ
                      </label>
                      <input
                        type="text"
                        value={specInput}
                        onChange={(e) => setSpecInput(e.target.value)}
                        placeholder="เช่น ขนาดมาตรฐาน 80 แกรม หรือ สีดำ"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        จำนวนอย่างสูง ({activeMaterial.unit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={maxInput}
                        onChange={(e) => setMaxInput(e.target.value)}
                        placeholder="ไม่ระบุ"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        จำนวนอย่างต่ำ ({activeMaterial.unit})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                    >
                      <Save className="h-3.5 w-3.5" />
                      บันทึกรายละเอียด
                    </button>
                  </div>
                </form>
              )}

              {/* Official Stock Card Sheet Preview */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 overflow-x-auto">
                <div className="min-w-[760px]">
                  <PrintableStockCardDocument
                    material={activeMaterial}
                    cardRows={cardRows}
                    agency={agency}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {previewOpen && activeMaterial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ตัวอย่างรายงานบัญชีวัสดุ: {activeMaterial.code} · {activeMaterial.name}
                </h3>
                <p className="text-xs text-slate-500">
                  กดปุ่ม "พิมพ์ / บันทึกเป็น PDF" เพื่อสั่งพิมพ์หรือบันทึกไฟล์ PDF ทันที
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    onPrintStockCard();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์ / บันทึกเป็น PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="ปิดตัวอย่าง"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-6">
              <div className="mx-auto min-w-[800px] max-w-[960px] rounded-lg border border-slate-300 bg-white p-8 shadow-sm">
                <PrintableStockCardDocument
                  material={activeMaterial}
                  cardRows={cardRows}
                  agency={agency}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
