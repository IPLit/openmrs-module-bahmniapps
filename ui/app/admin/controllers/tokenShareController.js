'use strict';

angular.module('bahmni.admin')
    .controller('TokenShareController', ['$scope', '$http', '$window', 'appService', function ($scope, $http, $window, appService) {
        $scope.phoneNumber = '';
        $scope.generateAndShare = function () {
            if (!$scope.phoneNumber) {
                alert("Please enter phone number");
                return;
            }

            $http.post('/openmrs/ws/patientportal/generate-token?programUuid=' + $scope.programUuid)
                .then(function (response) {
                    const token = response.data.token;
                    const tokenLink = Bahmni.Common.Constants.patientPortalUrl + token;
                    const message = encodeURIComponent(
                        "Please use the below link to register:\n\n" + tokenLink
                    );
                    const whatsappUrl = "https://wa.me/" +
                        $scope.phoneNumber +
                        "?text=" + message;
                    $window.open(whatsappUrl, '_blank');
                }).catch(function () {
                    alert("Unable to generate token");
                });
        };

        function init () {
            var programName = appService.getAppDescriptor().getConfigValue("programName");
            $http.get('/openmrs/ws/rest/v1/program?q=' + programName)
                .then(function (response) {
                    if (response.data.results.length > 0) {
                        $scope.programUuid = response.data.results[0].uuid;
                    } else {
                    // Not found
                    }
                })
                .catch(function () {
                });
        }

        init();
    }]);
