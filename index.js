var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bull5I!97!',
    database: 'nchat'
});

var CHAT_TIME_UP_IN_MS = 25000

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
        var info = {
            name: msg.name,
            age: msg.age,
            sex: msg.sex,
            target: msg.target,
            token: msg.token,
            online: 1,
            sockid: socket.client.id
        };
        connection.query('INSERT IGNORE INTO users SET ?', info, function(err, result) {
            if (err) throw err;
            console.log("User inserted users :" + result.insertId);
        });
        connection.query('INSERT IGNORE INTO lastknownuser SET ?', info, function(err, result) {
            if (err) throw err;
            console.log("User inserted lastknown :" + result.insertId);
        });
    });
    //CLIENT SENDS SEARCH
    socket.on('search', function(msg) {
        var search = {
            name: msg.name,
            age: msg.age,
            sex: msg.sex,
            target: msg.target,
            token: msg.token,
            sockid: socket.client.id
        };
        var agelolim = parseInt(msg.age) - 5;
        var ageuplim = parseInt(msg.age) + 5;
        //pseudocode
        var result = [];
        result[0] = null;
        connection.query('SELECT sockid FROM lastknownuser WHERE sex = ? AND age BETWEEN ? AND ? ORDER BY sockid ASC LIMIT 1', [msg.target, agelolim, ageuplim], function(err, result) {
            if (err) throw err;
            console.log("the search object is " + search.token);
            console.log("the result is" + result[0].sockid);
            if (result[0] === null) {
                io.to(search.sockid).emit('nomatch', "60");
            } else {
                //socket.client(result[0].sockid).join(search.token);
                io.to(search.sockid).emit('matched', result[0].sockid);
                //io.to(search.sockid).emit('chat message', "SELF: " + search.sockid );
                io.to(result[0].sockid).emit('matched', result[0].sockid);
                // io.to(result[0].sockid).emit('chat message',"HOST " + result[0].sockid + "R" );
                socket.join(result[0].sockid);
                console.log("USER FOUND : " + result[0].sockid);
                predate = new Date();
                console.log("PREDATE IS : " + predate);

                setTimeout(function() {
                    console.log('TIME UP');

                    // Send timeUp signal to clients
                    io.to(search.sockid).emit('timeUp', CHAT_TIME_UP_IN_MS);
                    //io.to(search.sockid).emit('chat message', "SELF: " + search.sockid );
                    io.to(result[0].sockid).emit('timeUp', CHAT_TIME_UP_IN_MS);

                    socket.leave(result[0].sockid);
                    postdate = new Date();
                    console.log("POST DATE IS : " + postdate);
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
            console.log("USER OFFLINE : " + result[0].id);
        });
        connection.query('UPDATE users SET ? WHERE sockid = ?', [{
            online: 0
        }, socket.client.id], function(err, result) {
            if (err) throw err;
            console.log("USER OFFLINE : " + result[0].id);
        });
    });
    socket.on('reveal', function(msg) {
        console.log("REAVEAl received from " + msg.name + " to: " + msg.roomtgt);
        socket.to(msg.roomtgt).emit('chat message', {
            text: msg.name + "HAS BEEN REVEALED"
        });
    });
}); //END OF SOCKET CONNECTION
//EXPRESS SERVER START.
http.listen(3000, function() {
    console.log('listening on localhost:3000');
});
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
