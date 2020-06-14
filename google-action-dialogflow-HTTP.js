/*****

node-red-contrib-google-actionflow - A Node Red node to handle actions from Google Actions

MIT License

Copyright (c) 2017 Orce Marinkovski

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/



module.exports = function(RED) {
    "use strict";

    const express = require('express');
	const http = require("http");
    const fs = require('fs');
    const bodyParser = require('body-parser');
    const {
        dialogflow,
        Image,
      } = require('actions-on-google');
    
    
    function GoogleActionDialogflowIn_http(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        node.url = n.url || '/';
        node.port = n.port || 8089;
        node.key = n.key || '';
        node.cert = n.cert || '';

        // Create new http server to listen for requests
        var expressApp = express();
        expressApp.use(bodyParser.json({ type: 'application/json' }));

        // Create an app instance
        var app = dialogflow({debug: true});

        app.fallback((conv, { devices, status }) => {
            console.log(conv)
            var msg = {};
            msg.conv = conv;
            return new Promise((resolve, reject) => { 
                msg.resolve=resolve;
                msg.responseType="respond";
                msg.payload="";
                node.send(msg);
            });

        });

        expressApp.use(app);

        node.httpServer = http.createServer(expressApp);
        // Start listening
        node.httpServer.listen(node.port);

        // Stop listening
        node.on('close', function(done) {
            node.httpServer.close(function(){
                done();
            });
        });

    }
    RED.nodes.registerType("google-action-dialogflow-http in",GoogleActionDialogflowIn_http);


    function GoogleActionDialogflowOut_http(n) {
        RED.nodes.createNode(this,n);
        var node = this;

        this.on("input",function(msg) {

            switch(msg.responseType){
                case 'respond':
                    msg.conv.close(msg.payload);
                    break;

                case 'ask':
                    msg.conv.ask(msg.payload);
                    break;
            }
            msg.resolve();

            // var app = appMap.get(msg.conversationId);
            
            // /*set the output context if name is defined*/
            // if(msg.Context_Out.name!==""){
            //     app.setContext(msg.Context_Out.name,msg.Context_Out.lifespan,msg.Context_Out.parameters);
            // }
            // /*set the reprompts if if set*/
            // //console.log(msg.Context_Out_Reprompts.length);
            // if(msg.Context_Out_Reprompts.length>0){
            //     msg.dialogState=msg.Context_Out_Reprompts;
            // }
            // if (app) {
            //     if (msg.closeConversation) {
            //         app.tell(msg.payload.toString());
            //         appMap.delete(msg.conversationId);
            //     } else {
            //         app.ask(msg.payload.toString(), msg.dialogState);
            //     }
            // } else {
            //     node.warn("Invalid conversation id");
            // }
        });
    }
    RED.nodes.registerType("google-action-dialogflow-http response",GoogleActionDialogflowOut_http);
}
