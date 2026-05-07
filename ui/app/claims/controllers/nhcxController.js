'use strict';

angular.module('bahmni.claims')
    .controller('NhcxController', ['$scope', '$state', 'appService', function ($scope, $state, appService) {
        $scope.appExtensions = appService.getAppDescriptor().getExtensions($state.current.data.extensionPointId, "link") || [];

        init();

        var init = function () {
            if ($stateParams.patient !== null && $stateParams.patient !== undefined) {
                $scope.patientUuid = $stateParams.patient.uuid;
            }
            var urlParams = $location.$$search;
            if (urlParams !== undefined && urlParams.patientUuid != null) {
                $scope.patientUuid = urlParams.patientUuid;
            }
        };
    }]);
