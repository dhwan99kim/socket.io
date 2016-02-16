/**
 * Created by dev14 on 2016. 2. 12..
 */
var fs  = require('fs');
exports.uploadImage = function(req, res){
    console.log(req.files);
    var tmp_path = __dirname + '/' + req.files.myfile[0].path;
    var target_path = __dirname + '/files/' + req.files.myfile[0].originalname;
    fs.rename(tmp_path, target_path, function(err) {
        if (err) throw err;

        fs.unlink(tmp_path, function() {
            var result = {url: req.files.myfile[0].originalname};
            console.log(result);
            res.status(200).send(result);
        });
    });
};

exports.downloadImage = function(req, res){

    var target_path = __dirname + '/files/' + req.params.filename;
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
