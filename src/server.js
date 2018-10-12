/*jshint esversion: 6 */
// SETTINGS
// DEPENDANCIES
require('dotenv').config();
import express from 'express';
import querystring from 'querystring';
const SocketServer = require('ws').Server;
const RP = require('request-promise');
const SpotifyService = require('./utils/spotify_func');
const RoomService = require('./utils/room_func');
const config = require('./utils/config');
const urls = require('./utils/urls');

// IMPORTS
import { URLfactory, defaultNameCheck, generateRandomString, wait_promise, queryStringError, makeBuffer, makeTokenExpiry } from './utils/tools';
import * as constants from './utils/constants';

const router = express.Router();

// Cross Domain Origin Setup
var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// Global state
let wss;
let master = {
  track_uri: null,
  track_name: null,
  artist_name: null,
  play_position: null,
  selector_name: null,
  selector_token: null,
  selector_id: null,
  album_cover: null,
};
const host = { token: null, name: null, id: null };

// Instantiate rooms
var roomService = new RoomService(new Array());


// Endpoints 
// Host login
router.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify(SpotifyService.spotifyOptions(urls.HOST_REDIRECT_URI[config.MODE], state))}`);
});

// Guest Login
router.get('/invite', function (req, res) {
  const roomId = req.query.roomId;
  if (!roomService.getRoom(roomId)) {
      res.redirect(URLfactory('This room does not exist or is already closed', constants.ERROR));
      return false;
  }
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify(SpotifyService.spotifyOptions(urls.GUEST_REDIRECT_URI[config.MODE], roomId))}`);
});

// Host Callback from spotify
router.get('/callback', function (req, res) {
  console.log('got host callback');
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.headers.cookie ? req.headers.cookie.split(`${config.STATE_KEY}=`)[1] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' + queryStringError);
    return false;
  }
  res.clearCookie(config.STATE_KEY);
  RP.post(SpotifyService.authOptions(urls.HOST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
    if (error || response.statusCode !== 200) {
      res.redirect(URLfactory('spotify_host_auth', constants.ERROR));
      console.log('Spotify host auth ', error);
      return false;
    }
    host.token = body.access_token;
    host.refresh_token = body.refresh_token
    host.token_expiry = makeTokenExpiry(body.expires_in)
    /* get user details and start websockets.
     * Send greeting and token to client then start
     * polling the spotify api for track changes */
    SpotifyService.rpSafe(SpotifyService.getUserOptions(host), host)
      .then((user_details) => {
      SpotifyService.rpSafe(SpotifyService.getUserDevices(host), host)
        .then((user_devices) => {
          if (!user_devices.devices.length) {
            res.redirect(URLfactory('please open spotify in one of your devices and try again', constants.ERROR));
            return false;
          }
          host.name = defaultNameCheck(user_details.display_name);
          host.id = user_details.id;
          let roomId = generateRandomString(8);
          console.log('creating room for host: ', roomId);
          roomService.createRoom({ roomId: roomId, host: host });
          res.redirect(URLfactory('hostLoggedIn?' + querystring.stringify({ token: host.token, roomId: roomId, userName: host.name, userId: host.id })));
          sendMessage(JSON.stringify({
            type: constants.CONNECTION,
            message: defaultNameCheck(host.name) + ' stepped up to the 1210s...',
            user_object: host,
            master_object: {},
            roomId: roomId
          }));
        })
        .catch(e => {
          res.redirect(URLfactory(e.error.error.message, constants.ERROR));
          console.log('Getting user devices ', e);
        });
      })
      .catch(e => {
        res.redirect(URLfactory(e.error.error.message, constants.ERROR));
        console.log('Getting host options ', e);
      });
  });
});
// Guest callback from Spotify
router.get('/guestcallback', function (req, res) {
  const code = req.query.code || null;
  const roomId = req.query.state || null;
  if (!code || !roomId) {
    res.redirect('/#' + queryStringError);
    return false;
  }
  res.clearCookie(config.STATE_KEY);
  let _room = roomService.getRoom(roomId);
  if (!_room) {
    console.log('room does not exist');
    res.redirect('/#' + queryStringError);
    return false;
  }
  RP.post(SpotifyService.authOptions(urls.GUEST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
    if (error || response.statusCode !== 200) {
      console.log('Error in guest callback ', error);
      res.redirect(URLfactory('guest_callback', constants.ERROR));
      return false;
    }
    let newUser = {};
    newUser.token = body.access_token;
    newUser.refresh_token = body.refresh_token
    newUser.token_expiry = makeTokenExpiry(body.expires_in)
    SpotifyService.rpSafe((SpotifyService.getUserOptions(newUser)), newUser)
      .then(user_details => {
        console.log(user_details.display_name + ' trying to join.');
        newUser.name = user_details.display_name;
        newUser.id = user_details.id;
        return checkCurrentTrack(_room.host);
      })
      .then(_currentTrack => {
        return SpotifyService.rpSafe(SpotifyService.setPlaybackOptions(newUser, _currentTrack, config.PLAYBACK_DELAY), newUser);
      })
      .then(() => {
        // Check user isn't already in the room
        if (!roomService.userInRoom(roomId, newUser.id)) {
          roomService.addUserToRoom(roomId, newUser);
          var message = defaultNameCheck(newUser.name) + ' joined the party...';
        } else {
          //User is rejoining so update token just incase it changed
          roomService.updateUserToRoom(roomId, newUser);
          var message = defaultNameCheck(newUser.name) + ' rejoined the party...';
        }
        sendMessage(JSON.stringify({
          type: constants.CONNECTION,
          message: message,
          user_object: newUser,
          master_object: _room.master,
          roomId: roomId
        }));
        res.redirect(URLfactory('guestLoggedIn?' + querystring.stringify({ token: newUser.token, roomId: roomId, userName: newUser.name, userId: newUser.id })));
      })
      .catch(e => {
        res.redirect(URLfactory(e.error.error.message + JSON.stringify(', Check you have a premium account and your Spotify app is open.'), constants.ERROR));
        console.log('Error in guest sync ', e);
      });
  });
});

// Remove user from room
router.get('/removeuser', function (req, res) {
  console.log('attempting to remove user');
  const userId = req.query.id || null;
  const roomId = req.query.roomId || null;
  roomService.removeUser(roomId, userId);
});

// Get current track for room (I FIXED THIS)
router.get('/getcurrenttrack', function (req, res) {
  const roomId = req.query.roomId;
  if (roomId) {
    res.json(RoomService.getRoom(roomId).master || null);
  }
});

// Get rooms 
router.get('/getrooms', function (req, res) {
  var rooms = roomService.getAllRooms();
  res.json(rooms || null);
});

// RESET
router.get('/resetserver', function (req, res) {
  var roomService = new RoomService(new Array());
  res.json(true);
});


const syncToMaster = (host, users, roomId) => {
  if (!host.id) {
    console.log('no host in the room');
    return false;
  }
  console.log('Host ' + host.id);
  if (!users.length) {
    console.log('no users in the room');
  }
  console.log(users.length + ' users in  the room');
  let _allRoomUsers = [...users, host];
  let _room = roomService.getRoom(roomId);
  let _master = {};
  // make reference to users, leave global users array immutable
  _allRoomUsers.some(
    (user) => {
      wait_promise(350)
        .then(() => checkCurrentTrack(user))
        .then(result => {
          if (result.track_uri === _room.master.track_uri) {
              return false;
          }
          // Check users current track, if URI is different to one in master state ...
          _master = result;
          console.log('master switched to ', _master.track_uri);
          return SpotifyService.rpSafe(SpotifyService.getTrack(user, _master.track_uri.split('track:')[1]), user)
            .then((track) => {
              _master.album_cover = track.album.images[0].url;
              roomService.updateMaster(roomId, _master);
              /* get the new tracks cover image and set the master to the new track that is taking over
              then set the system message buffer to send update info to the client */
              sendMessage(JSON.stringify({
                type: constants.TRACK_CHANGE,
                message: defaultNameCheck(_master.selector_name) + ' ' + constants.SELECTOR_CALLS[Math.floor(Math.random() * constants.SELECTOR_CALLS.length)] + ' ' + _master.track_name + '!!',
                user_object: user,
                master_object: _master,
                roomId: roomId
              }));
              /* remove the current user from the reference to the array of users
              and then run through all the remaining users setting their track details to master */
              _allRoomUsers.splice(_allRoomUsers.indexOf(user), 1);
              // console.log(' and now all users to send sync to are ', _allRoomUsers);
              resync(_allRoomUsers, _master);
              return true;
            });
        })
        .catch(e => console.log('Error in sync to master ', e));
    });
};

const resync = (allUsers, master) => {
  allUsers.forEach((user =>
    SpotifyService.rpSafe(SpotifyService.setPlaybackOptions(user, master, config.PLAYBACK_DELAY), user)
      .catch(e => console.log(e.message))));
};

// polling loop at 350ms
const pollUsersPlayback = () => {
  console.log('POLL USERS');
  setInterval(() => {
    console.log('SET INTERVAL');
    let rooms = roomService.getAllRooms();
    rooms.forEach(
      (room) => {
        // console.log('sending poll signal');
        syncToMaster(room.host, room.users, room.roomId);
      });
  }, 1000);
};

const checkCurrentTrack = (user) => {
  return new Promise(function (resolve, reject) {
    return SpotifyService.rpSafe(SpotifyService.getPlaybackOptions(user), user).then((res) => {
      if (res === undefined) {
          return false;
      }
      const master_ref = {
        track_uri: res.item.uri,
        track_name: res.item.name,
        artist_name: res.item.artists[0].name,
        play_position: res.progress_ms,
        selector_name: user.name,
        selector_token: user.token,
        selector_id: user.id
      };
      return resolve(master_ref);
    })
      .catch(e => reject(`in checkCurrentTrack ${e.message}`));
  });
};


// START SERVER AND SOCKET
const app = express()
  .use('/', router)
  .listen(config.SERVER_PORT, () => console.log('Listening on ' + config.SERVER_PORT));

// CONNECT TO WEBSOCKET THROUGH wss://<app-name>.herokuapp.com:443/socket
wss = new SocketServer({ server: app, path: "/socket" });

wss.on('connection', function connection(ws) {
  ws.on('message', function (jsonData) {
    console.log('Got client message with json:', jsonData);
    var msgData = JSON.parse(jsonData);
    if (msgData.type === undefined) {
        console.log('Message data has no type');
        return false;
    }
    console.log('Got client message with data:', msgData);
    console.log('Connections: ', wss._eventsCount);

    switch (msgData.type) {

      case constants.MESSAGE:
        sendMessage(JSON.stringify({
          type: constants.MESSAGE,
          userName: defaultNameCheck(msgData.userName),
          master_object: master,
          message: msgData.message,
          roomId: msgData.roomId
        }));
      break;

      case constants.SOUND_FX:
        sendMessage(JSON.stringify({
          type: constants.SOUND_FX,
          message: msgData.userName + ' ' + msgData.message,
          sample: msgData.sample,
          roomId: msgData.roomId,
          category: msgData.category
        }));
      break;

      case constants.PLAYBACK:
        var user = roomService.getUserFromId(msgData.roomId, msgData.userId);
        switch (msgData.message) {
          case constants.PLAY_NEW:
            SpotifyService.rpSafe(SpotifyService.setPlaybackOptions(msgData, msgData, 0), user)
              .catch(e => console.log(e.message));
          break;

          case constants.PAUSE:
            SpotifyService.rpSafe(SpotifyService.setPause(msgData), user)
              .catch(e => console.log(e.message));
          break;

          case constants.PLAY:
            SpotifyService.rpSafe(SpotifyService.setPlay(msgData), user)
              .catch(e => console.log(e.message));
          break;
        }
      break;

      case constants.CLOSE:
        var user = roomService.getUserFromId(msgData.roomId, msgData.userId);
        SpotifyService.rpSafe(SpotifyService.setPause(msgData), user)
          .catch(e => console.log(e.message));
        roomService.removeUser(msgData.roomId, msgData.userId);
        sendMessage(JSON.stringify({
          type: constants.CONNECTION,
          message: msgData.userName + ' left the room.',
          roomId: msgData.roomId
        }));
      break;

      default:
      break;
    }
  });
});

pollUsersPlayback();

export const sendMessage = (message) => {
  wss.clients.forEach((client) => {
    client.send(message);
  });
};
