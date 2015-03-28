var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bu115I!97!',
    database: 'nchat'
});
var CHAT_TIME_UP_IN_MS = 25000;
//Default Route
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
//# TODO: setup static file serving correctly
app.get('/css/main.css', function(req, res) {
    res.sendFile(__dirname + '/css/main.css');
});
//SOCKET CONNECTION FROM CLIENT 
io.on('connection', function(socket) {
    //CLIENT SENDS INFO MESSAGE WITH USER:
    socket.on('info', function(msg) {
        io.emit('infomessage', msg);
        console.log(msg.name + " With token " +  msg.token + " with sockid " + socket.client.id + "has connected");

        var info = {
            name: msg.name,
            age: msg.age,
            sex: msg.sex,
            target: msg.target,
            token: msg.token,
            online: 1,
            sockid: socket.client.id
        };
        io.emit('chat message', {
            text: "SELF : " + info.sockid,
            roomtgt: info.sockid
        });
        connection.query('INSERT IGNORE INTO users SET ?', info, function(err, result) {
            if (err) throw err;
            //console.log("User inserted users :" + result.insertId);
        });
        connection.query('INSERT IGNORE INTO lastknownuser SET ?', info, function(err, result) {
            if (err) throw err;
            //console.log("User inserted lastknown :" + result.insertId);
        });
    });
    //CLIENT SENDS SEARCH
    socket.on('search', function(msg) {
        //Create Search object
        var search = {
            name: msg.name,
            age: msg.age,
            sex: msg.sex,
            target: msg.target,
            token: msg.token,
            sockid: socket.client.id
        };
        //Age filters (Not Used here in Dev Mode)
        //var agelolim = parseInt(msg.age) - 5; 
        //var ageuplim = parseInt(msg.age) + 5;
        //initializing an array to store the result of the matched sockid
        var result = [];
        result[0] = null;
        //Search for a match


        connection.query('SELECT sockid FROM lastknownuser WHERE sex = ? AND sockid != ? ORDER BY sockid ASC LIMIT 1', [msg.target, search.sockid], function(err, result) {
            if (err) throw err;
            //AND age BETWEEN ? AND ?   -->>PARAMS of [agelolim, ageuplim]  //This has been removed from query for Dev Mode.
            //No Match conditions
            if (result[0] === null || result[0] === undefined ) {
                io.to(search.sockid).emit('nomatch', "60");
            } else

            if (result[0] !== null || result[0] !== undefined ) {
                //Inform both clients and send them the room id 
                //which is the room with name same as the token of the searcher
                io.to(search.sockid).emit('matched', search.token);
                io.to(result[0].sockid).emit('matched', search.token);
                //CREATE ROOM WITH ROOM NAME AS THE SEARCHERS TOKEN and both searcher and matched are joined to it
                socket.join(search.token); //joining searcher ::Note room is automatically created when you join it
                io.sockets.connected[result[0].sockid].join(search.token); //joining matched
                //KILL ROOM in Specified ms


                setTimeout(function() {
                    console.log('TIME UP');
                    // Send timeUp signal to clients
                    io.to(search.sockid).emit('timeUp', CHAT_TIME_UP_IN_MS);
                    io.to(result[0].sockid).emit('timeUp', CHAT_TIME_UP_IN_MS);
                    socket.leave(search.token);
                    io.sockets.connected[result[0].sockid].leave(search.token);
                }, CHAT_TIME_UP_IN_MS);
            }
        });
    });
    //CHAT MESSAGE FROM CLIENT
    socket.on('chat message', function(msg) {
        socket.to(msg.roomtgt).emit('chat message', msg);
        //Place holder for store logic if needed
    });
    //CLIENT DISCONNECTS
    socket.on('disconnect', function() {
        console.log("disconnected: ", socket.client.id);
        connection.query('DELETE FROM lastknownuser WHERE sockid = ?', [socket.client.id], function(err, result) {
            if (err) throw err;
        });
        connection.query('UPDATE users SET ? WHERE sockid = ?', [{
            online: 0
        }, socket.client.id], function(err, result) {
            if (err) throw err;
        });
    });
    //CLIENT REVEALS
    socket.on('reveal', function(msg) {
        console.log("REVEAl received from " + msg.name + " to: " + msg.roomtgt);
        socket.to(msg.roomtgt).emit('chat message', {
            text: msg.name + "HAS BEEN REVEALED"
        });
    });
}); //END OF SOCKET CONNECTION
//EXPRESS SERVER LISTENER
http.listen(80, function() {
    console.log('listening on localhost:3000');
});
//GRACEFUL EXIT LOGIC
var killing_app = false;
process.on('SIGINT', function() {
    console.log("\n");
    if (killing_app) {
        console.log("[PROGRESS] Double SIGINT, Killing without cleanup!");
        process.exit();
    }
    killing_app = true;
    console.log("[PROGRESS] Gracefully shutting down from SIGINT (Ctrl+C)");
    console.log("[PROGRESS] Disconnecting all sockets...");
    console.log(Object.keys(io.engine.clients));
    Object.keys(io.engine.clients).forEach(function(listener) {
        console.log(listener);
        io.sockets.connected[listener].disconnect();
    });
    console.log("[PROGRESS] Thank you bye bye <3 xoxo... please wait to exit");
    setTimeout(function() {
        console.log("Exit wait complete");
        process.exit();
    }, 10000);
});

process.on('message', function(msg) {
    console.log("\n");
    if (msg == 'shutdown') {
    console.log("[PROGRESS] Gracefully shutting down from SIGINT (Ctrl+C)");
    console.log("[PROGRESS] Disconnecting all sockets...");
    console.log(Object.keys(io.engine.clients));
    Object.keys(io.engine.clients).forEach(function(listener) {
        console.log(listener);
        io.sockets.connected[listener].disconnect();
    });
    console.log("[PROGRESS] Thank you bye bye <3 xoxo... please wait to exit");
    setTimeout(function() {
        console.log("Exit wait complete");
        process.exit();
    }, 10000);}
});