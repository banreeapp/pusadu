import React, { useMemo, useState } from 'react';
import { FileDown, Printer, Settings2, X } from 'lucide-react';
import { AgencyProfile, ComputedMaterialRow } from '../types/inventory';
import {
  formatCurrency,
  groupTotalsByCategory,
  roundCurrency,
} from '../utils/calculations';
import {
  CategorySummaryExportRow,
  exportCategorySummaryToExcel,
} from '../utils/exportExcel';

interface CategorySummaryReportViewProps {
  agency: AgencyProfile;
  onUpdateAgency: (next: AgencyProfile) => void;
  rows: ComputedMaterialRow[];
  categories: string[];
  onPrintSummary: () => void;
}

export const PrintableCategorySummaryDocument: React.FC<{
  agency: AgencyProfile;
  summaryRows: CategorySummaryExportRow[];
}> = ({ agency, summaryRows }) => {
  const begYear = agency.fiscalYearBE - 1;
  const endYear = agency.fiscalYearBE;
  const accountCode = agency.accountTypeCode || '1105010105';
  const disbCode = agency.disbursementCode || agency.costCenterCode || '-';

  const grandBeginning = roundCurrency(
    summaryRows.reduce((s, r) => s + r.beginningTotal, 0)
  );
  const grandPurchased = roundCurrency(
    summaryRows.reduce((s, r) => s + r.purchasedTotal, 0)
  );
  const grandUsed = roundCurrency(summaryRows.reduce((s, r) => s + r.usedTotal, 0));
  const grandRemaining = roundCurrency(
    summaryRows.reduce((s, r) => s + r.remainingTotal, 0)
  );

  return (
    <div className="bg-white text-slate-900">
      <div className="text-center space-y-1">
        <h1 className="text-sm font-bold text-slate-900">
          แบบสรุปประเภทวัสดุคงเหลือ ประจำปีงบประมาณ พ.ศ. {agency.fiscalYearBE}{' '}
          (แนบรายงานผลการตรวจสอบการรับ-จ่ายพัสดุประจำปี)
        </h1>
        <div className="text-xs font-medium text-slate-800">
          บัญชีวัสดุคงคลัง รหัสบัญชีแยกประเภท{' '}
          <span className="font-mono-tabular font-semibold">{accountCode}</span>
        </div>
        <div className="text-xs text-slate-800">
          ชื่อหน่วยงาน <span className="font-semibold">{agency.agencyName}</span>{' '}
          รหัสหน่วยเบิกจ่าย{' '}
          <span className="font-mono-tabular font-semibold">{disbCode}</span>
        </div>
        <div className="text-xs text-slate-700">
          ตั้งแต่วันที่ 1 ตุลาคม {begYear} ถึงวันที่ 30 กันยายน {endYear}
        </div>
      </div>

      <table className="print-table mt-4 w-full border-collapse border border-slate-800 text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th
              rowSpan={2}
              className="border border-slate-800 px-2 py-2 text-center font-semibold w-12"
            >
              ลำดับ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-3 py-2 text-center font-semibold"
            >
              รายการ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-2.5 py-2 text-center font-semibold w-28"
            >
              ยอดยกมา
              <br />
              (บาท)
            </th>
            <th
              colSpan={3}
              className="border border-slate-800 px-2 py-1.5 text-center font-semibold"
            >
              ปีงบประมาณ {agency.fiscalYearBE}
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-2.5 py-2 text-center font-semibold w-32"
            >
              หมายเหตุ
            </th>
          </tr>
          <tr className="bg-slate-50">
            <th className="border border-slate-800 px-2.5 py-1.5 text-center font-medium w-28">
              จำนวนเงิน
              <br />
              รับ
            </th>
            <th className="border border-slate-800 px-2.5 py-1.5 text-center font-medium w-28">
              จำนวนเงิน
              <br />
              จ่าย
            </th>
            <th className="border border-slate-800 px-2.5 py-1.5 text-center font-medium w-28">
              จำนวนเงิน
              <br />
              คงเหลือ
            </th>
          </tr>
        </thead>

        <tbody>
          {summaryRows.map((row, idx) => (
            <tr key={row.category}>
              <td className="border border-slate-800 px-2 py-1.5 text-center font-mono-tabular">
                {idx + 1}
              </td>
              <td className="border border-slate-800 px-3 py-1.5">{row.category}</td>
              <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono-tabular">
                {formatCurrency(row.beginningTotal, true)}
              </td>
              <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono-tabular">
                {formatCurrency(row.purchasedTotal, true)}
              </td>
              <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono-tabular">
                {formatCurrency(row.usedTotal, true)}
              </td>
              <td className="border border-slate-800 px-2.5 py-1.5 text-right font-mono-tabular font-medium">
                {formatCurrency(row.remainingTotal, true)}
              </td>
              <td className="border border-slate-800 px-2.5 py-1.5 text-slate-700">
                {row.note || ''}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="font-bold">
            <td colSpan={2} className="px-2 py-2 text-right">
              จำนวนเงินรวม
            </td>
            <td className="border border-slate-800 px-2.5 py-2 text-right font-mono-tabular">
              {formatCurrency(grandBeginning)}
            </td>
            <td className="border border-slate-800 px-2.5 py-2 text-right font-mono-tabular">
              {formatCurrency(grandPurchased)}
            </td>
            <td className="border border-slate-800 px-2.5 py-2 text-right font-mono-tabular">
              {formatCurrency(grandUsed)}
            </td>
            <td className="border border-slate-800 border-b-4 border-b-double px-2.5 py-2 text-right font-mono-tabular">
              {formatCurrency(grandRemaining)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 text-xs text-slate-700 space-y-1">
        <div className="font-semibold">หมายเหตุ</div>
        <div className="pl-3">
          (1) ยอดยกมา + จำนวนเงินรับ - จำนวนเงินจ่าย = จำนวนเงินคงเหลือ
        </div>
        <div className="pl-3">
          (2) จำนวนเงินรวม = บัญชีวัสดุคงคลัง ในงบทดลองจากระบบ GFMIS (ถ้ามี)
        </div>
      </div>

      {/* 3-Member Inspection Committee Signature Block */}
      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-md space-y-6 text-xs text-slate-800">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span>(ลงชื่อ) ........................................................</span>
              <span className="font-medium">ประธานกรรมการ</span>
            </div>
            <div className="pl-10">
              ( {agency.committeeChairName || '........................................'} )
            </div>
            <div className="pl-8">
              ตำแหน่ง {agency.committeeChairTitle || '........................................'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span>(ลงชื่อ) ........................................................</span>
              <span className="font-medium">กรรมการ</span>
            </div>
            <div className="pl-10">
              ( {agency.committeeMember1Name || '........................................'} )
            </div>
            <div className="pl-8">
              ตำแหน่ง {agency.committeeMember1Title || '........................................'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span>(ลงชื่อ) ........................................................</span>
              <span className="font-medium">กรรมการ</span>
            </div>
            <div className="pl-10">
              ( {agency.committeeMember2Name || '........................................'} )
            </div>
            <div className="pl-8">
              ตำแหน่ง {agency.committeeMember2Title || '........................................'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CategorySummaryReportView: React.FC<
  CategorySummaryReportViewProps
> = ({ agency, onUpdateAgency, rows, categories, onPrintSummary }) => {
  const [editingSettings, setEditingSettings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const summaryRows: CategorySummaryExportRow[] = useMemo(() => {
    const grouped = groupTotalsByCategory(rows, categories);
    return grouped.map((g) => ({
      category: g.category,
      beginningTotal: g.beginningTotal,
      purchasedTotal: g.purchasedTotal,
      usedTotal: g.usedTotal,
      remainingTotal: g.remainingTotal,
      note: agency.categoryNotes?.[g.category] || '',
    }));
  }, [rows, categories, agency.categoryNotes]);

  const grandBeginning = roundCurrency(
    summaryRows.reduce((s, r) => s + r.beginningTotal, 0)
  );
  const grandPurchased = roundCurrency(
    summaryRows.reduce((s, r) => s + r.purchasedTotal, 0)
  );
  const grandUsed = roundCurrency(summaryRows.reduce((s, r) => s + r.usedTotal, 0));
  const grandRemaining = roundCurrency(
    summaryRows.reduce((s, r) => s + r.remainingTotal, 0)
  );

  const begYear = agency.fiscalYearBE - 1;
  const endYear = agency.fiscalYearBE;
  const accountCode = agency.accountTypeCode || '1105010105';
  const disbCode = agency.disbursementCode || agency.costCenterCode || '-';

  const handleCategoryNoteChange = (category: string, note: string) => {
    onUpdateAgency({
      ...agency,
      categoryNotes: {
        ...(agency.categoryNotes || {}),
        [category]: note,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Configuration Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-teal-800">
              รายงานประกอบการตรวจสอบรับ-จ่ายพัสดุประจำปี · ปีงบประมาณ พ.ศ.{' '}
              {agency.fiscalYearBE}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              แบบสรุปประเภทวัสดุคงเหลือ ประจำปีงบประมาณ
            </h2>
            <p className="text-xs text-slate-500">
              สรุปยอดยกมา รับ จ่าย และคงเหลือแยกตามประเภทวัสดุอัตโนมัติ พร้อมพิมพ์หรือส่งออกเป็น Excel ได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditingSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {editingSettings
                ? 'ซ่อนการตั้งค่าเอกสาร'
                : 'ตั้งค่าหัวเอกสาร / คณะกรรมการ'}
            </button>

            <button
              type="button"
              onClick={() => exportCategorySummaryToExcel(agency, summaryRows)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <FileDown className="h-4 w-4 text-emerald-700" />
              ส่งออก Excel
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              พิมพ์ / ส่งออก PDF
            </button>
          </div>
        </div>

        {editingSettings && (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
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
                รหัสบัญชีแยกประเภท
              </label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, accountTypeCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสหน่วยเบิกจ่าย
              </label>
              <input
                type="text"
                value={disbCode}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, disbursementCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ประธานกรรมการ (ชื่อ-สกุล)
              </label>
              <input
                type="text"
                value={agency.committeeChairName || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeChairName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ตำแหน่งประธานกรรมการ
              </label>
              <input
                type="text"
                value={agency.committeeChairTitle || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeChairTitle: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                กรรมการคนที่ 1 (ชื่อ-สกุล)
              </label>
              <input
                type="text"
                value={agency.committeeMember1Name || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeMember1Name: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ตำแหน่งกรรมการคนที่ 1
              </label>
              <input
                type="text"
                value={agency.committeeMember1Title || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeMember1Title: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                กรรมการคนที่ 2 (ชื่อ-สกุล)
              </label>
              <input
                type="text"
                value={agency.committeeMember2Name || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeMember2Name: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ตำแหน่งกรรมการคนที่ 2
              </label>
              <input
                type="text"
                value={agency.committeeMember2Title || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, committeeMember2Title: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Summary Sheet Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="text-center space-y-1 pb-2">
          <div className="text-sm font-bold text-slate-900">
            แบบสรุปประเภทวัสดุคงเหลือ ประจำปีงบประมาณ พ.ศ. {agency.fiscalYearBE}{' '}
            (แนบรายงานผลการตรวจสอบการรับ-จ่ายพัสดุประจำปี)
          </div>
          <div className="text-xs text-slate-700">
            บัญชีวัสดุคงคลัง รหัสบัญชีแยกประเภท{' '}
            <span className="font-mono-tabular font-semibold text-slate-900">
              {accountCode}
            </span>
          </div>
          <div className="text-xs text-slate-700">
            ชื่อหน่วยงาน <span className="font-semibold text-slate-900">{agency.agencyName}</span>{' '}
            · รหัสหน่วยเบิกจ่าย{' '}
            <span className="font-mono-tabular font-semibold text-slate-900">
              {disbCode}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            ตั้งแต่วันที่ 1 ตุลาคม {begYear} ถึงวันที่ 30 กันยายน {endYear}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2.5 text-center font-semibold w-14"
                >
                  ลำดับ
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-4 py-2.5 text-left font-semibold min-w-[220px]"
                >
                  รายการ
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2.5 text-right font-semibold w-32"
                >
                  ยอดยกมา (บาท)
                </th>
                <th
                  colSpan={3}
                  className="border-b border-r border-slate-200 px-3 py-2 text-center font-semibold bg-slate-100/70"
                >
                  ปีงบประมาณ {agency.fiscalYearBE}
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2.5 text-left font-semibold min-w-[180px]"
                >
                  หมายเหตุ
                </th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                <th className="border-r border-slate-200 px-3 py-1.5 text-right font-medium w-32">
                  จำนวนเงิน รับ
                </th>
                <th className="border-r border-slate-200 px-3 py-1.5 text-right font-medium w-32">
                  จำนวนเงิน จ่าย
                </th>
                <th className="border-r border-slate-200 px-3 py-1.5 text-right font-semibold text-teal-900 bg-teal-50/40 w-32">
                  จำนวนเงิน คงเหลือ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row, index) => (
                <tr key={row.category} className="hover:bg-slate-50/70">
                  <td className="border-r border-slate-100 px-3 py-2.5 text-center font-mono-tabular text-slate-500">
                    {index + 1}
                  </td>
                  <td className="border-r border-slate-100 px-4 py-2.5 font-medium text-slate-900">
                    {row.category}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-2.5 text-right font-mono-tabular text-slate-700">
                    {formatCurrency(row.beginningTotal, true)}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-2.5 text-right font-mono-tabular text-slate-700">
                    {formatCurrency(row.purchasedTotal, true)}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-2.5 text-right font-mono-tabular text-slate-700">
                    {formatCurrency(row.usedTotal, true)}
                  </td>
                  <td className="border-r border-slate-100 px-3 py-2.5 text-right font-mono-tabular font-semibold text-teal-900 bg-teal-50/20">
                    {formatCurrency(row.remainingTotal, true)}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={row.note || ''}
                      onChange={(e) =>
                        handleCategoryNoteChange(row.category, e.target.value)
                      }
                      placeholder="ระบุหมายเหตุ..."
                      className="w-full rounded border border-transparent hover:border-slate-200 focus:border-teal-600 bg-transparent px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td colSpan={2} className="border-r border-slate-200 px-4 py-3 text-right">
                  จำนวนเงินรวม
                </td>
                <td className="border-r border-slate-200 px-3 py-3 text-right font-mono-tabular">
                  {formatCurrency(grandBeginning)}
                </td>
                <td className="border-r border-slate-200 px-3 py-3 text-right font-mono-tabular">
                  {formatCurrency(grandPurchased)}
                </td>
                <td className="border-r border-slate-200 px-3 py-3 text-right font-mono-tabular">
                  {formatCurrency(grandUsed)}
                </td>
                <td className="border-r border-slate-200 border-b-4 border-b-double px-3 py-3 text-right font-mono-tabular text-teal-900 bg-teal-50/50">
                  {formatCurrency(grandRemaining)}
                </td>
                <td className="px-3 py-3 text-[11px] font-normal text-slate-500">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-6 pt-2 md:flex-row md:items-start md:justify-between">
          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">หมายเหตุ</div>
            <div>(1) ยอดยกมา + จำนวนเงินรับ - จำนวนเงินจ่าย = จำนวนเงินคงเหลือ</div>
            <div>(2) จำนวนเงินรวม = บัญชีวัสดุคงคลัง ในงบทดลองจากระบบ GFMIS (ถ้ามี)</div>
          </div>

          <div className="text-xs text-slate-600 space-y-1 md:text-right">
            <div>
              ประธานกรรมการ: <strong className="text-slate-800">{agency.committeeChairName}</strong>
            </div>
            <div>
              กรรมการ: <strong className="text-slate-800">{agency.committeeMember1Name}</strong> ·{' '}
              <strong className="text-slate-800">{agency.committeeMember2Name}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Print / PDF Preview Modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ตัวอย่างเอกสารแบบสรุปประเภทวัสดุคงเหลือ (สำหรับพิมพ์ / บันทึกเป็น PDF)
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
                    onPrintSummary();
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
              <div className="mx-auto min-w-[780px] max-w-[920px] rounded-lg border border-slate-300 bg-white p-8 shadow-sm">
                <PrintableCategorySummaryDocument
                  agency={agency}
                  summaryRows={summaryRows}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
