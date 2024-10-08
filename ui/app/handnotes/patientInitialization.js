'use strict';

angular.module('bahmni.handnotes').factory('patientInitialization', ['$rootScope', '$q', 'patientService', 'initialization', 'spinner', '$translate',
    function ($rootScope, $q, patientService, initialization, spinner, $translate) {
        return function (patientUuid) {
            var getPatient = function () {
                var patientMapper = new Bahmni.PatientMapper($rootScope.patientConfig, $rootScope, $translate);
                var patientPromise = $q.defer();
                patientService.getPatient(patientUuid).then(function (response) {
                    $rootScope.patient = patientMapper.map(response.data);
                    patientPromise.resolve();
                });
                return patientPromise.promise;
            };

            return spinner.forPromise(initialization.then(getPatient));
        };
    }
]);

