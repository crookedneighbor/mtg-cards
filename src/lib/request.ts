"use strict";

var SCRYFALL_API_ENDPOINT = "https://api.scryfall.com/";
var DEFAULT_SCRYFALL_DESIGNATED_WAIT_TIME = 100;

var superagent = require("superagent");
var querystring = require("querystring");
var wrapScryfallResponse = require("./wrap-scryfall-response");
var convertSymbolsToEmoji = require("../lib/convert-symbols-to-emoji");
var ScryfallError = require("../models/scryfall-error");

function sendRequest(url, options) {
  var method;

  options = options || {};
  method = options.method || "get";

  return superagent[method](url)
    .send(options.body)
    .set("Accept", "application/json")
    .then(function (response) {
      var body;

      try {
        body = JSON.parse(response.text);
      } catch (parsingError) {
        return Promise.reject(
          new ScryfallError({
            message: "Could not parse response from Scryfall.",
            thrownError: parsingError,
          })
        );
      }

      if (body.object === "error") {
        return Promise.reject(new ScryfallError(body));
      }

      return body;
    });
}

function isFullScryfallUrl(url) {
  return url.indexOf(SCRYFALL_API_ENDPOINT) === 0;
}

function endpointBeginsWithSlash(endpoint) {
  return endpoint.indexOf("/") === 0;
}

function makeRequestFunction(options) {
  var requestInProgress = false;
  var enquedRequests = [];
  var requestFunction, wrapFunction;

  options = options || {};

  function delayForScryfallDesignatedTime() {
    var waitTime =
      options.delayBetweenRequests || DEFAULT_SCRYFALL_DESIGNATED_WAIT_TIME;

    return new Promise(function (resolve) {
      setTimeout(resolve, waitTime);
    });
  }

  function clearQueue() {
    enquedRequests = [];
    requestInProgress = false;
  }

  function checkForEnquedRequests(recursiveCheck) {
    var nextRequest;

    if (enquedRequests.length > 0) {
      nextRequest = enquedRequests.splice(0, 1)[0];
      delayForScryfallDesignatedTime().then(function () {
        nextRequest.start();
      });
    } else if (recursiveCheck) {
      requestInProgress = false;
    } else {
      delayForScryfallDesignatedTime().then(function () {
        checkForEnquedRequests(true);
      });
    }
  }

  function prepareRequest(request, url, options) {
    var pendingResolveFunction, pendingRejectFunction;

    return {
      pending: function () {
        return new Promise(function (resolve, reject) {
          pendingResolveFunction = resolve;
          pendingRejectFunction = reject;
        });
      },
      start: function () {
        return sendRequest(url, options)
          .then(function (body) {
            try {
              pendingResolveFunction(wrapFunction(body));
            } catch (err) {
              return Promise.reject(
                new ScryfallError({
                  message:
                    "Something went wrong when wrapping the response from Scryfall",
                  thrownError: err,
                })
              );
            }
          })
          .catch(function (err) {
            if (!(err instanceof ScryfallError)) {
              err = new ScryfallError({
                message:
                  "An unexpected error occurred when requesting resources from Scryfall.",
                status: err.status,
                originalError: err,
              });
            }

            pendingRejectFunction(err);
          })
          .then(function () {
            checkForEnquedRequests();
          });
      },
    };
  }

  requestFunction = function request(endpoint, options) {
    var url, queryParams, pendingRequest, pendingRequestHandler;

    options = options || {};

    if (isFullScryfallUrl(endpoint)) {
      url = endpoint;
    } else {
      if (endpointBeginsWithSlash(endpoint)) {
        endpoint = endpoint.substring(1);
      }
      url = SCRYFALL_API_ENDPOINT + endpoint;
    }

    if (options.query) {
      queryParams = querystring.stringify(options.query);

      if (url.indexOf("?") > -1) {
        url += "&";
      } else {
        url += "?";
      }

      url += queryParams;
    }

    pendingRequestHandler = prepareRequest(request, url, options);
    pendingRequest = pendingRequestHandler.pending();

    if (!requestInProgress) {
      requestInProgress = true;
      pendingRequestHandler.start();
    } else {
      enquedRequests.push(pendingRequestHandler);
    }

    return pendingRequest;
  };

  wrapFunction = function (body) {
    var wrapOptions = {
      requestMethod: requestFunction,
    };

    if (options.textTransformer) {
      wrapOptions.textTransformer = options.textTransformer;
    } else if (options.convertSymbolsToSlackEmoji) {
      wrapOptions.textTransformer = convertSymbolsToEmoji.slack;
    } else if (options.convertSymbolsToDiscordEmoji) {
      wrapOptions.textTransformer = convertSymbolsToEmoji.discord;
    }
    return wrapScryfallResponse(body, wrapOptions);
  };

  requestFunction.wrapFunction = wrapFunction;
  requestFunction.clearQueue = clearQueue;

  return requestFunction;
}

module.exports = makeRequestFunction;