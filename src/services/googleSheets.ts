import {
  AgencyProfile,
  ComputedMaterialRow,
  MATERIAL_CATEGORIES,
  MaterialCategory,
  MaterialEntry,
} from '../types/inventory';
import {
  computeLedgerTotals,
  getBeginningDateLabel,
  roundCurrency,
} from '../utils/calculations';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;
}

export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Google Sheets API error (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        message = errData.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetIdOrUrl: string
): Promise<SpreadsheetMetadata> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await handleApiResponse<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  }>(res);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets || []).map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
    })),
  };
}

export function buildLedgerSheetValues(
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
): (string | number)[][] {
  const totals = computeLedgerTotals(rows);
  const begDate = getBeginningDateLabel(agency.fiscalYearBE);

  const headerRows: (string | number)[][] = [
    ['', '', '', '', '', '', '', '', '', agency.documentNumber],
    ['แบบบัญชีรายงานวัสดุประจำปี'],
    [
      `ชื่อหน่วยงาน ${agency.agencyName}`,
      '',
      '',
      '',
      '',
      '',
      `รหัสศูนย์ต้นทุน ${agency.costCenterCode}`,
    ],
    [`ประเภท: ${categoryLabel}`, '', '', '', '', '', `ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE}`],
    [
      'รหัสวัสดุ',
      'ประเภทวัสดุ',
      'รายการ',
      'หน่วยนับ',
      `ยอดคงเหลือยกมา (${begDate})`,
      'ราคาต่อหน่วย (ยกมา)',
      'ราคารวมวัสดุคงเหลือยกมา (1)',
      'จัดซื้อ/รับจากกรม (จำนวน)',
      'ราคาต่อหน่วย (จัดซื้อ)',
      'รวมราคาวัสดุจัดซื้อ (2)',
      'วัสดุใช้ไป/จ่ายไป (จำนวน)',
      'ราคาต่อหน่วย (ใช้ไป)',
      'ราคารวมวัสดุใช้ไป (3)',
      'จำนวนคงเหลือสิ้นปี',
      'ราคารวมวัสดุคงเหลือ (4)',
      'สถานะสต็อก',
    ],
  ];

  const dataRows = rows.map((row) => [
    row.isPriceVariant ? '' : row.code,
    row.category,
    row.name,
    row.unit,
    row.beginningQty,
    row.beginningUnitPrice,
    row.beginningTotal,
    row.purchasedQty,
    row.purchasedUnitPrice,
    row.purchasedTotal,
    row.usedQty,
    row.usedUnitPrice,
    row.usedTotal,
    row.remainingQty,
    row.remainingTotal,
    row.isPriceVariant
      ? 'ล็อตต่างราคา'
      : row.stockStatus === 'out'
      ? 'หมดสต็อก'
      : row.stockStatus === 'low'
      ? 'ใกล้หมด'
      : 'ปกติ',
  ]);

  const totalRow: (string | number)[] = [
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
    '',
  ];

  const footerRows: (string | number)[][] = [
    [],
    ['หมายเหตุ: 1. แบบบัญชีวัสดุประจำปี ช่องรวมบรรทัดสุดท้ายคิดเฉพาะยอดเงินเท่านั้น'],
    [
      '2. วิธีการคิดยอดรวมราคาคงเหลือ: (1) ยอดยกมา + (2) ยอดจัดซื้อหรือรับจากกรม - (3) ยอดจ่ายไป = (4) ยอดคงเหลือประจำปีงบประมาณ',
    ],
  ];

  return [...headerRows, ...dataRows, totalRow, ...footerRows];
}

export function buildDepreciationSheetValues(
  agency: AgencyProfile,
  rows: ComputedMaterialRow[]
): (string | number)[][] {
  const depRows = rows.filter((r) => r.depreciation.enabled);
  const totals = computeLedgerTotals(depRows);

  const header: (string | number)[][] = [
    [`ตารางคำนวณค่าเสื่อมราคาแบบเส้นตรงรายปี — ประจำปีงบประมาณ พ.ศ. ${agency.fiscalYearBE}`],
    [`หน่วยงาน: ${agency.agencyName} (รหัสศูนย์ต้นทุน: ${agency.costCenterCode})`],
    [],
    [
      'รหัสวัสดุ',
      'รายการ',
      'ประเภทวัสดุ',
      'ราคาทุนตั้งต้น (บาท)',
      'มูลค่าซาก (บาท)',
      'อายุการใช้งาน (ปี)',
      'ปีที่ใช้งานแล้ว',
      'อัตราค่าเสื่อม (%/ปี)',
      'ค่าเสื่อมราคาต่อปี (บาท)',
      'ค่าเสื่อมสะสม (บาท)',
      'มูลค่าตามบัญชีสุทธิ (บาท)',
    ],
  ];

  const body = depRows.map((row) => [
    row.code,
    row.name,
    row.category,
    row.depreciationCostBasis,
    row.depreciation.salvageValue,
    row.depreciation.usefulLifeYears,
    row.depreciation.elapsedYears,
    row.depreciationRatePct,
    row.annualDepreciation,
    row.accumulatedDepreciation,
    row.netBookValue,
  ]);

  const summary: (string | number)[][] = [
    [
      'รวมทั้งหมด',
      '',
      '',
      roundCurrency(depRows.reduce((s, r) => s + r.depreciationCostBasis, 0)),
      '',
      '',
      '',
      '',
      totals.totalAnnualDepreciation,
      roundCurrency(depRows.reduce((s, r) => s + r.accumulatedDepreciation, 0)),
      totals.totalNetBookValue,
    ],
  ];

  return [...header, ...body, ...summary];
}

export async function createAndExportLedgerSheet(
  accessToken: string,
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const title = `แบบบัญชีรายงานวัสดุประจำปี_${agency.fiscalYearBE}_${agency.costCenterCode}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'แบบบัญชีวัสดุประจำปี' } },
        { properties: { title: 'ค่าเสื่อมราคาเส้นตรง' } },
      ],
    }),
  });

  const created = await handleApiResponse<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
  }>(createRes);

  const ledgerValues = buildLedgerSheetValues(agency, rows, categoryLabel);
  const depValues = buildDepreciationSheetValues(agency, rows);

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'แบบบัญชีวัสดุประจำปี'!A1`,
            values: ledgerValues,
          },
          {
            range: `'ค่าเสื่อมราคาเส้นตรง'!A1`,
            values: depValues,
          },
        ],
      }),
    }
  );

  await handleApiResponse(batchRes);

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    title: created.properties.title,
  };
}

export async function updateExistingSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  agency: AgencyProfile,
  rows: ComputedMaterialRow[],
  categoryLabel: string
): Promise<void> {
  const safeSheet = `'${sheetTitle.replace(/'/g, "''")}'`;

  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`${safeSheet}!A1:Z1000`)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  await handleApiResponse(clearRes);

  const values = buildLedgerSheetValues(agency, rows, categoryLabel);
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`${safeSheet}!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );
  await handleApiResponse(updateRes);
}

function parseNumberCell(raw: string | number | undefined): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCategory(
  raw: string | undefined,
  knownCategories: string[] = MATERIAL_CATEGORIES
): MaterialCategory {
  if (!raw) return knownCategories[0] || 'วัสดุสำนักงาน';
  const trimmed = raw.trim();
  if (!trimmed) return knownCategories[0] || 'วัสดุสำนักงาน';
  const matched = knownCategories.find(
    (c) => c === trimmed || trimmed.includes(c) || c.includes(trimmed)
  );
  return matched || trimmed;
}

export async function importFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<MaterialEntry[]> {
  const safeSheet = `'${sheetTitle.replace(/'/g, "''")}'`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(`${safeSheet}!A1:P500`)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await handleApiResponse<{ values?: string[][] }>(res);
  const rawRows = data.values || [];

  // Find header row index containing "รหัสวัสดุ" or "รายการ"
  let headerIdx = rawRows.findIndex((row) =>
    row.some((cell) => String(cell).includes('รหัสวัสดุ') || String(cell).includes('รายการ'))
  );
  if (headerIdx === -1) headerIdx = 0;

  const headerRow = rawRows[headerIdx] || [];
  const isExtendedExportFormat = headerRow.some((cell) =>
    String(cell).includes('ประเภทวัสดุ')
  );

  const imported: MaterialEntry[] = [];
  let lastCode = '1001';
  let lastCategory: MaterialCategory = 'วัสดุสำนักงาน';

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length < 3) continue;

    const firstCell = String(row[0] ?? '').trim();
    if (
      firstCell.includes('ยอดรวม') ||
      firstCell.includes('หมายเหตุ') ||
      firstCell.startsWith('2.') ||
      firstCell.startsWith('(1)')
    ) {
      continue;
    }

    if (isExtendedExportFormat) {
      const code = firstCell || lastCode;
      const category = normalizeCategory(row[1]);
      const name = String(row[2] ?? '').trim();
      const unit = String(row[3] ?? 'หน่วย').trim() || 'หน่วย';
      if (!name || name === '(1)') continue;

      const isPriceVariant = !firstCell && name.includes('ต่างราคา');
      if (firstCell) {
        lastCode = firstCell;
        lastCategory = category;
      }

      imported.push({
        id: `gs-${Date.now()}-${i}`,
        code,
        name,
        category: isPriceVariant ? lastCategory : category,
        unit,
        isPriceVariant,
        parentCode: isPriceVariant ? lastCode : undefined,
        beginningQty: parseNumberCell(row[4]),
        beginningUnitPrice: parseNumberCell(row[5]),
        purchasedQty: parseNumberCell(row[7]),
        purchasedUnitPrice: parseNumberCell(row[8]),
        usedQty: parseNumberCell(row[10]),
        usedUnitPrice: parseNumberCell(row[11]),
        minThreshold: 10,
        depreciation: {
          enabled: false,
          costBasisMode: 'ending',
          customCostBasis: 0,
          salvageValue: 0,
          usefulLifeYears: 5,
          elapsedYears: 1,
        },
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Standard เอกสารหมายเลข 1 CSV/Sheet layout:
      // col 0: รหัสวัสดุ, col 1: รายการ, col 2: ยกมา, col 3: ราคา, col 5: จัดซื้อ, col 6: ราคา, col 8: ใช้ไป, col 9: ราคา
      const code = firstCell || lastCode;
      const name = String(row[1] ?? '').trim();
      if (!name || name.includes('ยกมา')) continue;

      const isPriceVariant = !firstCell || name.includes('ต่างราคา');
      if (firstCell) lastCode = firstCell;

      const qtyText = String(row[2] ?? '') + ' ' + String(row[5] ?? '');
      const unitMatch = qtyText.match(/[ก-๛a-zA-Z]+/);
      const unit = unitMatch ? unitMatch[0] : 'หน่วย';

      imported.push({
        id: `gs-${Date.now()}-${i}`,
        code,
        name,
        category: lastCategory,
        unit,
        isPriceVariant,
        parentCode: isPriceVariant ? lastCode : undefined,
        beginningQty: parseNumberCell(row[2]),
        beginningUnitPrice: parseNumberCell(row[3]),
        purchasedQty: parseNumberCell(row[5]),
        purchasedUnitPrice: parseNumberCell(row[6]),
        usedQty: parseNumberCell(row[8]),
        usedUnitPrice: parseNumberCell(row[9]),
        minThreshold: 10,
        depreciation: {
          enabled: false,
          costBasisMode: 'ending',
          customCostBasis: 0,
          salvageValue: 0,
          usefulLifeYears: 5,
          elapsedYears: 1,
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return imported;
}
