var express = require('express');
var mysql = require('mysql');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './profile-pics');
    },
    filename: function(req, file, cb) {
        cb(null, req.body.user_fb_id + ".png");
    }
});

var upload = multer({ 'storage': storage });
var winston = require('winston');
var morgan = require('morgan');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(morgan('combined'));

var port = 3002;
winston.level = 'debug';

var pool = mysql.createPool({
    connectionLimit: 10,
    host: '107.170.81.44',
    user: 'root',
    password: 'xx',
    database: 'autoc'
});

app.get('/user/:user_fb_id', function(req, res) {


    pool.query('SELECT * from user WHERE user_fb_id = ?', [user_fb_id], function(err, result) {
        if (err) {
            winston.error("Error finding user", err);
            res.status(400).send({ error: err });
            return;
        }
        if(result[0]){            
            res.send({
                user: result
            });
        } else {            
            res.status(404).send({});
        }
    });
});

app.post('/user', upload.single('avatar'), function(req, res) {
    var user_fb_id = req.body.user_fb_id;
    var name = req.body.name;
    var height = req.body.height;
    var weight = req.body.weight;
    
    if (!(user_fb_id != null)) {
        var err = "Please provide user_fb_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    if (!(name != null)) {
        var err = "Please provide a name";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    if(!(height != null)){
        var err = "Please provide height";
        winston.error(err);
        res.status(400).send({ error: err });
        return;    
    }
    if(!(weight != null)){
        var err = "Please provide weight";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }


    pool.query('INSERT INTO user (user_fb_id, name, height, weight) VALUES (?, ?, ?, ?)', [user_fb_id, name, height, weight], function(err, result) {
        if (err) {
            winston.error("Error creating user", err);
            res.status(400).send({ error: err });
            return;
        }
        res.send({
            user: {
                user_id: result.user_id,
                user_fb_id: user_fb_id,
                name: name
            }
        });
    });

});

app.post('/group', function(req, res) {
    var name = req.body.name;
    var users = req.body.users;

    if (!(name != null)) {
        var err = "Please provide a group name";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.getConnection(function(err, connection) {
        if (err) {
            res.status(400).send({ error: err });
            winston.error(err);
            return;
        }

        connection.beginTransaction(function(err) {
            if (err) {
                connection.rollback(function() {
                    res.status(400).send({ error: err });
                });
                winston.error(err);
                return;
            }
            connection.query('INSERT INTO `group` (name, active) VALUES (?, ?)', [name, 0],
                function(err, result) {
                    if (err) {
                        connection.rollback(function() {
                            res.status(400).send({ error: err });
                        });
                        winston.error(err);
                        return;
                    }
                    var valuesToInsert = [];
                    console.log(result);

                    for (var i in users) {
                        valuesToInsert.push([result.insertId, users[i], 0]);
                    }
                    console.log(valuesToInsert);
                    connection.query('INSERT INTO group_user (group_id, user_id, is_driver) VALUES ?', [valuesToInsert],
                        function(err, result) {
                            if (err) {
                                connection.rollback(function() {
                                    res.status(400).send({ error: err });
                                });
                                winston.error(err);
                                return;
                            }
                            connection.commit(function(err) {
                                if (err) {
                                    connection.rollback(function() {
                                        res.status(400).send({ error: err });
                                    });
                                    winston.error(err);
                                    return;
                                }
                                res.send({ "group": { "group_id": result.insertId, "name": name } });
                            });
                        });
                });
        });
    });
});

app.get('/groups/:userid', function(req, res) {
    var userid = req.params.userid;

    if (!(userid != null)) {
        var err = "Please provide a userid";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    pool.query('SELECT `group`.group_id, `group`.name FROM `group` INNER JOIN group_user ON `group`.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id ' +
        ' WHERE user.user_id = ?', userid,
        function(err, rows, fields) {
            if (err) {
                res.send({ error: err });
                winston.error(err);
                return;
            }

            res.send({ "groups": rows });
        });
});

app.get('/group/:groupid', function(req, res) {
    var groupid = req.params.groupid;

    if (!(groupid != null)) {
        var err = "Please provide a group id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('SELECT *, `group`.name as group_name FROM `group` INNER JOIN group_user ON `group`.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id' +
        ' WHERE group.group_id = ?', groupid,
        function(err, rows, fields) {
            if (err) {
                res.status(400).send({ error: err });
                winston.error(err);
                return;
            }
            var g = rows[0];
            var resp = {
                group_d: g.group_id,
                name: g.group_name,
                active: g.active,
                users: []
            };

            for (var i = 0; i < rows.length; i++) {
                resp.users.push({
                    user_id: rows[i].user_id,
                    user_fb_id: rows[i].user_fb_id,
                    is_driver: rows[i].is_driver
                });
            }
            res.send(resp);
        });
});

app.listen(port, function() {
    winston.info('Listening on port ' + port);
});
