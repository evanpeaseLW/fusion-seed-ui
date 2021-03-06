'use strict';

angular.module('fusionSeed.viewWfmSearch', ['ngRoute','solr.Directives', 'wfm.Directives', 'fusion.Directives'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  	when('/wfm', {
    	templateUrl: 'wfm/view-store-select.html',
    	controller: 'ViewWfmSearchCtrl'
  	}).
    when('/wfm/:store?/:category?', {
        templateUrl: 'wfm/view-search.html',
        controller: 'ViewWfmSearchCtrl'
    });
}])

/*.controller('ViewWfmSearchCtrl', [function() {

}]);*/

.controller('ViewWfmSearchCtrl', function ($scope, $http, $routeParams, $location, $route, $sce, fusionHttp, wfmSettings) {


    var proxy_base = wfmSettings.proxyUrl;
	var fusion_url = wfmSettings.fusionUrl;

	var pipeline_id = wfmSettings.pipelineId;
	var collection_id = wfmSettings.collectionId;

	//override default if passed to URL
	if ($routeParams.collection_id) collection_id = $routeParams.collection_id;
	if ($routeParams.pipeline_id) pipeline_id = $routeParams.pipeline_id;

    $scope.pipeline_id = pipeline_id;


    if ($routeParams.searchWithin) $scope.searchWithin = $routeParams.searchWithin;

	var request_handler = wfmSettings.requestHandler;
	var url = proxy_base+fusion_url+'/api/apollo/query-pipelines/'+pipeline_id+'/collections/'+collection_id+'/'+request_handler;
	//var url = "http://localhost:9292/ec2-54-160-96-32.compute-1.amazonaws.com:8764/api/apollo/query-pipelines/test1-default/collections/test1/select?json.nl=arrarr&q=*:*&rows=100&wt=json"
	//var url = "http://ec2-54-160-96-32.compute-1.amazonaws.com:8983/solr/test1/select?q=*:*";

	var filter_separator = wfmSettings.filterSeparator;
	var multi_select_facets = wfmSettings.multiSelectFacets;
	var cat_facet_field = wfmSettings.taxonomyField;
	var collapse = "{!collapse field="+wfmSettings.collapseField+"}";

    $scope.controller_path = wfmSettings.controllerPath;
    $scope.taxonomy_field = wfmSettings.taxonomyField;
    $scope.taxonomy_separator = wfmSettings.taxonomySeparator;
	$scope.filter_separator = wfmSettings.filterSeparator;
	$scope.multi_select_facets = multi_select_facets;
	$scope.$route = $route;
	$scope.$location = $location;
	$scope.$routeParams = $routeParams;

	$scope.isCatFilterOpen = false;
	$scope.isFacetFilterOpen = true;

	var q = '*:*';
	if ($routeParams.q) q = $routeParams.q;
	//console.log('q = '+$routeParams.q);
	
	var category = '*';
	if ($routeParams.category) {
        category = decodePath($routeParams.category);
        $scope.breadcrumb = category.split($scope.taxonomy_separator);
    }
	//console.log('category =' + category);

	//use lucene term qparser unless it is a * query
	var cpath_fq;
	cpath_fq = "*:*"; //temp until we have a proper category facet
	if (category == '*')
	 	cpath_fq = cat_facet_field+':'+category; //'cpath:'+category;
	else
	 	cpath_fq = '{!term f='+cat_facet_field+'}'+category;


	//var filter = $routeParams.filter;
    var filter = $routeParams.f;
	//parse filter queries into an array so they can be passed.
	var fqs = [];
	//if (filter) fqs = filter.split(filter_separator);
    if (filter) fqs = filter //$routeParams.f;
	//if we're using multi_select_facets, change the syntax of the fqs
	if (multi_select_facets) {
		var new_fqs = [];
		for (var i=0;i<fqs.length;i++) {
			//console.logs('old fq:' + fqs[i]);
			//&fq={!tag=colortag}color:red
			var fname = fqs[i].split(':')[0];
			var new_fq = '{!tag='+fname+'_tag}'+fqs[i];
			//console.logs('new fq:' + new_fq);
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

    //add searchWithin as a filter
    if ($scope.searchWithin) fqs.push($scope.searchWithin);

    //WFM only - filter on current store code or "ALL" for non products
    if ($routeParams.store)
        fqs.push("store_code_s:"+$routeParams.store+" OR store_code_s:ALL");

    //WFM only - sale filter
    if ($routeParams.sale) {
        fqs.push("saleStart_tdt:[* TO NOW] AND saleEnd_tdt:[NOW TO *]");
    }

    //field collapsing
	if (collapse) {
		fqs.push(collapse);
	}

	//To use JSONP and avoid using a proxy, change method to JSONP, and add 'json.wrf': 'JSON_CALLBACK' to the params.
    $scope.loading = true;


    //get recommendations bq
    var bq = ''
    var recFilters = [];
    if ($routeParams.store) recFilters.push('filters_orig_ss:store/'+$routeParams.store.toLowerCase());
    if ($routeParams.category && $routeParams.category != '*')
        recFilters.push("filters_orig_ss:cat_tree/"+fusionHttp.getCatCode($routeParams.category));
        //we want the bq to be filtered based on the current store and the category!!!
    var bq = [];

    //if ($routeParams.recommendations)
    $scope.doRecommendations = $routeParams.recommendations;
    if ($scope.doRecommendations == "true") {
        fusionHttp.getItemsForQueryRecommendations(proxy_base+fusion_url, collection_id, q, recFilters)
            .success(function (data) {
                for (var i = 0; i < data.items.length; i++) {
                    var item = data.items[i];
                    //console.log(item);
                    bq.push("id:"+item.docId + '^' + item.weight);
                }
                console.log("Recommendations bq: " + bq);
                getSearchResults(bq);
            });
    } else {
        getSearchResults();
    }




    function getSearchResults(bq) {
        fusionHttp.getQueryPipeline(proxy_base+fusion_url,pipeline_id,collection_id, request_handler,
            {
                'q': q,
                'fq': fqs,
                'wt': 'json',
                'rows' : 10,
                'json.nl': 'arrarr',
                'bq' : bq
            })
            .success(function(data, status, headers, config) {
                $scope.loading = false;
                $scope.data = data;
                $scope.showData = false;
                $scope.showDoc = false;


                var solr_params = data.responseHeader.params;

                //using groups, pass groups instead of docs
                //var grouped_field = data.grouped[group_field];
                //console.logs(groups);

                var facet_fields = data.facet_counts.facet_fields;
                var facet_queries = data.facet_counts.facet_queries;
                var taxonomy = facet_fields[cat_facet_field];

                //console.logs('solr_params:'+JSON.stringify(solr_params));

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
                //console.logs('grouped:'+JSON.stringify(data.grouped));

                //console.logs('expanded:' + JSON.stringify(data.expanded));
                // /FIELD COLLAPSING

                //how many docs are there?
                var docCount = docs.length;
                //console.log("Doc count:"+ docCount);
                if (docCount == 0) {
                    fusionHttp.getSpellCheck(proxy_base+fusion_url,"wfm_poc1-spellcheck",collection_id,q)
                        .success(function(data2) {
                            console.log(data2);
                            if (data2.spellcheck.suggestions.collation) {
                                console.log("YES");
                                $scope.spellsuggest = data2.spellcheck.suggestions.collation
                            } else {
                                $scope.spellsuggest = data2.spellcheck.suggestions
                            }
                            //console.log($scope.spellsuggest);
                        });
                }


            }).error(function(data, status, headers, config) {
                console.log('Search failed!');
                console.log(headers);
                console.log(data);
                console.log(config);
            });
    }


	$scope.encodePath =  function(path) { return encodePath(path) };
	$scope.parseFacetLabel = function(field) {
        //console.log("in parse facet label");
        field = field.replace('_ss', '');
        field = field.replace('_s','');
        field = field.replace('_', ' ');
        return field.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };

    $scope.doSearchWithin = function(text) {
        $location.search('searchWithin', text);
    }

	$scope.clickSearch = function(query) {
		$location.search('q', query);
	}


    $scope.current_store;
    $scope.selectStore = function() {
        console.log("Chose store code: " + $scope.current_store[0]);
        $location.path(wfmSettings.controllerPath +'/'+$scope.current_store[0]+'/*');
    }



    //Signals API
    //curl -u admin:password123 -X POST -H 'Content-type:application/json' -d '[{"params": {"query": "sushi", "docId": "54c0a3bafdb9b911008b4b2a"}, "type":"click", "timestamp": "2015-02-12T23:44:52.533000Z"}]' http://ec2-54-90-6-131.compute-1.amazonaws.com:8764/api/apollo/signals/wfm_poc1
    $scope.sendClickSignal = function(signalType,docId,count) {


        var filters = [];
        filters.push("store/" + $routeParams.store);
        if ($routeParams.category && $routeParams.category != '*')
            filters.push("cat_tree/" + fusionHttp.getCatCode($routeParams.category));


        var data = []
        for (var i= 0;i<count;i++) {
            var signal = {"params": {"query": $routeParams.q, filterQueries: filters, "docId": docId}, "type":signalType, "timestamp": "2015-02-12T23:44:52.533000Z"};
            //console.log(solrParams.q);
            //console.log(solrParams.fq);
            console.log(signal);
            data.push(signal);
        }
        /*return $http.post(url, data)
            .success(function(response) {
                console.log(response);
                var msg = 'Successfully indexed signals for docid: ' + docId;
                console.log(msg)
                $scope.notification = true;
                $scope.notificationMsg = msg;
            });*/
        return fusionHttp.postSignal(wfmSettings.proxyUrl+wfmSettings.fusionUrl,collection_id,data)
            .success(function(response) {
                console.log(response);
                var msg = 'Successfully indexed signals for docid: ' + docId;
                console.log(msg)
                $scope.notification = true;
                $scope.notificationMsg = msg;
            });
    }


    $scope.urlSafe = function(text) {
        text = text.toLowerCase();
        text = text.replace(/ /g,"-");
        text = text.replace(/&/g,'and');
        text = text.replace(/\//g,' ');
        text = text.replace(/\./g,'-');

        return text;
    }

    //http://ec2-54-90-6-131.compute-1.amazonaws.com:8764/api/apollo/aggregator/jobs/wfm_poc1_signals/wfmClickAggr
    $scope.runAggregations = function() {

        //var url = WFM_DEFAULTS.proxy_url+'ec2-54-90-6-131.compute-1.amazonaws.com:8764/api/apollo/aggregator/jobs/'+collection_id+'_signals/'+WFM_DEFAULTS.aggr_job_id;

        //console.log("Posting to " + url);

        //return $http.post(url)
        return fusionHttp.postRunAggr(wfmSettings.proxyUrl+wfmSettings.fusionUrl,collection_id,wfmSettings.aggrJobId)
            .success(function(response) {
                var msg = 'Started aggregation job: ' + wfmSettings.aggrJobId;
                console.log(msg);
                $scope.notification = true;
                $scope.notificationMsg = msg;
            });
    }

    //Not being used - uses an Ngram approach for suggestions.
    $scope.typeAheadSearch3 = function(val) {
        //var url = WFM_DEFAULTS.proxy_url+'ec2-54-90-6-131.compute-1.amazonaws.com:8983/solr/wfm_poc1/suggest';
        var url =  wfmSettings.proxyUrl+wfmSettings.fusionUrl+'/api/apollo/query-pipelines/type-ahead/collections/'+collection_id+'/suggest';
        return $http.get(url, {
            params: {
                q: val,
                fq: 'store_code_s:'+$routeParams.store
            }

        }).then(function(response){
            //console.log(response);
            var d = response.data.response.docs;

            var ta = [];
            for (var i=0;i<d.length;i++) {
                //console.log(d[i].description_s)
                ta.push(d[i].description);
            }
            return ta;
        })
    };


    //TODO: integrate http://ec2-54-90-6-131.compute-1.amazonaws.com:8983/solr/wfm_poc1/suggest2?q=chi
    //It uses the spellcheck component and performs well on the search history index.
    $scope.typeAheadSearch2 = function(val) {

        var url = wfmSettings.proxyUrl + "ec2-54-90-6-131.compute-1.amazonaws.com:8983/solr/wfm_poc1/suggest2?q="+val;

        return $http.get(url, {
            params: {
                wt: 'json'
            }

        }).then(function (response) {
            var ta = [];

            if (val.split(' ').length == 1) {
                var d = response.data.spellcheck.suggestions[1].suggestion;
                //console.log(d);
                for (var i = 0; i < d.length; i++) {
                    //console.log(d);
                    //console.log("pushing:");
                    //console.log(d[i].term);
                    ta.push(d[i]);
                }
                return ta;
            } else {
                var d = response.data.spellcheck.suggestions[3].suggestion;
                for (var i = 0; i < d.length; i++) {
                    //console.log(d);
                    //console.log("pushing:");
                    //console.log(d[i].term);
                    ta.push(d[i]);
                }
            }
        })

    };



    //an alternate type ahead using the search history collection and the suggester component
    $scope.typeAheadSearch = function(val) {

        var url = wfmSettings.proxyUrl + "ec2-54-90-6-131.compute-1.amazonaws.com:8983/solr/wfm_search_history/suggest?suggest=true&suggest.build=true&suggest.dictionary=wfmSuggester&suggest.q="+val;

        return $http.get(url, {
            params: {
                wt: 'json'
            }

        }).then(function (response) {
            //console.log(response);
            var d = response.data.suggest.wfmSuggester[val].suggestions;
            //console.log(d.term);
            var ta = [];
            for (var i = 0; i < d.length; i++) {
                //console.log("pushing:");
                //console.log(d[i].term);
                ta.push(d[i].term);
            }
            return ta;
        })

    };


    $scope.clickSaleFilter = function() {

        if ($location.search()['sale'] == 'true') {
            //already filtered, un-filter
            var search = $location.search();
            delete search['sale'];
            $location.search(search);

        } else {
            $location.search('sale', 'true');
        }

    }

    $scope.isSalesFilterChecked = function () {

        if ($location.search()['sale'] == 'true') {
            return true;
        }

    }



    $scope.createCatLink = function(cat) {
        //console.log('clickCategory test, here are the routeParams: '+ routeParams);
        //"#/{{controller_path}}/{{$routeParams.store}}/{{encodePath(cat[0])}}/{{$routeParams.filter}}?q={{$routeParams.q}}"
        //return "myfakelink"+ cat;
        var q = "";
        if ($routeParams.q) q = $routeParams.q;

        return "#/"+wfmSettings.controllerPath+"/"+$routeParams.store+"/"+encodePath(cat)+"?q="+q;
    }

	$scope.clickFacet = function(fname, fvalue) {

        var search = $location.search();

        //was the filter already clicked on?
        var filters = search['f'];
        var already_clicked = false;
        if (filters) {
            if (Array.isArray(filters)) {
                for (var i=0;i<filters.length;i++) {
                    if (filters[i] == fname+":"+fvalue) {
                        //console.log("ALREADY CLICKED (multi filter)");
                        already_clicked = true;
                        filters.splice(i,1);
                        search['f'] = filters;
                    }
                }
            } else {
                if (filters == fname+":"+fvalue) {
                    //console.log ("ALREADY CLICKED (single filter)");
                    already_clicked = true;
                    //console.log("search f before: "+ search['f'])
                    delete search['f'];
                    //console.log("search f after: "+ search['f'])
                }
            }
        }

        if (already_clicked == false) {
            var f = []; //array of filters
            if (search['f']) {
                //if there is already multiple "f"s then it is already array
                if (Array.isArray(search['f'])) f = search['f']
                //if there is a single value (not an array), add it to our array
                else f.push(search['f']);
            }
            //add the new filter to our array
            f.push(fname + ":" + fvalue);
            //add our new array of filters to the search object
            search['f'] = f;
        }
        $location.search(search);
        $location.replace();


		//console.log('clicked on ' + fname + ':' + fvalue);
		/*if (routeParams.filter) {
			if (routeParams.filter.indexOf(fname+":"+fvalue) > -1) {
				//console.log("FACET ALREADY CLICKED!");
				//remove the fname:fvalue from the filter
				var newf = splitFilter(routeParams.filter, filter_separator);
				var arr_filter = []
				for (var i=0;i<newf.length;i++) {
					if (fname+":"+fvalue == newf[i]) {
						//console.log("FACET UNSELECT:" + newf[i]); //don't add it
					} else {
						//console.log("FACET SELECTION:" + newf[i]);
						arr_filter.push(newf[i]);
					}
				}
				//console.log('NEW FILTER STRING:' + filterConcat(arr_filter,filter_separator));
				routeParams.filter = filterConcat(arr_filter,filter_separator);
			} else {
				routeParams.filter+=filter_separator+fname+':'+fvalue;
			}
		} else routeParams.filter = fname+":"+fvalue;


		var new_url = '/'+WFM_DEFAULTS.controller_path+'/'+routeParams.store+'/'+routeParams.category+'/'+routeParams.filter;
		if (routeParams.q) new_url+= '?q='+routeParams.q;
		$location.url(new_url).search(search);*/

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

	$scope.isSelected = function(fname, fvalue) {

        var search = $location.search();
		if (search.f) {
			if (search.f.indexOf(fname+':'+fvalue) > -1) return true;
			else return false;
		}
		return false;
	}

	$scope.renderHtml = function(html_code)
	{
	    return $sce.trustAsHtml(html_code);
	};


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
