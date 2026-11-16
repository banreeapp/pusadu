import React, { useMemo, useState } from 'react';
import { FileDown, Layers, Printer, Settings2, X } from 'lucide-react';
import { AgencyProfile, ComputedMaterialRow } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/calculations';
import {
  AuditDocId,
  AuditDocumentData,
  buildAuditDocumentData,
} from '../utils/auditReports';
import {
  exportAuditDocumentToExcel,
  exportFullAuditBundleToExcel,
} from '../utils/exportExcel';

interface AuditReportsViewProps {
  agency: AgencyProfile;
  onUpdateAgency: (next: AgencyProfile) => void;
  rows: ComputedMaterialRow[];
  activeDocId: AuditDocId;
  onSelectDocId: (id: AuditDocId) => void;
  categoryLabel: string;
  onPrintSingle: () => void;
  onPrintBundle: () => void;
}

export const PrintableAuditDocument: React.FC<{
  doc: AuditDocumentData;
  agency: AgencyProfile;
}> = ({ doc, agency }) => {
  const minRows = doc.id === 'doc2' ? 11 : doc.rows.length;
  const blankCount = Math.max(0, minRows - doc.rows.length);
  const unitPriceHeader = doc.id === 'doc2' ? 'ราคาต่อหน่วย' : 'ต่อหน่วย';

  return (
    <div className="bg-white text-slate-900 text-xs">
      <div className="flex justify-end text-xs font-semibold text-blue-700 print:text-slate-900">
        {doc.documentNumber}
      </div>

      <div className="text-center space-y-0.5 mt-1">
        <h1 className="text-sm font-bold text-slate-900">{doc.title}</h1>
        <div className="text-xs font-semibold">
          <span className="text-red-700 print:text-slate-900">{doc.accountTitle}</span>{' '}
          <span className="text-slate-800">
            รหัสบัญชีแยกประเภท{' '}
            <span className="font-mono-tabular">{doc.accountCode}</span>
          </span>
        </div>
        <div className="text-xs font-medium text-slate-800">{doc.agencyLabel}</div>
        <div className="text-xs font-medium text-slate-800">{doc.dateLabel}</div>
      </div>

      <table className="print-table mt-3 w-full border-collapse border border-slate-900 text-[11px]">
        <thead>
          <tr className="bg-slate-50">
            <th
              rowSpan={2}
              className="border border-slate-900 px-1.5 py-1.5 text-center font-semibold w-10"
            >
              ลำดับ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2.5 py-1.5 text-center font-semibold min-w-[180px]"
            >
              {doc.itemColLabel}
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-1.5 py-1.5 text-center font-semibold w-16"
            >
              หน่วยนับ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-24"
            >
              ยอดยกมา
              <br />
              (บาท)
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-22"
            >
              รับ
              <br />
              (บาท)
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-22"
            >
              จ่าย
              <br />
              (บาท)
            </th>
            <th
              colSpan={3}
              className="border border-slate-900 px-2 py-1 text-center font-semibold"
            >
              คงเหลือ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-900 px-2 py-1.5 text-center font-semibold w-28"
            >
              หมายเหตุ
            </th>
          </tr>
          <tr className="bg-slate-50">
            <th className="border border-slate-900 px-1.5 py-1 text-center font-medium w-16">
              หน่วย
            </th>
            <th className="border border-slate-900 px-1.5 py-1 text-center font-medium w-20">
              {unitPriceHeader}
            </th>
            <th className="border border-slate-900 px-2 py-1 text-center font-medium w-24">
              จำนวนเงิน
            </th>
          </tr>
        </thead>

        <tbody>
          {doc.rows.map((r) => (
            <tr key={r.key}>
              <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono-tabular">
                {r.index}
              </td>
              <td className="border border-slate-900 px-2.5 py-1.5 font-medium">
                {r.label}
              </td>
              <td className="border border-slate-900 px-1.5 py-1.5 text-center">
                {r.hasData ? r.unit || '-' : ''}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-right font-mono-tabular">
                {r.hasData ? formatCurrency(r.beginningTotal) : ''}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-right font-mono-tabular">
                {r.hasData ? formatCurrency(r.purchasedTotal) : ''}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-right font-mono-tabular">
                {r.hasData ? formatCurrency(r.usedTotal) : ''}
              </td>
              <td className="border border-slate-900 px-1.5 py-1.5 text-right font-mono-tabular">
                {r.hasData ? formatNumber(r.remainingQty) : ''}
              </td>
              <td className="border border-slate-900 px-1.5 py-1.5 text-right font-mono-tabular">
                {r.hasData
                  ? r.remainingUnitPrice !== null
                    ? formatCurrency(r.remainingUnitPrice)
                    : '-'
                  : ''}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-right font-mono-tabular font-semibold">
                {r.hasData ? formatCurrency(r.remainingTotal) : ''}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-slate-700">
                {r.note}
              </td>
            </tr>
          ))}
          {Array.from({ length: blankCount }).map((_, idx) => (
            <tr key={`pad-${idx}`}>
              <td className="border border-slate-900 px-1.5 py-2 text-center font-mono-tabular">
                {doc.rows.length + idx + 1 === 2 ? 2 : '\u00A0'}
              </td>
              <td className="border border-slate-900 px-2.5 py-2" />
              <td className="border border-slate-900 px-1.5 py-2" />
              <td className="border border-slate-900 px-2 py-2" />
              <td className="border border-slate-900 px-2 py-2" />
              <td className="border border-slate-900 px-2 py-2" />
              <td className="border border-slate-900 px-1.5 py-2" />
              <td className="border border-slate-900 px-1.5 py-2" />
              <td className="border border-slate-900 px-2 py-2" />
              <td className="border border-slate-900 px-2 py-2" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary line under จำนวนเงิน column */}
      <div className="mt-1 flex justify-end text-[11px]">
        <div className="flex items-center gap-3 pr-28">
          <span className="font-semibold">(1) จำนวนเงินรวม</span>
          <span className="min-w-[96px] border-b-4 border-double border-slate-900 px-2 py-0.5 text-right font-mono-tabular font-bold">
            {formatCurrency(doc.grandRemainingTotal)}
          </span>
        </div>
      </div>

      <div className="mt-1 text-right text-[11px] text-slate-700 pr-4">
        {doc.footerLabel}
      </div>

      {/* 5-Signatory Block matching เอกสารหมายเลข 2, 3, 4 */}
      <div className="mt-7 flex justify-center">
        <div className="w-full max-w-md space-y-4 text-xs text-slate-900">
          <div className="space-y-0.5">
            <div>
              (ลงชื่อ).................................................... ประธานกรรมการตรวจสอบพัสดุ
            </div>
            <div className="pl-12">
              ( {agency.committeeChairName || '........................................'} )
            </div>
          </div>

          <div className="space-y-0.5">
            <div>
              (ลงชื่อ).................................................... กรรมการตรวจสอบพัสดุ
            </div>
            <div className="pl-12">
              ( {agency.committeeMember1Name || '........................................'} )
            </div>
          </div>

          <div className="space-y-0.5">
            <div>
              (ลงชื่อ).................................................... กรรมการตรวจสอบพัสดุ
            </div>
            <div className="pl-12">
              ( {agency.committeeMember2Name || '........................................'} )
            </div>
          </div>

          <div className="space-y-0.5">
            <div>
              (ลงชื่อ).................................................... ผู้จัดทำ
            </div>
            <div className="pl-12">
              ( {agency.preparerName || '........................................'} )
            </div>
            <div className="pl-6">
              ตำแหน่ง {agency.preparerTitle || '........................................'}
            </div>
          </div>

          <div className="space-y-0.5">
            <div>
              (ลงชื่อ).................................................... ผู้รับรอง
            </div>
            <div className="pl-12">
              ( {agency.approverName || '........................................'} )
            </div>
            <div className="pl-6">
              ตำแหน่ง {agency.approverTitle || '........................................'}
            </div>
            <div className="pl-14 font-medium">หัวหน้าหน่วยงาน</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintableAuditBundle: React.FC<{
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
}> = ({ agency, rows }) => {
  const doc2 = buildAuditDocumentData('doc2', rows, agency);
  const doc3 = buildAuditDocumentData('doc3', rows, agency);
  const doc4 = buildAuditDocumentData('doc4', rows, agency);

  return (
    <div>
      <PrintableAuditDocument doc={doc2} agency={agency} />
      <div className="print-page-break" />
      <PrintableAuditDocument doc={doc3} agency={agency} />
      <div className="print-page-break" />
      <PrintableAuditDocument doc={doc4} agency={agency} />
    </div>
  );
};

export const AuditReportsView: React.FC<AuditReportsViewProps> = ({
  agency,
  onUpdateAgency,
  rows,
  activeDocId,
  onSelectDocId,
  categoryLabel,
  onPrintSingle,
  onPrintBundle,
}) => {
  const [editingSettings, setEditingSettings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const doc2 = useMemo(
    () => buildAuditDocumentData('doc2', rows, agency),
    [rows, agency]
  );
  const doc3 = useMemo(
    () => buildAuditDocumentData('doc3', rows, agency),
    [rows, agency]
  );
  const doc4 = useMemo(
    () => buildAuditDocumentData('doc4', rows, agency),
    [rows, agency]
  );

  const activeDoc =
    activeDocId === 'doc2' ? doc2 : activeDocId === 'doc3' ? doc3 : doc4;

  const handleRowNoteChange = (noteKey: string, value: string) => {
    onUpdateAgency({
      ...agency,
      auditRowNotes: {
        ...(agency.auditRowNotes || {}),
        [noteKey]: value,
      },
    });
  };

  const docTabs: Array<{
    id: AuditDocId;
    docNo: string;
    label: string;
    code: string;
    total: number;
  }> = [
    {
      id: 'doc2',
      docNo: 'เอกสารหมายเลข 2',
      label: 'รับ-จ่ายวัตถุดิบสมุนไพร',
      code: doc2.accountCode,
      total: doc2.grandRemainingTotal,
    },
    {
      id: 'doc3',
      docNo: 'เอกสารหมายเลข 3',
      label: 'สินค้าคงเหลือ (สินค้าสำเร็จรูป)',
      code: doc3.accountCode,
      total: doc3.grandRemainingTotal,
    },
    {
      id: 'doc4',
      docNo: 'เอกสารหมายเลข 4',
      label: 'วัสดุคงเหลือ (วัสดุคงคลัง)',
      code: doc4.accountCode,
      total: doc4.grandRemainingTotal,
    },
  ];

  const unitPriceHeader = activeDoc.id === 'doc2' ? 'ราคาต่อหน่วย' : 'ต่อหน่วย';

  return (
    <div className="space-y-4">
      {/* Top Toolbar & Document Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-teal-800">
              เอกสารแนบรายงานผลการตรวจสอบพัสดุประจำปี · ระบบ New GFMIS Thai
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              ชุดรายงานตรวจสอบพัสดุประจำปี (เอกสารหมายเลข 2–4)
            </h2>
            <p className="text-xs text-slate-500">
              คำนวณยอดยกมา รับ จ่าย และคงเหลืออัตโนมัติตามรหัสบัญชีแยกประเภท GFMIS พร้อมพิมพ์หรือส่งออกเป็น Excel รายเอกสารและทั้งชุด (1–4)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditingSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {editingSettings ? 'ซ่อนตั้งค่าเอกสาร' : 'ตั้งค่าหัวเอกสาร / ผู้ลงนาม'}
            </button>

            <button
              type="button"
              onClick={() => exportAuditDocumentToExcel(activeDoc, agency)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5 text-emerald-700" />
              Excel ({activeDoc.documentNumber})
            </button>

            <button
              type="button"
              onClick={() =>
                exportFullAuditBundleToExcel(agency, rows, categoryLabel)
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
            >
              <Layers className="h-3.5 w-3.5" />
              Excel ทั้งชุด (1–4)
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              พิมพ์ / ส่งออก PDF
            </button>
          </div>
        </div>

        {/* Document Switcher Tabs */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 pt-1">
          {docTabs.map((tab) => {
            const isActive = activeDocId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectDocId(tab.id)}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  isActive
                    ? 'border-teal-700 bg-teal-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      isActive ? 'text-teal-800' : 'text-slate-700'
                    }`}
                  >
                    {tab.docNo}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {tab.code}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-900">
                  {tab.label}
                </div>
                <div className="mt-1 font-mono-tabular text-xs font-semibold text-teal-800">
                  คงเหลือรวม {formatCurrency(tab.total)} บาท
                </div>
              </button>
            );
          })}
        </div>

        {editingSettings && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ชื่อหน่วยงาน / หน่วยเบิกจ่าย
              </label>
              <input
                type="text"
                value={agency.agencyName}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, agencyName: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสหน่วยเบิกจ่าย
              </label>
              <input
                type="text"
                value={agency.disbursementCode || agency.costCenterCode || ''}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, disbursementCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เขต
                </label>
                <input
                  type="text"
                  value={agency.healthZone || ''}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, healthZone: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  วันที่รายงาน
                </label>
                <input
                  type="text"
                  value={agency.auditReportDate || ''}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, auditReportDate: e.target.value })
                  }
                  placeholder="30 ก.ย. 69"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสบัญชี (เอกสาร 2 - วัตถุดิบ)
              </label>
              <input
                type="text"
                value={agency.rawMaterialAccountCode || '1105010101'}
                onChange={(e) =>
                  onUpdateAgency({
                    ...agency,
                    rawMaterialAccountCode: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสบัญชี (เอกสาร 3 - สินค้าสำเร็จรูป)
              </label>
              <input
                type="text"
                value={agency.finishedGoodsAccountCode || '1105010103'}
                onChange={(e) =>
                  onUpdateAgency({
                    ...agency,
                    finishedGoodsAccountCode: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสบัญชี (เอกสาร 4 - วัสดุคงคลัง)
              </label>
              <input
                type="text"
                value={agency.accountTypeCode || '1105010105'}
                onChange={(e) =>
                  onUpdateAgency({ ...agency, accountTypeCode: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ประธานกรรมการตรวจสอบพัสดุ
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
                กรรมการตรวจสอบพัสดุ (1)
              </label>
              <input
                type="text"
                value={agency.committeeMember1Name || ''}
                onChange={(e) =>
                  onUpdateAgency({
                    ...agency,
                    committeeMember1Name: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                กรรมการตรวจสอบพัสดุ (2)
              </label>
              <input
                type="text"
                value={agency.committeeMember2Name || ''}
                onChange={(e) =>
                  onUpdateAgency({
                    ...agency,
                    committeeMember2Name: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้จัดทำ (ชื่อ-สกุล / ตำแหน่ง)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={agency.preparerName}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, preparerName: e.target.value })
                  }
                  placeholder="ชื่อ-สกุล"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={agency.preparerTitle}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, preparerTitle: e.target.value })
                  }
                  placeholder="ตำแหน่ง"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ผู้รับรอง / หัวหน้าหน่วยงาน
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={agency.approverName}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, approverName: e.target.value })
                  }
                  placeholder="ชื่อ-สกุล"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={agency.approverTitle}
                  onChange={(e) =>
                    onUpdateAgency({ ...agency, approverTitle: e.target.value })
                  }
                  placeholder="ตำแหน่ง"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Interactive Document Sheet */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex justify-end text-xs font-semibold text-blue-700">
          {activeDoc.documentNumber}
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-slate-900">
            {activeDoc.title}
          </div>
          <div className="text-xs font-semibold">
            <span className="text-red-700">{activeDoc.accountTitle}</span>{' '}
            <span className="text-slate-700">
              รหัสบัญชีแยกประเภท{' '}
              <span className="font-mono-tabular text-slate-900">
                {activeDoc.accountCode}
              </span>
            </span>
          </div>
          <div className="text-xs text-slate-700">{activeDoc.agencyLabel}</div>
          <div className="text-xs text-slate-600">{activeDoc.dateLabel}</div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-2.5 py-2 text-center font-semibold w-12"
                >
                  ลำดับ
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2 text-left font-semibold min-w-[200px]"
                >
                  {activeDoc.itemColLabel}
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-2.5 py-2 text-center font-semibold w-20"
                >
                  หน่วยนับ
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2 text-right font-semibold w-28"
                >
                  ยอดยกมา
                  <br />
                  (บาท)
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2 text-right font-semibold w-26"
                >
                  รับ
                  <br />
                  (บาท)
                </th>
                <th
                  rowSpan={2}
                  className="border-r border-slate-200 px-3 py-2 text-right font-semibold w-26"
                >
                  จ่าย
                  <br />
                  (บาท)
                </th>
                <th
                  colSpan={3}
                  className="border-b border-r border-slate-200 px-3 py-1.5 text-center font-semibold bg-slate-100/70"
                >
                  คงเหลือ
                </th>
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-left font-semibold min-w-[160px]"
                >
                  หมายเหตุ
                </th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-medium w-20">
                  หน่วย
                </th>
                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right font-medium w-24">
                  {unitPriceHeader}
                </th>
                <th className="border-r border-slate-200 px-3 py-1.5 text-right font-semibold text-teal-900 bg-teal-50/40 w-28">
                  จำนวนเงิน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDoc.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    ยังไม่มีรายการในหมวดหมู่นี้ (สามารถเพิ่มรายการวัสดุในหมวด "{activeDoc.accountTitle}" เพื่อคำนวณยอดอัตโนมัติ)
                  </td>
                </tr>
              ) : (
                activeDoc.rows.map((r) => (
                  <tr
                    key={r.key}
                    className={r.hasData ? 'hover:bg-slate-50/70' : 'text-slate-400'}
                  >
                    <td className="border-r border-slate-100 px-2.5 py-2 text-center font-mono-tabular">
                      {r.index}
                    </td>
                    <td className="border-r border-slate-100 px-3 py-2 font-medium text-slate-900">
                      {r.label}
                    </td>
                    <td className="border-r border-slate-100 px-2.5 py-2 text-center">
                      {r.hasData ? r.unit || '-' : ''}
                    </td>
                    <td className="border-r border-slate-100 px-3 py-2 text-right font-mono-tabular">
                      {r.hasData ? formatCurrency(r.beginningTotal) : ''}
                    </td>
                    <td className="border-r border-slate-100 px-3 py-2 text-right font-mono-tabular">
                      {r.hasData ? formatCurrency(r.purchasedTotal) : ''}
                    </td>
                    <td className="border-r border-slate-100 px-3 py-2 text-right font-mono-tabular">
                      {r.hasData ? formatCurrency(r.usedTotal) : ''}
                    </td>
                    <td className="border-r border-slate-100 px-2.5 py-2 text-right font-mono-tabular">
                      {r.hasData ? formatNumber(r.remainingQty) : ''}
                    </td>
                    <td className="border-r border-slate-100 px-2.5 py-2 text-right font-mono-tabular">
                      {r.hasData
                        ? r.remainingUnitPrice !== null
                          ? formatCurrency(r.remainingUnitPrice)
                          : '-'
                        : ''}
                    </td>
                    <td className="border-r border-slate-100 px-3 py-2 text-right font-mono-tabular font-semibold text-teal-900 bg-teal-50/20">
                      {r.hasData ? formatCurrency(r.remainingTotal) : ''}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) =>
                          handleRowNoteChange(r.key, e.target.value)
                        }
                        placeholder="หมายเหตุ..."
                        className="w-full rounded border border-transparent hover:border-slate-200 focus:border-teal-600 bg-transparent px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td colSpan={8} className="border-r border-slate-200 px-3 py-3 text-right">
                  (1) จำนวนเงินรวม
                </td>
                <td className="border-r border-slate-200 border-b-4 border-b-double px-3 py-3 text-right font-mono-tabular text-teal-900 bg-teal-50/50">
                  {formatCurrency(activeDoc.grandRemainingTotal)}
                </td>
                <td className="px-3 py-3 text-[11px] font-normal text-slate-500">
                  บาท
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>{activeDoc.footerLabel}</span>
          <span>
            ผู้จัดทำ: <strong className="text-slate-800">{agency.preparerName}</strong> · ผู้รับรอง:{' '}
            <strong className="text-slate-800">{agency.approverName}</strong>
          </span>
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
                  ตัวอย่าง{activeDoc.documentNumber}: {activeDoc.accountTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกพิมพ์เฉพาะเอกสารนี้ หรือพิมพ์ทั้งชุด (เอกสารหมายเลข 2–4) เป็นไฟล์ PDF ได้ทันที
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    onPrintBundle();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Layers className="h-4 w-4 text-teal-700" />
                  พิมพ์ทั้งชุด (2–4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewOpen(false);
                    onPrintSingle();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
                >
                  <Printer className="h-4 w-4" />
                  พิมพ์ / บันทึก PDF ({activeDoc.documentNumber})
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
              <div className="mx-auto min-w-[780px] max-w-[960px] rounded-lg border border-slate-300 bg-white p-8 shadow-sm">
                <PrintableAuditDocument doc={activeDoc} agency={agency} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
