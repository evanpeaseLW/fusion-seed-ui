var myModule = angular.module('fusionSeed.stullerSettings', []);

myModule.factory('stullerSettings', ['$http', function($http) {

    //$http.defaults.headers.common['Authorization'] = 'Basic ' + btoa('admin:password123');

    var stullerSettings = {
        //"proxyUrl": "http://localhost:9292/",
        //"fusionUrl": "162.242.133.12:8764",
        "fusionUrl": "http://localhost:9292",
        "pipelineId": "products1-default",
        "simplePipelineId": "products1-simple",
        "collectionId": "products1",
        "typeAheadCollectionId": "products1_suggest",
        "requestHandler": "select",
        "taxonomyField": "attr_MarketingCategories_",
        "taxonomySeparator": "/",
        "filterSeparator": "~",
        "controllerPath": "stuller",
        "multiSelectFacets": false,
        "collapseField": undefined, //defined in pipeline
        "aggrJobId": "clickAggr"
    };

    return stullerSettings;

}]);