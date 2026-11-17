import { DEFAULT_AGENCY_PROFILE } from '../data/initialMaterials';
import {
  AgencyProfile,
  DEFAULT_MATERIAL_CATEGORIES,
  DepreciationConfig,
  MaterialEntry,
  RequisitionItem,
  RequisitionVoucher,
  StockMovement,
} from '../types/inventory';

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = 'thai-material-ledger';

export interface InventoryBackupData {
  agency: AgencyProfile;
  categories: string[];
  materials: MaterialEntry[];
  movements: StockMovement[];
  requisitions: RequisitionVoucher[];
}

export interface InventoryBackupPayload {
  schemaVersion: number;
  app: string;
  exportedAt: string;
  fiscalYearBE: number;
  agencyName: string;
  data: InventoryBackupData;
}

export interface BackupSummary {
  exportedAt: string;
  agencyName: string;
  costCenterCode: string;
  fiscalYearBE: number;
  materialCount: number;
  categoryCount: number;
  movementCount: number;
  requisitionCount: number;
}

export type ParseBackupResult =
  | {
      valid: true;
      payload: InventoryBackupPayload;
      summary: BackupSummary;
      warnings: string[];
    }
  | {
      valid: false;
      error: string;
    };

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toStringOrEmpty(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeDepreciation(raw: unknown): DepreciationConfig {
  const obj =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const mode = obj.costBasisMode;
  const validMode =
    mode === 'ending' || mode === 'total_in' || mode === 'custom'
      ? mode
      : 'ending';

  return {
    enabled: Boolean(obj.enabled),
    costBasisMode: validMode,
    customCostBasis: Math.max(0, toFiniteNumber(obj.customCostBasis, 0)),
    salvageValue: Math.max(0, toFiniteNumber(obj.salvageValue, 1)),
    usefulLifeYears: Math.max(1, toFiniteNumber(obj.usefulLifeYears, 5)),
    elapsedYears: Math.max(0, toFiniteNumber(obj.elapsedYears, 1)),
  };
}

function normalizeMaterial(raw: unknown, index: number): MaterialEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const name = toStringOrEmpty(obj.name).trim();
  if (!name) return null;

  const id =
    toStringOrEmpty(obj.id).trim() || `mat-restored-${Date.now()}-${index}`;
  const code = toStringOrEmpty(obj.code).trim();
  const category =
    toStringOrEmpty(obj.category).trim() ||
    DEFAULT_MATERIAL_CATEGORIES[0] ||
    'วัสดุสำนักงาน';
  const unit = toStringOrEmpty(obj.unit).trim() || 'หน่วย';

  return {
    id,
    code,
    name,
    category,
    unit,
    isPriceVariant: Boolean(obj.isPriceVariant),
    parentCode: toStringOrEmpty(obj.parentCode).trim() || undefined,
    beginningQty: Math.max(0, toFiniteNumber(obj.beginningQty, 0)),
    beginningUnitPrice: Math.max(0, toFiniteNumber(obj.beginningUnitPrice, 0)),
    purchasedQty: Math.max(0, toFiniteNumber(obj.purchasedQty, 0)),
    purchasedUnitPrice: Math.max(0, toFiniteNumber(obj.purchasedUnitPrice, 0)),
    usedQty: Math.max(0, toFiniteNumber(obj.usedQty, 0)),
    usedUnitPrice: Math.max(0, toFiniteNumber(obj.usedUnitPrice, 0)),
    specification: toStringOrEmpty(obj.specification).trim() || undefined,
    minThreshold: Math.max(0, toFiniteNumber(obj.minThreshold, 0)),
    maxThreshold:
      obj.maxThreshold !== undefined && obj.maxThreshold !== null
        ? Math.max(0, toFiniteNumber(obj.maxThreshold, 0))
        : undefined,
    depreciation: normalizeDepreciation(obj.depreciation),
    note: toStringOrEmpty(obj.note).trim() || undefined,
    updatedAt: toStringOrEmpty(obj.updatedAt) || new Date().toISOString(),
  };
}

function normalizeMovement(raw: unknown, index: number): StockMovement | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const materialId = toStringOrEmpty(obj.materialId).trim();
  const materialName = toStringOrEmpty(obj.materialName).trim();
  if (!materialId && !materialName) return null;

  const qty = Math.max(0, toFiniteNumber(obj.qty, 0));
  const unitPrice = Math.max(0, toFiniteNumber(obj.unitPrice, 0));
  const totalAmount =
    obj.totalAmount !== undefined
      ? Math.max(0, toFiniteNumber(obj.totalAmount, qty * unitPrice))
      : qty * unitPrice;

  return {
    id: toStringOrEmpty(obj.id).trim() || `mov-restored-${Date.now()}-${index}`,
    materialId,
    materialCode: toStringOrEmpty(obj.materialCode).trim(),
    materialName,
    type: obj.type === 'purchase' ? 'purchase' : 'use',
    qty,
    unitPrice,
    totalAmount,
    date: toStringOrEmpty(obj.date) || new Date().toISOString().slice(0, 10),
    note: toStringOrEmpty(obj.note),
    docNo: toStringOrEmpty(obj.docNo).trim() || undefined,
    counterparty: toStringOrEmpty(obj.counterparty).trim() || undefined,
  };
}

function normalizeRequisitionItem(
  raw: unknown,
  index: number
): RequisitionItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const materialName = toStringOrEmpty(obj.materialName).trim();
  if (!materialName) return null;

  return {
    id: toStringOrEmpty(obj.id).trim() || `req-item-${Date.now()}-${index}`,
    materialId: toStringOrEmpty(obj.materialId).trim(),
    materialCode: toStringOrEmpty(obj.materialCode).trim(),
    materialName,
    unit: toStringOrEmpty(obj.unit).trim() || 'หน่วย',
    requestedQty: Math.max(0, toFiniteNumber(obj.requestedQty, 0)),
    issuedQty: Math.max(0, toFiniteNumber(obj.issuedQty, 0)),
    remainingAfter: Math.max(0, toFiniteNumber(obj.remainingAfter, 0)),
    unitPrice: Math.max(0, toFiniteNumber(obj.unitPrice, 0)),
  };
}

function normalizeRequisition(
  raw: unknown,
  index: number
): RequisitionVoucher | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const voucherNo = toStringOrEmpty(obj.voucherNo).trim();
  if (!voucherNo && !Array.isArray(obj.items)) return null;

  const items = Array.isArray(obj.items)
    ? obj.items
        .map((item, idx) => normalizeRequisitionItem(item, idx))
        .filter((x): x is RequisitionItem => x !== null)
    : [];

  return {
    id: toStringOrEmpty(obj.id).trim() || `req-restored-${Date.now()}-${index}`,
    voucherNo: voucherNo || `REQ-${index + 1}`,
    date: toStringOrEmpty(obj.date) || new Date().toISOString().slice(0, 10),
    recipientTitle: toStringOrEmpty(obj.recipientTitle) || 'หัวหน้าหน่วยพัสดุ',
    purpose: toStringOrEmpty(obj.purpose),
    phone: toStringOrEmpty(obj.phone),
    items,
    requesterName: toStringOrEmpty(obj.requesterName),
    requesterTitle: toStringOrEmpty(obj.requesterTitle),
    requesterDate: toStringOrEmpty(obj.requesterDate),
    issuerName: toStringOrEmpty(obj.issuerName),
    issuerTitle: toStringOrEmpty(obj.issuerTitle),
    issuerDate: toStringOrEmpty(obj.issuerDate),
    approverName: toStringOrEmpty(obj.approverName),
    approverTitle: toStringOrEmpty(obj.approverTitle),
    approverDate: toStringOrEmpty(obj.approverDate),
    receiverName: toStringOrEmpty(obj.receiverName),
    receiverTitle: toStringOrEmpty(obj.receiverTitle),
    receiverDate: toStringOrEmpty(obj.receiverDate),
    createdAt: toStringOrEmpty(obj.createdAt) || new Date().toISOString(),
    updatedAt: toStringOrEmpty(obj.updatedAt) || new Date().toISOString(),
  };
}

function normalizeAgency(raw: unknown): AgencyProfile {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_AGENCY_PROFILE };
  }
  const obj = raw as Record<string, unknown>;
  const merged: AgencyProfile = {
    ...DEFAULT_AGENCY_PROFILE,
    agencyName:
      toStringOrEmpty(obj.agencyName) || DEFAULT_AGENCY_PROFILE.agencyName,
    costCenterCode:
      toStringOrEmpty(obj.costCenterCode) ||
      DEFAULT_AGENCY_PROFILE.costCenterCode,
    fiscalYearBE: toFiniteNumber(
      obj.fiscalYearBE,
      DEFAULT_AGENCY_PROFILE.fiscalYearBE
    ),
    documentNumber:
      toStringOrEmpty(obj.documentNumber) ||
      DEFAULT_AGENCY_PROFILE.documentNumber,
    preparerName:
      toStringOrEmpty(obj.preparerName) || DEFAULT_AGENCY_PROFILE.preparerName,
    preparerTitle:
      toStringOrEmpty(obj.preparerTitle) ||
      DEFAULT_AGENCY_PROFILE.preparerTitle,
    reviewerName:
      toStringOrEmpty(obj.reviewerName) || DEFAULT_AGENCY_PROFILE.reviewerName,
    reviewerTitle:
      toStringOrEmpty(obj.reviewerTitle) ||
      DEFAULT_AGENCY_PROFILE.reviewerTitle,
    approverName:
      toStringOrEmpty(obj.approverName) || DEFAULT_AGENCY_PROFILE.approverName,
    approverTitle:
      toStringOrEmpty(obj.approverTitle) ||
      DEFAULT_AGENCY_PROFILE.approverTitle,
    accountTypeCode:
      toStringOrEmpty(obj.accountTypeCode) ||
      DEFAULT_AGENCY_PROFILE.accountTypeCode,
    rawMaterialAccountCode:
      toStringOrEmpty(obj.rawMaterialAccountCode) ||
      DEFAULT_AGENCY_PROFILE.rawMaterialAccountCode,
    finishedGoodsAccountCode:
      toStringOrEmpty(obj.finishedGoodsAccountCode) ||
      DEFAULT_AGENCY_PROFILE.finishedGoodsAccountCode,
    disbursementCode:
      toStringOrEmpty(obj.disbursementCode) ||
      DEFAULT_AGENCY_PROFILE.disbursementCode,
    healthZone:
      toStringOrEmpty(obj.healthZone) || DEFAULT_AGENCY_PROFILE.healthZone,
    auditReportDate:
      toStringOrEmpty(obj.auditReportDate) ||
      DEFAULT_AGENCY_PROFILE.auditReportDate,
    committeeChairName:
      toStringOrEmpty(obj.committeeChairName) ||
      DEFAULT_AGENCY_PROFILE.committeeChairName,
    committeeChairTitle:
      toStringOrEmpty(obj.committeeChairTitle) ||
      DEFAULT_AGENCY_PROFILE.committeeChairTitle,
    committeeMember1Name:
      toStringOrEmpty(obj.committeeMember1Name) ||
      DEFAULT_AGENCY_PROFILE.committeeMember1Name,
    committeeMember1Title:
      toStringOrEmpty(obj.committeeMember1Title) ||
      DEFAULT_AGENCY_PROFILE.committeeMember1Title,
    committeeMember2Name:
      toStringOrEmpty(obj.committeeMember2Name) ||
      DEFAULT_AGENCY_PROFILE.committeeMember2Name,
    committeeMember2Title:
      toStringOrEmpty(obj.committeeMember2Title) ||
      DEFAULT_AGENCY_PROFILE.committeeMember2Title,
  };

  if (typeof obj.categoryNotes === 'object' && obj.categoryNotes !== null) {
    const cleanNotes: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj.categoryNotes)) {
      if (typeof v === 'string') cleanNotes[k] = v;
    }
    merged.categoryNotes = cleanNotes;
  }

  if (typeof obj.auditRowNotes === 'object' && obj.auditRowNotes !== null) {
    const cleanAuditNotes: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj.auditRowNotes)) {
      if (typeof v === 'string') cleanAuditNotes[k] = v;
    }
    merged.auditRowNotes = cleanAuditNotes;
  }

  return merged;
}

export function buildBackupPayload(
  data: InventoryBackupData
): InventoryBackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    fiscalYearBE: data.agency.fiscalYearBE,
    agencyName: data.agency.agencyName,
    data: {
      agency: data.agency,
      categories: data.categories,
      materials: data.materials,
      movements: data.movements,
      requisitions: data.requisitions,
    },
  };
}

export function downloadBackupJson(payload: InventoryBackupPayload): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const safeYear = payload.fiscalYearBE || yyyy + 543;
  const filename = `backup-วัสดุประจำปี-${safeYear}-${yyyy}${mm}${dd}-${hh}${min}.json`;

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return filename;
}

export function parseAndValidateBackupJson(rawText: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      valid: false,
      error: 'ไฟล์ไม่ใช่รูปแบบ JSON ที่ถูกต้อง กรุณาตรวจสอบว่าไม่ได้แก้ไขหรือตัดทอนเนื้อหาในไฟล์',
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      valid: false,
      error: 'โครงสร้างข้อมูลในไฟล์ไม่ถูกต้อง (ไม่พบ Object หลัก)',
    };
  }

  const root = parsed as Record<string, unknown>;
  const warnings: string[] = [];

  if (root.app && root.app !== BACKUP_APP_ID) {
    warnings.push(
      `ไฟล์นี้มีค่า app="${String(root.app)}" ระบบจะพยายามอ่านและแปลงโครงสร้างข้อมูลให้`
    );
  }

  // Support both wrapped { schemaVersion, data: { ... } } and direct { materials: [...] }
  const dataSource =
    typeof root.data === 'object' && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root;

  if (!Array.isArray(dataSource.materials)) {
    return {
      valid: false,
      error:
        'ไม่พบรายการวัสดุ (materials) ในไฟล์ JSON กรุณาเลือกไฟล์สำรองข้อมูลที่ส่งออกจากระบบนี้',
    };
  }

  const materials = dataSource.materials
    .map((item, idx) => normalizeMaterial(item, idx))
    .filter((item): item is MaterialEntry => item !== null);

  if (dataSource.materials.length > 0 && materials.length === 0) {
    return {
      valid: false,
      error:
        'ไม่สามารถอ่านรายการวัสดุจากไฟล์ได้ เนื่องจากขาดชื่อวัสดุหรือข้อมูลไม่ครบถ้วน',
    };
  }

  if (materials.length < dataSource.materials.length) {
    warnings.push(
      `ข้ามรายการวัสดุที่ไม่สมบูรณ์จำนวน ${
        dataSource.materials.length - materials.length
      } รายการ`
    );
  }

  const rawCategories = Array.isArray(dataSource.categories)
    ? dataSource.categories
        .filter((c): c is string => typeof c === 'string')
        .map((c) => c.trim())
        .filter(Boolean)
    : [];

  const categorySet = new Set<string>(rawCategories);
  for (const mat of materials) {
    if (mat.category) categorySet.add(mat.category);
  }
  if (categorySet.size === 0) {
    DEFAULT_MATERIAL_CATEGORIES.forEach((c) => categorySet.add(c));
  }
  const categories = Array.from(categorySet);

  const movements = Array.isArray(dataSource.movements)
    ? dataSource.movements
        .map((m, idx) => normalizeMovement(m, idx))
        .filter((m): m is StockMovement => m !== null)
    : [];

  if (!Array.isArray(dataSource.movements)) {
    warnings.push('ไม่พบประวัติรับ-จ่าย (movements) ในไฟล์ ระบบตั้งค่าเริ่มต้นเป็น 0 รายการ');
  }

  const requisitions = Array.isArray(dataSource.requisitions)
    ? dataSource.requisitions
        .map((r, idx) => normalizeRequisition(r, idx))
        .filter((r): r is RequisitionVoucher => r !== null)
    : [];

  if (!Array.isArray(dataSource.requisitions)) {
    warnings.push('ไม่พบข้อมูลใบเบิกวัสดุ (requisitions) ในไฟล์ ระบบตั้งค่าเริ่มต้นเป็น 0 ใบ');
  }

  const agency = normalizeAgency(dataSource.agency);
  const exportedAt =
    toStringOrEmpty(root.exportedAt) || new Date().toISOString();

  const payload: InventoryBackupPayload = {
    schemaVersion: toFiniteNumber(root.schemaVersion, BACKUP_SCHEMA_VERSION),
    app: BACKUP_APP_ID,
    exportedAt,
    fiscalYearBE: agency.fiscalYearBE,
    agencyName: agency.agencyName,
    data: {
      agency,
      categories,
      materials,
      movements,
      requisitions,
    },
  };

  return {
    valid: true,
    payload,
    warnings,
    summary: {
      exportedAt,
      agencyName: agency.agencyName,
      costCenterCode: agency.costCenterCode,
      fiscalYearBE: agency.fiscalYearBE,
      materialCount: materials.length,
      categoryCount: categories.length,
      movementCount: movements.length,
      requisitionCount: requisitions.length,
    },
  };
}

export function mergeBackupDatasets(
  current: InventoryBackupData,
  incoming: InventoryBackupData
): {
  merged: InventoryBackupData;
  addedMaterials: number;
  addedMovements: number;
  addedRequisitions: number;
  addedCategories: number;
} {
  const existingCategorySet = new Set(current.categories);
  const newCategories = incoming.categories.filter(
    (c) => !existingCategorySet.has(c)
  );
  const categories = [...current.categories, ...newCategories];

  const existingMatIds = new Set(current.materials.map((m) => m.id));
  const newMaterials = incoming.materials.filter(
    (m) => !existingMatIds.has(m.id)
  );
  const materials = [...current.materials, ...newMaterials];

  const existingMovIds = new Set(current.movements.map((m) => m.id));
  const newMovements = incoming.movements.filter(
    (m) => !existingMovIds.has(m.id)
  );
  const movements = [...newMovements, ...current.movements];

  const existingReqIds = new Set(current.requisitions.map((r) => r.id));
  const newRequisitions = incoming.requisitions.filter(
    (r) => !existingReqIds.has(r.id)
  );
  const requisitions = [...current.requisitions, ...newRequisitions];

  return {
    merged: {
      agency: current.agency,
      categories,
      materials,
      movements,
      requisitions,
    },
    addedMaterials: newMaterials.length,
    addedMovements: newMovements.length,
    addedRequisitions: newRequisitions.length,
    addedCategories: newCategories.length,
  };
}
