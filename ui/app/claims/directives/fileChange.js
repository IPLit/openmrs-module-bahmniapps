'use strict';

angular.module('bahmni.claims')
    .directive('fileChange', function () {
        return {
            restrict: 'A',
            scope: {
                fileChange: '&'
            },
            link: function (scope, element) {
                element.on('change', function (event) {
                    var file = event.target.files &&
                        event.target.files.length
                        ? event.target.files[0]
                        : null;

                    scope.$apply(function () {
                        scope.fileChange({
                            file: file
                        });
                    });
                });

                scope.$on('$destroy', function () {
                    element.off('change');
                });
            }
        };
    });
