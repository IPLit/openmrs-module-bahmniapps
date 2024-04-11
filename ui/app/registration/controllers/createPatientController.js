'use strict';

angular.module('bahmni.registration')
    .controller('CreatePatientController', ['$scope', '$rootScope', '$state', 'patientService', 'patient', 'spinner', 'appService', 'messagingService', 'ngDialog', '$q', '$translate', 'sessionService', '$http',
        function ($scope, $rootScope, $state, patientService, patient, spinner, appService, messagingService, ngDialog, $q, $translate, sessionService, $http) {
            var dateUtil = Bahmni.Common.Util.DateUtil;
            $scope.actions = {};
            var errorMessage;
            var configValueForEnterId = appService.getAppDescriptor().getConfigValue('showEnterID');
            $scope.addressHierarchyConfigs = appService.getAppDescriptor().getConfigValue("addressHierarchy");
            $scope.disablePhotoCapture = appService.getAppDescriptor().getConfigValue("disablePhotoCapture");
            $scope.showEnterID = configValueForEnterId === null ? true : configValueForEnterId;
            $scope.today = Bahmni.Common.Util.DateTimeFormatter.getDateWithoutTime(dateUtil.now());
            $scope.moduleName = appService.getAppDescriptor().getConfigValue('registrationModuleName');
            var patientId;

            var uniquePersonAttribute = appService.getAppDescriptor().getConfigValue("uniquePersonAttribute");
            var loginLocationUuid = sessionService.getLoginLocationUuid();
            const patientSearchByPersonAttributeUrl = Bahmni.Common.Constants.bahmniCommonsSearchUrl + "/patient?patientAttributes=" + uniquePersonAttribute + "&s=byIdOrNameOrVillage&startIndex=0&patientSearchResultsConfig=" + uniquePersonAttribute + "&customAttribute=";
            const uniquePersonAttributeErrorText = appService.getAppDescriptor().getConfigValue("uniquePersonAttributeErrorText") || "";

            var getPersonAttributeTypes = function () {
                return $rootScope.patientConfiguration.attributeTypes;
            };
            $scope.getTranslatedPatientIdentifier = function (patientIdentifier) {
                var translatedName = Bahmni.Common.Util.TranslationUtil.translateAttribute(patientIdentifier, Bahmni.Common.Constants.registration, $translate);
                return translatedName;
            };
            var prepopulateDefaultsInFields = function () {
                var personAttributeTypes = getPersonAttributeTypes();
                var patientInformation = appService.getAppDescriptor().getConfigValue("patientInformation");
                if (!patientInformation || !patientInformation.defaults) {
                    return;
                }
                var defaults = patientInformation.defaults;
                var defaultVariableNames = _.keys(defaults);

                var hasDefaultAnswer = function (personAttributeType) {
                    return _.includes(defaultVariableNames, personAttributeType.name);
                };

                var isConcept = function (personAttributeType) {
                    return personAttributeType.format === "org.openmrs.Concept";
                };

                var setDefaultAnswer = function (personAttributeType) {
                    $scope.patient[personAttributeType.name] = defaults[personAttributeType.name];
                };

                var setDefaultConcept = function (personAttributeType) {
                    var defaultAnswer = defaults[personAttributeType.name];
                    var isDefaultAnswer = function (answer) {
                        return answer.fullySpecifiedName === defaultAnswer;
                    };

                    _.chain(personAttributeType.answers).filter(isDefaultAnswer).each(function (answer) {
                        $scope.patient[personAttributeType.name] = {
                            conceptUuid: answer.conceptId,
                            value: answer.fullySpecifiedName
                        };
                    }).value();
                };

                var isDateType = function (personAttributeType) {
                    return personAttributeType.format === "org.openmrs.util.AttributableDate";
                };

                var isDefaultValueToday = function (personAttributeType) {
                    if (defaults[personAttributeType.name].toLowerCase() === "today") {
                        return true;
                    }
                    return false;
                };

                var setDefaultValue = function (personAttributeType) {
                    if (isDefaultValueToday(personAttributeType)) {
                        $scope.patient[personAttributeType.name] = new Date();
                    }
                    else {
                        $scope.patient[personAttributeType.name] = '';
                    }
                };

                var defaultsWithAnswers = _.chain(personAttributeTypes)
                    .filter(hasDefaultAnswer)
                    .each(setDefaultAnswer).value();

                _.chain(defaultsWithAnswers).filter(isConcept).each(setDefaultConcept).value();
                _.chain(defaultsWithAnswers).filter(isDateType).each(setDefaultValue).value();
            };

            var expandSectionsWithDefaultValue = function () {
                angular.forEach($rootScope.patientConfiguration && $rootScope.patientConfiguration.getPatientAttributesSections(), function (section) {
                    var notNullAttribute = _.find(section && section.attributes, function (attribute) {
                        return $scope.patient[attribute.name] !== undefined;
                    });
                    section.expand = section.expanded || (notNullAttribute ? true : false);
                });
            };

            var init = function () {
                $scope.patient = patient.create();
                prepopulateDefaultsInFields();
                expandSectionsWithDefaultValue();
                $scope.patientLoaded = true;
                $scope.createPatient = true;

                // IPLit: initially selecting patient id source === logged in location IdentifierSourceName, location id prefix
                if ($rootScope.loggedInLocation && $rootScope.loggedInLocation.attributes) {
                    var foundSourceAttr = $rootScope.loggedInLocation.attributes.find(attr => attr.display.includes('IdentifierSourceName'));
                    if (foundSourceAttr) {
                        var sourceIds = foundSourceAttr.display.split(':');
                        var locationSourceIdentifier = sourceIds && sourceIds.length > 1 ? sourceIds[1].trim() : '';
                        if (locationSourceIdentifier && locationSourceIdentifier.length > 0) {
                            var selectedIdentifierSource = $scope.patient.primaryIdentifier.identifierType.identifierSources.find(src => src.prefix === locationSourceIdentifier);
                            if (selectedIdentifierSource) {
                                $scope.patient.primaryIdentifier.selectedIdentifierSource = selectedIdentifierSource;
                            }
                        }
                    }
                }
            };

            init();

            var prepopulateFields = function () {
                var fieldsToPopulate = appService.getAppDescriptor().getConfigValue("prepopulateFields");
                if (fieldsToPopulate) {
                    _.each(fieldsToPopulate, function (field) {
                        var addressLevel = _.find($scope.addressLevels, function (level) {
                            return level.name === field;
                        });
                        if (addressLevel) {
                            $scope.patient.address[addressLevel.addressField] = $rootScope.loggedInLocation[addressLevel.addressField];
                        }
                    });
                }
            };
            prepopulateFields();

            var addNewRelationships = function () {
                var newRelationships = _.filter($scope.patient.newlyAddedRelationships, function (relationship) {
                    return relationship.relationshipType && relationship.relationshipType.uuid;
                });
                newRelationships = _.each(newRelationships, function (relationship) {
                    delete relationship.patientIdentifier;
                    delete relationship.content;
                    delete relationship.providerName;
                });
                $scope.patient.relationships = newRelationships;
            };

            var getConfirmationViaNgDialog = function (config) {
                var ngDialogLocalScope = config.scope.$new();
                ngDialogLocalScope.yes = function () {
                    ngDialog.close();
                    config.yesCallback();
                };
                ngDialogLocalScope.no = function () {
                    ngDialog.close();
                };
                ngDialog.open({
                    template: config.template,
                    data: config.data,
                    scope: ngDialogLocalScope
                });
            };

            var copyPatientProfileDataToScope = function (response) {
                var patientProfileData = response.data;
                $scope.patient.uuid = patientProfileData.patient.uuid;
                $scope.patient.name = patientProfileData.patient.person.names[0].display;
                $scope.patient.isNew = true;
                $scope.patient.registrationDate = dateUtil.now();
                $scope.patient.newlyAddedRelationships = [{}];
                $scope.actions.followUpAction(patientProfileData);
                patientId = patientProfileData.patient.identifiers[0].identifier;
            };

            var createPatient = function (jumpAccepted) {
                return patientService.create($scope.patient, jumpAccepted).then(function (response) {
                    copyPatientProfileDataToScope(response);
                }, function (response) {
                    if (response.status === 412) {
                        var data = _.map(response.data, function (data) {
                            return {
                                sizeOfTheJump: data.sizeOfJump,
                                identifierName: _.find($rootScope.patientConfiguration.identifierTypes, {uuid: data.identifierType}).name
                            };
                        });
                        getConfirmationViaNgDialog({
                            template: 'views/customIdentifierConfirmation.html',
                            data: data,
                            scope: $scope,
                            yesCallback: function () {
                                return createPatient(true);
                            }
                        });
                    }
                    if (response.isIdentifierDuplicate) {
                        errorMessage = response.message;
                    }
                });
            };

            var createPromise = function () {
                var deferred = $q.defer();
                createPatient().finally(function () {
                    return deferred.resolve({});
                });
                return deferred.promise;
            };

            var searchDuplicatePersonAttributePatients = function (pa) {
                var loginLocation = '&loginLocationUuid=' + loginLocationUuid;
                var finalPatientSearchUrl = patientSearchByPersonAttributeUrl + pa + loginLocation;
                return $http.get(finalPatientSearchUrl, {
                    method: "GET",
                    withCredentials: true
                });
            };

            var validateUniquePersonAttribute = function () {
                var errorText = null;
                var deferred = $q.defer();
                if (uniquePersonAttribute) {
                    var uniquePersonAttributeVal = $scope.patient[uniquePersonAttribute];
                    if (uniquePersonAttributeVal) {
                        return searchDuplicatePersonAttributePatients(uniquePersonAttributeVal).then(function (result) {
                            deferred.resolve(result);
                            if (result.data && result.data.pageOfResults && result.data.pageOfResults.length === 0) {
                                errorText = '';
                            } else {
                                var pt = _.find(result.data.pageOfResults, function (p) {
                                    if (p && p.uuid && p.uuid !== $scope.patient.uuid) {
                                        return p;
                                    }
                                });
                                if (pt) {
                                    errorText = uniquePersonAttributeErrorText;
                                }
                            }
                            return errorText;
                        }).then(function (errorText) {
                            return errorText;
                        });
                    } else {
                        deferred.resolve(errorText);
                    }
                } else {
                    deferred.resolve(errorText);
                }
                return deferred.promise;
            };

            $scope.create = function () {
                addNewRelationships();
                var errorMessages = Bahmni.Common.Util.ValidationUtil.validate($scope.patient, $scope.patientConfiguration.attributeTypes);
                return spinner.forPromise(validateUniquePersonAttribute().then(function (errorText) {
                    if (errorText && errorText.length > 0) {
                        errorMessages.push(errorText);
                    }
                })).then(function () {
                    if (errorMessages.length > 0) {
                        errorMessages.forEach(function (errorMessage) {
                            messagingService.showMessage('error', errorMessage);
                        });
                        return $q.when({});
                    }
                    return spinner.forPromise(createPromise()).then(function (response) {
                        if (errorMessage) {
                            messagingService.showMessage("error", errorMessage);
                            errorMessage = undefined;
                        }
                    });
                });
            };

            $scope.afterSave = function () {
                messagingService.showMessage("info", "REGISTRATION_LABEL_SAVED");
                $state.go("patient.edit", {
                    patientUuid: $scope.patient.uuid
                });
            };
        }
    ]);
