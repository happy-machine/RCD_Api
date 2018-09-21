/*jshint esversion: 6 */
require('dotenv').config();
const config = require('./config');

function RoomService(rooms) {
  var _rooms = rooms;

  // GET ROOM BY ID
  RoomService.prototype.getRoom = (roomId) => {
    let roomIndex = _rooms.findIndex(x => x.roomId == roomId);
    if (roomIndex > -1) {
      return _rooms[roomIndex];
    } else {
      return false;
    }
  },

    // REMOVE USER FROM ROOM
    RoomService.prototype.removeUser = (roomId, userId) => {
      console.log(roomId, userId);
      let roomIndex = module.exports.getRoomIndexById(roomId);
      let userIndex = _rooms[roomIndex].users.findIndex(x => x.id == userId);
      if (roomIndex > -1 && userIndex > -1) {
        _rooms[roomIndex].users.splice(userIndex, 1);
        console.log('user removed');
        return true;
      }
      else if (_rooms[roomIndex].host.id === userId) {
        console.log('user is current host');
        //TODO: REMOVE HOST AND ALL USERS?
        return true;
      } else {
        console.log('room or user could not be found');
        return false;
      }
    },

    // BOOLEAN IS USER IN ROOM?
    RoomService.prototype.userInRoom = (roomId, userId) => {
      let roomIndex = module.exports.getRoomIndexById(roomId);
      let userIndex = _rooms[roomIndex].users.findIndex(x => x.id == userId);
      if (roomIndex > -1 && userIndex > -1) {
        return true;
      } else {
        return false;
      }
    },

    // CREATE A NEW ROOM
    RoomService.prototype.createRoom = (newRoom) => {
      _rooms.push({ roomId: newRoom.roomId, host: newRoom.host, users: [], master: {} });
    },

    // ADD USER TO ROOM
    RoomService.prototype.addUserToRoom = (roomId, newUser) => {
      let roomIndex = module.exports.getRoomIndexById(roomId);
      _rooms[roomIndex].users.push(newUser);
    },

    // UPDATE USER IN ROOM
    RoomService.prototype.updateUserToRoom = (roomId, user) => {
      let roomIndex = module.exports.getRoomIndexById(roomId);
      let userIndex = _rooms[roomIndex].users.findIndex(x => x.id == user.id);
      if (roomIndex > -1 && userIndex > -1) {
        _rooms[roomIndex].users[userIndex].token = user.token;
        console.log('user token updated');
        return true;
      } else {
        console.log('update user faileds')
      }
    },

    // GET ALL ROOMS
    RoomService.prototype.getAllRooms = () => {
      return _rooms;
    },

    // GET ROOM INDEX BY ID
    RoomService.getRoomIndexById = (roomId) => {
      console.log(_rooms.findIndex(x => x.roomId == roomId) > -1 ? _rooms[_rooms.findIndex(x => x.roomId == roomId)] : false);
      return _rooms.findIndex(x => x.roomId == roomId) > -1 ? _rooms.findIndex(x => x.roomId == roomId) : false;
    },

    // UPDATE ROOM MASTER
    RoomService.prototype.updateMaster = (roomId, master) => {
      let roomIndex = module.exports.getRoomIndexById(roomId);
      _rooms[roomIndex].master = master;
    }
}

module.exports = RoomService;
