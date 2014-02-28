'use strict';

//helpers
function escapeRegExp(string){
  return string.replace(/([.*+?^=!${}()|\[\]\/\\])/g, "\\$1");
}

describe('GithubRepoFetcher', function(){
  beforeEach(module('GithubRepoFetcher'));

  describe('qChain', function(){
    var _qChain;

    beforeEach(inject(function( $injector, qChain){
      _qChain = qChain;
    }));

    it('sanity check', function(){
      expect(_qChain).toBeDefined();
    });

    describe('.generator', function(){
      var initPromFn;
      var chain;
      var count;
      var delay;
      var _timeout;

      beforeEach(inject(function($q, $timeout){
        _timeout = $timeout;

        count=0;
        function filter(collection, name){
          collection.push(''+name+count);
          count+=1;
          return collection;
        }

        function getProm(val, delay){
          var deferred = $q.defer();
          $timeout(function(){
            deferred.resolve(val);
          }, delay);
          return deferred.promise;
        }

        delay=100;
        initPromFn = function(){ return getProm( ['init'], delay) };
        chain = [];
        chain.push( function(coll){ return filter(coll, 'a'); });
        chain.push( function(coll){ return filter(coll, 'b'); });
        chain.push( function(coll){ return filter(coll, 'c'); });
      }));


      it('takes an initial collection and filters sequentially', function(){
        var finalCollection;
        _qChain.generator(initPromFn, chain).then( function(coll){
          finalCollection = coll;
        });

        expect(finalCollection).not.toBeDefined();

        _timeout.flush(delay+50);

        var expectedCollection = ['init', 'a0', 'b1', 'c2'];
        expect(finalCollection).toEqual( expectedCollection );

      })

    });
  });

  describe('GithubRepo', function(){
    var githubRepo;

    beforeEach(inject(function( $injector, GithubRepo){
      githubRepo = GithubRepo;
    }));

    it('sanity check', function(){
      expect(githubRepo).toBeDefined();
    });

    describe('fetcher credentials - user', function(){
      var user;
      var pw;
      var ghUrl;
      var _httpBackend;
      var fetchedRepos;

      beforeEach(inject(function($httpBackend){
        _httpBackend = $httpBackend;
        user = 'forforforf';
        pw = 'sekret';
        ghUrl = 'https://api.github.com/users/'+user+'/repos'

        _httpBackend
          .when('GET', ghUrl, {})
          .respond(200, 'repos', {});

        githubRepo.fetcher(user).then(function(repos){
          fetchedRepos = repos;
        });



      }));

      it('sets credentials as username if string', function(){
        expect(fetchedRepos).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedRepos).toEqual('repos');

      });

    });

    //Can't figure out how to test the Auth header is correctly set.
    describe('fetcher credentials - full', function(){
      var user;
      var pw;
      var ghUrl;
      var _httpBackend;
      var fetchedRepos;
      var headers;

      beforeEach(inject(function($httpBackend){
        _httpBackend = $httpBackend;
        user = 'forforforf';
        pw = 'sekret';
        ghUrl = 'https://api.github.com/users/'+user+'/repos'
        var creds = {username: user, password: pw};

        var basicAuth = btoa(user+':'+pw);
        var authHdr = {Authorization: 'Basic ' + basicAuth};

        //Can't get it to recognize headers
        _httpBackend
          .when('GET', ghUrl, {} /* , authHdr */)
          .respond(200, 'repos', {});

        githubRepo.fetcher(creds).then(function(repos){
          fetchedRepos = repos
        });



      }));

      it('sets credentials as username if string', function(){
        expect(fetchedRepos).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedRepos).toEqual('repos');

      });

    });

    describe('fetcher', function(){
      var fetcher;
      var user;
      var ghUrl;
      var repos;
      var headers;
      var fetchedHeaders;
      var _httpBackend;

      beforeEach(inject(function($httpBackend){
        user = 'forforforf';
        ghUrl = 'https://api.github.com/users/'+user+'/repos'
        var repo1 = {name: 'a'};
        var repo2 = {name: 'b'};
        var repo3 = {name: 'c'};
        repos = [repo1, repo2, repo3];

        headers = {
          'Header1': 'Header1 Value',
          'Header2': 'Header2 Value'
        };

        _httpBackend = $httpBackend;

        _httpBackend
          .when('GET', ghUrl)
          .respond(200, repos, headers);

        fetcher = githubRepo.fetcher;
      }));

      it('fetches the repo data', function(){
        var fetchedRepos;

        fetcher(user).then(function(resp){
          fetchedRepos = resp;
        });

         expect(fetchedRepos).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedRepos).toEqual(repos);
      });

      it('fetches header data', function(){
        var fetchedRepos;

        fetcher(user).then(function(resp){
          fetchedHeaders = githubRepo.headers();
        });

        expect(fetchedHeaders).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedHeaders.header1).toEqual(headers.Header1);
        expect(fetchedHeaders.header2).toEqual(headers.Header2);
      });

      //I'm not able to figure out an elegant test for this
      xit('passes object params in request to url')

      it('applies filters sequentially', function(){
        var fetchedRepos;

        var chain1 = function(repos){ repos.push({name: 'd'}); return repos; };
        var chain2 = function(repos){ return repos.reverse(); };
        var chain3 = function(repos){ return repos.slice(1,3); };
        var chains = [chain1, chain2, chain3];

        var expectedRepos = [ { name : 'c' }, { name : 'b' } ];

        fetcher(user, chains).then(function(resp){
          fetchedRepos = resp
        });

        expect(fetchedRepos).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedRepos).toEqual(expectedRepos);
      })

    });

    describe('rateLimits credentials - user', function(){
      var user;
      var pw;
      var ghUrl;
      var _httpBackend;
      var fetchedLimits;

      beforeEach(inject(function($httpBackend){
        _httpBackend = $httpBackend;
        user = 'forforforf';
        pw = 'sekret';
        ghUrl = 'https://api.github.com/rate_limit';

        _httpBackend
          .when('GET', ghUrl, {})
          .respond(200, 'limits', {});

        githubRepo.rateLimits(user).then(function(resp){
          fetchedLimits = resp;
        });



      }));

      it('sets credentials as username if string', function(){
        expect(fetchedLimits).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedLimits).toEqual('limits');
      });

    });

    //Can't figure out how to test the Auth header is correctly set.
    describe('rateLimits credentials - full', function(){
      var user;
      var pw;
      var ghUrl;
      var _httpBackend;
      var fetchedLimits;

      beforeEach(inject(function($httpBackend){
        _httpBackend = $httpBackend;
        user = 'forforforf';
        pw = 'sekret';
        ghUrl = 'https://api.github.com/rate_limit';
        var creds = {username: user, password: pw};

        var basicAuth = btoa(user+':'+pw);
        var authHdr = {Authorization: 'Basic ' + basicAuth};

        //Can't get it to recognize headers
        _httpBackend
          .when('GET', ghUrl, {} /* , authHdr */)
          .respond(200, 'limits', {});

        githubRepo.rateLimits(creds).then(function(resp){
          fetchedLimits = resp
        });
      }));

      it('sets credentials as username if string', function(){
        expect(fetchedLimits).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedLimits).toEqual('limits');
      });
    });

    describe('rateLimits', function(){
      var rateLimitFetcher;
      var user;
      var ghUrl;
      var limits;
      var _httpBackend;

      beforeEach(inject(function($httpBackend){
        user = 'forforforf';
        ghUrl = 'https://api.github.com/rate_limit'

        limits = {
          "resources": {
            "core": {
              "limit": 5000,
              "remaining": 4999,
              "reset": 1372700873
            },
            "search": {
              "limit": 20,
              "remaining": 18,
              "reset": 1372697452
            }
          },
          "rate": {
            "limit": 5000,
            "remaining": 4999,
            "reset": 1372700873
          }
        };

        _httpBackend = $httpBackend;

        _httpBackend
          .when('GET', ghUrl)
          .respond(200, limits);

        rateLimitFetcher = githubRepo.rateLimits;
      }));

      it('fetches the repo data', function(){
        var fetchedLimits;

        rateLimitFetcher(user).then(function(resp){
          fetchedLimits = resp;
        });

        expect(fetchedLimits).toBeUndefined();
        _httpBackend.flush();
        expect(fetchedLimits).toEqual(limits);
      });

    });
  });
});