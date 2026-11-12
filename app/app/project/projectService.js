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
//import os from 'os';
import path from 'path';
import jsZip from 'jszip';
import fs from 'fs';
import archiver from 'archiver';

export class Project {
  constructor($q, $log, $http, $uibModal, RemoteHelper, MeasureManager, $sce, Message, toastr, $translate) {
    'ngInject';
    const vm = this;
    vm.$log = $log;
    vm.jetpack = jetpack;
    vm.fs = fs;
    vm.jsZip = jsZip;
    vm.MeasureManager = MeasureManager;
    vm.dialog = RemoteHelper.dialog;
    vm.archiver = archiver;
    vm.$q = $q;
    vm.$http = $http;
    vm.$uibModal = $uibModal;
    vm.$sce = $sce;
    vm.Message = Message;
    vm.toastr = toastr;
    vm.$translate = $translate;

    vm.analysisTypes = ['Manual', 'Algorithmic'];

    vm.cliDebugTypes = [{value: '', label: 'false'}, {value: '--debug', label: 'true'}];
    vm.cliVerboseTypes = [{value: '', label: 'false'}, {value: '--verbose', label: 'true'}];

    vm.downloadReportsTypes = [{value: false, label: 'false'}, {value: true, label: 'true'}];
    vm.downloadOSMTypes = [{value: false, label: 'false'}, {value: true, label: 'true'}];
    vm.downloadOSWTypes = [{value: false, label: 'false'}, {value: true, label: 'true'}];
    vm.downloadZIPTypes = [{value: false, label: 'false'}, {value: true, label: 'true'}];
    vm.gemfileTypes = [{value: false, label: 'false'}, {value: true, label: 'true'}];

    vm.numberDPsToDisplay = 150;

    vm.reportTypes = [{
      id: 'Calibration Report',
      name: 'reports.type.calibrationReport'
    }, {
      id: 'Radiance Report',
      name: 'reports.type.radianceReport'
    }, {
      id: 'Parallel Coordinates',
      name: 'reports.type.parallelCoordinates'
    }, {
      id: 'Radar Chart',
      name: 'reports.type.radarChart'
    }, {
      id: 'EDAPT Export',
      name: 'reports.type.edaptExport'
    }];

    vm.samplingMethods = vm.setSamplingMethods();
    vm.runTypes = vm.setRunTypes();
    vm.algorithmOptions = vm.setAlgorithmOptions();
    vm.resetRemoteSettings();

    vm.clusters = [];
    vm.modified = false;
    vm.analysisType = null;
    vm.cliDebug = null;
    vm.cliVerbose = null;
    vm.downloadReports = null;
    vm.downloadOSW = null;
    vm.downloadOSM = null;
    vm.downloadZIP = null;
    vm.gemfile = null;
    vm.timeoutWorkflow = null;
    vm.timeoutUploadResults = null;
    vm.timeoutInitWorker = null;
    vm.reportType = null;
    vm.runType = vm.runTypes[0];
    vm.samplingMethod = vm.samplingMethods[0];
    vm.numberWorkers = null;
    vm.rubyMD5 = null;
    vm.mongoMD5 = null;
    vm.openstudioServerMD5 = null;
    vm.openstudioCLIMD5 = null;
    vm.openstudioMD5 = null;
    vm.projectDir = null;  // this is a jetpack object (like all other *Dir variables)
    vm.projectLocalResultsDir = null;
    vm.projectClustersDir = null;
    vm.projectName = null;
    vm.mongoDir = null;
    vm.logsDir = null;
    vm.projectMeasuresDir = null;
    vm.seedDir = null;
    vm.weatherDir = null;
    vm.seeds = [];
    vm.defaultSeed = null;
    vm.weatherFiles = [];
    vm.defaultWeatherFile = null;
    vm.algorithmSettings = [];
    vm.measures = [];
    vm.designAlternatives = [];
    vm.filesToInclude = [];
    vm.setServerScripts();

    vm.analysisID = '';
    vm.datapoints = [];

    const src = jetpack.cwd(window.patBridge.paths.userData);
    vm.railsDir = jetpack.dir(path.resolve(src.path() + '/openstudioServer/openstudio-server/server'));
    // aws path
    vm.awsDir = jetpack.dir(window.patBridge.paths.appData + '/.aws');
    if (vm.Message.showDebug()) vm.$log.debug('.aws dir location: ', vm.awsDir.path());

    // set my measures dir
    vm.MeasureManager.isReady().then(() => {
      vm.MeasureManager.getMyMeasuresDir().then(response => {
        if (angular.isUndefined(response.my_measures_dir)) {
          vm.$log.error('response.my_measures_dir undefined');
        }
        if (response.my_measures_dir) {
          vm.setMeasuresDir(response.my_measures_dir);
        }
        if (vm.Message.showDebug()) vm.$log.debug('My measures Dir: ', vm.myMeasuresDir.path());
      }, error => {
        vm.$log.error('Error in Measure Manager getMyMeasuresDir: ', error);
      });
    }, error => {
      vm.$log.error('Error in Measure Manager isReady function ', error);
    });

    // json objects
    vm.pat = {};
    vm.osa = {};
  }

  setDefaults() {
    const vm = this;
    vm.seeds = [];
    vm.weatherFiles = [];
    vm.setSeeds();
    vm.setWeatherFiles();
    vm.defaultSeed = vm.seeds.length > 0 ? vm.seeds[0] : null;
    vm.defaultWeatherFile = vm.weatherFiles.length > 0 ? vm.weatherFiles[0] : null;
    vm.seedsDropdownArr = [];
    vm.weatherFilesDropdownArr = [];
    vm.setSeedsDropdownOptions();
    vm.setWeatherFilesDropdownOptions();
    vm.filesToInclude = [];
    vm.setServerScripts();

    vm.analysisName = vm.getProjectName();
    vm.analysisType = 'Manual';
    vm.cliDebug = '';
    vm.cliVerbose = '';
    vm.downloadReports = true;
    vm.downloadOSW = true;
    vm.downloadOSM = true;
    vm.downloadZIP = true;
    vm.gemfile = false;
    vm.numberWorkers = 1;
    vm.timeoutWorkflow = 28800;
    vm.timeoutUploadResults = 28800;
    vm.timeoutInitWorker = 28800;
    vm.reportType = 'Calibration Report';
    vm.samplingMethod = vm.samplingMethods.length > 0 ? vm.samplingMethods[0] : null;
    vm.runType = vm.runTypes[0];
    vm.resetRemoteSettings();

    vm.algorithmSettings = [];
    vm.measures = [];
    vm.designAlternatives = [];
    vm.osa = {};

    vm.analysisID = '';
    vm.datapoints = [];

    vm.helmInfoShown = false;

    // TODO: still need these?
    vm.rubyMD5 = '';
    vm.mongoMD5 = '';
    vm.openstudioServerMD5 = '';
    vm.openstudioCLIMD5 = '';
    vm.openstudioMD5 = '';

  }

  // import from pat.json
  // TODO: add check to ensure that the measures really are in the PAT project folder and haven't been deleted
  // TODO: if measure is in pat dir but not in json, ignore
  // TODO: if measure is in pat dir, not in json, and user tries to add it, overwrite existing measure in dir? (currently it doesn't overwrite)
  initializeProject() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Project initializeProject');
    if (angular.isDefined(vm.projectName)) {
      const filename = vm.projectDir.path('pat.json');
      if (vm.Message.showDebug()) vm.$log.debug('filename: ', filename);
      // for new and existing projects
      vm.setDefaults();

      if (vm.jetpack.exists(filename)) {
        // existing project
        vm.pat = vm.jetpack.read(filename, 'json');
        if (vm.Message.showDebug()) vm.$log.debug('PAT.json: ', vm.pat);
        if (vm.Message.showDebug()) vm.$log.debug('filename: ', filename);

        vm.measures = vm.pat.measures;
        if (!angular.isDefined(vm.measures)) {
          vm.measures = [];
        }

        // recalculate measure_dir to point to this location (in case project moved/copied)
        _.forEach(vm.measures, (measure) => {
          // windows vs mac paths are different, and we can't assume this project was created on this os
          let path_parts = _.split(measure.measure_dir, '/');
          if (path_parts.length == 1) {
            // split again with other delimiter
            path_parts = _.split(measure.measure_dir, '\\');
            if (path_parts.length == 1){
              path_parts = _.split(measure.measure_dir, '\\\\');
            }
          }

          if (vm.Message.showDebug()) vm.$log.debug('PATH PARTS: ', path_parts);
          measure.measure_dir = vm.projectDir.path('measures', _.last(path_parts));
          measure.directory = measure.measure_dir;
        });

        if (vm.Message.showDebug()) vm.$log.debug('InitializeProject-measures with updated dir paths: ', vm.measures);

        vm.designAlternatives = vm.pat.designAlternatives;
        if (!angular.isDefined(vm.designAlternatives)) {
          vm.designAlternatives = [];
        }

        vm.analysisName = vm.pat.analysisName ? vm.pat.analysisName : vm.projectName;
        vm.analysisType = vm.pat.analysis_type ? vm.pat.analysis_type : vm.analysisType;
        vm.cliDebug = vm.pat.cliDebug ? vm.pat.cliDebug : vm.cliDebug;
        vm.cliVerbose = vm.pat.cliVerbose ? vm.pat.cliVerbose : vm.cliVerbose;
        vm.downloadReports = vm.pat.downloadReports ? vm.pat.downloadReports : vm.downloadReports;
        vm.downloadOSW = vm.pat.downloadOSW ? vm.pat.downloadOSW : vm.downloadOSW;
        vm.downloadOSM = vm.pat.downloadOSM ? vm.pat.downloadOSM : vm.downloadOSM;
        vm.downloadZIP = vm.pat.downloadZIP ? vm.pat.downloadZIP : vm.downloadZIP;
        vm.gemfile = vm.pat.gemfile ? vm.pat.gemfile : vm.gemfile;
        vm.timeoutWorkflow = vm.pat.timeoutWorkflow ? vm.pat.timeoutWorkflow : vm.timeoutWorkflow;
        vm.timeoutUploadResults = vm.pat.timeoutUploadResults ? vm.pat.timeoutUploadResults : vm.timeoutUploadResults;
        vm.timeoutInitWorker = vm.pat.timeoutInitWorker ? vm.pat.timeoutInitWorker : vm.timeoutInitWorker;
        vm.samplingMethod = vm.pat.samplingMethod ? vm.pat.samplingMethod : vm.samplingMethod;
        vm.defaultSeed = vm.pat.seed ? vm.pat.seed : vm.defaultSeed;
        vm.defaultWeatherFile = vm.pat.weatherFile ? vm.pat.weatherFile : vm.defaultWeatherFile;
        if (vm.Message.showDebug()) vm.$log.debug('vm.algorithmSettings: ', vm.algorithmSettings);
        if (vm.Message.showDebug()) vm.$log.debug('vm.pat.algorithmSettings: ', vm.pat.algorithmSettings);
        vm.algorithmSettings = vm.pat.algorithmSettings ? vm.pat.algorithmSettings : vm.algorithmSettings;
        vm.rubyMD5 = vm.pat.rubyMD5 ? vm.pat.rubyMD5 : vm.rubyMD5;
        vm.mongoMD5 = vm.pat.mongoMD5 ? vm.pat.mongoMD5 : vm.mongoMD5;
        vm.openstudioServerMD5 = vm.pat.openstudioServerMD5 ? vm.pat.openstudioServerMD5 : vm.openstudioServerMD5;
        vm.openstudioCLIMD5 = vm.pat.openstudioCLIMD5 ? vm.pat.openstudioCLIMD5 : vm.openstudioCLIMD5;
        vm.openstudioMD5 = vm.pat.openstudioMD5 ? vm.pat.openstudioMD5 : vm.openstudioMD5;
        vm.analysisID = vm.pat.analysisID ? vm.pat.analysisID : vm.analysisID;
        vm.datapoints = vm.pat.datapoints ? vm.pat.datapoints : vm.datapoints;
        vm.remoteSettings = vm.pat.remoteSettings ? vm.pat.remoteSettings : vm.remoteSettings;
        vm.serverScripts = vm.pat.serverScripts ? vm.pat.serverScripts : vm.serverScripts;
        vm.numberWorkers = vm.pat.numberWorkers ? vm.pat.numberWorkers : vm.numberWorkers;

        // filesToInclude
        // convert paths to platform-specific delimiters
        _.forEach(vm.pat.filesToInclude, (file) => {
          let path_parts = [];
          if (!_.isNil(file.dirToInclude) && !_.isNil(file.unpackDirName)){
            // first check for no leading dots (current directory)
            if (file.dirToInclude.substring(0, 2) !== '..')
              path_parts.push(file.dirToInclude);
            else {
              path_parts = _.split(file.dirToInclude, '/');
              if (path_parts.length === 1) {
                // split again with other delimiter
                path_parts = _.split(file.dirToInclude, '\\');
                if (path_parts.length === 1) {
                  path_parts = _.split(file.dirToInclude, '\\\\');
                }
              }
            }
            file.dirToInclude = path.join.apply(this, path_parts);
            if (vm.Message.showDebug()) vm.$log.debug('new file to include path: ', file.dirToInclude);
          }
        });
        vm.filesToInclude = vm.pat.filesToInclude ? vm.pat.filesToInclude : vm.filesToInclude;
      }
    } else {
      vm.$log.error('No project selected...cannot initialize project');
    }

    if (vm.Message.showDebug()) vm.$log.debug('Server Scripts: ', vm.serverScripts);

  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  savePrettyOptions() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Parse arguments and save Options hash to each measure');

    _.forEach(vm.measures, (measure) => {

      const options = [];
      // first find out how many options there are (from the optionDelete special argument)
      let optionKeys = [];
      if (!_.isNil(measure.arguments) && measure.arguments.length > 0) {
        const keys = Object.keys(measure.arguments[0]);
        optionKeys = _.filter(keys, (k) => {
          return k.indexOf('option_') !== -1;
        });
      }

      _.forEach(optionKeys, (key) => {

        const theOption = {};
        // option name and ID
        theOption.id = key;

        // set argument values
        theOption.arguments = [];
        _.forEach(measure.arguments, (argument) => {
          const theArg = {};
          if (argument.specialRowId == 'optionName') {
            theOption.name = argument[key];
          } else if (argument.specialRowId == 'optionDescription') {
            theOption.description = argument[key];
          }

          // get the row's value for key corresponding to the col's name
          // add to arguments array
          else if (!('specialRowId' in argument)) {
            if (key in argument) {
              theArg.name = argument.name;
              theArg.value = argument[key];
              theOption.arguments.push(theArg);
            } else {
              // check if argument is required
              if (argument.required) {
                // TODO: throw an error here: need a value for this argument in this option
                if (vm.Message.showDebug()) vm.$log.debug('ARG: ', argument.name, ' value left blank in option: ', theOption.name);
              }
            }
          }

        });
        options.push(theOption);
      });
      // save to measure
      measure.options = options;

    });

    if (vm.Message.showDebug()) vm.$log.debug('Measures with pretty options: ', vm.measures);

  }

  // computes all project measure arguments with selected seed
  // uses empty seed model otherwise
  computeAllMeasureArguments() {
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];

    if (vm.Message.showDebug()) vm.$log.debug('in Project computeAllMeasureArguments()');
    // const osmPath = (vm.defaultSeed == null) ? null : vm.seedDir.path(vm.defaultSeed);

    _.forEach(vm.measures, (measure) => {
      if (!_.isNil(measure.seed)) {
        if (vm.Message.showDebug()) vm.$log.debug(`computeAllMeasureArguments using unique seed for measure: ${measure}`);
      }
      // todo: ensure that this modifies the vm.measures directly
      const promise = vm.computeMeasureArguments(measure);
      promises.push(promise);
    });

    vm.$q.all(promises).then(() => {
      if (vm.Message.showDebug()) vm.$log.debug('ComputeAllMeasures resolved');
      deferred.resolve();
      vm.setModified(true);
    }, error => {
      vm.$log.error('ERROR in ComputeAllMeasures: ', error);
      deferred.reject(error);
    });

    // recalculate pretty options (not unless we modify the actual options themselves
    //vm.savePrettyOptions();

    return deferred.promise;

  }

  computeMeasureArguments(measure) {
    const vm = this;
    const deferred = vm.$q.defer();
    if (vm.Message.showDebug()) vm.$log.debug('in Project computeMeasureArguments()');
    let osmPath;
    if (_.isNil(vm.seedDir)) {
      vm.$log.warn('vm.seedDir is undefined. Computing measure arguments with empty seed model.');
      osmPath = null;
    } else if (_.isNil(measure.seed)) {
      vm.$log.warn('measure.seed is undefined. Computing measure arguments with empty seed model.');
      osmPath = null;
    } else {
      osmPath = vm.seedDir.path(measure.seed);
    }

    vm.MeasureManager.computeArguments(measure.measure_dir, osmPath).then((newMeasure) => {
      // merge with existing project measure
      if (vm.Message.showDebug()) vm.$log.debug('New computed measure: ', newMeasure);

      // remove arguments that no longer exist (by name) (in reverse) (except for special display args)
      _.forEachRight(measure.arguments, (arg, index) => {
        if (_.isUndefined(arg.specialRowId)) {
          const match = _.find(measure.arguments, {name: arg.name});
          if (_.isUndefined(match)) {
            measure.arguments.splice(index, 1);
          }
        }
      });
      // then add/merge (at argument level)
      _.forEach(newMeasure.arguments, (arg) => {
        const match = _.find(measure.arguments, {name: arg.name});
        if (_.isUndefined(match)) {
          measure.arguments.push(arg);
        } else {
          _.merge(match, arg);
        }
      });

      deferred.resolve(measure);

    }, error => {
      vm.$log.error('Error in MM computerArguments: ', error);
      deferred.reject();

    });

    return deferred.promise;

  }

  // export OSA
  exportOSA(selectedOnly = false) {
    const vm = this;
    vm.osaErrors = [];
    const deferred = vm.$q.defer();

    if (vm.Message.showDebug()) vm.$log.debug('In Project::exportOSA');
    if (vm.Message.showDebug()) vm.$log.debug('SelectedOnly? ', selectedOnly);

    vm.osa = {};
    vm.osa.analysis = {};
    vm.osa.analysis.display_name = vm.analysisName;
    vm.osa.analysis.name = vm.analysisName;

    if (/[.$\u20AC\xA3]/.test(vm.osa.analysis.name)){
      vm.$log.error('illegal character (.$€£) detected in analysis name: ', vm.osa.analysis.name);
      vm.osaErrors.push(`illegal character (.$€£) detected in analysis name: ${vm.osa.analysis.name}`);
    }

    if (vm.Message.showDebug()) vm.$log.debug(`Creating OSA for analysis named ${vm.analysisName}`);

    // first export common data
    vm.exportCommon();

    // check what kind of analysis it is
    if (vm.analysisType == 'Manual') {
      vm.exportManual(selectedOnly);
    } else {
      vm.exportAlgorithmic();
    }

    // reject if there are errors in osa
    if (vm.osaErrors.length > 0){
      deferred.reject(vm.osaErrors);
    } else {
      // export serverScripts
      vm.exportScripts();

      // write to file
      const filename = vm.projectDir.path(vm.analysisName + '.json');
      vm.jetpack.write(filename, vm.osa);
      if (vm.Message.showDebug()) vm.$log.debug('Project OSA file exported to ' + filename);

      const output = fs.createWriteStream(vm.projectDir.path(vm.analysisName + '.zip'));
      const archive = vm.archiver('zip');

      output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        deferred.resolve();
      });

      archive.on('error', function (err) {
        deferred.reject();
        throw err;
      });

      archive.pipe(output);

      archive.glob('**/*', {
        cwd: vm.projectMeasuresDir.path()
      }, {
        prefix: 'measures'
      });

      archive.glob('**/*', {
        cwd: vm.seedDir.path()
      }, {
        prefix: 'seeds'
      });

      archive.glob('**/*', {
        cwd: vm.weatherDir.path()
      }, {
        prefix: 'weather'
      });

      archive.glob('Gemfile', {
        cwd: vm.gemfileDir.path()
      });

      // add server scripts (if they exist)
      _.forEach(vm.serverScripts, (script, type) => {
        if (script.file) {
          const newType = _.includes(type, 'server') ? 'analysis' : 'data_point';
          archive.glob('**/*', {
            cwd: vm.projectDir.path('scripts', newType)
          }, {
            prefix: 'scripts/' + newType
          });
        }
      });

      // add files to include
      _.forEach(vm.filesToInclude, (file) => {
        if (file.dirToInclude) {

          if (!file.unpackDirName) {
            // use same name if no name is provided
            file.unpackDirName = file.dirToInclude.replace(/^.*[\\\/]/, '');
          }
          const absPath = path.resolve(vm.projectDir.path(), file.dirToInclude);
          if (vm.Message.showDebug()) vm.$log.debug('RESOLVED PATH: ', absPath, ' unpack DIR: ', file.unpackDirName);
          archive.glob('**/*', {
            cwd: absPath
          }, {
            prefix: 'lib/' + file.unpackDirName
          });
        }
      });

      archive.finalize();
    }

    return deferred.promise;
  }

  // export data common to both manual and algorithmic workflows
  exportCommon() {

    const vm = this;

    // these are all empty for manual / initialized for algorithmic
    vm.osa.analysis.output_variables = [];
    vm.osa.analysis.problem = {};
    vm.osa.analysis.problem.workflow = [];
    vm.osa.analysis.problem.algorithm = {objective_functions: []};

    vm.osa.analysis.seed = {};
    vm.osa.analysis.seed.file_type = 'OSM';
    vm.osa.analysis.seed.path = './seeds/' + vm.defaultSeed;
    vm.osa.analysis.weather_file = {};
    vm.osa.analysis.weather_file.file_type = 'EPW';
    vm.osa.analysis.weather_file.path = './weather/' + vm.defaultWeatherFile;
    vm.osa.analysis.file_format_version = 1;
    // add CLI args to OSA
    vm.osa.analysis.cli_debug = vm.cliDebug;
    vm.osa.analysis.cli_verbose = vm.cliVerbose;
    // add Server Download Args
    vm.osa.analysis.download_reports = vm.downloadReports;
    vm.osa.analysis.download_osw = vm.downloadOSW;
    vm.osa.analysis.download_osm = vm.downloadOSM;
    vm.osa.analysis.download_zip = vm.downloadZIP;
    // add Gemfile
    vm.osa.analysis.gemfile = vm.gemfile;
    // add timeout args to OSA
    vm.osa.analysis.run_workflow_timeout = vm.timeoutWorkflow;
    vm.osa.analysis.upload_results_timeout = vm.timeoutUploadResults;
    vm.osa.analysis.initialize_worker_timeout = vm.timeoutInitWorker;
    // server scripts (will only work on the cloud, but always put in OSA?)
    vm.osa.analysis.server_scripts = {};
    _.forEach(vm.serverScripts, (script, type) => {
      if (script.file) {
        vm.osa.analysis.server_scripts[type] = './scripts/' + type + '/' + script.file;
      }
    });

  }

  exportManual(selectedOnly = false) {
    const vm = this;

    if (vm.Message.showDebug()) vm.$log.debug('In Project::exportManual');
    if (vm.Message.showDebug()) vm.$log.debug('selectedONly? ', selectedOnly);

    //vm.osa.analysis.problem.analysis_type = 'batch_datapoints';
    vm.osa.analysis.problem.analysis_type = null;

    // go through measures and don't include those that are set to None across all DAs
    let selectedDAs = [];
    if (!selectedOnly) {
      selectedDAs = vm.designAlternatives;
    } else {
      _.forEach(vm.designAlternatives, (da) => {
        const dpMatch = _.find(vm.datapoints, {name: da.name});
        // do this for entire workflow or if matching datapoint is selected
        if (_.get(dpMatch, 'selected')) {
          selectedDAs.push(da);
        }
      });
    }

    const included_measures = [];
    _.forEach(vm.measures, (measure) => {
      let used = false;
      _.forEach(selectedDAs, (da) => {
        if (da[measure.name] !== 'None') {
          used = true;
        }
      });
      if (used) {
        included_measures.push(measure.name);
      }
    });

    if (vm.Message.showDebug()) vm.$log.debug('included measures:  ', included_measures);


    // DESIGN ALTERNATIVES ARRAY
    vm.osa.analysis.problem.design_alternatives = [];
    _.forEach(vm.designAlternatives, (da) => {
      const dpMatch = _.find(vm.datapoints, {name: da.name});
      // do this for entire workflow or if matching datapoint is selected
      if (!selectedOnly || (_.get(dpMatch, 'selected'))) {
        const da_hash = {};
        da_hash.name = da.name;

        // check validity of DA
        if (/[.$\u20AC\xA3]/.test(da_hash.name)){
          vm.$log.error('illegal character (.$€£) detected in design alternative name: ', da_hash.name);
          vm.osaErrors.push(`illegal character (.$€£) detected in design alternative name: ${da_hash.name}`);
        }

        da_hash.description = da.description;
        // add if other seed
        if (da.seedModel != vm.defaultSeed) {
          const seed = {};
          seed.file_type = 'OSM';
          seed.path = './seeds/' + da.seedModel;
          da_hash.seed = seed;
        }
        // add if other weather
        if (da.weatherFile != vm.defaultWeatherFile) {
          const weather = {};
          weather.file_type = 'EPW';
          weather.path = './weather/' + da.weatherFile;
          da_hash.weather_file = weather;
        }
        // add option names and descriptions (only for measures that aren't skipped across all DAs)
        const options = [];
        let measure_count = 0;
        _.forEach(vm.measures, (measure) => {
          if (included_measures.indexOf(measure.name) != -1) {
            const option = {};
            option.measure_name = measure.name;
            option.workflow_index = measure_count;
            // increment count
            measure_count += 1;
            option.name = da[measure.name];

            // check validity of option name
            if (/[.$\u20AC\xA3]/.test(option.name)){
              vm.$log.error('illegal character (.$€£) detected in option name: ', option.name);
              vm.osaErrors.push(`illegal character (.$€£) detected in option name: ${option.name}`);
            }

            if (option.name == 'None' || !option.name) {
              // use measure name/desc if no option
              option.name = measure.name;
              option.description = measure.description;
            }
            else {
              const opt = _.find(measure.options, {name: option.name});
              if (opt)
                option.description = opt.description;
              else
                option.description = measure.description;
            }
            options.push(option);
          }
        });

        da_hash.options = options;
        vm.osa.analysis.problem.design_alternatives.push(da_hash);
      }
    });

    // remove duplicates from osaErrors array
    vm.osaErrors = _.uniq(vm.osaErrors);

    // MEASURE DETAILS
    let measure_count = 0;
    let analysis_variables = 0;
    let atLeastOneSkip = false;
    _.forEach(vm.measures, (measure) => {
      // ONLY INCLUDE if measure has options set AND if at least 1 option is added to a DA
      let measureAdded = false;
      // go through alternatives, also see if need skip
      const vars = [];
      _.forEach(vm.designAlternatives, (da) => {
        const dpMatch = _.find(vm.datapoints, {name: da.name});
        // do this for entire workflow or if matching datapoint is selected
        if (!selectedOnly || (_.get(dpMatch, 'selected'))) {
          if (da[measure.name] == 'None' || _.isUndefined(da[measure.name])) {
            vars.push(true);
          } else {
            vars.push(false);
            measureAdded = true; // measure option is added to at least 1 DA
          }
        }
      });
      if (vm.Message.showDebug()) vm.$log.debug('Measure: ', measure.name, ', numOfOptions: ', measure.numberOfOptions, ' measure added to at least 1 DA? ', measureAdded);
      if (measure.numberOfOptions > 0 && measureAdded) {
        const m = {};
        m.name = measure.name;
        m.display_name = measure.display_name;
        m.measure_type = vm.getMeasureType(measure);
        m.measure_definition_class_name = measure.className;
        //m.measure_definition_measureUID = measure.colDef.measureUID;

        const mdir = vm.getMeasureBaseDir(measure);
        m.measure_definition_directory = './measures/' + mdir;
        m.measure_definition_directory_local = measure.measure_dir;
        m.measure_definition_class_name = measure.class_name;
        m.measure_definition_display_name = measure.display_name;
        m.measure_definition_name = measure.name;
        m.measure_definition_name_xml = null;
        m.measure_definition_uuid = measure.uid;
        m.measure_definition_version_uuid = measure.version_id;

        // adding these to support EDAPT reporting
        m.uuid = measure.uid;
        m.version_uuid = measure.version_id;
        m.description = measure.description; // TODO: verify this works in JSON (could have line breaks and other special characters)
        m.taxonomy = measure.tags;

        // first find out how many options there are
        let optionKeys = [];
        //if (measure.arguments.length > 0) {
        const keys = Object.keys(measure.arguments[0]);
        optionKeys = _.filter(keys, (k) => {
          return k.indexOf('option_') !== -1;
        });
        //}

        // VARIABLES
        let var_count = 0;
        m.variables = [];

        // ARGUMENTS
        m.arguments = [];
        // This portion only has arguments that don't have the variable box checked
        _.forEach(measure.arguments, (arg) => {
          if (
            (_.isUndefined(arg.specialRowId) || (angular.isDefined(arg.specialRowId) && arg.specialRowId.length === 0)) &&
            (_.isUndefined(arg.variable) || arg.variable === false)
          ) {
            if (vm.Message.showDebug()) vm.$log.debug(arg.name, ' is an ARGUMENT, not variable');
            const argument = vm.makeArgument(arg);

            if ((argument.value === '' || _.isNil(argument.value)) && arg.required) {
              vm.$log.error(arg.name, ' value is \'\', this will most likely cause errors on server');
              vm.osaErrors.push(`measure '${measure.display_name}' required argument '${arg.name}' value is nil or blank`);
            }

            if (!arg.required && (argument.value === '' || _.isNil(argument.value))){
              // don't send optional incomplete/null arguments
              vm.$log.info('Info: Not pushing optional argument ', argument.display_name, ' to json because it is not set.');
            }
            else if (argument.display_name && argument.display_name_short && argument.name && argument.value_type && !_.isNil(argument.value)) {
              // make sure argument is complete
              var_count += 1;
              m.arguments.push(argument);
              if (vm.Message.showDebug()) vm.$log.debug('argument: ', argument);
            } else {
              vm.$log.error('Not pushing partial argument to json. Fix partial argument: ', argument);
              if (!argument.display_name || !argument.display_name_short || !argument.name || !argument.value_type){
                vm.osaErrors.push(`measure '${measure.display_name}' argument '${arg.name}' is missing a value for display_name, display_name_short, name, or value_type`);
              }
            }
          }
        });

        // need a __SKIP__ argument
        if (_.includes(vars, true)) {
          atLeastOneSkip = true;
          const v = vm.makeSkip(measure);

          const valArr = [];
          _.forEach(vars, (skip) => {
            valArr.push({value: skip, weight: 1 / vars.length});
          });

          v.uncertainty_description.attributes.push({name: 'discrete', values_and_weights: valArr});
          v.workflow_index = var_count;
          var_count += 1;
          m.variables.push(v);
        }

        let DAlength = null;
        if (selectedOnly) {
          DAlength = _.filter(vm.datapoints, {selected: true}).length;
        } else {
          DAlength = vm.designAlternatives.length;
        }
        // Variable arguments
        _.forEach(measure.arguments, (arg) => {
          if (((_.isUndefined(arg.specialRowId)) || (angular.isDefined(arg.specialRowId) && arg.specialRowId.length === 0)) && (arg.variable === true)) {
            if (vm.Message.showDebug()) vm.$log.debug('Project::exportManual variable: ', arg.name);
            // see what arg is set to in each design alternative
            const valArr = [];
            let option_id;

            // update total analysis variable count
            analysis_variables += 1;

            _.forEach(vm.designAlternatives, (da) => {
              const dpMatch = _.find(vm.datapoints, {name: da.name});
              // do this for entire workflow or if matching datapoint is selected
              if (!selectedOnly || (dpMatch && dpMatch.selected)) {
                if (vm.Message.showDebug()) vm.$log.debug('Project::exportManual da: ', da);
                if (da[measure.name] == 'None') {
                  if (vm.Message.showDebug()) vm.$log.debug('value: None');
                  // when set to 'None', sub a value of the right type
                  if (vm.Message.showDebug()) vm.$log.debug('default_value for this arg: ', arg.default_value);
                  let the_value = arg.default_value;
                  if (_.isNil(the_value)) {
                    // if no default value, use first option value, otherwise set to None
                    the_value = !_.isNil(arg.option_1) ? arg.option_1 : 'None';
                    if (vm.Message.showDebug()) vm.$log.debug('option1 value for this arg: ', arg.option_1);
                  }
                  if (vm.Message.showDebug()) vm.$log.debug('!! value for argument: ', arg.name, ' was set to: ', the_value);
                  valArr.push({value: the_value, weight: 1 / DAlength});

                } else {
                  const option_name = da[measure.name];
                  if (vm.Message.showDebug()) vm.$log.debug('arg: ', arg);
                  if (vm.Message.showDebug()) vm.$log.debug('option_name: ', option_name);
                  if (vm.Message.showDebug()) vm.$log.debug('MEASURE', measure);
                  // retrieve the option ID from the option_name in measure.options
                  _.forEach(measure.options, (option) => {
                    if (option.name == option_name) {
                      option_id = option.id;
                    }
                  });
                  if (vm.Message.showDebug()) vm.$log.debug('arg[option_id]: ', arg[option_id]);
                  // check that you have a value here...if not error
                  if (_.isNil(arg[option_id])) {
                    vm.$log.error('Option: ', option_name, 'for argument: ', arg.name, ' in measure: ', measure.display_name, ' does not have a value. Analysis will error.');
                    vm.osaErrors.push(`Measure '${measure.display_name}' argument '${arg.name}' does not have a value for option '${option_name}'`);
                  }
                  valArr.push({value: arg[option_id], weight: 1 / DAlength});
                }
              }
            });

            const values = _.values(_.pick(arg, optionKeys));

            const min = _.min(values),
              max = _.max(values);

            const mode = function mode(ar) {
              const numMapping = {};
              let greatestFreq = 0;
              let currentMode = 0;
              ar.forEach(function findMode(number) {
                numMapping[number] = (numMapping[number] || 0) + 1;

                if (greatestFreq < numMapping[number]) {
                  greatestFreq = numMapping[number];
                  currentMode = number;
                }
              });
              return +currentMode;
            };

            arg.units = '';
            arg.minimum = min;
            arg.maximum = max;
            arg.mode = mode(values);

            // VARIABLE ARGUMENT SECTION
            const v = {};
            v.argument = vm.makeArgument(arg);
            vm.$log.info(arg.choice_display_names);
            v.argument.choice_display_names = arg.choice_display_names;

            // VARIABLE DETAILS
            v.display_name = arg.display_name;  // same as arg
            v.display_name_short = arg.display_name;
            v.variable_type = 'variable'; //this is always 'variable'
            v.units = arg.units;
            v.minimum = arg.minimum;  // TODO: must be alphabetically ordered if string, otherwise standard order (pick from option values mean must be btw min and max, and max > min)
            v.maximum = arg.maximum;  // TODO: must be alphabetically ordered
            v.relation_to_output = null;
            v.static_value = v.argument.value;
            v.uuid = '';
            v.version_uuid = '';
            v.variable = true; // this is always true
            v.uncertainty_description = {};
            v.uncertainty_description.type = 'discrete'; //use "discrete" always for manual.  options are triangle, uniform, discrete, and normal.
            v.uncertainty_description.attributes = [];

            v.uncertainty_description.attributes.push({name: 'discrete', values_and_weights: valArr});
            v.uncertainty_description.attributes.push({name: 'lower_bounds', value: arg.minimum});  // minimum
            v.uncertainty_description.attributes.push({name: 'upper_bounds', value: arg.maximum});  // maximum
            if (valArr.length > 0) {
              if (vm.Message.showDebug()) vm.$log.debug('Setting attribute');
              v.uncertainty_description.attributes.push({name: 'modes', value: arg.mode}); // TODO: use minimum? or fake-calculate a mode btw min and max and of right type
            } else {
              if (vm.Message.showDebug()) vm.$log.debug('Skipping attribute');
            }
            v.uncertainty_description.attributes.push({name: 'delta_x', value: null});
            v.uncertainty_description.attributes.push({name: 'stddev', value: null});

            v.workflow_index = var_count;
            var_count += 1;

            m.variables.push(v);
          }
        });

        m.workflow_index = measure_count;
        measure_count += 1;
        // push measure to OSA
        vm.osa.analysis.problem.workflow.push(m);
      } // end if measure has options or is used
    });

    if (analysis_variables == 0 && !atLeastOneSkip){
      // error: must have at least one variable to run a PAT analysis

      vm.$log.error('You need at least 1 variable set on the analysis tab or 1 measure set to \'None\' in a design alternative in order to run an analysis');
      vm.osaErrors.push('You need at least 1 variable set on the analysis tab or 1 measure set to \'None\' in a design alternative in order to run an analysis');

    }

  }

  exportAlgorithmic() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('In Project::exportAlgorithmic');

    // ALGORITHM SETTINGS
    vm.osa.analysis.problem.analysis_type = vm.samplingMethod.id.toLowerCase();
    vm.osa.analysis.problem.algorithm = {};
    _.forEach(vm.algorithmSettings, (setting) => {
      if (setting.name === 'r2'){
        // exception
        vm.osa.analysis.problem.algorithm[setting.name] = setting.value;
      }
      else {
        vm.osa.analysis.problem.algorithm[_.snakeCase(setting.name)] = setting.value;
      }
    });

    // ensure # of levels is at least 2 for Morris algorithm
    if (vm.samplingMethod.id === 'morris' && vm.osa.analysis.problem.algorithm.levels < 2){
      vm.$log.error('This algorithm\'s \'levels\' setting (defined on the analysis tab) needs a value of at least 2 to run successfully');
      vm.osaErrors.push('This algorithm\'s \'levels\' setting (defined on the analysis tab) needs a value of at least 2 to run successfully');
    }

    // OUTPUTS
    let groupFlag = false;
    if (['nsga_nrel', 'spea_nrel', 'morris', 'sobol', 'fast99', 'ga', 'gaisl'].indexOf(vm.samplingMethod.id) != -1) {
      // this sampling method supports groups
      groupFlag = true;
    }

    // flatten outputs & order
    let tempOutputs = [];
    _.forEach(vm.measures, (measure) => {
      _.forEach(measure.analysisOutputs, (out) => {
        out.measure_name = measure.name;
        out.measure_class_name = measure.class_name;
        out.measure_uid = measure.uid;
        tempOutputs.push(out);
      });
    });

    // Output short names must be unique or server errors out
    let tt = angular.copy(tempOutputs);
    let tt_uniq = _.uniqBy(tt, 'short_name');
    if (tt_uniq.length != tt.length) {
      vm.$log.error('Output short names must be unique. Please correct on the Outputs tab.');
      vm.osaErrors.push('Output short names must be unique. Please correct on the Outputs tab.');
    }

    if (groupFlag) {
      tempOutputs = _.sortBy(tempOutputs, ['obj_function_group']);
      // check objective function groups number for algorithms
      let groups = _.map(tempOutputs, 'obj_function_group');
      groups = _.filter(groups, function(o) { return !_.isNil(o); });
      if (vm.Message.showDebug()) vm.$log.debug('GROUPS: ', groups);
      if (groups.length < 2) {
        vm.$log.error('This algorithm needs at least 2 objective function groups defined on the outputs tab to run successfully.');
        vm.osaErrors.push('This algorithm needs at least 2 objective function groups defined on the outputs tab to run successfully');
        // vm.$translate('toastr.objFunctionGroupError').then(translation => {
        //   vm.toastr.warning(translation);
        // });
      }

    }
    if (vm.Message.showDebug()) vm.$log.debug('tempOutputs sorted: ', tempOutputs);

    vm.osa.analysis.output_variables = vm.makeOutputs(tempOutputs, groupFlag);

    // add objective function NEW names to algorithm section
    vm.osa.analysis.problem.algorithm.objective_functions = _.map(_.filter(vm.osa.analysis.output_variables, {objective_function: true}), 'name');
    if (!vm.osa.analysis.problem.algorithm.objective_functions) {
      vm.osa.analysis.problem.algorithm.objective_functions = [];
    }

    // MEASURE DETAILS
    let analysis_variables = 0;



    let measure_count = 0;
    _.forEach(vm.measures, (measure) => {
      // for algorithmic workflows, don't add SKIPPED measure to JSON
      if (!measure.skip){
        const m = {};
        m.name = measure.name;
        m.display_name = measure.display_name;

        m.measure_type = vm.getMeasureType(measure);

        m.measure_definition_class_name = measure.className;
        //m.measure_definition_measureUID = measure.colDef.measureUID;

        const mdir = vm.getMeasureBaseDir(measure);
        m.measure_definition_directory = './measures/' + mdir;
        m.measure_definition_directory_local = measure.measure_dir;
        m.measure_definition_class_name = measure.class_name;
        m.measure_definition_display_name = measure.display_name;
        m.measure_definition_name = measure.name;
        m.measure_definition_name_xml = null;
        m.measure_definition_uuid = measure.uid;
        m.measure_definition_version_uuid = measure.version_id;

        // adding these to support EDAPT reporting
        m.uuid = measure.uid;
        m.version_uuid = measure.version_id;
        m.description = measure.description;
        m.taxonomy = measure.tags;

        // ARGUMENTS
        m.arguments = [];
        // This portion only has arguments that don't have the variable box checked
        _.forEach(measure.arguments, (arg) => {
          // if argument is set to 'Argument' or if the variable setting is not supported by selected algorithm
          // also remove special row IDs if they are there
          if (_.isUndefined(arg.specialRowId) || (angular.isDefined(arg.specialRowId) && arg.specialRowId.length === 0)){
            if ((!arg.inputs || !arg.inputs.variableSetting || arg.inputs.variableSetting == 'Argument') || (arg.inputs.showWarningIcon)) {
              if (vm.Message.showDebug()) vm.$log.debug(arg.name, ' treated as ARGUMENT');
              const argument = vm.makeArgument(arg);
              if ((argument.value === '' || _.isNil(argument.value)) && arg.required) {
                vm.$log.error(arg.name, ' value is \'\', this will most likely cause errors on server. value is: ', argument.value);
                vm.osaErrors.push(`measure '${measure.display_name}' required argument '${arg.name}' value is nil or blank.  value: ${argument.value}, blank?: ${argument.value == ''}, nil? ${_.isNil(argument.value)}`);
              }

              if (!arg.required && (argument.value === '' || _.isNil(argument.value))){
                // don't send optional incomplete/null arguments
                vm.$log.info('Info: Not pushing optional argument ', argument.display_name, ' to json because it is not set.');
              }
              else if (argument.display_name && argument.display_name_short && argument.name && argument.value_type && !_.isNil(argument.value)) {
                // Make sure that argument is "complete"
                measure_count += 1;
                m.arguments.push(argument);
              } else {
                vm.$log.error('Not pushing partial argument to json.  Fix partial argument: ', argument);
                if (!argument.display_name || !argument.display_name_short || !argument.name || !argument.value_type){
                  vm.osaErrors.push(`measure '${measure.display_name}' argument '${arg.name}' is missing a value for display_name, display_name_short, name, or value_type`);
                }
              }
            }
          }
        });

        // VARIABLES
        let var_count = 0;
        m.variables = [];

        // TODO: implement a way to sample skipping a measure (On/Off)

        // Variable arguments
        _.forEach(measure.arguments, (arg) => {
          if (arg.inputs && arg.inputs.variableSetting && arg.inputs.variableSetting != 'Argument' && !arg.inputs.showWarningIcon) {
            if (vm.Message.showDebug()) vm.$log.debug('Project::exportAlgorithmic variable arg: ', arg);

            // VARIABLE ARGUMENT SECTION
            const v = {};
            v.argument = vm.makeArgument(arg);

            vm.$log.info(arg.choice_display_names);
            v.argument.choice_display_names = arg.choice_display_names;  // TODO: not sure about this?

            // VARIABLE DETAILS
            v.display_name = arg.display_name;  // same as arg
            v.display_name_short = arg.display_name_short;
            v.variable_type = (arg.inputs.variableSetting == 'Pivot') ? 'pivot' : 'variable'; // this is 'variable' or 'pivot'
            v.units = arg.units;
            v.minimum = arg.inputs.minimum;
            v.maximum = arg.inputs.maximum;
            v.relation_to_output = arg.relationship;
            v.static_value = v.argument.value;
            v.uuid = '';
            v.version_uuid = '';
            if (arg.inputs.variableSetting == 'Pivot') {
              v.pivot = true;
            } else {
              v.variable = true;
            }
            v.uncertainty_description = {};
            // pivots can be discrete or integer_sequence_uncertain (handled in analysis controller)
            // options are triangle, uniform, discrete, and normal, integer_sequence_uncertain
            if ((arg.inputs.variableSetting == 'Discrete' || arg.inputs.variableSetting == 'Pivot') && arg.inputs.distribution != 'Integer Sequence') {
              v.uncertainty_description.type = 'discrete';
            } else {
              v.uncertainty_description.type = arg.inputs.distribution == 'Integer Sequence' ? 'integer_sequence' : arg.inputs.distribution.toLowerCase();
            }
            v.uncertainty_description.attributes = [];

            // if discrete or pivot, make values and weights array (unless integer_sequence)
            if ((arg.inputs.variableSetting == 'Pivot' || arg.inputs.variableSetting == 'Discrete') && arg.inputs.distribution != 'Integer Sequence') {
              const valArr = vm.makeDiscreteValuesArray(arg.inputs.discreteVariables);

              // check that discrete values are unique
              const tempVals = _.map(valArr, 'value');
              const tempUniqVals = _.uniq(tempVals);
              if (tempVals.length != tempUniqVals.length) {
                vm.$log.error(`Discrete variable values must all be unique in measure: ${measure.display_name}, variable: ${v.display_name}`);
                vm.osaErrors.push(`Discrete variable values must all be unique in measure: ${measure.display_name}, variable: ${v.display_name}`);
              }

              v.uncertainty_description.attributes.push({name: 'discrete', values_and_weights: valArr});
            }

            // TODO: if any of these don't exist, set to inputs.default_value
            v.uncertainty_description.attributes.push({name: 'lower_bounds', value: arg.inputs.minimum});  // minimum
            v.uncertainty_description.attributes.push({name: 'upper_bounds', value: arg.inputs.maximum});  // maximum

            // special case for integer_sequence
            if (arg.inputs.distribution == 'Integer Sequence') {
              v.uncertainty_description.attributes.push({name: 'modes', value: 1}); // mean
            } else {
              v.uncertainty_description.attributes.push({name: 'modes', value: arg.inputs.mean}); // mean
            }

            v.uncertainty_description.attributes.push({name: 'delta_x', value: arg.inputs.deltaX}); // delta x
            v.uncertainty_description.attributes.push({name: 'stddev', value: arg.inputs.stdDev});  // std dev

            v.workflow_index = var_count;
            var_count += 1;
            if (v.variable_type == 'variable'){
              analysis_variables += 1;
            }
            m.variables.push(v);
          }
        });

        m.workflow_index = measure_count;
        measure_count += 1;
        // push measure to OSA
        vm.osa.analysis.problem.workflow.push(m);

      }
    });

    // ensure at least 2 variables for certain algorithms
    if (analysis_variables < 2 && ['nsga_nrel', 'doe'].indexOf(vm.samplingMethod.id) != -1) {

      vm.$log.error('This algorithm needs at least 2 variables defined on the analysis tab to run successfully.');
      vm.osaErrors.push('This algorithm needs at least 2 variables defined on the analysis tab to run successfully');
      // vm.$translate('toastr.numberVariablesError').then(translation => {
      //   vm.toastr.warning(translation);
      // });
    }
  }


  makeDiscreteValuesArray(discreteVariables) {
    const vm = this;
    const valArr = [];
    _.forEach(discreteVariables, (valueHash) => {
      valArr.push({value: valueHash.value, weight: valueHash.weight});
    });

    // TODO: more complicated weighting scheme?
    let weightSum = 0;
    _.forEach(valArr, (valueHash) => {
      if (vm.Message.showDebug()) vm.$log.debug('weight: ', parseFloat(valueHash.weight));

      if (vm.isNumeric(valueHash.weight)) {
        if (vm.Message.showDebug()) vm.$log.debug('weight for ', valueHash.value);
        valueHash.weight = parseFloat(valueHash.weight);
        weightSum = weightSum + valueHash.weight;
      }
    });
    if (vm.Message.showDebug()) vm.$log.debug('current weight sum: ', weightSum);

    if (weightSum > 1) {
      vm.$log.error('ERROR: weights do not add up to 1');
      // TODO: what to do here?
    }

    let missingCount = 0;
    _.forEach(valArr, (valueHash) => {
      if (!vm.isNumeric(valueHash.weight)) {
        missingCount = missingCount + 1;
      }
    });
    if (vm.Message.showDebug()) vm.$log.debug('missing count: ', missingCount);

    if (missingCount > 0) {
      if (vm.Message.showDebug()) vm.$log.debug('calculating missing weights');
      const weightVal = (1 - weightSum) / missingCount; // TODO: limit
      if (vm.Message.showDebug()) vm.$log.debug('calculated weight Val: ', weightVal);
      _.forEach(valArr, (valueHash) => {
        if (!vm.isNumeric(valueHash.weight)) {
          valueHash.weight = weightVal;
        }
      });
    }

    if (vm.Message.showDebug()) vm.$log.debug('Final discrete values array: ', valArr);
    return valArr;
  }

  isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  getMeasureType(measure) {
    // measure types: ModelMeasure, EnergyPlusMeasure, ReportingMeasure
    // OSA wants: Ruby, EnergyPlus, Reporting
    let type = null;
    if (measure.type === 'ModelMeasure') {
      //type = 'Ruby';
      type = 'RubyMeasure';
    } else if (measure.type === 'EnergyPlusMeasure') {
      //type = 'EnergyPlus';
      type = 'EnergyPlusMeasure';
    } else if (measure.type === 'ReportingMeasure') {
      //type = 'Reporting';
      type = 'ReportingMeasure';
    } else {
      type = 'unknown';
    }
    return type;
  }

  makeOutputs(outputs, groupFlag) {
    const vm = this;
    let index = 0;
    let currentGroup = null;
    const finalOutputs = [];
    _.forEach(outputs, (out) => {
      if (vm.Message.showDebug()) vm.$log.debug('OUTPUT: ', out);
      const outHash = {};
      outHash.units = out.units;
      outHash.objective_function = out.objective_function == 'true';  // true or false
      // only set following fields if object_function is true, otherwise null
      if (outHash.objective_function) {

        if (outHash.objective_function) {
          if (groupFlag) {
            if (out.obj_function_group == null) {
              if (currentGroup) {
                // get out of group and increment
                currentGroup = null;
                index = index + 1;
              }
              outHash.objective_function_index = index;
              index = index + 1;
            } else {
              // group defined
              if (currentGroup == out.obj_function_group) {
                // same group, don't increment
                outHash.objective_function_index = index;

              } else if (currentGroup == null) {
                // no group, assign, don't increment
                currentGroup = out.obj_function_group;
                outHash.objective_function_index = index;

              } else {
                // currentGroup != obj_function_group
                // change group, increment
                currentGroup = out.obj_function_group;
                index = index + 1;
                outHash.objective_function_index = index;
              }
            }
          } else {
            outHash.objective_function_index = index;
            // increment
            index = index + 1;
          }
        } else {
          outHash.objective_function_index = null;
        }
        outHash.objective_function_target = vm.typeTargetValue(out.target_value, out.type);
        outHash.objective_function_group = out.obj_function_group ? out.obj_function_group : null;
        outHash.scaling_factor = out.weighting_factor ? out.weighting_factor : null;
      } else {
        outHash.objective_function_index = null;
        outHash.objective_function_target = null;
        outHash.objective_function_group = null;
        outHash.scaling_factor = null;
      }
      outHash.display_name = out.display_name;
      outHash.display_name_short = out.short_name;
      outHash.metadata_id = null; // always null for now.  This is related to DEnCity?

      // new (and hopefully final): ensure name includes measure_name.'
      const measureClassName = _.upperFirst(_.camelCase(out.measure_class_name));
      const measureName = out.measure_name;
      if (_.includes(out.name, measureClassName + '.')){
        // this is the old way, rip it out to maintain backwards compatibility
        out.name = out.name.replace(measureClassName + '.', '');
      }

      if (!_.startsWith(out.name, measureName + '.')){
        outHash.name = measureName + '.' + out.name;
      } else {
        outHash.name = out.name;
      }

      outHash.visualize = out.visualize == 'true';
      outHash.export = true; // always true
      outHash.variable_type = vm.convertType(out.type);
      finalOutputs.push(outHash);
    });

    return finalOutputs;
  }

  getMeasureBaseDir(measure) {
    const vm = this;
    let mdir = '';
    // windows path vs. mac
    if (measure.measure_dir.indexOf('/') != -1) {
      // correct paths
      mdir = _.last(_.split(measure.measure_dir, '/'));
    } else {
      // assume windows paths '\\'
      mdir = _.last(_.split(measure.measure_dir, '\\'));
    }
    if (vm.Message.showDebug()) vm.$log.debug('***MEASURE DIR NAME: ', mdir);
    return mdir;
  }

  makeArgument(arg) {
    const vm = this;
    const argument = {};
    argument.display_name = arg.display_name;
    argument.display_name_short = arg.display_name_short ? arg.display_name_short : arg.name;
    argument.name = arg.name;
    argument.value_type = vm.convertType(arg.type);
    argument.default_value = arg.default_value;
    if (vm.analysisType == 'Manual') {
      // get first option
      let optionKeys = [];
      const keys = Object.keys(arg);
      optionKeys = _.filter(keys, (k) => {
        return k.indexOf('option_') !== -1;
      });

      if (arg.required) {
        argument.value = optionKeys.length > 0 ? arg[optionKeys[0]] : arg.default_value;
      } else {
        // if optional and empty string (''), set to null (it was probably set to '' artificially by analysis controller
        // TODO might have to fix this - check if can handle this in OSA
        argument.value = optionKeys.length > 0 && (arg[optionKeys[0]] === '' || _.isNil(arg[optionKeys[0]])) ? null : arg[optionKeys[0]];
      }
    } else {
      if (arg.required){
        argument.value = (arg.inputs && !_.isNil(arg.inputs.default_value)) ? arg.inputs.default_value : arg.default_value;
      } else {
        // if optional and empty string st to null
        argument.value = arg.inputs && !_.isNil(arg.inputs.default_value) ? arg.inputs.default_value : null;
      }
    }
    // ** copy value to default_value if no default_value is present
    if (_.isNil(argument.default_value) || argument.default_value === ''){
      argument.default_value = argument.value;
    }

    return argument;
  }

  convertType(type){
    let newType = null;
    if (_.toUpper(type) === 'CHOICE' || _.toUpper(type) === 'STRING') {
      newType = 'string';
    } else if (_.toUpper(type) === 'DOUBLE') {
      newType = 'double';
    } else if (_.toUpper(type) === 'INTEGER') {
      newType = 'integer';
    } else if (_.toUpper(type) === 'BOOLEAN' || _.toUpper(type) === 'BOOL'){
      newType = 'boolean';
    }
    return newType;
  }

  makeSkip(measure) {
    const v = {
      argument: {
        display_name: 'Skip ' + measure.display_name,
        display_name_short: 'Skip entire measure',
        name: '__SKIP__',
        value_type: 'boolean',
        default_value: false,
        value: false
      },
      display_name: 'Skip ' + measure.display_name,
      display_name_short: 'Skip entire measure',
      variable_type: 'variable',
      units: null,
      minimum: false,
      maximum: true,
      relation_to_output: null,
      static_value: false,
      variable: true,
      uncertainty_description: {
        attributes: [],
        type: 'discrete'
      }
    };

    v.uncertainty_description.attributes.push({name: 'discrete', values_and_weights: []});
    v.uncertainty_description.attributes.push({name: 'lower_bounds', value: false});
    v.uncertainty_description.attributes.push({name: 'upper_bounds', value: false});
    v.uncertainty_description.attributes.push({name: 'modes', value: false});
    v.uncertainty_description.attributes.push({name: 'delta_x', value: null});
    v.uncertainty_description.attributes.push({name: 'stddev', value: null});

    return v;
  }

  exportScripts() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('exporting server scripts');
    _.forEach(vm.serverScripts, (script, type) => {
      // if (vm.Message.showDebug()) vm.$log.debug('type: ', type, 'scriptdata: ', script);
      if (script.file) {
        // create argument file
        let argFilename = script.file.substr(0, script.file.lastIndexOf('.')) || script.file;
        argFilename = argFilename + '.args';
        const newType = _.includes(type, 'server') ? 'analysis' : 'data_point';
        vm.jetpack.write(vm.projectDir.path('scripts', newType, argFilename), script.arguments);
      }
    });
  }

  typeTargetValue(value, type) {
    let newVal;
    if (value == null) {
      newVal = value;
    } else if (type == 'Double' || type == 'Integer') {
      // this might be NAN if value cannot be converted
      newVal = Number(value);
    } else if (type == 'Bool') {
      if (value == 'true' || value == '1') {
        newVal = true;
      } else if (value == 'false' || value == '0') {
        newVal = false;
      } else {
        // this will cause an error
        newVal = value;
      }
    } else {
      newVal = value;
    }
    return newVal;
  }

  // export variables to pat.json
  exportPAT() {
    const vm = this;
    vm.savePrettyOptions();  // must do this first in case we are closing the app on the analysis tab

    // general
    vm.pat = {};
    vm.pat.projectName = vm.projectName;
    vm.pat.projectDir = vm.projectDir.path();
    vm.pat.analysisName = vm.analysisName;
    vm.pat.seed = vm.defaultSeed;
    vm.pat.weatherFile = vm.defaultWeatherFile;
    vm.pat.analysis_type = vm.analysisType; // eslint-disable-line camelcase
    vm.pat.cliDebug = vm.cliDebug;
    vm.pat.cliVerbose = vm.cliVerbose;
    vm.pat.downloadReports = vm.downloadReports;
    vm.pat.downloadOSW = vm.downloadOSW;
    vm.pat.downloadOSM = vm.downloadOSM;
    vm.pat.downloadZIP = vm.downloadZIP;
    vm.pat.gemfile = vm.gemfile;
    vm.pat.timeoutWorkflow = vm.timeoutWorkflow;
    vm.pat.timeoutUploadResults = vm.timeoutUploadResults;
    vm.pat.timeoutInitWorker = vm.timeoutInitWorker;
    vm.pat.dirToInclude = vm.dirToInclude;
    vm.pat.dirToUnpackTo = vm.dirToUnpackTo;
    vm.pat.remoteSettings = angular.copy(vm.remoteSettings);
    // clear out aws.connected
    if (vm.pat.remoteSettings.aws && vm.pat.remoteSettings.aws.connected) {
      vm.pat.remoteSettings.aws.connected = false;
    }
    vm.pat.samplingMethod = vm.samplingMethod;
    vm.pat.algorithmSettings = vm.algorithmSettings;
    vm.pat.rubyMD5 = vm.rubyMD5;
    vm.pat.mongoMD5 = vm.mongoMD5;
    vm.pat.openstudioServerMD5 = vm.openstudioServerMD5;
    vm.pat.openstudioCLIMD5 = vm.openstudioCLIMD5;
    vm.pat.openstudioMD5 = vm.openstudioMD5;
    vm.pat.numberWorkers = vm.numberWorkers;

    // measures and options
    vm.pat.measures = vm.measures;

    // files to include
    vm.pat.filesToInclude = vm.filesToInclude;
    vm.pat.serverScripts = vm.serverScripts;

    // design alternatives
    vm.pat.designAlternatives = vm.designAlternatives;

    // run / results
    vm.pat.analysisID = vm.analysisID;
    vm.pat.datapoints = vm.datapoints;

    vm.jetpack.write(vm.projectDir.path('pat.json'), vm.pat);
    if (vm.Message.showDebug()) vm.$log.debug('Project exported to pat.json');
    vm.setModified(false);
  }

  // reconcile measures and save
  updateProjectMeasures(updatedMeasures) {

    const vm = this;
    const newMeasures = [];

    _.forEach(updatedMeasures, (measure) => {
      const match = _.find(vm.measures, {instanceId: measure.instanceId});
      if (angular.isDefined(match)) {
        // if there's a match, merge (update)
        _.merge(match, measure);
        newMeasures.push(match);
      } else {
        // otherwise add
        newMeasures.push(angular.copy(measure));
      }
    });

    vm.setMeasuresAndOptions(updatedMeasures);
    //vm.measures = updatedMeasures;
  }

  recalculateMeasureWorkflowIndexes() {
    // measures should already be in correct order
    // make sure workflowIndex's are consecutive and match measure index in array
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('ProjectService::RecalculateMeasureWorkflowIndexes');
    _.forEach(vm.measures, (measure, key) => {
      measure.workflow_index = key;
      if (vm.Message.showDebug()) vm.$log.debug('key: ', key);
    });

    if (vm.Message.showDebug()) vm.$log.debug('***REORDERED PROJECT MEASURES: ', vm.measures);
  }

  openSetMyMeasuresDirModal() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('in SetMyMeasures Modal function');
    const modalInstance = vm.$uibModal.open({
      backdrop: 'static',
      controller: 'ModalSetMeasuresDirController',
      controllerAs: 'modal',
      templateUrl: 'app/project/setMeasuresDir.html',
      windowClass: 'modal'
    });
  }

  getProjectName() {
    const vm = this;
    return vm.projectName;
  }

  getAnalysisName() {
    const vm = this;
    return vm.analysisName;
  }

  setAnalysisName(name) {
    const vm = this;
    vm.analysisName = name;
  }

  setProjectName(name) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Project setProjectName name:', name);
    vm.projectName = name;
  }

  getHelmInfoShown() {
    const vm = this;
    return vm.helmInfoShown;
  }

  setHelmInfoShown(){
    const vm = this;
    vm.helmInfoShown = true;
  }

  getProjectDir() {
    const vm = this;
    return vm.projectDir;
  }

  setProjectDir(dir) {
    const vm = this;
    // this should be a jetpack object (not a string)
    vm.projectDir = dir;
    vm.setProjectLocalResultsDir(dir);
    vm.setProjectClustersDir(dir);
  }

  setProjectLocalResultsDir(projectDir) {
    const vm = this;
    vm.projectLocalResultsDir = vm.jetpack.dir(projectDir.path('localResults'));
  }

  getProjectLocalResultsDir() {
    const vm = this;
    return vm.projectLocalResultsDir;
  }

  setProjectClustersDir(projectDir) {
    const vm = this;
    return vm.projectClustersDir = vm.jetpack.dir(projectDir.path('clusters'));
  }

  getProjectClustersDir() {
    const vm = this;
    return vm.projectClustersDir;
  }

  getAwsDir() {
    const vm = this;
    return vm.awsDir;
  }

  // projectDir is a jetpack object (not a string)
  setProject(projectDir) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Project setProject');

    vm.setProjectDir(projectDir);
    if (vm.Message.showDebug()) vm.$log.debug('in set project: projectDir: ', vm.projectDir.path());
    vm.setProjectName(projectDir.path().replace(/^.*[\\\/]/, ''));
    if (vm.Message.showDebug()) vm.$log.debug('project name: ', vm.projectName);

    vm.mongoDir = jetpack.dir(path.resolve(vm.projectDir.path() + '/data/db'));
    vm.logsDir = jetpack.dir(path.resolve(vm.projectDir.path() + '/logs'));
    vm.projectMeasuresDir = jetpack.dir(path.resolve(vm.projectDir.path() + '/measures'));
    vm.seedDir = jetpack.dir(path.resolve(vm.projectDir.path() + '/seeds'));
    vm.weatherDir = jetpack.dir(path.resolve(vm.projectDir.path() + '/weather'));
    vm.gemfileDir = jetpack.dir(path.resolve(vm.projectDir.path()));  

    // initializeProject will also create the basic folder structure, if it is missing
    vm.initializeProject();

  }

  setAnalysisID(id) {
    const vm = this;
    vm.analysisID = id;
  }

  getAnalysisID() {
    const vm = this;
    return vm.analysisID;
  }

  setDatapoints(dps) {
    const vm = this;
    vm.datapoints = dps;
  }

  getDatapoints() {
    const vm = this;
    return vm.datapoints;
  }

  setDesignAlternatives(alts) {
    const vm = this;
    vm.designAlternatives = alts;
  }

  getDesignAlternatives() {
    const vm = this;
    return vm.designAlternatives;
  }

  setMeasuresAndOptions(measures) {
    const vm = this;
    vm.savePrettyOptions();
    vm.measures = measures;
  }

  getMeasuresAndOptions() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('GetMeasuresAndOptions measures: ', vm.measures);
    return vm.measures;
  }

  getProjectMeasuresDir() {
    const vm = this;
    return vm.projectMeasuresDir;
  }

  getMeasuresDir() {
    const vm = this;
    return vm.myMeasuresDir;
  }

  setMeasuresDir(strPath) {
    const vm = this;
    vm.myMeasuresDir = vm.jetpack.cwd(strPath);
  }

  getNumberDPsToDisplay() {
    const vm = this;
    return vm.numberDPsToDisplay;
  }

  getNumberWorkers() {
    const vm = this;
    return vm.numberWorkers;
  }

  setNumberWorkers(num) {
    const vm = this;
    vm.numberWorkers = num;
  }

  getSeedDir() {
    const vm = this;
    return vm.seedDir;
  }

  getWeatherDir() {
    const vm = this;
    return vm.weatherDir;
  }

  getGemfileDir() {
    const vm = this;
    return vm.gemfileDir;
  }

  getMongoDir() {
    const vm = this;
    return vm.mongoDir;
  }

  getRailsDir() {
    const vm = this;
    return vm.railsDir;
  }

  setRunTypes() {

    return [{displayName: 'Run Locally', name: 'local'}, {displayName: 'Run on Cloud', name: 'remote'}];
  }

  getRunTypes() {
    const vm = this;
    return vm.runTypes;
  }

  getRunType() {
    const vm = this;
    return vm.runType;
  }

  setRunType(type) {
    const vm = this;
    vm.runType = type;
  }

  resetRemoteSettings() {
    const vm = this;
    vm.setRemoteSettings({
      open: true,
      remoteServerURL: null
    });
    if (vm.Message.showDebug()) vm.$log.debug('Remote settings reset to: ', vm.getRemoteSettings());
  }

  setRemoteSettings(settings) {
    const vm = this;
    vm.remoteSettings = settings;
  }

  getRemoteSettings() {
    const vm = this;
    return vm.remoteSettings;
  }

  fixURL(url) {
    // if http:// is missing from URL, $http actions won't work
    if (url.indexOf('http://') == -1 && url.indexOf('https://') == -1) {
      url = 'http://' + url;
    }
    return url;
  }

  setAnalysisType(name) {
    const vm = this;
    vm.analysisType = name;
  }

  getAnalysisType() {
    const vm = this;
    return vm.analysisType;
  }

  setCliDebug(name) {
    const vm = this;
    vm.cliDebug = name;
  }

  getCliDebug() {
    const vm = this;
    return vm.cliDebug;
  }

  setCliVerbose(name) {
    const vm = this;
    vm.cliVerbose = name;
  }

  getCliVerbose() {
    const vm = this;
    return vm.cliVerbose;
  }

  setDownloadReports(name) {
    const vm = this;
    vm.downloadReports = name;
  }

  getDownloadReports() {
    const vm = this;
    return vm.downloadReports;
  }

  setDownloadOSW(name) {
    const vm = this;
    vm.downloadOSW = name;
  }

  getDownloadOSW() {
    const vm = this;
    return vm.downloadOSW;
  }

  setDownloadOSM(name) {
    const vm = this;
    vm.downloadOSM = name;
  }

  getDownloadOSM() {
    const vm = this;
    return vm.downloadOSM;
  }

  setDownloadZIP(name) {
    const vm = this;
    vm.downloadZIP = name;
  }

  getDownloadZIP() {
    const vm = this;
    return vm.downloadZIP;
  }

  setTimeoutWorkflow(name) {
    const vm = this;
    vm.timeoutWorkflow = name;
  }

  getTimeoutWorkflow() {
    const vm = this;
    return vm.timeoutWorkflow;
  }

  setTimeoutUploadResults(name) {
    const vm = this;
    vm.timeoutUploadResults = name;
  }

  getTimeoutUploadResults() {
    const vm = this;
    return vm.timeoutUploadResults;
  }

  setTimeoutInitWorker(name) {
    const vm = this;
    vm.timeoutInitWorker = name;
  }

  getTimeoutInitWorker() {
    const vm = this;
    return vm.timeoutInitWorker;
  }

  getFilesToInclude() {
    const vm = this;
    return vm.filesToInclude;
  }

  setServerScripts() {
    const vm = this;
    vm.serverScripts = {
      server_initialization: {file: null, arguments: []},
      server_finalization: {file: null, arguments: []},
      worker_initialization: {file: null, arguments: []},
      worker_finalization: {file: null, arguments: []}
    };
    if (vm.Message.showDebug()) vm.$log.debug('setServerScripts: ', vm.serverScripts);
  }

  getServerScripts() {
    const vm = this;
    return vm.serverScripts;
  }

  setSamplingMethod(method) {
    const vm = this;
    vm.samplingMethod = method;
  }

  getSamplingMethod() {
    const vm = this;
    return vm.samplingMethod;
  }

  getSamplingMethods() {
    const vm = this;
    return vm.samplingMethods;
  }

  setAlgorithmOptions() {
    const opts = {};
    opts.baseline_perturbation = [{
      name: 'in_measure_combinations',
      displayName: 'In Measure Combinations',
      description: 'Options: \'true\' or \'false\'',
      defaultValue: 'true',
      type: 'string'
    }, {
      name: 'include_baseline_in_combinations',
      displayName: 'Include Baseline in Combinations?',
      description: 'Options: \'true\' or \'false\'',
      defaultValue: 'true',
      type: 'string'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }];

    opts.diag = [{
      name: 'experiment_type',
      displayName: 'Experiment Type',
      description: 'Options: diagonal',
      defaultValue: 'diagonal',
      type: 'string'
    },
    //   {
    //   name: 'number_of_samples',
    //   displayName: 'Number of Samples',
    //   description: 'Positive integer (if individual, total simulations is this times each variable)',
    //   defaultValue: 2,
    //   type:'number'
    // },
      {
      name: 'run_baseline',
      displayName: 'Run Baseline?',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 1,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.doe = [{
      name: 'experiment_type',
      displayName: 'Experiment Type',
      description: 'Options: full_factorial',
      defaultValue: 'full_factorial',
      type:'string'
    }, {
      name: 'number_of_samples',
      displayName: 'Number of Samples',
      description: 'Positive integer (this discretizes a continous variable)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.lhs = [{
      name: 'sample_method',
      displayName: 'Sample Method',
      description: 'Options: individual_variables or all_variables',
      defaultValue: 'individual_variables',
      type:'string'
    }, {
      name: 'number_of_samples',
      displayName: 'Number of Samples',
      description: 'Positive integer (if individual, total simulations is this times each variable)',
      defaultValue: 5,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.morris = [{
      name: 'r',
      displayName: 'r',
      description: 'Integer giving the number of repetitions of the design',
      defaultValue: 10,
      type:'number'
    }, {
      name: 'r2',
      displayName: 'r2',
      description: 'Integer giving the size of the (bigger) population in which is extracted the design, for the space-filling improvement by (Campolongo et al. 2007).  r2 > r',
      defaultValue: 20,
      type:'number'
    }, {
        name: 'levels',
        displayName: 'Levels',
        description: 'Positive integer (if individual, total simulations is this times each variable). Must be at least 2.',
        defaultValue: 4,
        type:'number'
    }, {
      name: 'grid_jump',
      displayName: 'Grid Jump',
      description: 'Integer specifying the number of levels that are increased/decreased for computing the elementary effects',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'type',
      displayName: 'Type',
      description: 'Options: oat (One at a Time)',
      defaultValue: 'oat',
      type:'string'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'pPower',
      displayName: 'pPower',
      description: 'Options: Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1000000000000000000,
      type:'number'
    }, {
      name: 'check_boundary',
      displayName: 'Check Boundary',
      description: 'Force variables to respect mins/maxes. Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.nsga_nrel = [{
      name: 'number_of_samples',
      displayName: 'Number of Samples',
      description: 'Size of initial population',
      defaultValue: 30,
      type:'number'
    }, {
      name: 'generations',
      displayName: 'Generations',
      description: 'Number of generations',
      defaultValue: 3,
      type:'number'
    }, {
      name: 'tournament_size',
      displayName: 'Tournament Size',
      description: 'Tournament Size',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'cprob',
      displayName: 'C Prob',
      description: 'Crossover probability [0,1]',
      defaultValue: 0.85,
      type:'number'
    }, {
      name: 'xover_dist_idx',
      displayName: 'XoverDistIdx',
      description: 'Crossover Distribution Index (large values give higher probabilities of offspring close to parent)',
      defaultValue: 5,
      type:'number'
    }, {
      name: 'mu_dist_idx',
      displayName: 'MuDistIdx',
      description: 'Mutation Distribution Index (large values give higher probabilities of offspring close to parent)',
      defaultValue: 5,
      type:'number'
    }, {
      name: 'mprob',
      displayName: 'M Prob',
      description: 'Mutation probability [0,1]',
      defaultValue: 0.8,
      type:'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.optim = [{
      name: 'epsilongradient',
      displayName: 'Epsilon Gradient',
      description: 'Epsilon in gradient calculation',
      defaultValue: 1e-4,
      type:'number'
    }, {
      name: 'pgtol',
      displayName: 'PG Tol',
      description: 'Tolerance on the projected gradient',
      defaultValue: 1e-2,
      type:'number'
    }, {
      name: 'factr',
      displayName: 'Factr',
      description: 'Tolerance on delta_F',
      defaultValue: 4.5036e13,
      type:'number'
    }, {
      name: 'maxit',
      displayName: 'Max iterations',
      description: 'Maximum number of iterations',
      defaultValue: 10,
      type:'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.preflight = [{
      name: 'sample_method',
      displayName: 'Sample Method',
      description: 'Options: individual_variables or all_variables',
      defaultValue: 'individual_variables',
      type:'string'
    }, {
      name: 'run_max',
      displayName: 'Run Max?',
      description: 'Options: true or false',
      defaultValue: 'true',
      type:'string'
    }, {
      name: 'run_min',
      displayName: 'Run Min?',
      description: 'Options: true or false',
      defaultValue: 'true',
      type:'string'
    }, {
      name: 'run_mode',
      displayName: 'Run Mode?',
      description: 'Options: true or false',
      defaultValue: 'true',
      type:'string'
    }, {
      name: 'run_all_samples_for_pivots',
      displayName: 'Run all Samples for Pivots?',
      description: 'Options: true or false',
      defaultValue: 'true',
      type:'string'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e19,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.pso = [{
      name: 'npart',
      displayName: 'Number of Particles',
      description: 'Number of particles in the swarm',
      defaultValue: 4,
      type:'number'
    }, {
      name: 'maxit',
      displayName: 'Max Iterations',
      description: 'Maximum number of iterations',
      defaultValue: 20,
      type:'number'
    }, {
      name: 'maxfn',
      displayName: 'Max Function Evaluations',
      description: 'Maximum number of function evaluations',
      defaultValue: 1000,
      type:'number'
    }, {
      name: 'lambda',
      displayName: 'Lambda',
      description: '[0,1] a percentage to limit the maximum velocity (Vmax) for each dimension',
      defaultValue: 0.9,
      type:'number'
    }, {
      name: 'c2',
      displayName: 'C2',
      description: 'Social acceleration coefficient',
      defaultValue: 1.193147,
      type:'number'
    }, {
      name: 'c1',
      displayName: 'C1',
      description: 'Cognitive acceleration coefficient',
      defaultValue: 1.193147,
      type:'number'
    }, {
      name: 'boundary',
      displayName: 'Boundary',
      description: 'Options: invisible, damping, reflecting, absorbing2007, absorbing2011, default',
      defaultValue: 'reflecting',
      type:'string'
    }, {
      name: 'topology',
      displayName: 'Topology',
      description: 'Options: gbest, lbest, vonneumann, random',
      defaultValue: 'random',
      type:'string'
    }, {
      name: 'xini',
      displayName: 'Xini',
      description: 'Options: lhs, random',
      defaultValue: 'lhs',
      type:'string'
    }, {
      name: 'vini',
      displayName: 'Vini',
      description: 'Options: zero, lhs2011, random2011, lhs2007, random2007, default',
      defaultValue: 'lhs2011',
      type:'string'
    }, {
      name: 'abstol',
      displayName: 'Abs Tol',
      description: 'Absolute convergence tolerance',
      defaultValue: 0.01,
      type:'number'
    }, {
      name: 'reltol',
      displayName: 'Rel Tol',
      description: 'Relative convergence tolerance',
      defaultValue: 0.01,
      type:'number'
    }, {
      name: 'method',
      displayName: 'Method',
      description: 'Options: spso2007, spso2011, ipso, fips, wfips',
      defaultValue: 'spso2011',
      type:'string'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.repeat_run = [{
      name: 'number_of_runs',
      displayName: 'Number of Runs',
      description: 'Positive integer (if individual, total simulations is this times each variable)',
      defaultValue: 30,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.rgenoud = [{
      name: 'popsize',
      displayName: 'Population Size',
      description: 'Size of initial population',
      defaultValue: 30,
      type:'number'
    }, {
      name: 'generations',
      displayName: 'Generations',
      description: 'Number of generations',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'wait_generations',
      displayName: 'Generations to Wait',
      description: 'If no improvement in waitGenerations of generations, then exit',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'bfgs',
      displayName: 'BFGS',
      description: 'Use Bounded Gradient Search. Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'bfgsburnin',
      displayName: 'BFGS burn in',
      description: 'The number of generations which are run before the BFGS is ﬁrst used',
      defaultValue: 6,
      type:'number'
    }, {
      name: 'solution_tolerance',
      displayName: 'Solution Tolerance',
      description: 'Numbers within solutionTolerance are considered equal',
      defaultValue: 0.01,
      type:'number'
    }, {
      name: 'epsilongradient',
      displayName: 'Epsilon Gradient',
      description: 'epsilon in gradient calculation',
      defaultValue: 0.01,
      type:'number'
    }, {
      name: 'pgtol',
      displayName: 'Projected Gradient Tolerance',
      description: 'Tolerance on the projected gradient',
      defaultValue: 0.01,
      type:'number'
    }, {
      name: 'factr',
      displayName: 'Factr',
      description: 'Tolerance on delta_F',
      defaultValue: 450360000000000,
      type:'number'
    }, {
      name: 'maxit',
      displayName: 'Maximum Iterations',
      description: 'Maximum number of iterations',
      defaultValue: 3,
      type:'number'
    }, {
      name: 'r_genoud_debug_flag',
      displayName: 'Debug Flag',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 1,
      type:'number'
    }, {
      name: 'print_level',
      displayName: 'Print Level',
      description: 'Options: 0 (minimal printing), 1 (normal), 2 (detailed), and 3 (debug)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.ga = [{
      name: 'popsize',
      displayName: 'Population Size',
      description: 'Size of initial population',
      defaultValue: 28,
      type:'number'
    }, {
      name: 'run',
      displayName: 'Run',
      description: 'Number of consecutive generations without any improvement in the best fitness value before the GA is stopped',
      defaultValue: 2,
      type: 'number'
    }, {
      name: 'maxFitness',
      displayName: 'maxFitness',
      description: 'Upper bound on the fitness function after that the GA search is interrupted',
      defaultValue: 1.0,
      type: 'number'
    }, {
      name: 'pcrossover',
      displayName: 'pcrossover',
      description: 'Probability of crossover between pairs of chromosomes. Typically a large value',
      defaultValue: 0.8,
      type: 'number'
    }, {
      name: 'pmutation',
      displayName: 'pmutation',
      description: 'Probability of mutation in a parent chromosome. Usually a small probability',
      defaultValue: 0.1,
      type: 'number'
    }, {
      name: 'elitism',
      displayName: 'elitism',
      description: 'Number of best fitness individuals to survive at each generation',
      defaultValue: 0.05,
      type: 'number'
    }, {
      name: 'maxiter',
      displayName: 'maxiter',
      description: 'Maximum number of iterations to run before the GA search is halted',
      defaultValue: 10,
      type: 'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 42,
      type:'number'
    }];

    opts.gaisl = [{
      name: 'popsize',
      displayName: 'Population Size',
      description: 'Size of initial population',
      defaultValue: 28,
      type:'number'
    }, {
      name: 'run',
      displayName: 'Run',
      description: 'Number of consecutive generations without any improvement in the best fitness value before the GA is stopped',
      defaultValue: 2,
      type: 'number'
    }, {
      name: 'maxFitness',
      displayName: 'maxFitness',
      description: 'Upper bound on the fitness function after that the GA search is interrupted',
      defaultValue: 1.0,
      type: 'number'
    }, {
      name: 'pcrossover',
      displayName: 'pcrossover',
      description: 'Probability of crossover between pairs of chromosomes. Typically a large value',
      defaultValue: 0.8,
      type: 'number'
    }, {
      name: 'pmutation',
      displayName: 'pmutation',
      description: 'Probability of mutation in a parent chromosome. Usually a small probability',
      defaultValue: 0.1,
      type: 'number'
    }, {
      name: 'elitism',
      displayName: 'elitism',
      description: 'Number of best fitness individuals to survive at each generation',
      defaultValue: 0.05,
      type: 'number'
    }, {
      name: 'maxiter',
      displayName: 'maxiter',
      description: 'Maximum number of iterations to run before the GA search is halted',
      defaultValue: 10,
      type: 'number'
    }, {
      name: 'numIslands',
      displayName: 'numIslands',
      description: 'Integer value specifying the number of islands to be used in a ring topology in which each island is connected unidirectionally with another island',
      defaultValue: 4,
      type: 'number'
    }, {
      name: 'migrationRate',
      displayName: 'migrationRate',
      description: 'Value in range 0-1 providing the proportion of individuals that should migrate between the islands',
      defaultValue: 0.1,
      type: 'number'
    }, {
      name: 'migrationInterval',
      displayName: 'migrationInterval',
      description: 'Integer value specifying the number of iterations at which exchange of individuals takes place',
      defaultValue: 10,
      type: 'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 42,
      type:'number'
    }];

    opts.single_run = [{
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.sobol = [{
      name: 'number_of_samples',
      displayName: 'Number of Samples',
      description: 'Positive integer',
      defaultValue: 30,
      type:'number'
    }, {
      name: 'random_seed',
      displayName: 'Random Seed',
      description: 'The first random seed',
      defaultValue: 1979,
      type:'number'
    }, {
      name: 'random_seed2',
      displayName: 'Random Seed 2',
      description: 'the second random seed',
      defaultValue: 1973,
      type:'number'
    }, {
      name: 'order',
      displayName: 'Order',
      description: 'Integer, the maximum order in the ANOVA decomposition (all indices up to this order will be computed)',
      defaultValue: 1,
      type:'number'
    }, {
      name: 'nboot',
      displayName: 'Num Boot',
      description: 'The number of bootstrap replicates',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'conf',
      displayName: 'Confidence',
      description: 'the confidence level for bootstrap confidence intervals',
      defaultValue: 0.95,
      type:'number'
    }, {
      name: 'type',
      displayName: 'Type',
      description: 'Options: sobol, sobol2002, sobol2007, jansen, mara, martinez',
      defaultValue: 'sobol',
      type:'string'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    opts.fast99 = [{
      name: 'n',
      displayName: 'n',
      description: 'Integer giving the sample size, i.e. the length of the discretization of the s-space',
      defaultValue: 66,
      type:'number'
    }, {
      name: 'M',
      displayName: 'M',
      description: 'integer specifying the interference parameter, i.e. the number of harmonics to sum in the Fourier series decomposition',
      defaultValue: 4,
      type:'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }];

    opts.spea_nrel = [{
      name: 'number_of_samples',
      displayName: 'Number of Samples',
      description: 'Size of Initial Population',
      defaultValue: 30,
      type:'number'
    }, {
      name: 'generations',
      displayName: 'Generations',
      description: 'Number of generations',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'tournament_size',
      displayName: 'Tournament Size',
      description: 'Tournament Size',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'cprob',
      displayName: 'C Prob',
      description: 'Crossover probability [0,1]',
      defaultValue: 0.85,
      type:'number'
    }, {
      name: 'cidx',
      displayName: 'C Idx',
      description: 'Crossover Distribution Index (large values give higher probabilities of offspring close to parent)',
      defaultValue: 5,
      type:'number'
    }, {
      name: 'midx',
      displayName: 'M Idx',
      description: 'Mutation Distribution Index (large values give higher probabilities of offspring close to parent)',
      defaultValue: 5,
      type:'number'
    }, {
      name: 'mprob',
      displayName: 'M Prob',
      description: 'Mutation probability [0,1]',
      defaultValue: 0.8,
      type:'number'
    }, {
      name: 'norm_type',
      displayName: 'Norm Type',
      description: 'Options: minkowski, maximum, euclidean, binary, manhattan',
      defaultValue: 'minkowski',
      type:'string'
    }, {
      name: 'p_power',
      displayName: 'P Power',
      description: 'Lp norm power (must be non-negative)',
      defaultValue: 2,
      type:'number'
    }, {
      name: 'exit_on_guideline_14',
      displayName: 'Exit on Guideline 14?',
      description: 'Options: O (off), 1 (both electric and gas), 2 (just electric), 3 (just gas)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'seed',
      displayName: 'Seed',
      description: 'Integer seed for random number generator',
      defaultValue: null,
      type:'number'
    }, {
      name: 'failed_f_value',
      displayName: 'Failed F Value',
      description: 'Return Value for F(x) if F fails',
      defaultValue: 1e18,
      type:'number'
    }, {
      name: 'debug_messages',
      displayName: 'Debug Messages',
      description: 'Options: 1 or 0 (True or False)',
      defaultValue: 0,
      type:'number'
    }, {
      name: 'max_queued_jobs',
      displayName: 'Max Queued Jobs',
      description: 'Integer specifying the maximum number of queued jobs',
      defaultValue: 100,
      type:'number'
    }];

    return opts;

  }

  getRubyMD5() {
    const vm = this;
    return vm.rubyMD5;
  }

  setRubyMD5(md5) {
    const vm = this;
    vm.rubyMD5 = md5;
  }

  getMongoMD5() {
    const vm = this;
    return vm.mongoMD5;
  }

  setMongoMD5(md5) {
    const vm = this;
    vm.mongoMD5 = md5;
  }

  getOpenstudioServerMD5() {
    const vm = this;
    return vm.openstudioServerMD5;
  }

  setOpenstudioServerMD5(md5) {
    const vm = this;
    vm.openstudioServerMD5 = md5;
  }

  getOpenstudioCLIMD5() {
    const vm = this;
    return vm.openstudioCLIMD5;
  }

  setOpenstudioCLIMD5(md5) {
    const vm = this;
    vm.openstudioCLIMD5 = md5;
  }

  getOpenstudioMD5() {
    const vm = this;
    return vm.openstudioMD5;
  }

  setOpenstudioMD5(md5) {
    const vm = this;
    vm.openstudioMD5 = md5;
  }

  // this will return all settings that have been set regardless of sampling method (not useful)
  getAlgorithmSettings() {
    const vm = this;
    return vm.algorithmSettings;
  }

  // TODO: not used. not connected to anything
  getAlgorithmSettingsForMethod() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('In getAlgorithmSettingsForMethod in Project');

    const settings = [];
    _.forEach(vm.algorithmOptions[vm.samplingMethod.id], object => {
      settings.push(object);
    });

    return settings;
  }

  setGetAlgorithmSettings(algorithm) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('In setGetAlgorithmSettings in Project');

    // remove non-applicable settings
    _.forEachRight(vm.algorithmSettings, (setting, key) => {
      const match = _.find(vm.algorithmOptions[algorithm.id], {name: setting.name});
      if (!match) {
        vm.algorithmSettings.splice(key, 1);
      } else {
        // enum?
        if (match.description.includes("Options:")){
          // check that options are valid
          if (!match.description.includes(setting.value)) {
            // reset string
            setting.value = match.defaultValue;
          } 
        } 
      }
    });

    // add/update new settings
    _.forEach(vm.algorithmOptions[algorithm.id], (object, index) => {
      const match = _.find(vm.algorithmSettings, {name: object.name});
      if (match) {
        match.description = object.description;
        match.defaultValue = object.defaultValue;
        match.value = _.isNil(match.value) ? object.defaultValue : match.value;
        match.type = object.type;
      }
      else {
        const temp = angular.copy(object);
        temp.value = temp.defaultValue;
        //vm.algorithmSettings.push(temp);
        vm.algorithmSettings.splice(index, 0, temp);
      }
    });

    if (vm.Message.showDebug()) vm.$log.debug('new algorithmSettings: ', vm.algorithmSettings);
    return vm.algorithmSettings;
  }

  getAlgorithmOptions() {
    const vm = this;
    return vm.algorithmOptions;
  }

  setSamplingMethods() {

    return [{
      id: 'baseline_perturbation',
      name: 'analysis.type.baselinePerturbation',
      link: null
    }, {
      id: 'diag',
      name: 'analysis.type.diagonal',
      link: null
    }, {
      id: 'doe',
      name: 'analysis.type.doe',
      link: 'https://cran.r-project.org/web/packages/DoE.base/DoE.base.pdf'
    }, {
      id: 'lhs',
      name: 'analysis.type.lhs',
      link: 'https://cran.r-project.org/web/packages/lhs/lhs.pdf'
    }, {
      id: 'morris',
      name: 'analysis.type.morris',
      link: 'https://cran.r-project.org/web/packages/sensitivity/sensitivity.pdf'
    }, {
      id: 'nsga_nrel',
      name: 'analysis.type.nsga2',
      link: 'https://cran.r-project.org/web/packages/nsga2R/nsga2R.pdf'
    }, {
      id: 'optim',
      name: 'analysis.type.optim',
      link: 'http://stat.ethz.ch/R-manual/R-devel/library/stats/html/optim.html'
    }, {
      id: 'preflight',
      name: 'analysis.type.preFlight',
      link: null
    }, {
      id: 'pso',
      name: 'analysis.type.pso',
      link: 'https://cran.r-project.org/web/packages/hydroPSO/hydroPSO.pdf'
    }, {
      id: 'repeat_run',
      name: 'analysis.type.repeatRun',
      link: null
    }, {
      id: 'rgenoud',
      name: 'analysis.type.rgenoud',
      link: 'https://cran.r-project.org/web/packages/rgenoud/rgenoud.pdf'
    }, {
      id: 'single_run',
      name: 'analysis.type.singleRun',
      link: null
    }, {
      id: 'sobol',
      name: 'analysis.type.sobol',
      link: 'https://cran.r-project.org/web/packages/sensitivity/sensitivity.pdf'
    }, {
      id: 'spea_nrel',
      name: 'analysis.type.spea2',
      link: 'https://cran.r-project.org/web/packages/nsga2R/nsga2R.pdf'
    }, {
      id: 'ga',
      name: 'analysis.type.ga',
      link: 'https://cran.r-project.org/web/packages/GA/GA.pdf'
    }, {
      id: 'gaisl',
      name: 'analysis.type.gaisl',
      link: 'https://cran.r-project.org/web/packages/GA/GA.pdf'
    }, {
      id: 'fast99',
      name: 'analysis.type.fast99',
      link: 'https://cran.r-project.org/web/packages/sensitivity/sensitivity.pdf'
    }];
  }

  getAnalysisTypes() {
    const vm = this;
    return vm.analysisTypes;
  }

  getCliDebugTypes() {
    const vm = this;
    return vm.cliDebugTypes;
  }

  getCliVerboseTypes() {
    const vm = this;
    return vm.cliVerboseTypes;
  }

  getDownloadReportsTypes() {
    const vm = this;
    return vm.downloadReportsTypes;
  }

  getGemfileTypes() {
    const vm = this;
    return vm.gemfileTypes;
  }

  getDownloadOSWTypes() {
    const vm = this;
    return vm.downloadOSWTypes;
  }

  getDownloadOSMTypes() {
    const vm = this;
    return vm.downloadOSMTypes;
  }

  getDownloadZIPTypes() {
    const vm = this;
    return vm.downloadZIPTypes;
  }

  setReportType(name) {
    const vm = this;
    vm.reportType = name;
  }

  getReportType() {
    const vm = this;
    return vm.reportType;
  }

  getReportTypes() {
    const vm = this;
    return vm.reportTypes;
  }

  setDefaultSeed(name) {
    const vm = this;
    vm.defaultSeed = name;
  }

  getDefaultSeed() {
    const vm = this;
    return vm.defaultSeed;
  }

  setDefaultWeatherFile(name) {
    const vm = this;
    vm.defaultWeatherFile = name;
  }

  getDefaultWeatherFile() {
    const vm = this;
    return vm.defaultWeatherFile;
  }

  getSeeds() {
    const vm = this;
    return vm.seeds;
  }

  getWeatherFiles() {
    const vm = this;
    return vm.weatherFiles;
  }

  getGemfile() {
    const vm = this;
    return vm.gemfile;
  }


  setSeeds() {
    const vm = this;

    if (angular.isDefined(vm.seedDir)) {
      if (vm.jetpack.exists(vm.seedDir.cwd())) {
        vm.seeds = vm.seedDir.find('.', {matching: '*.osm'}, 'relativePath');
        _.forEach(vm.seeds, (seed, index) => {
          vm.seeds[index] = _.replace(seed, './', '');
        });
      }
      else vm.$log.error('The seeds directory (%s) does not exist', vm.seedDir.cwd());
    } else {
      if (vm.Message.showDebug()) vm.$log.debug('There is no seed directory defined (project not selected?)');
    }

  }

  setWeatherFiles() {
    const vm = this;
    if (angular.isDefined(vm.weatherDir)) {
      if (vm.jetpack.exists(vm.weatherDir.cwd())) {
        vm.weatherFiles = vm.weatherDir.find('.', {matching: '*.epw'}, 'relativePath');
        _.forEach(vm.weatherFiles, (w, index) => {
          vm.weatherFiles[index] = _.replace(w, './', '');
        });
      }
      else vm.$log.error('The weather file directory (%s) does not exist', vm.weatherDir.cwd());
    } else {
      if (vm.Message.showDebug()) vm.$log.debug('There is no weather directory defined (project not selected?)');
    }

  }

  setGemfile(name) {
    const vm = this;
    vm.gemfile = name;
    vm.$log.info('gemfile setting to ', name);
    if (angular.isDefined(vm.gemfileDir)) {
      if (vm.jetpack.exists(vm.gemfileDir.cwd())) {
        if (vm.gemfileDir.exists('Gemfile')) {
          vm.$log.info('Gemfile found in', vm.gemfileDir.cwd());
        }
        else { 
          vm.$log.info('Gemfile not found in', vm.gemfileDir.cwd(), 'setting to false');
          vm.gemfile = false;
        }
      }
    }

  }
  

  setSeedsDropdownOptions() {
    const vm = this;
    vm.seedsDropdownArr = [];
    vm.setSeeds();
    _.forEach(vm.seeds, (seed) => {
      vm.seedsDropdownArr.push({id: seed, name: seed});
    });

  }

  setWeatherFilesDropdownOptions() {
    const vm = this;
    vm.weatherFilesDropdownArr = [];
    vm.setWeatherFiles();
    _.forEach(vm.weatherFiles, (weather) => {
      vm.weatherFilesDropdownArr.push({id: weather, name: weather});
    });
  }

  loadAlgorithmicResults(type) {
    const vm = this;
    const filename = type == 'results' ? 'results.csv' : 'metadata.csv';
    let resultsJson = [];
    if (vm.jetpack.exists(vm.getProjectLocalResultsDir().path(filename))) {
      const csv = vm.jetpack.read(vm.getProjectLocalResultsDir().path(filename));
      resultsJson = vm.csvToJson(csv);
    }
    //if (vm.Message.showDebug()) vm.$log.debug('RESULTS JSON for type:', type, ' is: ', resultsJson);
    return resultsJson;
  }

  algorithmResultsDownloaded(){

    // if these results are downloaded, return true
    const vm = this;
    let downloadedResults = false;
    if (vm.jetpack.exists(vm.getAlgorithmResultsPath())) {
      downloadedResults = true;
    }
    return downloadedResults;
  }

  getAlgorithmResultsPath() {
    const vm = this;
    return vm.getProjectLocalResultsDir().path('results.csv');
  }

  getAlgorithmResultsMetadataPath() {
    const vm = this;
    return vm.getProjectLocalResultsDir().path('metadata.csv');
  }

  csvToJson(csv) {
  const content = csv.split('\n');
  const header = content[0].split(',');
  return _.tail(content).map((row) => {
    return _.zipObject(header, row.split(','));
  });
}

  getSeedsDropdownArr() {
    const vm = this;
    return vm.seedsDropdownArr;
  }

  getWeatherFilesDropdownArr() {
    const vm = this;
    return vm.weatherFilesDropdownArr;
  }

  setModified(isModified) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Project::setModified isModified: ', isModified);
    vm.modified = isModified;
  }

  // takes datestrings like these: 20161110T212644Z, 2016-11-22 11:10:50 -0700, 2016-11-22 04:32:23 UTC, or 2016-11-22T04:32:13.626Z
  makeDate(dateString) {

    let theDate = '';
    if (dateString) {
      if (dateString.slice(8, 9) == 'T') {
        // YYYYMMDDTHHMMSSZ: add punctuation to convert to valid datetime format and parse normally
        const tmp = dateString.slice(0, 4) + '-' + dateString.slice(4, 6) + '-' + dateString.slice(6, 11) + ':' + dateString.slice(11, 13) + ':' + dateString.slice(13, 16);
        theDate = new Date(tmp);
      } else {
        theDate = new Date(dateString);
      }
      // if (vm.Message.showDebug()) vm.$log.debug('***DATE: ', theDate, 'datestring was: ', dateString);
    }
    return theDate;
  }

  formatDate(dateString) {
    const vm = this;
    let theDate = '';

    if (dateString) {
      theDate = vm.makeDate(dateString);
      // format
      theDate = theDate.getMonth() + 1 + '/' + theDate.getDate() + '/' + theDate.getFullYear();
    }

    return theDate;
  }

  getModified() {
    const vm = this;
    return vm.modified;
  }

  modifiedModal() {
    const vm = this;
    const deferred = vm.$q.defer();
    if (vm.Message.showDebug()) vm.$log.debug('Project::modifiedModal');

    if (vm.getModified()) {
      const modalInstance = vm.$uibModal.open({
        backdrop: 'static',
        controller: 'ModalModifiedController',
        controllerAs: 'modal',
        templateUrl: 'app/project/modified.html'
      });

      modalInstance.result.then(() => {
        if (vm.Message.showDebug()) vm.$log.debug('Resolving openModal()');
        deferred.resolve('resolved');
      }, () => {
        // Modal canceled
        deferred.reject('rejected');
      });
    } else {
      deferred.resolve('resolved');
    }

    return deferred.promise;
  }

  html(input) {
    const vm = this;
    return vm.$sce.trustAsHtml(input);
  }

}
