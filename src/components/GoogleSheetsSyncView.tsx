import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderSearch,
  Lock,
  LogOut,
  PauseCircle,
  RefreshCw,
  Save,
  Unlock,
  Upload,
} from 'lucide-react';
import {
  AgencyProfile,
  ComputedMaterialRow,
  MaterialCategory,
  MaterialEntry,
  SheetsDatabaseConfig,
} from '../types/inventory';
import {
  createAndExportLedgerSheet,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  GoogleSheetsApiError,
  importFromGoogleSheet,
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
  allRows: ComputedMaterialRow[];
  categories: string[];
  selectedCategory: MaterialCategory | 'all';
  dbConfig: SheetsDatabaseConfig;
  onUpdateDbConfig: (
    updater:
      | SheetsDatabaseConfig
      | ((prev: SheetsDatabaseConfig) => SheetsDatabaseConfig)
  ) => void;
  countdownSec: number;
  isAutoSaving: boolean;
  onTriggerSaveNow: () => Promise<void>;
  onImportEntries: (entries: MaterialEntry[], mode: 'merge' | 'replace') => void;
  onSyncStart: (message: string) => void;
  onSyncSuccess: (info: {
    action: string;
    message: string;
    spreadsheetTitle?: string;
    spreadsheetUrl?: string;
  }) => void;
  onSyncError: (errorMessage: string) => void;
  onSheetLinked: (spreadsheetTitle: string, spreadsheetUrl: string) => void;
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
  allRows,
  categories,
  selectedCategory,
  dbConfig,
  onUpdateDbConfig,
  countdownSec,
  isAutoSaving,
  onTriggerSaveNow,
  onImportEntries,
  onSyncStart,
  onSyncSuccess,
  onSyncError,
  onSheetLinked,
}) => {
  const [sheetUrlInput, setSheetUrlInput] = useState(
    dbConfig.spreadsheetUrl || dbConfig.spreadsheetId || ''
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    link?: string;
  } | null>(null);

  const [confirmLockOpen, setConfirmLockOpen] = useState(false);
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);
  const [importedPreview, setImportedPreview] = useState<MaterialEntry[] | null>(
    null
  );
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [copiedSheetId, setCopiedSheetId] = useState(false);
  const autoCheckedOnLoginRef = useRef<string>('');

  useEffect(() => {
    if (dbConfig.spreadsheetUrl && dbConfig.spreadsheetUrl !== sheetUrlInput) {
      setSheetUrlInput(dbConfig.spreadsheetUrl);
    }
  }, [dbConfig.spreadsheetUrl]);

  const categoryLabel =
    selectedCategory === 'all'
      ? `ทุกหมวดหมู่ (${categories.join('/')})`
      : selectedCategory;

  const hasLinkedSheet = Boolean(dbConfig.spreadsheetId && dbConfig.selectedTab);

  const ensureToken = async (): Promise<string | null> => {
    const token = await getToken();
    if (!token) {
      onRequireReauth();
      const msg =
        'กรุณาลงชื่อเข้าใช้ด้วย Google เพื่อรับสิทธิ์เข้าถึง Google Sheets ก่อนดำเนินการ';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
      onSyncError(msg);
      return null;
    }
    return token;
  };

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof GoogleSheetsApiError && err.status === 401) {
      onRequireReauth();
      const msg = 'สิทธิ์การเชื่อมต่อ Google หมดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง';
      setStatusMessage({ type: 'error', text: msg });
      onSyncError(msg);
      return;
    }
    const message = err instanceof Error ? err.message : fallback;
    setStatusMessage({ type: 'error', text: message });
    onSyncError(message);
  };

  const handleCreateNewSheet = async () => {
    if (dbConfig.isLocked) return;
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('create');
    setStatusMessage(null);
    onSyncStart('กำลังสร้างไฟล์ฐานข้อมูล Google Sheets ใหม่...');
    try {
      const result = await createAndExportLedgerSheet(
        token,
        agency,
        allRows,
        `ทุกหมวดหมู่ (${categories.join('/')})`
      );
      setSheetUrlInput(result.spreadsheetUrl);
      onUpdateDbConfig((prev) => ({
        ...prev,
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        spreadsheetTitle: result.title,
        selectedTab: 'แบบบัญชีวัสดุประจำปี',
        availableTabs: [
          { sheetId: 0, title: 'แบบบัญชีวัสดุประจำปี' },
          { sheetId: 1, title: 'ค่าเสื่อมราคาเส้นตรง' },
        ],
        isLocked: true,
      }));

      const successText = `สร้างฐานข้อมูล "${result.title}" และส่งออกข้อมูล ${allRows.length} รายการ พร้อมล็อคการตั้งค่า Google Sheet ID เรียบร้อยแล้ว`;
      setStatusMessage({
        type: 'success',
        text: successText,
        link: result.spreadsheetUrl,
      });
      onSyncSuccess({
        action: 'สร้างฐานข้อมูล Google Sheets ใหม่',
        message: successText,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
      });
    } catch (err: unknown) {
      handleApiError(err, 'เกิดข้อผิดพลาดในการสร้าง Google Sheet');
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadMetadata = async () => {
    if (dbConfig.isLocked) return;
    if (!sheetUrlInput.trim()) {
      const msg = 'กรุณาวางลิงก์ Google Sheets หรือรหัส Spreadsheet ID';
      setStatusMessage({ type: 'error', text: msg });
      onSyncError(msg);
      return;
    }
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('inspect');
    setStatusMessage(null);
    onSyncStart('กำลังตรวจสอบการเชื่อมต่อไฟล์ Google Sheets...');
    try {
      const meta = await getSpreadsheetMetadata(token, sheetUrlInput);
      const defaultTab =
        meta.sheets.find((s) => s.title === dbConfig.selectedTab)?.title ||
        meta.sheets[0]?.title ||
        '';
      setSheetUrlInput(meta.spreadsheetUrl);
      onUpdateDbConfig((prev) => ({
        ...prev,
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        spreadsheetTitle: meta.title,
        availableTabs: meta.sheets,
        selectedTab: defaultTab,
        isLocked: true,
      }));

      setStatusMessage({
        type: 'success',
        text: `เชื่อมต่อไฟล์ "${meta.title}" สำเร็จ (${meta.sheets.length} แท็บ) และล็อคการตั้งค่า Google Sheet ID แล้ว`,
        link: meta.spreadsheetUrl,
      });
      onSheetLinked(meta.title, meta.spreadsheetUrl);
    } catch (err: unknown) {
      handleApiError(err, 'ไม่สามารถอ่านข้อมูลสเปรดชีตได้');
    } finally {
      setBusyAction(null);
    }
  };

  // If user pasted a Sheet ID/URL before logging in, verify & auto-lock it once logged in
  useEffect(() => {
    const candidateId = extractSpreadsheetId(sheetUrlInput);
    if (
      !needsAuth &&
      user &&
      !dbConfig.spreadsheetId &&
      !dbConfig.isLocked &&
      candidateId &&
      busyAction === null &&
      autoCheckedOnLoginRef.current !== candidateId
    ) {
      autoCheckedOnLoginRef.current = candidateId;
      void handleLoadMetadata();
    }
  }, [needsAuth, user, dbConfig.spreadsheetId, dbConfig.isLocked, sheetUrlInput, busyAction]);

  const handleLockSheetIdOnly = () => {
    if (needsAuth || !user || !hasLinkedSheet) return;
    onUpdateDbConfig((prev) => ({
      ...prev,
      isLocked: true,
    }));
    setStatusMessage({
      type: 'success',
      text: `ล็อคการตั้งค่า Google Sheet ID (${dbConfig.spreadsheetId}) เรียบร้อยแล้ว`,
    });
  };

  const handleConfirmEnableAutoSave = async () => {
    if (!hasLinkedSheet) return;
    setConfirmLockOpen(false);
    onUpdateDbConfig((prev) => ({
      ...prev,
      isLocked: true,
      autoSaveEnabled: true,
      intervalSeconds: 60,
    }));
    await onTriggerSaveNow();
  };

  const handlePauseAutoSave = () => {
    onUpdateDbConfig((prev) => ({
      ...prev,
      autoSaveEnabled: false,
    }));
    setStatusMessage({
      type: 'success',
      text: 'หยุดการบันทึกอัตโนมัติทุก 60 วินาทีชั่วคราวแล้ว (Google Sheet ID ยังคงล็อคอยู่)',
    });
  };

  const handleUnlockSettings = () => {
    onUpdateDbConfig((prev) => ({
      ...prev,
      isLocked: false,
      autoSaveEnabled: false,
    }));
    setStatusMessage({
      type: 'success',
      text: 'ปลดล็อคการตั้งค่า Google Sheet ID และหยุดการบันทึกอัตโนมัติแล้ว',
    });
  };

  const handleConfirmedOverwrite = async () => {
    if (!dbConfig.spreadsheetId || !dbConfig.selectedTab) return;
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('overwrite');
    setStatusMessage(null);
    onSyncStart(`กำลังอัปเดตข้อมูลลงแท็บ "${dbConfig.selectedTab}"...`);
    try {
      await updateExistingSheet(
        token,
        dbConfig.spreadsheetId,
        dbConfig.selectedTab,
        agency,
        rows,
        categoryLabel
      );
      setConfirmOverwriteOpen(false);
      const successText = `อัปเดตข้อมูลบัญชีวัสดุ (${rows.length} รายการ) ลงในแท็บ "${dbConfig.selectedTab}" ของ "${dbConfig.spreadsheetTitle}" สำเร็จแล้ว`;
      setStatusMessage({
        type: 'success',
        text: successText,
        link: dbConfig.spreadsheetUrl,
      });
      onSyncSuccess({
        action: 'อัปเดตข้อมูลลง Google Sheets',
        message: successText,
        spreadsheetTitle: dbConfig.spreadsheetTitle,
        spreadsheetUrl: dbConfig.spreadsheetUrl,
      });
    } catch (err: unknown) {
      handleApiError(err, 'ไม่สามารถอัปเดต Google Sheet ได้');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePreviewImport = async () => {
    if (!dbConfig.spreadsheetId || !dbConfig.selectedTab) return;
    const token = await ensureToken();
    if (!token) return;

    setBusyAction('import');
    setStatusMessage(null);
    onSyncStart(`กำลังดึงข้อมูลจากแท็บ "${dbConfig.selectedTab}"...`);
    try {
      const parsed = await importFromGoogleSheet(
        token,
        dbConfig.spreadsheetId,
        dbConfig.selectedTab
      );
      if (parsed.length === 0) {
        const msg = `ไม่พบแถวรายการวัสดุในแท็บ "${dbConfig.selectedTab}" กรุณาตรวจสอบหัวตาราง (รหัสวัสดุ, รายการ)`;
        setStatusMessage({ type: 'error', text: msg });
        onSyncError(msg);
      } else {
        setImportedPreview(parsed);
        setConfirmImportOpen(true);
        onSheetLinked(dbConfig.spreadsheetTitle, dbConfig.spreadsheetUrl);
      }
    } catch (err: unknown) {
      handleApiError(err, 'ไม่สามารถนำเข้าข้อมูลจาก Google Sheet ได้');
    } finally {
      setBusyAction(null);
    }
  };

  const inputSpreadsheetIdPreview = extractSpreadsheetId(sheetUrlInput);

  return (
    <div className="space-y-6">
      {/* Step 1: Google Login Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-teal-700">
              ขั้นตอนที่ 1 · ยืนยันตัวตนบัญชี Google
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              เข้าสู่ระบบบัญชี Google สำหรับเข้าถึง Google Sheets
            </h2>
            <p className="text-xs text-slate-500">
              ใช้สิทธิ์เฉพาะการอ่าน-เขียนไฟล์ Google Sheets ของคุณ เพื่อเชื่อมต่อฐานข้อมูลและบันทึกข้อมูลอัตโนมัติ
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
                  {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-900">
                  {user.displayName || 'บัญชี Google'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium">
                  {user.email} · พร้อมซิงค์ข้อมูล
                </div>
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

      {/* Step 2: Database Connection + Lock Settings + 60s Auto-Save */}
      <div
        className={`rounded-xl border p-6 space-y-5 transition-colors ${
          dbConfig.isLocked
            ? 'border-teal-300 bg-teal-50/30'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
              <Database className="h-3.5 w-3.5" />
              ขั้นตอนที่ 2 · ตั้งค่าเชื่อมต่อฐานข้อมูล Google Sheets และล็อคการตั้งค่า
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              กำหนดสเปรดชีตฐานข้อมูลและบันทึกอัตโนมัติทุก 60 วินาที
            </h3>
            <p className="text-xs text-slate-500">
              เชื่อมต่อไฟล์ Google Sheets ที่ต้องการใช้เป็นฐานข้อมูล จากนั้นกด{' '}
              <strong className="text-slate-700">ล็อคการตั้งค่า</strong>{' '}
              เพื่อป้องกันการแก้ไขเป้าหมายและให้ระบบบันทึกข้อมูลล่าสุดลง Sheets ทุก 60 วินาที
            </p>
          </div>

          {dbConfig.isLocked ? (
            <div className="flex flex-wrap items-center gap-2">
              {dbConfig.autoSaveEnabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => void onTriggerSaveNow()}
                    disabled={needsAuth || isAutoSaving || busyAction !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isAutoSaving ? 'กำลังบันทึก...' : 'บันทึกลง Sheets ทันที'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePauseAutoSave}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <PauseCircle className="h-3.5 w-3.5 text-slate-600" />
                    หยุดบันทึกอัตโนมัติ
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmLockOpen(true)}
                  disabled={needsAuth || !hasLinkedSheet || busyAction !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" />
                  เปิดบันทึกอัตโนมัติทุก 60 วินาที
                </button>
              )}
              <button
                type="button"
                onClick={handleUnlockSettings}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <Unlock className="h-3.5 w-3.5" />
                ปลดล็อค Google Sheet ID
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {hasLinkedSheet && !needsAuth && user && (
                <button
                  type="button"
                  onClick={handleLockSheetIdOnly}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-white px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  ล็อค Google Sheet ID
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmLockOpen(true)}
                disabled={needsAuth || !hasLinkedSheet || busyAction !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                ล็อค &amp; บันทึกทุก 60 วินาที
              </button>
            </div>
          )}
        </div>

        {/* Locked Status Banner */}
        {dbConfig.isLocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 text-xs">
            <div className="flex items-start gap-2.5 text-teal-900">
              <Lock className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  ล็อคการตั้งค่า Google Sheet ID แล้ว — {dbConfig.spreadsheetTitle} (แท็บ:{' '}
                  {dbConfig.selectedTab})
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <span>Google Sheet ID:</span>
                  <code className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono-tabular text-slate-900 select-all">
                    {dbConfig.spreadsheetId}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(dbConfig.spreadsheetId);
                        setCopiedSheetId(true);
                        setTimeout(() => setCopiedSheetId(false), 2000);
                      } catch {
                        // ignore clipboard failure
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copiedSheetId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        คัดลอก ID
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {needsAuth || !user
                    ? 'กรุณาเข้าสู่ระบบ Google ด้านบน เพื่อใช้งานการบันทึกข้อมูลลง Sheets'
                    : dbConfig.autoSaveEnabled
                      ? `ระบบบันทึกข้อมูลบัญชีวัสดุทั้งหมด (${allRows.length} รายการ) ลงแท็บ "${dbConfig.selectedTab}" อัตโนมัติทุก 60 วินาที`
                      : 'Google Sheet ID ถูกล็อคไว้ป้องกันการแก้ไขโดยไม่ตั้งใจ (กด "เปิดบันทึกอัตโนมัติทุก 60 วินาที" เพื่อเริ่มซิงค์อัตโนมัติ)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {!needsAuth && user && dbConfig.autoSaveEnabled && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono-tabular text-[11px] font-semibold text-emerald-800">
                  <Clock className="h-3.5 w-3.5 text-emerald-700" />
                  {isAutoSaving
                    ? 'กำลังบันทึกลง Sheets...'
                    : `บันทึกอัตโนมัติในอีก ${countdownSec} วินาที`}
                </div>
              )}
              {dbConfig.spreadsheetUrl && (
                <a
                  href={dbConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-teal-700 underline hover:no-underline"
                >
                  เปิดไฟล์ฐานข้อมูล
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Target Sheet Inputs (Disabled while locked) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Option A: Existing Spreadsheet URL / ID */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <FolderSearch className="h-4 w-4 text-teal-700" />
                เชื่อมต่อไฟล์ Google Sheets ที่มีอยู่
              </div>
              {dbConfig.isLocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700">
                  <Lock className="h-3 w-3" /> ล็อค Google Sheet ID แล้ว
                </span>
              ) : !needsAuth && user ? (
                <span className="text-[11px] text-slate-500">
                  เมื่อตรวจสอบไฟล์สำเร็จ ระบบจะล็อค Sheet ID ให้อัตโนมัติ
                </span>
              ) : null}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrlInput}
                disabled={dbConfig.isLocked}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="วางลิงก์ URL หรือรหัส Google Sheet ID..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono-tabular focus:border-teal-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              <button
                type="button"
                onClick={handleLoadMetadata}
                disabled={
                  needsAuth ||
                  dbConfig.isLocked ||
                  busyAction !== null ||
                  !inputSpreadsheetIdPreview
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    busyAction === 'inspect' ? 'animate-spin' : ''
                  }`}
                />
                ตรวจสอบไฟล์
              </button>
            </div>

            {dbConfig.spreadsheetId && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 truncate">
                    ชื่อไฟล์:{' '}
                    <strong className="text-slate-900">
                      {dbConfig.spreadsheetTitle}
                    </strong>
                  </span>
                  {dbConfig.spreadsheetUrl && (
                    <a
                      href={dbConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 hover:underline whitespace-nowrap"
                    >
                      เปิดชีต
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    แท็บฐานข้อมูลปลายทาง (Sheet Tab)
                  </label>
                  <select
                    value={dbConfig.selectedTab}
                    disabled={dbConfig.isLocked}
                    onChange={(e) =>
                      onUpdateDbConfig((prev) => ({
                        ...prev,
                        selectedTab: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {dbConfig.availableTabs.length > 0 ? (
                      dbConfig.availableTabs.map((s) => (
                        <option key={s.sheetId} value={s.title}>
                          {s.title}
                        </option>
                      ))
                    ) : (
                      <option value={dbConfig.selectedTab}>
                        {dbConfig.selectedTab}
                      </option>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Option B: Create New Google Sheet Database */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <FileSpreadsheet className="h-4 w-4 text-teal-700" />
                หรือสร้างไฟล์ฐานข้อมูล Google Sheets ใหม่
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ระบบจะสร้างสเปรดชีตใหม่ในบัญชี Google ของคุณ พร้อมแท็บ{' '}
                <strong className="text-slate-700">แบบบัญชีวัสดุประจำปี</strong>{' '}
                และ{' '}
                <strong className="text-slate-700">ค่าเสื่อมราคาเส้นตรง</strong>{' '}
                ให้อัตโนมัติและเชื่อมโยงกับระบบทันที
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                หน่วยงาน: <strong className="text-slate-800">{agency.agencyName}</strong>{' '}
                · ทั้งหมด{' '}
                <strong className="font-mono-tabular text-slate-800">
                  {allRows.length} รายการ
                </strong>{' '}
                (พ.ศ. {agency.fiscalYearBE})
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateNewSheet}
              disabled={needsAuth || dbConfig.isLocked || busyAction !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-4 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {busyAction === 'create'
                ? 'กำลังสร้าง Google Sheet...'
                : 'สร้างฐานข้อมูล Google Sheet ใหม่'}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Manual Sync / Import Tools */}
      {hasLinkedSheet && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">
              ขั้นตอนที่ 3 · ซิงค์ข้อมูลด้วยตนเอง
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              เขียนทับหรือดึงข้อมูลจากแท็บ "{dbConfig.selectedTab}" ในไฟล์ "{dbConfig.spreadsheetTitle}"
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setConfirmOverwriteOpen(true)}
              disabled={needsAuth || !dbConfig.selectedTab || busyAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              เขียนอัปเดตลงแท็บนี้ด้วยตนเอง ({rows.length} แถว)
            </button>
            <button
              type="button"
              onClick={handlePreviewImport}
              disabled={needsAuth || !dbConfig.selectedTab || busyAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              นำเข้าข้อมูลจากแท็บนี้เข้าสู่แอป
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation before enabling 60s Auto-Save */}
      <ConfirmModal
        open={confirmLockOpen}
        title="ยืนยันการเปิดบันทึกอัตโนมัติลง Google Sheets ทุก 60 วินาที?"
        description={`ระบบจะล็อค Google Sheet ID (${dbConfig.spreadsheetId}) และบันทึกข้อมูลบัญชีวัสดุปัจจุบันลงแท็บ "${dbConfig.selectedTab}" ของไฟล์ "${dbConfig.spreadsheetTitle}" อัตโนมัติทุก 60 วินาที`}
        details={[
          `Google Sheet ID: ${dbConfig.spreadsheetId || '-'}`,
          `ไฟล์ฐานข้อมูล: ${dbConfig.spreadsheetTitle || '-'}`,
          `แท็บปลายทาง: ${dbConfig.selectedTab || '-'}`,
          `จำนวนข้อมูลที่จะบันทึก: ${allRows.length} รายการ (ทุกหมวดหมู่)`,
          'สามารถกด "หยุดบันทึกอัตโนมัติ" หรือ "ปลดล็อค Google Sheet ID" ได้ทุกเมื่อ',
        ]}
        confirmLabel="ยืนยันเปิดบันทึกทุก 60 วินาที"
        cancelLabel="ยกเลิก"
        tone="warning"
        onConfirm={() => void handleConfirmEnableAutoSave()}
        onCancel={() => setConfirmLockOpen(false)}
      />

      {/* Mandatory User Confirmation before mutating existing Google Sheet */}
      <ConfirmModal
        open={confirmOverwriteOpen}
        title="ยืนยันการเขียนทับข้อมูลใน Google Sheets?"
        description={`ระบบจะล้างข้อมูลเดิมในแท็บ "${dbConfig.selectedTab}" ของสเปรดชีต "${dbConfig.spreadsheetTitle}" และแทนที่ด้วยข้อมูลแบบบัญชีรายงานวัสดุประจำปีชุดปัจจุบัน`}
        details={[
          `ไฟล์เป้าหมาย: ${dbConfig.spreadsheetTitle || '-'}`,
          `แท็บเป้าหมาย: ${dbConfig.selectedTab}`,
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
              พบข้อมูล {importedPreview.length} รายการจากแท็บ "{dbConfig.selectedTab}"
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
                    ยกมา {item.beginningQty} / ซื้อ {item.purchasedQty} / ใช้{' '}
                    {item.usedQty}
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
                  const importedCount = importedPreview.length;
                  onImportEntries(importedPreview, importMode);
                  setConfirmImportOpen(false);
                  setImportedPreview(null);
                  const successText = `นำเข้าข้อมูลจำนวน ${importedCount} รายการเข้าสู่บัญชีเรียบร้อยแล้ว`;
                  setStatusMessage({
                    type: 'success',
                    text: successText,
                  });
                  onSyncSuccess({
                    action: 'นำเข้าข้อมูลจาก Google Sheets',
                    message: successText,
                    spreadsheetTitle: dbConfig.spreadsheetTitle,
                    spreadsheetUrl: dbConfig.spreadsheetUrl,
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
