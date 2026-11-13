/***********************************************************************************************************************
 *  OpenStudio(R), Copyright (c) 2008-2020, Alliance for Sustainable Energy, LLC. All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 *  following conditions are met:
 *
 *  (1) Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *  disclaimer.
 *
 *  (2) Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *  following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 *  (3) Neither the name of the copyright holder nor the names of any contributors may be used to endorse or promote
 *  products derived from this software without specific prior written permission from the respective party.
 *
 *  (4) Other than as required in clauses (1) and (2), distributions in any form of modifications or other derivative
 *  works may not use the "OpenStudio" trademark, "OS", "os", or any other confusingly similar designation without
 *  specific prior written permission from Alliance for Sustainable Energy, LLC.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 *  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER, THE UNITED STATES GOVERNMENT, OR ANY CONTRIBUTORS BE LIABLE FOR
 *  ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 *  AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **********************************************************************************************************************/
import jetpack from 'fs-jetpack';
import os from 'os';
import path from 'path';
import { getEnv } from '../../env';
export class ReportsController {

  constructor($log, Project, $scope, Message) {
    'ngInject';

    const vm = this;
    vm.jetpack = jetpack;
    vm.os = os;
    vm.$log = $log;
    vm.$scope = $scope;
    vm.Project = Project;
    vm.env = getEnv(window.patBridge.appPath);
    vm.preloadPath = 'file://';
    vm.reportDir = Project.getProjectDir();
    vm.reportDirPath = path.resolve(vm.reportDir.path());
    vm.Message = Message;

    // data to pass to preloader script
    vm.$scope.datapoints = vm.Project.getDatapoints();
    if (vm.Message.showDebug()) vm.$log.debug('DATAPOINTS: ', vm.$scope.datapoints);
    vm.testResults = vm.$scope.datapoints;
    // get algorithmic results
    vm.selectedAnalysisType = vm.Project.getAnalysisType();
    vm.algorithmic_results = [];
    vm.algorithmic_metadata = [];
    if (vm.selectedAnalysisType == 'Algorithmic') {
      // load results
      vm.algorithmic_results = vm.Project.loadAlgorithmicResults('results');
      vm.algorithmic_metadata = vm.Project.loadAlgorithmicResults('metadata');
    }
    if (vm.Message.showDebug()) vm.$log.debug('Algorithmic RESULTS: ', vm.algorithmic_results);
    if (vm.Message.showDebug()) vm.$log.debug('Algorithmic METADATA: ', vm.algorithmic_metadata);

    // preload.js path depends on environment.  we need full path to file
    vm.$scope.preloadPath = `file://${window.patBridge.appPath}/scripts/preload.js`;

    if (vm.Message.showDebug()) vm.$log.debug('PRELOAD PATH: ', vm.$scope.preloadPath);

    // Find all possible reports
    var html_reports = [];
    if (vm.env && (vm.env.name == 'production')) {
      // This will resolve to the path to app.asaar
      var appDir = vm.jetpack.cwd(window.patBridge.appPath);
      html_reports = appDir.find('../projectReports', {matching: '*.html'});
    } else {
      html_reports = vm.jetpack.find('app/app/reports/projectReports', {matching: '*.html'});
    }
    vm.$scope.projectReports = [];
    _.forEach(html_reports, function (html_report) {
      var report = {};
      if (vm.os.platform() == 'win32') {
        report.name = html_report.split('\\').pop().replace('.html', '');
        report.url = html_report.replace('app\\app\\', 'app\\');//).replace("\\","/");
      } else {
        report.name = html_report.split('/').pop().replace('.html', '');
        report.url = html_report.replace('app/app/', 'app/');//).replace("\\","/");
        if (vm.Message.showDebug()) vm.$log.debug('REPORT name: ', report.name);
        if (vm.Message.showDebug()) vm.$log.debug('REPORT url: ', report.url);
      }

      vm.$scope.projectReports.push(report);
    });

    var wv = angular.element(document.getElementById('wv'));
    wv.attr('preload', vm.$scope.preloadPath);

    // Set the default project report to the summary table
    if (_.find(vm.$scope.projectReports, {name: 'Summary Table'})) {
      var defReport = _.find(vm.$scope.projectReports, {name: 'Summary Table'});
      vm.$scope.selectedReportName = defReport.name;
      vm.$scope.selectedReportURL = defReport.url;
      wv.attr('src', vm.$scope.selectedReportURL);
    } else {
      vm.$scope.selectedReportName = vm.$scope.projectReports[0].name;
      vm.$scope.selectedReportURL = vm.$scope.projectReports[0].url;
      wv.attr('src', vm.$scope.selectedReportURL);
    }

    // Update the selected report
    $scope.updateSelectedReport = function (newReportName) {
      _.forEach(vm.$scope.projectReports, function (report) {
        if (report.name == newReportName) {
          vm.$scope.selectedReportName = report.name;
          vm.$scope.selectedReportURL = report.url;

          wv.attr('src', vm.$scope.selectedReportURL);
        }
      });
      // pass data into webview when dom is ready
      angular.element(document).ready(() => {
        vm.passData();
      });
    };

    // Uncomment this to view webview developer tools to debug project reports
    // if (vm.env != 'production') {
    //   vm.openWebViewDevTools();
    // }

    // pass data into webview when dom is ready
    angular.element(document).ready(() => {
      vm.passData();
    });
  }

  // Opens the developer tools for the webview
  openWebViewDevTools() {
    var wv = document.getElementById('wv');
    wv.addEventListener('dom-ready', function () {
      console.log('Opening the dev tools for the webview.');
      wv.openDevTools();
    });
  }


  // pass Data to report.html
  passData() {
    const vm = this;
    var wv = document.getElementById('wv');

    wv.addEventListener('dom-ready', function () {
      wv.executeJavaScript(`setReportDir(${JSON.stringify(vm.reportDirPath)});`);
      wv.executeJavaScript(`setAlgorithmicData(${JSON.stringify(vm.algorithmic_metadata)}, ${JSON.stringify(vm.algorithmic_results)});`);
      wv.executeJavaScript(`setData(${JSON.stringify(vm.testResults)});`);
    });

  }

}
