import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import { ComputedMaterialRow } from '../types/inventory';
import { formatCurrency } from '../utils/calculations';

interface StockMovementModalProps {
  open: boolean;
  material: ComputedMaterialRow | null;
  defaultType?: 'purchase' | 'use';
  onSubmit: (payload: {
    materialId: string;
    type: 'purchase' | 'use';
    qty: number;
    unitPrice: number;
    date: string;
    note: string;
    docNo?: string;
    counterparty?: string;
  }) => void;
  onClose: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  open,
  material,
  defaultType = 'use',
  onSubmit,
  onClose,
}) => {
  const [type, setType] = useState<'purchase' | 'use'>(defaultType);
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [docNo, setDocNo] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !material) return;
    setType(defaultType);
    setQty(
      defaultType === 'purchase' && material.suggestedRestockQty > 0
        ? material.suggestedRestockQty
        : 1
    );
    const defaultPrice =
      defaultType === 'purchase'
        ? material.purchasedUnitPrice || material.beginningUnitPrice
        : material.usedUnitPrice || material.purchasedUnitPrice || material.beginningUnitPrice;
    setUnitPrice(defaultPrice);
    setDate(new Date().toISOString().slice(0, 10));
    setDocNo('');
    setCounterparty(
      defaultType === 'purchase'
        ? 'จัดซื้อเข้าคลัง / ผู้จำหน่าย'
        : 'กลุ่มงานบริหารทั่วไป'
    );
    setNote(
      defaultType === 'purchase'
        ? 'จัดซื้อเพิ่มเติมเข้าคลัง'
        : 'เบิกจ่ายใช้งานประจำเดือน'
    );
  }, [open, material, defaultType]);

  if (!open || !material) return null;

  const totalAmount = qty * unitPrice;
  const projectedRemaining =
    type === 'purchase' ? material.remainingQty + qty : material.remainingQty - qty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) return;
    onSubmit({
      materialId: material.id,
      type,
      qty,
      unitPrice,
      date,
      docNo: docNo.trim() || undefined,
      counterparty: counterparty.trim() || undefined,
      note: note.trim() || (type === 'purchase' ? 'รับเข้าคลัง' : 'เบิกจ่ายวัสดุ'),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              บันทึกเคลื่อนไหวสต็อกวัสดุ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รหัส {material.code} · {material.name} (คงเหลือปัจจุบัน{' '}
              <span className="font-mono-tabular font-semibold text-slate-800">
                {material.remainingQty} {material.unit}
              </span>
              )
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100">
            <button
              type="button"
              onClick={() => {
                setType('purchase');
                setUnitPrice(material.purchasedUnitPrice || material.beginningUnitPrice);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                type === 'purchase'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              จัดซื้อ / รับเข้า (2)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('use');
                setUnitPrice(
                  material.usedUnitPrice ||
                    material.purchasedUnitPrice ||
                    material.beginningUnitPrice
                );
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                type === 'use'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              วัสดุใช้ไป / เบิกจ่าย (3)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                จำนวน ({material.unit})
              </label>
              <input
                type="number"
                required
                min={0.01}
                step="any"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ราคาต่อหน่วย (บาท)
              </label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">วันที่</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {type === 'purchase' ? 'รับจาก (ผู้จำหน่าย / หน่วยงาน)' : 'จ่ายให้ (ฝ่าย / ผู้เบิก)'}
              </label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder={type === 'purchase' ? 'เช่น บริษัท/ร้านค้า หรือ กรม' : 'เช่น ฝ่ายบริหารทั่วไป'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                เลขที่เอกสาร
              </label>
              <input
                type="text"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                placeholder={type === 'purchase' ? 'เช่น สซ.015/2569' : 'เช่น บว.003/2569'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              หมายเหตุ / รายละเอียดเพิ่มเติม
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              มูลค่ารายการ:{' '}
              <strong className="font-mono-tabular text-slate-900">
                {formatCurrency(totalAmount)} บาท
              </strong>
            </span>
            <span className="text-slate-600">
              คงเหลือหลังบันทึก:{' '}
              <strong
                className={`font-mono-tabular ${
                  projectedRemaining < 0 ? 'text-red-600' : 'text-teal-700'
                }`}
              >
                {projectedRemaining.toLocaleString('th-TH')} {material.unit}
              </strong>
            </span>
          </div>

          {type === 'use' && projectedRemaining < 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              คำเตือน: จำนวนที่เบิกใช้มากกว่ายอดคงเหลือในคลังปัจจุบัน
            </div>
          )}

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
              className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 whitespace-nowrap"
            >
              บันทึกรายการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
