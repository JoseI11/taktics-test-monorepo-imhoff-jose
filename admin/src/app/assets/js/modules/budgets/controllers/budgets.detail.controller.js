import angular from 'angular';
import tableTpl from '../views/_budgets.detail.table.html';

/**
 * Converts a value to a number, returning 0 if the value is empty, null, or NaN.
 * @param {*} value - The value to convert
 * @returns {number} The numeric value or 0
 */
function toNumberOrZero(value) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ensures the input is an array, returning an empty array if it's not.
 * @param {*} v - The value to check
 * @returns {Array} The array or an empty array
 */
function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

export default function BudgetDetailController($http, $state, $stateParams, $rootScope) {
  const vm = this;

  vm.saving = false;
  vm.tableTpl = tableTpl;

  vm.isNew = $state.current.name === 'budgetCreate';

  vm.budget = {
    name: '',
    clientName: '',
    date: new Date(),
    thumbnail: '',
    totalCost: 0,
    totalSale: 0,
    chapters: [],
  };

  /**
   * Clears the thumbnail URL from the current budget.
   */
  vm.clearThumbnail = () => { vm.budget.thumbnail = ''; };

  /**
   * Adds a new chapter to the budget with default values.
   * Automatically assigns the next rank number and recalculates totals.
   */
  vm.addChapter = () => {
    vm.budget.chapters = ensureArray(vm.budget.chapters);
    vm.budget.chapters.push({
      rank: vm.budget.chapters.length + 1,
      description: '',
      saleCoefMaterial: '',
      saleCoefLabour: '',
      totalCost: 0,
      totalSale: 0,
      batches: [],
    });
    vm.recalculateLocal();
  };

  /**
   * Adds a new batch to the specified chapter with default values.
   * @param {Object} chapter - The chapter to add the batch to
   */
  vm.addBatch = (chapter) => {
    chapter.batches = ensureArray(chapter.batches);
    chapter.batches.push({
      rank: chapter.batches.length + 1,
      description: '',
      amount: '',
      materialCost: '',
      labourCost: '',
      unitCost: 0,
      totalCost: 0,
      unitSale: 0,
      totalSale: 0,
    });
    vm.recalculateLocal();
  };

  /**
   * Recalculates all cost and sale totals for the budget in real-time.
   * This preserves empty strings ('') for better UX, allowing users to see their inputs.
   * Sorts chapters and batches by rank, calculates unit/total costs and sales based on
   * sale coefficients, and updates the budget's total cost and sale.
   */
  vm.recalculateLocal = () => {
    const chapters = ensureArray(vm.budget.chapters);
    chapters.sort((a, b) => toNumberOrZero(a.rank) - toNumberOrZero(b.rank));

    let budgetTotalCost = 0;
    let budgetTotalSale = 0;

    chapters.forEach((chapter) => {
      chapter.rank = Math.max(0, toNumberOrZero(chapter.rank));

      const coefMat = chapter.saleCoefMaterial === '' || chapter.saleCoefMaterial == null
        ? 1
        : Math.max(0, toNumberOrZero(chapter.saleCoefMaterial));

      const coefLab = chapter.saleCoefLabour === '' || chapter.saleCoefLabour == null
        ? 1
        : Math.max(0, toNumberOrZero(chapter.saleCoefLabour));

      const batches = ensureArray(chapter.batches);
      batches.sort((a, b) => toNumberOrZero(a.rank) - toNumberOrZero(b.rank));

      let chapterTotalCost = 0;
      let chapterTotalSale = 0;

      batches.forEach((batch) => {
        batch.rank = Math.max(0, toNumberOrZero(batch.rank));

        const safeAmount = Math.max(0, toNumberOrZero(batch.amount));
        const safeMaterial = Math.max(0, toNumberOrZero(batch.materialCost));
        const safeLabour = Math.max(0, toNumberOrZero(batch.labourCost));

        batch.unitCost = safeMaterial + safeLabour;
        batch.totalCost = batch.unitCost * safeAmount;

        const unitSaleMaterial = safeMaterial * coefMat;
        const unitSaleLabour = safeLabour * coefLab;
        batch.unitSale = unitSaleMaterial + unitSaleLabour;
        batch.totalSale = batch.unitSale * safeAmount;

        chapterTotalCost += batch.totalCost;
        chapterTotalSale += batch.totalSale;
      });

      chapter.totalCost = chapterTotalCost;
      chapter.totalSale = chapterTotalSale;

      budgetTotalCost += chapterTotalCost;
      budgetTotalSale += chapterTotalSale;
    });

    vm.budget.totalCost = budgetTotalCost;
    vm.budget.totalSale = budgetTotalSale;
  };

  /**
   * Recalculates totals for the backend payload before saving.
   * Converts all empty strings to numbers ('' -> 1 for coefficients, 0 for others)
   * to ensure clean data is sent to the API.
   * @param {Object} budget - The budget payload object to recalculate
   */
  function recalculatePayload(budget) {
    budget.totalCost = 0;
    budget.totalSale = 0;

    ensureArray(budget.chapters).forEach((chapter) => {
      chapter.totalCost = 0;
      chapter.totalSale = 0;

      // asegurar coeficientes numéricos (si vienen '' => 1)
      chapter.saleCoefMaterial =
        chapter.saleCoefMaterial === '' || chapter.saleCoefMaterial == null ? 1 : Number(chapter.saleCoefMaterial) || 0;

      chapter.saleCoefLabour =
        chapter.saleCoefLabour === '' || chapter.saleCoefLabour == null ? 1 : Number(chapter.saleCoefLabour) || 0;

      ensureArray(chapter.batches).forEach((batch) => {
        const amount = Number(batch.amount) || 0;
        const material = Number(batch.materialCost) || 0;
        const labour = Number(batch.labourCost) || 0;

        batch.unitCost = material + labour;
        batch.totalCost = batch.unitCost * amount;

        const unitSale = material * chapter.saleCoefMaterial + labour * chapter.saleCoefLabour;
        batch.unitSale = unitSale;
        batch.totalSale = unitSale * amount;

        chapter.totalCost += batch.totalCost;
        chapter.totalSale += batch.totalSale;
      });

      budget.totalCost += chapter.totalCost;
      budget.totalSale += chapter.totalSale;
    });
  }

  /**
   * Saves the budget (create or update) to the backend.
   * Blurs active element, creates a clean payload copy, recalculates totals,
   * sends to API, sets flash message, and navigates to budget list on success.
   * @param {Object} form - The form object (not currently used)
   * @param {Event} $event - The submit event to prevent default behavior
   * @returns {Promise} The HTTP request promise
   */
  vm.save = (form, $event) => {
    if ($event) { $event.preventDefault(); $event.stopPropagation(); }
    if (vm.saving) return;
    vm.saving = true;

    // blur seguro (no rompe TS / no crashea)
    try {
      const ae = document.activeElement;
      if (ae && typeof ae.blur === 'function') ae.blur();
    } catch (e) {}

    const payload = angular.copy(vm.budget);
    recalculatePayload(payload);

    const req = vm.isNew
      ? $http.post('/api/Budgets', payload)
      : $http.put(`/api/Budgets/${vm.budget.id}`, payload);

    return req
      .then(() => {
        // ✅ mensaje para la vista budgets
        $rootScope.flash = {
          type: 'success',
          text: vm.isNew ? 'Budget created successfully' : 'Budget updated successfully',
        };

        // ✅ ir a lista
        return $state.go('budgets');
      })
      .catch((err) => {
        $rootScope.flash = {
          type: 'danger',
          text:
            (err && err.data && err.data.error && err.data.error.message)
            ? `Save failed: ${err.data.error.message}`
            : 'Save failed',
        };
        throw err;
      })
      .finally(() => {
        vm.saving = false;
      });
  };

  /**
   * Loads the budget data from the backend if editing an existing budget.
   * Converts date to Date object and numbers to strings for text inputs.
   * For new budgets, simply triggers recalculation.
   * @returns {Promise|undefined} The HTTP request promise or undefined for new budgets
   */
  function load() {
    if (vm.isNew) { vm.recalculateLocal(); return; }

    return $http.get(`/api/Budgets/${$stateParams.id}`).then((res) => {
      vm.budget = res.data;
      vm.budget.date = vm.budget.date ? new Date(vm.budget.date) : new Date();
      vm.budget.chapters = ensureArray(vm.budget.chapters);

      // convertir numbers a string para inputs tipo text
      vm.budget.chapters.forEach((c) => {
        c.batches = ensureArray(c.batches);
        c.batches.forEach((b) => {
          b.amount = b.amount == null ? '' : String(b.amount);
          b.materialCost = b.materialCost == null ? '' : String(b.materialCost);
          b.labourCost = b.labourCost == null ? '' : String(b.labourCost);
        });
      });

      vm.recalculateLocal();
    });
  }

  load();
}

BudgetDetailController.$inject = ['$http', '$state', '$stateParams', '$rootScope'];
