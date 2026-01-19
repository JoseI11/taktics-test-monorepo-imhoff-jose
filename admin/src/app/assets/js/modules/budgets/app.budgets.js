import angular from 'angular';
import budgetsUrl from './views/budgets.index.html';
import budgetDetailUrl from './views/budgets.detail.html';

import BudgetsController from './controllers/budgets.index.controller';
import BudgetDetailController from './controllers/budgets.detail.controller';

export default angular.module('app.budgets', []).config(routeConfig).name;

function routeConfig($stateProvider) {
  $stateProvider
    .state('budgets', {
      url: '/budgets',
      templateUrl: budgetsUrl,
      controller: BudgetsController,
      controllerAs: 'vm',
    })
    .state('budgetCreate', {
      url: '/budgets/new',  // Debe ir ANTES que :id
      templateUrl: budgetDetailUrl,
      controller: BudgetDetailController,
      controllerAs: 'vm',
    })
    .state('budgetDetail', {
      url: '/budgets/:id',
      templateUrl: budgetDetailUrl,
      controller: BudgetDetailController,
      controllerAs: 'vm',
    });
}

routeConfig.$inject = ['$stateProvider'];
