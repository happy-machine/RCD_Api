/*jshint esversion: 6 */
require('dotenv').config();
const config = require('./config');

module.exports = {

    getRoom: (rooms, roomId) => {
        let room_index = rooms.findIndex(x => x.roomId == roomId);
        if (room_index > -1) {
            return rooms[room_index];
        } else {
            return false;
        }
    },

    removeUser: (rooms, roomId, id, res) => {
        let room_index = rooms.findIndex(x => x.roomId == roomId);
        let user_index = rooms[room_index].users.findIndex(x => x.id == id);
        if (room_index > -1 && user_index > -1) {
          rooms[room_index].users.splice(user_index, 1);
          console.log('user removed');
          //TODO: STOP PLAYBACK FOR REMOVED USER?
          // RP(SpotifyService.stopPlayback(token)).then((response)=>{
          //   res.json(true);
          // })
          // .catch(e => console.log(e.message));
        }
        else if (rooms[room_index].host.id === id) {
          console.log('user is current host');
          //TODO: REMOVE HOST AND ALL USERS?
          res.json(true);
        } else {
          console.log('room or user could not be found');
          res.json(false);
        }
      },

      userInRoom: (rooms, roomId, userId) => {
        let room_index = rooms.findIndex(x => x.roomId == roomId);
        let user_index = rooms[room_index].users.findIndex(x => x.id == userId);
        if (room_index > -1 && user_index > -1) {
            return true;
        } else {
            return false;
        }
      }


};
