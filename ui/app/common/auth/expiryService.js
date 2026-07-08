'use strict';

angular.module('authentication')
    .service('expiryService', ['$bahmniCookieStore', '$http', '$q', function ($bahmniCookieStore, $http, $q) {
        const COOKIE_KEY = 'expiryDate';
        var expiryFetchPromise = null;
        var licenseCheckTypePromise = null;
        this.fetchLicenseCheckType = function () {
            if (licenseCheckTypePromise) {
                return licenseCheckTypePromise;
            }

            licenseCheckTypePromise = $http.get(Bahmni.Common.Constants.globalPropertyUrl,{
                params: {
                    property: "admin.licExpType"
                },
                withCredentials: true,
                headers: {
                    Accept: "text/plain"
                }
            });
            return licenseCheckTypePromise;
        };

        this.fetchLicenseServerUrl = function () {
            return $http.get(Bahmni.Common.Constants.globalPropertyUrl, {
                params: {
                    property: 'admin.licenseUrl'
                },
                withCredentials: true,
                headers: {
                    Accept: 'text/plain'
                }
            });
        };

        this.fetchImplementationDetails = function () {
            return $http.get(Bahmni.Common.Constants.implementationId).then(function (response) {
                return response.data;
            });
        };
        
        this.getDaysRemaining = function (expiry) {
            if (!expiry) {
                return -1;
            }
        
            var today = new Date();
            today.setHours(0, 0, 0, 0);
        
            var expiryDate = new Date(expiry);
            expiryDate.setHours(0, 0, 0, 0);
        
            return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        };
        
        this.isExpiringSoon = function (expiry) {
            var days = this.getDaysRemaining(expiry);
            return days >= 0 && days <= 10;
        };
        
        this.hasFetchedExpiry = function () {
            return expiryFetchPromise !== null;
        };
        
        this.fetchLatestExpiry = function () {
        
            if (expiryFetchPromise) {
                return expiryFetchPromise;
            }
        
            var this = this;
        
            expiryFetchPromise = this.fetchImplementationDetails()
                .then(function (implementation) {
        
                    return this.fetchLicenseServerUrl()
                        .then(function (serverUrlResponse) {
        
                            var serverUrl = Bahmni.Common.Constants.hostURL;
        
                            if (serverUrlResponse) {
                                serverUrl = serverUrlResponse.data;
                              }
        
                                    return this.fetchAndStoreExpiry(
                                implementation.name,
                                implementation.implementationId,
                                serverUrl
                            );
                        });
                });
        
            return expiryFetchPromise;
        };
        
        this.fetchAndStoreExpiry = function (name, implementationId, serverUrl) {
            return $http.get(serverUrl + Bahmni.Common.Constants.fetchExpiryDate,
                { params: {
                    hospitalName: name,
                    implementationId: implementationId
                }}).then(function (response) {
                    const expiryDate = new Date(response.data.validityEndDate);
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
