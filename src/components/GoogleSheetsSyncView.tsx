import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderSearch,
  LogOut,
  RefreshCw,
  Upload,
} from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  MaterialCategory,
  MaterialEntry,
} from '../types/inventory';
import {
  createAndExportLedgerSheet,
  getSpreadsheetMetadata,
  importFromGoogleSheet,
  SpreadsheetMetadata,
  updateExistingSheet,
} from '../services/googleSheets';
import { ConfirmModal } from './ConfirmModal';

interface GoogleSheetsSyncViewProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  getToken: () => Promise<string | null>;
  onRequireReauth: () => void;
  agency: AgencyProfile;
  rows: ComputedMaterialRow[];
  categories: string[];
  selectedCategory: MaterialCategory | 'all';
  onImportEntries: (entries: MaterialEntry[], mode: 'merge' | 'replace') => void;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  getToken,
  onRequireReauth,
  agency,
  rows,
  categories,
  selectedCategory,
  onImportEntries,
}) => {
  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    link?: string;
  } | null>(null);

  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);
  const [importedPreview, setImportedPreview] = useState<MaterialEntry[] | null>(
    null
  );
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const categoryLabel =
    selectedCategory === 'all'
      ? `ทุกหมวดหมู่ (${categories.join('/')})`
      : selectedCategory;

  const ensureToken = async (): Promise<string | null> => {
    const token = await getToken();
    if (!token) {
      onRequireReauth();
      setStatusMessage({
        type: 'error',
        text: 'กรุณาลงชื่อเข้าใช้ด้วย Google เพื่อรับสิทธิ์เข้าถึง Google Sheets ก่อนดำเนินการ',
      });
      return null;
    }
    return token;
  };

  const handleCreateNewSheet = async () => {
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('create');
    setStatusMessage(null);
    try {
      const result = await createAndExportLedgerSheet(
        token,
        agency,
        rows,
        categoryLabel
      );
      setSheetUrlOrId(result.spreadsheetUrl);
      setStatusMessage({
        type: 'success',
        text: `สร้างสเปรดชีต "${result.title}" และส่งออกข้อมูล ${rows.length} รายการเรียบร้อยแล้ว`,
        link: result.spreadsheetUrl,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้าง Google Sheet';
      setStatusMessage({ type: 'error', text: message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadMetadata = async () => {
    if (!sheetUrlOrId.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาวางลิงก์ Google Sheets หรือรหัส Spreadsheet ID',
      });
      return;
    }
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('inspect');
    setStatusMessage(null);
    try {
      const meta = await getSpreadsheetMetadata(token, sheetUrlOrId);
      setMetadata(meta);
      setSelectedTab(meta.sheets[0]?.title || '');
      setStatusMessage({
        type: 'success',
        text: `พบสเปรดชีต "${meta.title}" (${meta.sheets.length} แท็บ)`,
        link: meta.spreadsheetUrl,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ไม่สามารถอ่านข้อมูลสเปรดชีตได้';
      setStatusMessage({ type: 'error', text: message });
      setMetadata(null);
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmedOverwrite = async () => {
    if (!metadata || !selectedTab) return;
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('overwrite');
    setStatusMessage(null);
    try {
      await updateExistingSheet(
        token,
        metadata.spreadsheetId,
        selectedTab,
        agency,
        rows,
        categoryLabel
      );
      setConfirmOverwriteOpen(false);
      setStatusMessage({
        type: 'success',
        text: `อัปเดตข้อมูลบัญชีวัสดุ (${rows.length} รายการ) ลงในแท็บ "${selectedTab}" ของ "${metadata.title}" สำเร็จแล้ว`,
        link: metadata.spreadsheetUrl,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ไม่สามารถอัปเดต Google Sheet ได้';
      setStatusMessage({ type: 'error', text: message });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePreviewImport = async () => {
    if (!metadata || !selectedTab) return;
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('import');
    setStatusMessage(null);
    try {
      const parsed = await importFromGoogleSheet(
        token,
        metadata.spreadsheetId,
        selectedTab
      );
      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `ไม่พบแถวรายการวัสดุในแท็บ "${selectedTab}" กรุณาตรวจสอบหัวตาราง (รหัสวัสดุ, รายการ)`,
        });
      } else {
        setImportedPreview(parsed);
        setConfirmImportOpen(true);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ไม่สามารถนำเข้าข้อมูลจาก Google Sheet ได้';
      setStatusMessage({ type: 'error', text: message });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              เชื่อมต่อบัญชี Google Sheets
            </h2>
            <p className="text-xs text-slate-500">
              ส่งออกแบบบัญชีรายงานวัสดุประจำปี (เอกสารหมายเลข 1) และตารางค่าเสื่อมราคาไปยัง Google Sheets ของคุณโดยตรง หรือดึงข้อมูลจากชีตที่มีอยู่
            </p>
          </div>

          {needsAuth || !user ? (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state" />
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900">
                  {user.displayName || 'บัญชี Google'}
                </div>
                <div className="text-[11px] text-slate-500">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.link && (
            <a
              href={statusMessage.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:no-underline whitespace-nowrap"
            >
              เปิดใน Google Sheets
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Two-Column Action Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Option 1: Create New Spreadsheet */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileSpreadsheet className="h-4 w-4 text-teal-700" />
              สร้างสเปรดชีตใหม่พร้อมส่งออกรายงานทันที
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ระบบจะสร้างไฟล์ Google Sheets ใหม่ในบัญชีของคุณ พร้อมจัดวางแท็บ{' '}
              <strong className="text-slate-700">แบบบัญชีวัสดุประจำปี</strong> (เอกสารหมายเลข 1)
              และแท็บ{' '}
              <strong className="text-slate-700">ค่าเสื่อมราคาเส้นตรง</strong> ให้อัตโนมัติ
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <div>
                หน่วยงาน: <strong className="text-slate-800">{agency.agencyName}</strong>
              </div>
              <div>
                จำนวนรายการที่ส่งออก:{' '}
                <strong className="font-mono-tabular text-slate-800">
                  {rows.length} แถว
                </strong>{' '}
                · ปีงบประมาณ พ.ศ. {agency.fiscalYearBE}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNewSheet}
            disabled={needsAuth || busyAction !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {busyAction === 'create'
              ? 'กำลังสร้าง Google Sheet...'
              : 'สร้าง Google Sheet ใหม่และส่งออก'}
          </button>
        </div>

        {/* Option 2: Connect Existing Spreadsheet */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FolderSearch className="h-4 w-4 text-teal-700" />
              เชื่อมโยงสเปรดชีตที่มีอยู่ (อัปเดต / นำเข้า)
            </div>
            <p className="text-xs text-slate-500">
              วาง URL ของ Google Sheets หรือ Spreadsheet ID เพื่อตรวจสอบรายชื่อแท็บในไฟล์จริง
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={sheetUrlOrId}
              onChange={(e) => setSheetUrlOrId(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleLoadMetadata}
              disabled={needsAuth || busyAction !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${busyAction === 'inspect' ? 'animate-spin' : ''}`}
              />
              ตรวจสอบไฟล์
            </button>
          </div>

          {metadata && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900 truncate">
                  {metadata.title}
                </span>
                <a
                  href={metadata.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline whitespace-nowrap"
                >
                  เปิดชีต
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  เลือกแท็บ (Sheet Tab)
                </label>
                <select
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  {metadata.sheets.map((s) => (
                    <option key={s.sheetId} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmOverwriteOpen(true)}
                  disabled={!selectedTab || busyAction !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  เขียนอัปเดตลงแท็บนี้
                </button>
                <button
                  type="button"
                  onClick={handlePreviewImport}
                  disabled={!selectedTab || busyAction !== null}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  นำเข้าข้อมูลจากแท็บนี้
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory User Confirmation before mutating existing Google Sheet */}
      <ConfirmModal
        open={confirmOverwriteOpen}
        title="ยืนยันการเขียนทับข้อมูลใน Google Sheets?"
        description={`ระบบจะล้างข้อมูลเดิมในแท็บ "${selectedTab}" ของสเปรดชีต "${metadata?.title || ''}" และแทนที่ด้วยข้อมูลแบบบัญชีรายงานวัสดุประจำปีชุดปัจจุบัน`}
        details={[
          `ไฟล์เป้าหมาย: ${metadata?.title || '-'}`,
          `แท็บเป้าหมาย: ${selectedTab}`,
          `จำนวนรายการที่จะเขียนลงชีต: ${rows.length} แถว`,
          'การดำเนินการนี้จะแก้ไขข้อมูลใน Google Sheets ของคุณโดยตรง',
        ]}
        confirmLabel="ยืนยันอัปเดต Google Sheet"
        cancelLabel="ยกเลิก"
        tone="warning"
        isLoading={busyAction === 'overwrite'}
        onConfirm={handleConfirmedOverwrite}
        onCancel={() => setConfirmOverwriteOpen(false)}
      />

      {/* Import Confirmation Modal */}
      {confirmImportOpen && importedPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              พบข้อมูล {importedPreview.length} รายการจากแท็บ "{selectedTab}"
            </h3>
            <p className="text-xs text-slate-600">
              เลือกรูปแบบการนำเข้าข้อมูลเข้าสู่บัญชีวัสดุในแอป:
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span>เพิ่มต่อท้ายรายการเดิม (Merge)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>แทนที่ข้อมูลบัญชีวัสดุทั้งหมดด้วยชุดที่นำเข้า (Replace)</span>
              </label>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              {importedPreview.slice(0, 8).map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono-tabular text-slate-500 mr-1.5">
                      {item.code}
                    </span>
                    {item.name}
                  </span>
                  <span className="font-mono-tabular text-slate-700 shrink-0">
                    ยกมา {item.beginningQty} / ซื้อ {item.purchasedQty} / ใช้ {item.usedQty}
                  </span>
                </div>
              ))}
              {importedPreview.length > 8 && (
                <div className="text-slate-400 pt-1">
                  ...และอีก {importedPreview.length - 8} รายการ
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmImportOpen(false);
                  setImportedPreview(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportEntries(importedPreview, importMode);
                  setConfirmImportOpen(false);
                  setImportedPreview(null);
                  setStatusMessage({
                    type: 'success',
                    text: `นำเข้าข้อมูลจำนวน ${importedPreview.length} รายการเข้าสู่บัญชีเรียบร้อยแล้ว`,
                  });
                }}
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
              >
                ยืนยันนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
