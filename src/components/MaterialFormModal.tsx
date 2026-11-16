import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { MaterialCategory, MaterialEntry } from '../types/inventory';
import { formatCurrency } from '../utils/calculations';

interface MaterialFormModalProps {
  open: boolean;
  initialEntry: MaterialEntry | null;
  presetVariantParent?: MaterialEntry | null;
  categories: string[];
  defaultCategory: MaterialCategory;
  onSave: (entry: MaterialEntry) => void;
  onClose: () => void;
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  open,
  initialEntry,
  presetVariantParent,
  categories,
  defaultCategory,
  onSave,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>(defaultCategory);
  const [unit, setUnit] = useState('รีม');
  const [isPriceVariant, setIsPriceVariant] = useState(false);

  const [beginningQty, setBeginningQty] = useState(0);
  const [beginningUnitPrice, setBeginningUnitPrice] = useState(0);
  const [purchasedQty, setPurchasedQty] = useState(0);
  const [purchasedUnitPrice, setPurchasedUnitPrice] = useState(0);
  const [usedQty, setUsedQty] = useState(0);
  const [usedUnitPrice, setUsedUnitPrice] = useState(0);
  const [minThreshold, setMinThreshold] = useState(10);

  const [depEnabled, setDepEnabled] = useState(false);
  const [depMode, setDepMode] = useState<'ending' | 'total_in' | 'custom'>('ending');
  const [depCustomCost, setDepCustomCost] = useState(0);
  const [depSalvage, setDepSalvage] = useState(1);
  const [depLife, setDepLife] = useState(5);
  const [depElapsed, setDepElapsed] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;

    if (initialEntry) {
      setCode(initialEntry.code);
      setName(initialEntry.name);
      setCategory(initialEntry.category);
      setUnit(initialEntry.unit);
      setIsPriceVariant(Boolean(initialEntry.isPriceVariant));
      setBeginningQty(initialEntry.beginningQty);
      setBeginningUnitPrice(initialEntry.beginningUnitPrice);
      setPurchasedQty(initialEntry.purchasedQty);
      setPurchasedUnitPrice(initialEntry.purchasedUnitPrice);
      setUsedQty(initialEntry.usedQty);
      setUsedUnitPrice(initialEntry.usedUnitPrice);
      setMinThreshold(initialEntry.minThreshold);
      setDepEnabled(initialEntry.depreciation.enabled);
      setDepMode(initialEntry.depreciation.costBasisMode);
      setDepCustomCost(initialEntry.depreciation.customCostBasis);
      setDepSalvage(initialEntry.depreciation.salvageValue);
      setDepLife(initialEntry.depreciation.usefulLifeYears);
      setDepElapsed(initialEntry.depreciation.elapsedYears);
      setNote(initialEntry.note || '');
    } else if (presetVariantParent) {
      setCode(presetVariantParent.code);
      setName('(กรณีมีต่างราคา)');
      setCategory(presetVariantParent.category);
      setUnit(presetVariantParent.unit);
      setIsPriceVariant(true);
      setBeginningQty(0);
      setBeginningUnitPrice(0);
      setPurchasedQty(0);
      setPurchasedUnitPrice(presetVariantParent.purchasedUnitPrice);
      setUsedQty(0);
      setUsedUnitPrice(presetVariantParent.purchasedUnitPrice);
      setMinThreshold(0);
      setDepEnabled(false);
      setDepMode('ending');
      setDepCustomCost(0);
      setDepSalvage(1);
      setDepLife(5);
      setDepElapsed(1);
      setNote('');
    } else {
      setCode('');
      setName('');
      setCategory(defaultCategory);
      setUnit('ชิ้น');
      setIsPriceVariant(false);
      setBeginningQty(0);
      setBeginningUnitPrice(0);
      setPurchasedQty(0);
      setPurchasedUnitPrice(0);
      setUsedQty(0);
      setUsedUnitPrice(0);
      setMinThreshold(10);
      setDepEnabled(false);
      setDepMode('ending');
      setDepCustomCost(0);
      setDepSalvage(1);
      setDepLife(5);
      setDepElapsed(1);
      setNote('');
    }
  }, [open, initialEntry, presetVariantParent, defaultCategory]);

  if (!open) return null;

  const begTotal = beginningQty * beginningUnitPrice;
  const purTotal = purchasedQty * purchasedUnitPrice;
  const useTotal = usedQty * usedUnitPrice;
  const remQty = beginningQty + purchasedQty - usedQty;
  const remTotal = begTotal + purTotal - useTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const entry: MaterialEntry = {
      id: initialEntry?.id || `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: code.trim(),
      name: name.trim(),
      category,
      unit: unit.trim() || 'หน่วย',
      isPriceVariant,
      parentCode: isPriceVariant ? code.trim() : undefined,
      beginningQty: Number(beginningQty) || 0,
      beginningUnitPrice: Number(beginningUnitPrice) || 0,
      purchasedQty: Number(purchasedQty) || 0,
      purchasedUnitPrice: Number(purchasedUnitPrice) || 0,
      usedQty: Number(usedQty) || 0,
      usedUnitPrice: Number(usedUnitPrice) || 0,
      minThreshold: isPriceVariant ? 0 : Math.max(0, Number(minThreshold) || 0),
      depreciation: {
        enabled: depEnabled,
        costBasisMode: depMode,
        customCostBasis: Math.max(0, Number(depCustomCost) || 0),
        salvageValue: Math.max(0, Number(depSalvage) || 0),
        usefulLifeYears: Math.max(1, Number(depLife) || 1),
        elapsedYears: Math.max(0, Number(depElapsed) || 0),
      },
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSave(entry);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {initialEntry
              ? 'แก้ไขรายการวัสดุ'
              : presetVariantParent
              ? `เพิ่มล็อตราคาต่าง (${presetVariantParent.code} · ${presetVariantParent.name})`
              : 'เพิ่มรายการวัสดุใหม่'}
          </h2>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสวัสดุ *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น 1001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รายการวัสดุ *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น กระดาษ A4 (80 แกรม)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                หน่วยนับ *
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="เช่น รีม, กล่อง, แกลลอน"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ประเภทหมวดหมู่วัสดุ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {category && !categories.includes(category) && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>
            {!isPriceVariant && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  จุดแจ้งเตือนใกล้หมด ({unit})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is-price-variant"
              type="checkbox"
              checked={isPriceVariant}
              onChange={(e) => setIsPriceVariant(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <label htmlFor="is-price-variant" className="text-xs text-slate-700">
              เป็นรายการย่อย (กรณีมีต่างราคา) ภายใต้รหัสวัสดุเดียวกัน
            </label>
          </div>

          {/* 3 Accounting Columns (1), (2), (3) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                (1) ยอดคงเหลือยกมา 1 ต.ค.
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">จำนวน ({unit})</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={beginningQty}
                  onChange={(e) => setBeginningQty(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={beginningUnitPrice}
                  onChange={(e) => setBeginningUnitPrice(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div className="pt-1 border-t border-slate-200 flex justify-between text-xs">
                <span className="text-slate-500">ราคารวม (1)</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatCurrency(begTotal)} ฿
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                (2) จัดซื้อ / รับจากกรม
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">จำนวน ({unit})</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={purchasedQty}
                  onChange={(e) => setPurchasedQty(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={purchasedUnitPrice}
                  onChange={(e) => setPurchasedUnitPrice(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div className="pt-1 border-t border-slate-200 flex justify-between text-xs">
                <span className="text-slate-500">ราคารวม (2)</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatCurrency(purTotal)} ฿
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800">
                (3) วัสดุใช้ไป / จ่ายไป
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">จำนวน ({unit})</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={usedQty}
                  onChange={(e) => setUsedQty(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={usedUnitPrice}
                  onChange={(e) => setUsedUnitPrice(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono-tabular"
                />
              </div>
              <div className="pt-1 border-t border-slate-200 flex justify-between text-xs">
                <span className="text-slate-500">ราคารวม (3)</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatCurrency(useTotal)} ฿
                </span>
              </div>
            </div>
          </div>

          {/* Auto-computed summary (4) */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-3">
            <div className="text-xs text-slate-700">
              <span className="font-semibold">(4) คงเหลือคำนวณอัตโนมัติ:</span>{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                {remQty.toLocaleString('th-TH')} {unit}
              </span>
            </div>
            <div className="text-xs text-slate-700">
              <span>มูลค่าคงเหลือสุทธิ (1)+(2)-(3): </span>
              <span className="font-mono-tabular text-sm font-bold text-teal-800">
                {formatCurrency(remTotal)} บาท
              </span>
            </div>
          </div>

          {/* Straight-line Depreciation Toggle */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={depEnabled}
                  onChange={(e) => setDepEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                เปิดใช้งานการคำนวณค่าเสื่อมราคาแบบเส้นตรงรายปีสำหรับรายการนี้
              </label>
            </div>

            {depEnabled && (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">ฐานราคาทุน</label>
                  <select
                    value={depMode}
                    onChange={(e) =>
                      setDepMode(e.target.value as 'ending' | 'total_in' | 'custom')
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="ending">มูลค่าคงเหลือ (4)</option>
                    <option value="total_in">มูลค่ารวมเข้าคลัง (1)+(2)</option>
                    <option value="custom">กำหนดราคาทุนเอง</option>
                  </select>
                </div>
                {depMode === 'custom' && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      ราคาทุนตั้งต้น (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={depCustomCost}
                      onChange={(e) => setDepCustomCost(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono-tabular"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-600 mb-1">มูลค่าซาก (บาท)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={depSalvage}
                    onChange={(e) => setDepSalvage(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    อายุการใช้งาน (ปี)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={depLife}
                    onChange={(e) => setDepLife(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    ปีที่ใช้งานแล้ว (ปี)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={depElapsed}
                    onChange={(e) => setDepElapsed(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono-tabular"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติมหรือเลขที่เอกสารอ้างอิง"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
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
              className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 whitespace-nowrap"
            >
              {initialEntry ? 'บันทึกการแก้ไข' : 'เพิ่มรายการวัสดุ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
