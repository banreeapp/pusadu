import * as XLSX from 'xlsx';
import {
  AgencyProfile,
  ComputedMaterialRow,
  RequisitionVoucher,
} from '../types/inventory';
import {
  computeLedgerTotals,
  getBeginningDateLabel,
  roundCurrency,
} from './calculations';
import { StockCardRow } from './stockCard';
import {
  AuditDocumentData,
  buildAuditDocumentData,
} from './auditReports';

function buildLedgerWorksheet(
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
): XLSX.WorkSheet {
  const totals = computeLedgerTotals(rows);
  const begDate = getBeginningDateLabel(agency.fiscalYearBE);

  const sheet1Data: (string | number)[][] = [
    ['', '', '', '', '', '', '', '', '', '', '', agency.documentNumber],
    ['แบบบัญชีรายงานวัสดุประจำปี'],
    [
      `ชื่อหน่วยงาน: ${agency.agencyName}`,
      '',
      '',
      '',
      '',
      '',
      `รหัสศูนย์ต้นทุน: ${agency.costCenterCode}`,
    ],
    [
      `ประเภท: ${categoryLabel}`,
      '',
      '',
      '',
      '',
      '',
      `ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE}`,
    ],
    [],
    [
      'รหัสวัสดุ',
      'ประเภทวัสดุ',
      'รายการ',
      'หน่วยนับ',
      `ยอดคงเหลือยกมา (${begDate})`,
      'ราคาต่อหน่วย',
      'ราคารวมวัสดุคงเหลือยกมา (1)',
      'จัดซื้อ (จำนวน)',
      'ราคาต่อหน่วย',
      'รวมราคาวัสดุจัดซื้อ (2)',
      'วัสดุใช้ไป (จำนวน)',
      'ราคาต่อหน่วย',
      'ราคารวมวัสดุใช้ไป (3)',
      'จำนวนคงเหลือ',
      'ราคารวมวัสดุคงเหลือ (4)',
    ],
    ...rows.map((r) => [
      r.isPriceVariant ? '' : r.code,
      r.category,
      r.name,
      r.unit,
      r.beginningQty,
      r.beginningUnitPrice,
      r.beginningTotal,
      r.purchasedQty,
      r.purchasedUnitPrice,
      r.purchasedTotal,
      r.usedQty,
      r.usedUnitPrice,
      r.usedTotal,
      r.remainingQty,
      r.remainingTotal,
    ]),
    [
      'ยอดรวมสุทธิ',
      '',
      '',
      '',
      '',
      '',
      totals.beginningTotal,
      '',
      '',
      totals.purchasedTotal,
      '',
      '',
      totals.usedTotal,
      '',
      totals.remainingTotal,
    ],
    [],
    ['1. แบบบัญชีวัสดุประจำปี — ช่องรวมบรรทัดสุดท้ายคิดเฉพาะยอดเงินเท่านั้น'],
    [
      '2. วิธีการคิดยอดรวมราคาคงเหลือ: (1) ยอดยกมา + (2) ยอดจัดซื้อหรือรับจากกรม - (3) ยอดจ่ายไป = (4) ยอดคงเหลือประจำปีงบประมาณ',
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 32 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
  ];
  return ws1;
}

export function exportLedgerToExcel(
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
) {
  const wb = XLSX.utils.book_new();
  // Sheet 1: เอกสารหมายเลข 1 แบบบัญชีรายงานวัสดุประจำปี
  const ws1 = buildLedgerWorksheet(agency, rows, categoryLabel);
  XLSX.utils.book_append_sheet(wb, ws1, 'แบบบัญชีวัสดุประจำปี');

  // Sheet 2: ตารางค่าเสื่อมราคาแบบเส้นตรงรายปี
  const depRows = rows.filter((r) => r.depreciation.enabled);
  const depTotals = computeLedgerTotals(depRows);
  const sheet2Data: (string | number)[][] = [
    [
      `รายงานคำนวณค่าเสื่อมราคาแบบเส้นตรงรายปี — ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE}`,
    ],
    [`หน่วยงาน: ${agency.agencyName} · รหัสศูนย์ต้นทุน: ${agency.costCenterCode}`],
    [],
    [
      'รหัสวัสดุ',
      'รายการ',
      'ประเภทวัสดุ',
      'ราคาทุนตั้งต้น (บาท)',
      'มูลค่าซาก (บาท)',
      'อายุการใช้งาน (ปี)',
      'ปีที่ใช้งานแล้ว (ปี)',
      'อัตราค่าเสื่อม (%/ปี)',
      'ค่าเสื่อมราคาต่อปี (บาท)',
      'ค่าเสื่อมราคาสะสม (บาท)',
      'มูลค่าตามบัญชีสุทธิ (บาท)',
    ],
    ...depRows.map((r) => [
      r.code,
      r.name,
      r.category,
      r.depreciationCostBasis,
      r.depreciation.salvageValue,
      r.depreciation.usefulLifeYears,
      r.depreciation.elapsedYears,
      r.depreciationRatePct,
      r.annualDepreciation,
      r.accumulatedDepreciation,
      r.netBookValue,
    ]),
    [
      'รวมสุทธิ',
      '',
      '',
      roundCurrency(depRows.reduce((s, r) => s + r.depreciationCostBasis, 0)),
      '',
      '',
      '',
      '',
      depTotals.totalAnnualDepreciation,
      roundCurrency(depRows.reduce((s, r) => s + r.accumulatedDepreciation, 0)),
      depTotals.totalNetBookValue,
    ],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'ค่าเสื่อมราคาเส้นตรง');

  // Sheet 3: แจ้งเตือนวัสดุใกล้หมด
  const alertRows = rows.filter(
    (r) => !r.isPriceVariant && (r.stockStatus === 'out' || r.stockStatus === 'low')
  );
  const sheet3Data: (string | number)[][] = [
    [`รายการแจ้งเตือนวัสดุใกล้หมด / หมดสต็อก — ปีงบประมาณ พ.ศ. ${agency.fiscalYearBE}`],
    [],
    [
      'รหัสวัสดุ',
      'รายการ',
      'ประเภทวัสดุ',
      'คงเหลือ',
      'หน่วยนับ',
      'เกณฑ์ขั้นต่ำ',
      'สถานะ',
      'แนะนำสั่งซื้อเพิ่ม',
      'งบประมาณโดยประมาณ (บาท)',
    ],
    ...alertRows.map((r) => [
      r.code,
      r.name,
      r.category,
      r.remainingQty,
      r.unit,
      r.minThreshold,
      r.stockStatus === 'out' ? 'หมดสต็อก' : 'ใกล้หมด',
      r.suggestedRestockQty,
      roundCurrency(
        r.suggestedRestockQty * (r.purchasedUnitPrice || r.beginningUnitPrice || 0)
      ),
    ]),
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'แจ้งเตือนวัสดุใกล้หมด');

  const filename = `แบบบัญชีรายงานวัสดุประจำปี_${agency.fiscalYearBE}_${agency.costCenterCode || 'export'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface CategorySummaryExportRow {
  category: string;
  beginningTotal: number;
  purchasedTotal: number;
  usedTotal: number;
  remainingTotal: number;
  note?: string;
}

export function exportCategorySummaryToExcel(
  agency: AgencyProfile,
  summaryRows: CategorySummaryExportRow[]
) {
  const wb = XLSX.utils.book_new();
  const begYear = agency.fiscalYearBE - 1;
  const endYear = agency.fiscalYearBE;
  const accountCode = agency.accountTypeCode || '1105010105';
  const disbCode = agency.disbursementCode || agency.costCenterCode || '-';

  const grandBeginning = roundCurrency(
    summaryRows.reduce((s, r) => s + r.beginningTotal, 0)
  );
  const grandPurchased = roundCurrency(
    summaryRows.reduce((s, r) => s + r.purchasedTotal, 0)
  );
  const grandUsed = roundCurrency(summaryRows.reduce((s, r) => s + r.usedTotal, 0));
  const grandRemaining = roundCurrency(
    summaryRows.reduce((s, r) => s + r.remainingTotal, 0)
  );

  const sheetData: (string | number)[][] = [
    [
      `แบบสรุปประเภทวัสดุคงเหลือ ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE} (แนบรายงานผลการตรวจสอบการรับ-จ่ายพัสดุประจำปี)`,
    ],
    [`บัญชีวัสดุคงคลัง รหัสบัญชีแยกประเภท ${accountCode}`],
    [`ชื่อหน่วยงาน ${agency.agencyName} รหัสหน่วยเบิกจ่าย ${disbCode}`],
    [`ตั้งแต่วันที่ 1 ตุลาคม ${begYear} ถึงวันที่ 30 กันยายน ${endYear}`],
    [],
    [
      'ลำดับ',
      'รายการ',
      'ยอดยกมา (บาท)',
      `ปีงบประมาณ ${agency.fiscalYearBE}`,
      '',
      '',
      'หมายเหตุ',
    ],
    ['', '', '', 'จำนวนเงิน รับ', 'จำนวนเงิน จ่าย', 'จำนวนเงิน คงเหลือ', ''],
    ...summaryRows.map((row, index) => [
      index + 1,
      row.category,
      row.beginningTotal,
      row.purchasedTotal,
      row.usedTotal,
      row.remainingTotal,
      row.note || '',
    ]),
    [
      'จำนวนเงินรวม',
      '',
      grandBeginning,
      grandPurchased,
      grandUsed,
      grandRemaining,
      '',
    ],
    [],
    ['หมายเหตุ'],
    ['(1) ยอดยกมา + จำนวนเงินรับ - จำนวนเงินจ่าย = จำนวนเงินคงเหลือ'],
    ['(2) จำนวนเงินรวม = บัญชีวัสดุคงคลัง ในงบทดลองจากระบบ GFMIS (ถ้ามี)'],
    [],
    ['', '', '', '(ลงชื่อ) ..................................................', '', 'ประธานกรรมการ'],
    ['', '', '', `( ${agency.committeeChairName || '........................................'} )`],
    ['', '', '', `ตำแหน่ง ${agency.committeeChairTitle || '........................................'}`],
    [],
    ['', '', '', '(ลงชื่อ) ..................................................', '', 'กรรมการ'],
    ['', '', '', `( ${agency.committeeMember1Name || '........................................'} )`],
    ['', '', '', `ตำแหน่ง ${agency.committeeMember1Title || '........................................'}`],
    [],
    ['', '', '', '(ลงชื่อ) ..................................................', '', 'กรรมการ'],
    ['', '', '', `( ${agency.committeeMember2Name || '........................................'} )`],
    ['', '', '', `ตำแหน่ง ${agency.committeeMember2Title || '........................................'}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // ลำดับ
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }, // รายการ
    { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } }, // ยอดยกมา
    { s: { r: 5, c: 3 }, e: { r: 5, c: 5 } }, // ปีงบประมาณ
    { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } }, // หมายเหตุ
  ];

  ws['!cols'] = [
    { wch: 8 },
    { wch: 36 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'แบบสรุปประเภทวัสดุคงเหลือ');

  const filename = `แบบสรุปประเภทวัสดุคงเหลือ_${agency.fiscalYearBE}_${disbCode}.xlsx`;
  XLSX.writeFile(wb, filename);
}

const THAI_FULL_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export function formatThaiDateLong(dateStr: string): string {
  if (!dateStr) return 'วันที่..........เดือน....................พ.ศ..........';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const yearBE = Number(parts[0]) + 543;
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const monthName = THAI_FULL_MONTHS[monthIdx] || parts[1];
  return `วันที่ ${day} เดือน ${monthName} พ.ศ. ${yearBE}`;
}

export function exportRequisitionToExcel(
  voucher: RequisitionVoucher,
  agency: AgencyProfile
) {
  const wb = XLSX.utils.book_new();
  const minRows = 12;

  const itemRows: (string | number)[][] = voucher.items.map((item, idx) => [
    idx + 1,
    item.materialName,
    item.materialCode,
    item.unit,
    item.requestedQty,
    item.issuedQty,
    item.remainingAfter,
  ]);

  while (itemRows.length < minRows) {
    itemRows.push(['', '', '', '', '', '', '']);
  }

  const sheetData: (string | number)[][] = [
    ['ใบเบิกวัสดุ'],
    ['', '', '', '', '', `เลขที่ ${voucher.voucherNo || '-'}`],
    ['', '', '', '', formatThaiDateLong(voucher.date)],
    [`เรียน ${voucher.recipientTitle || 'หัวหน้าหน่วยพัสดุ'}`],
    [
      `ข้าพเจ้าขอเบิกวัสดุตามรายการข้างล่างนี้ เพื่อใช้งานราชการ ${
        voucher.purpose || '..................................................'
      } โทร ${voucher.phone || '....................'}`,
    ],
    [],
    ['ลำดับที่', 'รายการสิ่งของ', 'รหัส', 'หน่วยนับ', 'จำนวน', '', 'คงเหลือหลังจ่าย'],
    ['', '', '', '', 'เบิก', 'จ่าย', ''],
    ...itemRows,
    [],
    [
      `(ลงชื่อ) ........................................ ผู้เบิก (หัวหน้ากลุ่ม/งาน)`,
      '',
      '',
      '',
      `(ลงชื่อ) ........................................ จ่ายวัสดุ`,
    ],
    [
      `( ${voucher.requesterName || '........................................'} ) ตัวบรรจง`,
      '',
      '',
      '',
      `( ${voucher.issuerName || '........................................'} ) ตัวบรรจง`,
    ],
    [
      `ตำแหน่ง ${voucher.requesterTitle || '........................................'}`,
      '',
      '',
      '',
      `ตำแหน่ง ${voucher.issuerTitle || '........................................'}`,
    ],
    [
      formatThaiDateLong(voucher.requesterDate || voucher.date),
      '',
      '',
      '',
      formatThaiDateLong(voucher.issuerDate || voucher.date),
    ],
    [],
    ['อนุมัติให้จ่ายได้'],
    [
      `(ลงชื่อ) ........................................ ผู้สั่งจ่าย`,
      '',
      '',
      '',
      `(ลงชื่อ) ........................................ ผู้รับวัสดุ`,
    ],
    [
      `( ${voucher.approverName || '........................................'} )`,
      '',
      '',
      '',
      `( ${voucher.receiverName || '........................................'} ) ตัวบรรจง`,
    ],
    [
      voucher.approverTitle || 'หัวหน้าหน่วยพัสดุ',
      '',
      '',
      '',
      `ตำแหน่ง ${voucher.receiverTitle || '........................................'}`,
    ],
    [
      formatThaiDateLong(voucher.approverDate || voucher.date),
      '',
      '',
      '',
      formatThaiDateLong(voucher.receiverDate || voucher.date),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // ใบเบิกวัสดุ
    { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } }, // เลขที่
    { s: { r: 2, c: 4 }, e: { r: 2, c: 6 } }, // วันที่
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // เรียน
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }, // ข้าพเจ้าขอเบิก...
    { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, // ลำดับที่
    { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, // รายการสิ่งของ
    { s: { r: 6, c: 2 }, e: { r: 7, c: 2 } }, // รหัส
    { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } }, // หน่วยนับ
    { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } }, // จำนวน
    { s: { r: 6, c: 6 }, e: { r: 7, c: 6 } }, // คงเหลือหลังจ่าย
  ];

  ws['!cols'] = [
    { wch: 10 },
    { wch: 36 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ใบเบิกวัสดุ');
  const safeNo = (voucher.voucherNo || voucher.id).replace(/[/\\?*:[\]]/g, '-');
  XLSX.writeFile(wb, `ใบเบิกวัสดุ_${safeNo}_${agency.fiscalYearBE}.xlsx`);
}

export function exportStockCardToExcel(
  material: ComputedMaterialRow,
  cardRows: StockCardRow[],
  agency: AgencyProfile
) {
  const wb = XLSX.utils.book_new();
  const minRows = 16;

  const dataRows: (string | number)[][] = cardRows.map((row) => [
    row.dateDisplay,
    row.counterparty,
    row.docNo,
    row.unitPrice,
    row.receivedQty !== null ? row.receivedQty : '',
    row.issuedQty !== null ? row.issuedQty : '',
    row.balanceQty,
    row.totalAmount,
    row.note,
  ]);

  while (dataRows.length < minRows) {
    dataRows.push(['', '', '', '', '', '', '', '', '']);
  }

  const sheetData: (string | number)[][] = [
    [
      'ประเภท',
      material.category,
      '',
      'ชื่อหรือชนิดวัสดุ',
      material.name,
      '',
      '',
      'รหัส',
      material.code,
    ],
    [
      'ขนาดหรือลักษณะ',
      material.specification || material.note || '-',
      '',
      '',
      '',
      '',
      '',
      'จำนวนอย่างสูง',
      material.maxThreshold !== undefined && material.maxThreshold > 0
        ? material.maxThreshold
        : '-',
    ],
    [
      'หน่วยที่นับ',
      material.unit,
      '',
      '',
      '',
      '',
      '',
      'จำนวนอย่างต่ำ',
      material.minThreshold,
    ],
    [
      'วัน/เดือน/ปี',
      'รับจาก/จ่ายให้',
      'เลขที่เอกสาร',
      'ราคาต่อหน่วย (บาท)',
      'จำนวน',
      '',
      '',
      'ราคารวม',
      'หมายเหตุ',
    ],
    ['', '', '', '', 'รับ', 'จ่าย', 'คงเหลือ', '', ''],
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // ประเภท
    { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } }, // ชื่อหรือชนิดวัสดุ
    { s: { r: 1, c: 1 }, e: { r: 1, c: 6 } }, // ขนาดหรือลักษณะ
    { s: { r: 2, c: 1 }, e: { r: 2, c: 6 } }, // หน่วยที่นับ
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // วัน/เดือน/ปี
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // รับจาก/จ่ายให้
    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, // เลขที่เอกสาร
    { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } }, // ราคาต่อหน่วย (บาท)
    { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } }, // จำนวน
    { s: { r: 3, c: 7 }, e: { r: 4, c: 7 } }, // ราคารวม
    { s: { r: 3, c: 8 }, e: { r: 4, c: 8 } }, // หมายเหตุ
  ];

  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 11 },
    { wch: 11 },
    { wch: 12 },
    { wch: 15 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'บัญชีวัสดุ');
  const safeCode = (material.code || material.id).replace(/[/\\?*:[\]]/g, '-');
  XLSX.writeFile(wb, `บัญชีวัสดุ_${safeCode}_${agency.fiscalYearBE}.xlsx`);
}

function buildAuditDocumentWorksheet(
  doc: AuditDocumentData,
  agency: AgencyProfile
): XLSX.WorkSheet {
  const minRows = doc.id === 'doc2' ? 11 : doc.rows.length;

  const tableRows: (string | number)[][] = doc.rows.map((r) => [
    r.index,
    r.label,
    r.hasData ? r.unit || '-' : '',
    r.hasData ? r.beginningTotal : '',
    r.hasData ? r.purchasedTotal : '',
    r.hasData ? r.usedTotal : '',
    r.hasData ? r.remainingQty : '',
    r.hasData && r.remainingUnitPrice !== null ? r.remainingUnitPrice : r.hasData ? '-' : '',
    r.hasData ? r.remainingTotal : '',
    r.note || '',
  ]);

  let padIdx = tableRows.length + 1;
  while (tableRows.length < minRows) {
    tableRows.push([padIdx === 2 ? 2 : '', '', '', '', '', '', '', '', '', '']);
    padIdx += 1;
  }

  const unitPriceSubLabel = doc.id === 'doc2' ? 'ราคาต่อหน่วย' : 'ต่อหน่วย';

  const sheetData: (string | number)[][] = [
    ['', '', '', '', '', '', '', '', '', doc.documentNumber],
    [doc.title],
    [`${doc.accountTitle} รหัสบัญชีแยกประเภท ${doc.accountCode}`],
    [doc.agencyLabel],
    [doc.dateLabel],
    [
      'ลำดับ',
      doc.itemColLabel,
      'หน่วยนับ',
      'ยอดยกมา (บาท)',
      'รับ (บาท)',
      'จ่าย (บาท)',
      'คงเหลือ',
      '',
      '',
      'หมายเหตุ',
    ],
    ['', '', '', '', '', '', 'หน่วย', unitPriceSubLabel, 'จำนวนเงิน', ''],
    ...tableRows,
    ['', '', '', '', '', '', '', '(1) จำนวนเงินรวม', doc.grandRemainingTotal, ''],
    ['', '', '', '', '', '', doc.footerLabel],
    [],
    [
      '',
      '',
      '(ลงชื่อ) ........................................',
      '',
      '',
      'ประธานกรรมการตรวจสอบพัสดุ',
    ],
    [
      '',
      '',
      `( ${agency.committeeChairName || '........................................'} )`,
    ],
    [],
    [
      '',
      '',
      '(ลงชื่อ) ........................................',
      '',
      '',
      'กรรมการตรวจสอบพัสดุ',
    ],
    [
      '',
      '',
      `( ${agency.committeeMember1Name || '........................................'} )`,
    ],
    [],
    [
      '',
      '',
      '(ลงชื่อ) ........................................',
      '',
      '',
      'กรรมการตรวจสอบพัสดุ',
    ],
    [
      '',
      '',
      `( ${agency.committeeMember2Name || '........................................'} )`,
    ],
    [],
    [
      '',
      '',
      '(ลงชื่อ) ........................................',
      '',
      '',
      'ผู้จัดทำ',
    ],
    [
      '',
      '',
      `( ${agency.preparerName || '........................................'} )`,
    ],
    [
      '',
      '',
      `ตำแหน่ง ${agency.preparerTitle || '........................................'}`,
    ],
    [],
    [
      '',
      '',
      '(ลงชื่อ) ........................................',
      '',
      '',
      'ผู้รับรอง',
    ],
    [
      '',
      '',
      `( ${agency.approverName || '........................................'} )`,
    ],
    [
      '',
      '',
      `ตำแหน่ง ${agency.approverTitle || '........................................'}`,
    ],
    ['', '', 'หัวหน้าหน่วยงาน'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // ลำดับ
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }, // รายการ
    { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } }, // หน่วยนับ
    { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } }, // ยอดยกมา
    { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } }, // รับ
    { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } }, // จ่าย
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8 } }, // คงเหลือ
    { s: { r: 5, c: 9 }, e: { r: 6, c: 9 } }, // หมายเหตุ
  ];

  ws['!cols'] = [
    { wch: 8 },
    { wch: 32 },
    { wch: 11 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 11 },
    { wch: 13 },
    { wch: 15 },
    { wch: 22 },
  ];

  return ws;
}

export function exportAuditDocumentToExcel(
  doc: AuditDocumentData,
  agency: AgencyProfile
) {
  const wb = XLSX.utils.book_new();
  const ws = buildAuditDocumentWorksheet(doc, agency);
  XLSX.utils.book_append_sheet(wb, ws, doc.documentNumber);
  const disbCode = agency.disbursementCode || agency.costCenterCode || 'export';
  XLSX.writeFile(
    wb,
    `${doc.documentNumber}_${doc.accountCode}_${agency.fiscalYearBE}_${disbCode}.xlsx`
  );
}

export function exportFullAuditBundleToExcel(
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
) {
  const wb = XLSX.utils.book_new();
  const ws1 = buildLedgerWorksheet(agency, rows, categoryLabel);
  XLSX.utils.book_append_sheet(wb, ws1, 'เอกสารหมายเลข 1');

  const doc2 = buildAuditDocumentData('doc2', rows, agency);
  const doc3 = buildAuditDocumentData('doc3', rows, agency);
  const doc4 = buildAuditDocumentData('doc4', rows, agency);

  XLSX.utils.book_append_sheet(wb, buildAuditDocumentWorksheet(doc2, agency), 'เอกสารหมายเลข 2');
  XLSX.utils.book_append_sheet(wb, buildAuditDocumentWorksheet(doc3, agency), 'เอกสารหมายเลข 3');
  XLSX.utils.book_append_sheet(wb, buildAuditDocumentWorksheet(doc4, agency), 'เอกสารหมายเลข 4');

  const disbCode = agency.disbursementCode || agency.costCenterCode || 'export';
  XLSX.writeFile(
    wb,
    `ชุดรายงานตรวจสอบพัสดุ_เอกสาร1-4_${agency.fiscalYearBE}_${disbCode}.xlsx`
  );
}



