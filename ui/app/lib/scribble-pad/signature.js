/*
 * https://github.com/legalthings/signature-pad-angular
 * Copyright (c) 2015 ; Licensed MIT
 */

angular.module('signature', []);

angular.module('signature').directive('signaturePad', ['$interval', '$timeout', '$window', 'visitDocumentService', 'messagingService','ngDialog','encounterService','sessionService','spinner','observationsService', 'conceptSetService','conceptSetUiConfigService','$rootScope',
  function ($interval, $timeout, $window, visitDocumentService, messagingService,ngDialog,encounterService,sessionService,spinner,observationsService,conceptSetService,conceptSetUiConfigService,$rootScope) {
    'use strict';

    var signaturePad, element, EMPTY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAjgAAADcCAQAAADXNhPAAAACIklEQVR42u3UIQEAAAzDsM+/6UsYG0okFDQHMBIJAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMBzAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcCQADAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMB8BwAMMBDAfAcADDATAcwHAAwwEwHMBwAAwHMBzAcAAMBzAcAMMBDAcwHADDAQwHwHAAwwEMB8BwAMMBMBzAcADDkQAwHMBwAAwHMBwAwwEMBzAcAMMBDAfAcADDAQwHwHAAwwEwHMBwAMMBMBzAcAAMBzAcwHAADAcwHADDAQwHMBwAwwEMB8BwAMMBMBzAcADDATAcwHAADAcwHMBwAAwHMBwAwwEMBzAcAMMBDAegeayZAN3dLgwnAAAAAElFTkSuQmCC';   
    return {
      restrict: 'E',
      replace: true,
      template: '<div class="signature" style="width: 100%; max-width:{{width}}px; height: 100%; max-height:{{height}}px;"><canvas style="display: block; margin: 0 auto;" ng-mouseup="onMouseup()" ng-mousedown="notifyDrawing({ drawing: true })"></canvas></div>',
      scope: {
        accept: '=?',
        clear: '=?',
        disabled: '=?',
        dataurl: '=?',
        height: '@',
        width: '@',
        notifyDrawing: '&onDrawing',  
        currentScope:'=',      
        },
      controller: [  '$scope',     
        function ($scope) {
          $scope.accept = function () {           
           // $scope.activeVisit = $scope.visitHistory.activeVisit;
            //console.log("activeVisit", activeVisit);
            // visitHistory = sessionStorage.getItem("visit");
            // console.log("activeVisit", activeVisit);History and Examinations,All Observation Templates
            $scope.opdSummaryConceptName = "Hand Note";                       
            var visit = JSON.parse(sessionStorage["visit"]); //Get from
            console.log("visit data",visit)      
            //console.log("Saving Image ", JSON.parse (sessionStorage.getItem("visit")));
            if ($scope.dataurl !== undefined || $scope.dataurl !== EMPTY_IMAGE) {
              var locationUuid = sessionService.getLoginLocationUuid();
              var observationMapper = new Bahmni.ConceptSet.ObservationMapper();
              var conceptsConfig = conceptSetUiConfigService.getConfig();
              var providerUuid = $rootScope.currentProvider.uuid;
              var observations = [];
              var obsOpdSummary = null;
              var obsOpdSummarynew= null;
              var obsSummary= null;
              var patientUuid = sessionStorage.getItem("patient.uuid");
              var template = null;
              var fileName = "notes_" + Date.now();
             // var visit = sessionStorage.getItem("visit");
              //console.log("activeVisit", visit);
              visitDocumentService.saveFile($scope.dataurl, sessionStorage.getItem("patient.uuid"), "Consultation", "notes_" + Date.now() , "image").then(function (response) {
                var fileUrl = Bahmni.Common.Constants.documentsPath + '/' + response.data.url;
                //var savedFile = visit.addFile(fileUrl); 
                var imagename = response.data.url;             
                console.log(response.data.url);
                console.log(visit["uuid"]);
                console.log(patientUuid);
                console.log($scope.opdSummaryConceptName);               
                spinner.forPromise(observationsService.fetch(patientUuid, $scope.opdSummaryConceptName,
                  'latest', 1, visit["uuid"],
                  null, null))
                  .then(function (result) {
                      var obsArray = [];
                      console.log("result.data", result.data);
                      if(result.data.length > 0) {
                          _.each(result.data, function (obs) {
                              var matched = _.find(obs.providers, {uuid: providerUuid});
                              if (matched) {
                                  obsArray.push(obs);
                              }
                          });
                          $scope.openmrsOpdSummaryObs = new Bahmni.Common.Obs.ObservationMapper().map(obsArray, conceptsConfig);
                      }
                      spinner.forPromise(conceptSetService.getConcept({
                          name: $scope.opdSummaryConceptName,
                          v: "bahmni"
                      }).then(function (cResponse) {
                        console.log("cResponse", cResponse);
                          template = cResponse.data.results[0];
                          console.log("result.data [0]", cResponse.data.results[0]);
                          $scope.conceptSet = template;
                         // $scope.conceptSet.conceptName = $scope.opdSummaryConceptName;
                          console.log("obsArray", obsArray);
                         // obsOpdSummary = observationMapper.map(obsArray, template, conceptsConfig);
                          obsOpdSummarynew = observationMapper.map(response.data, template, conceptsConfig);
                          console.log("obsOpdSummarynew", obsOpdSummarynew);
                         
                          var groupmember={} ;   
                          var conscept = {"uuid":"2636ad6a-cd11-4edf-876f-adb40277acc3","name":"Image Note"};
                          groupmember.conscept = conscept;
                          groupmember = obsOpdSummarynew.groupMembers[0];
                          groupmember.value = imagename;
                          groupmember.valueAsString=imagename;
                          obsOpdSummarynew.groupMembers[0]=groupmember;
                          obsOpdSummarynew.value = imagename;
                          
                          console.log("obsOpdSummarynew after groupmember ", obsOpdSummarynew);                                            
                         
                          $scope.conceptSet.observations = [obsOpdSummary];                           
                          
                          $rootScope.$emit('pushObservation',obsOpdSummarynew);
                          //$scope.currentScope.consultation.observations.push(observations[0]);                          
                          //encounterService.create(getEncounterDataFor(observations));
                  }));
              });

              var getEncounterDataFor = function (obs) {
                var encounterData = {};
                encounterData.patientUuid = patientUuid;
                //encounterData.encounterTypeUuid =  $rootScope.encounterConfig.getConsultationEncounterTypeUuid();
                encounterData.visitTypeUuid = visit["uuid"];
                encounterData.observations = obs,
                encounterData.locationUuid = locationUuid;
                return encounterData;
            };

              //  encounterService.create(encounterData);
                ngDialog.close();
              });
            }
            else {
              messagingService.showMessage('error', "Can't save empty image");
            }

            // return {
            //   isEmpty: $scope.dataurl === EMPTY_IMAGE,
            //   dataUrl: $scope.dataurl
            // };

            
          };         

          $scope.onMouseup = function () {
            $scope.updateModel();

            // notify that drawing has ended
            $scope.notifyDrawing({ drawing: false });
          };

          $scope.checkStatus = function () {
            return $scope.dataurl === EMPTY_IMAGE;
          };

          $scope.updateModel = function () {
            /*
             defer handling mouseup event until $scope.signaturePad handles
             first the same event
             */
            $timeout().then(function () {
              $scope.dataurl = $scope.signaturePad.isEmpty() ? EMPTY_IMAGE : $scope.signaturePad.toDataURL();
            });
          };

          $scope.clear = function () {
            $scope.signaturePad.clear();
            $scope.dataurl = EMPTY_IMAGE;
          };

          $scope.$watch("dataurl", function (dataUrl) {
            if (!dataUrl || $scope.signaturePad.toDataURL() === dataUrl) {
              return;
            }

            $scope.setDataUrl(dataUrl);
          });
        }
      ],
      link: function (scope, element, attrs) {
        var canvas = element.find('canvas')[0];
        var parent = canvas.parentElement;
        var scale = 0;
        var ctx = canvas.getContext('2d');

        var width = parseInt(scope.width, 10);
        var height = parseInt(scope.height, 10);

        canvas.width = width;
        canvas.height = height;

        scope.signaturePad = new SignaturePad(canvas);

        scope.setDataUrl = function (dataUrl) {
          var ratio = Math.max(window.devicePixelRatio || 1, 1);

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(ratio, ratio);

          scope.signaturePad.clear();
          scope.signaturePad.fromDataURL(dataUrl);

          $timeout().then(function () {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(1 / scale, 1 / scale);
          });
        };

        scope.$watch('disabled', function (val) {
          val ? scope.signaturePad.off() : scope.signaturePad.on();
        });

        var calculateScale = function () {
          var scaleWidth = Math.min(parent.clientWidth / width, 1);
          var scaleHeight = Math.min(parent.clientHeight / height, 1);

          var newScale = Math.min(scaleWidth, scaleHeight);

          if (newScale === scale) {
            return;
          }

          var newWidth = width * newScale;
          var newHeight = height * newScale;
          canvas.style.height = Math.round(newHeight) + "px";
          canvas.style.width = Math.round(newWidth) + "px";

          scale = newScale;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(1 / scale, 1 / scale);
        };

        var resizeIH = $interval(calculateScale, 200);
        scope.$on('$destroy', function () {
          $interval.cancel(resizeIH);
          resizeIH = null;
        });

        angular.element($window).bind('resize', calculateScale);
        scope.$on('$destroy', function () {
          angular.element($window).unbind('resize', calculateScale);
        });

        calculateScale();

        element.on('touchstart', onTouchstart);
        element.on('touchend', onTouchend);

        function onTouchstart(event) {
          scope.$apply(function () {
            // notify that drawing has started
            scope.notifyDrawing({ drawing: true });
          });
          event.preventDefault();
        }

        function onTouchend(event) {
          scope.$apply(function () {
            // updateModel
            scope.updateModel();

            // notify that drawing has ended
            scope.notifyDrawing({ drawing: false });
          });
          event.preventDefault();
        }       
      }
    };
  }
]);

// Backward compatibility
angular.module('ngSignaturePad', ['signature']);
