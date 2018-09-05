/*jshint esversion: 6 */

// SETTINGS
const config = require('./config');

// DEPENDANCIES
const express = require('express');
var spotify = require('./spotify-functions');
const SocketServer = require('ws').Server;
const router = express.Router();
// Cross Domain Origin Setup
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200);
  }
  else {
    next();
  }
};
express().use(allowCrossDomain);
express().use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
require('dotenv').config();
const _ = require('lodash');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const rp = require('request-promise');



let system_message_buffer = JSON.stringify({
  type: '',
  user_object: {},
  master_object: {},
  message: 'test'
});

let message_buffer = JSON.stringify({
  type: '',
  user_object: {},
  master_object: {},
  message: 'test'
});


const selectorCalls = ['drew', 'dropped', 'pulled it up and played', 'reloaded the set and dropped', 'cues up', 'selected', 'played', 'wheeled up']

const getCurrentUser = (token) => {
  let allUsers = [...users, host];
  let user_to_return;
  allUsers.forEach(user => {
    if (user.token == token) {
      user_to_return = user;
    }
  });
  return user_to_return;
};

const URLfactory = (endpoint, error = false, port = config.CLIENT_PORT, mode = config.MODE) => {
  if (config.MODE === config.DEPLOY) {
    if (error) {
      return config.URL_ROOT[mode] + '/error?error=' + endpoint;
    } else {
      return config.URL_ROOT[mode] + '/' + endpoint + '/';
    }
  } else {
    if (error) {
      return config.URL_ROOT[mode] + port + '/error?error=' + endpoint;
    } else {
      return config.URL_ROOT[mode] + port + '/' + endpoint + '/';
    }
  }
}

const sendToBot = (message, chatId = config.CHAT_ID , token = config.TELEGRAM_TOKEN) => {
  axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    status: 200,
    text: message
  })
    .catch(err => {
      console.log('Error :', err)
      res.end('Error :' + err)
    })
}

const HOST_REDIRECT_URI = config.MODE === config.DEPLOY ? 'https://rcd-api.herokuapp.com/callback/' : `http://localhost:${config.SERVER_PORT}/callback/`;
const GUEST_REDIRECT_URI = config.MODE === config.DEPLOY ? 'https://rcd-api.herokuapp.com/guestcallback/' : `http://localhost:${config.SERVER_PORT}/guestcallback/`;

// set mode to LOCAL or DEPLOY
const host = {token: null,name: null};
let users = [];


const defaultNameCheck = (name) => {
  if (name === null) {
    return 'the one like the DJ Anonymous';
  } else {
    return name;
  }
};

let generateRandomString = function (length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

let wait_promise = (time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};

let master = {
  track_uri: null,
  track_name: null,
  artist_name: null,
  play_position: null,
  selector_name: null,
  selector_token: null
};

router.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  if (!host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: config.CLIENT_ID,
        scope: config.PERMISSIONS_SCOPE,
        redirect_uri: HOST_REDIRECT_URI,
        state: state
      }));
  } else {
    res.redirect(URLfactory('alreadyHosted'));
  }
});

router.get('/invite', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  if (host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: config.CLIENT_ID,
        scope: config.PERMISSIONS_SCOPE,
        redirect_uri: GUEST_REDIRECT_URI,
        state: state
      }));
  } else {
    res.redirect(URLfactory('no_Host_Connected', config.ERROR));
  }
});

router.get('/callback', function (req, res) {
  console.log('in host callback');
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[config.STATE_KEY] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(config.STATE_KEY);

    rp.post(spotify.authOptions(HOST_REDIRECT_URI, code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        host.token = body.access_token;
        rp(spotify.getUserOptions(host))
          .then((user_details) => {
            host.name = defaultNameCheck(user_details.display_name)
            // sendToBot(`${defaultNameCheck(host.name)} just stepped up to the 1210-X...`)
            // sendToBot(`${defaultNameCheck(host.name)} just stepped up to the 1210-X...`, MAIN_ROOM)
            system_message_buffer = JSON.stringify({
              type: 'connection',
              message: `${defaultNameCheck(host.name)} stepped up to the 1210s..`,
              user_object: host,
              master_object: master
            });
            res.redirect(URLfactory('hostLoggedIn?' + querystring.stringify({ token: host.token })));
            pollUsersPlayback();
          })
          .catch(e => {
            res.redirect(URLfactory('getting_host_options', config.ERROR));
            console.log(e);
          });
      } else {
        res.redirect(URLfactory('spotify_host_auth', config.ERROR));
      }
    });
  }
});

router.get('/guestcallback', function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[config.STATE_KEY] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(config.STATE_KEY);

    rp.post(spotify.authOptions(GUEST_REDIRECT_URI, code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        let newUser = {};
        newUser.token = body.access_token;
        rp(spotify.getUserOptions(newUser))
          .then((user_details) => {
            console.log(`${user_details.name} trying to join.`);
            newUser.name = user_details.display_name;
            return checkCurrentTrack(host, master);
          })
          .then((obj) => {
            master = obj;
            return rp(spotify.setPlaybackOptions(newUser, master, playbackDelay));
          })
          .then(() => {
            users = [...users, newUser];
            system_message_buffer = JSON.stringify({
              type: 'connection',
              message: `${defaultNameCheck(newUser.name)} joined the party...`,
              user_object: newUser,
              master_object: master
            })
            res.redirect(URLfactory('guestLoggedIn?' + querystring.stringify({ token: newUser.token })))
          })
          .catch(e => {
            console.log('Error in guest sync: ', e)
            res.redirect(URLfactory('guest_sync', ERROR))
          })
      } else {
        res.redirect(URLfactory('guest_callback', ERROR))
      }
    })
  }
});


const syncToMaster = (host, users) => {
  if (host.token && users.length) {
    let allUsers = [...users, host]
    allUsers.some(
      (user) => {
        wait_promise(350)
          .then(() => checkCurrentTrack(user))
          .then(result => {
            if (result.track_uri !== master.track_uri) {
              master = result
              system_message_buffer = JSON.stringify({
                type: 'track_change',
                message: `${defaultNameCheck(master.selector_name)} ${selectorCalls[Math.floor(Math.random() * selectorCalls.length)]} ${master.track_name}!!`,
                user_object: user,
                master_object: master
              })
              // sendToBot(`${defaultNameCheck(master.selector_name)} ${selectorCalls[Math.floor(Math.random()*selectorCalls.length)]} ${master.track_name}!!`, MAIN_ROOM)
              // sendToBot(`${defaultNameCheck(master.selector_name)} ${selectorCalls[Math.floor(Math.random()*selectorCalls.length)]} ${master.track_name}!!`)
              allUsers.splice(allUsers.indexOf(user), 1)
              resync(allUsers, master)
              return true
            }
          })
          .catch(e => console.log(e.message))
      })
  } else {
    // console.log('only one user in the room');
  }
}

const resync = (allUsers, master) => {
  allUsers.forEach((user =>
    rp(spotify.setPlaybackOptions(user, master, playbackDelay))
      .then(() => console.log(`...`))
      .catch(e => console.log(e.message))));
}


// polling loop at 350ms
const pollUsersPlayback = () => {
  setInterval(() => syncToMaster(host, users), 350 * (users.length + 1));
}

const checkCurrentTrack = (user) => {
  return new Promise(function (resolve, reject) {
    return rp(spotify.getPlaybackOptions(user)).then((res) => {
      const master_ref = {
        track_uri: res.item.uri,
        track_name: res.item.name,
        artist_name: res.item.artists[0].name,
        play_position: res.progress_ms,
        selector_name: user.name,
        selector_token: user.token
      }
      return resolve(master_ref);
    })
      .catch(e => reject(e.message));
  });
};

// START SERVER AND SOCKET
// CONNECT TO WEBSOCKET THROUGH wss://<app-name>.herokuapp.com:443/socket
const app = express()
.use('/', router)
.listen(config.SERVER_PORT, () => console.log(`Listening on ${ config.SERVER_PORT }`));
const wss = new SocketServer({ server: app , path: "/socket"});

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);


