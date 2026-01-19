'use strict';

function isNil(v) {
  return v === null || v === undefined;
}

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

function parseNumberStrict(value, fieldPath, errors, { defaultValue = 0 } = {}) {
 
  if (isNil(value)) return defaultValue;

 
  const raw = (typeof value === 'string') ? value.trim() : value;

  if (raw === '') return defaultValue;

  const n = Number(raw);

  if (!Number.isFinite(n)) {
    errors.push(`${fieldPath} must be a finite number`);
    return defaultValue;
  }

  return n;
}

function assertNonNegative(n, fieldPath, errors) {
  if (n < 0) errors.push(`${fieldPath} cannot be negative`);
}

function validateAndNormalizeBudgetTree(budget) {
  const errors = [];

  budget.chapters = ensureArray(budget.chapters);

  budget.chapters.forEach((chapter, ci) => {
    chapter.rank = parseNumberStrict(chapter.rank, `chapters[${ci}].rank`, errors, { defaultValue: 0 });
    assertNonNegative(chapter.rank, `chapters[${ci}].rank`, errors);

    chapter.saleCoefMaterial = parseNumberStrict(
      chapter.saleCoefMaterial,
      `chapters[${ci}].saleCoefMaterial`,
      errors,
      { defaultValue: 1 }
    );
    chapter.saleCoefLabour = parseNumberStrict(
      chapter.saleCoefLabour,
      `chapters[${ci}].saleCoefLabour`,
      errors,
      { defaultValue: 1 }
    );

    assertNonNegative(chapter.saleCoefMaterial, `chapters[${ci}].saleCoefMaterial`, errors);
    assertNonNegative(chapter.saleCoefLabour, `chapters[${ci}].saleCoefLabour`, errors);

    chapter.batches = ensureArray(chapter.batches);

    chapter.batches.forEach((batch, bi) => {
      batch.rank = parseNumberStrict(batch.rank, `chapters[${ci}].batches[${bi}].rank`, errors, { defaultValue: 0 });
      assertNonNegative(batch.rank, `chapters[${ci}].batches[${bi}].rank`, errors);

      batch.amount = parseNumberStrict(batch.amount, `chapters[${ci}].batches[${bi}].amount`, errors, { defaultValue: 0 });
      assertNonNegative(batch.amount, `chapters[${ci}].batches[${bi}].amount`, errors);

      batch.materialCost = parseNumberStrict(
        batch.materialCost,
        `chapters[${ci}].batches[${bi}].materialCost`,
        errors,
        { defaultValue: 0 }
      );
      assertNonNegative(batch.materialCost, `chapters[${ci}].batches[${bi}].materialCost`, errors);

      batch.labourCost = parseNumberStrict(
        batch.labourCost,
        `chapters[${ci}].batches[${bi}].labourCost`,
        errors,
        { defaultValue: 0 }
      );
      assertNonNegative(batch.labourCost, `chapters[${ci}].batches[${bi}].labourCost`, errors);
    });
  });

  return errors;
}

function stableSortByRank(arr, getRank) {
  return ensureArray(arr)
    .map((x, idx) => ({ x, idx }))
    .sort((a, b) => (getRank(a.x) - getRank(b.x)) || (a.idx - b.idx))
    .map((w) => w.x);
}

function recalculateBudgetTree(budget) {
  const chapters = stableSortByRank(budget.chapters, (c) => Number(c.rank) || 0);
  budget.chapters = chapters;

  let budgetTotalCost = 0;
  let budgetTotalSale = 0;

  chapters.forEach((chapter) => {
    const coefM = Number.isFinite(chapter.saleCoefMaterial) ? chapter.saleCoefMaterial : 1;
    const coefL = Number.isFinite(chapter.saleCoefLabour) ? chapter.saleCoefLabour : 1;

    const batches = stableSortByRank(chapter.batches, (b) => Number(b.rank) || 0);
    chapter.batches = batches;

    let chapterTotalCost = 0;
    let chapterTotalSale = 0;

    batches.forEach((batch) => {
      const amount = Number(batch.amount) || 0;
      const material = Number(batch.materialCost) || 0;
      const labour = Number(batch.labourCost) || 0;

      batch.unitCost = material + labour;
      batch.totalCost = batch.unitCost * amount;

      const unitSaleMaterial = material * coefM;
      const unitSaleLabour = labour * coefL;
      batch.unitSale = unitSaleMaterial + unitSaleLabour;
      batch.totalSale = batch.unitSale * amount;

      chapterTotalCost += batch.totalCost;
      chapterTotalSale += batch.totalSale;
    });

    chapter.totalCost = chapterTotalCost;
    chapter.totalSale = chapterTotalSale;

    budgetTotalCost += chapterTotalCost;
    budgetTotalSale += chapterTotalSale;
  });

  budget.totalCost = budgetTotalCost;
  budget.totalSale = budgetTotalSale;
}

/**
 * Attaches a before save observer to the Budget model.
 *
 * This observer normalizes and validates the budget tree.
 * If the budget tree is invalid, it will return an error with
 * a 422 status code and a VALIDATION_ERROR code.
 * If the budget tree is valid, it will recalculate the totals for
 * each chapter and batch.
 */

module.exports = function (Budget) {
  Budget.observe('before save', function (ctx, next) {
    const isCreate = !!ctx.instance;
    const data = ctx.instance || ctx.data;
    if (!data) return next();

    const hasChapters = isCreate || (ctx.data && Object.prototype.hasOwnProperty.call(ctx.data, 'chapters'));

    if (!hasChapters) {
   
      return next();
    }

    data.chapters = ensureArray(data.chapters);

    const errors = validateAndNormalizeBudgetTree(data);
    if (errors.length) {
      const err = Object.assign(new Error(errors.join('; ')), {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
      });
      return next(err);
    }

    recalculateBudgetTree(data);
    return next();
  });
};
