let l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;

let io      = require('socket.io')();
let express = require('express');
let path    = require('path');
let _       = require('lodash');
let zmq 	= require('zeromq')
let protobuf= require("protobufjs");

// subber.js
let sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:5559');
console.log('Worker connected to port 3000');

RTT_ROOT = process.env.RTT_ROOT || "/home/emiel/Desktop/roboteam/"
ROBOT_COMMAND_FILE = path.join(RTT_ROOT, "roboteam_suite", "roboteam_proto", "proto", "RobotCommand.proto")

protobuf.load(ROBOT_COMMAND_FILE, function(err, _root){
    
    RobotCommand = _root.lookupType("roboteam_proto.RobotCommand")

    sock.on('message', function(msg){
        wer = RobotCommand.decode(msg)
        l(wer)
    });

})



