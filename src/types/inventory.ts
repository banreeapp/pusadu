export type MaterialCategory = string;

export const DEFAULT_MATERIAL_CATEGORIES: string[] = [
  'วัสดุสำนักงาน',
  'วัสดุแบบพิมพ์',
  'วัสดุน้ำมันเชื้อเพลิงและหล่อลื่น',
  'วัสดุงานบ้านงานครัว',
  'วัสดุไฟฟ้า',
  'วัตถุดิบสมุนไพร',
  'ยาและอื่นๆ',
];

export const MATERIAL_CATEGORIES = DEFAULT_MATERIAL_CATEGORIES;

export type StockStatus = 'out' | 'low' | 'normal';

export interface DepreciationConfig {
  enabled: boolean;
  costBasisMode: 'ending' | 'total_in' | 'custom';
  customCostBasis: number;
  salvageValue: number;
  usefulLifeYears: number;
  elapsedYears: number;
}

export interface MaterialEntry {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: string;
  isPriceVariant?: boolean; // (กรณีมีต่างราคา)
  parentCode?: string;
  // (1) ยอดคงเหลือยกมา 1 ต.ค.
  beginningQty: number;
  beginningUnitPrice: number;
  // (2) จัดซื้อ / รับจากกรม
  purchasedQty: number;
  purchasedUnitPrice: number;
  // (3) วัสดุใช้ไป / จ่ายไป
  usedQty: number;
  usedUnitPrice: number;
  // รายละเอียดเพิ่มเติมสำหรับรายงานบัญชีวัสดุ (Stock Card)
  specification?: string; // ขนาดหรือลักษณะ
  // ระบบแจ้งเตือนวัสดุใกล้หมด
  minThreshold: number; // จำนวนอย่างต่ำ
  maxThreshold?: number; // จำนวนอย่างสูง
  // ค่าเสื่อมราคาแบบเส้นตรงรายปี
  depreciation: DepreciationConfig;
  note?: string;
  updatedAt: string;
}

export interface ComputedMaterialRow extends MaterialEntry {
  beginningTotal: number; // (1)
  purchasedTotal: number; // (2)
  usedTotal: number; // (3)
  remainingQty: number; // จำนวนคงเหลือ
  remainingTotal: number; // (4) = (1) + (2) - (3)
  stockStatus: StockStatus;
  suggestedRestockQty: number;
  // Straight-line depreciation computed values
  depreciationCostBasis: number;
  annualDepreciation: number;
  depreciationRatePct: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface StockMovement {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  type: 'purchase' | 'use';
  qty: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  note: string;
  docNo?: string; // เลขที่เอกสาร (ใบสั่งซื้อ / ใบเบิกวัสดุ)
  counterparty?: string; // รับจาก / จ่ายให้
}

export interface AgencyProfile {
  agencyName: string;
  costCenterCode: string;
  fiscalYearBE: number; // e.g., 2569 -> beginning date 1 ต.ค. 2568
  documentNumber: string; // e.g., เอกสารหมายเลข 1
  preparerName: string;
  preparerTitle: string;
  reviewerName: string;
  reviewerTitle: string;
  approverName: string;
  approverTitle: string;
  accountTypeCode?: string; // รหัสบัญชีแยกประเภท บัญชีวัสดุคงคลัง e.g. 1105010105
  rawMaterialAccountCode?: string; // รหัสบัญชีแยกประเภท บัญชีวัตถุดิบ e.g. 1105010101
  finishedGoodsAccountCode?: string; // รหัสบัญชีแยกประเภท บัญชีสินค้าสำเร็จรูป e.g. 1105010103
  disbursementCode?: string; // รหัสหน่วยเบิกจ่าย e.g. 01747
  healthZone?: string; // เขต e.g. 4
  auditReportDate?: string; // วันที่รายงาน e.g. 30 ก.ย. 69
  committeeChairName?: string;
  committeeChairTitle?: string;
  committeeMember1Name?: string;
  committeeMember1Title?: string;
  committeeMember2Name?: string;
  committeeMember2Title?: string;
  categoryNotes?: Record<string, string>;
  auditRowNotes?: Record<string, string>;
}

export interface LedgerTotals {
  beginningTotal: number; // (1)
  purchasedTotal: number; // (2)
  usedTotal: number; // (3)
  remainingTotal: number; // (4)
  itemCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAnnualDepreciation: number;
  totalNetBookValue: number;
}

export interface DepreciationScheduleRow {
  yearIndex: number;
  fiscalYearLabel: string;
  openingBookValue: number;
  annualExpense: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
}

export interface RequisitionItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  requestedQty: number; // จำนวน เบิก
  issuedQty: number; // จำนวน จ่าย
  remainingAfter: number; // คงเหลือหลังจ่าย
  unitPrice: number;
}

export interface RequisitionVoucher {
  id: string;
  voucherNo: string;
  date: string; // YYYY-MM-DD
  recipientTitle: string; // เรียน
  purpose: string; // เพื่อใช้งานราชการ
  phone: string;
  items: RequisitionItem[];
  requesterName: string;
  requesterTitle: string;
  requesterDate: string;
  issuerName: string;
  issuerTitle: string;
  issuerDate: string;
  approverName: string;
  approverTitle: string;
  approverDate: string;
  receiverName: string;
  receiverTitle: string;
  receiverDate: string;
  createdAt: string;
  updatedAt: string;
}

export type AppView =
  | 'overview'
  | 'ledger'
  | 'stockcard'
  | 'requisition'
  | 'summary'
  | 'audit_reports'
  | 'depreciation'
  | 'alerts'
  | 'sheets';

export type SheetsSyncStatusKind = 'idle' | 'syncing' | 'success' | 'error';

export interface SheetsSyncStatus {
  kind: SheetsSyncStatusKind;
  lastSyncAt: string | null;
  lastSyncAction?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  message?: string;
  errorMessage?: string;
}

