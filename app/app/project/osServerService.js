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
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

export class OsServer {
  constructor($q, $http, $log, $uibModal, Project, DependencyManager, Message, toastr, $translate) {
    'ngInject';

    const vm = this;
    vm.Project = Project;
    vm.$log = $log;
    vm.$uibModal = $uibModal;
    vm.$q = $q;
    vm.$http = $http;
    vm.jetpack = jetpack;
    vm.AdmZip = AdmZip;
    vm.Message = Message;
    vm.$translate = $translate;
    vm.toastr = toastr;

    // set number of workers from project.
    vm.numCores = os.cpus().length;
    vm.numWorkers = vm.Project.getNumberWorkers();
    // if (vm.numCores) {
    //   vm.numWorkers = vm.numCores == 1 ? 1 : (vm.numCores - 1);
    // }
    vm.$log.info('Number of cores: ', vm.numCores);
    vm.$log.info('Number of workers set to: ', vm.numWorkers);

    const src = jetpack.cwd(window.patBridge.paths.userData);
    if (vm.Message.showDebug()) vm.$log.debug('src.path(): ', src.path());

    vm.cliPath = DependencyManager.getPath('PAT_OS_CLI_PATH');
    vm.metaCLIPath = DependencyManager.getPath('PAT_OS_META_CLI_PATH');
    vm.mongoPath = DependencyManager.getPath('PAT_MONGO_PATH');
    vm.mongoDirPath = path.dirname(vm.mongoPath);
    vm.openstudioBindingsPath = DependencyManager.getPath('PAT_OS_BINDING_PATH');
    vm.openstudioBindingsDirPath = path.dirname(vm.openstudioBindingsPath);
    vm.rubyPath = DependencyManager.getPath('PAT_RUBY_PATH');
    vm.energyplusEXEPath = DependencyManager.getPath('ENERGYPLUS_EXE_PATH');

    vm.initializeServer();

    vm.package_openstudio_version = '';
    vm.setOpenStudioVersion();

    // store these in Project service so they can be exported
    // vm.analysisID = null;
    // vm.datapoints = [];

  }

  initializeServer() {
    const vm = this;
    vm.numberDPsToDisplay = vm.Project.getNumberDPsToDisplay();
    vm.numWorkers = vm.Project.getNumberWorkers();
    vm.localServerURL = 'http://localhost:8080';  // default URL.  will be reset when starting server
    vm.serverStatuses = {local: 'stopped', remote: 'stopped'};  // started, stopped, error?
    vm.analysisStatus = '';  // '', starting, started, in progress, queued, completed, error, canceled
    vm.analysisRunningFlag = false;
    vm.progress = {amount: 0, message: ''};
    vm.isDone = true;
    vm.analysisChangedFlag = false;
    vm.datapointsStatus = [];
    vm.disabledButtons = false;  // display run or cancel button

    vm.selectedServerURL = vm.resetSelectedServerURL();
    // to run meta_cli
    vm.exec = require('child_process').exec;
    vm.localServerChild = null;
    vm.remoteServerChild = null;

    // server start in progress?
    // local
    vm.serverStartInProgress = false;
    vm.serverStartDeferred = vm.$q.defer();
    // local stop
    vm.serverStopInProgress = false;
    // remote
    vm.remoteStartInProgress = false;
    vm.remoteStartDeferred = vm.$q.defer();
    // remote stop
    vm.remoteStopInProgress = false;
  }

  isServerReady() {
    const vm = this;
    return vm.serverStartDeferred.promise;
  }

  serverProgressStart() {
    const vm = this;
    vm.serverStartInProgress = true;
    vm.serverStartDeferred = vm.$q.defer();
  }

  serverProgressStop(type, message) {
    const vm = this;
    vm.serverStartInProgress = false;
    if (type == 'resolve') {
      vm.serverStartDeferred.resolve(message);
    } else {
      //reject
      vm.serverStartDeferred.reject(message);
    }
  }

  getServerStartInProgressFlag() {
    const vm = this;
    return vm.serverStartInProgress;
  }

  remoteProgressStart() {
    const vm = this;
    vm.remoteStartInProgress = true;
    vm.remoteStartDeferred = vm.$q.defer();
  }

  remoteProgressStop(type, message) {
    const vm = this;
    vm.remoteStartInProgress = false;
    if (type == 'resolve') {
      vm.remoteStartDeferred.resolve(message);
    } else {
      //reject
      vm.remoteStartDeferred.reject(message);
    }
  }

  isRemoteReady() {
    const vm = this;
    return vm.remoteStartDeferred.promise;
  }

  getRemoteStartInProgress() {
    const vm = this;
    return vm.remoteStartInProgress;
  }

  getRemoteStopInProgress() {
    const vm = this;
    return vm.remoteStopInProgress;
  }

  setRemoteStopInProgress(value) {
    const vm = this;
    vm.remoteStopInProgress = value;
  }

  setOpenStudioVersion() {
    // call openstudio CLI to get its version
    const vm = this;
    const deferred = vm.$q.defer();

    const command = '\"' + vm.cliPath + '\" openstudio_version';
    vm.$log.info('get openstudio version command: ', command);

    const child = vm.exec(command,
      (error, stdout, stderr) => {
        vm.$log.debug('THE PROCESS TERMINATED');
        if (vm.Message.showDebug()) vm.$log.debug('exit code: ', child.exitCode);
        if (vm.Message.showDebug()) vm.$log.debug('child: ', child);
        if (vm.Message.showDebug()) vm.$log.debug('stdout: ', stdout);
        if (vm.Message.showDebug()) vm.$log.debug('stderr: ', stderr);

        if (child.exitCode == 0) {
          // SUCCESS
          deferred.resolve(child);
        } else {
          if (error !== null) {
            vm.$log.error('exec error: ', error);
          }
          deferred.resolve(error);
        }
      });

    child.stdout.on('data', (data) => {
      if (vm.Message.showDebug()) vm.$log.debug('CAUGHT STDOUT: ', data);
      vm.package_openstudio_version = data;
    });

    return deferred.promise;
  }

  getOpenStudioVersion() {
    const vm = this;
    return vm.package_openstudio_version;
  }

  openServerToolsModal() {
    const vm = this;
    const deferred = vm.$q.defer();
    const modalInstance = vm.$uibModal.open({
      backdrop: 'static',
      controller: 'ModalServerToolsController',
      controllerAs: 'modal',
      templateUrl: 'app/project/serverTools.html'

    });

    modalInstance.result.then(() => {
      deferred.resolve();
    }, () => {
      // Modal canceled
      deferred.reject();
    });
    return deferred.promise;

  }

  resetAnalysis(selectedOnly = false) {
    const vm = this;
    vm.setAnalysisChangedFlag(false);
    // reset analysis ID
    vm.Project.setAnalysisID(null);

    if (vm.Project.getAnalysisType() == 'Manual') {
      // reset certain fields on datapoint
      const datapoints = vm.Project.getDatapoints();
      _.forEach(datapoints, (dp, index) => {
        if (!selectedOnly || dp.selected) {
          const newDP = {name: dp.name, id: dp.name, run: false, modified: false, selected: dp.selected};
          datapoints[index] = newDP;
        }
      });
      vm.Project.setDatapoints(datapoints);
    } else {
      vm.Project.setDatapoints([]);
    }
    vm.setDatapointsStatus([]);

    vm.Project.setModified(true);

  }

  getNumberCores() {
    const vm = this;
    return vm.numCores;
  }

  getSelectedServerURL() {
    const vm = this;
    return vm.selectedServerURL;
  }

  setSelectedServerURL(url) {
    const vm = this;
    vm.selectedServerURL = url;
  }

  resetSelectedServerURL() {
    const vm = this;
    if (vm.Project.getRunType().name == 'local') {
      vm.selectedServerURL = vm.localServerURL;
    } else {
      // set to URL in remoteSettings (external or cloud)
      const rs = vm.Project.getRemoteSettings();
      vm.$log.info('REMOTE SETTINGS: ', rs);
      vm.selectedServerURL = rs.remoteServerURL;
    }
    vm.$log.info('Selected Server URL set to: ', vm.selectedServerURL);
  }

  getServerStatus(env) {
    const vm = this;
    return vm.serverStatuses[env];
  }

  setServerStatus(env, status) {
    const vm = this;
    vm.serverStatuses[env] = status;
  }

  getServerStatuses() {
    const vm = this;
    return vm.serverStatuses;
  }

  getAnalysisStatus() {
    const vm = this;
    return vm.analysisStatus;
  }

  setAnalysisStatus(analysisStatus) {
    const vm = this;
    vm.analysisStatus = analysisStatus;
  }

  getProgress() {
    const vm = this;
    return vm.progress;
  }

  setProgress(amount, message) {
    const vm = this;
    vm.progress.amount = amount;
    vm.progress.message = message;
  }

  getIsDone() {
    const vm = this;
    return vm.isDone;
  }

  setIsDone(isDone) {
    const vm = this;
    vm.isDone = isDone;
  }

  getAnalysisChangedFlag() {
    const vm = this;
    return vm.analysisChangedFlag;
  }

  setAnalysisChangedFlag(flag) {
    const vm = this;
    vm.analysisChangedFlag = flag;
  }

  setAnalysisRunningFlag(flag) {
    const vm = this;
    vm.analysisRunningFlag = flag;
  }

  getAnalysisRunningFlag() {
    const vm = this;
    return vm.analysisRunningFlag;
  }

  // short analysis status
  getDatapointsStatus() {
    const vm = this;
    return vm.datapointsStatus;
  }

  setDatapointsStatus(datapoints) {
    const vm = this;
    vm.datapointsStatus = datapoints;
    vm.Project.setModified(true);
  }

  getDisabledButtons() {
    const vm = this;
    return vm.disabledButtons;
  }

  setDisabledButtons(isDisabled) {
    const vm = this;
    vm.disabledButtons = isDisabled;
  }

  getServerType() {
    const vm = this;
    return vm.serverType;
  }

  setServerType(type) {
    const vm = this;
    vm.serverType = type;
  }

  // ping server (this isn't used for the cloud
  pingServer() {
    const vm = this;
    const serverType = vm.Project.getRunType().name;
    const remoteSettings = vm.Project.getRemoteSettings();

    vm.$log.info("SERVER TYPE: ", serverType);
    vm.$log.info("REMOTE SETTINGS: ", remoteSettings);

    if (serverType == 'local') {
      // in case server didn't shut down correctly before
      vm.getLocalServerUrlFromFile();
    } else {
      // remote
      vm.resetSelectedServerURL();
    }

    vm.$log.info('Pinging ', serverType, ' server to see if it is alive: ', vm.selectedServerURL);
    const deferred = vm.$q.defer();
    const url = vm.selectedServerURL + '/status.json';
    vm.$log.info('Ping Server URL: ', url);
    vm.$http.get(url).then(response => {
      // send json to run controller
      if (vm.Message.showDebug()) vm.$log.debug('PING: Server is started');
      if (vm.Message.showDebug()) vm.$log.debug('status JSON response: ', response);
      vm.setServerStatus(serverType, 'started');
      deferred.resolve(response);

    }, response => {
      vm.$log.error('PING:  Server is not started');
      vm.setServerStatus(serverType, 'stopped');
      deferred.reject(response);
    });

    return deferred.promise;
  }

  // start server (remote or local) if force != null, start the specified server (local only, remote can't be force-started unless 'Run on Cloud' is selected)
  startServer(force = null) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('***** In osServerService::startServer() *****');
    const deferred = vm.$q.defer();

    const serverType = vm.Project.getRunType().name;
    vm.$log.info('START SERVER...SERVER TYPE: ', serverType);
    vm.$log.info('SERVER STATUS: ', vm.getServerStatus(serverType));

    if ((vm.getServerStatus(serverType) != 'started') || force) {
      if (force == 'local' || serverType == 'local') {
        // local server
        // check if server is currently starting
        if (vm.serverStartInProgress) {
          if (vm.Message.showDebug()) vm.$log.debug('***Server is already in the process of starting...waiting on serverStartDeferred to resolve');
          vm.isServerReady().then((response) => {
            if (vm.Message.showDebug()) vm.$log.debug('Server is started!');
            deferred.resolve(response);
          }, (error) => {
            vm.$log.error('ERROR in start local server: ', error);
            deferred.reject(error);
          });
        } else {

          // **always attempt to stop the server first in case local_config file or server.pid already exists**
          // stopServer always resolves
          if (vm.Message.showDebug()) vm.$log.debug('force stopping server just in case...');
          vm.stopServer('local').then(() => {
            // start server (reset promise)
            if (vm.Message.showDebug()) vm.$log.debug('***Server start not already in progress...start server');
            vm.serverProgressStart();
            vm.localServer().then(response => {
              if (vm.Message.showDebug()) vm.$log.debug('localServer promise resolved.  Server should have started');
              vm.setServerStatus(serverType, 'started');
              // server start no longer in progress
              vm.serverProgressStop('resolve', response);
              deferred.resolve(response);
            }, error => {
              vm.$log.error('ERROR in start local server: ', error);
              vm.serverProgressStop('reject', error);
              deferred.reject(error);
            });
          });
        }
      }
      else {
        // remote server
        vm.$log.info('Starting Remote Server');
        if (vm.remoteStartInProgress) {
          vm.$log.info("hi1");
          if (vm.Message.showDebug()) vm.$log.debug('***Remote Server is already in the process of starting...waiting on serverStartDeferred to resolve');
          vm.isRemoteReady().then((response) => {
            if (vm.Message.showDebug()) vm.$log.debug('Server is started!');
            deferred.resolve(response);
          }, (error) => {
            vm.$log.error('ERROR in start local server: ', error);
            deferred.reject(error);
          });
        } else {
           vm.$log.info("hi2");
          vm.remoteProgressStart();
          vm.remoteServer().then(response => {
            if (vm.Message.showDebug()) vm.$log.debug('OsServerService::StartServer: setting server to started');
            vm.setServerStatus(serverType, 'started');
            vm.remoteProgressStop('resolve', response);
            deferred.resolve(response);
          }, error => {
            vm.$log.error('ERROR in start remote server: ', error);
            vm.remoteProgressStop('reject', error);
            deferred.reject(error);
          });
        }
      }
    } else {
      // server already started
      if (vm.Message.showDebug()) vm.$log.debug('Server already started!');
      deferred.resolve('Server Already Started');
    }

    return deferred.promise;
  }

  remoteServer() {
    const vm = this;
    vm.$log.info("remoteserver1");
    if (vm.Message.showDebug()) vm.$log.debug('***** In osServerService::remoteServer() *****');
    const deferred = vm.$q.defer();
    const serverType = vm.Project.getRunType().name;
     vm.$log.info("pinging remote server...");
    // ping URL to see if started
    vm.pingServer().then(response => {
      if (vm.Message.showDebug()) vm.$log.debug('Existing Remote Server Connected');
      deferred.resolve(response);
    }, error => {
      vm.$log.error('Cannot connect to Existing Remote Server at specified URL: ', error);
      deferred.reject(error);
    });

    return deferred.promise;
  }

  localServer() {

    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('***** In osServerService::localServer() *****');
    // See "https://github.com/NREL/OpenStudio-server/tree/dockerize-osw/server/spec/files/batch_datapoints" for test files
    const deferred = vm.$q.defer();

    // refetch numWorkers in case it has changed in serverTools modal
    vm.numWorkers = vm.Project.getNumberWorkers();

    // run META CLI will return status code: 0 = success, 1 = failure
    // start local server needs path to oscli (vm.cliPath)
    if (vm.platform == 'win32')
      vm.startServerCommand = '\"' + vm.rubyPath + '\" \"' + vm.metaCLIPath + '\"' + ' start_local --worker-number=' + vm.numWorkers + ' --energyplus-exe-path=' + '\"' + vm.energyplusEXEPath + '\"' + ' --openstudio-exe-path=' + '\"' + vm.cliPath + '\"' + ' --ruby-lib-path=' + '\"' + vm.openstudioBindingsDirPath + '\"' + ' --mongo-dir=' + '\"' + vm.mongoDirPath + '\" --debug \"' + vm.Project.projectDir.path() + '\"';
    else
      vm.startServerCommand = '\"' + vm.rubyPath + '\" \"' + vm.metaCLIPath + '\"' + ' start_local --worker-number=' + vm.numWorkers + ' --energyplus-exe-path=' + '\"' + vm.energyplusEXEPath + '\"' + ' --openstudio-exe-path=' + '\"' + vm.cliPath + '\"' + ' --ruby-lib-path=' + '\"' + vm.openstudioBindingsDirPath + '\"' + ' --mongo-dir=' + '\"' + vm.mongoDirPath + '\" --debug \"' + vm.Project.projectDir.path() + '\"';
    vm.$log.info('start server command: ', vm.startServerCommand);

    // fire off start_local and capture the child immediately
    vm.localServerChild = vm.exec(vm.startServerCommand);

    // stream its stdout in real time
    vm.localServerChild.stdout.on('data', chunk => {
      const line = chunk.toString().trim();
      if (line) console.log('[openstudio_meta stdout]', line);
    });

    // stream its stderr in real time
    vm.localServerChild.stderr.on('data', chunk => {
      const line = chunk.toString().trim();
      if (line) console.error('[openstudio_meta stderr]', line);
    });

    // when it finally exits, resolve or reject
    vm.localServerChild.on('exit', (code) => {
      if (code === 0) {
        vm.getLocalServerUrlFromFile();
        vm.$log.info('SERVER URL: ', vm.selectedServerURL);
        deferred.resolve(vm.localServerChild);
      } else {
        vm.$log.error('SERVER ERROR (exit code ' + code + ')');
        deferred.reject(new Error('start_local exited with ' + code));
      }
    });

    console.log(`Child pid: ${vm.localServerChild.pid}`);

    vm.localServerChild.on('close', (code, signal) => {
      console.log(`child closed due to receipt of signal ${signal} (exit code ${code})`);
    });

    vm.localServerChild.on('disconnect', (code, signal) => {
      console.log(`child disconnect due to receipt of signal ${signal} (exit code ${code})`);
    });

    vm.localServerChild.on('exit', (code, signal) => {
      console.log(`child exited due to receipt of signal ${signal} (exit code ${code})`);
      if (code == 0) {
        if (vm.Message.showDebug()) vm.$log.debug('Server started');
        vm.getLocalServerUrlFromFile();
        vm.$log.info('SERVER URL: ', vm.selectedServerURL);
        deferred.resolve();
      } else {
        vm.$log.error('Server failed to start');
        deferred.reject();
      }
      return deferred.promise;
    });

    vm.localServerChild.on('error', (code, signal) => {
      console.log(`child error due to receipt of signal ${signal} (exit code ${code})`);
    });

    vm.localServerChild.on('message', (code, signal) => {
      console.log(`child message due to receipt of signal ${signal} (exit code ${code})`);
    });

    return deferred.promise;
  }

  getLocalServerUrlFromFile() {
    const vm = this;
    // get url from local_configuration.json
    const serverType = vm.Project.getRunType().name;
    const obj = jetpack.read(vm.Project.projectDir.path() + '/local_configuration.json', 'json');
    if (obj) {
      vm.localServerURL = obj.server_url;
      if (serverType == 'local') {
        // if selected Server if local, set URL
        vm.setSelectedServerURL(obj.server_url);
      }
    } else {
      vm.$log.error('local_configuration.json obj undefined');
    }
  }

  getLocalServerUrl() {
    const vm = this;
    return vm.localServerURL;
  }

  runAnalysis(analysis_param) {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('***** In osServerService::runAnalysis() *****');
    const deferred = vm.$q.defer();

    // run META CLI will return status code: 0 = success, 1 = failure
    // TODO: catch what analysis type it is

    if (vm.platform == 'win32')
      vm.runAnalysisCommand = `"${vm.rubyPath}" "${vm.metaCLIPath}" run_analysis ${vm.Project.cliDebug} ${vm.Project.cliVerbose} --ruby-lib-path="${vm.openstudioBindingsDirPath}" "${vm.Project.projectDir.path()}/${vm.Project.getAnalysistName()}.json" "${vm.selectedServerURL}"`;
    else
      vm.runAnalysisCommand = `"${vm.rubyPath}" "${vm.metaCLIPath}" run_analysis ${vm.Project.cliDebug} ${vm.Project.cliVerbose} --ruby-lib-path="${vm.openstudioBindingsDirPath}" "${vm.Project.projectDir.path()}/${vm.Project.getAnalysisName()}.json" "${vm.selectedServerURL}"`;
    vm.$log.info('run analysis command: ', vm.runAnalysisCommand);

    const full_command = vm.runAnalysisCommand + ' -a ' + analysis_param.toLowerCase();
    if (vm.Message.showDebug()) vm.$log.debug('FULL run_analysis command: ', full_command);
    const child = vm.exec(full_command,
      (error, stdout, stderr) => {
        if (vm.Message.showDebug()) vm.$log.debug('exit code: ', child.exitCode);
        if (vm.Message.showDebug()) vm.$log.debug('child: ', child);
        if (vm.Message.showDebug()) vm.$log.debug('stdout: ', stdout);
        if (vm.Message.showDebug()) vm.$log.debug('stderr: ', stderr);

        if (child.exitCode == 0) {
          // SUCCESS
          vm.$log.info('Analysis Started');
          const analysis_arr = stdout.toString().split('request to run analysis ');
          const analysis_id = _.trim(_.last(analysis_arr), '\n');
          if (vm.Message.showDebug()) vm.$log.debug('ANALYSIS ID: ', analysis_id);
          deferred.resolve(analysis_id);
          vm.Project.setAnalysisID(analysis_id);
          vm.Project.setModified(true);

        } else {
          // TODO: cleanup?
          if (error !== null) {
            console.log('exec error: ', error);
          }
          deferred.reject(error);
        }
      });

    console.log(`Child pid: ${child.pid}`);

    child.on('close', (code, signal) => {
      console.log(`child closed due to receipt of signal ${signal} (exit code ${code})`);
    });

    child.on('disconnect', (code, signal) => {
      console.log(`child disconnect due to receipt of signal ${signal} (exit code ${code})`);
    });

    child.on('exit', (code, signal) => {
      console.log(`child exited due to receipt of signal ${signal} (exit code ${code})`);
      if (code == 0) {
        vm.$log.info('Analysis running');
        deferred.resolve();
      } else {
        vm.$log.error('Analysis failed to run');
        deferred.reject();
      }
      return deferred.promise;
    });

    child.on('error', (code, signal) => {
      console.log(`child error due to receipt of signal ${signal} (exit code ${code})`);
    });

    child.on('message', (code, signal) => {
      console.log(`child message due to receipt of signal ${signal} (exit code ${code})`);
    });

    return deferred.promise;
  }

  // stop server (local or remote), if force != null, force close the specified server (local/remote)
  // this ALWAYS resolves
  stopServer(force = null) {
    const vm = this;
    const deferred = vm.$q.defer();
    const serverType = vm.Project.getRunType().name;

    // can't stop anything if a project isn't selected
    if ((force || vm.getServerStatus(serverType) == 'started') && vm.Project.projectDir != null) {

      if (force == 'local' || serverType == 'local') {
        if (vm.Message.showDebug()) vm.$log.debug('vm.Project:', vm.Project);
        if (vm.Message.showDebug()) vm.$log.debug('vm.Project.projectDir:', vm.Project.projectDir.path());

        vm.stopServerCommand = '\"' + vm.rubyPath + '\" \"' + vm.metaCLIPath + '\"' + ' stop_local ' + '\"' + vm.Project.projectDir.path() + '\"';
        vm.$log.info('stop server command: ', vm.stopServerCommand);

        // do nothing if server is stopped and start is not in progress
        if (!vm.serverStartInProgress && vm.getServerStatus('local') == 'stopped') {
          // resolve
          deferred.resolve('Server is already stopped');
        }
        // if server is in process of starting, wait to start before stopping
        else if (vm.serverStartInProgress) {
          // wait until server starts before stopping it
          vm.$translate('toastr.localStartInProgressBeforeStop').then(translation => {
            vm.toastr.info(translation, {timeOut: 600000});
          });
          if (vm.Message.showDebug()) vm.$log.debug('***Server is in the process of starting...waiting on serverStartDeferred to resolve before stopping server');
          vm.isServerReady().then((response) => {
            vm.toastr.clear();
            if (vm.Message.showDebug()) vm.$log.debug('serverStartDeferred has resolved...can now stop server');
            const child = vm.exec(vm.stopServerCommand,
              (error, stdout, stderr) => {
                console.log('THE PROCESS TERMINATED');
                if (vm.Message.showDebug()) vm.$log.debug('exit code: ', child.exitCode);
                if (vm.Message.showDebug()) vm.$log.debug('child: ', child);
                if (vm.Message.showDebug()) vm.$log.debug('stdout: ', stdout);
                if (vm.Message.showDebug()) vm.$log.debug('stderr: ', stderr);

                if (child.exitCode == 0) {
                  // SUCCESS
                  if (vm.Message.showDebug()) vm.$log.debug('Server Stopped');
                  vm.setServerStatus(serverType, 'stopped');
                  vm.localServerCleanup();
                  deferred.resolve(child);
                  vm.toastr.clear();

                } else {
                  if (error !== null) {
                    console.log('exec error: ', error);
                  }
                  // Note: even if there is an error stopping the server in one location,
                  // return resolved so promise can be used to start new server
                  vm.localServerCleanup();
                  deferred.resolve(error);
                  vm.toastr.clear();
                }
              });
          }, (error) => {
            vm.$log.error('ERROR in start local server, but attempting to stop server anyway');
            const child = vm.exec(vm.stopServerCommand,
              (error, stdout, stderr) => {
                console.log('THE PROCESS TERMINATED');
                if (vm.Message.showDebug()) vm.$log.debug('exit code: ', child.exitCode);
                if (vm.Message.showDebug()) vm.$log.debug('child: ', child);
                if (vm.Message.showDebug()) vm.$log.debug('stdout: ', stdout);
                if (vm.Message.showDebug()) vm.$log.debug('stderr: ', stderr);

                if (child.exitCode == 0) {
                  // SUCCESS
                  if (vm.Message.showDebug()) vm.$log.debug('Server Stopped');
                  vm.setServerStatus(serverType, 'stopped');
                  vm.localServerCleanup();
                  deferred.resolve(child);

                } else {
                  if (error !== null) {
                    console.log('exec error: ', error);
                  }
                  // Note: even if there is an error stopping the server in one location,
                  // return resolved so promise can be used to start new server
                  vm.localServerCleanup();
                  deferred.resolve(error);
                }
              });
          });
        } else {
          // server start is not in progress

          const child = vm.exec(vm.stopServerCommand,
            (error, stdout, stderr) => {
              console.log('THE PROCESS TERMINATED');
              if (vm.Message.showDebug()) vm.$log.debug('exit code: ', child.exitCode);
              if (vm.Message.showDebug()) vm.$log.debug('child: ', child);
              if (vm.Message.showDebug()) vm.$log.debug('stdout: ', stdout);
              if (vm.Message.showDebug()) vm.$log.debug('stderr: ', stderr);

              if (child.exitCode == 0) {
                // SUCCESS
                if (vm.Message.showDebug()) vm.$log.debug('Server Stopped');
                vm.setServerStatus(serverType, 'stopped');
                vm.localServerCleanup();
                deferred.resolve(child);

              } else {
                if (error !== null) {
                  console.log('exec error: ', error);
                }
                // Note: even if there is an error stopping the server in one location,
                // return resolved so promise can be used to start new server
                vm.localServerCleanup();
                deferred.resolve(error);
              }
            });
        }

      } else {
        
        // remote server
        vm.$log.info('Stopping Existing Remote Server');
        vm.setServerStatus(serverType, 'stopped');
        vm.setSelectedServerURL(null);
        deferred.resolve('Server Disconnected');

      }
    } else {
      // Server already stopped
      deferred.resolve('Server already stopped');
    }

    return deferred.promise;
  }

  localServerCleanup() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('LOCAL SERVER CLEANUP');
    // delete local_configuration.json and .receipt
    vm.jetpack.remove(vm.Project.getProjectDir().path('local_configuration.json'));
    vm.jetpack.remove(vm.Project.getProjectDir().path('local_configuration.receipt'));
    // delete server.pid
    vm.jetpack.remove(vm.Project.getProjectDir().path('server.pid'));
    // delete temp_data folder
    vm.jetpack.remove(vm.Project.getProjectDir().path('temp_data'));
    // delete everything in data/db
    vm.jetpack.remove(vm.Project.getProjectDir().path('data/db/*'));
    // delete .temp
    vm.jetpack.remove(vm.Project.getProjectDir().path('.temp'));
    // delete logs
    vm.jetpack.remove(vm.Project.getProjectDir().path('logs/*'));
    if (vm.Message.showDebug()) vm.$log.debug('SERVER CLEANUP COMPLETE');

  }

  retrieveAnalysisStatus() {
    const vm = this;
    const deferred = vm.$q.defer();
    const url = vm.selectedServerURL + '/analyses/' + vm.Project.getAnalysisID() + '/status.json';
    if (vm.Message.showDebug()) vm.$log.debug('Analysis Status URL: ', url);
    vm.$http.get(url).then(response => {
      // send json to run controller
      if (vm.Message.showDebug()) vm.$log.debug('status JSON response: ', response);
      deferred.resolve(response);

    }, response => {
      if (vm.Message.showDebug()) vm.$log.debug('ERROR getting status for analysis ', vm.Project.getAnalysisID());
      deferred.reject(response);
    });

    return deferred.promise;
  }

  updateDatapoints() {

    // get Datapoints out.osw for datapoint IDs
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];
    let promise = null;

    vm.selectedAnalysisType = vm.Project.getAnalysisType();
    const datapoints = vm.Project.getDatapoints();

    // download/replace out.osw (manual only)
    if (vm.selectedAnalysisType == 'Manual') {

      _.forEach(vm.datapointsStatus, (dp) => {
        // if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT STATUS: ', dp);

        const url = vm.selectedServerURL + '/data_points/' + dp.id + '/download_result_file';
        const params = {filename: 'out.osw'};
        const config = {params: params, headers: {Accept: 'application/json'}};
        if (vm.Message.showDebug()) vm.$log.debug('****URL: ', url);

        promise = vm.$http.get(url, config).then(response => {
          // save OSW to file
          if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT OUT.OSW response: ', response.data);
          const datapoint = response.data;
          vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path(dp.id, 'out.osw'), datapoint);

          // also load in datapoints array
          datapoint.status = dp.status;
          datapoint.final_message = dp.final_message;
          datapoint.id = dp.id;

          // match by ID first
          const dp_match = _.findIndex(datapoints, {id: dp.id});
          if (vm.Message.showDebug()) vm.$log.debug('DP match results for: ', dp.name, ': ', dp_match);
          if (dp_match != -1) {
            // merge
            _.merge(datapoints[dp_match], datapoint);

            if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH (by ID)! New dp: ', datapoints[dp_match]);
          } else {
            // match by name
            const dp_match2 = _.findIndex(datapoints, {name: dp.name});
            if (dp_match2 != -1) {
              // merge
              _.merge(datapoints[dp_match2], datapoint);

              if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH (by Name)! New dp: ', datapoints[dp_match2]);
            } else {
              // append datapoint to array
              datapoints.push(datapoint);
              if (vm.Message.showDebug()) vm.$log.debug('No Datapoint match for: ', dp.name);
            }
          }
          if (vm.Message.showDebug()) vm.$log.debug('PROJECT DATAPOINTS NOW: ', vm.Project.getDatapoints());

        }, error => {
          vm.$log.error('GET DATAPOINT OUT.OSW ERROR (file probably not created yet): ', error);
          // if 422 error, out.osw doesn't exist yet...get datapoint.json instead
          if (error.status == 422 || error.status == 404) {
            vm.$log.error('422/404 Error...GETting datapoint json instead');
            const datapointUrl = vm.selectedServerURL + '/data_points/' + dp.id + '.json';
            if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT URL: ', datapointUrl);
            if (vm.Message.showDebug()) vm.$log.debug('DP: ', dp);
            const promise2 = vm.$http.get(datapointUrl).then(response2 => {
              // set datapoint array
              if (vm.Message.showDebug()) vm.$log.debug('datapoint JSON raw response: ', response2);
              //vm.$log.info('datapoint JSON response: ', response2.data.data_point);
              const datapoint = response2.data.data_point;
              datapoint.status = dp.status;
              datapoint.final_message = dp.final_message;
              datapoint.id = dp.id;
              // match by ID first
              const dp_match = _.findIndex(datapoints, {id: dp.id});
              if (vm.Message.showDebug()) vm.$log.debug('DP2 match results for: ', dp.name, ' : ', dp_match);
              if (dp_match != -1) {
                // merge
                _.merge(datapoints[dp_match], datapoint);
                if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH (by ID)! New dp: ', datapoints[dp_match]);
              } else {
                // match by name
                const dp_match2 = _.findIndex(datapoints, {name: dp.name});
                if (dp_match2 != -1) {
                  // merge
                  _.merge(datapoints[dp_match2], datapoint);
                  if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH (by Name)! New dp: ', datapoints[dp_match2]);
                }
                else {
                  // append datapoint to array
                  datapoints.push(datapoint);
                  if (vm.Message.showDebug()) vm.$log.debug('No Datapoint match for: ', dp.name);
                }
              }
            }, error2 => {
              vm.$log.error('GET Datapoint.json ERROR: ', error2);
            });
            promises.push(promise2);
          }
        });
        promises.push(promise);
      });
    } else {
      if (vm.datapointsStatus.length <= vm.numberDPsToDisplay) {
        if (vm.Message.showDebug()) vm.$log.debug('HERE: algorithmic - small project');
        // algorithmic, just get datapoint.json, not osw
        _.forEach(vm.datapointsStatus, (dp) => {

          const datapointUrl = vm.selectedServerURL + '/data_points/' + dp.id + '.json';
          if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT URL: ', datapointUrl);
          if (vm.Message.showDebug()) vm.$log.debug('DP: ', dp);
          promise = vm.$http.get(datapointUrl).then(response2 => {
            // set datapoint array
            if (vm.Message.showDebug()) vm.$log.debug('datapoint JSON raw response: ', response2);
            //vm.$log.info('datapoint JSON response: ', response2.data.data_point);
            const datapoint = response2.data.data_point;
            datapoint.status = dp.status;
            datapoint.final_message = dp.final_message;
            datapoint.id = dp.id;

            const dp_match = _.findIndex(datapoints, {id: dp.id});
            //if (vm.Message.showDebug()) vm.$log.debug('DP2 match results for: ', dp.name, ' : ', dp_match);
            if (dp_match != -1) {
              // merge
              _.merge(datapoints[dp_match], datapoint);
              // if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH! New dp: ', datapoints[dp_match]);
            } else {
              // also load in datapoints array
              datapoints.push(datapoint);
            }
          }, error2 => {
            vm.$log.error('GET Datapoint.json ERROR: ', error2);
          });
          promises.push(promise);
        });
        if (vm.Message.showDebug()) vm.$log.debug('**DATAPOINTS**: ', datapoints);
      } else {
        if (vm.Message.showDebug()) vm.$log.debug('Too many datapoints...using datapointStatus instead');
        // too many datapoints:  use datapointStatus only
        const newDPs = [];

        for (var i = 0; i < vm.numberDPsToDisplay; i++) {

          const datapoint = vm.datapointsStatus[i];
          const dp_match = _.findIndex(datapoints, {id: datapoint.id});
          //if (vm.Message.showDebug()) vm.$log.debug('DP2 match results for: ', dp.name, ' : ', dp_match);
          if (dp_match != -1) {
            // merge
            _.merge(datapoints[dp_match], datapoint);
            // if (vm.Message.showDebug()) vm.$log.debug('DATAPOINT MATCH! New dp: ', datapoints[dp_match]);
            newDPs.push(datapoints[dp_match]);
          } else {
            // also load in datapoints array
            newDPs.push(datapoint);
          }
        }
        vm.Project.setDatapoints(newDPs);
        if (vm.Message.showDebug()) vm.$log.debug('REORDERED ALGORITHMIC DATAPOINTS: ', vm.Project.getDatapoints());
      }
    }

    vm.$q.all(promises).then(() => {
      // reorder algorithmic datapoints to match status
      if (vm.selectedAnalysisType == 'Algorithmic' && vm.datapointsStatus.length <= vm.numberDPsToDisplay) {
        // do this now for smaller projects.  already done (above) for large projects
        const newDPs = [];
        _.forEach(vm.datapointsStatus, (dp, index) => {
          const dp_match = _.findIndex(datapoints, {id: dp.id});
          if (dp_match != -1) {
            newDPs.push(datapoints[dp_match]);
          }
        });
        vm.Project.setDatapoints(newDPs);
        if (vm.Message.showDebug()) vm.$log.debug('REORDERED ALGORITHMIC DATAPOINTS: ', vm.Project.getDatapoints());
      }
      deferred.resolve(datapoints);
      vm.Project.setModified(true);
    }, error => {
      vm.$log.error('ERROR retrieving datapoints: ', error);
      deferred.reject(error);
    });
    return deferred.promise;
  }

  downloadReports() {
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];

    // download all reports (result files) as soon as a datapoint completes

    const datapoints = vm.Project.getDatapoints();

    if (datapoints.length > vm.numberDPsToDisplay) {
      // don't download anything...too many datapoints!
      deferred.resolve(datapoints);
    } else {
      _.forEach(datapoints, dp => {
        if (dp.status == 'completed' && !dp.downloaded_reports) {
          const url = vm.selectedServerURL + '/data_points/' + dp.id + '.json';
          const promise = vm.$http.get(url).then(response => {
            // get result files from response
            if (vm.Message.showDebug()) vm.$log.debug('datapoint.json: ', response);
            const resultFiles = response.data.data_point.result_files;
            dp.result_files = dp.result_files ? _.merge(dp.result_files, resultFiles) : resultFiles;
            const reportPromises = [];
            _.forEach(dp.result_files, file => {
              if (file.type == 'Report' && !file.downloaded) {
                // download file
                const reportUrl = vm.selectedServerURL + '/data_points/' + dp.id + '/download_result_file';
                const params = {filename: file.attachment_file_name};
                const config = {params: params, headers: {Accept: 'application/json'}};
                if (vm.Message.showDebug()) vm.$log.debug('****URL: ', reportUrl);
                const reportPromise = vm.$http.get(reportUrl, config).then(response => {
                  // write file and set downloaded flag
                  vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path(dp.id, file.attachment_file_name), response.data);
                  file.downloaded = true;

                }, reportError => {
                  vm.$log.error('GET report error: ', reportError);
                });
                reportPromises.push(reportPromise);  // this to set flag
                promises.push(reportPromise);  // this one to resolve overall function
              }
            });
            // when all reports are downloaded for a single datapoint
            vm.$q.all(reportPromises).then(() => {
              // set downloaded_reports flag
              dp.downloaded_reports = true;
              vm.Project.setModified(true);

              // if running locally, also download osm and results
              if (vm.Project.getRunType().name == 'local') {
                if (vm.Message.showDebug()) vm.$log.debug('Run Type is set to Local');
                const osm_promise = vm.downloadOSM(dp).then(() => {
                  vm.$log.info('osm downloaded for ', dp.name);
                }, error => {
                  vm.$log.error('OSM download failed for ', dp.name, ', error: ', error);
                });
                //promises.push(osm_promise);
                const result_promise = vm.downloadResults(dp).then(() => {
                  vm.$log.info('results downloaded for ', dp.name);
                }, error => {
                  vm.$log.error('RESULTS download failed for ', dp.name, ', error: ', error);
                });
                //promises.push(result_promise);
              }

            }, error => {
              vm.$log.error('Error downloading all reports for datapoint: ', dp.id, 'error: ', error);
            });

          }, error => {
            vm.$log.error('GET datapoint.json error: ', error);
          });
          promises.push(promise);

        }
      });

      vm.$q.all(promises).then(() => {
        vm.$log.info('Updated Datapoints with Reports: ', datapoints);
        deferred.resolve(datapoints);
        vm.Project.setModified(true);
      }, error => {
        vm.$log.error('ERROR retrieving datapoints JSONs: ', error);
        deferred.reject(error);
      });
    }

    return deferred.promise;
  }

  // download data_point.zip for all datapoints
  downloadAllResults() {
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];

    const datapoints = vm.Project.getDatapoints();

    // try out this way for large projects
    if (vm.datapointsStatus.length > vm.Project.getNumberDPsToDisplay()){
      const largeProject = true;
      _.forEach(vm.datapointsStatus, dp => {
        // download only non-downloaded results so you can call this function again in case of errors
        if (!dp.downloaded_results) {
          // find DP to udpate run tab
          let dpForResult = _.find(datapoints, {id: dp.id});
          const promise = vm.downloadResults(dp, largeProject, dpForResult);
          promises.push(promise);
        }
      });

    } else {
      _.forEach(datapoints, dp => {
        // download only non-downloaded results
        if (!dp.downloaded_results) {
          const promise = vm.downloadResults(dp);
          promises.push(promise);
        }
      });
    }

    vm.$q.all(promises).then(() => {
      vm.$log.info('All Datapoint results zip files downloaded');
      deferred.resolve();
    }, error => {
      vm.$log.error('ERROR downloading all datapoint results zip files', error);
      deferred.reject(error);
    });
    return deferred.promise;

  }

  // download data_point.zip
  downloadResults(datapoint, largeProject = false, dpForResult = undefined) {
    const vm = this;
    const deferred = vm.$q.defer();

    // assume filename is data_point.zip for large projects
    let filename = 'data_point.zip';
    let file = undefined;
    if (!largeProject){
      file = _.find(datapoint.result_files, {type: 'Data Point'});
      if (file) {
        filename = file.attachment_file_name;
      }
    }

    const reportUrl = vm.selectedServerURL + '/data_points/' + datapoint.id + '/download_result_file';
    const params = {filename: filename};
    const config = {params: params, headers: {Accept: 'application/json'}, responseType: 'arraybuffer'};
    vm.$log.info('Download Results URL: ', reportUrl);
    if (vm.Message.showDebug()) vm.$log.debug('params: ', params);
    vm.$http.get(reportUrl, config).then(response => {
      // write file and set downloaded flag
      if (vm.Message.showDebug()) vm.$log.debug('RESPONSE!! ', response);

      // extract dir and save to disk in local measures directory
      // convert arraybuffer to node buffer
      const buf = new Buffer.from(new Uint8Array(response.data));
      if (vm.Message.showDebug()) vm.$log.debug('buffer');

      // save
      vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path(datapoint.id, filename), buf);
      if (file) file.downloaded = true;
      datapoint.downloaded_results = true;

      if (largeProject && angular.isDefined(dpForResult)){
        dpForResult.downloaded_results = true;
      }

      vm.Project.setModified(true);
      deferred.resolve();
    }, error => {
      vm.$log.error('GET results zip error: ', error);
      deferred.reject();
    });

    return deferred.promise;
  }

  // download OSM for all datapoints
  downloadAllOSMs() {
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];

    const datapoints = vm.Project.getDatapoints();

    if (vm.datapointsStatus.length > vm.Project.getNumberDPsToDisplay()){
      // large project
      const largeProject = true;
      _.forEach(vm.datapointsStatus, dp => {
        if (!dp.downloaded_osm) {
          // download only the ones not yet downloaded
          // find DP to udpate run tab
          let dpForResult = _.find(datapoints, {id: dp.id});
          const promise = vm.downloadOSM(dp, largeProject, dpForResult);
          promises.push(promise);
        }
      });
    } else {
      _.forEach(datapoints, dp => {
        if (!dp.downloaded_osm) {
          // download only the ones not yet downloaded
          const promise = vm.downloadOSM(dp);
          promises.push(promise);
        }
      });
    }

    vm.$q.all(promises).then(() => {
      vm.$log.info('All OSMs downloaded');
      deferred.resolve();
    }, error => {
      vm.$log.error('ERROR downloading all OSMs', error);
      deferred.reject(error);
    });
    return deferred.promise;

  }

  // download data_point.zip
  downloadOSM(datapoint, largeProject = false, dpForResult = undefined) {
    const vm = this;
    const deferred = vm.$q.defer();

    // assume filename is in.osm for large projects
    let filename = 'in.osm';
    let file = undefined;
    if (!largeProject){
      file = _.find(datapoint.result_files, {type: 'OpenStudio Model'});
      if (file) {
        filename = file.attachment_file_name;
      }
    }

    const reportUrl = vm.selectedServerURL + '/data_points/' + datapoint.id + '/download_result_file';
    const params = {filename: filename};
    const config = {params: params, headers: {Accept: 'application/json'}};
    if (vm.Message.showDebug()) vm.$log.info('Download OSM URL: ', reportUrl);
    vm.$http.get(reportUrl, config).then(response => {
      // write file and set downloaded flag
      vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path(datapoint.id, filename), response.data);
      if (file) file.downloaded = true;
      datapoint.downloaded_osm = true;

      if (largeProject && angular.isDefined(dpForResult)){
        dpForResult.downloaded_osm = true;
      }
      vm.Project.setModified(true);
      deferred.resolve();
    }, error => {
      vm.$log.error('GET OSM error: ', error);
      deferred.reject();
    });

    return deferred.promise;
  }

  downloadAlgorithmResults() {
    const vm = this;
    const deferred = vm.$q.defer();
    const promises = [];
    const analysisID = vm.Project.getAnalysisID();
    let config = {};
    let params = {};


    // metadata.csv
    // analyses/<id>/variables/download_variables.csv
    const url1 = vm.selectedServerURL + '/analyses/' + analysisID + '/variables/download_variables.csv';
    config = {headers: {Accept: 'application/json'}};
    if (vm.Message.showDebug()) vm.$log.info('Download Metadata CSV: ', url1);
    const promise1 = vm.$http.get(url1, config).then(response1 => {
      // write file
      vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path('metadata.csv'), response1.data);
      deferred.resolve();
    }, error => {
      vm.$log.error('GET Metadata.csv error: ', error);
      deferred.reject();
    });
    promises.push(promise1);

    // results.csv
    // analyses/<id>/download_data.csv?export=true
    const url2 = vm.selectedServerURL + '/analyses/' + analysisID + '/download_data.csv';
    params = {'export': true};
    config = {params: params, headers: {Accept: 'application/json'}};
    if (vm.Message.showDebug()) vm.$log.info('Download results CSV: ', url2);
    const promise2 = vm.$http.get(url2, config).then(response2 => {
      // write file
      vm.jetpack.write(vm.Project.getProjectLocalResultsDir().path('results.csv'), response2.data);
      deferred.resolve();
    }, error => {
      vm.$log.error('GET results.csv error: ', error);
      deferred.reject();
    });
    promises.push(promise2);

    vm.$q.all(promises).then(() => {
      vm.$log.info('Analysis CSVs downloaded');
      vm.Project.setModified(true);
      deferred.resolve();
    }, error => {
      vm.$log.error('ERROR downloading analysis CSVs', error);
      deferred.reject(error);
    });
    return deferred.promise;

  }

  stopAnalysis() {
    const vm = this;
    const url = vm.selectedServerURL + '/analyses/' + vm.Project.getAnalysisID() + '/action.json';
    const params = {analysis_action: 'stop'};

    if (vm.analysisStatus == 'completed') {
      if (vm.Message.showDebug()) vm.$log.debug('Analysis is already completed');
      return;
    }

    return vm.$http.post(url, params)
      .then(res => {
        vm.$log.info('stop analysis Success!, status: ', res.status);
        vm.setAnalysisStatus('canceled');
        return res.data;
      })
      .catch(res => {
        vm.$log.error('stop analysis error: ', res.data);
        return Promise.reject([]);
      });
  }

  // analysis running dialog
  showAnalysisRunningDialog() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('In showAnalysisRunningDialog function');
    const modalInstance = vm.$uibModal.open({
      backdrop: 'static',
      controller: 'ModalAnalysisRunningController',
      controllerAs: 'modal',
      templateUrl: 'app/run/analysisRunning.html',
      windowClass: 'modal'
    });
  }

  cloudRunningModal() {
    const vm = this;
    const deferred = vm.$q.defer();
    vm.remoteSettings = vm.Project.getRemoteSettings();
    vm.runType = vm.Project.getRunType();
    // if connected to cloud
    if (vm.remoteSettings.aws && vm.remoteSettings.aws.connected && vm.runType.name == 'remote') {
      // local results exist
      const modalInstance = vm.$uibModal.open({
        backdrop: 'static',
        controller: 'ModalCloudRunningController',
        controllerAs: 'modal',
        templateUrl: 'app/run/cloudRunning.html'
      });

      modalInstance.result.then(() => {
        // stop server
        vm.stopServer().then(() => {
          deferred.resolve('resolve');
        }, () => {
          deferred.reject('rejected');
        });
      }, () => {
        // Modal canceled
        deferred.reject('rejected');
      });
    } else {
      // cloud not running
      deferred.resolve('resolved');
    }
    return deferred.promise;
  }

}
