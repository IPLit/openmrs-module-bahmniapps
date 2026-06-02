'use strict';

angular.module('bahmni.claims')
    .controller('NhcxController', ['$scope', '$state', '$stateParams', '$location', 'appService', 'nhcxService', 'patientService', 'visitService', function ($scope, $state, $stateParams, $location, appService, nhcxService, patientService, visitService) {
        $scope.appExtensions = appService.getAppDescriptor().getExtensions($state.current.data.extensionPointId, "link") || [];
        $scope.visits = [];
        $scope.claimRequest = {
            items: []
        };
        var getPatient = function () {
            return patientService.getPatient($stateParams.patientUuid).then(function (patientResponse) {
                $scope.patient = patientResponse.data;
            });
        };
        var getVisits = function () {
            return visitService.search({patient: $scope.patient.uuid, v: "custom:(uuid,startDatetime,stopDatetime,visitType)",
                includeInactive: true}).then(function (visitResponse) {
                    $scope.visits = visitResponse.data.results;
                });
        };

        var init = function () {
            if ($stateParams.patient !== null && $stateParams.patient !== undefined) {
                $scope.patientUuid = $stateParams.patient.uuid;
                $scope.patient = $stateParams.patient;
                getVisits();
            }
            var urlParams = $location.$$search;
            if (urlParams !== undefined && urlParams.patientUuid != null) {
                $scope.patientUuid = urlParams.patientUuid;
            }

            if ($scope.patient === undefined) {
                getPatient().then(getVisits);
            }
        };
        init();

        $scope.preAuth = function (patient) {
            return nhcxService.submitPreauth({patientUuid: patient.uuid, visitUuid: $scope.selectedVisitUuid});
        };

        $scope.addBillItem = function () {
            $scope.claimRequest.items.push({
                serviceCode: '',
                serviceDisplay: '',
                unitPrice: 0,
                quantity: 1,
                net: 0
            });
        };

        $scope.removeBillItem = function (index) {
            $scope.claimRequest.items.splice(index, 1);
        };

        $scope.getTotalAmount = function () {
            var total = 0;
            angular.forEach($scope.claimRequest.items, function (item) {
                total += Number(item.net || 0);
            });
            return total.toFixed(2);
        };

        $scope.submitPredetermination = function () {
            $scope.claimRequest.patientUuid = $scope.patientUuid;
            $scope.claimRequest.visitUuid = $scope.selectedVisitUuid;
            nhcxService.submitPredetermination($scope.claimRequest).then(function (response) {
//                Bahmni.Common.UI.Notification.success('Predetermination submitted successfully');
                $scope.response = response.data;
            });
        };

        $scope.submitClaim = function () {
            $scope.claimRequest.patientUuid = $scope.patientUuid;
            $scope.claimRequest.visitUuid = $scope.selectedVisitUuid;
            nhcxService.submitClaim($scope.claimRequest).then(function (response) {
//                Bahmni.Common.UI.Notification.success('Claim submitted successfully');
                $scope.response = response.data;
            });
        };

        $scope.getPatientAttribute = function (attributeName, defaultValue) {
            defaultValue = defaultValue || '-';

            if (!$scope.patient ||
                !$scope.patient.person ||
                !$scope.patient.person.attributes) {
                return defaultValue;
            }

            var attributes = $scope.patient.person.attributes;

            var attribute = attributes.find(function (attr) {
                return attr.attributeType &&
                    attr.attributeType.display === attributeName &&
                    !attr.voided;
            });

            if (!attribute || attribute.value === null || attribute.value === undefined) {
                return defaultValue;
            }

            if (angular.isObject(attribute.value)) {
                return attribute.value.display || defaultValue;
            }

            return attribute.value;
        };

        $scope.getCombinedAttributes = function (attributeNames, separator) {
            separator = separator || ' - ';

            return attributeNames
                .map(function (name) {
                    return $scope.getPatientAttribute(name, '');
                })
                .filter(function (value) {
                    return value && value.trim() !== '';
                })
                .join(separator) || '-';
        };

        $scope.getPatientName = function () {
            if (!$scope.patient) {
                return '-';
            }

            if ($scope.patient.givenName || $scope.patient.familyName) {
                return (($scope.patient.givenName || '') + ' ' +
                        ($scope.patient.familyName || '')).trim();
            }

            if ($scope.patient.person && $scope.patient.person.preferredName) {
                var name = $scope.patient.person.preferredName;
                return ((name.givenName || '') + ' ' +
                        (name.familyName || '')).trim();
            }

            return '-';
        };

        $scope.getPatientIdentifier = function () {
            if (!$scope.patient) {
                return '-';
            }

            if ($scope.patient.identifier) {
                return $scope.patient.identifier;
            }

            if ($scope.patient.identifiers && $scope.patient.identifiers.length > 0) {
                var preferred = $scope.patient.identifiers.find(function (id) {
                    return id.preferred;
                });

                return preferred
                    ? preferred.identifier
                    : $scope.patient.identifiers[0].identifier;
            }

            return '-';
        };
    }]);
