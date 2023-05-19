'use strict';

angular.module('bahmni.home')
    .factory('initialization', ['$rootScope', 'appService', 'spinner',
        function ($rootScope, appService, spinner) {
            var initApp = function () {
                return appService.initApp('home', {
                    'app': true,
                    'extension': true
                });
            };
            return function () {
                if (!appService.getAppDescriptor()) {
                    return spinner.forPromise(initApp());
                } else {
                    return appService.getAppDescriptor();
                }
            };
        }
    ]);
