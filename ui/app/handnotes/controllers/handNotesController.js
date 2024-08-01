'use strict';

angular.module('bahmni.handnotes')
    .controller('HandNotesController', ['$scope', '$stateParams', 'visitService', 'patientService', 'encounterService',
        'spinner', 'visitDocumentService', '$rootScope', '$http', '$q', '$timeout', 'sessionService', '$anchorScroll',
        '$translate', 'messagingService', 'observationsService',
        function ($scope, $stateParams, visitService, patientService, encounterService, spinner, visitDocumentService,
                  $rootScope, $http, $q, $timeout, sessionService, $anchorScroll, $translate, messagingService, observationsService) {
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
                    console.log($scope.patient);
                });
            };

            var getVisitStartStopDateTime = function (visit) {
                return {
                    "startDatetime": DateUtil.getDate(visit.startDatetime),
                    "stopDatetime": DateUtil.getDate(visit.stopDatetime)
                };
            };

            $scope.hostData = { patient: $scope.patient};

//            var isVisitInSameRange = function (newVisitWithoutTime, existingVisit) {
//                return existingVisit.startDatetime <= newVisitWithoutTime.stopDatetime && (newVisitWithoutTime.startDatetime <= existingVisit.stopDatetime || DateUtil.isInvalid(existingVisit.stopDatetime));
//            };
//
//            $scope.isNewVisitDateValid = function () {
//                var filterExistingVisitsInSameDateRange = function (existingVisit) {
//                    return !DateUtil.isInvalid(newVisitWithoutTime.startDatetime) ? isVisitInSameRange(newVisitWithoutTime, existingVisit) : false;
//                };
//                var newVisitWithoutTime = {};
//                newVisitWithoutTime.startDatetime = DateUtil.getDate($scope.newVisit.startDatetime);
//                newVisitWithoutTime.stopDatetime = $scope.newVisit.stopDatetime ? DateUtil.getDate($scope.newVisit.stopDatetime) : DateUtil.now();
//                var visitStartStopDateTime = $scope.visits.map(getVisitStartStopDateTime);
//                var existingVisitsInSameRange = visitStartStopDateTime.filter(filterExistingVisitsInSameDateRange);
//                $scope.isDateValid = existingVisitsInSameRange.length === 0;
//                return existingVisitsInSameRange.length === 0;
//            };
//
//            var getVisits = function () {
//                return visitService.search({
//                    patient: $rootScope.patient.uuid,
//                    v: customVisitParams,
//                    includeInactive: true
//                }).then(function (response) {
//                    var visits = response.data.results;
//                    if (visits.length > 0) {
//                        if (!visits[0].stopDatetime) {
//                            $scope.currentVisit = visits[0];
//                        } else {
//                            $scope.currentVisit = null;
//                        }
//                    }
//                    visits.forEach(function (visit) {
//                        $scope.visits.push(createVisit(visit));
//                    });
//                });
//            };
//
//            var getEncountersForVisits = function () {
//                return encounterService.getEncountersForEncounterType($rootScope.patient.uuid, encounterTypeUuid).success(function (encounters) {
//                    $scope.visits.forEach(function (visit) {
//                        var visitEncounters = encounters.results.filter(function (a) {
//                            return (a.visit.uuid === visit.uuid);
//                        });
//                        visit.initSavedFiles(visitEncounters);
//                    });
//                });
//            };
//
//            var getTopLevelConcept = function () {
//                if ($rootScope.appConfig.topLevelConcept === null) {
//                    topLevelConceptUuid = null;
//                    return $q.when({});
//                }
//                return $http.get(Bahmni.Common.Constants.conceptSearchByFullNameUrl, {
//                    params: {
//                        name: $rootScope.appConfig.topLevelConcept,
//                        v: "custom:(uuid,setMembers:(uuid,name:(name)))"
//                    }
//                }).then(function (response) {
//                    if (response.data.results[0].setMembers && response.data.results[0].setMembers.length > 0) {
//                        response.data.results[0].setMembers.forEach(function (concept) {
//                            var conceptToAdd = {
//                                'concept': {
//                                    uuid: concept.uuid,
//                                    name: concept.name.name,
//                                    editableName: concept.name.name
//                                }
//                            };
//                            $scope.fileTypeConcepts.push(conceptToAdd);
//                        });
//                    }
//                    var topLevelConcept = response.data.results[0];
//                    topLevelConceptUuid = topLevelConcept ? topLevelConcept.uuid : null;
//                });
//            };
//
//            var sortVisits = function () {
//                $scope.visits.sort(function (a, b) {
//                    var date1 = DateUtil.parse(a.startDatetime);
//                    var date2 = DateUtil.parse(b.startDatetime);
//                    return date2.getTime() - date1.getTime();
//                });
//            };
//
//            var getActiveEncounter = function () {
//                var currentProviderUuid = $rootScope.currentProvider ? $rootScope.currentProvider.uuid : null;
//                return encounterService.find({
//                    patientUuid: $stateParams.patientUuid,
//                    encounterTypeUuids: [encounterTypeUuid],
//                    providerUulaids: !_.isEmpty(currentProviderUuid) ? [currentProviderUuid] : null,
//                    includeAll: Bahmni.Common.Constants.includeAllObservations,
//                    locationUuid: locationUuid
//                }).then(function (encounterTransactionResponse) {
//                    activeEncounter = encounterTransactionResponse.data;
//                });
//            };

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

//            $scope.getConcepts = function (request) {
//                return $http.get(Bahmni.Common.Constants.conceptUrl, {
//                    params: {
//                        q: request.term,
//                        memberOf: topLevelConceptUuid,
//                        v: "custom:(uuid,name)"
//                    }
//                }).then(function (result) {
//                    return result.data.results;
//                });
//            };
//
//            $scope.resetCurrentVisit = function (visit) {
//                if (areVisitsSame($scope.currentVisit, visit) && areVisitsSame($scope.currentVisit, $scope.newVisit)) {
//                    $scope.currentVisit = null;
//                    return $scope.currentVisit;
//                }
//                $scope.currentVisit = ($scope.isCurrentVisit(visit)) ? $scope.newVisit : visit;
//            };
//
//            $scope.isCurrentVisit = function (visit) {
//                return $scope.currentVisit && $scope.currentVisit.uuid === visit.uuid;
//            };
//
//            var areVisitsSame = function (currentVisit, newVisit) {
//                return currentVisit == newVisit && newVisit == $scope.newVisit;
//            };
//
//            var getEncounterStartDateTime = function (visit) {
//                return visit.endDate() ? visit.startDate() : null;
//            };
//
//            var flashSuccessMessage = function () {
//                $scope.success = true;
//                $timeout(function () {
//                    $scope.success = false;
//                }, 2000);
//            };
//
//            $scope.setDefaultEndDate = function (newVisit) {
//                if (!newVisit.stopDatetime) {
//                    $scope.newVisit.stopDatetime = newVisit.endDate() ? DateUtil.parse(newVisit.endDate()) : new Date();
//                }
//            };
//
//            var isObsByCurrentProvider = function (obs) {
//                return obs.provider && $rootScope.currentUser.person.uuid === obs.provider.uuid;
//            };
//
//            var updateVisit = function (visit, encounters) {
//                var visitEncounters = encounters.filter(function (encounter) {
//                    return visit.uuid === encounter.visit.uuid;
//                });
//                visit.initSavedFiles(visitEncounters);
//                visit.changed = false;
//                $scope.currentVisit = visit;
//                sortVisits();
//                flashSuccessMessage();
//            };
//
//            var isExistingVisit = function (visit) {
//                return !!visit.uuid;
//            };
//
//            $scope.save = function (visit) {
//                $scope.toggleGallery = false;
//                var visitDocument;
//                if (isExistingVisit(visit) || $scope.isNewVisitDateValid()) {
//                    visitDocument = createVisitDocument(visit);
//                }
//                return spinner.forPromise(visitDocumentService.save(visitDocument).then(function (response) {
//                    return encounterService.getEncountersForEncounterType($scope.patient.uuid, encounterTypeUuid).then(function (encounterResponse) {
//                        var savedVisit = $scope.visits[$scope.visits.indexOf(visit)];
//                        if (!savedVisit) {
//                            visitService.getVisit(response.data.visitUuid, customVisitParams).then(function (visitResponse) {
//                                var newVisit = createVisit(visitResponse.data);
//                                visit = $scope.visits.push(newVisit);
//                                initNewVisit();
//                                updateVisit(newVisit, encounterResponse.data.results);
//                                $scope.toggleGallery = true;
//                            });
//                        } else {
//                            updateVisit(savedVisit, encounterResponse.data.results);
//                            $scope.toggleGallery = true;
//                        }
//                        getActiveEncounter();
//                    });
//                }));
//            };

            $anchorScroll();
        }
    ]);
