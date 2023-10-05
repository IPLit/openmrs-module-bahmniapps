'use strict';

angular.module('bahmni.admin').service('storageService', ['$rootScope', '$http', '$q', function ($rootScope, $http, $q) {
    this.getUsedSpace = function () {
        var totalSpace = $rootScope.maxStorageSpace || Bahmni.Common.Constants.maxStorageLimit;
        var url = Bahmni.Common.Constants.storageUrl + Bahmni.Common.Constants.containerName;

        $http.get(url)
            .then(function (response) {
                var dockerData = response.data;
                var containerName = dockerData.Name;
                var consumedSpaceStr = dockerData.StorageStats.Size;
                var consumedSpace = consumedSpaceStr.match(/(\d+)/)[0];
                $rootScope.consumedSpaceText = consumedSpaceStr;
                $rootScope.totalSpaceText = totalSpace + ' GB';
                $rootScope.consumedPercentage = (consumedSpace / totalSpace) * 100;
            })
            .catch(function (error) {
                console.error('Error fetching data from Docker API:', error);
            });
    };
}]);
