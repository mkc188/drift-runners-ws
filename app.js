var express = require('express'),
    app = express();

var throttle = 100; // minimum time between moves (ms)

// serve the game as static files in dist/
app.use(express.static('dist'));

// start listening on port 3000
var server = app.listen(process.env.PORT || 3000, function () {
    console.log('listening on: ' + (process.env.PORT || 3000));
});

// objects store the status and clients in game rooms
var gameRooms = {};
var rooms = [];

// functions define here
// random_range(): implement random number in range using Math.floor
function random_range(min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
// random_room(): get a empty room
function random_room() {
    var session, i = 0;
    do {
        session = random_range(1000, 9999);

        if( i++ >= 9000 ) {
            // retry no more than 9000 times
            return 0;
        }
    } while( rooms.indexOf(session) != -1 );

    return session;
}
// playerid_room(): get an array of existing player in room
function playerid_room(roomId) {
    var result = [];

    if( gameRooms[roomId]['players'][1] != null ) result.push(1);
    if( gameRooms[roomId]['players'][2] != null ) result.push(2);
    if( gameRooms[roomId]['players'][3] != null ) result.push(3);
    if( gameRooms[roomId]['players'][4] != null ) result.push(4);

    return result;
}

var io = require('socket.io')(server);

io.on('connection', function(socket) {
    var sessionId = null;
    var playerId = null;
    var lastMove = 0;

    // handle game room creation from viewer
    socket.on('create', function(callback) {
        if( sessionId != null ||
            playerId != null ) {
            return callback({
                success: false,
                reason: 'Invalid viewer'
            });
        }

        sessionId = random_room();
        if( sessionId == 0 ) {
            return callback({
                success: false,
                reason: 'All game room full'
            });
        }

        // join room
        socket.join(sessionId);
        rooms.push(sessionId);
        playerId = 0;

        // create room object
        gameRooms[sessionId] = {
            viewerId: socket.client.id,
            players: {
                1: null,
                2: null,
                3: null,
                4: null
            }
        };

        callback({
            success: true,
            roomId: sessionId
        });
    });

    // handle player registering a game room
    socket.on('register', function(data, callback) {
        if( sessionId != null ||
            playerId != null ) {
            return callback({
                success: false,
                reason: 'Invalid viewer'
            });
        }

        var requestRoom = parseInt(data);

        if( !/^[0-9]{4}$/.test(requestRoom) ) {
            return callback({
                success: false,
                reason: 'Invalid room id'
            });
        }

        if( rooms.indexOf(requestRoom) == -1 ) {
            return callback({
                success: false,
                reason: 'Room not found'
            });
        }

        var p1_available = ( gameRooms[requestRoom]['players'][1] == null );
        var p2_available = ( gameRooms[requestRoom]['players'][2] == null );
        var p3_available = ( gameRooms[requestRoom]['players'][3] == null );
        var p4_available = ( gameRooms[requestRoom]['players'][4] == null );

        // player id selection :P
        playerId = ( playerId == null && p1_available ) ? 1 : playerId;
        playerId = ( playerId == null && p2_available ) ? 2 : playerId;
        playerId = ( playerId == null && p3_available ) ? 3 : playerId;
        playerId = ( playerId == null && p4_available ) ? 4 : playerId;

        if( playerId == null ) {
            return callback({
                success: false,
                reason: 'Room is full'
            });
        }

        sessionId = requestRoom;
        gameRooms[sessionId]['players'][playerId] = socket.client.id;
        callback({
            success: true,
            roomId: sessionId,
            playerId: playerId
        });

        // update viewer
        io.to(gameRooms[sessionId]['viewerId']).emit('roomUpdate', playerid_room(sessionId));
    });

    // handle players' interaction
    socket.on('move', function(data) {
        if( sessionId == null ||
            playerId == null ||
            playerId == 0 ) {
            return callback({
                success: false,
                reason: 'Invalid client'
            });
        }

        if( Date.now() - lastMove < throttle ) {
            return;
        }

        // update viewer
        io.to(gameRooms[sessionId]['viewerId']).emit('playerMove', {
            player: playerId,
            move: data
        });
    });

    // handle client disconnection
    socket.on('disconnect', function() {
        socket.leave(sessionId);

        if( sessionId != null ) {
            if( playerId == 0 ) {
                // delete room if viewer disconnected
                io.sockets.clients(sessionId).forEach(function(s){
                    s.leave(sessionId);
                });

                var roomIndex = rooms.indexOf(sessionId);
                rooms.splice(roomIndex, 1);

                delete gameRooms[sessionId];

            } else {
                // remove client id from game room record
                gameRooms[sessionId]['players'][playerId] = null;

                // update viewer
                io.to(gameRooms[sessionId]['viewerId']).emit('roomUpdate', playerid_room(sessionId));
            }
        }
    });
});
