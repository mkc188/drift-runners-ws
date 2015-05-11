(function() {
    var viewer = window.viewer = {};

    var sessionId = null;
    var socket = null;
    viewer.init = function() {
        // initialize socket.io and events
        initSocketIO();
        initSocketListener();
        window.addEventListener('beforeunload', function() {
            socket.close();
        });

        // bind events to buttons
        $("button.btn-newroom").click(function() {
            viewer.createRoom();
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
        // listen to room player change
        socket.on('roomUpdate', function(data) {
            $("table.event-table tbody").prepend("<tr><td>room</td><td>player list updated: " + JSON.stringify(data) + "</td></tr>");
        });

        // listen to players' actions
        socket.on('playerMove', function(data) {
            $("table.event-table tbody").prepend("<tr><td>#" + data.player + "</td><td>move " + data.move + "</td></tr>");
        });
    }

    viewer.createRoom = function() {
        socket.emit('create', function(data) {
            if( data.success ) {
                $("button.btn-newroom").prop("disabled", true);

                sessionId = data.roomId;
                $("span#room-number").text(sessionId);
            } else {
                alert(data.reason);
            }
        });
    }

})();

// invoke viewer.init when page loaded
window.onload = viewer.init;
