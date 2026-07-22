'use strict';

angular.module('bahmni.clinical')
    .controller('ShareDialogController', ['$scope', '$rootScope', function ($scope, $rootScope) {
        $scope.share = {
            whatsapp: false,
            email: false
        };

        $scope.mobile = $scope.ngDialogData.mobile || "";
        $scope.email = $scope.ngDialogData.email || "";
        $scope.send = function () {
            if (!$scope.share.whatsapp && !$scope.share.email) {
                return;
            }

            if ($scope.share.whatsapp && !$scope.mobile) {
                alert("Please enter a mobile number.");
                return;
            }

            if ($scope.share.email && !$scope.email) {
                alert("Please enter an email address.");
                return;
            }
            $rootScope.$broadcast("event:shareVisitTab", {
                shareByWhatsapp: $scope.share.whatsapp,
                shareByEmail: $scope.share.email,
                phoneNumber: $scope.mobile,
                email: $scope.email
            });

            $scope.closeThisDialog();
        };
    }]);
