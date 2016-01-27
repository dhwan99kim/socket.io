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