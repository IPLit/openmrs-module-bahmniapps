'use strict';

angular.module('authentication')
    .service('expiryService', ['$bahmniCookieStore', '$http', '$q', function ($bahmniCookieStore, $http, $q) {
        const COOKIE_KEY = 'expiryDate';

        this.fetchAndStoreExpiry = function (hospitalName, implementationId) {
          return $http.get(Bahmni.Common.Constants.fetchExpiryDate,
            { params:
              { hospitalName: hospitalName, implementationId: implementationId }
            }).then(function (response) {
              var expiryDateString = response.data.validityEndDate;
              const [day, month, year] = expiryDateString.split('-');
              const isoString = `${year}-${month}-${day}`;
              const expiryDate = new Date(isoString);
              $bahmniCookieStore.put(COOKIE_KEY, expiryDate.toISOString());
              return expiryDate;
            });
        };

        this.getStoredExpiry = function () {
          const stored = $bahmniCookieStore.get(COOKIE_KEY);
          return stored ? new Date(stored) : null;
        };

        this.isExpired = function (expiry) {
            return !expiry || new Date() > expiry;
        };
    }]);
