l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;
let ROS_RUNNING = false;

let io = require('socket.io')();
let express = require('express');
let path = require('path');
let _ = require('lodash');
let ros = require('rosnodejs');

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

let NCLIENTS = 0;
let ROBOT_ID = 0;
let KICK = false;


let Wave = require('./WaveGenerator.js');

let app = express();
let server = require('http').createServer(app);
app.use(express.static(path.join(__dirname, 'public')));



let wave1 = new Wave.Wave(0);
let wave2 = new Wave.Wave(1);
let wave3 = new Wave.Wave(2);

function waveCallback(values){
	io.sockets.emit('tick', values);

	if(ROS_RUNNING) {
        robotCommand.id = ROBOT_ID;
        robotCommand.x_vel = values[0];
        robotCommand.y_vel = values[1];
        robotCommand.w = values[2];

        robotCommand.kicker = KICK;
        robotCommand.kicker_vel = 3 * KICK;

        KICK = false;

        pub.publish(robotCommand);
    }
}

const waveManager = new Wave.WaveManager(waveCallback, 50);
waveManager.addWave(wave1);
waveManager.addWave(wave2);
waveManager.addWave(wave3);


function updateClients(){
	io.sockets.emit('status', waveManager.getStatus());
    io.sockets.emit('settings', waveManager.getWavesSettings());
	io.sockets.emit('robot_id', ROBOT_ID);
	io.sockets.emit('ros_running', ROS_RUNNING);
}


io.on('connection', function(socket){
    l("Client connected");
    NCLIENTS++;

    socket.emit('status', waveManager.getStatus());
    socket.emit('settings', waveManager.getWavesSettings());
    socket.emit('robot_id', ROBOT_ID);
    socket.emit('ros_running', ROS_RUNNING);

    // Received wave settings
    socket.on('settings', function(settings){
		let wave = new Wave.Wave(
			parseInt(settings.id),
            settings.wave,
            parseInt(settings.frequency),
            parseFloat(settings.amplitude),
            parseFloat(settings.offset)
		);
        waveManager.addWave(wave, parseInt(settings.id));

		updateClients()
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


server.listen(SERVER_PORT, () => {
    l("Server listening at", SERVER_PORT);

    io.listen(3001);
    l("IO listening at", IO_PORT);
});