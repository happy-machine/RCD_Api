'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _tools = require('./utils/tools');

var _constants = require('./utils/constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*jshint esversion: 6 */
// SETTINGS
// DEPENDANCIES
require('dotenv').config();

var SocketServer = require('ws').Server;
var RP = require('request-promise');
var spotify = require('./utils/spotify_func');
var config = require('./utils/config');
var urls = require('./utils/urls');

// IMPORTS


var router = _express2.default.Router();

// Cross Domain Origin Setup
var allowCrossDomain = function allowCrossDomain(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  if ('OPTIONS' == req.method) {
    res.send(200);
  } else {
    next();
  }
};

(0, _express2.default)().use(allowCrossDomain);
(0, _express2.default)().use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// Global state
var wss = void 0;
var master = {
  track_uri: null,
  track_name: null,
  artist_name: null,
  play_position: null,
  selector_name: null,
  selector_token: null,
  album_cover: null
};
var host = { token: null, name: null };
var users = [];
var rooms = [];
var system_message_buffer = JSON.stringify({
  type: '',
  user_object: {},
  master_object: {},
  message: 'test'
});
var message_buffer = JSON.stringify({
  type: '',
  user_object: {},
  master_object: {},
  message: 'test'
});

// get user details object from Spotify with token
var getCurrentUser = function getCurrentUser(token) {
  var allUsers = [].concat(users, [host]);
  var user_to_return = void 0;
  allUsers.forEach(function (user) {
    if (user.token === token) {
      user_to_return = user;
    }
  });
  return user_to_return;
};

// Endpoints 
// Host login
router.get('/login', function (req, res) {
  var state = (0, _tools.generateRandomString)(16);
  res.cookie(config.STATE_KEY, state);
  if (!host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' + _querystring2.default.stringify(spotify.spotifyOptions(urls.HOST_REDIRECT_URI[config.MODE], state)));
  } else {
    res.redirect((0, _tools.URLfactory)('alreadyHosted'));
    console.log('already hosted');
  }
});
// Guest Login
router.get('/invite', function (req, res) {
  var state = (0, _tools.generateRandomString)(16);
  res.cookie(config.STATE_KEY, state);
  if (host.token) {
    res.redirect('https://accounts.spotify.com/authorize?' + _querystring2.default.stringify(spotify.spotifyOptions(urls.GUEST_REDIRECT_URI[config.MODE], state)));
  } else {
    res.redirect((0, _tools.URLfactory)('no_Host_Connected', _constants.ERROR));
    console.log('No Host Connected');
  }
});
// Host Callback from spotify
router.get('/callback', function (req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.headers.cookie ? req.headers.cookie.split(config.STATE_KEY + '=')[1] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' + _tools.queryStringError);
  } else {
    res.clearCookie(config.STATE_KEY);

    RP.post(spotify.authOptions(urls.HOST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        host.token = body.access_token;
        /* get user details and start websockets. Send greeting and token to client then start
        polling the spotify api for track changes */
        RP(spotify.getUserOptions(host)).then(function (user_details) {
          host.name = (0, _tools.defaultNameCheck)(user_details.display_name);
          var roomId = (0, _tools.generateRandomString)(8);
          rooms.push({ roomId: roomId, host: host, users: [] });
          system_message_buffer = (0, _tools.makeBuffer)((0, _tools.defaultNameCheck)(host.name) + ' stepped up to the 1210s..', host, master, _constants.CONNECTION);
          res.redirect((0, _tools.URLfactory)('hostLoggedIn?' + _querystring2.default.stringify({ token: host.token, roomId: roomId })));
          pollUsersPlayback();
        }).catch(function (e) {
          res.redirect((0, _tools.URLfactory)('getting_host_options', _constants.ERROR));
          console.log('Getting host options ', e);
        });
      } else {
        res.redirect((0, _tools.URLfactory)('spotify_host_auth', _constants.ERROR));
        console.log('Spotify host auth ', e);
      }
    });
  }
});
// Guest callback from Spotify
router.get('/guestcallback', function (req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var roomId = req.query.roomId || null;
  var storedState = req.headers.cookie ? req.headers.cookie.split(config.STATE_KEY + '=')[1] : null;
  if (state === null || state !== storedState || roomId === null) {
    res.redirect('/#' + _tools.queryStringError);
  } else {
    res.clearCookie(config.STATE_KEY);

    RP.post(spotify.authOptions(urls.GUEST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var newUser = {};
        newUser.token = body.access_token;
        RP(spotify.getUserOptions(newUser)).then(function (user_details) {
          console.log(user_details.name + ' trying to join.');
          newUser.name = user_details.display_name;

          return checkCurrentTrack(host, master);
        }).then(function (obj) {
          master = obj;
          // after current track in master state is checked set playback for current user
          return RP(spotify.setPlaybackOptions(newUser, master, config.PLAYBACK_DELAY));
        }).then(function () {
          // find room and add user
          var room_index = rooms.findIndex(function (x) {
            return x.roomId == roomId;
          });
          rooms[room_index].users.push(newUser);
          system_message_buffer = (0, _tools.makeBuffer)((0, _tools.defaultNameCheck)(newUser.name) + ' joined the party...', newUser, master, _constants.CONNECTION);
          res.redirect((0, _tools.URLfactory)('guestLoggedIn?' + _querystring2.default.stringify({ token: newUser.token })));
        }).catch(function (e) {
          res.redirect((0, _tools.URLfactory)('guest_sync', _constants.ERROR));
          console.log('Error in guest sync ', e);
        });
      } else {
        res.redirect((0, _tools.URLfactory)('guest_callback', _constants.ERROR));
        console.log('Error in guest callback ', e);
      }
    });
  }
});

var syncToMaster = function syncToMaster(host, users) {
  if (host.token && users) {
    var allRoomUsers = [].concat(_toConsumableArray(users), [host]);
    // make reference to users, leave global users array immutable
    allRoomUsers.some(function (user) {
      (0, _tools.wait_promise)(350).then(function () {
        return checkCurrentTrack(user);
      }).then(function (result) {
        if (result.track_uri !== master.track_uri) {
          // Check users current track, if URI is different to one in master state ...
          master = result;
          return RP(spotify.getTrack(user, master.track_uri.split('track:')[1])).then(function (track) {
            master.album_cover = track.album.images[0].url;
            /* get the new tracks cover image and set the master to the new track that is taking over
            then set the system message buffer to send update info to the client */
            system_message_buffer = (0, _tools.makeBuffer)((0, _tools.defaultNameCheck)(master.selector_name) + ' ' + _constants.SELECTOR_CALLS[Math.floor(Math.random() * _constants.SELECTOR_CALLS.length)] + ' ' + master.track_name + '!!', user, master, 'track_change');
            wss.clients.forEach(function each(client) {
              client.send(system_message_buffer);
            });
            /* remove the current user from the reference to the array of users
            and then run through all the remaining users setting their track details to master */
            allRoomUsers.splice(allRoomUsers.indexOf(user), 1);
            resync(allRoomUsers, master);
            return true;
          });
        }
      }).catch(function (e) {
        return console.log('Error in sync to master ', e.message);
      });
    });
  } else {
    // console.log('only one user in the room');
  }
};

var resync = function resync(allUsers, master) {
  allUsers.forEach(function (user) {
    return RP(spotify.setPlaybackOptions(user, master, config.PLAYBACK_DELAY)).catch(function (e) {
      return console.log(e.message);
    });
  });
};

// polling loop at 350ms
var pollUsersPlayback = function pollUsersPlayback() {
  setInterval(function () {
    rooms.forEach(function (room) {
      // console.log('syncing ', room.users.length , ' users in room ', room.roomId);
      syncToMaster(room.host, room.users);
    });
  }, 350);
};

var checkCurrentTrack = function checkCurrentTrack(user) {
  return new Promise(function (resolve, reject) {
    return RP(spotify.getPlaybackOptions(user)).then(function (res) {
      var master_ref = {
        track_uri: res.item.uri,
        track_name: res.item.name,
        artist_name: res.item.artists[0].name,
        play_position: res.progress_ms,
        selector_name: user.name,
        selector_token: user.token
      };
      return resolve(master_ref);
    }).catch(function (e) {
      return reject('in checkCurrentTrack ' + e.message);
    });
  });
};

// START SERVER AND SOCKET
var app = (0, _express2.default)().use('/', router).listen(config.SERVER_PORT, function () {
  return console.log('Listening on ' + config.SERVER_PORT);
});

// CONNECT TO WEBSOCKET THROUGH wss://<app-name>.herokuapp.com:443/socket
wss = new SocketServer({ server: app, path: "/socket" });

wss.on('connection', function connection(ws) {
  // send system and message_buffer from global state every 200ms and then reset state
  setInterval(function () {
    wss.clients.forEach(function (client) {
      system_message_buffer && client.send(system_message_buffer);
      message_buffer && client.send(message_buffer);
    });
    message_buffer = '';
    system_message_buffer = '';
  }, 200);
});
//# sourceMappingURL=server.js.map