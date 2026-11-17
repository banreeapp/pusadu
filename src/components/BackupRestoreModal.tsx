import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileJson,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import {
  InventoryBackupData,
  InventoryBackupPayload,
  ParseBackupResult,
  parseAndValidateBackupJson,
} from '../utils/backupJson';

interface BackupRestoreModalProps {
  open: boolean;
  currentData: InventoryBackupData;
  lastBackupAt: string | null;
  onDownloadBackup: () => string;
  onRestoreBackup: (
    payload: InventoryBackupPayload,
    mode: 'replace' | 'merge'
  ) => {
    message: string;
  };
  onClose: () => void;
}

function formatThaiDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  open,
  currentData,
  lastBackupAt,
  onDownloadBackup,
  onRestoreBackup,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseBackupResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  if (!open) return null;

  const handleBackupClick = () => {
    const filename = onDownloadBackup();
    setStatusBanner({
      type: 'success',
      text: `ส่งออกไฟล์สำรองข้อมูล "${filename}" เรียบร้อยแล้ว`,
    });
  };

  const handleFileRead = async (file: File) => {
    setStatusBanner(null);
    setSelectedFileName(file.name);
    try {
      const text = await file.text();
      const result = parseAndValidateBackupJson(text);
      setParseResult(result);
    } catch {
      setParseResult({
        valid: false,
        error: 'ไม่สามารถอ่านไฟล์ได้ กรุณาลองเลือกไฟล์ใหม่อีกครั้ง',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileRead(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileRead(file);
    }
  };

  const handleConfirmRestore = () => {
    if (!parseResult || !parseResult.valid) return;
    const outcome = onRestoreBackup(parseResult.payload, restoreMode);
    setStatusBanner({
      type: 'success',
      text: outcome.message,
    });
    setParseResult(null);
    setSelectedFileName('');
  };

  const handleClearSelectedFile = () => {
    setParseResult(null);
    setSelectedFileName('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-restore-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="backup-restore-title"
                className="text-base font-bold text-slate-900"
              >
                สำรองและนำข้อมูลกลับมาใช้ (.json)
              </h2>
              <p className="text-xs text-slate-500">
                บันทึกข้อมูลบัญชีวัสดุทั้งหมดลงเครื่อง หรือกู้คืนข้อมูลจากไฟล์สำรองข้ามเครื่องได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {statusBanner && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
              <div className="font-medium leading-relaxed">{statusBanner.text}</div>
            </div>
          )}

          {/* Section 1: Export JSON Backup */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-teal-700" />
                  1. สำรองข้อมูลทั้งหมดเป็นไฟล์ .json
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  รวมข้อมูลหน่วยงาน ประเภทวัสดุ รายการวัสดุ ค่าเสื่อมราคา ประวัติรับ-จ่าย และใบเบิกวัสดุทั้งหมด
                </p>
              </div>
              {lastBackupAt && (
                <span className="text-[11px] text-slate-500">
                  สำรองล่าสุด: {formatThaiDateTime(lastBackupAt)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">รายการวัสดุ</div>
                <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900">
                  {currentData.materials.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">ประเภทวัสดุ</div>
                <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900">
                  {currentData.categories.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">ประวัติรับ-จ่าย</div>
                <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900">
                  {currentData.movements.length}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">ใบเบิกวัสดุ</div>
                <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900">
                  {currentData.requisitions.length}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-600 truncate">
                หน่วยงาน:{' '}
                <span className="font-medium text-slate-900">
                  {currentData.agency.agencyName}
                </span>{' '}
                (พ.ศ. {currentData.agency.fiscalYearBE})
              </div>
              <button
                type="button"
                onClick={handleBackupClick}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors shrink-0"
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลดไฟล์สำรอง (.json)
              </button>
            </div>
          </section>

          {/* Section 2: Import / Restore JSON */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="h-4 w-4 text-teal-700" />
                2. นำข้อมูลจากไฟล์ .json กลับมาใช้ (Restore)
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                เลือกไฟล์สำรองข้อมูลที่เคยส่งออกจากระบบ ระบบจะตรวจสอบความถูกต้องและแสดงตัวอย่างก่อนนำเข้า
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!parseResult || !parseResult.valid ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
                    isDragging
                      ? 'border-teal-600 bg-teal-50/70'
                      : 'border-slate-300 bg-slate-50/50 hover:border-teal-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white border border-slate-200 text-teal-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium text-slate-900">
                    คลิกเพื่อเลือกไฟล์ .json หรือลากไฟล์มาวางที่นี่
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    รองรับไฟล์สำรองข้อมูลจากระบบบัญชีวัสดุประจำปี (.json)
                  </div>
                </div>

                {parseResult && !parseResult.valid && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        ไม่สามารถอ่านไฟล์ {selectedFileName}
                      </div>
                      <div className="mt-0.5">{parseResult.error}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Preview Card */}
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-teal-800">
                        ตรวจสอบไฟล์สำรองเรียบร้อยพร้อมนำเข้า
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 font-mono-tabular">
                        ไฟล์: {selectedFileName} · สำรองเมื่อ{' '}
                        {formatThaiDateTime(parseResult.summary.exportedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      เลือกไฟล์ใหม่
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                    <div>
                      หน่วยงาน:{' '}
                      <strong className="text-slate-900">
                        {parseResult.summary.agencyName}
                      </strong>
                    </div>
                    <div className="mt-0.5 text-slate-500">
                      รหัสศูนย์ต้นทุน: {parseResult.summary.costCenterCode || '-'} ·
                      ปีงบประมาณ พ.ศ. {parseResult.summary.fiscalYearBE}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">วัสดุในไฟล์</div>
                      <div className="font-mono-tabular text-sm font-bold text-slate-900">
                        {parseResult.summary.materialCount} รายการ
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">ประเภทวัสดุ</div>
                      <div className="font-mono-tabular text-sm font-bold text-slate-900">
                        {parseResult.summary.categoryCount} หมวด
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">รับ-จ่าย</div>
                      <div className="font-mono-tabular text-sm font-bold text-slate-900">
                        {parseResult.summary.movementCount} รายการ
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] text-slate-500">ใบเบิกวัสดุ</div>
                      <div className="font-mono-tabular text-sm font-bold text-slate-900">
                        {parseResult.summary.requisitionCount} ใบ
                      </div>
                    </div>
                  </div>

                  {parseResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 space-y-0.5">
                      {parseResult.warnings.map((w, i) => (
                        <div key={i}>• {w}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Restore Mode Selector */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    เลือกรูปแบบการนำข้อมูลกลับมาใช้
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors ${
                        restoreMode === 'replace'
                          ? 'border-teal-600 bg-teal-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="mt-0.5 accent-teal-700"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">
                          แทนที่ข้อมูลทั้งหมด (แนะนำ)
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          กู้คืนข้อมูลทั้งหน่วยงาน หมวดหมู่ รายการวัสดุ รับ-จ่าย และใบเบิกแทนที่ชุดปัจจุบัน
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors ${
                        restoreMode === 'merge'
                          ? 'border-teal-600 bg-teal-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="mt-0.5 accent-teal-700"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">
                          ผสานเพิ่มเฉพาะรายการใหม่
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-600">
                          เก็บข้อมูลปัจจุบันไว้ แล้วเพิ่มเฉพาะรายการวัสดุ ประวัติ และใบเบิกที่ ID ยังไม่ซ้ำ
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleBackupClick}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    สำรองชุดปัจจุบันก่อน
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      ยกเลิกไฟล์นี้
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRestore}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      ยืนยันนำข้อมูลกลับมาใช้
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
