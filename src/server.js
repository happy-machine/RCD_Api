/*jshint esversion: 6 */
// SETTINGS
// DEPENDANCIES
require('dotenv').config();
import express from 'express';
import querystring from 'querystring';
const SocketServer = require('ws').Server;
const RP = require('request-promise');
const spotify = require('./utils/spotify_func');
const config = require('./utils/config');
const urls = require('./utils/urls');

// IMPORTS
import { URLfactory, defaultNameCheck, generateRandomString, wait_promise, queryStringError, makeBuffer } from './utils/tools'
import { SELECTOR_CALLS, ERROR, MODE, CONNECTION } from './utils/constants'

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
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

// Global state
let wss
let master = {
  track_uri: null,
  track_name: null,
  artist_name: null,
  play_position: null,
  selector_name: null,
  selector_token: null,
  album_cover: null,
};
const host = { token: null, name: null };
let users = [];
let rooms = [];
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


// get user details object from Spotify with token
const getCurrentUser = (token) => {
  let allUsers = [...users, host];
  let user_to_return;
  allUsers.forEach(user => {
    if (user.token === token) {
      user_to_return = user;
    }
  });
  return user_to_return;
};


// Endpoints 
// Host login
router.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  if (!host.token) {
    res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify(spotify.spotifyOptions(urls.HOST_REDIRECT_URI[config.MODE], state))}`)
  } else {
    res.redirect(URLfactory('alreadyHosted'));
    console.log('already hosted')
  }
});
// Guest Login
router.get('/invite', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(config.STATE_KEY, state);
  if (host.token) {
    res.redirect(`https://accounts.spotify.com/authorize?${querystring.stringify(spotify.spotifyOptions(urls.GUEST_REDIRECT_URI[config.MODE], state))}`);
  } else {
    res.redirect(URLfactory('no_Host_Connected', ERROR));
    console.log('No Host Connected')
  }
});
// Host Callback from spotify
router.get('/callback', function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.headers.cookie ? req.headers.cookie.split(`${config.STATE_KEY}=`)[1] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' + queryStringError);
  } else {
    res.clearCookie(config.STATE_KEY);

    RP.post(spotify.authOptions(urls.HOST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        host.token = body.access_token;
        /* get user details and start websockets. Send greeting and token to client then start
        polling the spotify api for track changes */
        RP(spotify.getUserOptions(host))
          .then((user_details) => {
            // startWebsocket()
            // pollWebsocket()
            host.name = defaultNameCheck(user_details.display_name);
            rooms.push({ host: host, users:[] });
            system_message_buffer = makeBuffer(`${defaultNameCheck(host.name)} stepped up to the 1210s..`, host, master, CONNECTION)
            res.redirect(URLfactory('hostLoggedIn?' + querystring.stringify({ token: host.token, room_index: rooms.length })));
            pollUsersPlayback();
          })
          .catch(e => {
            res.redirect(URLfactory('getting_host_options', ERROR));
            console.log('Getting host options ', e)
          });
      } else {
        res.redirect(URLfactory('spotify_host_auth', ERROR));
        console.log('Spotify host auth ', e)
      }
    });
  }
});
// Guest callback from Spotify
router.get('/guestcallback', function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const room_index = req.query.room_index || 0;
  const storedState = req.headers.cookie ? req.headers.cookie.split(`${config.STATE_KEY}=`)[1] : null;
  if (state === null || state !== storedState) {
    res.redirect('/#' + queryStringError);
  } else {
    res.clearCookie(config.STATE_KEY);

    RP.post(spotify.authOptions(urls.GUEST_REDIRECT_URI[config.MODE], code), function (error, response, body) {
      if (!error && response.statusCode === 200) {
        let newUser = {};
        newUser.token = body.access_token;
        RP(spotify.getUserOptions(newUser))
          .then(user_details => {
            console.log(`${user_details.name} trying to join.`);
            newUser.name = user_details.display_name;

            return checkCurrentTrack(host, master);
          })
          .then(obj => {
            master = obj;
            // after current track in master state is checked set playback for current user
            return RP(spotify.setPlaybackOptions(newUser, master, config.PLAYBACK_DELAY));
          })
          .then(() => {
            // add new user to global user array
            rooms[room_index].users.push(newUser);
            // users = [...users, newUser];
            system_message_buffer = makeBuffer(`${defaultNameCheck(newUser.name)} joined the party...`, newUser, master, CONNECTION)
            res.redirect(URLfactory('guestLoggedIn?' + querystring.stringify({ token: newUser.token })))
          })
          .catch(e => {
            res.redirect(URLfactory('guest_sync', ERROR))
            console.log('Error in guest sync ', e)
          })
      } else {
        res.redirect(URLfactory('guest_callback', ERROR))
        console.log('Error in guest callback ', e)
      }
    })
  }
});


const syncToMaster = (host, users) => {
  if (host.token && users) {
    let allRoomUsers = [...users, host];
    console.log('syncing room')
    // make reference to users, leave global users array immutable
    allRoomUsers.some(
      (user) => {
        wait_promise(350)
          .then(() => checkCurrentTrack(user))
          .then(result => {
            if (result.track_uri !== master.track_uri) {
              // Check users current track, if URI is different to one in master state ...
              master = result;
              return RP(spotify.getTrack(user, master.track_uri.split('track:')[1]))
                .then((track) => {
                  master.album_cover = track.album.images[0].url
                  /* get the new tracks cover image and set the master to the new track that is taking over
                  then set the system message buffer to send update info to the client */
                  system_message_buffer = makeBuffer(
                    `${defaultNameCheck(master.selector_name)} ${SELECTOR_CALLS[Math.floor(Math.random() * SELECTOR_CALLS.length)]} ${master.track_name}!!`,
                    user,
                    master,
                    'track_change'
                  );
                  wss.clients.forEach(function each(client) {
                    client.send(system_message_buffer);
                  });
                  /* remove the current user from the reference to the array of users
                  and then run through all the remaining users setting their track details to master */
                  allRoomUsers.splice(allRoomUsers.indexOf(user), 1)
                  resync(allRoomUsers, master);
                  return true;
                })
            }
          })
          .catch(e => console.log('Error in sync to master ', e.message))
      })
  } else {
    console.log('only one user in the room');
  }
}

const resync = (allUsers, master) => {
  allUsers.forEach((user =>
    RP(spotify.setPlaybackOptions(user, master, config.PLAYBACK_DELAY))
      .catch(e => console.log(e.message))));
};

// polling loop at 350ms
const pollUsersPlayback = () => {
  setInterval(() => {
    rooms.forEach(
      (room, roomIndex) => {
        console.log('syncing ', room.users.length , ' users in room ', roomIndex);
        syncToMaster(room.host, room.users);
      });
  }, 350);
};

const checkCurrentTrack = (user) => {
  return new Promise(function (resolve, reject) {
    return RP(spotify.getPlaybackOptions(user)).then((res) => {
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
      .catch(e => reject(`in checkCurrentTrack ${e.message}`));
  });
};

// START SERVER AND SOCKET
const app = express()
  .use('/', router)
  .listen(config.SERVER_PORT, () => console.log(`Listening on ${config.SERVER_PORT}`));

// CONNECT TO WEBSOCKET THROUGH wss://<app-name>.herokuapp.com:443/socket
// const startWebsocket = () => {
wss = new SocketServer({ server: app, path: "/socket" });
// }


// const pollWebsocket = () => {
setInterval(
  () => {
    const array = new Float32Array(5);
    for (var i = 0; i < array.length; ++i) {
      array[i] = i / 2;
    }

    wss.clients.forEach(function each(client) {
      // client.send(array);
    });

  }, 2000)
  ;
wss.on('connection', function connection(ws) {
  //if we get a message send it back to the clients with master object and label it with user token
  ws.on('message', (message) => {
    console.log(message)
    // const message_rec = JSON.parse(message)
    // switch (message_rec.type){
    //   case 'message': 
    // message_buffer = JSON.stringify({
    //     type: 'message',
    //     user_object: getCurrentUser(message_rec.token) || 'DJ Unknown',
    //     master_object: master,
    //     message: message_rec.message
    //   })
    // default: break;
    // }
  });



  // send system and message_buffer from global state every 200ms and then reset state
  // setInterval(
  //   () => {
  //    wss.clients.forEach((client) => {
  //       system_message_buffer && client.send(system_message_buffer)
  //       message_buffer && client.send(message_buffer)
  //     });
  //     message_buffer = ''
  //     system_message_buffer = ''
  //   },200)
  // });
});