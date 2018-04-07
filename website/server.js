l = console.log

const SERVER_PORT = 3000
const IO_PORT = 3001

let io = require('socket.io')();
let express = require('express')
let path = require('path')

let app = express()
let server = require('http').createServer(app)

app.use(express.static(path.join(__dirname, 'public')))

server.listen(SERVER_PORT, () => {
	l("Server listening at", SERVER_PORT)

	io.listen(3001)
	l("IO listening at", IO_PORT)

})


io.on('connection', function(client){

});