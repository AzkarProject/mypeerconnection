/*// Le code original de Cedric ne lance pas le serveur...
var fs = require('fs');
var privateKey  = fs.readFileSync('sslcert/key.pem');
var certificate = fs.readFileSync('sslcert/cert.pem');
var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();
var https = require('https').Server(credentials, app);
var io = require('socket.io')(https);
var port = 8080;
var numberOfConnections = 0;
app.use(express.static(__dirname + '/'));    
app.get('/', function(req, res){
  console.log('app.get...');
  res.sendfile('index.html');
});

https.listen(port, function(){
  console.log('listening on *:' + port);
});

// ---- fin code original cedric
/**/

/*// ----------------------------------------------------------------
// Essai 1 - avec node-static au lieu d'express
// HTTPS OK en local, 
// HTTPS KO sur nojitsu
var fs = require('fs');
var privateKey  = fs.readFileSync('sslcert/key.pem');
var certificate = fs.readFileSync('sslcert/cert.pem');
var credentials = {key: privateKey, cert: certificate};var port = 8080;
var numberOfConnections = 0;
var static = require('node-static');
var https = require('https');
var file = new(static.Server)();
var app = https.createServer(credentials,function (req, res) {
  file.serve(req, res);
}).listen(port);
var io = require('socket.io').listen(app);
/**/


/*// ----------------------------------------------------------------
// Essai 2 - node-static et HTTP
// HTTP OK en local...
// HTTP OK sur nojitsu...
var port = 8080;
var numberOfConnections = 0;
var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port);
var io = require('socket.io').listen(app);
/**/


/*// ----------------------------------------------------------------
// Essai 3 - en conservant express...
// Modification du sendfile...
// HTTPS OK en local
// HTTPS KO sur NodeJitsu
var fs = require('fs');
var privateKey  = fs.readFileSync('sslcert/key.pem');
var certificate = fs.readFileSync('sslcert/cert.pem');
var credentials = {key: privateKey, cert: certificate};
var express = require('express');
var app = express();
var https = require('https').Server(credentials, app);
var io = require('socket.io')(https);
var port = 8080;
var numberOfConnections = 0;
app.use(express.static(__dirname + '/'));    
app.get('/', function(req, res){
  res.sendfile(_dirname + '/index.html');
});
https.listen(port, function(){
  console.log('listening on *:' + port);
});
/**/

// ------------------------------------------------------
// Essai 4 - Version http....
// OK en local... 
// OK sur Nodejitsu...
// OK sur HEROKU...
// ?? sur Openshift...
var numberOfConnections = 0;
var express=require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

// Add pour openshift et Heroku
// app.set('port', (process.env.PORT || 8080));
app.set('port', (process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080));



app.use(express.static(__dirname + '/'));    
app.get('/', function(req, res){
  res.sendfile(_dirname + '/index.html');
});
//server.listen(8080);
server.listen(app.get('port'));

/**/

// ---------Code original Cedric -------------
io.on('connection', function(socket){
	numberOfConnections++;
	io.sockets.emit('numberOfConnections', numberOfConnections);
	socket.on('message', function(msg) {
		socket.broadcast.emit('message', msg);
		console.log('Receive : ' + msg);
	});
	socket.on('disconnect', function() {
    	numberOfConnections--;
    	console.log('disconnection');
    	socket.broadcast.emit('disconnection', numberOfConnections);
  	});
});
/**/