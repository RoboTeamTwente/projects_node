let l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;

let io      = require('socket.io')();
let express = require('express');
let path    = require('path');
let _       = require('lodash');


// ==== ROS ==== //
let ros     = require('rosnodejs');
let msgs_list = ros.getAvailableMessagePackages();
let roboteam_msgs = require(msgs_list.roboteam_msgs);
let robotCommand = new roboteam_msgs.msg.RobotCommand();
let pub = null;
let rosNode = null;
ros.initNode('/jsNode').then(_rosNode => {
    l("ROS initialized");

    rosNode = _rosNode;
    pub = rosNode.advertise('/robotcommands', roboteam_msgs.msg.RobotCommand);
    STATE.ros = true;
    updateState();

});
// ============= //


let STATE = {};

let NCLIENTS = 0;
let KICK = false;
let CHIP = false;

let Wave = require('./WaveGenerator.js');
const waveManager = new Wave.WaveManager(waveCallback, 50);

function waveCallback(values){
	io.sockets.emit('tick', values);

	if(STATE.ros) {
        robotCommand.id = STATE.robot_id;

        // X and Y velocity
        if(STATE.mode === "cartesian"){
            robotCommand.x_vel = values[0];
            robotCommand.y_vel = values[1];
        }else
        if(STATE.mode === "polar"){
            let rho = values[0];
            let theta = values[1];

            let x = rho * Math.cos(theta);
            let y = rho * Math.sin(theta);

            robotCommand.x_vel = x;
            robotCommand.y_vel = y;
        }
        // Rotational velocity
        robotCommand.w = values[2];

        robotCommand.kicker = KICK;
        robotCommand.kicker_vel = KICK * 3;
        KICK = false;

        robotCommand.chipper = CHIP;
        robotCommand.chipper_vel = CHIP * 3;
        CHIP = false;

        pub.publish(robotCommand);
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

    let state = {
        robot_id : 0,
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

function sendState(socket){
    l("[Socket] Emitting state to client");
    socket.emit('state', STATE);
}
function broadcastState(){
    l("[Socket] Broadcasting state to all clients");
    io.sockets.emit('state', STATE);
}

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

    // Send state to socket
    sendState(socket);

    // Received wave settings
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

let app = express();
let server = require('http').createServer(app);
app.use(express.static(path.join(__dirname, 'public')));

server.listen(SERVER_PORT, () => {
    l("Server listening at", SERVER_PORT);
    io.listen(3001);
    l("IO listening at", IO_PORT);
});

// ==== Helper functions ==== //
function isEqual(obj1, obj2){
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}