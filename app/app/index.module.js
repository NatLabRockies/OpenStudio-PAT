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
import {config} from './index.config';
import {routerConfig} from './index.route';
import {runBlock} from './index.run';
import {AnalysisController} from '../app/analysis/analysisController';
import {BCL} from '../app/bcl/bclService';
import {DependencyManager} from '../app/main/dependencyManagerService';
import {DesignAlternativesController} from '../app/design_alts/designAlternativesController';
import {MeasureManager} from '../app/main/measureManagerService';
import {ModalBclController} from '../app/bcl/modalBclController';
import {ModalDependencyController} from '../app/main/modalDependencyController';
import {ModalModifiedController} from '../app/project/modalModifiedController';
import {ModalOpenProjectController} from '../app/project/modalOpenProjectController';
import {ModalProjectNameController} from '../app/project/modalProjectNameController';
import {ModalServerToolsController} from '../app/project/modalServerToolsController';
import {ModalSetMeasuresDirController} from '../app/project/modalSetMeasuresDirController.js';
import {ModalNestedProjectWarningController} from '../app/project/modalNestedProjectWarningController';
import {ModalSaveAsController} from '../app/project/modalSaveAsController';
import {ModalWhitespaceWarningController} from '../app/project/modalWhitespaceWarningController';
import {ModalDuplicateMeasureController} from '../app/bcl/modalDuplicateMeasureController';
import {ModalCreateNewMeasureController} from '../app/bcl/modalCreateNewMeasureController';
import {ModalDisplayErrorsController} from '../app/bcl/modalDisplayErrorsController';
import {ModalUpdateMeasureController} from '../app/bcl/modalUpdateMeasureController';
import {ModalViewReportController} from '../app/run/modalViewReportController';
import {ModalClearResultsController} from '../app/run/modalClearResultsController';
import {ModalClearDatapointController} from '../app/design_alts/modalClearDatapointController';
import {ModalSelectOutputsController} from '../app/outputs/modalSelectOutputsController';
import {ModalSelectOptionsController} from '../app/analysis/modalSelectOptionsController';
import {ModalEditOptionDescriptionController} from '../app/analysis/modalEditOptionDescriptionController';
import {ModalEditModelDependentChoiceArgController} from '../app/analysis/modalEditModelDependentChoiceArgController';
import {ModalDeleteMeasureController} from '../app/analysis/modalDeleteMeasureController';
import {ModalLargeDownloadController} from '../app/run/modalLargeDownloadController';
import {ModalOsaErrorsController} from '../app/run/modalOsaErrorsController';
import {NavController} from '../app/nav/navController';
import {OsServer} from '../app/project/osServerService';
import {OutputsController} from '../app/outputs/outputsController';
import {Project} from '../app/project/projectService';
import {ReportsController} from '../app/reports/reportsController';
import {RunController} from '../app/run/runController';
import {ModalAnalysisRunningController} from '../app/run/modalAnalysisRunningController';
import {ServerController} from '../app/server/serverController';
import {OpenProject} from '../app/project/openProjectService';
import {SetProject} from '../app/project/setProjectService';
import {Message} from '../app/project/messageService';
import {RemoteHelper} from '../app/project/remoteHelperService';
import {StatusBar} from '../app/status_bar/statusBarService';
import {StatusBarController} from '../app/status_bar/statusBarController';

angular.module('PAT', ['ngAnimate', 'ngSanitize', 'ngMessages', 'ngAria', 'ngResource', 'pascalprecht.translate', 'ui.router', 'ui.router.stateHelper', 'ui.bootstrap', 'ui.checkbox', 'toastr', 'ui.grid', 'ui.grid.autoResize', 'ui.grid.cellNav', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ui.grid.pinning'])
  .config(config)
  .config(routerConfig)
  .config(['$locationProvider', $locationProvider => $locationProvider.hashPrefix('')])
  .run(runBlock)
  .controller('NavController', NavController)
  .controller('ModalBclController', ModalBclController)
  .controller('ModalDependencyController', ModalDependencyController)
  .controller('ModalProjectNameController', ModalProjectNameController)
  .controller('ModalNestedProjectWarningController', ModalNestedProjectWarningController)
  .controller('ModalSaveAsController', ModalSaveAsController)
  .controller('ModalWhitespaceWarningController', ModalWhitespaceWarningController)
  .controller('ModalModifiedController', ModalModifiedController)
  .controller('ModalOpenProjectController', ModalOpenProjectController)
  .controller('ModalServerToolsController', ModalServerToolsController)
  .controller('ModalSetMeasuresDirController', ModalSetMeasuresDirController)
  .controller('ModalDuplicateMeasureController', ModalDuplicateMeasureController)
  .controller('ModalCreateNewMeasureController', ModalCreateNewMeasureController)
  .controller('ModalDisplayErrorsController', ModalDisplayErrorsController)
  .controller('ModalUpdateMeasureController', ModalUpdateMeasureController)
  .controller('ModalViewReportController', ModalViewReportController)
  .controller('ModalSelectOutputsController', ModalSelectOutputsController)
  .controller('ModalSelectOptionsController', ModalSelectOptionsController)
  .controller('ModalEditOptionDescriptionController', ModalEditOptionDescriptionController)
  .controller('ModalEditModelDependentChoiceArgController', ModalEditModelDependentChoiceArgController)
  .controller('ModalDeleteMeasureController', ModalDeleteMeasureController)
  .controller('ModalClearResultsController', ModalClearResultsController)
  .controller('ModalClearDatapointController', ModalClearDatapointController)
  .controller('ModalLargeDownloadController', ModalLargeDownloadController)
  .controller('ModalOsaErrorsController', ModalOsaErrorsController)
  .controller('AnalysisController', AnalysisController)
  .controller('DesignAlternativesController', DesignAlternativesController)
  .controller('OutputsController', OutputsController)
  .controller('RunController', RunController)
  .controller('ModalAnalysisRunningController', ModalAnalysisRunningController)
  .controller('ReportsController', ReportsController)
  .controller('ServerController', ServerController)
  .controller('StatusBarController', StatusBarController)
  .service('BCL', BCL)
  .service('MeasureManager', MeasureManager)
  .service('DependencyManager', DependencyManager)
  .service('OsServer', OsServer)
  .service('Project', Project)
  .service('OpenProject', OpenProject)
  .service('SetProject', SetProject)
  .service('Message', Message)
  .service('RemoteHelper', RemoteHelper)
  .service('StatusBar', StatusBar);
