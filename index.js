// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var mysql = require('mysql');
var multer = require('multer');
var upload = multer({ dest: 'tmp/' });
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
//var urlencodedParser = bodyParser.urlencoded({ extended: false });

var users = require('./user');
var files = require('./files');
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
app.post('/login',jsonParser, users.loginCheck);
app.post('/users/',jsonParser, users.addUser);

app.post('/users/:id/avatar', upload.fields([{name:'myfile', maxCount:1}]), users.setProfileImage);
app.get('/users/:id/avatar', users.getProfileImage);
app.get('/friends/:id',users.getFriends);
app.post('/friends/:id/:target', users.addFriends);
app.delete('/friends/:id/:target',users.delFriends);
app.get('/messaging_rooms/:id',users.getMessagingRooms);
app.get('/files/:filename',files.downloadImage);
app.post('/files/',upload.fields([{name:'myfile', maxCount:1}]),files.uploadImage);




// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  //type: Message Type
  //data: contents (text, image-url, map-gps_pos)
  socket.on('new message', function (type,data,roomId) {
    // we tell the client to execute 'new message'
    connection.query('SELECT user_id FROM rooms WHERE room_id=?', roomId, function (err, rows) {
      if (err) {
        throw err;
      }
      var unread_cnt = rows.length -1;
      var current = Date.now();
      var chat_log = {
        'sender_id':socket.username,
        'name':socket.username,
        'room_id':roomId,
        'message_type': type,
        'message':data,
        'time':current,
        'unread_count':unread_cnt};

      console.log(chat_log);
      //Add Message in DB
      var query = connection.query('INSERT INTO messages SET ?',chat_log,function(err,result){
        if(err){
          console.error(err)
          throw err;
        }
        //get index of message
        connection.query('SELECT idx FROM messages WHERE sender_id = ? AND room_id=? AND time=?', [socket.username, roomId, current], function (err, rows2) {
          if(err){
            console.error(err)
            throw err;
          }
          console.log(rows2[0]);
          //send message to member in Room
          socket.broadcast.in(roomId).emit('new message', {
            username: socket.username,
            message: data,
            roomId: roomId,
            type : type,
            unread_count : unread_cnt,
            idx : rows2[0].idx
          });
          //send message to Sender
          socket.emit('new message', {
            username: socket.username,
            message: data,
            roomId: roomId,
            type : type,
            unread_count : unread_cnt,
            idx : rows2[0].idx
          });
        });
      })

    });

  });

  socket.on('read',function(roomId, indices){

    for (i=0;i<indices.length;i++){
      var idx = indices[i];
      //get unread count with index
      connection.query(" SELECT ? AS idx, unread_count FROM messages WHERE idx = ? ", [i, indices[i]], function(err, rows){
      //connection.query('select unread_count from messages where idx=?', idx, function (err, rows) {
        if (err) {
          throw err;
        }

        for (var j=0;j<rows.length;j++){
          if (rows[j].unread_count >0){
            console.log(rows);
            var data = [rows[j].unread_count-1,indices[rows[j].idx]];
            console.log(data);

            //Send read event in room
            socket.broadcast.to(roomId).emit('read', {
              idx: [indices[rows[j].idx]]
            });
            connection.query('UPDATE messages SET unread_count = ? where idx = ?', data, function(err,rows2){
              if (err) {

                throw err;
              }
              console.log("unread_count update "+data);
            });
          }
        }

      });
    }





  });
  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    //if (addedUser) return;
    socket.username = username;
    console.log("add user "+username);

    if (socket.username != null) {
      //유저 접속시 user_id에 해당하는 room으로 소켓 join 연결
      connection.query('select room_id from rooms where user_id=?', socket.username, function (err, rows) {
        if (err) {
          throw err;
        }
        for (i = 0; i < rows.length; i++) {
          socket.join(rows[i].room_id);
          console.log("connect to " + rows[i].room_id);
        }

      });
    }

    registerUser(socket,username);
    // we store the username in the socket session for this client

    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
  });


  //해당하는 id의 유저를 room으로 초대
  socket.on('invite',function(id){
    console.log("invite "+id);
    socket_id = socket_ids[id];
    console.log("invite socket_id"+socket_id);
    if (socket_id != undefined){

       connection.query('select room_id from rooms where user_id=? AND member=?',[socket.username,id], function (err, rows) {
        if (err) {
          throw err;
        }
        if (rows.length == 0) {
          //Todo: 현재 random으로 되어 있는 room Id를 index 정해주는 작업
          var random = Math.floor(Math.random() * 1000000);
          var room = {
            'user_id': socket.username,
            'room_id': random,
            'member':id
          };

          //각각 user별로 room 추가
          connection.query('insert into rooms set ?', room, function (err, result) {
            if (err) {
              console.error(err);
              throw err;
            }
            var room2 = {
              'user_id':id,
              'room_id': random,
              'member':socket.username
            };

            connection.query('insert into rooms set ?', room2, function (err, result) {
              if (err) {
                console.error(err);
                throw err;
              }
              console.log("random "+random );
              socket.to(socket_id).emit('invite',random);
              socket.emit('invite',random);
              //방 오픈 메세지 전송
              socket.emit('open room',random);
            })

          })
        }else{
          //현재 멤버로 구성된 room이 있으면 해당 room으로 초대
          socket.to(socket_id).emit('invite',rows[0].room_id);
          //socket.emit('invite',rows[0].room_id);
          socket.emit('open room',rows[0].room_id);
        }
      });

    }
  });

  socket.on('join',function(roomId){
    // echo globally (all clients) that a person has connected
    socket.join(roomId);
    var clientsList = io.sockets.adapter.rooms[roomId];
    console.log("number of room " + clientsList.length);
    console.log("join id "+socket.username+" room "+roomId);

    socket.broadcast.to(roomId).emit('user joined', {
      username: socket.username,
      numUsers: clientsList.length
    });

  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function (roomId) {
    socket.broadcast.to(roomId).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function (roomId) {
    socket.broadcast.to(roomId).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function (roomId) {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.to(roomId).emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

function registerUser(socket,nickname){
  // socket_id와 nickname 테이블을 셋업
  socket_ids[nickname] = socket.id;

}

