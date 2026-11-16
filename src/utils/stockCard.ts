import {
  AgencyProfile,
  ComputedMaterialRow,
  RequisitionVoucher,
  StockMovement,
} from '../types/inventory';
import { roundCurrency } from './calculations';

export interface StockCardRow {
  id: string;
  dateDisplay: string;
  isoDate: string;
  counterparty: string; // รับจาก/จ่ายให้
  docNo: string; // เลขที่เอกสาร
  unitPrice: number; // ราคาต่อหน่วย (บาท)
  receivedQty: number | null; // จำนวน รับ
  issuedQty: number | null; // จำนวน จ่าย
  balanceQty: number; // จำนวน คงเหลือ
  totalAmount: number; // ราคารวม
  note: string; // หมายเหตุ
}

export function formatThaiShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yearBE = Number(parts[0]) + 543;
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${day}/${month}/${yearBE}`;
}

export function buildStockCardRows(
  material: ComputedMaterialRow,
  movements: StockMovement[],
  requisitions: RequisitionVoucher[],
  agency: AgencyProfile
): StockCardRow[] {
  const begYearBE = agency.fiscalYearBE - 1;
  const begYearCE = begYearBE - 543;
  const openingIso = `${begYearCE}-10-01`;

  // Filter movements for this material and sort chronologically ascending
  const matMovements = movements
    .filter((m) => m.materialId === material.id)
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      // Put purchases before issues on same day to avoid transient negative balance
      if (a.type !== b.type) return a.type === 'purchase' ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

  // Also index requisitions by materialId + date + issuedQty or voucherNo for fallback docNo/purpose lookup
  const reqLookup = new Map<string, RequisitionVoucher>();
  for (const v of requisitions) {
    reqLookup.set(v.voucherNo, v);
  }

  let loggedPurchased = 0;
  let loggedUsed = 0;
  for (const m of matMovements) {
    if (m.type === 'purchase') loggedPurchased += m.qty;
    else loggedUsed += m.qty;
  }

  const unloggedPurchased = Math.max(0, material.purchasedQty - loggedPurchased);
  const unloggedUsed = Math.max(0, material.usedQty - loggedUsed);

  const rows: StockCardRow[] = [];
  let runningBalance = material.beginningQty;

  // 1. Opening Balance row (ยอดคงเหลือยกมา 1 ต.ค.)
  if (material.beginningQty > 0 || (matMovements.length === 0 && unloggedPurchased === 0 && unloggedUsed === 0)) {
    rows.push({
      id: `sc-open-${material.id}`,
      dateDisplay: `01/10/${begYearBE}`,
      isoDate: openingIso,
      counterparty: 'ยอดคงเหลือยกมา',
      docNo: 'ยกมา',
      unitPrice: material.beginningUnitPrice,
      receivedQty: material.beginningQty > 0 ? material.beginningQty : null,
      issuedQty: null,
      balanceQty: runningBalance,
      totalAmount: roundCurrency(material.beginningQty * material.beginningUnitPrice),
      note: `ยอดยกมาต้นปีงบประมาณ ${agency.fiscalYearBE}`,
    });
  }

  // 2. Any baseline receipt not itemized in movement history
  if (unloggedPurchased > 0) {
    runningBalance += unloggedPurchased;
    const price = material.purchasedUnitPrice || material.beginningUnitPrice || 0;
    rows.push({
      id: `sc-base-pur-${material.id}`,
      dateDisplay: `01/10/${begYearBE}`,
      isoDate: openingIso,
      counterparty: 'จัดซื้อ / รับเข้าคลังตามบัญชี',
      docNo: '-',
      unitPrice: price,
      receivedQty: unloggedPurchased,
      issuedQty: null,
      balanceQty: runningBalance,
      totalAmount: roundCurrency(unloggedPurchased * price),
      note: 'ยอดจัดซื้อสะสมตามบัญชีวัสดุประจำปี',
    });
  }

  // 3. Any baseline usage not itemized in movement history (placed before itemized logs so dates remain chronological)
  if (unloggedUsed > 0) {
    runningBalance -= unloggedUsed;
    const price =
      material.usedUnitPrice ||
      material.purchasedUnitPrice ||
      material.beginningUnitPrice ||
      0;
    rows.push({
      id: `sc-base-use-${material.id}`,
      dateDisplay: `01/10/${begYearBE}`,
      isoDate: openingIso,
      counterparty: 'เบิกจ่ายสะสมตามบัญชี',
      docNo: '-',
      unitPrice: price,
      receivedQty: null,
      issuedQty: unloggedUsed,
      balanceQty: runningBalance,
      totalAmount: roundCurrency(unloggedUsed * price),
      note: 'ยอดเบิกจ่ายรวมตามบัญชี (ก่อนบันทึกรายการย่อย)',
    });
  }

  // 4. Itemized Stock Movements
  for (const m of matMovements) {
    // Check if movement note references a voucher number
    let inferredVoucher: RequisitionVoucher | undefined;
    for (const [vNo, v] of reqLookup.entries()) {
      if (m.docNo === vNo || m.note.includes(vNo)) {
        inferredVoucher = v;
        break;
      }
    }

    const docNo =
      m.docNo ||
      inferredVoucher?.voucherNo ||
      (m.type === 'purchase' ? 'ใบรับ/ส่งของ' : 'ใบเบิก');
    const counterparty =
      m.counterparty ||
      inferredVoucher?.purpose ||
      (m.type === 'purchase' ? 'ผู้จำหน่าย / จัดซื้อเข้าคลัง' : m.note || 'เบิกจ่ายใช้งาน');

    if (m.type === 'purchase') {
      runningBalance += m.qty;
      rows.push({
        id: m.id,
        dateDisplay: formatThaiShortDate(m.date),
        isoDate: m.date,
        counterparty,
        docNo,
        unitPrice: m.unitPrice,
        receivedQty: m.qty,
        issuedQty: null,
        balanceQty: runningBalance,
        totalAmount: roundCurrency(m.qty * m.unitPrice),
        note: m.note,
      });
    } else {
      runningBalance -= m.qty;
      rows.push({
        id: m.id,
        dateDisplay: formatThaiShortDate(m.date),
        isoDate: m.date,
        counterparty,
        docNo,
        unitPrice: m.unitPrice,
        receivedQty: null,
        issuedQty: m.qty,
        balanceQty: runningBalance,
        totalAmount: roundCurrency(m.qty * m.unitPrice),
        note: m.note,
      });
    }
  }

  // If logged movements exceeded material ledger totals (rare edge case), reconcile with final note
  if (loggedPurchased > material.purchasedQty || loggedUsed > material.usedQty) {
    const diff = material.remainingQty - runningBalance;
    if (diff !== 0) {
      runningBalance += diff;
      rows.push({
        id: `sc-adj-${material.id}`,
        dateDisplay: formatThaiShortDate(material.updatedAt.slice(0, 10)),
        isoDate: material.updatedAt.slice(0, 10),
        counterparty: 'ปรับยอดคงเหลือให้ตรงบัญชี',
        docNo: 'ปรับยอด',
        unitPrice: material.purchasedUnitPrice || material.beginningUnitPrice || 0,
        receivedQty: diff > 0 ? diff : null,
        issuedQty: diff < 0 ? Math.abs(diff) : null,
        balanceQty: runningBalance,
        totalAmount: roundCurrency(
          Math.abs(diff) *
            (material.purchasedUnitPrice || material.beginningUnitPrice || 0)
        ),
        note: 'ปรับปรุงยอดคงเหลือสุทธิตามบัญชีประจำปี',
      });
    }
  }

  return rows;
}
