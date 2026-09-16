'use strict';

angular.module('bahmni.claims').factory('nhcxService', ['$http', '$q', function ($http, $q) {
    var BASE_URL = '/nhcx-provider/nhcx';

    function handleError (method, path, error) {
        console.error('NHCX ' + method + ' error [' + path + ']:', error.data);
        return $q.reject(error);
    }

    function post (path, params) {
        return $http.post(BASE_URL + path, params).catch(function (error) {
            return handleError('POST', path, error);
        });
    }

    function get (path, params) {
        return $http.get(BASE_URL + path, {
            params: params || {}
        }).catch(function (error) {
            return handleError('GET', path, error);
        });
    }

    function upload (path, file, params) {
        var formData = new FormData();
        formData.append('file', file);
        return $http.post(BASE_URL + path, formData,
            {
                params: params || {},
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            }
        ).catch(function (error) {
            return handleError('UPLOAD', path, error);
        });
    }

    return {
        submitPreauth: function (params) {
            return post('/preauth', params);
        },

        submitCoverageEligibility: function (params) {
            return post('/coverage_eligibility', params);
        },

        submitClaim: function (params) {
            return post('/claim', params);
        },

        getStatus: function (correlationId) {
            return get('/status', {
                correlationId: correlationId
            });
        },

        getPatientClaims: function (patientUuid) {
            return get('/patient/' + patientUuid);
        },

        previewBundle: function (params) {
            return post('/preview', params);
        },

        getClaimCommunications: function (claimTrackingId) {
            return get('/communication/claim/' + claimTrackingId);
        },

        uploadCommunicationDocument: function (communicationId, requestedDocumentId, file) {
            var params = {};

            if (requestedDocumentId) {
                params.requestedDocumentId = requestedDocumentId;
            }

            return upload('/communication/' + communicationId + '/documents', file, params);
        },

        respondToCommunication: function (communicationId, request) {
            return post('/communication/' + communicationId + '/respond', request);
        },

        sendCommunication: function (request) {
            return post('/communication', request);
        }
    };
}]);
