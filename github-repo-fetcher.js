'use strict';

angular.module('GithubRepoFetcher', ['AngularEtag'])

  .config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    //delete $httpProvider.defaults.headers.common['X-Requested-With'];

  }
  ])

  .factory('qChain', function () {

    function chainErrorHandler(err) {
      err.message = 'Error caught during filtering collection. Orig Msg: ' + err.message;
      return err;
    }

    //This function runs the initPromFn (which should be a promise that resolves to a collection)
    //then runs each filter in sequence against the resulting collection
    function generator(initPromFn, chain) {
      if (!(_.isArray(chain))){
        return initPromFn();
      }

      return chain.reduce(function (prevPromise, curProm) {
        return prevPromise.then(curProm).
          catch (chainErrorHandler);
      }, initPromFn());
    }

    return {
      generator: generator
    };
  })

  .factory('GithubRepo', function (ehttp, qChain) {

    // will contain headers after a fetch
    var headers;

    //filters is an array
    // if an item is an object, it will be merged with any other objects
    // and the merged object will be sent to the repo as url query parameters
    // for example [{sort: 'updated'}] would result in ?sort=updated query param
    // If an item is a function, it is applied after the repos is received and
    // each function is applied in order (each filter function must accept and
    // return an array of repo objects. Note the fn in the array must be a
    // fn that returns the fn to apply.
    function fetcher(credentials, filters) {
      var username;
      var pw;

      if(typeof credentials === 'string'){
        username = credentials;
      } else {
        username = credentials.username;
        pw = credentials.password;
      }

      if (!(_.isArray(filters))){
        filters = [];
      }


      var reqFilterList = filters.filter(function (f) {
        return typeof f === 'object';
      });

      var reqFilters = _.extend.apply(null, reqFilterList);

      var respFilters = filters.filter(function (f) {
        return typeof f === 'function';
      });

      var urlOpts = {
        //method: 'GET',
        url: 'https://api.github.com/users/' + username + '/repos',
        params: reqFilters
      };

      if(pw){
        var basicAuth = btoa(username+':'+pw);
        //urlOpts.headers = urlOpts.headers || {};
        //urlOpts.headers.Authorization = 'Basic ' + basicAuth
        ehttp.defaults.headers.common['Authorization'] = 'Basic ' + basicAuth;
      }

      var fetcherFn = function () {
        return ehttp.etagGet(urlOpts).then(function (resp) {
          headers = resp.headers();
          return resp.data;
        });
      };

      var filteredRepos = qChain.generator;
      return filteredRepos(fetcherFn, respFilters);
    }

    function headers(){ return headers; }

    return {
      fetcher: fetcher,
      headers: headers
    };
  });
