export default function BudgetsController($http) {
  const vm = this;

  vm.filters = {
    name: '',
    clientName: '',
    dateFrom: null,
    dateTo: null,
  };

  vm.loading = false;
  vm.error = null;
  vm.budgets = [];

  vm.search = search;
  vm.clear = clear;

  // auto-load
  search();

  function buildFilter() {
    const where = {};

    if (vm.filters.name) {
      where.name = { like: `%${vm.filters.name}%`, options: 'i' };
    }
    if (vm.filters.clientName) {
      where.clientName = { like: `%${vm.filters.clientName}%`, options: 'i' };
    }

    if (vm.filters.dateFrom && vm.filters.dateTo) {
      where.date = { between: [vm.filters.dateFrom, vm.filters.dateTo] };
    } else if (vm.filters.dateFrom) {
      where.date = { gte: vm.filters.dateFrom };
    } else if (vm.filters.dateTo) {
      where.date = { lte: vm.filters.dateTo };
    }

    return { where, order: 'date DESC' };
  }

  function search() {
    vm.loading = true;
    vm.error = null;

    const filter = buildFilter();
    return $http
      .get('/api/Budgets', { params: { filter: JSON.stringify(filter) } })
      .then((res) => {
        vm.budgets = Array.isArray(res.data) ? res.data : [];
      })
      .catch((err) => {
        vm.error = err?.data?.error?.message || err.message || 'Error loading budgets';
      })
      .finally(() => {
        vm.loading = false;
      });
  }

  function clear() {
    vm.filters = { name: '', clientName: '', dateFrom: null, dateTo: null };
    return search();
  }
}

BudgetsController.$inject = ['$http'];
