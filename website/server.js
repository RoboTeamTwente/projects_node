l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;
let ROS_RUNNING = false;

let io      = require('socket.io')();
let express = require('express');
let path    = require('path');
let _       = require('lodash');
let ros     = require('rosnodejs');

let msgs_list = ros.getAvailableMessagePackages();
let roboteam_msgs = require(msgs_list.roboteam_msgs);
let robotCommand = new roboteam_msgs.msg.RobotCommand();
let pub = null;
let rosNode = null;
ros.initNode('/jsNode').then(_rosNode => {
    rosNode = _rosNode;
    pub = rosNode.advertise('/robotcommands', roboteam_msgs.msg.RobotCommand);
    ROS_RUNNING = true;
    l("ROS initialized");

    updateClients();
});

let STATE = {}

let NCLIENTS = 0;
let ROBOT_ID = 0;
let KICK = false;

let Wave = require('./WaveGenerator.js');
const waveManager = new Wave.WaveManager(waveCallback, 10);

function waveCallback(values){
	io.sockets.emit('tick', values);

	if(ROS_RUNNING) {
        robotCommand.id = ROBOT_ID;
        robotCommand.x_vel = values[0];
        robotCommand.y_vel = values[1];
        robotCommand.w = values[2];

        if(KICK){
            robotCommand.kicker = true;
            robotCommand.kicker_vel = 3;
        }else{
            robotCommand.kicker = false;
            robotCommand.kicker_vel = 0;
        }
        KICK = false;

        pub.publish(robotCommand);
    }
}

function initializeState(){
    let state = {
        robot_id : 0,
        ros : false,
        waveManager : {
            running : false,
            waves : [
            ]
        }
    };
    for(let i = 0; i < 3; i++){
        state.waveManager.waves.push({
            id : i,
            waveName : Wave.Waves.Constant,
            frequency : 1000,
            amplitude : 1,
            offset : 0
        })
    }
    return state;
}

// waveManager.addWave(wave1);
// waveManager.addWave(wave2);
// waveManager.addWave(wave3);

/* settings :
*   3 waves : waveManager.getWaveSettings()
*   waveManager : running?
*   robot_id
*   ros_running
*   mode : cartesian / polar
*
*
* */


function updateClients(){
    io.sockets.emit('state', STATE);
}

function handleNewState(state){
    l("Handling new state")

    if(state.waveManager.running) waveManager.start()
    else waveManager.stop()

    STATE = state

    waveManager.removeWaves();
    _.each(state['waveManager'].waves, (wave, i) => waveManager.addWave(wave, i))    
    io.sockets.emit('state', STATE);   

}


io.on('connection', function(socket){
    l("Client connected");
    NCLIENTS++;

    updateClients();
    // return

    // socket.emit('status', waveManager.getStatus());
    // socket.emit('settings', waveManager.getWavesSettings());
    // socket.emit('robot_id', ROBOT_ID);
    // socket.emit('ros_running', ROS_RUNNING);

    // Received wave settings
    socket.on('state', function(state){
        l('New state received!')
        l(JSON.stringify(state, null, 4))

        handleNewState(state);

		// let wave = new Wave.Wave(
		// 	parseInt(settings.id),
  //           settings.wave,
  //           parseInt(settings.frequency),
  //           parseFloat(settings.amplitude),
  //           parseFloat(settings.offset)
		// );
  //       waveManager.addWave(wave, parseInt(settings.id));

		// updateClients()
    });

    socket.on('robot_id', function(robot_id){
        ROBOT_ID = robot_id;

        updateClients();
    });

	// Received control messages
	socket.on('control', function(control){
		if(control.running) waveManager.start();
		else			    waveManager.stop();

        updateClients();
	})

    socket.on('kick', function(){
        console.log("Kick command received!")
        KICK = true;
    })

    socket.on('disconnect', function(){
        l("Client disconnected");
        NCLIENTS--;

        if(!NCLIENTS){
            waveManager.stop();
        }
    });

});

STATE = initializeState();
l("\n")
l(JSON.stringify(STATE, null, 4))
l("\n")
handleNewState(STATE)

// ==== SERVER STUFF ==== //

let app = express();
let server = require('http').createServer(app);
app.use(express.static(path.join(__dirname, 'public')));

server.listen(SERVER_PORT, () => {
    l("Server listening at", SERVER_PORT);

    io.listen(3001);
    l("IO listening at", IO_PORT);
});