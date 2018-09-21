const config = require('./config');
const urls = {
    HOST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/callback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/callback/`
    },
    GUEST_REDIRECT_URI: {
        DEPLOY: 'https://rcd-api.herokuapp.com/guestcallback/',
        LOCAL: `http://localhost:${config.SERVER_PORT}/guestcallback/`
    },
    URL_ROOT: {
        DEPLOY: 'https://robots-cant-dance.herokuapp.com',
        LOCAL: 'http://localhost:'
    }
};

module.exports = urls;
// 
// Yeah, I don't know because it works fine on my machine locally

// its supposed to just be urls.URL_ROOT[MODE]
// where mode is imported from config
// all ive done here is added REMOTE and a constant
// i havent changed the env
// the log sais its erroring in that syncToMaster file
// which i dont think uses any of the url stuff, thats why i think it might be to
// do with the room_func stuff
// unless its the client
// something breaking before the ws on the server side gets an instruction, ie. a missing
// roomId or token or something
// i guess maybe we need to log what its doing

// https://www.dropbox.com/s/wjeg65k44oqpteh/Screenshot%202018-09-21%2022.10.20.jpg?dl=0
// check that thats the log, no errors on the api