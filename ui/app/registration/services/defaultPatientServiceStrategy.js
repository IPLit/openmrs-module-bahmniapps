'use strict';

angular.module('bahmni.registration')
    .service('patientServiceStrategy', ['$http', '$q', '$rootScope', function ($http, $q, $rootScope) {
        var openmrsUrl = Bahmni.Registration.Constants.openmrsUrl;
        var baseOpenMRSRESTURL = Bahmni.Registration.Constants.baseOpenMRSRESTURL;

        var searchByQueryId = function (config) {
            var defer = $q.defer();
            var params = {};
            var patientSearchUrl = Bahmni.Common.Constants.sqlUrl + "?q=emrapi.sqlSearch.patientsByIdentifierSource";
            if (config && config.params.identifier) {
                params.identifier = config.params.identifier;
            }
            if (config && config.params.q) {
                params.name = config.params.q;
            }
            if (config && config.params.customAttribute) {
                params.customAttribute = config.params.customAttribute;
            }
            if (config && config.params.loginLocationUuid) {
                params.identifiersourcelocation = config.params.loginLocationUuid;
                params.location_uuid = config.params.loginLocationUuid;
            }
            if (config && config.params.startIndex !== undefined) {
                params.offset = config.params.startIndex;
            }
            var onResults = function (response) {
                var data = {};
                data.pageOfResults = response || [];
                defer.resolve(data);
            };
            $http.get(patientSearchUrl, {withCredentials: true, params: params}).success(onResults)
                .error(function (error) {
                    defer.reject(error);
                });
            return defer.promise;
        };

        var search = function (config) {
            if (config && config.params.regSearchByGPSql) {
                return searchByQueryId(config);
            }
            var defer = $q.defer();
            var patientSearchUrl = Bahmni.Common.Constants.bahmniCommonsSearchUrl + "/patient";
            if (config && config.params.identifier) {
                patientSearchUrl = Bahmni.Common.Constants.bahmniCommonsSearchUrl + "/patient/lucene";
            }
            var onResults = function (result) {
                defer.resolve(result);
            };
            $http.get(patientSearchUrl, config).success(onResults)
                .error(function (error) {
                    defer.reject(error);
                });
            return defer.promise;
        };

        var getByUuid = function (uuid) {
            var url = openmrsUrl + "/ws/rest/v1/patientprofile/" + uuid;
            var config = {
                method: "GET",
                params: {v: "full"},
                withCredentials: true
            };

            var defer = $q.defer();
            $http.get(url, config).success(function (result) {
                defer.resolve(result);
            });
            return defer.promise;
        };

        var create = function (patient, jumpAccepted) {
            var data = new Bahmni.Registration.CreatePatientRequestMapper(moment()).mapFromPatient($rootScope.patientConfiguration.attributeTypes, patient);
            data.patient.identifiers[0].location = $rootScope.loggedInLocation.uuid; // IPLit
            var url = baseOpenMRSRESTURL + "/bahmnicore/patientprofile";
            return $http.post(url, data, {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json", "Jump-Accepted": jumpAccepted}
            });
        };

        var update = function (patient, openMRSPatient, attributeTypes) {
            var deferred = $q.defer();
            var data = new Bahmni.Registration.UpdatePatientRequestMapper(moment()).mapFromPatient(attributeTypes, openMRSPatient, patient);
            var url = baseOpenMRSRESTURL + "/bahmnicore/patientprofile/" + openMRSPatient.uuid;
            var config = {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json"}
            };
            $http.post(url, data, config).then(function (result) {
                deferred.resolve(result);
            }, function (reason) {
                deferred.resolve(reason);
            });
            return deferred.promise;
        };

        var generateIdentifier = function (patient) {
            var data = {"identifierSourceName": patient.identifierPrefix ? patient.identifierPrefix.prefix : ""};
            var url = openmrsUrl + "/ws/rest/v1/idgen";
            var config = {
                withCredentials: true,
                headers: {"Accept": "text/plain", "Content-Type": "application/json"}
            };
            return $http.post(url, data, config);
        };

        return {
            search: search,
            get: getByUuid,
            create: create,
            update: update,
            generateIdentifier: generateIdentifier,
            searchByQueryId: searchByQueryId
        };
    }]);
