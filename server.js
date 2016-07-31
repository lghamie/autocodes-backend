var express = require('express');
var app = express();

app.get('/getgroups', function(req, res) {
    var userid = req.param("userid");
    console.log('EL gato de locu requested something');	
    var content = {
        "grupos": [{
            "nombre": "Nombre de grupo 1",
            "id": 1,

        }, {
            "nombre": "Nombre de grupo 2",
            "id": 2,

        }, {
            "nombre": "Nombre de grupo 3",
            "id": 3,

        }]

    };
    res.send(content);
});

app.listen(3000, function() {
    console.log('Esperando al gato de locu 3000!');
});
