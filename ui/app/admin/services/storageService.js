'use strict';

angular.module('bahmni.admin').service('storageService', ['$rootScope', '$http', '$q', function ($rootScope, $http, $q) {
    this.getUsedSpace = function () {
        var totalStorage = $rootScope.maxStorageSpace;
        var url = Bahmni.Common.Constants.storageUrl + Bahmni.Common.Constants.containerName;
            // Convert total storage to text

            // Replace this with your actual Docker API endpoint
        $http.get(url)
            .then(function (response) {
                var dockerData = response.data;
                // Extract relevant storage data from the Docker API response
                var containerName = dockerData.Name;
                var consumedSpaceStr = dockerData.StorageStats.Size;
                var consumedSpace = consumedSpaceStr.match(/(\d+)/);
                // Create a bar graph using Chart.js
                var ctx = document.getElementById('storageChart').getContext('2d');
                var chart = new Chart(ctx, {
                    type: 'bar', // Use 'bar' for a vertical bar graph
                    data: {
                        labels: [containerName],
                        datasets: [{
                            label: 'Consumed Space',
                            data: [consumedSpace[0]],
                            backgroundColor: 'rgba(98, 182, 98, 0.7)', // Green color for consumed space
                            borderWidth: 0,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Total Space',
                            data: [totalStorage],
                            backgroundColor: 'rgba(200, 200, 200, 0.3)', // Light gray for total space
                            borderWidth: 0,
                            yAxisID: 'y'
                        }]
                    },
                    options: {
                        scales: {
                            x: { // Use 'x' for horizontal axis (labels)
                                beginAtZero: true,
                                offset: true
                            },
                            y: { // Use 'y' for vertical axis (values)
                                beginAtZero: true,
                                position: 'right',
                                suggestedMax: totalStorage + 200, // Adjust the max value for better visualization
                                grid: {
                                    display: false
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: true
                            }
                        }
                    }
                });
            })
            .catch(function (error) {
                console.error('Error fetching data from Docker API:', error);
            });
    };
}]);
