'use strict';

angular.module('bahmni.claims').factory('pmjayService', ['$http', function ($http) {
    var baseUrl = '/nhcx-provider/nhcx';

    var multipart = function (url, request, files) {
        var form = new FormData();
        form.append('request', new Blob([angular.toJson(request)], { type: 'application/json' }));
        angular.forEach(files || [], function (file) {
            form.append('documents', file);
        });
        return $http.post(baseUrl + url, form,
            { transformRequest: angular.identity, headers: { 'Content-Type': undefined }
            });
    };

    return {
        requestInsurancePlans: function (request) {
            return $http.post(baseUrl + '/insurance-plans/request', request);
        },
        insurancePlanResult: function (correlationId) {
            return $http.get(baseUrl + '/insurance-plans/' + correlationId);
        },
        packages: function (query, specialtyCode) {
            return $http.get(baseUrl + '/pmjay/packages', {params: {q: query || '', specialtyCode: specialtyCode || undefined}});
        },
        coverage: function (patientUuid) {
            return $http.get(baseUrl + '/pmjay/coverage/' + patientUuid);
        },
        preauthorize: function (request, files) {
            return multipart('/preauth', request, files);
        },
        enhance: function (request, files) {
            return multipart('/preauth/enhancement', request, files);
        },
        submitClaim: function (request, files) {
            return multipart('/claim', request, files);
        },
        tracking: function (correlationId) {
            return $http.get(baseUrl + '/claim/' + correlationId);
        },
        biometricInit: function (request) {
            return $http.post(baseUrl + '/pmjay/biometric/init', request);
        },
        biometricVerify: function (request) {
            return $http.post(baseUrl + '/pmjay/biometric/verify', request);
        },
        facePidStatus: function (transactionId) {
            return $http.post(baseUrl + '/pmjay/biometric/' + transactionId + '/face-pid');
        },
        biometricStatus: function (id) {
            return $http.get(baseUrl + '/pmjay/biometric/' + id);
        },
        uploadBiometricExemption: function (data, file) {
            var form = new FormData();
            angular.forEach(data, function (value, key) { form.append(key, value); });
            form.append('document', file);
            return $http.post(baseUrl + '/pmjay/biometric/exemptions', form,
                {transformRequest: angular.identity, headers: {'Content-Type': undefined}});
        }
    };
}]);
