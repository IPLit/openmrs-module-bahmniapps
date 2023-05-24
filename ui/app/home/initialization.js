'use strict';

angular.module('bahmni.home')
    .factory('initialization', ['$rootScope', 'appService', 'spinner', '$q',
        function ($rootScope, appService, spinner, $q) {
            var initApp = function () {
                return appService.initApp('home', {
                    'app': true,
                    'extension': true
                });
            };
            return function () {
                return spinner.forPromise(initApp());
            };
        }
    ]);
