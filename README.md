This is a fork from the [node-red-contrib-google-actionflow]. The main difference is that this node works with a non secured http web server.

To use this node you must run a [central https server], and in my case i use a [nginx] as a server. 
The main advantage running this mode is to have a central gateway for each https request entering your private network !!

Here a configuration sample file for running the nginx https server:

			server {
				listen 80;
				server_name [url sever];

				location / {
				rewrite ^(.*) https://[url sever] permanent;
				}   
			}


			#--------------------------------------
			# HTTPS server listening on port 443
			#----------------------------------------
			server {
				listen 443 ssl;
				server_name [url sever];

				# Enable HSTS
				add_header Strict-Transport-Security "max-age=31536000; includeSubdomains";

				# Do not allow this site to be displayed in iframes
				add_header X-Frame-Options DENY;

				# Do not permit Content-Type sniffing.
				add_header X-Content-Type-Options nosniff;

				keepalive_timeout 70;


					root [path to webserver folder];
					index index.php index.html index.htm;

					ssl on;
					ssl_certificate [path to .pem certificate file];
					ssl_certificate_key [path to .pem privatekey file];
					ssl_dhparam [path to .pem dhparam file];
					ssl_session_cache shared:SSL:10m;
					ssl_session_timeout 5m;
					ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
					ssl_ciphers HIGH:!aNULL:!MD5; 
					ssl_prefer_server_ciphers on;


				location / {
					proxy_pass    http://[ip address of node-red-contrib-google-actionflow-http]:8089/;
				}
			}

Here is a link to a good tutorial for setup of a HTTPS Webserver using a RPI http://web-privacy-security.blogspot.lu/2018/01/setting-up-reasonably-secure-home-web.html			


Node Red nodes to receive and respond to Google Action requests from Google Assistant based on actionflow.

Google Assistant is Google's personal assistant that provides the voice recognition and natural language processing behind Google's Android and Home devices.  Google Actions allow you to build conversational agents that interact with the user using a query-response conversation style.

This node is a wrapper around Google's [actions-on-google-nodejs](https://github.com/actions-on-google/actions-on-google-nodejs) client library using the [Actions SDK](https://developers.google.com/actions/reference/nodejs/ActionsSdkApp).

The node runs an Express web server to listen for Action request from Google.  By using a separate web server from Node Red, it allows the node to listen on a different port.  This allows the Action listener to be exposed to the Internet without having the rest of Node Red also exposed.  The web server is required to run HTTPS so you will need SSL certificates. Self signed certificates are OK.

Action requests are received by the Google Action input node and converted into a message.  The message contains some metadata about the conversation and the raw text of the user's input.  State data about the conversation can be passed back and forward to track the state of the conversation.

Once the request has been process, the response is passed to the Google Action Response node which returns it to Google Assistant for delivery to the user.  The response message is contained in msg.payload either as plain text or [Speech Synthesis Markup Language (SSML)](https://developers.google.com/actions/reference/ssml).

A response can either complete the processing of the action or can request further information from the user.

The [action.json](https://github.com/DeanCording/node-red-contrib-google-action/blob/master/action.json) file is used to configure your app on Google Assistant.  The main thing you will need to change is the url of your Node Red server.

To deploy your app, you will need an account on [Google Actions](https://developers.google.com/actions/).  Create a new Dialogflow project in the console and correctly set webhooks.

Be aware that Google Assistant isn't really intended to run private apps.  It is possible to have a private app by keeping your app in test mode perpetually.  One of the difficulties though is that Google requires your app to have a unique name from any other app published by anyone else and you can't use any registered brand name.

Also be aware that there is no security mechanism in this implementation yet.  Google uses [OAuth2.0](https://developers.google.com/actions/identity/oauth2-code-flow) to authorise users to access your end point.  It will be added in a future release (or send me a pull request :-).

Update Log:

Version 0.5.5:
 - now it's possible to add a context to a response(question to the user). The output context variable is predefined at "msg" level like 
   Context_Out : {name:"",lifespan:100,parameters:""} as default parameters.
   If the name is "" then no output context will be set.
 
 - When asking the user for further details you were able to do this by setting the flag "closeConversation" to true (This flag is at "msg" level.). So you were able to ask
   the user for further details but without the possibility to define a re-prompt. This is mandatory when asking the user for more details to avoid leaving the mic open without the user awareness. You can add up to 3 re-prompts like this: 
			
			msg.Context_Out_Reprompts[0]="Can you repeat?"
		or 
			msg.Context_Out_Reprompts=["Can you please repeat?","How please ?","What did you say?"]
 
 
# node-red-contrib-google-actionflow-http