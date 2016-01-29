// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;
var mysql = require('mysql');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var users = require('./user');
var socket_ids = [];
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});
var connection = mysql.createConnection({
  host    :'localhost',
  port : 3306,
  user : 'root',
  password : '1111',
  database:'chat'
});
// Routing
app.use(express.static(__dirname + '/public'));

app.get('/friends/:id',users.getFriends);
app.post('/friends/:id/:target', users.addFriends);
app.delete('/friends/:id/:target',users.delFriends);


// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data,roomId) {
    // we tell the client to execute 'new message'
    var chat_log = {'id':socket.username,
      'name':socket.username,
      'room_id':roomId,
      'message':data};
    var query = connection.query('insert into chat_log set ?',chat_log,function(err,result){
      if(err){
        console.error(err)
        throw err;
      }
      console.log(query);
    })
    socket.broadcast.to(roomId).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    var query = connection.query('select * from user where id=?',username, function (err, rows) {
      if(err){
        throw err;
      }
      if (rows.length == 0){
        var user = {'id':socket.username};
        var query = connection.query('insert into user set ?',user,function(err,result){
          if(err){
            console.error(err)
            throw err;
          }
        })
      }else
        console.log('user exist');
    });
    registerUser(socket,username);
    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
  });

  socket.on('invite',function(id){
    console.log("invite "+id);
    socket_id = socket_ids[id];
    console.log("invite socket_id"+socket_id);
    if (socket_id != undefined){
      var roomId = -1;

      var random = Math.floor(Math.random() * 1000000);

      connection.query('select * from rooms where id=?',random, function (err, rows) {
        if (err) {
          throw err;
        }
        if (rows.length == 0) {
          var room = {
            'id': random,
            'title': '-'
          };
          console.log("room "+room );
          var query = connection.query('insert into rooms set ?', room, function (err, result) {
            if (err) {
              console.error(err);
              throw err;
            }
            console.log("random "+random );
            roomId = random;
            socket.to(socket_id).emit('invite',roomId);
            socket.emit('invite',roomId);

          })
        }
      });

    }
  });
  socket.on('join',function(roomId){
    // echo globally (all clients) that a person has connected
    socket.join(roomId);
    console.log("join "+roomId);
    socket.broadcast.to(roomId).emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

function registerUser(socket,nickname){
  // socket_id와 nickname 테이블을 셋업
  socket_ids[nickname] = socket.id;

  /*socket.get('nickname',function(err,pre_nick){
    if(pre_nick != undefined ) delete socket_ids[pre_nick];
    socket_ids[nickname] = socket.id
  });*/
}

function createRoom(){




  return roomId;
}