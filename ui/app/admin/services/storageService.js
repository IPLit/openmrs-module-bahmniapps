'use strict';

angular.module('bahmni.admin').service('storageService', ['$rootScope', '$http', '$q', function ($rootScope, $http, $q) {
    this.getUsedSpace = function () {
        $rootScope.totalSpace = $rootScope.maxStorageSpace || Bahmni.Common.Constants.maxStorageLimit;
        $rootScope.containerNameOrId = Bahmni.Common.Constants.containerName;
        var url = Bahmni.Common.Constants.storageUrl + $rootScope.containerNameOrId;
        $rootScope.contactURL = Bahmni.Common.Constants.contactURL;
        $rootScope.salesURL = Bahmni.Common.Constants.salesURL;

        $http.get(url)
            .then(function (response) {
                var dockerData = response.data;
                var containerName = dockerData.Name;
                var consumedSpaceStr = dockerData.StorageStats.Size;
                var consumedSpace = consumedSpaceStr.match(/(\d+)/)[0];
                $rootScope.consumedSpaceText = consumedSpaceStr;
                $rootScope.totalSpaceText = $rootScope.totalSpace + ' GB';
                $rootScope.consumedPercentage = parseFloat((consumedSpace / $rootScope.totalSpace) * 100);
            })
            .catch(function (error) {
                console.error('Error fetching data from Docker API:', error);
            });
    };
}]);
