import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileCheck2,
  Files,
  FileSpreadsheet,
  Settings2,
  TableProperties,
  TrendingDown,
  X,
} from 'lucide-react';
import { AgencyProfile, AppView } from '../types/inventory';

interface SidebarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onOpenCategorySettings: () => void;
  agency: AgencyProfile;
  alertCount: number;
  sheetsConnected: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  onOpenCategorySettings,
  agency,
  alertCount,
  sheetsConnected,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: Array<{
    id: AppView;
    label: string;
    icon: React.ReactNode;
    counter?: number;
  }> = [
    {
      id: 'overview',
      label: 'ภาพรวมและสรุปยอด',
      icon: <BarChart3 className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'ledger',
      label: 'บัญชีรายงานวัสดุ',
      icon: <BookOpen className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'stockcard',
      label: 'รายงานบัญชีวัสดุ (รายตัว)',
      icon: <TableProperties className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'requisition',
      label: 'เบิกจ่ายวัสดุ (ใบเบิก)',
      icon: <ClipboardList className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'summary',
      label: 'แบบสรุปประเภทวัสดุคงเหลือ',
      icon: <FileCheck2 className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'audit_reports',
      label: 'รายงานตรวจสอบพัสดุ (2–4)',
      icon: <Files className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'depreciation',
      label: 'ค่าเสื่อมราคาเส้นตรง',
      icon: <TrendingDown className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'alerts',
      label: 'แจ้งเตือนวัสดุใกล้หมด',
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      counter: alertCount,
    },
    {
      id: 'sheets',
      label: 'เชื่อมต่อ Google Sheets',
      icon: <FileSpreadsheet className="h-4 w-4 shrink-0" />,
    },
  ];

  const handleNavClick = (view: AppView) => {
    onSelectView(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              ระบบบัญชีวัสดุประจำปี
            </div>
            <div className="mt-0.5 text-xs text-slate-500 whitespace-nowrap truncate">
              {agency.documentNumber} · พ.ศ. {agency.fiscalYearBE}
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-slate-100">
          <div className="text-xs font-medium text-slate-500">หน่วยงานที่รับผิดชอบ</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
            {agency.agencyName || 'ยังไม่ได้ระบุชื่อหน่วยงาน'}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
            รหัสศูนย์ต้นทุน: {agency.costCenterCode || '-'}
          </div>
        </div>

        <nav className="space-y-1 p-3" aria-label="เมนูหลัก">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-teal-700' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.counter === 'number' && item.counter > 0 && (
                  <span className="ml-2 font-mono-tabular text-xs font-semibold text-amber-700 shrink-0">
                    {item.counter}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onOpenCategorySettings();
                onCloseMobile();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              <Settings2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">ตั้งค่าประเภทวัสดุ</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="border-t border-slate-200 px-4 py-3.5 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>Google Sheets</span>
          <span className={sheetsConnected ? 'font-medium text-teal-700' : 'text-slate-400'}>
            {sheetsConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
          </span>
        </div>
        <div className="mt-1 text-slate-400">
          สูตรคำนวณ: (1) + (2) - (3) = (4)
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 no-print">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
