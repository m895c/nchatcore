var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'xcfc54123',
  database : 'nchat'
});

//app.get('/', function(req, res){
//  res.send('<h1>NCORE HOST TEST </h1>  INIT ON:--*nCORe e92834n2323naskj32');
//});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

//# TODO: setup static file serving correctly
app.get('/css/main.css', function(req, res){
  res.sendFile(__dirname + '/css/main.css');
});


//SOCKET CONNECTION FROM CLIENT
io.on('connection', function(socket){

//CHAT MESSAGE FROM CLIENT
    socket.on('chat message', function(msg){
      io.emit('chat message', msg);
    });

//CLIENT SENDS INFO MESSAGE WITH USER:
    socket.on('info', function(msg){
      io.emit('chat message', msg);

      var info = {name: msg.name,
                  age: msg.age,
                  sex: msg.sex,
                  target: msg.target,
                  token: msg.token,
                  online: 1,
                  sockid: socket.client.id
                 };

      connection.query('INSERT IGNORE INTO users SET ?',info,function(err, result) {
        if (err) throw err;

        console.log("User inserted users :" + result.insertId);

      });


      connection.query('INSERT IGNORE INTO lastknownuser SET ?',info,function(err, result) {
        if (err) throw err;

        console.log("User inserted lastknown :" + result.insertId);

      });
    });

//CLIENT SENDS SEARCH
    socket.on('search', function(msg){
      var search = {name: msg.name,
                    age: msg.age,
                    sex: msg.sex,
                    target: msg.target,
                    token: msg.token,
                    sockid: socket.client.id
                    };

      //pseudocode
      connection.query('SELECT sockid FROM lastknownuser where sex = ? ORDER BY sockid ASC LIMIT 1', [msg.target], function(err, result) {
        if (err) throw err;

        socket.room = search.token;

        console.log("the search object is " + search.token);
        console.log("the result is" + result[0]);

        io.to(search.sockid).emit('matched', "room self: " + socket.room);

        io.to(result[0].sockid).emit('matched', "room target: " + socket.room);


        console.log("USER FOUND : " + result[0].sockid);
                    });


    });
//CLIENT DISCONNECTS
    socket.on('disconnect', function(){
      io.emit('chat message', "disconnected");
      connection.query('DELETE FROM lastknownuser WHERE sockid = ?', [socket.client.id], function(err, result) {
        if (err) throw err;

        console.log("USER OFFLINE : " + result.id);
      });

      connection.query('UPDATE users SET ? WHERE sockid = ?', [{online: 0}, socket.client.id], function(err, result) {
        if (err) throw err;

        console.log("USER OFFLINE : " + result.id);
      });


    });


});




//EXPRESS SERVER START.
http.listen(3000, function(){
  console.log('listening on *nCORe e92834n2323naskj32:3000');
});
