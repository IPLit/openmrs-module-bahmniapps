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
                    var input = event.target;
                    var files = Array.prototype.slice.call(input.files || []);

                    scope.$apply(function () {
                        scope.fileChange({
                            file: files.length ? files[0] : null,
                            files: files
                        });
                    });
                });

                scope.$on('$destroy', function () {
                    element.off('change');
                });
            }
        };
    });
