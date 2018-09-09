const config = require('./config');
const urls = require('./urls');
const querystring = require('querystring');
import {DEPLOY} from './constants'

export const URLfactory = (endpoint, error = false, port = config.CLIENT_PORT, mode = config.MODE) => {
    if ( mode === DEPLOY) {
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
}

export const defaultNameCheck = (name) => {
    if (name === null) {
      return 'the one like the DJ Anonymous';
    } else {
      return name;
    }
  };
  
export let generateRandomString = function (length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

export const wait_promise = (time) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  };
  
export const queryStringError = querystring.stringify({
    error: 'state_mismatch'
});

export const makeBuffer = (message, user_object, master, type = 'message', roomId) => {
    return JSON.stringify({
        type: type,
        message: message,
        user_object: user_object,
        master_object: master,
        roomId: roomId
      });
}
