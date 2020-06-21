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
    const bodyParser = require('body-parser');
    const {
        dialogflow,
        Image,
      } = require('actions-on-google');
    var outputNodes=[];
    var httpServer=null;
    
    const InputNodeHasProcessed = (conv) => {
        return new Promise((resolve,reject)=>{
            let msg={};
            msg.responseType = "respond";
            const matchedNode = outputNodes.filter(oN => oN.intent===conv.intent);
            if (!matchedNode.length){
                msg.payload=`Intent [${conv.intent}] is not supported`;
                resolve(msg);
            }else{
                msg.payload = "";
                msg.conv=conv;
                msg.resolve=resolve;
                matchedNode[0].send(msg);
            }

        })
    };

    // setup DialogFlow app
    const appDialogflow = dialogflow({ debug: true });
        appDialogflow.fallback(async(conv, params,userRequest) => {
            const msgFromInputNode = await InputNodeHasProcessed(conv);
            switch(msgFromInputNode.responseType){
                case 'respond':
                    conv.close(msgFromInputNode.payload);
                    break;

                case 'ask':
                    conv.ask(msgFromInputNode.payload);
                    break;
            }

        });
        appDialogflow.catch((conv, error) => {
            console.error(error);
            conv.ask('I encountered a glitch. Can you say that again?');
        });

    // setup express
    const appExpress = express();
        appExpress.use(bodyParser.json({ type: 'application/json' }));
        appExpress.use(appDialogflow);

 
       
    function DialogFlowListenerConfig(n){
        RED.nodes.createNode(this,n);
        var node = this;
        outputNodes=[];
        this.name = n.name;
        this.port = n.port;
        console.log(`config-updated for [${this.name}] - applying to server`);

        if(null==httpServer){
            console.log(`starting server [${this.name}] on port [${this.port}]`);
            httpServer = http.createServer(appExpress);
            httpServer.listen(this.port,'0.0.0.0');

        }else{
            console.log(`re-starting server [${this.name}] on port [${this.port}]`);
            httpServer.close(function(){
                httpServer = http.createServer(appExpress);
                httpServer.listen(this.port,'0.0.0.0');
            }.bind(this));
        }
     

    }
    RED.nodes.registerType("dialog-flow-listener-config",DialogFlowListenerConfig);

    function GoogleActionDialogflowIn_http(n) {
        RED.nodes.createNode(this,n);

        this.intent=n.intent;
        this.listener = RED.nodes.getNode(n.listener);
        outputNodes.push(this);

    }
    RED.nodes.registerType("google-action-dialogflow-http in",GoogleActionDialogflowIn_http);

    function GoogleActionDialogflowOut_http(n) {
        RED.nodes.createNode(this,n);

        this.on("input",function(msg) {
            msg.resolve(msg);

        });

    }
    RED.nodes.registerType("google-action-dialogflow-http response",GoogleActionDialogflowOut_http);
}
