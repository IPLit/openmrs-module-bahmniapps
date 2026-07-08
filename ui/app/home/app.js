'use strict';

angular.module('bahmni.home', ['ui.router', 'httpErrorInterceptor', 'bahmni.common.domain', 'bahmni.common.i18n', 'bahmni.common.uiHelper', 'bahmni.common.util',
    'bahmni.common.appFramework', 'bahmni.common.logging', 'bahmni.common.routeErrorHandler', 'pascalprecht.translate', 'ngCookies',
    'bahmni.common.models'])
    .config(['$urlRouterProvider', '$stateProvider', '$httpProvider', '$bahmniTranslateProvider', '$compileProvider',
        function ($urlRouterProvider, $stateProvider, $httpProvider, $bahmniTranslateProvider, $compileProvider) {
            $urlRouterProvider.otherwise('/dashboard');

        // @if DEBUG='production'
            $compileProvider.debugInfoEnabled(false);
        // @endif

        // @if DEBUG='development'
            $compileProvider.debugInfoEnabled(true);
        // @endif
            $stateProvider
            .state('dashboard',
                {
                    url: '/dashboard',
                    templateUrl: 'views/dashboard.html',
                    controller: 'DashboardController',
                    data: {extensionPointId: 'org.bahmni.home.dashboard'},
                    resolve: {
                        initialize: function (initialization) {
                            return initialization();
                        }
                    }
                }).state('changePassword', {
                    url: '/changePassword',
                    templateUrl: 'views/changePassword.html',
                    controller: 'ChangePasswordController'
                }).state('login',
                {
                    url: '/login?showLoginMessage',
                    templateUrl: 'views/login.html',
                    controller: 'LoginController',
                    resolve: {
                        initialData: function (loginInitialization) {
                            return loginInitialization();
                        }
                    }
                })
            .state('loginLocation', {
                url: '/loginLocation',
                controller: 'LoginLocationController',
                templateUrl: 'views/loginLocation.html',
                resolve: {
                    initialData: function (loginInitialization) {
                        return loginInitialization();
                    }
                }
            })
            .state('expired', {
                url: '/expired',
                templateUrl: 'views/expired.html'
            })
            .state('errorLog', {
                url: '/errorLog',
                controller: 'ErrorLogController',
                templateUrl: 'views/errorLog.html',
                data: {
                    backLinks: [
                        {label: "Home", state: "dashboard", accessKey: "h", icon: "fa-home"}
                    ]
                },
                resolve: {
                }
            });
            $httpProvider.defaults.headers.common['Disable-WWW-Authenticate'] = true;
            $bahmniTranslateProvider.init({app: 'home', shouldMerge: true});
        }]).run(['$rootScope', '$state', '$templateCache', '$window', 'expiryService', 'messagingService', function ($rootScope, $state, $templateCache, $window, expiryService, messagingService) {
            moment.locale($window.localStorage["NG_TRANSLATE_LANG_KEY"] || "en");
            const EXPIRED_PAGE = '/expired.html';
            $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
                if (toState.name === 'login' || toState.name === 'expired') {
                    return true;
                }
                expiryService.fetchLicenseCheckType().then(function (response) {
                    if (response.data === "Check" || response.data === "CheckAndAllow") {
                        const expiry = expiryService.getStoredExpiry();
                        if (expiry && !expiryService.isExpired(expiry)) {
                            showExpiryWarning(expiry);
                            return true;
                        }
                        if (expiryService.isExpired(expiry)) {
                            expiryService.fetchImplementationDetails().then(function (implementationResponse) {
                                expiryService.fetchLicenseServerUrl().then(function (serverUrlResponse) {
                                    var serverUrl = Bahmni.Common.Constants.hostURL;
                                    if (serverUrlResponse !== undefined) {
                                        serverUrl = serverUrlResponse.data;
                                    }
                                    return expiryService.fetchAndStoreExpiry(implementationResponse.name, implementationResponse.implementationId, serverUrl).then(function (fetchedExpiry) {
                                        if (expiryService.isExpired(fetchedExpiry)) {
                                            if (response.data === "Check") {
                                                $state.go('expired');
                                                return false;
                                            } else {
                                                messagingService.showMessage("info", "MESSAGE_LICENSE_EXPIRED");
                                                return true;
                                            }
                                        }
                                        showExpiryWarning(fetchedExpiry);
                                        return true;
                                    }).catch(function () {
                                        $state.go('expired');
                                        return false;
                                    });
                                });
                            });
                        }
                    }
                });
            });

            function showExpiryWarning (expiry) {
                if (!expiryService.isExpiringSoon(expiry)) {
                    return;
                }
                var days = expiryService.getDaysRemaining(expiry);
                messagingService.showMessage("alert",
                    "License will expire in " + days + " day" + (days === 1 ? "" : "s") + ". Please renew it."
                );
            }

            $rootScope.$on('$viewContentLoaded', function () {
                $templateCache.removeAll();
            });
        }]);
