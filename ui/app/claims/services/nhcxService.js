'use strict';

/**
 * nhcxService.js  —  Bahmni AngularJS service
 *
 * Calls the standalone nhcx-service Docker container instead of OpenMRS REST.
 *
 * The nhcx-service runs on port 8085. In a production Bahmni setup, route
 * it through your Nginx proxy so the frontend calls a relative path:
 *
 *   /nhcx/* → http://nhcx-service:8085/nhcx/*
 *
 * Add to nginx.conf inside the Bahmni proxy config (see README for the full block).
 */
angular.module('bahmni.claims')

.factory('nhcxService', ['$http', '$q', function($http, $q) {

    // After adding the Nginx proxy block, this becomes just '/nhcx'
    var BASE_URL = '/nhcx';

    function post(path, params) {
        return $http.post(BASE_URL + path, params)
            .then(function(response) { return response; },
                  function(error) {
                      console.error('NHCX error [' + path + ']:', error.data);
                      return $q.reject(error);
                  });
    }

    return {

        /**
         * Submit preauthorization at admission.
         * @param {Object} params - { patientUuid, visitUuid, abhaId, policyNumber, payerCode, payerName }
         * @returns {Promise<{correlationId, status}>}
         */
        submitPreauth: function(params) {
            return post('/preauth', params);
        },

        /**
         * Submit predetermination (cost estimate) before admission.
         */
        submitPredetermination: function(params) {
            return post('/predetermination', params);
        },

        /**
         * Submit final claim at discharge.
         */
        submitClaim: function(params) {
            return post('/claim', params);
        },

        /**
         * Poll claim status using correlation ID.
         * @param {string} correlationId - from submitPreauth or submitClaim
         */
        getStatus: function(correlationId) {
            return $http.get(BASE_URL + '/status', {
                params: { correlationId: correlationId }
            });
        },

        /**
         * Preview ClaimBundle JSON without submitting.
         * Returns the raw FHIR Bundle for inspection.
         */
        previewBundle: function(params) {
            return post('/preview', params);
        }
    };
}]);