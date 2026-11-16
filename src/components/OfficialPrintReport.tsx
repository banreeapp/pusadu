import React from 'react';
import { Printer, X } from 'lucide-react';
import { AgencyProfile, ComputedMaterialRow, MaterialCategory } from '../types/inventory';
import {
  computeLedgerTotals,
  formatCurrency,
  formatNumber,
  getBeginningDateLabel,
} from '../utils/calculations';

interface OfficialPrintReportProps {
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  categories: string[];
  selectedCategory: MaterialCategory | 'all';
  previewOpen: boolean;
  onClosePreview: () => void;
  onPrintNow: () => void;
}

const PrintableLedgerDocument: React.FC<{
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  categories: string[];
  selectedCategory: MaterialCategory | 'all';
}> = ({ agency, rows, categories, selectedCategory }) => {
  const totals = computeLedgerTotals(rows);
  const begDate = getBeginningDateLabel(agency.fiscalYearBE);
  const depRows = rows.filter((r) => r.depreciation.enabled);
  const depTotals = computeLedgerTotals(depRows);

  const categoryText =
    selectedCategory === 'all' ? categories.join(' / ') : selectedCategory;

  return (
    <div className="bg-white text-slate-900">
      <div className="flex justify-end text-xs font-medium text-slate-700">
        {agency.documentNumber}
      </div>
      <h1 className="text-center text-base font-bold text-slate-900 mt-1">
        แบบบัญชีรายงานวัสดุประจำปี
      </h1>
      <div className="mt-2 flex flex-wrap justify-between gap-4 text-xs">
        <div>
          ชื่อหน่วยงาน: <span className="font-semibold">{agency.agencyName}</span>
        </div>
        <div>
          รหัสศูนย์ต้นทุน:{' '}
          <span className="font-mono-tabular font-semibold">{agency.costCenterCode}</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-4 text-xs">
        <div>
          ประเภท: <span className="font-medium">{categoryText}</span>
        </div>
        <div className="font-semibold">
          ประจำปีงบประมาณ พ.ศ. {agency.fiscalYearBE}
        </div>
      </div>

      <table className="print-table mt-3 w-full border-collapse border border-slate-400 text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th rowSpan={2} className="border border-slate-400 px-1.5 py-1.5 text-left">
              รหัสวัสดุ
            </th>
            <th rowSpan={2} className="border border-slate-400 px-2 py-1.5 text-left">
              รายการ
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ยอดคงเหลือยกมา
              <br />
              {begDate}
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคาต่อหน่วย
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคารวมวัสดุ
              <br />
              คงเหลือยกมา (1)
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">จัดซื้อ</th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคาต่อหน่วย
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              รวมราคาวัสดุ
              <br />
              จัดซื้อ (2)
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">วัสดุใช้ไป</th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคาต่อหน่วย
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคารวมวัสดุ
              <br />
              ใช้ไป (3)
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              จำนวนคงเหลือ
            </th>
            <th className="border border-slate-400 px-1.5 py-1 text-center">
              ราคารวมวัสดุ
              <br />
              คงเหลือ (4)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="border border-slate-300 px-1.5 py-1 font-mono-tabular">
                {r.isPriceVariant ? '' : r.code}
              </td>
              <td
                className={`border border-slate-300 px-2 py-1 ${
                  r.isPriceVariant ? 'pl-4 italic' : ''
                }`}
              >
                {r.name}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {r.beginningQty > 0 ? `${formatNumber(r.beginningQty)} ${r.unit}` : '-'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.beginningUnitPrice, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.beginningTotal, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {r.purchasedQty > 0 ? `${formatNumber(r.purchasedQty)} ${r.unit}` : '-'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.purchasedUnitPrice, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.purchasedTotal, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {r.usedQty > 0 ? `${formatNumber(r.usedQty)} ${r.unit}` : '-'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.usedUnitPrice, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular">
                {formatCurrency(r.usedTotal, true)}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular font-medium">
                {r.remainingQty !== 0 ? `${formatNumber(r.remainingQty)} ${r.unit}` : '-'}
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-mono-tabular font-semibold">
                {formatCurrency(r.remainingTotal, true)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-bold">
            <td colSpan={4} className="border border-slate-400 px-2 py-1.5 text-right">
              ยอดรวมสุทธิ
            </td>
            <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono-tabular">
              {formatCurrency(totals.beginningTotal)}
            </td>
            <td colSpan={2} className="border border-slate-400" />
            <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono-tabular">
              {formatCurrency(totals.purchasedTotal)}
            </td>
            <td colSpan={2} className="border border-slate-400" />
            <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono-tabular">
              {formatCurrency(totals.usedTotal)}
            </td>
            <td className="border border-slate-400" />
            <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono-tabular">
              {formatCurrency(totals.remainingTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-3 text-[11px] text-slate-700 space-y-0.5">
        <div>1. แบบบัญชีวัสดุประจำปี ช่องรวมบรรทัดสุดท้ายคิดเฉพาะยอดเงินเท่านั้น</div>
        <div>
          2. วิธีการคิดยอดรวมราคาคงเหลือ: (1) ยอดยกมา + (2) ยอดจัดซื้อหรือรับจากกรม - (3) ยอดจ่ายไป = (4) ยอดคงเหลือประจำปีงบประมาณ
        </div>
      </div>

      {/* Official Sign-off Block */}
      <div className="mt-8 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div>ลงชื่อ ............................................... ผู้จัดทำรายงาน</div>
          <div className="mt-1 font-medium">({agency.preparerName})</div>
          <div className="text-slate-600">{agency.preparerTitle}</div>
        </div>
        <div>
          <div>ลงชื่อ ............................................... ผู้ตรวจสอบ</div>
          <div className="mt-1 font-medium">({agency.reviewerName})</div>
          <div className="text-slate-600">{agency.reviewerTitle}</div>
        </div>
        <div>
          <div>ลงชื่อ ............................................... ผู้อนุมัติ</div>
          <div className="mt-1 font-medium">({agency.approverName})</div>
          <div className="text-slate-600">{agency.approverTitle}</div>
        </div>
      </div>

      {/* Straight-Line Depreciation Appendix if enabled */}
      {depRows.length > 0 && (
        <div className="print-page-break mt-8 pt-6 border-t border-slate-300">
          <h2 className="text-center text-sm font-bold text-slate-900">
            เอกสารแนบ: ตารางคำนวณค่าเสื่อมราคาแบบเส้นตรงรายปี (พ.ศ. {agency.fiscalYearBE})
          </h2>
          <table className="print-table mt-3 w-full border-collapse border border-slate-400 text-[11px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-2 py-1.5 text-left">รหัส</th>
                <th className="border border-slate-400 px-2 py-1.5 text-left">รายการ</th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  ราคาทุน (บาท)
                </th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  มูลค่าซาก
                </th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  อายุ (ปี)
                </th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  ค่าเสื่อม/ปี
                </th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  ค่าเสื่อมสะสม
                </th>
                <th className="border border-slate-400 px-2 py-1.5 text-right">
                  มูลค่าสุทธิ (NBV)
                </th>
              </tr>
            </thead>
            <tbody>
              {depRows.map((r) => (
                <tr key={r.id}>
                  <td className="border border-slate-300 px-2 py-1 font-mono-tabular">
                    {r.code}
                  </td>
                  <td className="border border-slate-300 px-2 py-1">{r.name}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular">
                    {formatCurrency(r.depreciationCostBasis)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular">
                    {formatCurrency(r.depreciation.salvageValue)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular">
                    {r.depreciation.usefulLifeYears}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular">
                    {formatCurrency(r.annualDepreciation)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular">
                    {formatCurrency(r.accumulatedDepreciation)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono-tabular font-semibold">
                    {formatCurrency(r.netBookValue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={5} className="border border-slate-400 px-2 py-1.5 text-right">
                  รวมสุทธิ
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right font-mono-tabular">
                  {formatCurrency(depTotals.totalAnnualDepreciation)}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right font-mono-tabular">
                  {formatCurrency(
                    depRows.reduce((s, r) => s + r.accumulatedDepreciation, 0)
                  )}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right font-mono-tabular">
                  {formatCurrency(depTotals.totalNetBookValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export const OfficialPrintReport: React.FC<OfficialPrintReportProps> = ({
  agency,
  rows,
  categories,
  selectedCategory,
  previewOpen,
  onClosePreview,
  onPrintNow,
}) => {
  return (
    <>
      {/* Hidden DOM used specifically by @media print */}
      <div className="print-only">
        <PrintableLedgerDocument
          agency={agency}
          rows={rows}
          categories={categories}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Interactive PDF Print Preview Modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ตัวอย่างเอกสารส่งออก PDF ({agency.documentNumber})
                </h3>
                <p className="text-xs text-slate-500">
                  กดปุ่ม "พิมพ์ / บันทึกเป็น PDF" แล้วเลือกปลายทางเป็น Save as PDF (แนวนอน A4)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrintNow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์ / บันทึกเป็น PDF
                </button>
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="ปิดตัวอย่าง"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-6">
              <div className="mx-auto min-w-[900px] max-w-[1100px] rounded-lg border border-slate-300 bg-white p-8 shadow-sm">
                <PrintableLedgerDocument
                  agency={agency}
                  rows={rows}
                  categories={categories}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
