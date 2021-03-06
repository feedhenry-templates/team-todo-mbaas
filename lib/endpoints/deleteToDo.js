/**
 * Copyright (c) 2013, FeedHenry Ltd. All Rights Reserved.
 *
 * Module which encapsulates logic for delete ToDo endpoint.
 * - Validates client request parameters.
 * - Extracts User id from session object.
 * - Calls a data layer method to delete TODO.
 * - Generates error and success responses.
 */


// Dependencies.
var winston = require("winston");
var constants = require("../config/constants.js");
var sessionManager = require("../session/sessionManager.js");
var utils = require("../utils/utils.js");
var jsonUtils = require("../utils/jsonUtils.js");
var responseUtils = require("../utils/responseUtils.js");
var toDoDAO = require("../dao/toDo.js");
var async = require("async");
var validation = require("../utils/endpointsValidation.js");

var DeleteToDoEndpoint = function() {
  // Global module level variables.
  var MODULE_NAME = "DeleteToDoEndpoint.js: ";

  // Public functions (this.methodName makes a method publicly accessible, otherwise it is accessible only within module).
  this.deleteToDo = deleteToDo;


  /**
   * Delete ToDo endpoint API.
   *
   * @params requestParams - Request parameters from client app.
   * @params callback - Returns final client success/failure response.
   */
  function deleteToDo(requestParams, callback) {
    var METHOD_NAME = "deleteToDo():"

    // Extract sessionId from request parameters.
    var sessionId = jsonUtils.getPath(requestParams, "request.header.sessionId");

    async.waterfall(
      [

        function doValidateSession(cb) {
          // If sessionId not provided return failure callback.
          if (utils.isBlank(sessionId)) {
            var responseJson = responseUtils.constructAuthFailureResponseJson();
            return callback(responseJson, null);
          }
          // Validate sessionId.
          sessionManager.isValidSession(sessionId, function handleIsValidSessionResponse(errorMessage, isValidSession) {
            // If sessionId is invalid return failure callback.
            if (!isValidSession) {
              var responseJson = responseUtils.constructAuthFailureResponseJson(sessionId);
              winston.error(MODULE_NAME + METHOD_NAME + "Invalid session response - " + JSON.stringify(responseJson));
              return callback(responseJson, null);
            }
            cb(null, sessionId);
          });
        },
        function doGetSession(sessionId, cb) {
          // Fetch required parameters from the session.
          sessionManager.getSession(sessionId, function handleGetSessionResponse(errorMessage, sessionObject) {
            // If error reading session attributes return failure callback.
            if (errorMessage) {
              var responseJson = responseUtils.constructAuthFailureResponseJson();
              winston.error(MODULE_NAME + METHOD_NAME + "Unable to retrieve session parameters - " + JSON.stringify(responseJson));
              return callback(responseJson, null);
            }

            // If session object does not exist return failure callback.
            if (sessionObject == null || sessionObject == undefined) {
              var responseJson = responseUtils.constructAuthFailureResponseJson();
              winston.error(MODULE_NAME + METHOD_NAME + "Empty session parameters - " + JSON.stringify(responseJson));
              return callback(responseJson, null);
            }
            cb(null, sessionObject);

          });
        },
        function doValidateSessionParameters(sessionObject, cb) {
          // Validate session.
          var validationSessionResponse = validation.validateSessionParameters(sessionObject);

          // If session parameters are invalid return failure callback.
          if (!validationSessionResponse.status) {
            var errorResponse = responseUtils.constructErrorResponseJson(constants.RESP_AUTH_FAILED, "Complete ToDo", "Operation Failed", validationSessionResponse.message);
            return callback(sessionObject, null);
          }
          cb(null, sessionObject);
        },
        function doValidateDeleteTodoRequest(sessionObject, cb) {
          // Validate request parameters.
          var validationResponse = validation.validateDeleteTodoRequest(requestParams);

          // If request parameters are invalid return failure callback.
          if (!validationResponse.status) {
            var errorResponse = responseUtils.constructErrorResponseJson(constants.RESP_BAD_INPUT, "Change ToDo", "Operation Failed", validationResponse.message);
            return callback(errorResponse, null);
          }
          cb(null, sessionObject);
        },
        function doDeleteToDo(sessionObject, cb) {
          // Construct delete TODO details object.
          var params = {
            "userId": sessionObject.userId,
            "toDoId": requestParams.request.payload.deleteToDo.toDoId,
          };

          // Delete TODO details from database.
          var deleteToDoResponse = toDoDAO.deleteToDo(params, function handleDeleteToDoResponse(error, responseJson) {
            // If delete operation failed return failure callback.
            if (error) {
              var errorResponse = responseUtils.constructErrorResponseJson(constants.RESP_BAD_INPUT, "Delete ToDo", "Operation Failed", error.message);
              return callback(errorResponse, null);
            }

            var response = responseUtils.constructStatusResponseJson("deleteToDo", constants.RESP_SUCCESS, "ToDo deleted successfully.");
            cb(null, response);
          });
        }

      ],
      function(error, responseData) {
        return callback(null, responseData);
      });
  };
};

// Export module.
module.exports = new DeleteToDoEndpoint();