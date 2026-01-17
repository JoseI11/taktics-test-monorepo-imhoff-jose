'use strict';

function toNumberOrZero(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function assertNonNegative(value, fieldPath, errors) {
    if (value < 0) {
        errors.push(`${fieldPath} cannot be negative`);
    }
}

function recalculateBudgetTree(budget) {
    const chapters = Array.isArray(budget.chapters) ? budget.chapters : [];

    // Keep consistent order
    chapters.sort((a, b) => toNumberOrZero(a.rank) - toNumberOrZero(b.rank));

    let budgetTotalCost = 0;
    let budgetTotalSale = 0;

    chapters.forEach((chapter) => {
        chapter.rank = toNumberOrZero(chapter.rank);

        chapter.saleCoefMaterial =
            chapter.saleCoefMaterial == null ? 1 : toNumberOrZero(chapter.saleCoefMaterial);
        chapter.saleCoefLabour =
            chapter.saleCoefLabour == null ? 1 : toNumberOrZero(chapter.saleCoefLabour);

        const batches = Array.isArray(chapter.batches) ? chapter.batches : [];
        batches.sort((a, b) => toNumberOrZero(a.rank) - toNumberOrZero(b.rank));

        let chapterTotalCost = 0;
        let chapterTotalSale = 0;

        batches.forEach((batch) => {
            batch.rank = toNumberOrZero(batch.rank);
            batch.amount = batch.amount == null ? 1 : toNumberOrZero(batch.amount);

            batch.materialCost = toNumberOrZero(batch.materialCost);
            batch.labourCost = toNumberOrZero(batch.labourCost);

            // COSTS
            batch.unitCost = batch.materialCost + batch.labourCost;
            batch.totalCost = batch.unitCost * batch.amount;

            // SALES (apply chapter coefficients to each component)
            const unitSaleMaterial = batch.materialCost * chapter.saleCoefMaterial;
            const unitSaleLabour = batch.labourCost * chapter.saleCoefLabour;
            batch.unitSale = unitSaleMaterial + unitSaleLabour;
            batch.totalSale = batch.unitSale * batch.amount;

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

function validateNoNegatives(budget) {
    const errors = [];

    const chapters = Array.isArray(budget.chapters) ? budget.chapters : [];
    chapters.forEach((chapter, ci) => {
        const coefM = chapter.saleCoefMaterial == null ? 1 : toNumberOrZero(chapter.saleCoefMaterial);
        const coefL = chapter.saleCoefLabour == null ? 1 : toNumberOrZero(chapter.saleCoefLabour);

        assertNonNegative(coefM, `chapters[${ci}].saleCoefMaterial`, errors);
        assertNonNegative(coefL, `chapters[${ci}].saleCoefLabour`, errors);

        const batches = Array.isArray(chapter.batches) ? chapter.batches : [];
        batches.forEach((batch, bi) => {
            const amount = batch.amount == null ? 1 : toNumberOrZero(batch.amount);
            const mCost = toNumberOrZero(batch.materialCost);
            const lCost = toNumberOrZero(batch.labourCost);

            assertNonNegative(amount, `chapters[${ci}].batches[${bi}].amount`, errors);
            assertNonNegative(mCost, `chapters[${ci}].batches[${bi}].materialCost`, errors);
            assertNonNegative(lCost, `chapters[${ci}].batches[${bi}].labourCost`, errors);
        });
    });

    return errors;
}

module.exports = function (Budget) {
    Budget.observe('before save', function (ctx, next) {
        const data = ctx.instance || ctx.data;
        if (!data) return next();

        if (!Array.isArray(data.chapters)) data.chapters = [];

        const validationErrors = validateNoNegatives(data);
        if (validationErrors.length > 0) {
            const err = Object.assign(new Error(validationErrors.join('; ')), {
                statusCode: 422,
                code: 'VALIDATION_ERROR'
            });
            return next(err);
        }

        recalculateBudgetTree(data);
        next();
    });
};
