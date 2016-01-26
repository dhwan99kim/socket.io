/**
 * Created by dev14 on 2016. 1. 26..
 */
var mysql = require('mysql');
var connection = mysql.createConnection({
    host    :'localhost',
    port : 3306,
    user : 'root',
    password : '1111',
    database:'chat'
});

exports.getFriends = function(req,res) {
    console.log(req.params.id);
    var query = connection.query('select * from friend_list where id=? ', req.params.id, function (err, rows) {
        if (err) {
            throw err;
        }
        res.status(200).send(rows);
    });
};

exports.addFriends = function(req,res) {
    var friend = req.body;
    console.log("add friend "+req.body.targetId +" to "+req.body.myId);
    if (!req.body)
        return res.status(400).send();
    var query = connection.query('select * from friend_list where id=? AND friend=?',[req.body.myId, req.body.targetId], function (err, rows) {
        if(err){
            throw err;
        }
        if (rows.length == 0){
            var friend = {'id':req.body.myId,
                'friend':req.body.targetId};
            var query = connection.query('insert into friend_list set ?',friend,function(err,result){
                if(err){
                    console.error(err);
                    throw err;
                }
            })
        }else
            console.log('friend exist');
    });
};