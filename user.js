/**
 * Created by dev14 on 2016. 1. 26..
 */
var fs  = require('fs');
var mysql = require('mysql');
var connection = mysql.createConnection({
    host    :'localhost',
    port : 3306,
    user : 'root',
    password : '1111',
    database:'chat'
});



exports.loginCheck = function(req,res) {

    if (!req.body)
      return res.status(400).send();
    connection.query('select * from users where user_id=? AND password=?',[req.body.user_id, req.body.password], function (err, rows) {
        if(err){
            throw err;
        }
        if (rows.length == 0){
            res.status(404).send();
        }
        res.status(200).send();
    });
};

exports.addUser = function(req,res) {

    if (!req.body)
        return res.status(400).send();
    connection.query('select * from users where user_id=?',req.body.user_id, function (err, rows) {
        if(err){
            throw err;
        }
        if (rows.length == 0){
            var user = {'user_id':req.body.user_id,
                'nickname':req.body.nickname,
                'password':req.body.password};
            var query = connection.query('insert into users set ?',user,function(err,result){
                if(err){
                    throw err;
                }
                res.status(200).send();
            })
        }else{
            console.log("exist");
            res.status(409).send();
        }
    });
};

exports.upload = function(req, res){
    var files = req.files.files; // files array
    for( var i=0; i<files.length; i++ ){
        fs.rename( files[i].path, '/temp/'+files[i].name, function( error ){
            if( error ){
                res.send( 'Error upload files' );
                return false;
            }
        });
    }
    res.status(200).send();
};


exports.getFriends = function(req,res) {
    var query = connection.query('select * from friend_list where id=? ', req.params.id, function (err, rows) {
        if (err) {
            throw err;
        }
        res.status(200).send(rows);
    });
};

exports.addFriends = function(req,res) {
    var query = connection.query('select * from friend_list where id=? AND friend=?',[req.params.id, req.params.target], function (err, rows) {
        if(err){
            throw err;
        }
        if (rows.length == 0){
            var friend = {'id':req.params.id,
                'friend':req.params.target};
            var query = connection.query('insert into friend_list set ?',friend,function(err,result){
                if(err){
                    console.error(err);
                    throw err;
                }
                res.status(200).send();
            })
        }else {
            res.status(409).send();
            console.log('friend exist');
        }
    });
};

exports.delFriends = function(req,res) {
    var query = connection.query('delete from friend_list where id=? AND friend=?',[req.params.id, req.params.target], function (err, result) {
        if(err){
            throw err;
        }
        res.status(200).send();

    });
}

exports.getMessagingRooms = function(req,res) {
    var query = connection.query('SELECT T1.`room_id`, T1.`member`, ' +
        '(SELECT `message` FROM `messages` WHERE `room_id` = T1.`room_id` ORDER BY `index` DESC LIMIT 1) AS `message`FROM `rooms` T1 ' +
        'WHERE T1.`user_id` = ? ', req.params.id, function (err, rows) {
        if (err) {
            throw err;
        }
        res.status(200).send(rows);
    });
};

exports.setProfileImage = function(req, res){
    console.log(req.files);
    var tmp_path = __dirname + '/' + req.files.myfile[0].path;
    var target_path = __dirname + '/profile/' + req.params.id+".png";

    fs.rename(tmp_path, target_path, function(err) {
        if (err) throw err;

        fs.unlink(tmp_path, function() {
            res.status(200).send();
        });
    });
};

exports.getProfileImage = function(req, res){
    console.log("getProfileImage");
    var target_path = __dirname + '/profile/' + req.params.id+".png";
    fs.stat(target_path,function(err,stats){
        if (err == null){
            var img = fs.readFileSync(target_path);
            res.writeHead(200, {'Content-Type': 'image/png' });
            res.end(img, 'binary');
        }else{
            res.status(404).send();
        }
    });
};

function getFileExtension(filename){
  return filename.split('.').pop();
}