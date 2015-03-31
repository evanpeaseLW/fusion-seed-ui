
angular.module('stuller.Directives', [])

    /*
     stuller DIRECTIVES
     Directives for the stuller Pilot
     */
    .directive('stullerSaleFilter', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-sale-filter.html'
        };
    })
    .directive('stullerSearchWithinResultsFilter', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-search-within-results.html'
        };
    })
    .directive('stullerNotification', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-notification.html'
        };
    })
    .directive('stullerProductResultItem', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-product-result-item.html'
        };
    })
    .directive('stullerSpellSuggest', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-spell-suggest.html'
        };
    })
    .directive('stullerAutoComplete', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-auto-complete.html'
        };
    })
    .directive('stullerChooseDepartmentFacet', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'stuller/directives/stuller-choose-department-facet.html'
        };
    });