var username = prompt("Please enter your nickname", "undefined");

console.log('script.js'); // debugg


// Add titi: utilitaires de débugg
var tool = new utils();
// tool.testutils('script.js'); // OK

var myPeerConnection;

var myVideo;
var yourVideo;
// Add titi
var yourVideo2;
var yourVideo3;
var yourVideo4;

var myScreen;
var yourScreen;



var buttonSendChat;
var buttonFileInput;
var buttonShareWebcam;
var buttonShareScreen;
var buttonStopReceiveWebcam;

var peerConnection;
var peerConnectionServer;
var peerConnectionOptions;

var browserSupportWebRTC = true;

// Using socket.io -  Note titi: Bug nodejitsu >>>> 
// "Uncaught TypeError: object is not a function script.js:23 (anonymous function)"
var socket = io();

window.onload = function() {
	console.log('script.js > window.onload()'); // debugg
  	//utils.	 ;// pour vérif...
	myVideo = document.getElementById("myVideo");
	yourVideo = document.getElementById("yourVideo");
	myScreen = document.getElementById("myScreen");
	yourScreen = document.getElementById("yourScreen");

	buttonSendChat = document.getElementById('sendChat');
	buttonFileInput = document.getElementById('fileInput');
	buttonShareWebcam = document.getElementById('buttonShareWebcam');
	buttonShareScreen = document.getElementById('buttonShareScreen');
	buttonStopReceiveWebcam = document.getElementById('buttonStopReceiveWebcam');

	peerConnectionServer = getPeerConnectionServers(); // Get server address
	peerConnectionOptions = getPeerConnectionOptions(); // Get server options
	dataChannelOptions = getDataChannelOptions(); // Get data channel options

	// Set handlers and videos elements. Can be call after initialize but before sharing
	MyPeerConnection.setAllVideosElements(myVideo, yourVideo, myScreen, yourScreen);
	MyPeerConnection.setOnReceiveWebcam(receiveWebcamSuccess, receiveWebcamError);
	MyPeerConnection.setOnReceiveScreen(receiveScreenSuccess, receiveScreenError);
	MyPeerConnection.setOnReceiveDataChannel(receiveChatSuccess, receiveChatError);
	MyPeerConnection.beforeReceiveWebcam(confirmReceiveWebcam);
	MyPeerConnection.beforeReceiveScreen(confirmReceiveScreen);

	MyPeerConnection.initialize(peerConnectionServer, peerConnectionOptions, sendMessageThroughSocket, disconnectMe, otherDisconnect, onInitializeError); // MyPeerConnection initialization 
	
	if (browserSupportWebRTC) // If my browser is comptatible with webRTC...
		MyPeerConnection.createDataChannel(receiveChat, onOpenChannel, onCloseChannel, onErrorChannel); // Automatic creation of a data channel 
};

// Send a message through socket.io
var sendMessageThroughSocket = function(param1, param2) {
	socket.emit('message', JSON.stringify({type:param1, message:param2}));
};

// Send a message through data channel.
var sendMessageTrhoughDataChannel = function(param1, param2) {			
	messageChannel = JSON.stringify({type:param1, message:param2});
	MyPeerConnection.sendDataChannel(messageChannel);
};


/***********************
	Handlers for initialize
**********************/

// If MyPeerDisconnection want disconnect me
function disconnectMe(text) {
	socket.disconnect();
	addMessageChannelToChatWithName('Server', 'You have been disconnected : ' + text);
}

// If my interlocutor is disconnected
function otherDisconnect() {
	//console.log('Receive disconnect');
	MyPeerConnection.setSendMessage(sendMessageThroughSocket); // Pass all messages between the peers into data channel.

	addMessageChannelToChatWithName('Server', 'Your friend is gone.');

	// Buttons management
	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = true;

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = true;

	buttonSendChat.disabled = true;
	buttonFileInput.disabled = true;
}

// If MyPeerConnection.initialize(...) fail 
function onInitializeError(error) {
	addMessageChannelToChatWithName('Server', error);
	browserSupportWebRTC = false;
	socket.disconnect();
}

/***********************
	Handler for buttons
***********************/
function shareWebcam() {
	// Suggest to my interlocutor to get my webcam. If my interlocutor receive my webcam, call webcamSuccess pointer, else call webcamError pointer
	MyPeerConnection.startWebcamSharing(webcamSuccess, webcamError);

	// Buttons management
	buttonShareWebcam.disabled = true;
	buttonShareWebcam.innerHTML = "Connection...";
	buttonShareWebcam.value = 'connecting';
}

function stopSharingWebcam() {
	buttonShareWebcam.disabled = true;
	buttonShareWebcam.innerHTML = "Disconnection...";
	buttonShareWebcam.value = 'closing';

	MyPeerConnection.stopWebcamSharing(); // Stop sending my webcam to my interlocutor

	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = false;
}

function shareScreen() {
	MyPeerConnection.startScreenSharing(screenSuccess, screenError);

	buttonShareScreen.disabled = true;
	buttonShareScreen.innerHTML = "Connection...";
	buttonShareScreen.value = 'connecting';
}

function stopSharingScreen() {
	buttonShareScreen.disabled = true;
	buttonShareScreen.innerHTML = "Disconnection...";
	buttonShareScreen.value = 'closing';

	MyPeerConnection.stopScreenSharing();

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = false;
}

// Send text to interlocutor through data channel
function sendChat () {
	chatText = document.getElementById("chatInput").value;
	if (chatText != "") {
		sendMessageChannel(chatText);
		addMessageChannelToChatWithName(username, chatText);
		document.getElementById("chatInput").value = "";
	}
}

// Send a file to interlocutor through data channel
function sendFile (listFiles) {
	if (listFiles && listFiles[0].size < 10240) {
		var file = listFiles[0];
		reader = new FileReader();
		reader.onload = function (event) {
			fileChannel = JSON.stringify({
				'username': username,
				'fileName': file.name,
				'fileType': file.type,
				'fileSize': file.size,
				'file': encodeURI(event.target.result)
			});
			MyPeerConnection.sendDataChannel(fileChannel);
			addInformationToChat('* File sent.');
		};
		reader.readAsDataURL(file);
	}
	else {
		addInformationToChat(' * Can not read file or file size bigger than 10 ko');
	}
}


/**********************
	Chat functions
**********************/

function addMessageChannelToChat(text) {
	if (text != null && text != '') {
		var log = document.getElementById('log');
		var pre = document.createElement('pre');
		var code = document.createElement('code');
		pre.appendChild(code);
		code.textContent = text;
		log.insertBefore(pre, log.firstChild);
	}
}

function addInformationToChat(text) {
	if (text != null && text != '') {
		var log = document.getElementById('log');
		var p = document.createElement('p');
		p.innerHTML = text;
		log.insertBefore(p, log.firstChild);
	}
}

function addMessageChannelToChatWithName (name, text) {
	if (text != null && text != '') {
		var log = document.getElementById('log');
		var p = document.createElement('p');
		var span = document.createElement('span');
		span.id = 'sender';
		span.innerHTML = name + ' : ';
		p.appendChild(span);

		var pre = document.createElement('pre');
		var code = document.createElement('code');
		pre.appendChild(code);
		code.textContent = text;

		p.appendChild(pre);

		log.insertBefore(p, log.firstChild);
	}
}

function sendMessageChannel (text) {
	if (text != "") {			
		messageChannel = JSON.stringify({
			'username': username,
			'text': text
		});
		MyPeerConnection.sendDataChannel(messageChannel);
	}
}


/**********************
	Drag and drop
**********************/

function dragOverHandler(event) {
	// Do not propagate the event
	event.stopPropagation();
	// Prevent default behavior, in particular when we drop images or links
	event.preventDefault(); 
}

function dropHandler(event) {
	// Do not propagate the event
	event.stopPropagation();
	// Prevent default behavior, in particular when we drop images or links
	event.preventDefault(); 

	sendFile(event.dataTransfer.files);
}

/********************
	Webcam callback
********************/
function webcamSuccess() {
	//console.log('Sending webcam success');

	buttonShareWebcam.innerHTML = "Stop sharing my webcam";
	buttonShareWebcam.onclick = stopSharingWebcam;
	buttonShareWebcam.value = 'sharing';
	buttonShareWebcam.disabled = false;
}

function webcamError(error) {
	//console.error(error);

	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = false;
}

/*********************
	Receive webcam
********************/

// Request for acceptance to receive the interlocutor's webcam
function confirmReceiveWebcam() {
	if (confirm('Do you accept webcam sharing from your interlocutor ?')) {
    	return true;
  	}
  	else 
  	{
    	return false;
  	}
}

// Automatic handle when I receive interlocutor's webcam
function receiveWebcamSuccess() {
	//console.log('Receive webcam Success');
}

// Automatic handle when an error occurs during interlocutor's webcam sharing
function receiveWebcamError(error) {
	//console.error(error);
}

/******************
	Screen callback
*****************/
function screenSuccess() {
	//console.log('Sending screen success');

	buttonShareScreen.innerHTML = "Stop sharing my screen";
	buttonShareScreen.onclick = stopSharingScreen;
	buttonShareScreen.value = 'sharing';
	buttonShareScreen.disabled = false;
}

function screenError(error) {
	//console.error(message);

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = false;
}

/***************
	Receive screen
***************/
function confirmReceiveScreen() {
	if (confirm('Do you accept screen sharing from your interlocutor ?')) {
    	return true;
  	}
  	else 
  	{
    	return false;
  	}
}

function receiveScreenSuccess() {
	//console.log('Receive screen success');
}

function receiveScreenError(error) {
	//console.error(error);
}	

/****************
	Receive chat
****************/
function receiveChatSuccess() {
	//console.log('Receive data channel success');
}

function receiveChatError(error) {
	//console.error(error);
}

/*********************
	Data channel callback
********************/
function receiveChat(message) {
	try {	
		json = JSON.parse(message);
		if (json != null) {
			if (json.text != null)  { // If it's a chat message
				addMessageChannelToChatWithName(json.username, json.text);
			}
			else if (json.file != null) { // If it's file sharing
				addInformationToChat(' * ' + json.username + ' offers to download <a href="' + decodeURI(json.file) + '" download="' + json.fileName + '">' + json.fileName + '</a> - ' + Math.round(json.fileSize/1024) + ' ko');
			}
			else if (json.type != null) { // If it's another message like webcam offer
				MyPeerConnection.receiveMessage(json.type, json.message);
			}
			else {
				//console.log('Can not handle json.');
			}
		} 
	}
	catch(error) {
		//console.error(error);
	}
}

function onOpenChannel() {
	addMessageChannelToChatWithName('Server', 'Connected.');
	MyPeerConnection.setSendMessage(sendMessageTrhoughDataChannel);

	buttonSendChat.disabled = false;
	buttonFileInput.disabled = false;
	buttonShareWebcam.disabled = false;
	if (MyPeerConnection.getMyBrowser() == 'Chrome' && (MyPeerConnection.getInterlocutorBrowser() == 'Chrome' || MyPeerConnection.getInterlocutorBrowser() == 'Opera')) {
		buttonShareScreen.disabled = false;
	}
	else {		
		addMessageChannelToChatWithName('Server', 'You or your interlocutor are using a browser not compatible with screen sharing.');
	}
}

function onCloseChannel() {
	//console.log('Close data channel');
}

function onErrorChannel(error) {
	//console.error(error);
}

/********************************
	Initialisation for RTCPeerConnection
********************************/

function getPeerConnectionServers() {
	// Note titi >>> WTF
	// Pkoi déclarer une liste de serveurs stun ici et une autre ds mypeerconnection ?????????
	peerConnectionServer = new Array();
	peerConnectionServer.push({url: 'stun:stun.l.google.com:19302'});
	//tool.traceObjectDump(peerConnectionServer,'script. getPeerConnectionServers()');
	//peerConnectionServer.push({url: 'stun:stun1.l.google.com:19302'});
	//peerConnectionServer.push({url: 'stun:stun2.1.google.com:19302'}); 
	//peerConnectionServer.push({url: 'stun:stun3.1.google.com:19302'});
	//peerConnectionServer.push({url: 'stun:stun4.1.google.com:19302'});
	// Ajout d'un serveur' TURN
	// peerConnectionServer.push({url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "louis%40mozilla.com"});
	peerConnectionServer.push({url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "temp20fev2015@gmail.com"});



	console.log('script.js > 1 getPeerConnectionServers() >> [listservers]');
	//debug = tool.stringObjectDump(peerConnectionServer,'script. getPeerConnectionServers()');
	//console.log(debug);

	// console.log('getPeerConnectionServers() '+peerConnectionServer);
	return peerConnectionServer;
}

function getPeerConnectionOptions() {
	peerConnectionOptions = new Array();
	console.log('script.js > 2 getPeerConnectionOptions()');
	return peerConnectionOptions;
}

function getDataChannelOptions () {
	dataChannelOptions = {reliable: false};
	console.log('script.js > 3 getDataChannelOptions()');
	return dataChannelOptions;
}

/***************************
	Messages from nodejs
***************************/

socket.on('message', function(msg){
	message = JSON.parse(msg);
	MyPeerConnection.receiveMessage(message.type, message.message); // Passing messages to MyPeerConnection for treatment
});

socket.on('numberOfConnections', function(msg){
	if (!browserSupportWebRTC) {
		socket.disconnect();
		return ;
	}

	if (msg == 1) {
		addMessageChannelToChatWithName('Server', 'You are actually alone.');
	}
	else if (msg == 2) {
		addMessageChannelToChatWithName('Server', 'Connecting with the other peer...');
	}
	MyPeerConnection.receiveMessage('numberOfConnections', msg);
});

socket.on('disconnection', function(msg){
	MyPeerConnection.receiveMessage('disconnection', msg);
});
