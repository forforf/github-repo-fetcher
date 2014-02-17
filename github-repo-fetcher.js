'use strict';

angular.module('GithubRepoFetcher', ['AngularEtag'])

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

    //filters is an array
    // if an item is an object, it will be merged with any other objects
    // and the merged object will be sent to the repo as url query parameters
    // for example [{sort: 'updated'}] would result in ?sort=updated query param
    // If an item is a function, it is applied after the repos is received and
    // each function is applied in order (each filter function must accept and
    // return an array of repo objects. Note the fn in the array must be a
    // fn that returns the fn to apply.
    function fetcher(username, filters) {

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

      var fetcherFn = function () {
        return ehttp.etagGet(urlOpts).then(function (resp) {
          return resp.data;
        });
      };

      var filteredRepos = qChain.generator;
      return filteredRepos(fetcherFn, respFilters);
    }

    return {
      fetcher: fetcher
    };
  });
