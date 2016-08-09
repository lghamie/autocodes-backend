var express = require('express');
var mysql = require('mysql');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './profile-pics');
  },
  filename: function (req, file, cb) {
    cb(null, req.body.user_fb_id + ".png");
  }
});

var upload = multer({ 'storage': storage});
var winston = require('winston');
var morgan = require('morgan');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(morgan('combined'));

var port = 3001;
winston.level = 'debug';

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'iquallnet',
    database: 'autos'
});

app.post('/user', upload.single('avatar'), function(req, res) {
    var user_fb_id = req.body.user_fb_id;
    var name = req.body.name;

    if (!(user_fb_id != null)) {
        var err = "Please provide a userid";
        winston.error(err);
        res.send({ error: err });
        return;
    }
    if (!(name != null)) {
        var err = "Please provide a name";
        winston.error(err);
        res.send({ error: err });
        return;
    }
});

app.post('/group', function(req, res) {
    var name = req.body.name;
    var users = req.body.users;

    if (!(name != null)) {
        var err = "Please provide a group name";
        winston.error(err);
        res.send({ error: err });
        return;
    }

    pool.beginTransaction(function(err) {
        if (err) {
            pool.rollback(function() {
                res.send({ error: err });
            });
            winston.error(err);
            return;
        }
        pool.query('INSERT INTO group (name, active) VALUES (?, ?)', [name, 0],
            function(err, result) {
                if (err) {
                    pool.rollback(function() {
                        res.send({ error: err });
                    });
                    winston.error(err);
                    return;
                }
                var valuesToInsert = [];

                for (var i in users) {
                    valuesToInsert.push(result.id, users[i], 0);
                }
                pool.query('INSERT INTO group_user (group_id, user_id, is_driver) VALUES ?', [valuesToInsert],
                    function(err, result) {
                        if (err) {
                            pool.rollback(function() {
                                res.send({ error: err });
                            });
                            winston.error(err);
                            return;
                        }
                        connection.commit(function(err) {
                            if (err) {
                                pool.rollback(function() {
                                    res.send({ error: err });
                                });
                                winston.error(err);
                                return;
                            }
                            res.send({ "group": result });
                        });
                    });
            });
    });
});

app.get('/groups/:userid', function(req, res) {
    var userid = req.param("userid");

    if (!(userid != null)) {
        var err = "Please provide a userid";
        winston.error(err);
        res.send({ error: err });
        return;
    }
    pool.query('SELECT * FROM group INNER JOIN group_user ON group.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id' +
        ' WHERE user.user_id = ?', userid,
        function(err, rows, fields) {
            if (err) {
                res.send({ error: err });
                winston.error(err);
                return;
            }
            res.send({ "groups": rows[0] });
        });
});

app.get('/groupUsers/:groupid', function(req, res) {
    var groupid = req.param("groupid");

    if (!(groupid != null)) {
        var err = "Please provide a group id";
        winston.error(err);
        res.send({ error: err });
        return;
    }

    pool.query('SELECT * FROM group INNER JOIN group_user ON group.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id' +
        ' WHERE group.group_id = ?', groupid,
        function(err, rows, fields) {
            if (err) {
                res.send({ error: err });
                winston.error(err);
                return;
            }
            res.send({ "users": rows[0] });
        });
});

app.listen(port, function() {
    winston.info('Listening on port ' + port);
});
