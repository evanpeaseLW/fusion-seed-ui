'use strict';

angular.module('myApp.viewSearch', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  	when('/search', {
    	templateUrl: 'view-search/view-search.html',
    	controller: 'ViewSearchCtrl'
  	}).
  	when('/search/:category/:filter', {
    	templateUrl: 'view-search/view-search.html',
    	controller: 'ViewSearchCtrl'
  	}).
  	when('/search/:category', {
    	templateUrl: 'view-search/view-search.html',
    	controller: 'ViewSearchCtrl'
  	});
}])

/*.controller('ViewSearchCtrl', [function() {

}]);*/

.controller('ViewSearchCtrl', function ($scope, $http, $routeParams, $location, $route, $sce) {



	var filter_separator = '~';
	var multi_select_facets = false;
	var cat_facet_field = 'cpath';
	var collapse = '{!collapse field=name_exact_s}';


	$scope.filter_separator = filter_separator;
	$scope.multi_select_facets = multi_select_facets;
	$scope.$route = $route;
	$scope.$location = $location;
	$scope.$routeParams = $routeParams;

	$scope.isCatFilterOpen = false;
	$scope.isFacetFilterOpen = true;

	var q = '*:*';
	if ($routeParams.q) q = $routeParams.q;
	console.log('q = '+$routeParams.q);
	
	var category = '*';
	if ($routeParams.category) category = decodePath($routeParams.category);
	console.log('category =' + category);

	//use lucene term qparser unless it is a * query
	var cpath_fq;
	cpath_fq = "*:*"; //temp until we have a proper category facet
	if (category == '*')
	 	cpath_fq = cat_facet_field+':'+category; //'cpath:'+category;
	else
	 	cpath_fq = '{!term f='+cat_facet_field+'}'+category;


	var filter = $routeParams.filter;
	//parse filter queries into an array so they can be passed.
	var fqs = [];
	if (filter) fqs = filter.split(filter_separator);

	//if we're using multi_select_facets, change the syntax of the fqs
	if (multi_select_facets) {
		var new_fqs = [];
		for (var i=0;i<fqs.length;i++) {
			//console.log('old fq:' + fqs[i]);
			//&fq={!tag=colortag}color:red
			var fname = fqs[i].split(':')[0];
			var new_fq = '{!tag='+fname+'_tag}'+fqs[i];
			//console.log('new fq:' + new_fq);
			new_fqs.push(new_fq);
		}
		fqs = new_fqs;
	}
	//convert all fqs to {!term} qparser syntax
	var new_fqs = []
	for (var i=0;i<fqs.length;i++) {
		var kv = fqs[i].split(':');
		var fname = kv[0];
		var fvalue = kv[1];
		new_fq = '{!term f='+fname+'}'+fvalue;
		new_fqs.push(new_fq);		
	}
	fqs = new_fqs;

	//add category as a filter
	fqs.push(cpath_fq);
	//field collapsing
	//fqs.push('{!collapse field='+group_field+'}');
	if (collapse) {
		fqs.push(collapse);
	}


	var proxy_base = 'http://localhost:9292/';
	var fusion_url = 'localhost:8764';
	//var pipeline_id = 'test1-default';
	var pipeline_id = 'products-demo';
	if ($routeParams.pipeline_id) pipeline_id = $routeParams.pipeline_id;

	var collection_id = 'products';
	if ($routeParams.collection_id) collection_id = $routeParams.collection_id;

	var request_handler = 'select';
	var url = proxy_base+fusion_url+'/api/apollo/query-pipelines/'+pipeline_id+'/collections/'+collection_id+'/'+request_handler;
	//var url = "http://localhost:9292/ec2-54-160-96-32.compute-1.amazonaws.com:8764/api/apollo/query-pipelines/test1-default/collections/test1/select?json.nl=arrarr&q=*:*&rows=100&wt=json"
	//var url = "http://ec2-54-160-96-32.compute-1.amazonaws.com:8983/solr/test1/select?q=*:*";


	//console.log("TEST AUTH: " + btoa('admin:password123'));
	//$http.defaults.headers.common = {"Access-Control-Request-Headers": "accept, origin, authorization"}

	//To use JSONP and avoid using a proxy, change method to JSONP, and add 'json.wrf': 'JSON_CALLBACK' to the params.


 	$http.defaults.headers.common['Authorization'] = 'Basic ' + btoa('admin:password123');
	$http(
		{method: 'GET',
		 url: url,
		 params:{
		 		'q': q,
		 		'fq': fqs,
		 		'wt': 'json',
		 		'rows' : 10,
		 		'json.nl': 'map'
		 		}
		})
		.success(function(data, status, headers, config) {

          $scope.data = data;
          $scope.showData = false;


		  var solr_params = data.responseHeader.params;
		  
		  //using groups, pass groups instead of docs
		  //var grouped_field = data.grouped[group_field];
		  //console.log(groups);

		  var facet_fields = data.facet_counts.facet_fields;
		  var facet_queries = data.facet_counts.facet_queries;
		  var taxonomy = facet_fields[cat_facet_field];

		  //console.log('solr_params:'+JSON.stringify(solr_params));

		  $scope.solr_params = solr_params;
		  $scope.showParams = false;
		  //$scope.split_solr_params = solr_params.split(',');

		  //$scope.docs = docs;
		  //$scope.grouped_field = grouped_field;
		  $scope.facet_fields = facet_fields;
		  $scope.facet_queries = facet_queries;
		  $scope.taxonomy = taxonomy;

		  //FIELD COLLAPSING DISPLAY
		  var docs = data.response.docs;
		  $scope.docs = docs;
		  //console.log('grouped:'+JSON.stringify(data.grouped));

		  //console.log('expanded:' + JSON.stringify(data.expanded));
		  // /FIELD COLLAPSING


		}).error(function(data, status, headers, config) {
		  console.log('Search failed!');
		  console.log(headers);
		  console.log(data);
		  console.log(config);
            });
	
	/*$scope.parseCategory = function(path, str_indent) {
		var arr_path = path.split('/');
		var length = arr_path.length;
		var catName = arr_path[length-1];
		var indent = '';

		//catName += '<a href="#/c/'+path+'">'+catName+'</a>';

		for (var i = 0; i <length; i++) indent += str_indent;
		return [indent,catName];
		//return path;
	};*/

	$scope.encodePath =  function(path) { return encodePath(path) };
	$scope.parseFacetLabel = function(field) { return parseFacetLabel(field)};


	$scope.clickSearch = function(query) {
		$location.search('q', query);
	}

	$scope.clickFacet = function(fname, fvalue, routeParams, filter_separator) {

		console.log('clicked on ' + fname + ':' + fvalue);
		if (routeParams.filter) {
			if (routeParams.filter.indexOf(fname+":"+fvalue) > -1) {
				console.log("FACET ALREADY CLICKED!");
				//remove the fname:fvalue from the filter
				var newf = splitFilter(routeParams.filter, filter_separator);
				var arr_filter = []
				for (var i=0;i<newf.length;i++) {
					if (fname+":"+fvalue == newf[i]) {
						console.log("FACET UNSELECT:" + newf[i]); //don't add it
					} else {
						console.log("FACET SELECTION:" + newf[i]);
						arr_filter.push(newf[i]);
					}
				}
				console.log('NEW FILTER STRING:' + filterConcat(arr_filter,filter_separator));
				routeParams.filter = filterConcat(arr_filter,filter_separator);
			} else {
				routeParams.filter+=filter_separator+fname+':'+fvalue;
			}
		} else routeParams.filter = fname+":"+fvalue;


		//$location.path('test');


		var new_url = '/search/'+routeParams.category+'/'+routeParams.filter;
		if (routeParams.q) new_url+= '?q='+routeParams.q
		$location.url(new_url);

	}

	function splitFilter(filter, filter_separator) {
		return filter.split(filter_separator);
	}

	function filterConcat(arr_filter, filter_separator) {
		var filter = '';
		for (var i=0;i<arr_filter.length;i++) {
			filter+= arr_filter[i];
			if (i != arr_filter.length-1) {
				filter += filter_separator;
			}
		}
		return filter;
	}

	$scope.checkCheckbox = function(fname, fvalue, routeParams) {
		if (routeParams.filter) {
			if (routeParams.filter.indexOf(fname+':'+fvalue) > -1) return true;
			else return false;
		}
		return false;
	}

	$scope.renderHtml = function(html_code)
	{
	    return $sce.trustAsHtml(html_code);
	};


	//Only used when a facet label is not passed through the pipeline (<facet field name>.label) in favor of passing a label through the pipeline as an arbitrary parameter.
	function parseFacetLabel(field) {

		field = field.replace('_ss', '');
		field = field.replace('_s','');
		field = field.replace('_', ' ');
		return field.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	function encodePath(path) {
		return path.
			replace(/\//g, '~').
			replace(/ /g, '-');
	}

	function decodePath(path) {
		return path.
			replace(/~/g, '/').
			replace(/-/g, ' ');
	};


});
