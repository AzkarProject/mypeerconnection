var MyPeerConnection = (function() {
	
	console.log('MyPeerConnection()');

	/*****************************************************************
		Private static fields
	******************************************************************/
	// Add titi: utilitaires de débugg
	var tool = new utils();
	// tool.testutils('myPeerConnection'); OK


	var rtcPeerConnection = null;
	var myWebcamRtcPeerConnection = null;
	var myScreenRtcPeerConnection = null;
	var yourWebcamRtcPeerConnection = null;
	var yourScreenRtcPeerConnection = null;

	var dataChannelWaiting = false;
	var doOfferDataChannel = false;
	var ptrCreateDataChannel = null;

	var serversList = null;
	var peerConnectionOptions = null;

	var myWebcam = null;
	var yourWebcam = null;
	// Add titi
	var yourWebcam2 = null;
	var yourWebcam3 = null;
	var yourWebcam4 = null;


	var myScreen = null;
	var yourScreen = null;

	var myWebcamStream = null;
	var yourWebcamStream = null;
	var myScreenStream = null;
	var yourScreenStream = null;

	var numberOfConnections = 0;
	var interlocutorBrowser = null;

	var ptrSendMessage = null;

	var ptrAskingReceiveWebcam = function(){return true;};
	var ptrAskingReceiveScreen = function(){return true;};

	var ptrMyDisconnection = function(){};
	var ptrOtherDisconnection = function(){};
	var ptrOnWebcamSuccess = function(){};
	var ptrOnWebcamError = function(){};
	var ptrOnScreenSuccess = function(){};
	var ptrOnScreenError = function(){};
	var ptrOnDataChannelSuccess = function(){};
	var ptrOnDataChannelError = function(){};

	var ptrOnReceiveWebcamSuccess = function(){};
	var ptrOnReceiveWebcamError = function(){};
	var ptrOnReceiveScreenSuccess = function(){};
	var ptrOnReceiveScreenError = function(){};
	var ptrOnReceiveDataChannelSuccess = function(){};
	var ptrOnReceiveDataChannelErrror = function(){};

	var priorityWebcamCallback = 0;
	var priorityScreenCallback = 0;
	var priorityChatCallback = 0;


	//Browser detection : http://www.javascripter.net/faq/browsern.htm
	var nVer = navigator.appVersion;
	var nAgt = navigator.userAgent;
	var browserName  = navigator.appName;
	var fullVersion  = ''+parseFloat(navigator.appVersion); 
	var majorVersion = parseInt(navigator.appVersion,10);
	var nameOffset,verOffset,ix;


	/**********************************************************
		Private static methods
	**********************************************************/

	//Browser detection : http://www.javascripter.net/faq/browsern.htm
	var detectBrowser = function() {
		// console.log('detectBrowser()');
		// For Opera : http://jsfiddle.net/9zxvE/383/
		if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
			browserName = "Opera";
			majorVersion = navigator.userAgent.substring(navigator.userAgent.indexOf(' OPR/')+5, navigator.userAgent.indexOf(' OPR/')+7);
		}
		// In MSIE, the true version is after "MSIE" in userAgent
		else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
			browserName = "Microsoft Internet Explorer";
			fullVersion = nAgt.substring(verOffset+5);
		}
		// In Chrome, the true version is after "Chrome" 
		else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
			browserName = "Chrome";
			fullVersion = nAgt.substring(verOffset+7);
		}
		// In Safari, the true version is after "Safari" or after "Version" 
		else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
			browserName = "Safari";
			fullVersion = nAgt.substring(verOffset+7);
			if ((verOffset=nAgt.indexOf("Version"))!=-1) 
				fullVersion = nAgt.substring(verOffset+8);
		}
		// In Firefox, the true version is after "Firefox" 
		else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
			browserName = "Firefox";
			fullVersion = nAgt.substring(verOffset+8);
		}
		// In most other browsers, "name/version" is at the end of userAgent 
		else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < 
			(verOffset=nAgt.lastIndexOf('/')) ) 
		{
			browserName = nAgt.substring(nameOffset,verOffset);
			fullVersion = nAgt.substring(verOffset+1);
			if (browserName.toLowerCase()==browserName.toUpperCase()) {
				browserName = navigator.appName;
			}
		}
		// trim the fullVersion string at semicolon/space if present
		if ((ix=fullVersion.indexOf(";"))!=-1)
		fullVersion=fullVersion.substring(0,ix);
		if ((ix=fullVersion.indexOf(" "))!=-1)
			fullVersion=fullVersion.substring(0,ix);

		if (!(!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)) {
			majorVersion = parseInt(''+fullVersion,10);
			if (isNaN(majorVersion)) {
				fullVersion  = ''+parseFloat(navigator.appVersion); 
				majorVersion = parseInt(navigator.appVersion,10);
			}
		}

		//console.log(browserName + ' detected. Version: ' + majorVersion);
	};

	// Return constraints to offer/answer
	var getConstraints = function() {
		//console.log('getConstraints()');
		var constraints = {
			mandatory: {
				OfferToReceiveAudio: true,
				OfferToReceiveVideo: true
			},

		};
		return constraints;
	};


	// Add titi . création constraint dédiées a la vidéo
	// puisque getConstraints() est utilisé aussi bien pour 
	// le chat,le partage d'écran et le partage de WebCam...
	// donc, l'ajout de paramètres vidéos donne l'erreur suivante:
	// >>>> Uncaught TypeError: Failed to execute 'createOffer' on 'RTCPeerConnection': Malformed constraints object.
	// ------- PeerConnection.createChatOffer > MyPeerConnection.js:671
	// ------- PeerConnection.setOnnegotiationneeded.connection.onnegotiationneeded > MyPeerConnection.js:565 		
	
	var getVideoConstraints = function() {
		//console.log('getVideoConstraints()');
		var videoConstraints = {
			    audio: true,
			    video: {
			        mandatory : {
			            maxWidth    : 300,
			            maxHeight   : 180  
			        }
			    }
		};

		return videoConstraints;
	};

	/**************************
		Webcam callback
	**************************/
	var getWebcam = function() {
		//console.log('getWebcam()');
		//getUserMedia({"audio": true, "video": true}, gotWebcamCallback, errorGotWebcam);
		getUserMedia(getVideoConstraints(), gotWebcamCallback, errorGotWebcam);

	};

	var gotWebcamCallback = function(stream) {
		//console.log('gotWebcamCallback()');
		myWebcamStream = stream;
		attachMediaStream(myWebcam, myWebcamStream);
		if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
			myWebcamRtcPeerConnection.addWebcam(myWebcamStream);
			myWebcamRtcPeerConnection.createWebcamOffer();
		}
		else {
			rtcPeerConnection.addWebcam(myWebcamStream);
		}
	};

	var errorGotWebcam = function(error) {
		//console.log('errorGotWebcam()');
		throwOnWebcamErrorCallback("Error to webcam access : " + error);
	};

	/***********************
		Screen callback
	**********************/
	var getScreen = function() {
		//console.log('getScreen()');
		getUserMedia({"audio": false, "video": {mandatory: {chromeMediaSource: 'screen', maxWidth: window.screen.width, maxHeight: window.screen.height}}}, gotScreenCallback, errorGotScreen);
	};

	var gotScreenCallback = function(stream) {
		//console.log('gotScreenCallback()');
		myScreenStream = stream;
		attachMediaStream(myScreen, myScreenStream);
		rtcPeerConnection.addScreen(myScreenStream);
	};

	var errorGotScreen = function(error) {
		//console.log('errorGotScreen()');
		throwOnScreenErrorCallback("Error to screen access : " + error);
	};

	/*********************
		Sending user callback
	*********************/
	var throwOnWebcamSuccessCallback = function() {
		priorityWebcamCallback = 0; // Webcam leaves queue
		ptrOnWebcamSuccess(); // Call the success pointer
		ptrOnWebcamSuccess = function(){}; // Reset the success pointer
		ptrOnWebcamError = function(){}; // Reset the error pointer
	};

	var throwOnWebcamErrorCallback = function(message) {
		priorityWebcamCallback = 0;
		ptrOnWebcamError(message);
		ptrOnWebcamSuccess = function(){};
		ptrOnWebcamError = function(){};
	};

	var throwOnScreenSuccessCallback = function() {
		priorityScreenCallback = 0;
		ptrOnScreenSuccess();
		ptrOnScreenSuccess = function(){};
		ptrOnScreenError = function(){};
	};

	var throwOnScreenErrorCallback = function(message) {
		priorityScreenCallback = 0;
		ptrOnScreenError(message);
		ptrOnScreenSuccess = function(){};
		ptrOnScreenError = function(){};
	};


	// /!\ Utilitée ?
/*	var throwOnChatSuccessCallback = function() {
		priorityChatCallback = 0;
		ptrOnDataChannelSuccess();
		ptrOnDataChannelSuccess = function(){};
		ptrOnDataChannelError = function(){};
	};*/

	var throwOnChatErrorCallback = function(message) {
		priorityChatCallback = 0;
		if (ptrCreateDataChannel.ptrOnErrorChannel)
			ptrCreateDataChannel.ptrOnErrorChannel();
	};

	/******************
		Closing all connections
	******************/
	// /!\ Verifier les stop() et close...()
	var closeAllConnections = function() {
		if (myWebcamStream) {
			myWebcamStream.stop();
			myWebcamStream = null;
		}

		if (yourWebcamStream) {
			//yourWebcamStream.stop();
			yourWebcamStream = null;
		}

		if (myScreenStream) {
			myScreenStream.stop();
			myScreenStream = null;
		}

		if (yourScreenStream) {
			//yourScreenStream.stop();
			yourScreenStream = null;
		}

		if (rtcPeerConnection) {
			rtcPeerConnection.closeDataChannel();
			//rtcPeerConnection.closeConnection();
			rtcPeerConnection = null;
		}

		if (myWebcamRtcPeerConnection) {
			//myWebcamRtcPeerConnection.closeConnection();
			myWebcamRtcPeerConnection = null;
		}

		if (yourWebcamRtcPeerConnection) {
			//yourWebcamRtcPeerConnection.closeConnection();
			yourWebcamRtcPeerConnection = null;
		}

		if (myScreenRtcPeerConnection) {
			//myScreenRtcPeerConnection.closeConnection();
			myScreenRtcPeerConnection = null;
		}

		if (yourScreenRtcPeerConnection) {
			//yourScreenRtcPeerConnection.closeConnection();
			yourScreenRtcPeerConnection = null;
		}

	};

	//	PeerConnection is a javascript object. He manage an RTCPeerConnection
	var PeerConnection = function(listServers, optionsPeerConnection) {
		// note titi: controle liste serveurs
		// tool.testutils('listServers'); // OK
		// tool.traceObjectDump(listServers, 'Mypeerconnection. var PeerConnection > listServers');
		debug = tool.stringObjectDump(listServers, 'Mypeerconnection. var PeerConnection > listServers');
		console.log(debug);
		/*****************************************************************
			Private object fields
		*****************************************************************/
		var connection = null;
		var dataChannel = null;

		var receiveWebcam = 0;
		var receiveScreen = 0;

		var webcamNegotiationNeeded = false;
		var screenNegotiationNeeded = false;
		var chatNegotiationNeeded = false;

		var type = null;

		var caller = null;

		/****************************************************************
			Private object methods
		****************************************************************/

		/***********************
			Offer callback
		***********************/
		var createOfferCallback = function(localDescription) {
			connection.setLocalDescription(localDescription, offerSetLocalDescriptionCallback, errorOfferSetLocalDescription);
			ptrSendMessage(type + 'Offer', localDescription);
		};

		var errorCreateOffer = function(error) {
			if (type == 'webcam') {
				throwOnWebcamErrorCallback('Error when create offer : ' + error);
			}
			else if (type == 'screen') {
				throwOnScreenErrorCallback('Error when create offer : ' + error);
			}
			else if (type == 'chat') {
				throwOnChatErrorCallback('Error when create offer : ' + error);
			}
		};

		var offerSetLocalDescriptionCallback = function() {
			//console.log('Set local description success.');
		};

		var errorOfferSetLocalDescription = function(error) {
			if (type == 'webcam') {
				throwOnWebcamErrorCallback('Error when set local description in offer : ' + error);
			}
			else if (type == 'screen') {
				throwOnScreenErrorCallback('Error when set local description in offer : ' + error);
			}
			else if (type == 'chat') {
				throwOnChatErrorCallback('Error when set local description in offer : ' + error);
			}
		};

		/***************************************
			Set remote description callback
		***************************************/
		var offerSetRemoteDescriptionCallback = function() {
			connection.createAnswer(createAnswerCallback, errorCreateAnswer, getConstraints());
		};

		var errorOfferSetRemoteDescription = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when set remote description when receive offer : ' + JSON.stringify(error));
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when set remote description when receive offer : ' + JSON.stringify(error));
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when set remote description when receive offer : ' + JSON.stringify(error));	
			}
		};

		/**********************************
			Answer callback
		**********************************/
		var createAnswerCallback = function(localDescription) {
			connection.setLocalDescription(localDescription, answerSetLocalDescriptionCallback, errorAnswerSetLocalDescription);
			if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox')
				ptrSendMessage(type + 'Answer', localDescription);
			else
				ptrSendMessage('answer', localDescription);
		};

		var errorCreateAnswer = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when create answer : ' + error);
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when create answer : ' + error);
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when create answer : ' + error);
			}
		};

		var answerSetLocalDescriptionCallback = function(localDescription) {
			//console.log('Set answer local description success.');
		};

		var errorAnswerSetLocalDescription = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when set local description in answer : ' + error);
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when set local description in answer : ' + error);
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when set local description in answer : ' + error);
			}
		};

		/***********************************
				Remote answer callback
		***********************************/
		var answerSetRemoteDescriptionCallback = function() {
			//console.log('Set answer description success.');
			if (priorityWebcamCallback > priorityScreenCallback && priorityWebcamCallback > priorityChatCallback) {
				throwOnWebcamSuccessCallback();
			}
			else if (priorityScreenCallback > priorityWebcamCallback && priorityScreenCallback > priorityChatCallback) {
				throwOnScreenSuccessCallback();
			}
			// /!\ Utilitée ? Doublon avec onopen du datachannel ?
			else if (priorityChatCallback > priorityWebcamCallback && priorityChatCallback > priorityScreenCallback) {
				//throwOnChatSuccessCallback();
				priorityChatCallback = 0;
			}
		};

		var errorAnswerSetRemoteDescription = function(error) {
			if (priorityWebcamCallback > priorityScreenCallback && priorityWebcamCallback > priorityChatCallback) {
				throwOnWebcamErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
			else if(priorityScreenCallback > priorityWebcamCallback && priorityScreenCallback > priorityChatCallback) {
				throwOnScreenErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
			else if(priorityChatCallback > priorityWebcamCallback && priorityChatCallback > priorityScreenCallback) {
				throwOnChatErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
		};

		/******************************
			Add ice candidate callback
		******************************/
		var addIceCandidateCallback = function() {
			//console.log('Add ice candidate success !');
		};

		var errorAddIceCandidate = function(error) {
			//console.error('Error when adding ice candidate : ' + JSON.stringify(error));
		};

		/*********************************************************************
			Public object methods
		*********************************************************************/
		return {
			// Create a RTCPeerConnection with event forwarding after creation
	    	createConnection : function() {
				
				//console.log('createConnection() > Create a RTCPeerConnection with event forwarding after creation');
				connection = new RTCPeerConnection({iceServers:serversList}, {optional:peerConnectionOptions});
				
				// note titi WTF
				// tool.traceObjectDump(serversList,'Mypeerconnection. createConnection > serversList');
				debug = tool.stringObjectDump(serversList,'Mypeerconnection. createConnection > serversList');
				console.log(debug);

				//console.log('@createconnection >>> this.setOnicecandidate();');
				this.setOnicecandidate();
				
				//console.log('@createconnection >>> this.setOnicecandidate();');
				this.setOnaddstream();
				
				//console.log('@createconnection >>> this.setOnnegotiationneeded();' );
				this.setOnnegotiationneeded();
				
				
				//console.log('@createconnection >>> this.setOniceconnectionstatechange()');
				this.setOniceconnectionstatechange();
				
				//console.log('@createconnection >>> this.setOnsignalingstatechange()');
				this.setOnsignalingstatechange();
				

				connection.onremovestream = function() {
					//console.log('onremovestream event not defined');
				};
				this.setOndataChannel();
	    	},

	    	//	Create a data channel with event forwarding after creation
			//	ptrOnMessageChannel parameter is mandatory
	    	createDataChannel : function(ptrOnMessageChannel, ptrOnOpenChannel, ptrOnCloseChannel, ptrOnErrorChannel) {
				//console.log('createDataChannel() > Create a data channel with event forwarding after creation');
				if (dataChannelWaiting) {
	    			chatNegotiationNeeded = true;
	    		}
	    		else {
	    			chatNegotiationNeeded = false;
	    		}

				dataChannel = connection.createDataChannel("dataChannel", {reliable: false});

				this.setOnmessagechannel(ptrOnMessageChannel);
				this.setOnopenchannel(ptrOnOpenChannel);
				this.setOnclosechannel(ptrOnCloseChannel);
				this.setOnerrorchannel(ptrOnErrorChannel);

				//Data channel problem with Chrome. Maybe garbage collector
				result0000000 = new Array();
				result0000000[0] = connection;
				result0000000[1] = dataChannel;
	    	},

	    	/***************************/
	    	//	Set RTCPeerConnection events
	    	setOnicecandidate : function() {
				connection.onicecandidate = function(event) {
					//console.log('setOnicecandidate() > Set RTCPeerConnection events');
					if (event.candidate == null) {  // If receives a null candidate, do nothing
						//console.log('Receive null candidate');
						return; 
					}

					// If one of the two browsers is Firefox and sharing is webcam or screen, needs to create a PeerConnection object-by-case
					if ((type == 'webcam' || type == 'screen') && (interlocutorBrowser == 'Firefox' || browserName == 'Firefox')) {
						if (caller == null) {
							//console.error('Caller is not defined. Use setCaller(bool) to set caller.');
						}
						else {
							if (caller) {
								ptrSendMessage('mytoyour' + type + 'Candidate', event.candidate);
							}
							else {
								ptrSendMessage('yourtomy' + type + 'Candidate', event.candidate);
							}
						}
					}
					else { // If browsers are not Firefox or sharing is data channel, sends just candidate kind
						ptrSendMessage('candidate', event.candidate);
					}
				}
	    	},

	    	setOnaddstream : function() {
	    		connection.onaddstream = function(event) {
					//console.log('setOnaddstream() >> ');
					connectionEtablished = true;
					if (receiveWebcam > receiveScreen) {
						//console.log('>> receiveWebcam > receiveScreen');
						yourWebcamStream = event.stream; // Get stream
						attachMediaStream(yourWebcam, yourWebcamStream); // From adapter.js. Attach yourWebcamStream to yourWebcam
						receiveWebcam = 0; // Webcam leaves queue
						ptrOnReceiveWebcamSuccess(); // Call the success pointer
						
					}
					else if (receiveScreen > receiveWebcam) {
						//console.log('>> receiveScreen > receiveWebcam');
						yourScreenStream = event.stream;
						attachMediaStream(yourScreen, yourScreenStream);
						receiveScreen = 0;
						ptrOnReceiveScreenSuccess();
					}
				}
	    	},

	    	setOnnegotiationneeded : function() {
	    		var ptrCreateWebcamOffer = this.createWebcamOffer; // Get pointer
	    		var ptrCreateScreenOffer = this.createScreenOffer;
	    		var ptrCreateChatOffer = this.createChatOffer;
	    		//	Firefox does not support this event
	    		connection.onnegotiationneeded = function() {
	    			//console.log('onnegotiationneeded() >>');
					if (webcamNegotiationNeeded) {
						//console.log('>> webcamNegotiationNeeded');
						ptrCreateWebcamOffer();
					}
					else if (screenNegotiationNeeded) {
						//console.log('>> screenNegotiationNeeded');
						ptrCreateScreenOffer();
					}
					else if (chatNegotiationNeeded) {
						//console.log('>> chatNegotiationNeeded');
						ptrCreateChatOffer();
					}
				}
	    	},

	    	// Firefox does not support this event
	    	setOnremovestream : function(func) {
	    		connection.onremovestream = func;
	    	},

	    	setOniceconnectionstatechange : function() {
	    		connection.oniceconnectionstatechanged = function(event) {
	    			//console.log('setOniceconnectionstatechange() >>');
	    			//console.log('>> oniceconnectionstatechanged : ' + event.target.iceConnectionState);
	    		}
	    	},

	    	setOnsignalingstatechange : function() {
	   			
	   			connection.onsignalingstatechange = function(event) {
	   				//console.log('onsignalingstatechange() >>');
	   				if (browserName == 'Chrome') {
						//console.log('>> onsignalingstatechange : ' + event.target.signalingState);
	   				}
					else {
						//console.log('>> onsignalingstatechange : ' + JSON.stringify(event));
					}
				};
	    	},

	    	setOndataChannel : function() {
	    		//console.log('setOndataChannel() >>');
	    		connection.ondatachannel = function(event) {
					//console.log('>> ptrOnReceiveDataChannelSuccess()');
					dataChannel = event.channel;
					ptrOnReceiveDataChannelSuccess();
				};
	    	},

	    	/*************************/
	    	//	Define data channel events
	    	setOnmessagechannel : function(ptrFunction) {
	    		if (ptrFunction) {
		    		dataChannel.onmessage = function(event) {
		    			ptrFunction(event.data);
		    		};
	    		}
	    		else {
	    			dataChannel.onmessage = function(event) {
						//console.error('Message receive but no handler is define. Use MyPeerConnection.setMessageChannel(*fonction).');
					};
	    		}
	    	},

	    	setOnopenchannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onopen = function() {
		    			ptrFunction();
	    			};
	    		}
	    		else {
					dataChannel.onopen = function() {
						//console.log('on open channel. Use MyPeerConnection.setOpenChannel(*fonction) for redefine.');
					};
	    		}
	    	},

	    	//onclosechannel not fired in chrome
	    	//http://stackoverflow.com/questions/17376804/onclose-and-onerror-not-getting-called-on-datachannel-disconnect
	    	setOnclosechannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onclose = function() {
		    			ptrFunction();
	    			};
	    		}
	    		else {
					dataChannel.onclose = function() {
						//console.log('on close channel. Use MyPeerConnection.setCloseChannel(*fonction) for redefine.');
					};
	    		}
	    	},

	    	setOnerrorchannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onerror = function(error) {
	    				ptrFunction(error);
	    			}
	    		}
	    		else {
					dataChannel.onerror = function(error) {
						//console.log('Use MyPeerConnection.setErrorChannel(*fonction) for redefine. on error channel : ' + error);
					};
	    		}
	    	},

	    	/***************************/
	    	// Send an offer to the interlocutor for begin negotiation
	    	createWebcamOffer : function() {
	    		type = 'webcam';
				// modif titi
				//connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				// remplacé par >>>
				connection.createOffer(createOfferCallback, errorCreateOffer, getVideoConstraints());
				// end modif
				webcamNegotiationNeeded = false;
	    	},

	    	createScreenOffer : function() {
				type = 'screen';
				connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				screenNegotiationNeeded = false;
	    	},

	    	createChatOffer : function() {
	    		type = 'chat';
				connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				chatNegotiationNeeded = false;
	    	},

	    	/****************************/
	    	// Add webcam to RTCPeerConnection streams
	    	addWebcam : function(stream) {
	    		webcamNegotiationNeeded = true;
	    		connection.addStream(stream);
	    	},

			// Remove webcam from RTCPeerConnection streams
	    	removeWebcam : function() {
	    		webcamNegotiationNeeded = true;
	    		connection.removeStream(myWebcamStream);
	    		myWebcamStream.stop();
	    	},

	    	// Add screen to RTCPeerConnection streams
	    	addScreen : function(stream) {
	    		screenNegotiationNeeded = true;
	    		connection.addStream(stream);
	    	},

	    	// Remove screen from RTCPeerConnection streams
	    	removeScreen : function() {
	    		screenNegotiationNeeded = true;
	    		connection.removeStream(myScreenStream);
	    		myScreenStream.stop();
	    	},

	    	/*************************/
	    	// Set remote description from negotiations initiator
	    	receiveWebcamOffer : function(description) {
	    		if ((yourWebcamStream == null || yourWebcamStream.ended) || ((interlocutorBrowser == 'Firefox' || browserName == 'Firefox') && myWebcamRtcPeerConnection != null)) {
	    			receiveWebcam = (receiveScreen == 0) ? 1 : receiveScreen++;
	    		}
				type = 'webcam';
				connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	receiveScreenOffer : function(description) {
	    		if (yourScreenStream == null || yourScreenStream.ended) {
	    			receiveScreen = (receiveWebcam == 0) ? 1 : receiveWebcam++;
	    		}
	    		type = 'screen';
	    		connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	receiveChatOffer : function(description) {
	    		type = 'chat';
	    		connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	// Add Ice candidate from interlocutor's response
	    	receiveCandidate : function(msg) {
				if (msg !== null && msg !== '' && msg.candidate !== null) {
					connection.addIceCandidate(new RTCIceCandidate({sdpMLineIndex: msg.sdpMLineIndex, candidate: msg.candidate}), addIceCandidateCallback, errorAddIceCandidate);
				}
	    	},

	    	// Set remote description from interlocutor's response
	    	receiveAnswer : function(msg) {
	    		connection.setRemoteDescription(new RTCSessionDescription(msg), answerSetRemoteDescriptionCallback, errorAnswerSetRemoteDescription);
	    	},

	    	/***********************/
	    	//	Close RTCPeerConnection
	    	closeConnection : function() {
	    		connection.close();
	    		connection = null;
	    	},

			//	Close data channel if created
	    	closeDataChannel : function() {
	    		if (dataChannel) {
	    			dataChannel.close();
	    			dataChannel = null;
	    		}
	    	},

			//	Send a message  through data channel if created
	    	sendDataChannel : function(message) {
				if (dataChannel != null) {
					dataChannel.send(message);
				}
	    	},

			//	Return the interlocutor's webcam stream and the interlocutor's screen stream if they are active
	    	getRemoteStream : function() {
	    		return connection.getRemoteStreams();
	    	},

			//	Return my webcam stream and my screen stream if they are active
	    	getLocalStream : function() {
	    		return connection.getLocalStreams();
	    	},

	    	// Caller is a boolean to know who will begin the negotiations
	    	setCaller : function(bool) {
	    		//console.log('Setting caller');
	    		caller = bool;
	    	},
		};
	}; //End of PeerConnection


	/*****************************************************
		MyPeerConnection public methods
	*****************************************************/
	var publicMethods = {};

	//	Initialize must be call.
	//		listServers is a ICE servers list uses during RTCPeerConnection creation 
	//		optionsPeerConnection is a list who contains options used during RTCPeerConnection creation
	//		SendMessage parameter is mandatory. This parameter is useful to communicate with the server
	//		ptrMyDisconnect is called when I must be disconnected
	//		ptrOtherDisconnect is called when another person was disconnected from server
	//		onError is called if an error was detected during initialization
	publicMethods.initialize = function(listServers, optionsPeerConnection, sendMessage, ptrMyDisconnect, ptrOtherDisconnect, onError) {
		console.log('initialize()');




		detectBrowser();
		if (browserName != 'Firefox' && browserName != 'Chrome' && browserName != 'Opera') {
			if (onError) {
				onError(browserName + ' is not a compatible browser.');
			}
			else {
				throw {name: 'FatalError', message: browserName + ' is not a compatible browser.'};
			}
			return ;
		}

		if (browserName == 'Firefox' && majorVersion < 30) {
			if (onError) {
				onError('Mozilla Firefox ' + majorVersion + ' is not a compatible browser. Please update to 30+.');
			}
			else {
				throw {name: 'FatalError', message: 'Mozilla Firefox ' + majorVersion + ' is not a compatible browser. Please update to 30+.'};
			}
			return ;
		}

		if (browserName == 'Chrome' && majorVersion < 36) {
			if (onError) {
				onError('Google chrome ' + majorVersion + ' is not a compatible browser. Please update to 36+.');
			}
			else {
				throw {name: 'FatalError', message: 'Google chrome ' + majorVersion + ' is not a compatible browser. Please update to 36+.'};
			}
			return ;
		}

		if (browserName == 'Opera' && majorVersion < 23) {
			if (onError) {
				onError('Opera ' + majorVersion + ' is not a compatible browser. Please update to 23+.');
			}
			else {
				throw {name: 'FatalError', message: 'Opera ' + majorVersion + ' is not a compatible browser. Please update to 23+.'};
			}
			return ;
		}

		if (sendMessage == null || typeof(sendMessage) != 'function') {
			if (onError) {
				onError('sendMessage parameter is not a function.')
			}
			else {
				throw {name: 'FatalError', message: 'sendMessage parameter is not a function.'};
			}
			return ;
		}
		
		// Note titi liste des serveurs STUN (pas de TURN???? )
		// WTF >>>>> Redondance avec le tableau peerConnectionServer !!!!!!
		// serversList = listServers || (function(){var array = new Array(); array.push({url: 'stun:stun.l.google.com:19302'});return array;}());
		serversList = listServers || (function(){
													var array = new Array(); 
													//array.push({url: 'stun:stun.l.google.com:19302'});
													array.push({url: 'stun:stun1.l.google.com:19302'});
													array.push({url: 'stun:stun2.1.google.com:19302'}); 
													array.push({url: 'stun:stun3.1.google.com:19302'});
													array.push({url: 'stun:stun4.1.google.com:19302'});
													return array;
												}());
		/**/
		debug = tool.stringObjectDump(serversList,'script. initialize() >> serversList = listServers');
		console.log(debug);

		peerConnectionOptions = optionsPeerConnection || (function(){var array = new Array(); return array;}());
		ptrSendMessage = sendMessage;
		ptrMyDisconnection = ptrMyDisconnect || function(){};
		ptrOtherDisconnection = ptrOtherDisconnect || function(){};

		if (!rtcPeerConnection && numberOfConnections == 2 && interlocutorBrowser == 'Firefox' != null && interlocutorBrowser != 'Firefox' && browserName != 'Firefox') {
			rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
			rtcPeerConnection.createConnection();
		}
	};

	//	Set pointers for all video elements
	publicMethods.setAllVideosElements = function(myWebcamElement, yourWebcamElement, myScreenElement, yourScreenElement) {
		myWebcam = myWebcamElement || null;
		yourWebcam = yourWebcamElement || null;
		myScreen = myScreenElement || null;
		yourScreen = yourScreenElement || null;
	};

	//	Set pointer ptrSendMessage
	publicMethods.setSendMessage = function(ptrFunction) {
		if (ptrFunction == null || typeof(ptrFunction) != 'function') {
			throw {name: 'FatalError', message: 'setSendMessage parameter is not a function.'};
			return ;
		}
		ptrSendMessage = ptrFunction;
	};

	//	Return my browser name
	publicMethods.getMyBrowser = function() {
		return browserName;
	};

	//	Return the browser name of the interlocutor
	publicMethods.getInterlocutorBrowser = function() {
		return interlocutorBrowser;
	};

	//	Prepare webcam sharing
	//	/!\ Verifier MyPeerConnection.initialize() ?
	publicMethods.startWebcamSharing = function(onSuccess, onError) {

		ptrOnWebcamSuccess = onSuccess || function(){};
		ptrOnWebcamError = onError || function(){};

		priorityWebcamCallback = 1; // Add webcam to queue
		(priorityScreenCallback > 0) ? priorityScreenCallback++ : null;
		(priorityChatCallback > 0) ? priorityChatCallback++ : null;

		if (numberOfConnections == 2) {
			if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') { // Dedicated connection for Firefox
				if (!myWebcamRtcPeerConnection) {
					myWebcamRtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					myWebcamRtcPeerConnection.createConnection();
					myWebcamRtcPeerConnection.setCaller(true);
				}
				ptrSendMessage('prepareOfferWebcam', '');
			}
			else {
				ptrSendMessage('prepareOfferWebcam', '');
			}
		}
	};

	//	Stop share my webcam. Does not affect interlocutor's webcam sharing.
	//	/!\ vérification dans removeWebcam() ? Appeler stopWebcamSharing sans avoir partager pour test
	publicMethods.stopWebcamSharing = function() {
		if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
			myWebcamStream.stop();
			myWebcamRtcPeerConnection.closeConnection();
			myWebcamRtcPeerConnection = null;
			ptrSendMessage('closeMyVideoPeerConnection', '');
		}
		else {
			rtcPeerConnection.removeWebcam();
		}
	};

	//	When interlocutor asks to share his webcam
	//	Must be return
	//		true if user accept to receive other webcam
	//		false if user do not want receive other webcam
	publicMethods.beforeReceiveWebcam = function(ptrFunction) {
		ptrAskingReceiveWebcam = ptrFunction || function(){return true;};
	};

	//	Prepare screen sharing
	//	/!\ Verifier MyPeerConnection.initialize() ?
	publicMethods.startScreenSharing = function(onSuccess, onError) {
		if (numberOfConnections == 2 && interlocutorBrowser != 'Firefox' && browserName != 'Firefox') { // Does not work with Firefox. /!\ Et opéra ?
			ptrOnScreenSuccess = onSuccess || function(){};
			ptrOnScreenError = onError || function(){};

			priorityScreenCallback = 1; // Add screen to queue
			(priorityWebcamCallback > 0) ? priorityWebcamCallback++ : null;
			(priorityChatCallback > 0) ? priorityChatCallback++ : null;

			ptrSendMessage('prepareOfferScreen', ''); // Ask interlocutor's authorization to receive my screen
		}
	};

	//	Stop share my screen. Does not affect interlocutor's screen sharing.
	//	/!\ Utilité de la vérification ? A faire dans removeScreen()
	publicMethods.stopScreenSharing = function() {
		if (interlocutorBrowser != 'Firefox' && browserName != 'Firefox') {
			rtcPeerConnection.removeScreen();
		}
	};

	//	When interlocutor asks to share his screen
	//	Must be return
	//		true if user accept to receive other screen
	//		false if user do not want receive other screen
	publicMethods.beforeReceiveScreen = function(ptrFunction) {
		ptrAskingReceiveScreen = ptrFunction || function(){return true;};
	};

	//	Event forwarding during connection creation with interlocutor's webcam
	publicMethods.setOnReceiveWebcam = function(onSuccess, onError) {
		ptrOnReceiveWebcamSuccess = onSuccess || function(){};
		ptrOnReceiveWebcamError = onError || function(){};
	};

	//	Event forwarding during connection creation with interlocutor's screen
	publicMethods.setOnReceiveScreen = function(onSuccess, onError) {
		ptrOnReceiveScreenSuccess = onSuccess || function(){};
		ptrOnReceiveScreenError = onError || function(){};
	};

	//	Event forwarding during data channel creation		
	publicMethods.setOnReceiveDataChannel = function(onSuccess, onError) {
		ptrOnReceiveDataChannelSuccess = onSuccess || function(){};
		ptrOnReceiveDataChannelErrror = onError || function(){};
	};

	//	Prepare to create a data channel with event forwarding after creation
	//	ptrOnMessageChannel parameter is mandatory
	//	/!\ ptrOnMessageChannel doit être verifier dans cette fonction et retourner faux si il vaut null (cohérance) 
	publicMethods.createDataChannel = function(ptrOnMessageChannel, ptrOnOpenChannel, ptrOnCloseChannel, ptrOnErrorChannel) {
		priorityChatCallback = 1; // Add data channel creation to queue
		(priorityWebcamCallback > 0) ? priorityWebcamCallback++ : null;
		(priorityScreenCallback > 0) ? priorityScreenCallback++ : null;

		// Save pointer
		ptrCreateDataChannel = {ptrOnMessageChannel:ptrOnMessageChannel, ptrOnOpenChannel:ptrOnOpenChannel, ptrOnCloseChannel:ptrOnCloseChannel, ptrOnErrorChannel:ptrOnErrorChannel};
		dataChannelWaiting = true;

		if (numberOfConnections == 2) {
			if (!rtcPeerConnection) { // /!\ On fait quoi si Firefox n'apelle pas MyPeerConnection.initialize ? test avec ptrSendMessage != null ?
				if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') { // Create connection if one of the two browsers is Firefox
					rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					rtcPeerConnection.createConnection();
				}
				else {
					if (numberOfConnections == 2) { // /!\ utilité de ce IF ?
						console.error('Please call createDataChannel after MyPeerConnection.initialize');
						return ;
					}
				}
			}
			ptrSendMessage('dataChannelWaiting', '');
		}
		else {
			doOfferDataChannel = true;
		}
	};

	//	Close data channel if open
	publicMethods.closeDataChannel = function() {
		rtcPeerConnection.closeDataChannel();
	};

	//	Send data throught data channel. CreateDataChannel method need to be called before.
	publicMethods.sendDataChannel = function(message) {
		rtcPeerConnection.sendDataChannel(message);
	};

	//	ReceiveMessage handles messages received bu the web socket server.
	publicMethods.receiveMessage = function(type, message) {
		switch(type) {
			case 'numberOfConnections' : // When type is numberOfConnections, this is means the web socket server receives a new connection. 
				//console.log('Receive new connection : ' + message);
				
        if (message == 1) { // If you are the first to log on, you wait
					doOfferDataChannel = false;
					priorityChatCallback = 0;
					numberOfConnections = message;
          //console.log('you are the first to log on, you wait...');
				}
				else if (message == 2) { // If two persons are connected, they exchange their browser.
					numberOfConnections = message;
					ptrSendMessage('interlocutorBrowser', browserName); //Send the browser name to the interlocutor.
				}

				
				if (message > 2 && numberOfConnections == 0) { // If two persons are communicating, the following persons are ignored or disconnected
					ptrMyDisconnection('Too many people on server.');
				}
				

				break;
			
      case 'interlocutorBrowser' : // When you receive the interlocutor's browser name.
				interlocutorBrowser = message; // Set interlocutor browser into variable.

				// If both browser are not Firefox, it creates only one object PeerConnection for all streams.
				if (interlocutorBrowser != 'Firefox' && browserName != 'Firefox' && !rtcPeerConnection && serversList != null && peerConnectionOptions != null) {
					rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					rtcPeerConnection.createConnection();
				}

				// If you had tried to create a data channel when you was alone or had not received the interlocutor's browser name
				if (dataChannelWaiting) {
					// If one of the two browsers is Firefox, it creates an object PeerConnection only for data channel.
					if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
						rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
						rtcPeerConnection.createConnection();
					}
					// If you are the first to offer a data channel connection.
					if (doOfferDataChannel) {
						ptrSendMessage('dataChannelWaiting', '');
						doOfferDataChannel = false;
					}
				}
				break;
			case 'prepareOfferWebcam' : // When your interlocutor offers to share his webcam
				if (ptrAskingReceiveWebcam()) { // If you are agree
					if (!yourWebcamRtcPeerConnection && (interlocutorBrowser == 'Firefox' || browserName == 'Firefox')) { // If one of the two browsers is Firefox...
						yourWebcamRtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions); // It creates a new PeerConnection object
						yourWebcamRtcPeerConnection.createConnection();
						yourWebcamRtcPeerConnection.setCaller(false);
					}			
					ptrSendMessage('waitingOfferWebcam', true); // return true to sender
				}
				else { // If you are not agree
					ptrSendMessage('waitingOfferWebcam', false); // return false to sender
				}
				break;
			case 'waitingOfferWebcam' : // Response from the other part for webcam sharing
				if (message) { // If message contains true
					getWebcam(); // Launching webcam sharing process
				}
				else { // If message contains false
					throwOnWebcamErrorCallback('Refused by interlocutor.'); // Call error function
				}
				break;
			case 'prepareOfferScreen' : // When your interlocutor offers to share his screen
				if (ptrAskingReceiveScreen()) { // Screen sharing is available just with chrome, it does not need to create a new PeerConnection object
					ptrSendMessage('waitingOfferScreen', true);
				}
				else {
					ptrSendMessage('waitingOfferScreen', false);
				}
				break;
			case 'waitingOfferScreen' : // Response from the other part for screen sharing
				if (message) { // If interlocutor is agree to receive my screen
					getScreen(); // Launching screen sharing process
				}
				else {
					throwOnScreenErrorCallback('Refused by interlocutor');
				}
				break;
			case 'webcamOffer' : // When it receives an offer from interlocutor for start negotiation to share his webcam
				if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') { // If one of the two browsers is Firefox...
					yourWebcamRtcPeerConnection.receiveWebcamOffer(message); // It creates a new PeerConnection object
				}
				else {
					rtcPeerConnection.receiveWebcamOffer(message);
				}				
				break;
			case 'screenOffer' :
				if (interlocutorBrowser != 'Firefox' && browserName != 'Firefox') { // Opera and Chrome can read screen sharing streams
					rtcPeerConnection.receiveScreenOffer(message);
				}
				break;
			case 'chatOffer' :
				rtcPeerConnection.receiveChatOffer(message);
				break;
			case 'answer' : // This is the development of negotiations
							// Opera and Chrome supports renegotiation so it does not useful to give an answer type
				rtcPeerConnection.receiveAnswer(message);
				break;
			case 'webcamAnswer' :
				myWebcamRtcPeerConnection.receiveAnswer(message);
				break;
			case 'screenAnswer' :
				myScreenRtcPeerConnection.receiveAnswer(message);
				break;
			case 'chatAnswer' :
				rtcPeerConnection.receiveAnswer(message);
				break;
			case 'candidate' : // ICE Candidates are exchanged only during the etablishment of peer-to-peer connection
								// Opera and Chrome supports renegotiation so it does not useful to give an answer type
				rtcPeerConnection.receiveCandidate(message);
				break;
			case 'mytoyourwebcamCandidate' :
				yourWebcamRtcPeerConnection.receiveCandidate(message);
				break;
			case 'yourtomywebcamCandidate' :
				myWebcamRtcPeerConnection.receiveCandidate(message);
				break;
			case 'mytoyourscreenCandidate' :
				yourScreenRtcPeerConnection.receiveCandidate(message);
				break;
			case 'yourtomyscreenCandidate' :
				myScreenRtcPeerConnection.receiveCandidate(message);
				break;
			case 'closeMyVideoPeerConnection' : // When one of the two browsers is Firefox, must close the dedicated webcam sharing object (yourWebcamRtcPeerConnection)
				yourWebcamStream = null;
				yourWebcamRtcPeerConnection.closeConnection();
				yourWebcamRtcPeerConnection = null;
				break;
			case 'dataChannelWaiting' : // Corresponds to a request to create a data channel
				if (dataChannelWaiting) { // If the request is mutual...
					dataChannelWaiting = false;
					rtcPeerConnection.createDataChannel(ptrCreateDataChannel.ptrOnMessageChannel, ptrCreateDataChannel.ptrOnOpenChannel, ptrCreateDataChannel.ptrOnCloseChannel, ptrCreateDataChannel.ptrOnErrorChannel);
					ptrSendMessage('readyForCreateDataChannel', ''); // return OK for create a data channel
				}
				break;
			case 'readyForCreateDataChannel' : // Receive authorization for data channel creation
				rtcPeerConnection.createDataChannel(ptrCreateDataChannel.ptrOnMessageChannel, ptrCreateDataChannel.ptrOnOpenChannel, ptrCreateDataChannel.ptrOnCloseChannel, ptrCreateDataChannel.ptrOnErrorChannel);
				if (browserName == 'Firefox') { // If my browser name is Firefox, it needs to launch negotiation manually
					rtcPeerConnection.createChatOffer();
				}
				dataChannelWaiting = false;
				break;
			case 'disconnection' : // When websocket server receive a disconnection, must alert other users
				if (message < 2) { // If there is only one person, it can not be communicated alone
					closeAllConnections();
					if (ptrCreateDataChannel.ptrOnMessageChannel) { // if a data channel was active, it waits for reconnection
						dataChannelWaiting = true;
					}
					ptrOtherDisconnection(); // Warn that the interlocutor is gone
				}
				break;
		}
	};

	return publicMethods;
}());