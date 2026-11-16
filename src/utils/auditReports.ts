import { AgencyProfile, ComputedMaterialRow } from '../types/inventory';
import { roundCurrency } from './calculations';

export type AuditDocId = 'doc2' | 'doc3' | 'doc4';

export interface AuditReportRow {
  key: string;
  index: number;
  label: string;
  unit: string;
  beginningTotal: number;
  purchasedTotal: number;
  usedTotal: number;
  remainingQty: number;
  remainingUnitPrice: number | null;
  remainingTotal: number;
  note: string;
  hasData: boolean;
}

export interface AuditDocumentData {
  id: AuditDocId;
  documentNumber: string;
  title: string;
  accountTitle: string;
  accountCode: string;
  agencyLabel: string;
  dateLabel: string;
  itemColLabel: string;
  footerLabel: string;
  rows: AuditReportRow[];
  grandRemainingTotal: number;
}

export const DOC3_CATEGORIES = [
  'ยา',
  'วัสดุเภสัชกรรม',
  'วัสดุการแพทย์ทั่วไป',
  'วัสดุวิทยาศาสตร์และการแพทย์',
  'วัสดุเอกซเรย์',
  'วัสดุทันตกรรม',
  'วัสดุบริโภค',
  'วัสดุเครื่องแต่งกาย',
] as const;

export const DOC4_CATEGORIES = [
  'วัสดุสำนักงาน',
  'วัสดุยานพาหนะและขนส่ง',
  'วัสดุเชื้อเพลิงและหล่อลื่น',
  'วัสดุไฟฟ้าและวิทยุ',
  'วัสดุโฆษณาและเผยแพร่',
  'วัสดุคอมพิวเตอร์',
  'วัสดุงานบ้านงานครัว',
  'วัสดุก่อสร้าง',
  'วัสดุเกษตร',
  'วัสดุการศึกษา',
  'วัสดุสนาม',
  'วัสดุอื่น',
] as const;

function classifyCategoryToDoc(category: string): {
  doc: AuditDocId;
  bucket: string;
} {
  const c = category.trim();

  // Doc 2: วัตถุดิบสมุนไพร
  if (c.includes('สมุนไพร') || c.includes('วัตถุดิบ')) {
    return { doc: 'doc2', bucket: c };
  }

  // Doc 3: บัญชีสินค้าสำเร็จรูป
  if (c === 'ยา' || c.includes('ยาและอื่น')) return { doc: 'doc3', bucket: 'ยา' };
  if (c.includes('เภสัช')) return { doc: 'doc3', bucket: 'วัสดุเภสัชกรรม' };
  if (c.includes('วิทยาศาสตร์')) return { doc: 'doc3', bucket: 'วัสดุวิทยาศาสตร์และการแพทย์' };
  if (c.includes('เอกซเรย์')) return { doc: 'doc3', bucket: 'วัสดุเอกซเรย์' };
  if (c.includes('ทันตกรรม')) return { doc: 'doc3', bucket: 'วัสดุทันตกรรม' };
  if (c.includes('บริโภค')) return { doc: 'doc3', bucket: 'วัสดุบริโภค' };
  if (c.includes('เครื่องแต่งกาย')) return { doc: 'doc3', bucket: 'วัสดุเครื่องแต่งกาย' };
  if (c.includes('การแพทย์') || c.includes('เวชภัณฑ์')) {
    return { doc: 'doc3', bucket: 'วัสดุการแพทย์ทั่วไป' };
  }

  // Doc 4: บัญชีวัสดุคงคลัง
  if (c.includes('สำนักงาน')) return { doc: 'doc4', bucket: 'วัสดุสำนักงาน' };
  if (c.includes('ยานพาหนะ') || c.includes('ขนส่ง')) {
    return { doc: 'doc4', bucket: 'วัสดุยานพาหนะและขนส่ง' };
  }
  if (c.includes('เชื้อเพลิง') || c.includes('หล่อลื่น')) {
    return { doc: 'doc4', bucket: 'วัสดุเชื้อเพลิงและหล่อลื่น' };
  }
  if (c.includes('ไฟฟ้า') || c.includes('วิทยุ')) {
    return { doc: 'doc4', bucket: 'วัสดุไฟฟ้าและวิทยุ' };
  }
  if (c.includes('โฆษณา') || c.includes('เผยแพร่')) {
    return { doc: 'doc4', bucket: 'วัสดุโฆษณาและเผยแพร่' };
  }
  if (c.includes('คอมพิวเตอร์')) return { doc: 'doc4', bucket: 'วัสดุคอมพิวเตอร์' };
  if (c.includes('งานบ้าน') || c.includes('งานครัว')) {
    return { doc: 'doc4', bucket: 'วัสดุงานบ้านงานครัว' };
  }
  if (c.includes('ก่อสร้าง')) return { doc: 'doc4', bucket: 'วัสดุก่อสร้าง' };
  if (c.includes('เกษตร')) return { doc: 'doc4', bucket: 'วัสดุเกษตร' };
  if (c.includes('การศึกษา')) return { doc: 'doc4', bucket: 'วัสดุการศึกษา' };
  if (c.includes('สนาม')) return { doc: 'doc4', bucket: 'วัสดุสนาม' };

  return { doc: 'doc4', bucket: 'วัสดุอื่น' };
}

function aggregateBucketRows(
  bucketLabel: string,
  index: number,
  items: ComputedMaterialRow[],
  noteKey: string,
  auditRowNotes?: Record<string, string>
): AuditReportRow {
  const hasData = items.length > 0;
  if (!hasData) {
    return {
      key: noteKey,
      index,
      label: bucketLabel,
      unit: '',
      beginningTotal: 0,
      purchasedTotal: 0,
      usedTotal: 0,
      remainingQty: 0,
      remainingUnitPrice: null,
      remainingTotal: 0,
      note: auditRowNotes?.[noteKey] || '',
      hasData: false,
    };
  }

  const beginningTotal = roundCurrency(
    items.reduce((s, r) => s + r.beginningTotal, 0)
  );
  const purchasedTotal = roundCurrency(
    items.reduce((s, r) => s + r.purchasedTotal, 0)
  );
  const usedTotal = roundCurrency(items.reduce((s, r) => s + r.usedTotal, 0));
  const remainingQty = roundCurrency(
    items.reduce((s, r) => s + r.remainingQty, 0)
  );
  const remainingTotal = roundCurrency(
    items.reduce((s, r) => s + r.remainingTotal, 0)
  );

  const uniqueUnits = Array.from(
    new Set(items.map((r) => r.unit.trim()).filter(Boolean))
  );
  const unit = uniqueUnits.length === 1 ? uniqueUnits[0] : '-';

  const remainingUnitPrice =
    remainingQty > 0
      ? roundCurrency(remainingTotal / remainingQty)
      : null;

  return {
    key: noteKey,
    index,
    label: bucketLabel,
    unit,
    beginningTotal,
    purchasedTotal,
    usedTotal,
    remainingQty,
    remainingUnitPrice,
    remainingTotal,
    note: auditRowNotes?.[noteKey] || '',
    hasData: true,
  };
}

export function buildAuditDocumentData(
  docId: AuditDocId,
  rows: ComputedMaterialRow[],
  agency: AgencyProfile
): AuditDocumentData {
  const disbCode = agency.disbursementCode || agency.costCenterCode || '-';
  const zone = agency.healthZone || '4';
  const shortYear = String(agency.fiscalYearBE).slice(-2);
  const dateStr = agency.auditReportDate || `30 ก.ย. ${shortYear}`;
  const notes = agency.auditRowNotes;

  if (docId === 'doc2') {
    const rawItems = rows.filter(
      (r) => classifyCategoryToDoc(r.category).doc === 'doc2'
    );
    const reportRows: AuditReportRow[] = rawItems.map((r, idx) => {
      const noteKey = `doc2:${r.id}`;
      const unitPrice =
        r.remainingQty > 0
          ? roundCurrency(r.remainingTotal / r.remainingQty)
          : r.purchasedUnitPrice || r.beginningUnitPrice || null;
      return {
        key: noteKey,
        index: idx + 1,
        label: r.isPriceVariant ? `${r.name} (${r.code})` : r.name,
        unit: r.unit,
        beginningTotal: r.beginningTotal,
        purchasedTotal: r.purchasedTotal,
        usedTotal: r.usedTotal,
        remainingQty: r.remainingQty,
        remainingUnitPrice: unitPrice,
        remainingTotal: r.remainingTotal,
        note: notes?.[noteKey] ?? (r.note || ''),
        hasData: true,
      };
    });

    const grandRemainingTotal = roundCurrency(
      reportRows.reduce((s, r) => s + r.remainingTotal, 0)
    );

    return {
      id: 'doc2',
      documentNumber: 'เอกสารหมายเลข 2',
      title: `รายงานการรับ - จ่ายวัตถุดิบสมุนไพรประจำปี พ.ศ. ${agency.fiscalYearBE}`,
      accountTitle: 'บัญชีวัตถุดิบ',
      accountCode: agency.rawMaterialAccountCode || '1105010101',
      agencyLabel: `ชื่อหน่วยงาน ${agency.agencyName}  รหัสหน่วยเบิกจ่าย ${disbCode}  เขต ${zone}`,
      dateLabel: `วันที่ ${dateStr}`,
      itemColLabel: 'รายการวัตถุดิบ',
      footerLabel: '(1) จำนวนเงินรวม = บัญชีวัตถุดิบ ในงบทดลองระบบ New GFMIS Thai',
      rows: reportRows,
      grandRemainingTotal,
    };
  }

  if (docId === 'doc3') {
    const doc3Items = rows.filter(
      (r) => classifyCategoryToDoc(r.category).doc === 'doc3'
    );
    const reportRows: AuditReportRow[] = DOC3_CATEGORIES.map((cat, idx) => {
      const matched = doc3Items.filter(
        (r) => classifyCategoryToDoc(r.category).bucket === cat
      );
      return aggregateBucketRows(cat, idx + 1, matched, `doc3:${cat}`, notes);
    });

    const grandRemainingTotal = roundCurrency(
      reportRows.reduce((s, r) => s + r.remainingTotal, 0)
    );

    return {
      id: 'doc3',
      documentNumber: 'เอกสารหมายเลข 3',
      title: `รายงานสินค้าคงเหลือประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE} (เอกสารแนบรายงานผลการตรวจสอบพัสดุประจำปี)`,
      accountTitle: 'บัญชีสินค้าสำเร็จรูป',
      accountCode: agency.finishedGoodsAccountCode || '1105010103',
      agencyLabel: `ชื่อหน่วยเบิกจ่าย ${agency.agencyName}  รหัสหน่วยเบิกจ่าย ${disbCode}  เขต ${zone}`,
      dateLabel: `วันที่ ${dateStr}`,
      itemColLabel: 'รายการ',
      footerLabel: '(1) จำนวนเงินรวม = บัญชีสินค้าสำเร็จรูป ในงบทดลองระบบ New GFMIS Thai',
      rows: reportRows,
      grandRemainingTotal,
    };
  }

  // doc4
  const doc4Items = rows.filter(
    (r) => classifyCategoryToDoc(r.category).doc === 'doc4'
  );
  const reportRows: AuditReportRow[] = DOC4_CATEGORIES.map((cat, idx) => {
    const matched = doc4Items.filter(
      (r) => classifyCategoryToDoc(r.category).bucket === cat
    );
    return aggregateBucketRows(cat, idx + 1, matched, `doc4:${cat}`, notes);
  });

  const grandRemainingTotal = roundCurrency(
    reportRows.reduce((s, r) => s + r.remainingTotal, 0)
  );

  return {
    id: 'doc4',
    documentNumber: 'เอกสารหมายเลข 4',
    title: `รายงานวัสดุคงเหลือ ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE} (เอกสารแนบรายงานผลการตรวจสอบพัสดุประจำปี)`,
    accountTitle: 'บัญชีวัสดุคงคลัง',
    accountCode: agency.accountTypeCode || '1105010105',
    agencyLabel: `ชื่อหน่วยเบิกจ่าย ${agency.agencyName}  รหัสหน่วยเบิกจ่าย ${disbCode}  เขต ${zone}`,
    dateLabel: `วันที่ ${dateStr}`,
    itemColLabel: 'รายการ',
    footerLabel: '(1) จำนวนเงินรวม = บัญชีวัสดุคงคลัง ในงบทดลองระบบ New GFMIS Thai',
    rows: reportRows,
    grandRemainingTotal,
  };
}
