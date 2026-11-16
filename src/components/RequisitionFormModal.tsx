import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  RequisitionItem,
  RequisitionVoucher,
} from '../types/inventory';
import { formatNumber } from '../utils/calculations';

interface RequisitionFormModalProps {
  open: boolean;
  initialVoucher: RequisitionVoucher | null;
  rows: ComputedMaterialRow[];
  agency: AgencyProfile;
  nextVoucherSeq: number;
  onSave: (voucher: RequisitionVoucher) => void;
  onClose: () => void;
}

export const RequisitionFormModal: React.FC<RequisitionFormModalProps> = ({
  open,
  initialVoucher,
  rows,
  agency,
  nextVoucherSeq,
  onSave,
  onClose,
}) => {
  const selectableMaterials = useMemo(
    () => rows.filter((r) => !r.isPriceVariant),
    [rows]
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(todayStr);
  const [recipientTitle, setRecipientTitle] = useState('หัวหน้าหน่วยพัสดุ');
  const [purpose, setPurpose] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState<RequisitionItem[]>([]);

  const [requesterName, setRequesterName] = useState('');
  const [requesterTitle, setRequesterTitle] = useState('');
  const [requesterDate, setRequesterDate] = useState(todayStr);

  const [issuerName, setIssuerName] = useState('');
  const [issuerTitle, setIssuerTitle] = useState('');
  const [issuerDate, setIssuerDate] = useState(todayStr);

  const [approverName, setApproverName] = useState('');
  const [approverTitle, setApproverTitle] = useState('หัวหน้าหน่วยพัสดุ');
  const [approverDate, setApproverDate] = useState(todayStr);

  const [receiverName, setReceiverName] = useState('');
  const [receiverTitle, setReceiverTitle] = useState('');
  const [receiverDate, setReceiverDate] = useState(todayStr);

  // Track original issued quantities when editing so available stock reflects what this voucher already holds
  const originalIssuedByMaterial = useMemo(() => {
    const map = new Map<string, number>();
    if (!initialVoucher) return map;
    for (const item of initialVoucher.items) {
      map.set(
        item.materialId,
        (map.get(item.materialId) || 0) + item.issuedQty
      );
    }
    return map;
  }, [initialVoucher]);

  useEffect(() => {
    if (!open) return;

    if (initialVoucher) {
      setVoucherNo(initialVoucher.voucherNo);
      setDate(initialVoucher.date);
      setRecipientTitle(initialVoucher.recipientTitle);
      setPurpose(initialVoucher.purpose);
      setPhone(initialVoucher.phone);
      setItems(initialVoucher.items.map((it) => ({ ...it })));
      setRequesterName(initialVoucher.requesterName);
      setRequesterTitle(initialVoucher.requesterTitle);
      setRequesterDate(initialVoucher.requesterDate);
      setIssuerName(initialVoucher.issuerName);
      setIssuerTitle(initialVoucher.issuerTitle);
      setIssuerDate(initialVoucher.issuerDate);
      setApproverName(initialVoucher.approverName);
      setApproverTitle(initialVoucher.approverTitle);
      setApproverDate(initialVoucher.approverDate);
      setReceiverName(initialVoucher.receiverName);
      setReceiverTitle(initialVoucher.receiverTitle);
      setReceiverDate(initialVoucher.receiverDate);
    } else {
      const paddedSeq = String(nextVoucherSeq).padStart(3, '0');
      setVoucherNo(`บว.${paddedSeq}/${agency.fiscalYearBE}`);
      setDate(todayStr);
      setRecipientTitle('หัวหน้าหน่วยพัสดุ');
      setPurpose('');
      setPhone('');

      const firstMat = selectableMaterials[0];
      setItems(
        firstMat
          ? [
              {
                id: `ri-${Date.now()}`,
                materialId: firstMat.id,
                materialCode: firstMat.code,
                materialName: firstMat.name,
                unit: firstMat.unit,
                requestedQty: 1,
                issuedQty: 1,
                remainingAfter: Math.max(0, firstMat.remainingQty - 1),
                unitPrice:
                  firstMat.usedUnitPrice ||
                  firstMat.purchasedUnitPrice ||
                  firstMat.beginningUnitPrice ||
                  0,
              },
            ]
          : []
      );

      setRequesterName('');
      setRequesterTitle('');
      setRequesterDate(todayStr);
      setIssuerName(agency.preparerName || '');
      setIssuerTitle(agency.preparerTitle || 'เจ้าพนักงานพัสดุ');
      setIssuerDate(todayStr);
      setApproverName(agency.reviewerName || '');
      setApproverTitle('หัวหน้าหน่วยพัสดุ');
      setApproverDate(todayStr);
      setReceiverName('');
      setReceiverTitle('');
      setReceiverDate(todayStr);
    }
  }, [open, initialVoucher, agency, nextVoucherSeq, selectableMaterials, todayStr]);

  if (!open) return null;

  const getAvailableBeforeThisVoucher = (materialId: string): number => {
    const mat = selectableMaterials.find((m) => m.id === materialId);
    const currentRem = mat ? mat.remainingQty : 0;
    const prevIssued = originalIssuedByMaterial.get(materialId) || 0;
    return currentRem + prevIssued;
  };

  const handleAddRow = () => {
    const firstMat = selectableMaterials[0];
    if (!firstMat) return;
    const avail = getAvailableBeforeThisVoucher(firstMat.id);
    setItems((prev) => [
      ...prev,
      {
        id: `ri-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        materialId: firstMat.id,
        materialCode: firstMat.code,
        materialName: firstMat.name,
        unit: firstMat.unit,
        requestedQty: 1,
        issuedQty: 1,
        remainingAfter: avail - 1,
        unitPrice:
          firstMat.usedUnitPrice ||
          firstMat.purchasedUnitPrice ||
          firstMat.beginningUnitPrice ||
          0,
      },
    ]);
  };

  const handleMaterialChange = (rowId: string, materialId: string) => {
    const mat = selectableMaterials.find((m) => m.id === materialId);
    if (!mat) return;
    const avail = getAvailableBeforeThisVoucher(mat.id);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== rowId) return it;
        return {
          ...it,
          materialId: mat.id,
          materialCode: mat.code,
          materialName: mat.name,
          unit: mat.unit,
          remainingAfter: avail - it.issuedQty,
          unitPrice:
            mat.usedUnitPrice ||
            mat.purchasedUnitPrice ||
            mat.beginningUnitPrice ||
            0,
        };
      })
    );
  };

  const handleQtyChange = (
    rowId: string,
    field: 'requestedQty' | 'issuedQty',
    value: number
  ) => {
    const cleanVal = Math.max(0, value);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== rowId) return it;
        const avail = getAvailableBeforeThisVoucher(it.materialId);
        if (field === 'requestedQty') {
          const nextIssued =
            !initialVoucher && it.issuedQty === it.requestedQty
              ? cleanVal
              : it.issuedQty;
          return {
            ...it,
            requestedQty: cleanVal,
            issuedQty: nextIssued,
            remainingAfter: avail - nextIssued,
          };
        }
        return {
          ...it,
          issuedQty: cleanVal,
          remainingAfter: avail - cleanVal,
        };
      })
    );
  };

  const handleRemoveRow = (rowId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== rowId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const nowIso = new Date().toISOString();
    const voucher: RequisitionVoucher = {
      id: initialVoucher?.id || `req-${Date.now()}`,
      voucherNo: voucherNo.trim() || `บว.${nextVoucherSeq}/${agency.fiscalYearBE}`,
      date,
      recipientTitle: recipientTitle.trim() || 'หัวหน้าหน่วยพัสดุ',
      purpose: purpose.trim(),
      phone: phone.trim(),
      items,
      requesterName: requesterName.trim(),
      requesterTitle: requesterTitle.trim(),
      requesterDate,
      issuerName: issuerName.trim(),
      issuerTitle: issuerTitle.trim(),
      issuerDate,
      approverName: approverName.trim(),
      approverTitle: approverTitle.trim(),
      approverDate,
      receiverName: receiverName.trim(),
      receiverTitle: receiverTitle.trim(),
      receiverDate,
      createdAt: initialVoucher?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    onSave(voucher);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-6 w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialVoucher ? `แก้ไขใบเบิกวัสดุ (${initialVoucher.voucherNo})` : 'สร้างใบเบิกวัสดุใหม่'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบจะตัดยอดคงเหลือและอัปเดตช่อง (3) วัสดุใช้ไปในบัญชีวัสดุประจำปีให้อัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Voucher Header */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เลขที่ใบเบิก *
              </label>
              <input
                type="text"
                required
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                วันที่เบิกวัสดุ *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เรียน
              </label>
              <input
                type="text"
                value={recipientTitle}
                onChange={(e) => setRecipientTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 0-2345-6789"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เพื่อใช้งานราชการ (หน่วยงาน / วัตถุประสงค์) *
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="เช่น งานสารบรรณและบริหารทั่วไป หรือ กิจกรรมบริการผู้ป่วย"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Requisition Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800">
                รายการสิ่งของที่ขอเบิก ({items.length} รายการ)
              </h3>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={selectableMaterials.length === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5 text-teal-700" />
                เพิ่มแถววัสดุ
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 text-center w-12">ลำดับ</th>
                    <th className="px-3 py-2 text-left min-w-[230px]">
                      รายการสิ่งของ (รหัส · คงเหลือ)
                    </th>
                    <th className="px-2 py-2 text-center w-20">หน่วยนับ</th>
                    <th className="px-2 py-2 text-right w-24">จำนวนเบิก</th>
                    <th className="px-2 py-2 text-right w-24">จำนวนจ่าย</th>
                    <th className="px-3 py-2 text-right w-28">คงเหลือหลังจ่าย</th>
                    <th className="px-2 py-2 text-center w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const overStock = item.remainingAfter < 0;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-center font-mono-tabular text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.materialId}
                            onChange={(e) =>
                              handleMaterialChange(item.id, e.target.value)
                            }
                            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          >
                            {selectableMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.code} · {m.name} (คงเหลือ{' '}
                                {formatNumber(getAvailableBeforeThisVoucher(m.id))}{' '}
                                {m.unit})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center text-slate-600">
                          {item.unit}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.requestedQty}
                            onChange={(e) =>
                              handleQtyChange(
                                item.id,
                                'requestedQty',
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-right font-mono-tabular text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.issuedQty}
                            onChange={(e) =>
                              handleQtyChange(
                                item.id,
                                'issuedQty',
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-right font-mono-tabular text-xs"
                          />
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono-tabular font-semibold ${
                            overStock ? 'text-red-600' : 'text-teal-800'
                          }`}
                        >
                          {formatNumber(item.remainingAfter)} {item.unit}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(item.id)}
                            disabled={items.length <= 1}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                            aria-label="ลบแถว"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {items.some((i) => i.remainingAfter < 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                หมายเหตุ: มีบางรายการที่จำนวนจ่ายมากกว่าคงเหลือในคลัง (ยอดคงเหลือหลังจ่ายติดลบ)
              </div>
            )}
          </div>

          {/* 4-Role Signatory Inputs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                1. ผู้เบิก (หัวหน้ากลุ่ม/งาน)
              </div>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="ชื่อ-สกุล (ตัวบรรจง)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={requesterTitle}
                  onChange={(e) => setRequesterTitle(e.target.value)}
                  placeholder="ตำแหน่ง"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={requesterDate}
                  onChange={(e) => setRequesterDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                2. ผู้จ่ายวัสดุ
              </div>
              <input
                type="text"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="ชื่อ-สกุล (ตัวบรรจง)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={issuerTitle}
                  onChange={(e) => setIssuerTitle(e.target.value)}
                  placeholder="ตำแหน่ง"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={issuerDate}
                  onChange={(e) => setIssuerDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                3. ผู้สั่งจ่าย (อนุมัติให้จ่ายได้)
              </div>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="ชื่อ-สกุล (ตัวบรรจง)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={approverTitle}
                  onChange={(e) => setApproverTitle(e.target.value)}
                  placeholder="ตำแหน่ง"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={approverDate}
                  onChange={(e) => setApproverDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                4. ผู้รับวัสดุ
              </div>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="ชื่อ-สกุล (ตัวบรรจง)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={receiverTitle}
                  onChange={(e) => setReceiverTitle(e.target.value)}
                  placeholder="ตำแหน่ง"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={receiverDate}
                  onChange={(e) => setReceiverDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={items.length === 0}
              className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
            >
              {initialVoucher ? 'บันทึกการแก้ไขใบเบิก' : 'บันทึกใบเบิกและตัดสต็อก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
