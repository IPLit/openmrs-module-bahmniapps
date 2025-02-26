'use strict';

describe('loginController', function () {
    var localeService, $aController, rootScopeMock, $window, $q, state, _spinner, initialData, scopeMock, sessionService, mockBahmniCookieStore, currentUser, auditLogService;

    beforeEach(module('bahmni.home'));

    beforeEach(module(function($provide){
        $provide.value('$bahmniCookieStore', mockBahmniCookieStore);
    }));

    beforeEach(function () {
        localeService = jasmine.createSpyObj('localeService', ['getLoginText', 'allowedLocalesList', 'serverDateTime', 'getLocalesLangs', 'defaultLocale']);
        sessionService = jasmine.createSpyObj('sessionService', ['loginUser', 'loadCredentials', 'updateSession']);
        auditLogService = jasmine.createSpyObj('auditLogService', ['log']);
        currentUser = jasmine.createSpyObj('currentUser', ['addDefaultLocale', 'toContract']);
        _spinner = jasmine.createSpyObj('spinner', ['forPromise']);

        sessionService.loginUser();
        sessionService.loginUser.and.returnValue(specUtil.simplePromise());
        sessionService.loadCredentials.and.returnValue(specUtil.simplePromise());
        sessionService.updateSession.and.returnValue(specUtil.simplePromise());
        currentUser.addDefaultLocale.and.returnValue(specUtil.simplePromise({data: ""}));
        currentUser.toContract.and.returnValue(specUtil.simplePromise({data: ""}));
        localeService.allowedLocalesList.and.returnValue(specUtil.simplePromise({data: ""}));
        localeService.serverDateTime.and.returnValue(specUtil.simplePromise({data: { date: "Wed Aug 16 15:31:55 NZST 2017", offset: "+1200"  }}));
        localeService.getLoginText.and.returnValue(specUtil.simplePromise({data: {homePage: {logo: "bahmni logo"}, loginPage: {showHeaderText: "bahmni emr", logo: "bahmni logo"}, helpLink: {url: "192.168.33.10/homepage"}}}));
        localeService.getLocalesLangs.and.returnValue(specUtil.createFakePromise(
            {locales: [{code: "en", nativeName: "English"}, {code: "es", nativeName: "Español"}]
            }));
        localeService.defaultLocale.and.returnValue(specUtil.simplePromise({data: "en"}));
        mockBahmniCookieStore = jasmine.createSpyObj('$bahmniCookieStore', ['get', 'remove', 'put']);
        // mockBahmniCookieStore.get.and.callFake(function(param) {
        //     return specUtil.respondWith("success");
        // });
        
        mockBahmniCookieStore.get.and.callFake(function (param) { return {}; });

        $window = jasmine.createSpyObj('$window', ['location']);
        $window.location.and.callFake(function () { return {}; });
        initialData = {location: " "};
        _spinner.forPromise.and.returnValue(specUtil.simplePromise({}));
    });

    beforeEach(
        inject(function ($controller, $rootScope, $state, _$q_) {
            $aController = $controller;
            rootScopeMock = $rootScope;
            $q = _$q_;
            state = $state;
            scopeMock = rootScopeMock.$new();
            rootScopeMock.currentUser = currentUser;
           // mockBahmniCookieStore = mockBahmniCookieStore;
        })
    );

    var loginController = function () {
        return $aController('LoginController', {
            $scope: scopeMock,
            $rootScope: rootScopeMock,
            initialData: initialData,
            $window: window,
            $state: state,
            $q: $q,
            spinner: _spinner,
            localeService: localeService,
            sessionService: sessionService,
            auditLogService: auditLogService,
            $bahmniCookieStore: mockBahmniCookieStore,
            $window : $window
        });
    };

    describe("login", function () {
        beforeEach(function () {
            loginController();
        });

        it('should localServer exist', function () {
            expect(localeService.allowedLocalesList).toBeDefined();
            expect(localeService.serverDateTime).toHaveBeenCalled();
            expect(localeService.getLoginText.calls.count()).toBe(1);
        });

        it('should loginUser methode called', function () {
            expect(sessionService.loginUser).toBeDefined();
            expect(sessionService.loginUser).toHaveBeenCalled();
            expect(sessionService.loginUser.calls.count()).toBe(1);
        });

        it("should show error message if time zone is different", function () {
            expect(scopeMock.warning).toBe("Warning");
            expect(scopeMock.warningMessage).toBe("WARNING_SERVER_TIME_ZONE_MISMATCH");
        });

        it("getLoginText should give proper value", function () {
            expect(scopeMock.logo).toBe("bahmni logo");
            expect(scopeMock.headerText).toBe("bahmni emr");
            expect(scopeMock.helpLink).toBe("192.168.33.10/homepage");
        });

        it('login', function () {
            scopeMock.login();
            expect(sessionService.loginUser.calls.count()).toBe(2);
            expect(sessionService.loadCredentials.calls.count()).toBe(1);
            expect(scopeMock.errorMessageTranslateKey).toBe(null);
            expect(mockBahmniCookieStore.remove.calls.count()).toBe(3);
            expect(mockBahmniCookieStore.remove).toHaveBeenCalledWith(Bahmni.Common.Constants.JSESSIONID, {
                path: '/',
                expires: 1
            });
        });

        it('audit log the successful login attempt', function () {
            scopeMock.loginInfo = { username: 'superman' };
            scopeMock.login();
            expect(sessionService.loginUser.calls.count()).toBe(2);
            expect(sessionService.loadCredentials.calls.count()).toBe(1);
            expect(auditLogService.log.calls.count()).toBe(1);
            expect(auditLogService.log).toHaveBeenCalledWith(undefined, 'USER_LOGIN_SUCCESS', undefined, 'MODULE_LABEL_LOGIN_KEY');
        });

        it('audit log the failed login attempt with username', function () {
            var fakeHttpGetPromise = {
                then: function (success, failure) {
                    failure();
                }
            };

            scopeMock.loginInfo = { username: 'superman' };
            var messageParams = {'userName': scopeMock.loginInfo.username};
            sessionService.loginUser.and.returnValue(fakeHttpGetPromise);
            scopeMock.login();
            expect(auditLogService.log.calls.count()).toBe(1);
            expect(auditLogService.log).toHaveBeenCalledWith(undefined, 'USER_LOGIN_FAILED', messageParams, 'MODULE_LABEL_LOGIN_KEY');
        });

        it('should not audit log the login attempt if logging is disabled', function () {
            scopeMock.loginInfo = { username: undefined };

            scopeMock.login();
            expect(auditLogService.log.calls.count()).toBe(0);
        });

        it('should not audit log the login attempt if username is undefined', function () {
            scopeMock.login();
            expect(auditLogService.log.calls.count()).toBe(0);
        });
    });

    it('should map only allowed locales ', function () {
        localeService.allowedLocalesList.and.returnValue(specUtil.simplePromise({data: "en"}));
        loginController();
        expect(scopeMock.locales).toEqual([{code: 'en', nativeName: 'English'}]);
    });

    it('should assign code when nativeName not found ', function () {
        localeService.allowedLocalesList.and.returnValue(specUtil.simplePromise({data: "it"}));
        loginController();
        expect(scopeMock.locales).toEqual([{code: 'it', nativeName: 'it'}]);
    });

    it ("should fetch bahmniCore data and assign it to windows object ",function() {
            loginController();
            var fakeHttpGetPromise = {
                then: function (success, failure) {
                    success({currentProvider : {uuid: "providerUuid"}});
                }
            };
            scopeMock.loginInfo = { username: 'superman', password: 'Admin123' };
            sessionService.loginUser.and.returnValue(fakeHttpGetPromise);
            mockBahmniCookieStore.get.and.returnValue("/ipd");
            scopeMock.login();
            expect(mockBahmniCookieStore.get).toHaveBeenCalled();
            expect(mockBahmniCookieStore.get.calls.count()).toBe(1);
    }); 
});
