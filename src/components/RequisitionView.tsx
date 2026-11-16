import React, { useMemo, useState } from 'react';
import {
  Edit3,
  FileDown,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AgencyProfile, RequisitionVoucher } from '../types/inventory';
import { formatNumber } from '../utils/calculations';
import {
  exportRequisitionToExcel,
  formatThaiDateLong,
} from '../utils/exportExcel';

interface RequisitionViewProps {
  agency: AgencyProfile;
  vouchers: RequisitionVoucher[];
  selectedVoucherId: string;
  onSelectVoucher: (id: string) => void;
  onCreateVoucher: () => void;
  onEditVoucher: (voucher: RequisitionVoucher) => void;
  onDeleteVoucher: (voucher: RequisitionVoucher) => void;
  onPrintVoucher: () => void;
}

export const PrintableRequisitionDocument: React.FC<{
  voucher: RequisitionVoucher;
}> = ({ voucher }) => {
  const minRows = 14;
  const blankRowCount = Math.max(0, minRows - voucher.items.length);

  return (
    <div className="bg-white text-slate-900 text-xs">
      <h1 className="text-center text-lg font-bold text-slate-900">ใบเบิกวัสดุ</h1>

      <div className="mt-2 flex flex-col items-end space-y-1 text-xs">
        <div>
          เลขที่{' '}
          <span className="inline-block min-w-[110px] border-b border-dotted border-slate-500 text-center font-mono-tabular font-semibold">
            {voucher.voucherNo}
          </span>
        </div>
        <div>{formatThaiDateLong(voucher.date)}</div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div>
          เรียน <span className="font-medium">{voucher.recipientTitle || 'หัวหน้าหน่วยพัสดุ'}</span>
        </div>
        <div className="pl-8 leading-relaxed">
          ข้าพเจ้าขอเบิกวัสดุตามรายการข้างล่างนี้ เพื่อใช้งานราชการ{' '}
          <span className="inline-block min-w-[240px] border-b border-dotted border-slate-500 px-1 font-medium">
            {voucher.purpose || ''}
          </span>{' '}
          โทร{' '}
          <span className="inline-block min-w-[100px] border-b border-dotted border-slate-500 px-1 font-mono-tabular">
            {voucher.phone || ''}
          </span>
        </div>
      </div>

      <table className="print-table mt-3 w-full border-collapse border border-slate-800 text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th
              rowSpan={2}
              className="border border-slate-800 px-2 py-1.5 text-center font-semibold w-14"
            >
              ลำดับที่
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-3 py-1.5 text-center font-semibold"
            >
              รายการสิ่งของ
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-2 py-1.5 text-center font-semibold w-20"
            >
              รหัส
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-2 py-1.5 text-center font-semibold w-20"
            >
              หน่วยนับ
            </th>
            <th
              colSpan={2}
              className="border border-slate-800 px-2 py-1 text-center font-semibold"
            >
              จำนวน
            </th>
            <th
              rowSpan={2}
              className="border border-slate-800 px-2 py-1.5 text-center font-semibold w-24"
            >
              คงเหลือ
              <br />
              หลังจ่าย
            </th>
          </tr>
          <tr className="bg-slate-50">
            <th className="border border-slate-800 px-2 py-1 text-center font-medium w-16">
              เบิก
            </th>
            <th className="border border-slate-800 px-2 py-1 text-center font-medium w-16">
              จ่าย
            </th>
          </tr>
        </thead>
        <tbody>
          {voucher.items.map((item, idx) => (
            <tr key={item.id}>
              <td className="border border-slate-800 px-2 py-1.5 text-center font-mono-tabular">
                {idx + 1}
              </td>
              <td className="border border-slate-800 px-3 py-1.5">
                {item.materialName}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-center font-mono-tabular">
                {item.materialCode}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-center">
                {item.unit}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-right font-mono-tabular">
                {formatNumber(item.requestedQty)}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-right font-mono-tabular font-medium">
                {formatNumber(item.issuedQty)}
              </td>
              <td className="border border-slate-800 px-2 py-1.5 text-right font-mono-tabular font-semibold">
                {formatNumber(item.remainingAfter)}
              </td>
            </tr>
          ))}
          {Array.from({ length: blankRowCount }).map((_, idx) => (
            <tr key={`blank-${idx}`}>
              <td className="border border-slate-800 px-2 py-2.5">&nbsp;</td>
              <td className="border border-slate-800 px-3 py-2.5" />
              <td className="border border-slate-800 px-2 py-2.5" />
              <td className="border border-slate-800 px-2 py-2.5" />
              <td className="border border-slate-800 px-2 py-2.5" />
              <td className="border border-slate-800 px-2 py-2.5" />
              <td className="border border-slate-800 px-2 py-2.5" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2x2 Official Signature Block */}
      <div className="mt-7 grid grid-cols-2 gap-x-10 gap-y-7 text-xs">
        <div className="space-y-1.5 text-center">
          <div>
            (ลงชื่อ)........................................ผู้เบิก (หัวหน้ากลุ่ม/งาน)
          </div>
          <div>
            ( {voucher.requesterName || '........................................'} ) ตัวบรรจง
          </div>
          <div>
            ตำแหน่ง {voucher.requesterTitle || '........................................'}
          </div>
          <div>{formatThaiDateLong(voucher.requesterDate || voucher.date)}</div>
        </div>

        <div className="space-y-1.5 text-center">
          <div>(ลงชื่อ)........................................จ่ายวัสดุ</div>
          <div>
            ( {voucher.issuerName || '........................................'} ) ตัวบรรจง
          </div>
          <div>
            ตำแหน่ง {voucher.issuerTitle || '........................................'}
          </div>
          <div>{formatThaiDateLong(voucher.issuerDate || voucher.date)}</div>
        </div>

        <div className="space-y-1.5 text-center">
          <div className="font-semibold">อนุมัติให้จ่ายได้</div>
          <div>(ลงชื่อ)........................................ผู้สั่งจ่าย</div>
          <div>
            ( {voucher.approverName || '........................................'} )
          </div>
          <div>{voucher.approverTitle || 'หัวหน้าหน่วยพัสดุ'}</div>
          <div>{formatThaiDateLong(voucher.approverDate || voucher.date)}</div>
        </div>

        <div className="space-y-1.5 text-center pt-5">
          <div>(ลงชื่อ)........................................ผู้รับวัสดุ</div>
          <div>
            ( {voucher.receiverName || '........................................'} ) ตัวบรรจง
          </div>
          <div>
            ตำแหน่ง {voucher.receiverTitle || '........................................'}
          </div>
          <div>{formatThaiDateLong(voucher.receiverDate || voucher.date)}</div>
        </div>
      </div>
    </div>
  );
};

export const RequisitionView: React.FC<RequisitionViewProps> = ({
  agency,
  vouchers,
  selectedVoucherId,
  onSelectVoucher,
  onCreateVoucher,
  onEditVoucher,
  onDeleteVoucher,
  onPrintVoucher,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vouchers.filter(
      (v) =>
        !q ||
        v.voucherNo.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q) ||
        v.requesterName.toLowerCase().includes(q) ||
        v.items.some(
          (i) =>
            i.materialName.toLowerCase().includes(q) ||
            i.materialCode.toLowerCase().includes(q)
        )
    );
  }, [vouchers, searchQuery]);

  const activeVoucher =
    vouchers.find((v) => v.id === selectedVoucherId) ||
    filteredVouchers[0] ||
    vouchers[0] ||
    null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List of Requisition Vouchers */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="border-b border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                รายการใบเบิกวัสดุ ({vouchers.length})
              </h2>
              <button
                type="button"
                onClick={onCreateVoucher}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                สร้างใบเบิกวัสดุ
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่ใบเบิก / ผู้เบิก / วัสดุ..."
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredVouchers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                ไม่พบใบเบิกวัสดุที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredVouchers.map((v) => {
                const isSelected = activeVoucher?.id === v.id;
                const totalIssued = v.items.reduce((s, i) => s + i.issuedQty, 0);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVoucher(v.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? 'bg-teal-50/70'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-slate-900">
                        {v.voucherNo}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-slate-500">
                        {v.date}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800 truncate">
                      {v.purpose || 'ไม่ระบุวัตถุประสงค์'}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">
                        ผู้เบิก: {v.requesterName || '-'}
                      </span>
                      <span className="font-mono-tabular shrink-0 ml-2 text-teal-800 font-medium">
                        {v.items.length} รายการ · จ่าย {formatNumber(totalIssued)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Preview & Actions for Selected Voucher */}
        <div className="lg:col-span-8 space-y-4">
          {!activeVoucher ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <div className="text-sm font-semibold text-slate-900">
                ยังไม่มีใบเบิกวัสดุ
              </div>
              <p className="mt-1 text-xs text-slate-500">
                กดปุ่ม "สร้างใบเบิกวัสดุ" เพื่อออกใบเบิกและตัดยอดคงเหลือในคลังอัตโนมัติ
              </p>
              <button
                type="button"
                onClick={onCreateVoucher}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
              >
                <Plus className="h-4 w-4" />
                สร้างใบเบิกวัสดุแรก
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    ใบเบิกวัสดุเลขที่ {activeVoucher.voucherNo}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatThaiDateLong(activeVoucher.date)} · {activeVoucher.items.length}{' '}
                    รายการ
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditVoucher(activeVoucher)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    แก้ไขใบเบิก
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportRequisitionToExcel(activeVoucher, agency)
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

                  <button
                    type="button"
                    onClick={() => onDeleteVoucher(activeVoucher)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap"
                    title="ลบใบเบิกวัสดุ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Official Voucher Sheet Preview */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 overflow-x-auto">
                <div className="min-w-[640px]">
                  <PrintableRequisitionDocument voucher={activeVoucher} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {previewOpen && activeVoucher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  ตัวอย่างใบเบิกวัสดุเลขที่ {activeVoucher.voucherNo}
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
                    onPrintVoucher();
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
              <div className="mx-auto min-w-[680px] max-w-[800px] rounded-lg border border-slate-300 bg-white p-8 shadow-sm">
                <PrintableRequisitionDocument voucher={activeVoucher} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
