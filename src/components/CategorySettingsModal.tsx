import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { DEFAULT_MATERIAL_CATEGORIES, MaterialEntry } from '../types/inventory';

interface CategorySettingsModalProps {
  open: boolean;
  categories: string[];
  materials: MaterialEntry[];
  onAddCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onReorderCategory: (index: number, direction: 'up' | 'down') => void;
  onDeleteCategory: (name: string, reassignTo: string) => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

export const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({
  open,
  categories,
  materials,
  onAddCategory,
  onRenameCategory,
  onReorderCategory,
  onDeleteCategory,
  onResetDefaults,
  onClose,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  if (!open) return null;

  const getItemCount = (cat: string) =>
    materials.filter((m) => m.category === cat && !m.isPriceVariant).length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setErrorMsg('กรุณากรอกชื่อประเภทวัสดุ');
      return;
    }
    if (categories.includes(trimmed)) {
      setErrorMsg('มีชื่อประเภทวัสดุนี้อยู่แล้วในระบบ');
      return;
    }
    onAddCategory(trimmed);
    setNewCategoryName('');
    setErrorMsg(null);
  };

  const startEdit = (cat: string) => {
    setEditingName(cat);
    setEditDraft(cat);
    setDeletingName(null);
    setErrorMsg(null);
  };

  const saveEdit = (oldName: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setErrorMsg('ชื่อประเภทวัสดุต้องไม่ว่างเปล่า');
      return;
    }
    if (trimmed !== oldName && categories.includes(trimmed)) {
      setErrorMsg('มีชื่อประเภทวัสดุนี้อยู่แล้ว');
      return;
    }
    if (trimmed !== oldName) {
      onRenameCategory(oldName, trimmed);
    }
    setEditingName(null);
    setErrorMsg(null);
  };

  const startDelete = (cat: string) => {
    if (categories.length <= 1) {
      setErrorMsg('ต้องมีประเภทวัสดุอย่างน้อย 1 ประเภทในระบบ');
      return;
    }
    const fallback = categories.find((c) => c !== cat) || '';
    const count = getItemCount(cat);
    if (count === 0) {
      onDeleteCategory(cat, fallback);
      setErrorMsg(null);
      return;
    }
    setDeletingName(cat);
    setReassignTarget(fallback);
    setEditingName(null);
    setErrorMsg(null);
  };

  const confirmDelete = () => {
    if (!deletingName || !reassignTarget) return;
    onDeleteCategory(deletingName, reassignTarget);
    setDeletingName(null);
    setReassignTarget('');
  };

  const hasMissingDefaults = DEFAULT_MATERIAL_CATEGORIES.some(
    (def) => !categories.includes(def)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-settings-title"
    >
      <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="category-settings-title"
              className="text-base font-semibold text-slate-900"
            >
              ตั้งค่าประเภทวัสดุ ({categories.length} หมวดหมู่)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เพิ่ม แก้ไขชื่อ จัดลำดับ หรือลบประเภทวัสดุที่ใช้ในแบบบัญชีรายงานวัสดุประจำปี
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

        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="ระบุชื่อประเภทวัสดุใหม่ เช่น วัสดุคอมพิวเตอร์, วัสดุการเกษตร..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              เพิ่มประเภท
            </button>
          </form>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Reassign & Delete Inline Confirmation */}
          {deletingName && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="text-xs font-semibold text-amber-900">
                ประเภท "{deletingName}" มีรายการวัสดุใช้งานอยู่ {getItemCount(deletingName)} รายการ
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-xs text-amber-800 whitespace-nowrap">
                  ย้ายรายการทั้งหมดไปยัง:
                </label>
                <select
                  value={reassignTarget}
                  onChange={(e) => setReassignTarget(e.target.value)}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs"
                >
                  {categories
                    .filter((c) => c !== deletingName)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeletingName(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    ย้ายและลบประเภท
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {categories.map((cat, idx) => {
              const count = getItemCount(cat);
              const isEditing = editingName === cat;
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-mono-tabular text-xs text-slate-400 w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit(cat);
                          } else if (e.key === 'Escape') {
                            setEditingName(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 rounded-md border border-teal-600 px-2.5 py-1 text-sm focus:outline-none"
                      />
                    ) : (
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {cat}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {count} รายการในบัญชี
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(cat)}
                          title="บันทึกชื่อใหม่"
                          className="rounded p-1.5 text-teal-700 hover:bg-teal-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingName(null)}
                          title="ยกเลิก"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onReorderCategory(idx, 'up')}
                          disabled={idx === 0}
                          title="เลื่อนขึ้น"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onReorderCategory(idx, 'down')}
                          disabled={idx === categories.length - 1}
                          title="เลื่อนลง"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          title="แก้ไขชื่อประเภท"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startDelete(cat)}
                          disabled={categories.length <= 1}
                          title="ลบประเภท"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            {hasMissingDefaults ? (
              <button
                type="button"
                onClick={() => {
                  onResetDefaults();
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-teal-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                เพิ่มประเภทมาตรฐานที่ขาดให้ครบ 7 หมวด
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                การเปลี่ยนชื่อประเภทจะอัปเดตรายการวัสดุที่เกี่ยวข้องให้อัตโนมัติ
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
