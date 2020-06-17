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
    var inputNodes=[];
    var httpServer=null;
    

    function setupExpressApp() {
        var expressApp = express();
        expressApp.use(bodyParser.json({ type: 'application/json' }));

        // Create an app instance
        var app = dialogflow({ debug: true });

        app.fallback((conv, { devices, status }) => {
            console.log(conv);
            var msg = {};
            msg.conv = conv;
            return new Promise((resolve, reject) => {
                inputNodes.forEach(node => {
                    if (conv.intent===node.intent){
                        msg.resolve = resolve;
                        msg.responseType = "respond";
                        msg.payload = "";
                        node.send(msg);
                    }
                })

            });

        });

        expressApp.use(app);
        return expressApp;
    }
    
    
    function DialogFlowListenerConfig(n){
        RED.nodes.createNode(this,n);
        var node = this;
        inputNodes=[];
        this.name = n.name;
        this.port = n.port;

        if(null==httpServer){
            var expressApp = setupExpressApp();
            httpServer = http.createServer(expressApp);
            httpServer.listen(this.port);

        }else{
            httpServer.close(function(){
                var expressApp = setupExpressApp();
                httpServer = http.createServer(expressApp);
                httpServer.listen(this.port);
            }.bind(this));
        }
     

    }
    RED.nodes.registerType("dialog-flow-listener-config",DialogFlowListenerConfig);

    function GoogleActionDialogflowIn_http(n) {
        RED.nodes.createNode(this,n);
        this.intent=n.intent;
        inputNodes.push(this);

        //Validate config node
         var config = RED.nodes.getNode(n.listener);


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

        });
    }
    RED.nodes.registerType("google-action-dialogflow-http response",GoogleActionDialogflowOut_http);
}
