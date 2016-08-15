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
app.use(express.static(__dirname + '/profile-pics'));

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
    var user_fb_id = req.params.user_fb_id;

    if (!(user_fb_id != null)) {
        var err = "Please provide user_fb_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('SELECT * from user WHERE user_fb_id = ?', [user_fb_id], function(err, result) {
        if (err) {
            winston.error("Error finding user", err);
            res.status(400).send({ error: err });
            return;
        }
        if (result[0]) {
            res.send({
                user: result[0]
            });
        } else {
            res.status(404).send({});
        }
    });
});


app.delete('/group/:group_id', function(req, res) {
    var groupid = req.params.group_id;

    if (!(groupid != null)) {
        var err = "Please provide a group id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('DELETE FROM `group` where group_id = ?', groupid,
        function(err, rows, fields) {
            if (err) {
                winston.error("Error finding user ", err);
                res.status(400).send({ error: err });
                return;
            }
            res.send({
                msg: "Succesfully left group"
            });
        });
});

app.get('/group/:groupid/leave/:user_fb_id', function(req, res) {
    var user_fb_id = req.params.user_fb_id;
    var group_id = req.params.group_id;

    if (!(user_fb_id != null)) {
        var err = "Please provide user_fb_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    if (!(group_id != null)) {
        var err = "Please provide a group_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('SELECT * from group_user INNER JOIN user ON user.user_id =  group_user.user_id INNER JOIN `group` ON `group`.group_id = group_user.group_id' +
        'WHERE user.user_fb_id = ? AND `group`.group_id = ?', [user_fb_id, group_id],
        function(err, result) {
            if (err) {
                winston.error("Error finding user ", err);
                res.status(400).send({ error: err });
                return;
            }
            if (result[0]) {
                if (result[0].active == 1) {
                    res.status(400).statussend({
                        error: "The group you're trying to leave is active"
                    });
                } else {
                    pool.query('DELETE FROM group_user WHERE user.user_fb_id = ? AND `group`.group_id = ?', [user_fb_id, group_id],
                        function(err, result) {
                            if (err) {
                                winston.error("Error finding user ", err);
                                res.status(400).send({ error: err });
                                return;
                            }
                            res.send({
                                msg: "Succesfully left group"
                            });
                        });
                }
            } else {
                res.status(404).send({});
            }
        });

});


app.post('/group/deactivate/', function(req, res) {
    var group_id = req.body.group_id;

    if (!(group_id != null)) {
        var err = "Please provide group_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('UPDATE `group` SET active = 0 WHERE group_id = ?', [group_id], function(err, result) {
        if (err) {
            winston.error("Error activating group", err);
            res.status(400).send({ error: err });
            return;
        }
        res.send({
            group: result[0]
        });
    });
});


app.post('/group/activate/', function(req, res) {
    var group_id = req.body.group_id;
    var driver = req.body.driver;

    if (!(group_id != null)) {
        var err = "Please provide group_id";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    if (!(driver != null)) {
        var err = "Please provide a driver";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('SELECT * FROM `group` INNER JOIN group_user ON group_user.group_id = `group`.group_id WHERE user_id IN ' +
        '(SELECT user.user_id FROM `group` INNER JOIN group_user ON `group`.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id ' +
        ' WHERE `group`.group_id = ?) and active = 1', [group_id],
        function(err, rows) {
            if (err) {
                winston.error("Error activating group", err);
                res.status(400).send({ error: err });
                return;
            }
            if (rows[0]) {
                res.send({
                    error: "A user already has an active group"
                });
                return;
            }
            /*
            pool.query('SELECT * from user WHERE user_fb_id = ?', [group_id], function(err, result) {
                if (err) {
                    winston.error("Error activating group", err);
                    res.status(400).send({ error: err });
                    return;
                }
                var driver;
                if(!result[0]){
                    winston.error("Driver user does not exist!", err);
                    res.status(400).send({ error: err });
                    return;    
                } else {
                    driver = result[0].user_fb_id;
                }
              */
            pool.query('UPDATE `group` SET active = 1, driver_id = ? WHERE group_id = ?', [driver, group_id], function(err, result) {
                if (err) {
                    winston.error("Error activating group", err);
                    res.status(400).send({ error: err });
                    return;
                }
                res.send({
                    group: result[0]
                });
            });
        });

});

app.post('/user', /* upload.single('avatar'),*/ function(req, res) {
    var user_fb_id = req.body.user_fb_id;
    var name = req.body.name;
    var height = req.body.height;
    var weight = req.body.weight;
    var avatar = req.body.avatar;


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
    if (!(height != null)) {
        var err = "Please provide height";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    if (!(weight != null)) {
        var err = "Please provide weight";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    if (!(avatar != null)) {
        var err = "Please provide an avatar url";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }

    pool.query('INSERT INTO user (user_fb_id, name, height, weight, avatar) VALUES (?, ?, ?, ?, ?)', [user_fb_id, name, height, weight, avatar], function(err, result) {
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
    var admin = req.body.admin;

    if (!(name != null)) {
        var err = "Please provide a group name";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    if (!(admin != null)) {
        var err = "Please provide an admin";
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
                    console.log(result);
                    var groupResult = result;

                    connection.query('SELECT user_fb_id, user_id FROM user WHERE user_fb_id IN(?)', [users],
                        function(err, rows) {
                            if (err) {
                                connection.rollback(function() {
                                    res.status(400).send({ error: err });
                                });
                                winston.error(err);
                                return;
                            }


                            var valuesToInsert = [];
                            for (var i in rows) {
                                if (rows[i].user_fb_id == admin) {
                                    valuesToInsert.push([groupResult.insertId, rows[i].user_id, 1]);
                                } else {
                                    valuesToInsert.push([groupResult.insertId, rows[i].user_id, 0]);
                                }
                            }

                            console.log(valuesToInsert);
                            connection.query('INSERT INTO group_user (group_id, user_id, is_admin) VALUES ?', [valuesToInsert],
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
});

app.get('/groups/:userid', function(req, res) {
    var userid = req.params.userid;

    if (!(userid != null)) {
        var err = "Please provide a userid";
        winston.error(err);
        res.status(400).send({ error: err });
        return;
    }
    pool.query('SELECT `group`.group_id, `group`.name, `group`.active FROM `group` INNER JOIN group_user ON `group`.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id ' +
        ' WHERE user.user_fb_id = ?', userid,
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

    pool.query('SELECT *, `group`.name as group_name, user.name as user_name FROM `group` INNER JOIN group_user ON `group`.group_id = group_user.group_id INNER JOIN user ON user.user_id = group_user.user_id' +
        ' WHERE `group`.group_id = ?', groupid,
        function(err, rows, fields) {
            if (err) {
                res.status(400).send({ error: err });
                winston.error(err);
                return;
            }
            var g = rows[0];
            var resp = {
                group_id: g.group_id,
                name: g.group_name,
                active: g.active,
                driver: g.driver_id,
                users: []
            };

            for (var i = 0; i < rows.length; i++) {
                resp.users.push({
                    user_id: rows[i].user_id,
                    name: rows[i].user_name,
                    user_fb_id: rows[i].user_fb_id,
                    //        is_driver: rows[i].is_driver
                });
            }
            res.send(resp);
        });
});

app.listen(port, function() {
    winston.info('Listening on port ' + port);
});
