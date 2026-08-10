'use strict';

angular.module('bahmni.common.domain')
    .service('visitDocumentService', ['$http', 'auditLogService', 'configurations', '$q', 'messagingService', '$translate', '$rootScope', function ($http, auditLogService, configurations, $q, messagingService, $translate, $rootScope) {
        var removeVoidedDocuments = function (documents) {
            documents.forEach(function (document) {
                if (document.voided && document.image) {
                    var url = Bahmni.Common.Constants.RESTWS_V1 + "/bahmnicore/visitDocument?filename=" + document.image;
                    $http.delete(url, {withCredentials: true});
                }
            });
        };

        this.save = function (visitDocument) {
            var url = Bahmni.Common.Constants.RESTWS_V1 + "/bahmnicore/visitDocument";
            var isNewVisit = !visitDocument.visitUuid;
            removeVoidedDocuments(visitDocument.documents);
            var visitTypeName = configurations.encounterConfig().getVisitTypeByUuid(visitDocument.visitTypeUuid)['name'];
            var encounterTypeName = configurations.encounterConfig().getEncounterTypeByUuid(visitDocument.encounterTypeUuid)['name'];
            return $http.post(url, visitDocument).then(function (response) {
                var promise = isNewVisit ? auditLogService.log(visitDocument.patientUuid, "OPEN_VISIT",
                    {visitUuid: response.data.visitUuid, visitType: visitTypeName}, encounterTypeName) : $q.when();
                return promise.then(function () {
                    return auditLogService.log(visitDocument.patientUuid, "EDIT_ENCOUNTER",
                        {
                            encounterUuid: response.data.encounterUuid,
                            encounterType: encounterTypeName
                        }, encounterTypeName).then(function () {
                            return response;
                        }
                    );
                });
            });
        };

        this.processNotes = function (file, patientUuid, locationUuid, encounterTypeUuid, providerUuid) {
            var format = file.split(";")[0].split("/")[1];
            var rawBase64 = file.split(",")[1];
            var body = {
                patientUuid: patientUuid,
                encounterTypeUuid: encounterTypeUuid,
                providerUuid: providerUuid,
                locationUuid: locationUuid,
                fileType: "image",
                fileName: "HandNotes",
                content: rawBase64,
                format: format
            };

            var url = Bahmni.Common.Constants.aiScribbleApi + "/upload";
            return $http.post(url, body).then(function (response) {
                $rootScope.$broadcast('aiEncounterGenerated', response.data);
                messagingService.showMessage("info", "The Scribble Notes is processed. Please review before Saving");
            }, function (error) {
                console.error("Upload Failed", error);
            });
        };

        this.saveFile = function (file, patientUuid, encounterTypeName, fileName, fileType) {
            var searchStr = ";base64";
            var executePost = function (base64Content, format) {
                var url = Bahmni.Common.Constants.RESTWS_V1 + "/bahmnicore/distro/visitDocument/mt/uploadDocument";
                return $http.post(url, {
                    content: base64Content.substring(base64Content.indexOf(searchStr) + searchStr.length, base64Content.length),
                    format: format,
                    patientUuid: patientUuid,
                    encounterTypeName: encounterTypeName,
                    fileType: fileType || "file",
                    fileName: fileName.substring(0, fileName.lastIndexOf('.'))
                }, {
                    withCredentials: true,
                    headers: {"Accept": "application/json", "Content-Type": "application/json"}
                }).then(function (response) {
                    return response;
                }, function (error) {
                    if (error.status === 413) {
                        if (!isNaN(error.data.maxDocumentSizeMB)) {
                            var maxAllowedSize = roundToNearestHalf(error.data.maxDocumentSizeMB * 0.70);
                            messagingService.showMessage("error", $translate.instant("FILE_SIZE_LIMIT_EXCEEDED_MESSAGE", { maxAllowedSize: maxAllowedSize }));
                        } else {
                            messagingService.showMessage("error", $translate.instant("SIZE_LIMIT_EXCEEDED_MESSAGE"));
                        }
                    }
                    return $q.reject(error);
                });
            };

            var format = file.split(searchStr)[0].split("/")[1];
            if (fileType === "video") {
                format = _.last(_.split(fileName, "."));
                return executePost(file, format);
            }

            // Process image file to fix orientation using Canvas
            if (file.indexOf("data:image/") === 0) {
                return $q(function (resolve) {
                    var img = new Image();
                    img.onload = function () {
                        try {
                            var canvas = document.createElement("canvas");
                            canvas.style.display = "none";
                            canvas.width = img.width;
                            canvas.height = img.height;
                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(img, img.x || 0, img.y || 0, img.width, img.height);
                            var normalizedBase64 = canvas.toDataURL("image/jpeg", 0.92);
                            resolve(normalizedBase64);
                        } catch (err) {
                            resolve(file);
                        }
                    };
                    img.onerror = function () {
                        resolve(file);
                    };
                    img.src = file;
                }).then(function (correctedBase64) {
                    return executePost(correctedBase64, format);
                });
            }
            return executePost(file, format);
        };

        var roundToNearestHalf = function (value) {
            var floorValue = Math.floor(value);
            if ((value - floorValue) < 0.5) {
                return floorValue;
            }
            return floorValue + 0.5;
        };

        this.getFileType = function (fileType) {
            var pdfType = "pdf";
            var imageType = "image";
            if (fileType.indexOf(pdfType) !== -1) {
                return pdfType;
            }
            if (fileType.indexOf(imageType) !== -1) {
                return imageType;
            }
            return "not_supported";
        };
    }]);
