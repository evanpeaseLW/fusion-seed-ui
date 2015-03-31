
angular.module('fusion.Directives', [])

    /*
     stuller DIRECTIVES
     Directives for the stuller Pilot
     */
    .directive('fusionClickSimulator', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'fusion/directives/click-simulator.html'
        };
    })
    .directive('fusionRunAggr', function() {
        return {
            restrict: 'E',
            scope: true,
            templateUrl: 'fusion/directives/btn-run-aggr.html'
        };
    });;