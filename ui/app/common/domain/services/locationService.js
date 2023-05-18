'use strict';

angular.module('bahmni.common.domain')
    .factory('locationService', ['$http', '$bahmniCookieStore', 'appService', function ($http, $bahmniCookieStore, appService) {
        var getAllByTag = function (tags, operator) {
            var userInSession = $bahmniCookieStore.get(Bahmni.Common.Constants.currentUser);
            var restrictLoginLocationToUser = appService.getAppDescriptor().getConfigValue('restrictLoginLocationToUser') || false;
            if (userInSession && restrictLoginLocationToUser) {
                return getLoginUserLocations(tags);
            }
            return $http.get(Bahmni.Common.Constants.locationUrl, {
                params: {s: "byTags", tags: tags || "", v: "default", operator: operator || "ALL"},
                cache: true
            });
        };

        var getByUuid = function (locationUuid) {
            return $http.get(Bahmni.Common.Constants.locationUrl + "/" + locationUuid, {
                cache: true
            }).then(function (response) {
                return response.data;
            });
        };

        var getLoggedInLocation = function () {
            var cookie = $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName);
            return getByUuid(cookie.uuid);
        };

        var getVisitLocation = function (locationUuid) {
            return $http.get(Bahmni.Common.Constants.bahmniVisitLocationUrl + "/" + locationUuid, {
                headers: {"Accept": "application/json"}
            });
        };

        var getFacilityVisitLocation = function () {
            var cookie = $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName);
            return $http.get(Bahmni.Common.Constants.bahmniFacilityLocationUrl + "/" + cookie.uuid, {
                cache: true
            }).then(function (response) {
                return response.data;
            });
        };

        var getLoginUserLocations = function (byTag) {
            return $http.get(Bahmni.Common.Constants.distroUrl + "/loginUserLocations", {
                params: {byTag: byTag || ""}
            });
        };

        return {
            getAllByTag: getAllByTag,
            getLoggedInLocation: getLoggedInLocation,
            getByUuid: getByUuid,
            getVisitLocation: getVisitLocation,
            getFacilityVisitLocation: getFacilityVisitLocation
        };
    }]);
