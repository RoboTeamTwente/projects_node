l = console.log;

const SERVER_PORT = 3000;
const IO_PORT = 3001;

let io = require('socket.io')();
let express = require('express');
let path = require('path');
let _ = require('lodash');

let Wave = require('./WaveGenerator.js');

let app = express();
let server = require('http').createServer(app);
app.use(express.static(path.join(__dirname, 'public')));



let wave1 = new Wave.Wave(0);
let wave2 = new Wave.Wave(1);
let wave3 = new Wave.Wave(2);

function waveCallback(values){
	io.sockets.emit('tick', values)
}

const waveManager = new Wave.WaveManager(waveCallback, 20);
waveManager.addWave(wave1);
waveManager.addWave(wave2);
waveManager.addWave(wave3);


function updateClients(){
	io.sockets.emit('status', waveManager.getStatus())
    io.sockets.emit('settings', waveManager.getWavesSettings());
}


io.on('connection', function(socket){
    l("Client connected");

    socket.emit('status', waveManager.getStatus());
    socket.emit('settings', waveManager.getWavesSettings());

    // Received wave settings
    socket.on('settings', function(settings){
		let wave = new Wave.Wave(settings.id, settings.wave, settings.frequency, settings.amplitude, settings.offset);
        waveManager.addWave(wave, settings.id)

		updateClients()
    })

	// Received control messages
	socket.on('control', function(control){
		if(control.running) waveManager.start();
		else			    waveManager.stop();

        updateClients()
	})
});


server.listen(SERVER_PORT, () => {
    l("Server listening at", SERVER_PORT);

    io.listen(3001);
    l("IO listening at", IO_PORT);
});