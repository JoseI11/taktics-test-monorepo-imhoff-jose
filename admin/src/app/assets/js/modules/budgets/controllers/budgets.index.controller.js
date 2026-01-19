import deleteModalTpl from '../views/_budgets.delete.modal.html';

export default function BudgetsController($http, $modal, $rootScope, $timeout) {
  const vm = this;

  vm.budgets = [];
  vm.loading = false;
  vm.error = null;

  // ✅ FLASH (viene desde BudgetDetailController al hacer save + redirect)
  vm.flash = $rootScope.flash || null;
  $rootScope.flash = null; // limpiar para que no quede pegado

  // opcional: auto-ocultar
  if (vm.flash) {
    $timeout(() => { vm.flash = null; }, 4000);
  }

  vm.filters = {
    name: '',
    clientName: '',
    dateFrom: null,
    dateTo: null,
  };

  /**
   * Triggers budget search with current filter values.
   */
  vm.search = () => loadBudgets();

  /**
   * Clears all filter values and reloads the full budget list.
   */
  vm.clear = () => {
    vm.filters.name = '';
    vm.filters.clientName = '';
    vm.filters.dateFrom = null;
    vm.filters.dateTo = null;
    loadBudgets();
  };

  /**
   * Opens a confirmation modal and deletes the specified budget on confirmation.
   * Shows flash message on success and reloads the budget list.
   * @param {Object} b - The budget object to delete
   * @returns {Object} The modal instance
   */
  vm.delete = (b) => {
    const modal = $modal({
      title: 'Delete budget',
      content: '',
      template: deleteModalTpl,
      show: true,
      backdrop: 'static',
      keyboard: false,
      locals: { budget: b },
      controller: ['$scope', function ($scope) {
        $scope.budget = b;

        $scope.confirm = () => {
          vm.loading = true;
          vm.error = null;

          $http.delete(`/api/Budgets/${b.id}`)
            .then(() => {
              // ✅ opcional: flash también al borrar
              vm.flash = { type: 'success', text: 'Budget deleted successfully' };
              $timeout(() => { vm.flash = null; }, 4000);

              return loadBudgets();
            })
            .catch((err) => {
              vm.error =
                (err && err.data && err.data.error && err.data.error.message) ||
                'Delete failed';
            })
            .finally(() => {
              vm.loading = false;
              $scope.$hide();
            });
        };
      }],
    });

    return modal;
  };

  /**
   * Builds a Loopback filter object based on current filter values.
   * Creates case-insensitive LIKE queries for name and clientName,
   * and date range queries for dateFrom/dateTo.
   * @returns {Object} Loopback filter object with where clause and order
   */
  function buildFilter() {
    const where = {};

    if (vm.filters.name) {
      where.name = { like: vm.filters.name, options: 'i' };
    }

    if (vm.filters.clientName) {
      where.clientName = { like: vm.filters.clientName, options: 'i' };
    }

    if (vm.filters.dateFrom || vm.filters.dateTo) {
      where.date = {};
      if (vm.filters.dateFrom) where.date.gte = vm.filters.dateFrom;
      if (vm.filters.dateTo) where.date.lte = vm.filters.dateTo;
    }

    return { where, order: 'date DESC' };
  }

  /**
   * Loads budgets from the backend API with current filters applied.
   * Sets loading state, builds filter, fetches data, and handles errors.
   * @returns {Promise} The HTTP request promise
   */
  function loadBudgets() {
    vm.loading = true;
    vm.error = null;

    const filter = buildFilter();

    return $http.get('/api/Budgets', {
      params: { filter: JSON.stringify(filter) },
    })
      .then((res) => {
        vm.budgets = Array.isArray(res.data) ? res.data : [];
      })
      .catch((err) => {
        vm.error =
          (err && err.data && err.data.error && err.data.error.message) ||
          'Failed to load budgets';
        vm.budgets = [];
      })
      .finally(() => {
        vm.loading = false;
      });
  }

  loadBudgets();
}

BudgetsController.$inject = ['$http', '$modal', '$rootScope', '$timeout'];
