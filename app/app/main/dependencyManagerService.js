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
import AdmZip from 'adm-zip';
import os from 'os';

import { getEnv } from '../../env';
const env = getEnv(window.patBridge.appPath);

export class DependencyManager {

  constructor($q, $http, $log, $translate, $uibModal, StatusBar, Message) {
    'ngInject';

    const vm = this;
    vm.$http = $http;
    vm.$q = $q;
    vm.$log = $log;
    vm.$translate = $translate;
    vm.jetpack = jetpack;
    vm.AdmZip = AdmZip;
    vm.StatusBar = StatusBar;
    vm.translations = {};
    vm.exec = require('child_process').exec;
    vm.platform = os.platform();
    vm.$q = $q;
    vm.$uibModal = $uibModal;
    vm.downloadStatus = 'N/A';
    vm.Message = Message;

    vm.tempDir = jetpack.cwd(window.patBridge.paths.temp);
    if (vm.Message.showDebug()) vm.$log.debug('TEMPDIR HERE: ', window.patBridge.paths.temp);
    vm.src = jetpack.cwd(window.patBridge.appPath + '/Resources/');
    if (vm.Message.showDebug()) vm.$log.debug('src:', vm.src.path());
  }

  // The following are valid names to ask for
  // "PAT_OS_CLI_PATH" "PAT_OS_META_CLI_PATH" "PAT_OS_BINDING_PATH" "PAT_RUBY_PATH" "PAT_MONGO_PATH"
  getPath(name) {
    const vm = this;

    let prefixPath = undefined;

    let exeExt = '';
    if (os.platform() == 'win32') {
      exeExt = '.exe';
    }
    let bindingExt = '.bundle'; // darwin
    if (os.platform() == 'win32') {
      bindingExt = '.so';
    } else if (os.platform() == 'linux') {
      bindingExt = '.so';
    }

    if (env.name == 'production') {
      if (os.platform() == 'win32') {
        prefixPath = jetpack.cwd(window.patBridge.paths.exe, '..');

        if (name == 'PAT_OS_CLI_PATH') {
          return prefixPath.path('OpenStudio/bin/openstudio' + exeExt);
        } else if (name == 'PAT_OS_BINDING_PATH') {
          return prefixPath.path('OpenStudio/Ruby/openstudio' + bindingExt);
        } else if (name == 'PAT_OS_META_CLI_PATH') {
          return prefixPath.path('OpenStudio-server/bin/openstudio_meta');
        } else if (name == 'PAT_RUBY_PATH') {
          return prefixPath.path('ruby/bin/ruby' + exeExt);
        } else if (name == 'PAT_MONGO_PATH') {
          return prefixPath.path('mongo/bin/mongod' + exeExt);
        } else if (name == 'ENERGYPLUS_EXE_PATH') {
          return prefixPath.path('EnergyPlus/energyplus' + exeExt);
        }
      } else {
        prefixPath = jetpack.cwd(window.patBridge.paths.exe, '../..', 'Resources');

        if (name == 'PAT_OS_CLI_PATH') {
          return prefixPath.path('OpenStudio/bin/openstudio' + exeExt);
        } else if (name == 'PAT_OS_BINDING_PATH') {
          return prefixPath.path('OpenStudio/Ruby/openstudio' + bindingExt);
        } else if (name == 'PAT_OS_META_CLI_PATH') {
          return prefixPath.path('OpenStudio-server/bin/openstudio_meta');
        } else if (name == 'PAT_RUBY_PATH') {
          return prefixPath.path('ruby/bin/ruby' + exeExt);
        } else if (name == 'PAT_MONGO_PATH') {
          return prefixPath.path('mongo/bin/mongod' + exeExt);
        } else if (name == 'ENERGYPLUS_EXE_PATH') {
          return prefixPath.path('EnergyPlus/energyplus' + exeExt);
        }
      }
    } else {
      prefixPath = jetpack.cwd(window.patBridge.appPath, '..', 'depend');
    }

    if (env[name]) {
      // Look in the env.json file
      if (vm.Message.showDebug()) vm.$log.debug('*** DEPENDENCY found in json file: ', env[name], ' ', name);
      return env[name];
    } else if (process.env[name]) {
      // Look for a system environment variable
      return process.env[name];
    } else {
      // Look in a default location
      if (name == 'PAT_OS_CLI_PATH') {
        return prefixPath.path('OpenStudio/bin/openstudio' + exeExt);
      } else if (name == 'PAT_OS_BINDING_PATH') {
        return prefixPath.path('OpenStudio/Ruby/openstudio' + bindingExt);
      } else if (name == 'PAT_OS_META_CLI_PATH') {
        return prefixPath.path('OpenStudio-server/bin/openstudio_meta');
      } else if (name == 'PAT_RUBY_PATH') {
        return prefixPath.path('ruby/bin/ruby' + exeExt);
      } else if (name == 'PAT_MONGO_PATH') {
        return prefixPath.path('mongo/bin/mongod' + exeExt);
      } else if (name == 'ENERGYPLUS_EXE_PATH') {
        // No default for EP. OpenStudio will look for ENERGYPLUS_EXE_PATH env var and then in the default, global location.
        return '';
      }
    }
  }
}
