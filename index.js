var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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

io.on('connection', function(socket){

    socket.on('chat message', function(msg){

    io.emit('chat message', msg);
    socket.broadcast.emit("chat message", socket.client.id);

  });
});

// GET


http.listen(3000, function(){
  console.log('listening on *nCORe e92834n2323naskj32:3000');
});
