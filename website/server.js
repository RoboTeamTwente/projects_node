let l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;

let io      = require('socket.io')();
let express = require('express');
let path    = require('path');
let _       = require('lodash');
let zmq 	= require('zeromq')
let protobuf= require("protobufjs");

let STATE = {};

// ==== ROS ==== //
// let ros     = require('rosnodejs');
// let msgs_list = ros.getAvailableMessagePackages();
// let roboteam_msgs = require(msgs_list.roboteam_msgs);
// let pub = null;
// let rosNode = null;

// ros.initNode('/jsNode').then(_rosNode => {
//     l("ROS initialized");
//     rosNode = _rosNode;
//     pub = rosNode.advertise('/robotcommands', roboteam_msgs.msg.RobotCommand, {queueSize : 16});
//     STATE.ros = true;
//     updateState();
// });
// ============= //

// ==== ZeroMQ ==== //
let sock = zmq.socket("push")
sock.bindSync("tcp://127.0.0.1:5559");

RTT_ROOT = process.env.RTT_ROOT || "/home/emiel/Desktop/roboteam/"
ROBOT_COMMAND_FILE = path.join(RTT_ROOT, "roboteam_suite", "roboteam_proto", "proto", "RobotCommand.proto")

RobotCommand = null


// 	payload = {
// 		"id" : 1,
// 		"active" : true,
// 		"vel" : 0.1,
// 		"w" : 0.1,
// 		"use_angle" : true,
// 		"dribbler" : false,
// 		"kicker" : false,
// 		"chipper" : true,
	    
// 	    "chip_kick_forced" : true,
//     	"chip_kick_vel" : 3,
//     	"geneva_state" : 3
// 	}
// 	let msg = RobotCommand.create(payload)
// 	l(msg)


// })

let NCLIENTS = 0;
let KICK = false;
let CHIP = false;

let Wave = require('./WaveGenerator.js');
const waveManager = new Wave.WaveManager(waveCallback, 10);

function waveCallback(values){
	io.sockets.emit('tick', values);

	l('tick')

	payload = {
		"id" : 1,
		"active" : true,
		"vel" : {
			"x" : 0.1,
			"y" : 0.1,
		},
		"w" : 0.1,
		"use_angle" : true,
		"dribbler" : false,
		"kicker" : false,
		"chipper" : true,
	    
	    "chip_kick_forced" : true,
    	"chip_kick_vel" : 3,
    	"geneva_state" : 3
	}

	if(STATE.ros) {
        
        let cmd = {}

    	// let x, y = [values[0], values[1]]
    	// r = Math.sqrt(x*x + y*y)
    	// theta = Math.tanh(x / y)
    	// payload['vel'] = r
     	// payload['w'] = theta

        // X and Y velocity
        if(STATE.mode === "cartesian"){
            cmd.x_vel = values[0];
            cmd.y_vel = values[1];

            payload['vel']['x'] = values[0]
            payload['vel']['y'] = values[1]
        }else
        if(STATE.mode === "polar"){
            let rho = values[0];
            let theta = values[1];

            let x = rho * Math.cos(theta);
            let y = rho * Math.sin(theta);

            cmd.x_vel = x;
            cmd.y_vel = y;

            payload['vel']['x'] = x
            payload['vel']['y'] = y
        }
        // Rotational velocity
        cmd.w = values[2];
        cmd.use_angle = true;

        payload['w'] = values[2]
        payload['use_angle'] = true;

        cmd.kicker = KICK;
        cmd.kicker_forced = KICK;
        cmd.kicker_vel = 3 * KICK;

        payload['kicker'] = KICK;
        payload['chipper'] = CHIP;

        payload['chip_kick_forced'] = KICK || CHIP;
        payload['chip_kick_vel'] = 3 * (KICK || CHIP);

        cmd.chipper = CHIP;
        cmd.chipper_vel = CHIP * 3;

        KICK = false;
        CHIP = false;
              

        // for(let iRobot = 0; iRobot < 16; iRobot++){
        //     if(STATE.robots[iRobot]){
        //         cmd.id = iRobot;
        //         // pub.publish(new roboteam_msgs.msg.RobotCommand(cmd));
        //     }
        // }
        msg = RobotCommand.encode(payload).finish()
        l(msg)

        sock.send(msg)
    }
}

function initializeState(){
    l("[State] Initializing new state")

    // add three new waves
    waveManager.removeWaves();
    for(let i = 0; i < 3; i++){
        waveManager.addWave({
            id : i,
            wave : Wave.Waves.Constant,
            frequency : 1000,
            amplitude : 1,
            offset : 0
        })
    }

    let robots = []
    for(let i = 0; i < 16; i++)
        robots[i] = false

    let state = {
        robots,
        ros : false,
        waveManager : waveManager.getState(),
        mode : "cartesian"
    };

    // l(JSON.stringify(state, null, 4))

    return state;
}

function updateState(){
    handleNewState(STATE);
}

/* Sends state to a single socket */
function sendState(socket){
    l("[Socket] Emitting state to client");
    socket.emit('state', STATE);
}
/* Sends state to all sockets */
function broadcastState(){
    l("[Socket] Broadcasting state to all clients");
    io.sockets.emit('state', STATE);
}

/* Handles a new state received from a socket */
/* 1. Updates its own state */
/* 2. Broadcasts is own updated state */
function handleNewState(state){

    l("\n[State] Handling new state");

    let findDifferences = (o1, o2, keys=[]) => {
        _.each(o1, (v, k) => {
            if(typeof v === "object"){
                findDifferences(o1[k], o2[k], [...keys, k]);
            } else {
                if(o1[k] !== o2[k]){
                    l(`[State] ${[...keys, k].join(".")} : ${o1[k]} -> ${o2[k]}`);
                }
            }
        })
    };
    findDifferences(STATE, state);

    if(STATE.waveManager) {
        // Start / stop waveManager
        if (state.waveManager.running) waveManager.start();
        else waveManager.stop();

        // Check if waves have changed
        if (!isEqual(STATE.waveManager.waves, state.waveManager.waves)) {
            // Remove current waves
            waveManager.removeWaves();

            // Initialize new waves
            _.each(state["waveManager"]["waves"], (wave, i) => waveManager.addWave(wave, i));
        }
    }


    // Store new state
    STATE = state;

    // Broadcast new state to all clients
    broadcastState();
}

// ==== SOCKET HANDLERS ==== //
io.on('connection', function(socket){
    l("\n\nClient connected");
    NCLIENTS++;

    // Send state to newly connected socket
    sendState(socket);

    // Received new state from socket
    socket.on('state', function(state){
        l('[Socket] New state received!');
        // l(JSON.stringify(state, null, 4));
        handleNewState(state);
    });

    socket.on('kick', function(){
        console.log("[Socket] Kick command received!");
        KICK = true;
    });
    socket.on('chip', function(){
        console.log("[Socket] Chip command received!");
        CHIP = true;
    });

    socket.on('disconnect', function(){
        l("[Socket] Client disconnected");
        NCLIENTS--;
        if(!NCLIENTS){
            l("[Socket] No more clients, stopping waveManager");
            waveManager.stop();
        }
    });
});

handleNewState(initializeState());

// ==== SERVER STUFF ==== //


(async function(){
	l("\n[Main] Starting up services...")
	
	let app = express();
	let server = require('http').createServer(app);
	app.use(express.static(path.join(__dirname, 'public')));

	/* Load the RobotCommand msg from RobotCommand.proto */
	_root = await protobuf.load(ROBOT_COMMAND_FILE)
	RobotCommand = _root.lookupType("roboteam_proto.RobotCommand")
	l("[Main] RobotCommand loaded");

	await server.listen(SERVER_PORT)
	l("[Main] Server listening at", SERVER_PORT);
    await io.listen(3001);
    l("[Main] IO listening at", IO_PORT);

    STATE.ros = true
    updateState()

})().catch(function(err){
	l("[Main] Error occured on initialization :", err.message)
	process.exit()
})




// ==== Helper functions ==== //
function isEqual(obj1, obj2){
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}