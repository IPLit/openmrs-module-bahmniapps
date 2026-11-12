'use strict';

angular.module('bahmni.claims').controller('PmjayWorkflowController',
    ['$scope', '$stateParams', '$interval', 'pmjayService', function ($scope, $stateParams, $interval, pmjayService) {
        $scope.model = {patientUuid: $stateParams.patientUuid, schemeCode: 'PMJAY', documentMetadata: [], items: []};
        $scope.packages = [];
        $scope.files = [];
        $scope.biometric = {authMode: 'FINGERPRINT', process: 'PREAUTH'};
        $scope.biometricProofs = {};
        $scope.busy = false;
        $scope.exemption = {reason: '', patientSigned: false, hospitalRepresentative: '', hospitalSigned: false, file: null};
        $scope.packageError = null;
        $scope.actionError = null;
        $scope.actionMessage = null;

        function syncContext () {
            $scope.model.visitUuid = $scope.$parent.selectedVisitUuid;
            $scope.model.patientUuid = $stateParams.patientUuid || $scope.$parent.patientUuid || $scope.model.patientUuid;
        }

        $scope.$watch('$parent.selectedVisitUuid', function (visitUuid) {
            $scope.model.visitUuid = visitUuid;
        });

        $scope.searchPackages = function () {
            $scope.packageError = null;
            return pmjayService.packages($scope.packageQuery, $scope.specialtyCode)
                .then(function (response) { $scope.packages = response.data || []; })
                .catch(function (error) {
                    $scope.packageError = (error.data && (error.data.message || error.data.error)) || 'Unable to retrieve PM-JAY packages';
                });
        };

        $scope.selectPackage = function (pkg) {
            $scope.selectedPackage = pkg;
            $scope.model.packageCode = pkg.packageCode;
            $scope.model.packageName = pkg.packageName;
            $scope.model.packageRate = pkg.packageRate;
        };

        $scope.checkEligibility = function () {
            syncContext();
            return submit(pmjayService.checkEligibility($scope.model));
        };
        $scope.submitPreauth = function () {
            return submitWithProof('PREAUTH', pmjayService.preauthorize);
        };
        $scope.submitEnhancement = function () {
            return submitWithProof('PREAUTH', pmjayService.enhance);
        };
        $scope.submitClaim = function () {
            return submitWithProof('DISCHARGE', pmjayService.submitClaim);
        };

        $scope.startBiometric = function (process, patient) {
            syncContext();

            var patientUuid = (patient && patient.uuid) || $scope.model.patientUuid;
            var abhaNumber = $scope.getAbhaNumber(patient);
            var payerName = $scope.getPatientAttribute('Insurance Company Name');

            if (!patientUuid) {
                $scope.biometricError = 'Patient information is not available.';
                return;
            }

            if (!abhaNumber) {
                $scope.biometricError = 'Patient ABHA Number is not available.';
                return;
            }

            var request = {
                patientUuid: patientUuid,
                abhaNumber: abhaNumber,
                payerName: payerName || null,
                payerCode: null,
                process: process,
                authMode: $scope.biometric.authMode
            };

            $scope.biometric.process = process;
            $scope.biometricResult = null;
            $scope.faceQrUrl = null;
            $scope.biometricError = null;

            return pmjayService.biometricInit(request).then(function (response) {
                $scope.biometricResult = response.data;
                if (response.data.qrUrl) {
                    $scope.faceQrUrl = response.data.qrUrl;
                }
            }).catch(showBiometricError);
        };

        $scope.checkFaceCapture = function () {
            return pmjayService.facePidStatus($scope.biometricResult.transactionId).then(function (response) {
                $scope.biometricResult = response.data;
            }).catch(showBiometricError);
        };

        $scope.verifyBiometric = function () {
            var request = {
                transactionId: $scope.biometricResult.transactionId,
                pidData: $scope.biometric.pidData,
                aadhaarNumber: $scope.biometric.aadhaarNumber,
                mobileNumber: $scope.biometric.mobileNumber
            };
            return pmjayService.biometricVerify(request).then(function (response) {
                $scope.biometricResult = response.data;
                $scope.biometricProofs[$scope.biometric.process] = response.data.id;
                $scope.biometricError = null;
                $scope.model.biometricAuthId = response.data.id;
                $scope.model.biometricExemptionId = null;
                $scope.biometric.pidData = null;
                $scope.biometric.aadhaarNumber = null;
                $scope.biometric.mobileNumber = null;
            }).catch(showBiometricError);
        };

        $scope.uploadExemption = function () {
            syncContext();
            var data = {
                patientUuid: $scope.model.patientUuid,
                visitUuid: $scope.model.visitUuid,
                process: $scope.biometric.process,
                reason: $scope.exemption.reason,
                patientSigned: $scope.exemption.patientSigned,
                hospitalRepresentative: $scope.exemption.hospitalRepresentative,
                hospitalSigned: $scope.exemption.hospitalSigned
            };
            return pmjayService.uploadBiometricExemption(data, $scope.exemption.file).then(function (response) {
                $scope.biometricProofs[$scope.biometric.process + '_EXEMPTION'] = response.data.id;
                $scope.actionMessage = 'Biometric exemption submitted. The server must validate it before claim submission.';
                $scope.model.biometricExemptionId = response.data.id;
                $scope.model.biometricAuthId = null;
            }).catch(showBiometricError);
        };

        $scope.setExemptionFile = function (element) {
            $scope.$apply(function () { $scope.exemption = $scope.exemption || {}; $scope.exemption.file = element.files[0]; });
        };

        $scope.addFiles = function (element) {
            $scope.$apply(function () { $scope.files = Array.prototype.slice.call(element.files || []); });
        };

        function submit (promise) {
            $scope.busy = true;
            $scope.error = null;
            $scope.actionError = null;
            return promise.then(function (response) {
                $scope.result = response.data;
                if (response.data && response.data.correlationId) poll(response.data.correlationId);
                return {success: true, data: response.data};
            }).catch(function (error) {
                $scope.error = (error.data && (error.data.error || error.data.message)) || 'PM-JAY request failed';
                $scope.actionError = $scope.error;
                return {success: false, error: error};
            }).finally(function () { $scope.busy = false; });
        }

        function submitWithProof (process, submitFunction) {
            syncContext();
            $scope.actionError = null;
            $scope.actionMessage = null;
            $scope.model.biometricAuthId = $scope.biometricProofs[process] || null;
            $scope.model.biometricExemptionId = $scope.biometricProofs[process + '_EXEMPTION'] || null;
            if (!$scope.model.biometricAuthId && !$scope.model.biometricExemptionId) {
                $scope.error = process === 'PREAUTH'
                    ? 'Complete preauthorization biometric authentication or exemption first'
                    : 'Complete discharge biometric authentication or exemption first';
                return;
            }
            return submit(submitFunction($scope.model, $scope.files)).then(function (outcome) {
                if (outcome && outcome.success) {
                    $scope.actionMessage = 'PM-JAY request submitted. Check the tracking status for the final outcome.';
                    if (process === 'PREAUTH' && submitFunction === pmjayService.preauthorize && outcome.data && outcome.data.preAuthRef) {
                        $scope.model.preAuthRef = outcome.data.preAuthRef;
                    }
                }
            });
        }

        function showBiometricError (error) {
            $scope.biometricError = (error.data && (error.data.error || error.data.message)) || 'Biometric authentication failed';
        }

        function poll (correlationId) {
            var attempts = 0;
            var timer = $interval(function () {
                attempts++;
                pmjayService.tracking(correlationId).then(function (response) {
                    $scope.tracking = response.data;
                    if (response.data.completedAt || response.data.claimState === 'ERROR' || attempts >= 30) $interval.cancel(timer);
                });
            }, 5000);
        }
    }]);
