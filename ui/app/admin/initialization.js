'use strict';

angular.module('bahmni.admin')
.factory('initialization', ['$rootScope', '$q', 'appService', 'spinner', 'configurations',
    function ($rootScope, $q, appService, spinner, configurations) {
        var getConfigs = function () {
            var configNames = ['maxStorageSpace'];
            return configurations.load(configNames).then(function () {
                $rootScope.maxStorageSpace = configurations.maxStorageSpace();
            });
        };

        var initApp = function () {
            return appService.initApp('admin');
        };

        var checkPrivilege = function () {
            return appService.checkPrivilege("app:admin");
        };

        return spinner.forPromise(initApp().then(checkPrivilege).then(getConfigs));
    }
]);
