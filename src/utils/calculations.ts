import {
  ComputedMaterialRow,
  DepreciationScheduleRow,
  LedgerTotals,
  MATERIAL_CATEGORIES,
  MaterialCategory,
  MaterialEntry,
  StockStatus,
} from '../types/inventory';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeMaterialRow(entry: MaterialEntry): ComputedMaterialRow {
  const beginningTotal = roundCurrency(entry.beginningQty * entry.beginningUnitPrice);
  const purchasedTotal = roundCurrency(entry.purchasedQty * entry.purchasedUnitPrice);
  const usedTotal = roundCurrency(entry.usedQty * entry.usedUnitPrice);

  const remainingQty = roundCurrency(
    entry.beginningQty + entry.purchasedQty - entry.usedQty
  );
  // Formula from เอกสารหมายเลข 1: (1) ยอดยกมา + (2) จัดซื้อ - (3) จ่ายไป = (4) ยอดคงเหลือ
  const remainingTotal = roundCurrency(beginningTotal + purchasedTotal - usedTotal);

  let stockStatus: StockStatus = 'normal';
  if (!entry.isPriceVariant) {
    if (remainingQty <= 0) {
      stockStatus = 'out';
    } else if (remainingQty <= entry.minThreshold) {
      stockStatus = 'low';
    }
  } else {
    if (remainingQty <= 0) {
      stockStatus = 'normal'; // Price variant lot fully consumed is normal if parent tracks stock
    }
  }

  const suggestedRestockQty =
    !entry.isPriceVariant && remainingQty <= entry.minThreshold
      ? Math.max(1, Math.ceil(entry.minThreshold * 2 - Math.max(0, remainingQty)))
      : 0;

  // Straight-line depreciation calculation
  const dep = entry.depreciation;
  let costBasis = 0;
  if (dep.costBasisMode === 'ending') {
    costBasis = Math.max(0, remainingTotal);
  } else if (dep.costBasisMode === 'total_in') {
    costBasis = Math.max(0, beginningTotal + purchasedTotal);
  } else {
    costBasis = Math.max(0, dep.customCostBasis);
  }

  const salvage = Math.min(Math.max(0, dep.salvageValue), costBasis);
  const usefulLife = Math.max(1, dep.usefulLifeYears);
  const depreciableAmount = Math.max(0, costBasis - salvage);

  const annualDepreciation =
    dep.enabled && costBasis > 0 ? roundCurrency(depreciableAmount / usefulLife) : 0;

  const depreciationRatePct =
    dep.enabled && costBasis > 0 ? roundCurrency((annualDepreciation / costBasis) * 100) : 0;

  const cappedElapsed = Math.min(Math.max(0, dep.elapsedYears), usefulLife);
  const accumulatedDepreciation = dep.enabled
    ? roundCurrency(Math.min(depreciableAmount, annualDepreciation * cappedElapsed))
    : 0;

  const netBookValue = dep.enabled
    ? roundCurrency(Math.max(salvage, costBasis - accumulatedDepreciation))
    : costBasis;

  return {
    ...entry,
    beginningTotal,
    purchasedTotal,
    usedTotal,
    remainingQty,
    remainingTotal,
    stockStatus,
    suggestedRestockQty,
    depreciationCostBasis: roundCurrency(costBasis),
    annualDepreciation,
    depreciationRatePct,
    accumulatedDepreciation,
    netBookValue,
  };
}

export function computeLedgerTotals(rows: ComputedMaterialRow[]): LedgerTotals {
  return rows.reduce<LedgerTotals>(
    (acc, row) => {
      acc.beginningTotal = roundCurrency(acc.beginningTotal + row.beginningTotal);
      acc.purchasedTotal = roundCurrency(acc.purchasedTotal + row.purchasedTotal);
      acc.usedTotal = roundCurrency(acc.usedTotal + row.usedTotal);
      acc.remainingTotal = roundCurrency(acc.remainingTotal + row.remainingTotal);
      if (!row.isPriceVariant) {
        acc.itemCount += 1;
        if (row.stockStatus === 'low') acc.lowStockCount += 1;
        if (row.stockStatus === 'out') acc.outOfStockCount += 1;
      }
      if (row.depreciation.enabled) {
        acc.totalAnnualDepreciation = roundCurrency(
          acc.totalAnnualDepreciation + row.annualDepreciation
        );
        acc.totalNetBookValue = roundCurrency(acc.totalNetBookValue + row.netBookValue);
      }
      return acc;
    },
    {
      beginningTotal: 0,
      purchasedTotal: 0,
      usedTotal: 0,
      remainingTotal: 0,
      itemCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalAnnualDepreciation: 0,
      totalNetBookValue: 0,
    }
  );
}

export function generateDepreciationSchedule(
  row: ComputedMaterialRow,
  startFiscalYearBE: number
): DepreciationScheduleRow[] {
  const usefulLife = Math.max(1, row.depreciation.usefulLifeYears);
  const costBasis = row.depreciationCostBasis;
  const salvage = Math.min(Math.max(0, row.depreciation.salvageValue), costBasis);
  const depreciableAmount = Math.max(0, costBasis - salvage);
  const baseAnnual = roundCurrency(depreciableAmount / usefulLife);

  const schedule: DepreciationScheduleRow[] = [];
  let currentBookValue = costBasis;
  let accumulated = 0;

  for (let year = 1; year <= usefulLife; year++) {
    const isLastYear = year === usefulLife;
    const expense = isLastYear
      ? roundCurrency(Math.max(0, currentBookValue - salvage))
      : Math.min(baseAnnual, roundCurrency(Math.max(0, currentBookValue - salvage)));

    accumulated = roundCurrency(accumulated + expense);
    const endingBookValue = roundCurrency(Math.max(salvage, currentBookValue - expense));

    schedule.push({
      yearIndex: year,
      fiscalYearLabel: `พ.ศ. ${startFiscalYearBE + year - 1}`,
      openingBookValue: currentBookValue,
      annualExpense: expense,
      accumulatedDepreciation: accumulated,
      endingBookValue,
    });

    currentBookValue = endingBookValue;
  }

  return schedule;
}

export function groupTotalsByCategory(
  rows: ComputedMaterialRow[],
  categories: string[] = MATERIAL_CATEGORIES
) {
  const allCategories = [...categories];
  for (const row of rows) {
    if (row.category && !allCategories.includes(row.category)) {
      allCategories.push(row.category);
    }
  }
  return allCategories.map((category: MaterialCategory) => {
    const catRows = rows.filter((r) => r.category === category);
    const totals = computeLedgerTotals(catRows);
    return {
      category,
      ...totals,
    };
  });
}

export function formatCurrency(value: number, showDashIfZero = false): string {
  if (showDashIfZero && Math.abs(value) < 0.005) {
    return '-';
  }
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number, showDashIfZero = false): string {
  if (showDashIfZero && Math.abs(value) < 0.0001) {
    return '-';
  }
  return value.toLocaleString('th-TH', {
    maximumFractionDigits: 2,
  });
}

export function getBeginningDateLabel(fiscalYearBE: number): string {
  return `1 ต.ค. ${fiscalYearBE - 1}`;
}
