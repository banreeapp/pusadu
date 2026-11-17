/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  Copy,
  DatabaseBackup,
  ExternalLink,
  FileDown,
  Menu,
  Plus,
  Printer,
} from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AgencyProfile,
  AppView,
  ComputedMaterialRow,
  DEFAULT_MATERIAL_CATEGORIES,
  MaterialCategory,
  MaterialEntry,
  RequisitionVoucher,
  StockMovement,
} from './types/inventory';
import {
  DEFAULT_AGENCY_PROFILE,
  INITIAL_MATERIALS,
  INITIAL_MOVEMENTS,
  INITIAL_REQUISITIONS,
} from './data/initialMaterials';
import { computeMaterialRow, groupTotalsByCategory } from './utils/calculations';
import {
  exportAuditDocumentToExcel,
  exportCategorySummaryToExcel,
  exportLedgerToExcel,
  exportRequisitionToExcel,
  exportStockCardToExcel,
} from './utils/exportExcel';
import {
  buildBackupPayload,
  downloadBackupJson,
  InventoryBackupPayload,
  mergeBackupDatasets,
} from './utils/backupJson';
import { buildStockCardRows } from './utils/stockCard';
import { AuditDocId, buildAuditDocumentData } from './utils/auditReports';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { MaterialLedgerTable } from './components/MaterialLedgerTable';
import { DepreciationView } from './components/DepreciationView';
import { LowStockAlertsView } from './components/LowStockAlertsView';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView';
import { MaterialFormModal } from './components/MaterialFormModal';
import { StockMovementModal } from './components/StockMovementModal';
import { ConfirmModal } from './components/ConfirmModal';
import { OfficialPrintReport } from './components/OfficialPrintReport';
import { CategorySettingsModal } from './components/CategorySettingsModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import {
  CategorySummaryReportView,
  PrintableCategorySummaryDocument,
} from './components/CategorySummaryReportView';
import {
  PrintableRequisitionDocument,
  RequisitionView,
} from './components/RequisitionView';
import { RequisitionFormModal } from './components/RequisitionFormModal';
import {
  PrintableStockCardDocument,
  StockCardView,
} from './components/StockCardView';
import {
  AuditReportsView,
  PrintableAuditBundle,
  PrintableAuditDocument,
} from './components/AuditReportsView';

const STORAGE_KEYS = {
  agency: 'thai_material_ledger_agency_v1',
  materials: 'thai_material_ledger_items_v1',
  movements: 'thai_material_ledger_movements_v1',
  categories: 'thai_material_ledger_categories_v1',
  requisitions: 'thai_material_ledger_requisitions_v1',
  lastBackup: 'thai_material_ledger_last_backup_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [selectedCategory, setSelectedCategory] = useState<
    MaterialCategory | 'all'
  >('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [agency, setAgency] = useState<AgencyProfile>(() =>
    loadFromStorage(STORAGE_KEYS.agency, DEFAULT_AGENCY_PROFILE)
  );
  const [categories, setCategories] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.categories, DEFAULT_MATERIAL_CATEGORIES)
  );
  const [materials, setMaterials] = useState<MaterialEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.materials, INITIAL_MATERIALS)
  );
  const [movements, setMovements] = useState<StockMovement[]>(() =>
    loadFromStorage(STORAGE_KEYS.movements, INITIAL_MOVEMENTS)
  );
  const [requisitions, setRequisitions] = useState<RequisitionVoucher[]>(() =>
    loadFromStorage(STORAGE_KEYS.requisitions, INITIAL_REQUISITIONS)
  );
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>(() => {
    const stored = loadFromStorage<RequisitionVoucher[]>(
      STORAGE_KEYS.requisitions,
      INITIAL_REQUISITIONS
    );
    return stored[0]?.id || '';
  });
  const [selectedStockCardId, setSelectedStockCardId] = useState<string>(
    () => INITIAL_MATERIALS.find((m) => !m.isPriceVariant)?.id || ''
  );
  const [activeAuditDocId, setActiveAuditDocId] = useState<AuditDocId>('doc4');

  // Google Workspace Auth state (access token is kept strictly in memory via googleAuth.ts)
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MaterialEntry | null>(null);
  const [variantParent, setVariantParent] = useState<MaterialEntry | null>(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementTarget, setMovementTarget] = useState<ComputedMaterialRow | null>(
    null
  );
  const [movementDefaultType, setMovementDefaultType] = useState<'purchase' | 'use'>(
    'use'
  );

  const [reqFormOpen, setReqFormOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] =
    useState<RequisitionVoucher | null>(null);
  const [deleteVoucherTarget, setDeleteVoucherTarget] =
    useState<RequisitionVoucher | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MaterialEntry | null>(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<
    | 'ledger'
    | 'summary'
    | 'requisition'
    | 'stockcard'
    | 'audit_single'
    | 'audit_bundle'
  >('ledger');
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.lastBackup);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.agency, JSON.stringify(agency));
    } catch {
      // ignore quota errors
    }
  }, [agency]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.materials, JSON.stringify(materials));
    } catch {
      // ignore quota errors
    }
  }, [materials]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.movements, JSON.stringify(movements));
    } catch {
      // ignore quota errors
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
    } catch {
      // ignore quota errors
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.requisitions,
        JSON.stringify(requisitions)
      );
    } catch {
      // ignore quota errors
    }
  }, [requisitions]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const computedRows = useMemo(
    () => materials.map(computeMaterialRow),
    [materials]
  );

  const activeVoucher = useMemo(
    () =>
      requisitions.find((v) => v.id === selectedVoucherId) ||
      requisitions[0] ||
      null,
    [requisitions, selectedVoucherId]
  );

  const activeStockCardMaterial = useMemo(() => {
    const mains = computedRows.filter((r) => !r.isPriceVariant);
    return mains.find((m) => m.id === selectedStockCardId) || mains[0] || null;
  }, [computedRows, selectedStockCardId]);

  const activeStockCardRows = useMemo(() => {
    if (!activeStockCardMaterial) return [];
    return buildStockCardRows(
      activeStockCardMaterial,
      movements,
      requisitions,
      agency
    );
  }, [activeStockCardMaterial, movements, requisitions, agency]);

  const activeAuditDoc = useMemo(
    () => buildAuditDocumentData(activeAuditDocId, computedRows, agency),
    [activeAuditDocId, computedRows, agency]
  );

  const alertCount = useMemo(
    () =>
      computedRows.filter(
        (r) => !r.isPriceVariant && (r.stockStatus === 'out' || r.stockStatus === 'low')
      ).length,
    [computedRows]
  );

  const exportRows = useMemo(() => {
    if (selectedCategory === 'all') return computedRows;
    return computedRows.filter((r) => r.category === selectedCategory);
  }, [computedRows, selectedCategory]);

  const summaryExportRows = useMemo(() => {
    return groupTotalsByCategory(computedRows, categories).map((g) => ({
      category: g.category,
      beginningTotal: g.beginningTotal,
      purchasedTotal: g.purchasedTotal,
      usedTotal: g.usedTotal,
      remainingTotal: g.remainingTotal,
      note: agency.categoryNotes?.[g.category] || '',
    }));
  }, [computedRows, categories, agency.categoryNotes]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    setUnauthorizedDomain(null);
    setCopiedDomain(false);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
      }
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code || '')
          : '';
      const rawMsg =
        err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';

      if (
        code === 'auth/unauthorized-domain' ||
        rawMsg.includes('unauthorized-domain')
      ) {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedDomain(host);
        setAuthError(
          `โดเมน "${host}" ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบใน Firebase Authentication`
        );
      } else if (
        code === 'auth/popup-blocked' ||
        rawMsg.includes('popup-blocked')
      ) {
        setAuthError(
          'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ (Pop-up) กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้แล้วลองใหม่อีกครั้ง'
        );
      } else if (
        code === 'auth/popup-closed-by-user' ||
        rawMsg.includes('popup-closed-by-user')
      ) {
        setAuthError('คุณได้ปิดหน้าต่างเข้าสู่ระบบ Google ก่อนดำเนินการเสร็จสิ้น');
      } else {
        setAuthError(rawMsg);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
  };

  const handleSaveMaterial = (entry: MaterialEntry) => {
    setMaterials((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      if (exists) {
        return prev.map((m) => (m.id === entry.id ? entry : m));
      }
      if (entry.isPriceVariant && entry.parentCode) {
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].code === entry.parentCode) {
            idx = i;
            break;
          }
        }
        if (idx >= 0) {
          const copy = [...prev];
          copy.splice(idx + 1, 0, entry);
          return copy;
        }
      }
      return [...prev, entry];
    });
    setFormOpen(false);
    setEditingEntry(null);
    setVariantParent(null);
  };

  const handleUpdateEntryInline = (updated: MaterialEntry) => {
    setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleUpdateThreshold = (entry: MaterialEntry, nextThreshold: number) => {
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === entry.id
          ? { ...m, minThreshold: nextThreshold, updatedAt: new Date().toISOString() }
          : m
      )
    );
  };

  const handleRecordMovement = (payload: {
    materialId: string;
    type: 'purchase' | 'use';
    qty: number;
    unitPrice: number;
    date: string;
    note: string;
    docNo?: string;
    counterparty?: string;
  }) => {
    const target = materials.find((m) => m.id === payload.materialId);
    if (!target) return;

    const totalAmount = payload.qty * payload.unitPrice;
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      materialId: target.id,
      materialCode: target.code,
      materialName: target.name,
      type: payload.type,
      qty: payload.qty,
      unitPrice: payload.unitPrice,
      totalAmount,
      date: payload.date,
      note: payload.note,
      docNo: payload.docNo,
      counterparty: payload.counterparty,
    };

    setMovements((prev) => [newMovement, ...prev]);

    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== target.id) return m;
        if (payload.type === 'purchase') {
          const totalPurchasedVal =
            m.purchasedQty * m.purchasedUnitPrice + totalAmount;
          const nextQty = m.purchasedQty + payload.qty;
          const weightedPrice =
            nextQty > 0 ? totalPurchasedVal / nextQty : payload.unitPrice;
          return {
            ...m,
            purchasedQty: nextQty,
            purchasedUnitPrice: Math.round(weightedPrice * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        } else {
          const totalUsedVal = m.usedQty * m.usedUnitPrice + totalAmount;
          const nextQty = m.usedQty + payload.qty;
          const weightedPrice =
            nextQty > 0 ? totalUsedVal / nextQty : payload.unitPrice;
          return {
            ...m,
            usedQty: nextQty,
            usedUnitPrice: Math.round(weightedPrice * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        }
      })
    );

    setMovementModalOpen(false);
    setMovementTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleSaveRequisition = (voucher: RequisitionVoucher) => {
    const prevVoucher = requisitions.find((v) => v.id === voucher.id);

    const oldQtyByMat = new Map<string, number>();
    if (prevVoucher) {
      for (const item of prevVoucher.items) {
        oldQtyByMat.set(
          item.materialId,
          (oldQtyByMat.get(item.materialId) || 0) + item.issuedQty
        );
      }
    }

    const newQtyByMat = new Map<string, number>();
    for (const item of voucher.items) {
      newQtyByMat.set(
        item.materialId,
        (newQtyByMat.get(item.materialId) || 0) + item.issuedQty
      );
    }

    const allMatIds = new Set<string>([
      ...oldQtyByMat.keys(),
      ...newQtyByMat.keys(),
    ]);

    const deltaByMat = new Map<string, number>();
    for (const matId of allMatIds) {
      const delta = (newQtyByMat.get(matId) || 0) - (oldQtyByMat.get(matId) || 0);
      if (delta !== 0) {
        deltaByMat.set(matId, delta);
      }
    }

    if (deltaByMat.size > 0) {
      const nowIso = new Date().toISOString();
      const newMovements: StockMovement[] = [];

      setMaterials((prev) =>
        prev.map((m) => {
          const delta = deltaByMat.get(m.id);
          if (!delta) return m;
          const nextUsedQty = Math.max(0, m.usedQty + delta);
          const fallbackPrice =
            m.usedUnitPrice || m.purchasedUnitPrice || m.beginningUnitPrice || 0;
          return {
            ...m,
            usedQty: nextUsedQty,
            usedUnitPrice: m.usedUnitPrice > 0 ? m.usedUnitPrice : fallbackPrice,
            updatedAt: nowIso,
          };
        })
      );

      for (const item of voucher.items) {
        const delta = deltaByMat.get(item.materialId);
        if (delta && delta > 0) {
          newMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            type: 'use',
            qty: delta,
            unitPrice: item.unitPrice,
            totalAmount: Math.round(delta * item.unitPrice * 100) / 100,
            date: voucher.date,
            docNo: voucher.voucherNo,
            counterparty: voucher.purpose || voucher.requesterName || 'เบิกใช้งานราชการ',
            note: prevVoucher
              ? `แก้ไขใบเบิกเลขที่ ${voucher.voucherNo}`
              : `เบิกจ่ายตามใบเบิกเลขที่ ${voucher.voucherNo}`,
          });
          // Ensure each material delta logs once even if duplicated across rows
          deltaByMat.delete(item.materialId);
        }
      }

      if (newMovements.length > 0) {
        setMovements((prev) => [...newMovements, ...prev]);
      }
    }

    setRequisitions((prev) => {
      if (prevVoucher) {
        return prev.map((v) => (v.id === voucher.id ? voucher : v));
      }
      return [voucher, ...prev];
    });

    setSelectedVoucherId(voucher.id);
    setReqFormOpen(false);
    setEditingVoucher(null);
  };

  const handleConfirmDeleteVoucher = () => {
    if (!deleteVoucherTarget) return;

    const revertByMat = new Map<string, number>();
    for (const item of deleteVoucherTarget.items) {
      revertByMat.set(
        item.materialId,
        (revertByMat.get(item.materialId) || 0) + item.issuedQty
      );
    }

    if (revertByMat.size > 0) {
      const nowIso = new Date().toISOString();
      setMaterials((prev) =>
        prev.map((m) => {
          const revertQty = revertByMat.get(m.id);
          if (!revertQty) return m;
          return {
            ...m,
            usedQty: Math.max(0, m.usedQty - revertQty),
            updatedAt: nowIso,
          };
        })
      );
    }

    const remaining = requisitions.filter(
      (v) => v.id !== deleteVoucherTarget.id
    );
    setRequisitions(remaining);
    if (selectedVoucherId === deleteVoucherTarget.id) {
      setSelectedVoucherId(remaining[0]?.id || '');
    }
    setDeleteVoucherTarget(null);
  };

  const handleAddCategory = (name: string) => {
    setCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    setCategories((prev) => prev.map((c) => (c === oldName ? newName : c)));
    setMaterials((prev) =>
      prev.map((m) =>
        m.category === oldName
          ? { ...m, category: newName, updatedAt: new Date().toISOString() }
          : m
      )
    );
    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }
  };

  const handleReorderCategory = (index: number, direction: 'up' | 'down') => {
    setCategories((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleDeleteCategory = (name: string, reassignTo: string) => {
    if (reassignTo) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.category === name
            ? { ...m, category: reassignTo, updatedAt: new Date().toISOString() }
            : m
        )
      );
    }
    setCategories((prev) => prev.filter((c) => c !== name));
    if (selectedCategory === name) {
      setSelectedCategory('all');
    }
  };

  const handleResetDefaultCategories = () => {
    setCategories((prev) => {
      const missing = DEFAULT_MATERIAL_CATEGORIES.filter(
        (d) => !prev.includes(d)
      );
      return [...prev, ...missing];
    });
  };

  const handleDownloadBackupJson = (): string => {
    const payload = buildBackupPayload({
      agency,
      categories,
      materials,
      movements,
      requisitions,
    });
    const filename = downloadBackupJson(payload);
    const nowIso = new Date().toISOString();
    setLastBackupAt(nowIso);
    try {
      localStorage.setItem(STORAGE_KEYS.lastBackup, nowIso);
    } catch {
      // ignore storage quota errors
    }
    return filename;
  };

  const handleRestoreBackupJson = (
    payload: InventoryBackupPayload,
    mode: 'replace' | 'merge'
  ): { message: string } => {
    if (mode === 'replace') {
      const next = payload.data;
      setAgency(next.agency);
      setCategories(next.categories);
      setMaterials(next.materials);
      setMovements(next.movements);
      setRequisitions(next.requisitions);
      setSelectedCategory('all');
      setSelectedVoucherId(next.requisitions[0]?.id || '');
      setSelectedStockCardId(
        next.materials.find((m) => !m.isPriceVariant)?.id ||
          next.materials[0]?.id ||
          ''
      );
      return {
        message: `กู้คืนข้อมูลทั้งหมดเรียบร้อยแล้ว (${next.materials.length} รายการวัสดุ, ${next.movements.length} ประวัติรับ-จ่าย, ${next.requisitions.length} ใบเบิก)`,
      };
    }

    const result = mergeBackupDatasets(
      {
        agency,
        categories,
        materials,
        movements,
        requisitions,
      },
      payload.data
    );
    setCategories(result.merged.categories);
    setMaterials(result.merged.materials);
    setMovements(result.merged.movements);
    setRequisitions(result.merged.requisitions);

    return {
      message: `ผสานข้อมูลเรียบร้อยแล้ว: เพิ่มวัสดุใหม่ ${result.addedMaterials} รายการ, ประเภท ${result.addedCategories} หมวด, ประวัติรับ-จ่าย ${result.addedMovements} รายการ และใบเบิก ${result.addedRequisitions} ใบ`,
    };
  };

  const viewTitles: Record<AppView, string> = {
    overview: 'ภาพรวมและสรุปยอดประจำปี',
    ledger: 'แบบบัญชีรายงานวัสดุประจำปี',
    stockcard: 'รายงานบัญชีวัสดุ (รายตัว)',
    requisition: 'เบิกจ่ายวัสดุ (ใบเบิกวัสดุ)',
    summary: 'แบบสรุปประเภทวัสดุคงเหลือ ประจำปีงบประมาณ',
    audit_reports: 'ชุดรายงานตรวจสอบพัสดุประจำปี (เอกสาร 2–4)',
    depreciation: 'คำนวณค่าเสื่อมราคาแบบเส้นตรงรายปี',
    alerts: 'ระบบแจ้งเตือนวัสดุใกล้หมด',
    sheets: 'เชื่อมต่อและซิงค์ Google Sheets',
  };

  const categoryLabel =
    selectedCategory === 'all' ? 'ทุกหมวดหมู่' : selectedCategory;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen no-print">
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenCategorySettings={() => setCategorySettingsOpen(true)}
          onOpenBackupRestore={() => setBackupModalOpen(true)}
          agency={agency}
          alertCount={alertCount}
          sheetsConnected={!needsAuth && Boolean(user)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Bar Contract: Breadcrumb on left, concise single-line actions on right */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
                aria-label="เปิดเมนูนำทาง"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="hidden sm:inline text-slate-400 whitespace-nowrap">
                  บัญชีวัสดุ พ.ศ. {agency.fiscalYearBE}
                </span>
                <span className="hidden sm:inline text-slate-300">/</span>
                <h1 className="font-semibold text-slate-900 truncate">
                  {viewTitles[activeView]}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alertCount > 0 && activeView !== 'alerts' && (
                <button
                  type="button"
                  onClick={() => setActiveView('alerts')}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 whitespace-nowrap shrink-0"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ใกล้หมด {alertCount} รายการ
                </button>
              )}

              <button
                type="button"
                onClick={() => setBackupModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                title="สำรองและนำข้อมูลกลับมาใช้แบบไฟล์ .json"
              >
                <DatabaseBackup className="h-3.5 w-3.5 text-teal-700" />
                <span className="hidden xl:inline">สำรอง .json</span>
              </button>

              <button
                type="button"
                disabled={
                  (activeView === 'requisition' && !activeVoucher) ||
                  (activeView === 'stockcard' && !activeStockCardMaterial)
                }
                onClick={() => {
                  if (activeView === 'summary') {
                    exportCategorySummaryToExcel(agency, summaryExportRows);
                  } else if (activeView === 'audit_reports') {
                    exportAuditDocumentToExcel(activeAuditDoc, agency);
                  } else if (activeView === 'requisition') {
                    if (activeVoucher) {
                      exportRequisitionToExcel(activeVoucher, agency);
                    }
                  } else if (activeView === 'stockcard') {
                    if (activeStockCardMaterial) {
                      exportStockCardToExcel(
                        activeStockCardMaterial,
                        activeStockCardRows,
                        agency
                      );
                    }
                  } else {
                    exportLedgerToExcel(agency, exportRows, categoryLabel);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <FileDown className="h-3.5 w-3.5 text-emerald-700" />
                <span className="hidden sm:inline">ส่งออก</span> Excel
              </button>

              <button
                type="button"
                disabled={
                  (activeView === 'requisition' && !activeVoucher) ||
                  (activeView === 'stockcard' && !activeStockCardMaterial)
                }
                onClick={() => {
                  if (activeView === 'summary') {
                    setPrintTarget('summary');
                    setTimeout(() => window.print(), 120);
                  } else if (activeView === 'audit_reports') {
                    setPrintTarget('audit_single');
                    setTimeout(() => window.print(), 120);
                  } else if (activeView === 'requisition') {
                    if (activeVoucher) {
                      setPrintTarget('requisition');
                      setTimeout(() => window.print(), 120);
                    }
                  } else if (activeView === 'stockcard') {
                    if (activeStockCardMaterial) {
                      setPrintTarget('stockcard');
                      setTimeout(() => window.print(), 120);
                    }
                  } else {
                    setPrintTarget('ledger');
                    setPrintPreviewOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Printer className="h-3.5 w-3.5 text-slate-700" />
                <span className="hidden sm:inline">ส่งออก</span> PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingEntry(null);
                  setVariantParent(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มวัสดุ
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
            {authError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 space-y-2.5">
                <div className="font-semibold text-red-900">{authError}</div>
                {unauthorizedDomain && (
                  <div className="rounded-lg border border-red-200 bg-white p-3 text-slate-700 space-y-2">
                    <div className="font-medium text-slate-900">
                      วิธีแก้ไข: เพิ่มโดเมนด้านล่างใน Firebase Console (Authorized domains)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono-tabular text-[11px] text-slate-900 select-all">
                        {unauthorizedDomain}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(unauthorizedDomain);
                            setCopiedDomain(true);
                            setTimeout(() => setCopiedDomain(false), 2000);
                          } catch {
                            // clipboard fallback ignored
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            คัดลอกโดเมน
                          </>
                        )}
                      </button>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-teal-800"
                      >
                        เปิดตั้งค่า Firebase Console
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-600">
                      <li>
                        เปิดหน้า <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</strong>
                      </li>
                      <li>
                        กดปุ่ม <strong>Add domain</strong> แล้ววางโดเมน <code className="font-mono-tabular">{unauthorizedDomain}</code> ลงไป จากนั้นกด <strong>Add</strong>
                      </li>
                      <li>กลับมาที่หน้านี้แล้วกดปุ่ม <strong>Sign in with Google</strong> อีกครั้ง</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {activeView === 'overview' && (
              <DashboardOverview
                agency={agency}
                rows={computedRows}
                categories={categories}
                movements={movements}
                onNavigate={setActiveView}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                onQuickRestock={(row) => {
                  setMovementTarget(row);
                  setMovementDefaultType('purchase');
                  setMovementModalOpen(true);
                }}
                onOpenCategorySettings={() => setCategorySettingsOpen(true)}
              />
            )}

            {activeView === 'ledger' && (
              <MaterialLedgerTable
                agency={agency}
                onUpdateAgency={setAgency}
                rows={computedRows}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onOpenCategorySettings={() => setCategorySettingsOpen(true)}
                onAddMaterial={() => {
                  setEditingEntry(null);
                  setVariantParent(null);
                  setFormOpen(true);
                }}
                onAddVariant={(parent) => {
                  setEditingEntry(null);
                  setVariantParent(parent);
                  setFormOpen(true);
                }}
                onEditMaterial={(entry) => {
                  setVariantParent(null);
                  setEditingEntry(entry);
                  setFormOpen(true);
                }}
                onDeleteMaterial={(entry) => setDeleteTarget(entry)}
                onRecordMovement={(row) => {
                  setMovementTarget(row);
                  setMovementDefaultType('use');
                  setMovementModalOpen(true);
                }}
              />
            )}

            {activeView === 'stockcard' && (
              <StockCardView
                agency={agency}
                rows={computedRows}
                categories={categories}
                movements={movements}
                requisitions={requisitions}
                selectedMaterialId={activeStockCardMaterial?.id || ''}
                onSelectMaterial={setSelectedStockCardId}
                onUpdateMaterialMeta={handleUpdateEntryInline}
                onRecordMovement={(row) => {
                  setMovementTarget(row);
                  setMovementDefaultType('use');
                  setMovementModalOpen(true);
                }}
                onPrintStockCard={() => {
                  setPrintTarget('stockcard');
                  setTimeout(() => window.print(), 150);
                }}
              />
            )}

            {activeView === 'summary' && (
              <CategorySummaryReportView
                agency={agency}
                onUpdateAgency={setAgency}
                rows={computedRows}
                categories={categories}
                onPrintSummary={() => {
                  setPrintTarget('summary');
                  setTimeout(() => window.print(), 150);
                }}
              />
            )}

            {activeView === 'audit_reports' && (
              <AuditReportsView
                agency={agency}
                onUpdateAgency={setAgency}
                rows={computedRows}
                activeDocId={activeAuditDocId}
                onSelectDocId={setActiveAuditDocId}
                categoryLabel={categoryLabel}
                onPrintSingle={() => {
                  setPrintTarget('audit_single');
                  setTimeout(() => window.print(), 150);
                }}
                onPrintBundle={() => {
                  setPrintTarget('audit_bundle');
                  setTimeout(() => window.print(), 150);
                }}
              />
            )}

            {activeView === 'requisition' && (
              <RequisitionView
                agency={agency}
                vouchers={requisitions}
                selectedVoucherId={activeVoucher?.id || ''}
                onSelectVoucher={setSelectedVoucherId}
                onCreateVoucher={() => {
                  setEditingVoucher(null);
                  setReqFormOpen(true);
                }}
                onEditVoucher={(voucher) => {
                  setEditingVoucher(voucher);
                  setReqFormOpen(true);
                }}
                onDeleteVoucher={(voucher) => setDeleteVoucherTarget(voucher)}
                onPrintVoucher={() => {
                  setPrintTarget('requisition');
                  setTimeout(() => window.print(), 150);
                }}
              />
            )}

            {activeView === 'depreciation' && (
              <DepreciationView
                agency={agency}
                rows={computedRows}
                onUpdateEntry={handleUpdateEntryInline}
              />
            )}

            {activeView === 'alerts' && (
              <LowStockAlertsView
                rows={computedRows}
                onQuickRestock={(row) => {
                  setMovementTarget(row);
                  setMovementDefaultType('purchase');
                  setMovementModalOpen(true);
                }}
                onUpdateThreshold={handleUpdateThreshold}
              />
            )}

            {activeView === 'sheets' && (
              <GoogleSheetsSyncView
                user={user}
                needsAuth={needsAuth}
                isLoggingIn={isLoggingIn}
                onLogin={handleGoogleLogin}
                onLogout={handleGoogleLogout}
                getToken={getAccessToken}
                onRequireReauth={() => setNeedsAuth(true)}
                agency={agency}
                rows={exportRows}
                categories={categories}
                selectedCategory={selectedCategory}
                onImportEntries={(imported, mode) => {
                  const importedCats = Array.from(
                    new Set(imported.map((item) => item.category).filter(Boolean))
                  );
                  setCategories((prev) => {
                    const missing = importedCats.filter((c) => !prev.includes(c));
                    return missing.length > 0 ? [...prev, ...missing] : prev;
                  });
                  if (mode === 'replace') {
                    setMaterials(imported);
                  } else {
                    setMaterials((prev) => [...prev, ...imported]);
                  }
                  setActiveView('ledger');
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* Official PDF Print Preview & Print DOM */}
      {printTarget === 'summary' ? (
        <div className="print-only">
          <PrintableCategorySummaryDocument
            agency={agency}
            summaryRows={summaryExportRows}
          />
        </div>
      ) : printTarget === 'requisition' && activeVoucher ? (
        <div className="print-only">
          <PrintableRequisitionDocument voucher={activeVoucher} />
        </div>
      ) : printTarget === 'stockcard' && activeStockCardMaterial ? (
        <div className="print-only">
          <PrintableStockCardDocument
            material={activeStockCardMaterial}
            cardRows={activeStockCardRows}
            agency={agency}
          />
        </div>
      ) : printTarget === 'audit_single' ? (
        <div className="print-only">
          <PrintableAuditDocument doc={activeAuditDoc} agency={agency} />
        </div>
      ) : printTarget === 'audit_bundle' ? (
        <div className="print-only">
          <PrintableAuditBundle agency={agency} rows={computedRows} />
        </div>
      ) : (
        <OfficialPrintReport
          agency={agency}
          rows={exportRows}
          categories={categories}
          selectedCategory={selectedCategory}
          previewOpen={printPreviewOpen}
          onClosePreview={() => setPrintPreviewOpen(false)}
          onPrintNow={() => {
            setPrintTarget('ledger');
            setPrintPreviewOpen(false);
            setTimeout(() => window.print(), 150);
          }}
        />
      )}

      {/* Add / Edit Material Modal */}
      <MaterialFormModal
        open={formOpen}
        initialEntry={editingEntry}
        presetVariantParent={variantParent}
        categories={categories}
        defaultCategory={
          selectedCategory === 'all'
            ? categories[0] || 'วัสดุสำนักงาน'
            : selectedCategory
        }
        onSave={handleSaveMaterial}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(null);
          setVariantParent(null);
        }}
      />

      {/* Quick Stock Receipt / Issuance Modal */}
      <StockMovementModal
        open={movementModalOpen}
        material={movementTarget}
        defaultType={movementDefaultType}
        onSubmit={handleRecordMovement}
        onClose={() => {
          setMovementModalOpen(false);
          setMovementTarget(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบรายการวัสดุ?"
        description={`คุณต้องการลบรายการ "${deleteTarget?.code || ''} ${
          deleteTarget?.name || ''
        }" ออกจากบัญชีวัสดุประจำปีหรือไม่?`}
        confirmLabel="ลบรายการ"
        cancelLabel="ยกเลิก"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Category Management Modal */}
      <CategorySettingsModal
        open={categorySettingsOpen}
        categories={categories}
        materials={materials}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onReorderCategory={handleReorderCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetDefaults={handleResetDefaultCategories}
        onClose={() => setCategorySettingsOpen(false)}
      />

      {/* Requisition Create / Edit Modal */}
      <RequisitionFormModal
        open={reqFormOpen}
        initialVoucher={editingVoucher}
        rows={computedRows}
        agency={agency}
        nextVoucherSeq={requisitions.length + 1}
        onSave={handleSaveRequisition}
        onClose={() => {
          setReqFormOpen(false);
          setEditingVoucher(null);
        }}
      />

      {/* Delete Requisition Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteVoucherTarget)}
        title="ยืนยันการลบใบเบิกวัสดุ?"
        description={`คุณต้องการลบใบเบิกวัสดุเลขที่ "${
          deleteVoucherTarget?.voucherNo || ''
        }" และคืนยอดวัสดุที่จ่ายออกกลับเข้าคลังหรือไม่?`}
        confirmLabel="ลบใบเบิกและคืนยอด"
        cancelLabel="ยกเลิก"
        tone="danger"
        onConfirm={handleConfirmDeleteVoucher}
        onCancel={() => setDeleteVoucherTarget(null)}
      />

      {/* JSON Backup & Restore Modal */}
      <BackupRestoreModal
        open={backupModalOpen}
        currentData={{
          agency,
          categories,
          materials,
          movements,
          requisitions,
        }}
        lastBackupAt={lastBackupAt}
        onDownloadBackup={handleDownloadBackupJson}
        onRestoreBackup={handleRestoreBackupJson}
        onClose={() => setBackupModalOpen(false)}
      />
    </div>
  );
}
