'use strict';

angular.module('bahmni.handnotes')
    .controller('HandNotesController', ['$scope', '$stateParams', 'visitService', 'patientService', 'encounterService',
        'spinner', 'visitDocumentService', '$rootScope', '$http', '$q', '$timeout', 'sessionService', '$anchorScroll',
        '$translate', 'messagingService', 'observationsService', 'ngDialog',
        function ($scope, $stateParams, visitService, patientService, encounterService, spinner, visitDocumentService,
                  $rootScope, $http, $q, $timeout, sessionService, $anchorScroll, $translate, messagingService, observationsService, ngDialog) {
            var encounterTypeUuid;
            var topLevelConceptUuid;
            var customVisitParams = Bahmni.HandNotes.Constants.visitRepresentation;
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var patientMapper = new Bahmni.PatientMapper($rootScope.patientConfig, $rootScope, $translate);
            var activeEncounter = {};
            var locationUuid = sessionService.getLoginLocationUuid();

            $scope.visits = [];
            $scope.fileTypeConcepts = [];
            $scope.toggleGallery = true;
            $scope.conceptNameInvalid = false;

            var setOrientationWarning = function () {
                $scope.orientation_warning = (window.orientation && (window.orientation < 0 || window.orientation > 90));
            };
            setOrientationWarning();
            var onOrientationChange = function () {
                $scope.$apply(setOrientationWarning);
            };
            window.addEventListener('orientationchange', onOrientationChange);
            $scope.$on('$destroy', function () {
                window.removeEventListener('orientationchange', onOrientationChange);
            });

            var initNewVisit = function () {
                $scope.newVisit = new Bahmni.HandNotes.Visit();
                $scope.currentVisit = $scope.newVisit;
            };

            var createVisit = function (visit) {
                return angular.extend(new Bahmni.HandNotes.Visit(), visit);
            };

            var getVisitTypes = function () {
                return visitService.getVisitType().then(function (response) {
                    $scope.visitTypes = response.data.results;
                });
            };

            var getHandNotes = function () {
                return observationsService.fetch($rootScope.patient.uuid, "Hand Note").then(function (response) {
                    console.log(response);
                    var handNotesObs = new Bahmni.Common.Obs.ObservationMapper().map(response.data, []);
                    $scope.bahmniObservations = new Bahmni.Common.DisplayControl.Observation.GroupingFunctions().groupByEncounterDate(handNotesObs);
                });
            };

            var getPatient = function () {
                return patientService.getPatient($stateParams.patientUuid).success(function (openMRSPatient) {
                    $rootScope.patient = patientMapper.map(openMRSPatient);
                    $scope.patient = $rootScope.patient;
                    $scope.hostData = { patient: $scope.patient };
                });
            };

            var getVisitStartStopDateTime = function (visit) {
                return {
                    "startDatetime": DateUtil.getDate(visit.startDatetime),
                    "stopDatetime": DateUtil.getDate(visit.stopDatetime)
                };
            };

            $scope.createNew = function () {
                ngDialog.open({
                    template: './views/scribblePad.html',
                    className: 'ngdialog-theme-default',
                    height: "100%",
                    width: "100%",
                    scope: $scope,
                    data: {
                        hostData: $scope.hostData
                    },
                    preCloseCallback: function (value) {
                        if (confirm('Are you sure you want to close?')) {
                            return true;
                        }
                        return false;
                    }

                });
            };

            var init = function () {
//                encounterTypeUuid = $scope.encounterConfig.getEncounterTypeUuid($rootScope.appConfig.encounterType);
//                initNewVisit();
                var deferrables = $q.defer();
                var promises = [];
                promises.push(getPatient().then(getHandNotes));
                $q.all(promises).then(function () {
                    deferrables.resolve();
                });
                return deferrables.promise;
            };
            spinner.forPromise(init());

            $anchorScroll();
        }
    ]);
