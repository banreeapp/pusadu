import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import {
  AppView,
  SheetsDatabaseConfig,
  SheetsSyncStatus,
} from '../types/inventory';

interface SheetsStatusBarProps {
  isConnected: boolean;
  userEmail?: string | null;
  syncStatus: SheetsSyncStatus;
  dbConfig: SheetsDatabaseConfig;
  countdownSec: number;
  activeView: AppView;
  onNavigateToSheets: () => void;
  onTriggerManualSave: () => void;
  onClearStatusAlert: () => void;
}

function formatThaiSyncTimestamp(iso: string | null): string {
  if (!iso) return 'ยังไม่เคยซิงค์ข้อมูล';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const SheetsStatusBar: React.FC<SheetsStatusBarProps> = ({
  isConnected,
  userEmail,
  syncStatus,
  dbConfig,
  countdownSec,
  activeView,
  onNavigateToSheets,
  onTriggerManualSave,
  onClearStatusAlert,
}) => {
  const isSuccess = syncStatus.kind === 'success';
  const isError = syncStatus.kind === 'error';
  const isSyncing = syncStatus.kind === 'syncing';
  const isLockedAutoSave =
    dbConfig.isLocked &&
    dbConfig.autoSaveEnabled &&
    Boolean(dbConfig.spreadsheetId) &&
    Boolean(dbConfig.selectedTab);

  const barThemeClass = isError
    ? 'border-red-300 bg-red-50 text-red-950'
    : isSuccess
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : isSyncing
        ? 'border-sky-200 bg-sky-50 text-sky-950'
        : isConnected
          ? 'border-slate-200 bg-white text-slate-800'
          : 'border-slate-200 bg-slate-100/80 text-slate-700';

  const dotColorClass = isError
    ? 'bg-red-500'
    : isSuccess || isConnected
      ? 'bg-emerald-500'
      : isSyncing
        ? 'bg-sky-500'
        : 'bg-slate-400';

  const targetUrl = dbConfig.spreadsheetUrl || syncStatus.spreadsheetUrl;
  const targetTitle = dbConfig.spreadsheetTitle || syncStatus.spreadsheetTitle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border-b px-4 py-2 sm:px-6 transition-colors no-print ${barThemeClass}`}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
        {/* Left: Connection + Lock + Sync State */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <div className="flex items-center gap-2 font-medium shrink-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${dotColorClass} ${
                isSyncing ? 'animate-pulse' : ''
              }`}
            />
            <FileSpreadsheet
              className={`h-3.5 w-3.5 shrink-0 ${
                isError
                  ? 'text-red-600'
                  : isSuccess
                    ? 'text-emerald-700'
                    : isConnected
                      ? 'text-teal-700'
                      : 'text-slate-500'
              }`}
            />
            <span>
              Google Sheets:{' '}
              <strong
                className={
                  isError
                    ? 'text-red-800'
                    : isSuccess || isConnected
                      ? 'text-emerald-800'
                      : 'text-slate-700'
                }
              >
                {isConnected
                  ? `เชื่อมต่อแล้ว${userEmail ? ` (${userEmail})` : ''}`
                  : 'ยังไม่เชื่อมต่อ'}
              </strong>
            </span>
          </div>

          {dbConfig.isLocked && dbConfig.spreadsheetId && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isError
                  ? 'text-red-800'
                  : isSuccess
                    ? 'text-emerald-800'
                    : 'text-teal-800'
              }`}
            >
              <Lock className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[220px]">
                ล็อคฐานข้อมูล ({dbConfig.selectedTab || 'ชีตหลัก'})
              </span>
              {isLockedAutoSave && (
                <span className="font-mono-tabular text-[11px] opacity-85">
                  {isConnected
                    ? isSyncing
                      ? '· กำลังบันทึก...'
                      : `· บันทึกอัตโนมัติใน ${countdownSec} วิ`
                    : '· รอเข้าสู่ระบบเพื่อบันทึกทุก 60 วิ'}
                </span>
              )}
            </span>
          )}

          {/* Sync Event Feedback */}
          {isSyncing && (
            <span className="inline-flex items-center gap-1.5 text-sky-800 font-medium">
              <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>
                {syncStatus.message || 'กำลังซิงค์ข้อมูลกับ Google Sheets...'}
              </span>
            </span>
          )}

          {isSuccess && (
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                {syncStatus.message || 'ซิงค์ข้อมูลสำเร็จ'}
              </span>
            </span>
          )}

          {isError && (
            <span className="inline-flex items-center gap-1.5 text-red-800 font-medium min-w-0">
              <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
              <span className="truncate">
                {syncStatus.errorMessage || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล'}
              </span>
            </span>
          )}
        </div>

        {/* Right: Last Sync Timestamp & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 font-mono-tabular text-[11px] ${
              isError
                ? 'text-red-800'
                : isSuccess
                  ? 'text-emerald-800'
                  : 'text-slate-600'
            }`}
          >
            <Clock className="h-3 w-3 shrink-0 opacity-75" />
            <span>
              ซิงค์ล่าสุด: {formatThaiSyncTimestamp(syncStatus.lastSyncAt)}
            </span>
            {targetTitle && (
              <span className="hidden md:inline opacity-80 truncate max-w-[160px]">
                · {targetTitle}
              </span>
            )}
          </div>

          {isConnected && isLockedAutoSave && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onTriggerManualSave}
              className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="h-3 w-3" />
              บันทึกทันที
            </button>
          )}

          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 font-medium underline hover:no-underline whitespace-nowrap ${
                isError
                  ? 'text-red-800'
                  : isSuccess
                    ? 'text-emerald-800'
                    : 'text-teal-700'
              }`}
            >
              เปิดชีต
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {activeView !== 'sheets' && (
            <button
              type="button"
              onClick={onNavigateToSheets}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                isError
                  ? 'border-red-300 bg-white text-red-800 hover:bg-red-100'
                  : isSuccess
                    ? 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isConnected ? 'ตั้งค่า Sheets' : 'เชื่อมต่อ Google Sheets'}
            </button>
          )}

          {(isSuccess || isError) && (
            <button
              type="button"
              onClick={onClearStatusAlert}
              className={`rounded p-0.5 transition-colors ${
                isError
                  ? 'text-red-700 hover:bg-red-100'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
              title="รีเซ็ตแถบแจ้งเตือนเป็นสถานะปกติ"
              aria-label="รีเซ็ตแถบแจ้งเตือนเป็นสถานะปกติ"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
