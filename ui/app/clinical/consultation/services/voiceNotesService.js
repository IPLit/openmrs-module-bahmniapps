'use strict';

angular.module('bahmni.clinical')
    .service('voiceNotesService', ['$http', '$rootScope', 'messagingService', function ($http, $rootScope, messagingService) {
        this.transcribe = function (body) {
            var url = Bahmni.Common.Constants.aiVoiceNotesApi + "/transcribe";
            return $http.post(url, body).then(function (response) {
                $rootScope.$broadcast('aiEncounterGenerated', response.data);
                messagingService.showMessage("info", "The Voice Notes is processed. Please review before Saving");
            }, function (error) {
                console.error("Transcribe Failed", error);
            });
        };
    }]);
