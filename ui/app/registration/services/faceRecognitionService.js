'use strict';

angular.module('bahmni.registration')
    .service('faceRecognitionService', ['$http', 'appService', function ($http, appService) {
        var getServerUrl = function () {
            return Bahmni.Registration.Constants.faceRecognitionServerUrl;
        };

        var toBase64Payload = function (imageDataUrlOrBase64) {
            if (imageDataUrlOrBase64 && imageDataUrlOrBase64.indexOf('base64,') >= 0) {
                return imageDataUrlOrBase64.split('base64,')[1];
            }
            return imageDataUrlOrBase64;
        };

        this.health = function () {
            return $http.get(getServerUrl() + '/health', { timeout: 7000 });
        };

        this.identify = function (imageDataUrlOrBase64) {
            return $http.post(getServerUrl() + '/process_frame', {
                image: toBase64Payload(imageDataUrlOrBase64),
                action: 'identify'
            }, { timeout: 60000 });
        };

        this.register = function (name, location, uuid, imageDataUrlOrBase64) {
            return $http.post(getServerUrl() + '/process_frame', {
                name: name,
                location: location || 'Unknown',
                uuid: uuid,
                image: toBase64Payload(imageDataUrlOrBase64),
                action: 'register'
            }, { timeout: 60000 });
        };
    }]);
