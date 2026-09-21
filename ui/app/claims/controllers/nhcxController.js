'use strict';

angular.module('bahmni.claims')
    .controller('NhcxController', ['$scope', '$state', '$stateParams', '$location', 'appService', 'nhcxService', 'patientService', 'visitService', function ($scope, $state, $stateParams, $location, appService, nhcxService, patientService, visitService) {
        $scope.appExtensions = appService.getAppDescriptor().getExtensions($state.current.data.extensionPointId, "link") || [];
        $scope.visits = [];
        $scope.claimRequest = {
            items: []
        };
        $scope.claims = [];
        $scope.loadingClaims = false;
        $scope.preAuthDocuments = [];
        $scope.claimDocuments = [];
        $scope.submittingPreAuth = false;
        $scope.submittingClaim = false;
        $scope.preAuthError = null;
        $scope.claimError = null;

        $scope.documentCategories = [
            {
                code: 'DIA',
                display: 'Diagnostic report'
            },
            {
                code: 'CD',
                display: 'Clinical document'
            },
            {
                code: 'MB',
                display: 'Medical bill'
            },
            {
                code: 'HDS',
                display: 'Hospital discharge summary'
            },
            {
                code: 'PCT',
                display: 'Patient consent'
            },
            {
                code: 'DCT',
                display: 'Doctor consent'
            },
            {
                code: 'HCT',
                display: 'Hospital consent'
            },
            {
                code: 'ATT',
                display: 'Attachment'
            }
        ];
        $scope.openCommunicationClaimId = null;
        $scope.communicationError = null;
        var getPatient = function () {
            return patientService.getPatient($stateParams.patientUuid).then(function (patientResponse) {
                $scope.patient = patientResponse.data;
            });
        };
        var getVisits = function () {
            return visitService.search({patient: $scope.patient.uuid, v: "custom:(uuid,startDatetime,stopDatetime,visitType)",
                includeInactive: true}).then(function (visitResponse) {
                    $scope.visits = visitResponse.data.results;
                });
        };

        $scope.toggleCommunications = function (claim) {
            if (!claim || !claim.id) {
                $scope.communicationError = 'Claim tracking ID is missing.';
                return;
            }

            if ($scope.openCommunicationClaimId === claim.id) {
                $scope.openCommunicationClaimId = null;
                return;
            }

            $scope.openCommunicationClaimId = claim.id;
            if (!claim.communicationsLoaded) {
                $scope.loadCommunications(claim);
            }
        };

        $scope.selectPreAuthDocuments = function (files) {
            appendDocuments($scope.preAuthDocuments, files, 'CD');
            resetFileInput('preAuthDocumentsInput');
        };

        $scope.selectClaimDocuments = function (files) {
            appendDocuments($scope.claimDocuments, files, 'MB');
            resetFileInput('claimDocumentsInput');
        };

        function appendDocuments(target, files, defaultCategoryCode) {
            angular.forEach(files || [], function (file) {
                if (!isAllowedClaimDocument(file)) {
                    return;
                }

                var duplicate = target.some(function (document) {
                    return document.fileName === file.name &&
                        document.size === file.size &&
                        document.lastModified === file.lastModified;
                });

                if (duplicate) {
                    return;
                }

                var category = findDocumentCategory(defaultCategoryCode);
                target.push({
                    file: file,
                    fileIndex: target.length,
                    fileName: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    contentType: file.type || 'application/octet-stream',
                    categoryCode: category.code,
                    categoryDisplay: category.display,
                    informationCode: 'AT',
                    informationDisplay: 'Attachment',
                    description: '',
                    validationError: null
                });
            });

            updateFileIndexes(target);
        }

        function isAllowedClaimDocument(file) {
            var maxSize = 5 * 1024 * 1024;

            var allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png'
            ];

            if (!file) {
                return false;
            }

            if (file.size > maxSize) {
                $scope.claimDocumentError =
                    file.name + ' exceeds the maximum size of 5 MB.';
                return false;
            }

            if (allowedTypes.indexOf(file.type) === -1) {
                $scope.claimDocumentError =
                    file.name + ' is not a supported file type.';
                return false;
            }

            $scope.claimDocumentError = null;
            return true;
        }

        function findDocumentCategory(code) {
            var category = $scope.documentCategories.find(function (item) {
                return item.code === code;
            });

            return category || {
                code: 'ATT',
                display: 'Attachment'
            };
        }

        $scope.updateDocumentCategory = function (document) {
            var category = findDocumentCategory(
                document.categoryCode
            );

            document.categoryDisplay = category.display;
        };

        $scope.removePreAuthDocument = function (index) {
            $scope.preAuthDocuments.splice(index, 1);
            updateFileIndexes($scope.preAuthDocuments);
        };

        $scope.removeClaimDocument = function (index) {
            $scope.claimDocuments.splice(index, 1);
            updateFileIndexes($scope.claimDocuments);
        };

        function updateFileIndexes(documents) {
            angular.forEach(documents, function (document, index) {
                document.fileIndex = index;
            });
        }

        $scope.formatFileSize = function (bytes) {
            if (!bytes) {
                return '0 KB';
            }

            if (bytes < 1024 * 1024) {
                return (bytes / 1024).toFixed(1) + ' KB';
            }

            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };

        function getDocumentMetadata(documents) {
            return (documents || []).map(function (document, index) {
                return {
                    fileIndex: index,
                    categoryCode: document.categoryCode,
                    categoryDisplay: document.categoryDisplay,
                    informationCode: document.informationCode,
                    informationDisplay: document.informationDisplay,
                    description: document.description
                };
            });
        }

        function getDocumentFiles(documents) {
            return (documents || []).map(function (document) {
                return document.file;
            });
        }

        function resetFileInput(inputId) {
            var input = document.getElementById(inputId);

            if (input) {
                input.value = '';
            }
        }

        $scope.loadCommunications = function (claim) {
            if (!claim || !claim.id) {
                return;
            }

            claim.loadingCommunications = true;
            claim.communicationError = null;

            nhcxService.getClaimCommunications(claim.id)
                .then(function (response) {
                    claim.communications = response.data || [];
                    claim.communicationsLoaded = true;
                    angular.forEach(claim.communications, initialiseCommunication);
                }).catch(function (error) {
                    claim.communicationError = getErrorMessage(error, 'Unable to load payer communications.');
                }).finally(function () {
                    claim.loadingCommunications = false;
                });
        };

        function initialiseCommunication (communication) {
            communication.reply = communication.reply || {
                categoryCode: communication.categoryCode || 'additional-information',
                topic: getReplyTopic(communication.topic),
                message: '',
                documentIds: []
            };

            communication.selectedFiles = communication.selectedFiles || {};
        }

        function getReplyTopic (topic) {
            if (!topic) {
                return 'Response to payer communication';
            }

            if (topic.toLowerCase().indexOf('re:') === 0) {
                return topic;
            }

            return 'Re: ' + topic;
        }

        $scope.selectCommunicationFile = function (file, communication, document) {
            if (!file || !communication) {
                return;
            }

            communication.selectedFiles = communication.selectedFiles || {};
            var key = document && document.id ? document.id : 'new';
            communication.selectedFiles[key] = file;
            if (document) {
                document.selectedFileName = file.name;
                document.uploadError = null;
            }
        };

        $scope.uploadCommunicationDocument = function (communication, document) {
            if (!communication) {
                return;
            }

            var key = document && document.id ? document.id : 'new';
            var file = communication.selectedFiles && communication.selectedFiles[key];

            if (!file) {
                if (document) {
                    document.uploadError = 'Please select a file first.';
                }
                return;
            }

            document.uploading = true;
            document.uploadError = null;

            nhcxService.uploadCommunicationDocument(communication.id, document.id, file)
            .then(function (response) {
                var uploadedDocument = response.data;
                angular.extend(document, uploadedDocument);
                document.selectedForReply = true;
                document.selectedFileName = null;
                delete communication.selectedFiles[key];
            }).catch(function (error) {
                document.uploadError = getErrorMessage(error, 'Unable to upload the document.');
            }).finally(function () {
                document.uploading = false;
            });
        };

        $scope.canRespondToCommunication = function (communication) {
            if (!communication || communication.direction !== 'INBOUND' || communication.responding) {
                return false;
            }

            var hasMessage = communication.reply && communication.reply.message && communication.reply.message.trim() !== '';
            var hasDocuments = getSelectedDocumentIds(communication).length > 0;
            return hasMessage || hasDocuments;
        };

        function getSelectedDocumentIds (communication) {
            var documentIds = [];

            angular.forEach(communication.documents || [], function (document) {
                if (document.selectedForReply && (document.status === 'AVAILABLE' || document.status === 'ATTACHED')) {
                    documentIds.push(document.id);
                }
            });

            return documentIds;
        }

        $scope.respondToCommunication = function (claim, communication) {
            if (!$scope.canRespondToCommunication(communication)) {
                return;
            }

            communication.responding = true;
            communication.replyError = null;
            communication.replySuccess = null;

            var request = {
                categoryCode: communication.reply.categoryCode,
                topic: communication.reply.topic,
                message: communication.reply.message,
                documentIds: getSelectedDocumentIds(communication)
            };

            nhcxService.respondToCommunication(communication.id, request)
            .then(function () {
                communication.replySuccess = 'Response submitted successfully.';
                communication.reply.message = '';
                angular.forEach(communication.documents || [], function (document) {
                    document.selectedForReply = false;
                });

                return $scope.loadCommunications(claim);
            }).catch(function (error) {
                communication.replyError = getErrorMessage(error, 'Unable to send the response.');
            }).finally(function () {
                communication.responding = false;
            });
        };

        function getErrorMessage (error, defaultMessage) {
            if (!error || !error.data) {
                return defaultMessage;
            }

            if (angular.isString(error.data)) {
                return error.data;
            }

            return error.data.message ||
                error.data.errorMessage ||
                error.data.error ||
                defaultMessage;
        }

        $scope.loadClaims = function () {
            if (!$scope.patientUuid) {
                return;
            }

            $scope.loadingClaims = true;
            nhcxService.getPatientClaims($scope.patientUuid)
                .then(function (response) {
                    $scope.claims = response.data || [];
                }).finally(function () {
                    $scope.loadingClaims = false;
                });
        };

        var init = function () {
            if ($stateParams.patient !== null && $stateParams.patient !== undefined) {
                $scope.patientUuid = $stateParams.patient.uuid;
                $scope.patient = $stateParams.patient;
                getVisits();
                $scope.loadClaims();
            }

            var urlParams = $location.$$search;
            if (urlParams !== undefined && urlParams.patientUuid != null) {
                $scope.patientUuid = urlParams.patientUuid;
            }

            if ($scope.patient === undefined) {
                getPatient().then(function () {
                    getVisits();
                    $scope.loadClaims();
                });
            }
        };

        init();

        $scope.preAuth = function (patient) {
            if (!patient || !$scope.selectedVisitUuid) {
                $scope.preAuthError = 'Please select a visit.';
                return;
            }

            $scope.submittingPreAuth = true;
            $scope.preAuthError = null;

            var request = {
                patientUuid: patient.uuid,
                visitUuid: $scope.selectedVisitUuid,
                abhaId: null,
                documentMetadata: getDocumentMetadata($scope.preAuthDocuments)
            };

            return nhcxService.submitPreauth(request, getDocumentFiles($scope.preAuthDocuments)).then(function (response) {
                $scope.response = response.data;
                $scope.preAuthDocuments = [];
                resetFileInput('preAuthDocumentsInput');
                $scope.loadClaims();
            }).catch(function (error) {
                $scope.preAuthError = getErrorMessage(error, 'Unable to submit the pre-authorization request.');
            }).finally(function () {
                $scope.submittingPreAuth = false;
            });
        };

        $scope.addBillItem = function () {
            $scope.claimRequest.items.push({
                serviceCode: '',
                serviceDisplay: '',
                unitPrice: 0,
                quantity: 1,
                net: 0
            });
        };

        $scope.removeBillItem = function (index) {
            $scope.claimRequest.items.splice(index, 1);
        };

        $scope.getTotalAmount = function () {
            var total = 0;
            angular.forEach($scope.claimRequest.items, function (item) {
                total += Number(item.net || 0);
            });
            return total.toFixed(2);
        };

        $scope.submitCoverageEligibility = function () {
            $scope.claimRequest.patientUuid = $scope.patientUuid;
            $scope.claimRequest.visitUuid = $scope.selectedVisitUuid;
            nhcxService.submitCoverageEligibility($scope.claimRequest).then(function (response) {
//                Bahmni.Common.UI.Notification.success('Predetermination submitted successfully');
                $scope.response = response.data;
                $scope.loadClaims();
            });
        };

        $scope.checkClaimStatus = function (claim) {
            if (!claim || !claim.correlationId) {
                return;
            }

            claim.checkingStatus = true;
            nhcxService.getStatus(claim.correlationId).then(function (response) {
                var status = response.data && response.data.claimState;
                if (status) {
                    claim.status = status.toUpperCase();
                }
            })
            .catch(function (error) {
                console.error("Status check failed", error);
            })
            .finally(function () {
                claim.checkingStatus = false;
            });
        };

        $scope.submitClaim = function () {
            if (!$scope.selectedVisitUuid) {
                $scope.claimError = 'Please select a visit.';
                return;
            }

            $scope.submittingClaim = true;
            $scope.claimError = null;
            var request = angular.copy($scope.claimRequest);
            request.patientUuid = $scope.patientUuid;
            request.visitUuid = $scope.selectedVisitUuid;
            request.documentMetadata = getDocumentMetadata($scope.claimDocuments);

            return nhcxService.submitClaim(request, getDocumentFiles($scope.claimDocuments)).then(function (response) {
                $scope.response = response.data;
                $scope.claimDocuments = [];
                resetFileInput('claimDocumentsInput');
                $scope.loadClaims();
            }).catch(function (error) {
                $scope.claimError = getErrorMessage(error, 'Unable to submit the final claim.');
            }).finally(function () {
                $scope.submittingClaim = false;
            });
        };

        $scope.getPatientAttribute = function (attributeName, defaultValue) {
            defaultValue = defaultValue || '-';

            if (!$scope.patient || !$scope.patient.person || !$scope.patient.person.attributes) {
                return defaultValue;
            }

            var attributes = $scope.patient.person.attributes;
            var attribute = attributes.find(function (attr) {
                return attr.attributeType &&
                    attr.attributeType.display === attributeName &&
                    !attr.voided;
            });

            if (!attribute || attribute.value === null || attribute.value === undefined) {
                return defaultValue;
            }

            if (angular.isObject(attribute.value)) {
                return attribute.value.display || defaultValue;
            }

            return attribute.value;
        };

        $scope.getCombinedAttributes = function (attributeNames, separator) {
            separator = separator || ' - ';

            return attributeNames
                .map(function (name) {
                    return $scope.getPatientAttribute(name, '');
                })
                .filter(function (value) {
                    return value && value.trim() !== '';
                })
                .join(separator) || '-';
        };

        $scope.getPatientName = function () {
            if (!$scope.patient) {
                return '-';
            }

            if ($scope.patient.givenName || $scope.patient.familyName) {
                return (($scope.patient.givenName || '') + ' ' +
                        ($scope.patient.familyName || '')).trim();
            }

            if ($scope.patient.person && $scope.patient.person.preferredName) {
                var name = $scope.patient.person.preferredName;
                return ((name.givenName || '') + ' ' +
                        (name.familyName || '')).trim();
            }

            return '-';
        };

        $scope.getPatientIdentifier = function () {
            if (!$scope.patient) {
                return '-';
            }

            if ($scope.patient.identifier) {
                return $scope.patient.identifier;
            }

            if ($scope.patient.identifiers && $scope.patient.identifiers.length > 0) {
                var preferred = $scope.patient.identifiers.find(function (id) {
                    return id.preferred;
                });

                return preferred
                    ? preferred.identifier
                    : $scope.patient.identifiers[0].identifier;
            }

            return '-';
        };
    }]);
