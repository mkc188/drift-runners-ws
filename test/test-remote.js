(function() {
    var remote = window.remote = {};

    var sessionId = null;
    var playerId = null;
    var socket = null;
    remote.init = function() {
        // initialize socket.io and events
        initSocketIO();
        initSocketListener();
        window.addEventListener('beforeunload', function() {
            socket.close();
        });

        // bind events to buttons
        $("button.btn-joinroom").click(function() {
            remote.registerRoom( $("input#rm-number-input").val() );
        });

        // bind keyboard arrows
        var map = {
            37: 'left',
            39: 'right',
            38: 'up',
            40: 'down'
        };

        $(document).on('keydown', function(ev){
            if (null == sessionId || null == playerId ) return;
            var code = ev.keyCode;
            if ($('body').hasClass('input_focus')) return;
            if (map[code]) {
                ev.preventDefault();
                remote.emitMove(map[code]);
            }
        });
    }

    var initSocketIO = function() {
        var host = document.domain;
        var port = 3000;

        socket = io('ws://' + host + ':' + port, {
            'reconnectionAttempts': 3
        });

        var connectionFailed = function() {
            alert("Failed to connect websocket server.");
        }
        socket.on('connect_failed', connectionFailed);
        socket.on('reconnect_failed', connectionFailed);
    }

    var initSocketListener = function() {

    }

    remote.registerRoom = function(roomId) {
        socket.emit('register', roomId, function(data) {
            if( data.success ) {
                $("button.btn-newroom").prop("disabled", true);

                sessionId = data.roomId;
                playerId = data.playerId;
                $("span#room-number").text(sessionId);
                $("span#player-number").text(playerId);
            } else {
                alert(data.reason);
            }
        });
    }

    remote.emitMove = function(action) {
        socket.emit('move', action);
    }

})();

// invoke remote.init when page loaded
window.onload = remote.init;
