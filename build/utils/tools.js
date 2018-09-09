'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.makeBuffer = exports.queryStringError = exports.wait_promise = exports.generateRandomString = exports.defaultNameCheck = exports.URLfactory = undefined;

var _constants = require('./constants');

var config = require('./config');
var urls = require('./urls');
var querystring = require('querystring');
var URLfactory = exports.URLfactory = function URLfactory(endpoint) {
    var error = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var port = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : config.CLIENT_PORT;
    var mode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : config.MODE;

    if (mode === _constants.DEPLOY) {
        if (error) {
            return urls.URL_ROOT[mode] + '/error?error=' + endpoint;
        } else {
            return urls.URL_ROOT[mode] + '/' + endpoint + '/';
        }
    } else {
        if (error) {
            return urls.URL_ROOT[mode] + port + '/error?error=' + endpoint;
        } else {
            return urls.URL_ROOT[mode] + port + '/' + endpoint + '/';
        }
    }
};

var defaultNameCheck = exports.defaultNameCheck = function defaultNameCheck(name) {
    if (name === null) {
        return 'the one like the DJ Anonymous';
    } else {
        return name;
    }
};

var generateRandomString = exports.generateRandomString = function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var wait_promise = exports.wait_promise = function wait_promise(time) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    });
};

var queryStringError = exports.queryStringError = querystring.stringify({
    error: 'state_mismatch'
});

var makeBuffer = exports.makeBuffer = function makeBuffer(message, user_object, master) {
    var type = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'message';
    var roomId = arguments[4];

    return JSON.stringify({
        type: type,
        message: message,
        user_object: user_object,
        master_object: master,
        roomId: roomId
    });
};
//# sourceMappingURL=tools.js.map