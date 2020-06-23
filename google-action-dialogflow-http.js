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
    const natural = require('natural');
    const nounInflector = new natural.NounInflector();
    const jsonata = require("jsonata");
    
    const {
        dialogflow,
        Image,
        Permission,
      } = require('actions-on-google');
    var outputNodes=[];
    var httpServer=null;
    
    const InputNodeHasProcessed = (conv) => {
        let msg={};
        setConvParamsInSingularAndPlural(msg,conv);

        return new Promise((resolve,reject)=>{
            

            if(msg.responseType===undefined){
                msg.responseType = "respond";

            }
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

    // function testSignIn(conv){
    //     const permissions = ['NAME'];
    //     let context = 'To address you by name';
    //     // Location permissions only work for verified users
    //     // https://developers.google.com/actions/assistant/guest-users
    //     if (conv.user.verification === 'VERIFIED') {
    //       // Could use DEVICE_COARSE_LOCATION instead for city, zip code
    //       permissions.push('DEVICE_PRECISE_LOCATION');
    //       context += ' and know your location';
    //     }
    //     const options = {
    //       context,
    //       permissions,
    //     };
    //     conv.ask(new Permission(options));
    // }


    // setup DialogFlow app
    const appDialogflow = dialogflow({ 
        debug: false
     });
        appDialogflow.fallback(async(conv, params,userRequest) => {
            const msgFromInputNode = await InputNodeHasProcessed(conv);
            switch(msgFromInputNode.responseType){
                case 'respond':
                    conv.close(msgFromInputNode.payload);
                    break;

                case 'ask':
                    conv.ask(msgFromInputNode.payload);
                    break;
                // case 'signIn':
                //     testSignIn(conv);
            }

        });
        appDialogflow.catch((conv, error) => {
            console.error(error);
            conv.ask('I encountered a glitch. Can you say that again?');
        });
        
        // appDialogflow.intent('Permission', (conv) => {
        //     const permissions = ['NAME'];
        //     let context = 'To address you by name';
        //     // Location permissions only work for verified users
        //     // https://developers.google.com/actions/assistant/guest-users
        //     if (conv.user.verification === 'VERIFIED') {
        //       // Could use DEVICE_COARSE_LOCATION instead for city, zip code
        //       permissions.push('DEVICE_PRECISE_LOCATION');
        //       context += ' and know your location';
        //     }
        //     const options = {
        //       context,
        //       permissions,
        //     };
        //     conv.ask(new Permission(options));
        //   });

        // appDialogflow.intent('Permission Handler', (conv, params, confirmationGranted) => {
        //     // Also, can access latitude and longitude
        //     // const { latitude, longitude } = location.coordinates;
        //     const {location} = conv.device;
        //     const {name} = conv.user;
        //     if (confirmationGranted && name && location) {
        //       conv.ask(`Okay ${name.display}, I see you're at ` +
        //         `${location.formattedAddress}`);
        //     } else {
        //       conv.ask(`Looks like I can't get your information.`);
        //     }
        //     conv.ask(`Would you like to try another helper?`);
        //     conv.ask(new Suggestions([
        //       'Confirmation',
        //       'DateTime',
        //       'Place',
        //     ]));
        //   });

    // setup express
    const appExpress = express();
        appExpress.use(bodyParser.json({ type: 'application/json' }));
        appExpress.use(appDialogflow);


    function setConvParamsInSingularAndPlural(msg, conv) {
        msg.parameters = {};
        msg.parameters.singular = {};
        msg.parameters.plural = {};
        const arrayParamsKey = jsonata("$keys(parameters)").evaluate(conv);
        const arrayParamsValue = arrayParamsKey.map(key => jsonata("$lookup(parameters,'" + key + "')").evaluate(conv));
        const arrayParamsValueSingular = arrayParamsValue.map(value => nounInflector.singularize(value));
        const arrayParamsValuePlural = arrayParamsValueSingular.map(value => nounInflector.pluralize(value));
    
        for (let itr = 0; itr < arrayParamsKey.length; itr++) {
            msg.parameters.singular[arrayParamsKey[itr]] = arrayParamsValueSingular[itr];
            msg.parameters.plural[arrayParamsKey[itr]] = arrayParamsValuePlural[itr];
        }
    }
       
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


