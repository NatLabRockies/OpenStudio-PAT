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
export function runBlock($rootScope, $state, $window, $translate, toastr, MeasureManager, DependencyManager, Project, BCL, OsServer, SetProject, OpenProject, $log, Message, RemoteHelper) {
  'ngInject';

  const shell = RemoteHelper.shell;
  let exitReady = false;

  $window.onbeforeunload = e => {
    console.log('EXIT BUTTON CLICKED?: ', window.patBridge.exitClicked());
    if (!exitReady && window.patBridge.exitClicked()) {
      try {
        // only if project is set
        if (Project.getProjectDir() != null) {
          e.returnValue = false;
          $translate('toastr.prepareExit').then(translation => {
            toastr.info(translation);
          });
          Project.modifiedModal().then(() => {
            $log.debug('Resolving modifiedModal()');
            MeasureManager.stopMeasureManager();
            // stop cloud?
            OsServer.cloudRunningModal().then(() => {
              // stop success or nothing to stop
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'Server stopped.'});
                exitReady = true;
                window.patBridge.quit();
              }, () => {
                exitReady = true;
                window.patBridge.quit();
              });
            }, () => {
              // stop error
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'Server stopped.'});
                exitReady = true;
                window.patBridge.quit();
              }, () => {
                exitReady = true;
                window.patBridge.quit();
              });
            });
          }, () => {
            $log.debug('Rejected modifiedModal()');
            // stop cloud?
            OsServer.cloudRunningModal().then(() => {
              // cloud stop success or nothing to stop
              MeasureManager.stopMeasureManager();
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                exitReady = true;
                window.patBridge.quit();
              }, () => {
                exitReady = true;
                window.patBridge.quit();
              });
            }, () => {
              // cloud stop error
              MeasureManager.stopMeasureManager();
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                exitReady = true;
                window.patBridge.quit();
              }, () => {
                exitReady = true;
                window.patBridge.quit();
              });
            });
          });
        } else {
          // nothing to do, exit.
          exitReady = true;
          window.patBridge.quit();
        }
      } catch (e) {
        // TODO: log something to a file
        // if (Project.getProjectDir() != null) {
        //   //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'There was an error closing the app.'});
        // }
        exitReady = true;
        window.patBridge.quit();
      }
    }

    // Prevent exit.  Uncomment to test
    //e.returnValue = false;
  };


  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    // Save pretty options when leaving analysis state (needed for PAT.json and for DesignAlternatives tab)
    if (fromState.name == 'analysis') {
      Project.savePrettyOptions();
    }

    // warn user that they need to cancel their run before moving from this state
    if (fromState.name == 'run' && OsServer.getAnalysisRunningFlag()) {
      event.preventDefault();
      OsServer.showAnalysisRunningDialog();
    }

  });

  // For now don't check for dependencies..wait for Kyle's new code
  //DependencyManager.checkDependencies()
  //  .then(_.bind(MeasureManager.startMeasureManager, MeasureManager), _.bind(MeasureManager.startMeasureManager, MeasureManager));
  MeasureManager.startMeasureManager();

  // open project and navigate to analysis tab
  OpenProject.openModal().then(() => {
    //$state.go('analysis');
    $log.debug('RELOADING PAGE / NAVIGATE TO ANALYSIS PAGE');
    $state.transitionTo('analysis', {}, {reload: true});
  });

  const setLanguage = language => {
    console.log(language);
    $translate.use(language);
  };

  // The application menu is built in the main process (app/electron/menu.js), which sends the id of a clicked item
  const menuHandlers = {
    New: () => SetProject.warnCloudRunning('new'),
    Open: () => SetProject.warnCloudRunning('open'),
    Save: () => SetProject.saveProject(),
    'Save As': () => SetProject.saveAsProject(),
    English: () => setLanguage('en'),
    French: () => setLanguage('fr'),
    'Toggle Debug Messages': () => Message.setShowDebug(!Message.showDebug()),
    'Open BCL': () => {
      BCL.openBCLModal().then(() => {
        // Do something
      });
    },
    'Set MyMeasures Directory': () => Project.openSetMyMeasuresDirModal(),
    'Server Tools': () => OsServer.openServerToolsModal(),
    'Learn More': () => shell.openExternal('https://www.openstudio.net/'),
    'Search Issues': () => shell.openExternal('https://github.com/NREL/OpenStudio-PAT/issues')
  };
  window.patBridge.onMenuClick(id => {
    if (_.has(menuHandlers, id)) menuHandlers[id]();
  });
  window.patBridge.setMenuLanguage($translate.use());
}
