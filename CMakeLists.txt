cmake_minimum_required(VERSION 3.14.0)
cmake_policy(SET CMP0048 NEW)


project(ParametricAnalysisTool VERSION 3.11.0)


find_package(Git)

if(NOT GIT_FOUND)
  find_program(GIT_EXECUTABLE git HINTS "$ENV{LOCALAPPDATA}/Programs/git/bin" "C:/Program Files/Git/bin")
  if(NOT GIT_EXECUTABLE_NOTFOUND)
    set(GIT_FOUND TRUE)
  endif()
endif()

if(GIT_FOUND)
  execute_process(COMMAND "${GIT_EXECUTABLE}" "rev-parse" "--short=10" "HEAD"
                  WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
                  TIMEOUT 10
                  RESULT_VARIABLE RESULT
                  OUTPUT_VARIABLE GIT_VERSION
                  ERROR_QUIET
                  OUTPUT_STRIP_TRAILING_WHITESPACE)
  if(${RESULT} EQUAL 0 AND NOT "${GIT_VERSION}" EQUAL "${PROJECT_VERSION_BUILD}")
    set(PROJECT_VERSION_BUILD ${GIT_VERSION} CACHE STRING "Build number" FORCE) # git sha
  endif()

  get_filename_component(GIT_DIR "${GIT_EXECUTABLE}" DIRECTORY)
else()
  set(GIT_DIR "")
endif()

option(BUILD_PACKAGE "Build package" ON)

find_program(NPM_COMMAND npm)


if(UNIX AND NOT APPLE)
  add_custom_target(PAT ALL
    COMMAND "${NPM_COMMAND}" install WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND "${NPM_COMMAND}" run release WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND "${CMAKE_SOURCE_DIR}/node_modules/.bin/gulp" installDeps --prefix="tmp/pat_${CMAKE_PROJECT_VERSION}/opt/Resources/" WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND "mkdir" "-p" "${CMAKE_SOURCE_DIR}/tmp/pat_${CMAKE_PROJECT_VERSION}/opt/Resources/OpenStudio-server/server/tmp"
    COMMAND "chmod" "777" "${CMAKE_SOURCE_DIR}/tmp/pat_${CMAKE_PROJECT_VERSION}/opt/Resources/OpenStudio-server/server/tmp"
  )
elseif(APPLE)
  # set(PAT_PRODUCT_FILE "${CMAKE_SOURCE_DIR}/tmp/ParametricAnalysisTool.app/Contents/MacOS/ParametricAnalysisTool")
  add_custom_target(PAT ALL
    COMMAND "${NPM_COMMAND}" install WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND "${NPM_COMMAND}" run release WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
    COMMAND "${CMAKE_SOURCE_DIR}/node_modules/.bin/gulp" installDeps --prefix="tmp/ParametricAnalysisTool.app/Contents/Resources/" WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}"
  )
elseif(WIN32)
  set(PAT_PRODUCT_FILE "${CMAKE_SOURCE_DIR}/tmp/pat/ParametricAnalysisTool.exe")
  configure_file(BuildPat.bat.in BuildPat.bat)
  add_custom_command(OUTPUT "${PAT_PRODUCT_FILE}"
    COMMAND cmd /C "${CMAKE_CURRENT_BINARY_DIR}/BuildPat.bat"
    WORKING_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}"
  )
  add_custom_target(PAT ALL
    "${CMAKE_COMMAND}" "-E" echo "Building PAT"
    DEPENDS "${PAT_PRODUCT_FILE}"
  )
endif()


if(UNIX AND NOT APPLE)
  install(DIRECTORY "${CMAKE_SOURCE_DIR}/tmp/pat_${CMAKE_PROJECT_VERSION}" DESTINATION .
    USE_SOURCE_PERMISSIONS
    COMPONENT PAT
  )
elseif(APPLE)
  install(DIRECTORY "${CMAKE_SOURCE_DIR}/tmp/ParametricAnalysisTool.app" DESTINATION .
    USE_SOURCE_PERMISSIONS
    COMPONENT PAT
  )
elseif(WIN32)
  install(DIRECTORY "${CMAKE_SOURCE_DIR}/tmp/pat" DESTINATION .
    USE_SOURCE_PERMISSIONS
    COMPONENT PAT
  )
endif()

install(FILES "${CMAKE_SOURCE_DIR}/license.txt" DESTINATION .)
install(FILES "${CMAKE_SOURCE_DIR}/copyright.txt" DESTINATION .)

set(CPACK_BINARY_IFW ON CACHE BOOL "Enable to build IFW packages")
set(CPACK_PACKAGE_INSTALL_DIRECTORY "ParametricAnalysisTool-${PROJECT_VERSION}")

if(UNIX AND NOT APPLE)
  set(CPACK_IFW_TARGET_DIRECTORY "/usr/local/${CPACK_PACKAGE_INSTALL_DIRECTORY}/")
  set(CPACK_SET_DESTDIR ON)
  set(CPACK_INSTALL_PREFIX "/usr/local/${CPACK_PACKAGE_INSTALL_DIRECTORY}/")
  # ruby on ubuntu (18.04) uses libqdbm14 and rails uses nodejs for js runtime
  set(CPACK_DEBIAN_PACKAGE_DEPENDS "libqdbm14,nodejs")
elseif(APPLE)
  set(CPACK_IFW_TARGET_DIRECTORY "/Applications/${CPACK_PACKAGE_INSTALL_DIRECTORY}/")
  set(CPACK_BINARY_STGZ OFF CACHE BOOL "Enable to build STGZ packages")
  set(CPACK_BINARY_TGZ OFF CACHE BOOL "Enable to build TGZ packages")
elseif(WIN32)
  set(CPACK_IFW_TARGET_DIRECTORY "C:/${CPACK_PACKAGE_INSTALL_DIRECTORY}")
  set(CPACK_BINARY_NSIS OFF CACHE BOOL "Enable to build NSIS packages")
endif()

set(CPACK_PACKAGE_VENDOR "National Renewable Energy Laboratory")
set(CPACK_PACKAGE_VERSION "${PROJECT_VERSION}")
set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_MINOR})
set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_PATCH})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Parametric Analysis Tool")
set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "https://www.openstudio.net")
# Handle architecture-specific package naming
if(CMAKE_OSX_ARCHITECTURES)
  # Check if CMAKE_OSX_ARCHITECTURES contains multiple architectures (semicolon-separated)
  string(FIND "${CMAKE_OSX_ARCHITECTURES}" ";" MULTI_ARCH_POS)
  if(MULTI_ARCH_POS GREATER -1)
    # Multiple architectures detected - use "universal" suffix
    set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}-${CMAKE_SYSTEM_NAME}-universal")
  elseif(CMAKE_OSX_ARCHITECTURES STREQUAL "arm64")
    set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}-${CMAKE_SYSTEM_NAME}-arm64")
  elseif(CMAKE_OSX_ARCHITECTURES STREQUAL "x86_64")
    set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}-${CMAKE_SYSTEM_NAME}-x86_64")
  else()
    # Single architecture but not arm64/x86_64 - use the architecture name
    set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}-${CMAKE_SYSTEM_NAME}-${CMAKE_OSX_ARCHITECTURES}")
  endif()
else()
  # No architecture specified - use default naming
  set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}-${CMAKE_SYSTEM_NAME}")
endif()
set(CPACK_PACKAGE_CONTACT "openstudio@nrel.gov")

include(CPack)
include(CPackIFW)
if(NOT CPACK_IFW_BINARYCREATOR_EXECUTABLE)
  message(WARNING "QtIFW not found in PATH")
endif()

cpack_add_component(PAT
  DISPLAY_NAME "Parametric Analysis Tool"
  DESCRIPTION "Parametric Analysis Tool"
)

cpack_ifw_configure_component(PAT
  SCRIPT "${CMAKE_SOURCE_DIR}/install_operations.qs"
  REQUIRES_ADMIN_RIGHTS
)
