l = console.log;

const serialport = require('serialport');
const portPath = '/dev/serial/by-id/usb-STMicroelectronics_STM32_Virtual_ComPort_00000000001A-if00'

let port = new serialport(portPath, err => {
	if(err)
		l(err.message);
});

port.on('open', () => {
	l('Opened', portPath);

	setInterval(function(){
		let buf = createFakePacket();
		l()
		l(buf)
		port.write(buf, err => {
			
			if(err)
				l("Write Error:", err)
		})
	}, 1000)

})

let hexStr = "";
let totalReceived = 0;

port.on('data', buffer => {
	
	let str = buffer.toString()
	totalReceived += str.length / 2;
	hexStr += str;
	let start = hexStr.lastIndexOf('\n');

	if(start > 0){
		let msg = hexStr.slice(0, start);
		hexStr = hexStr.slice(start);

		l(totalReceived + " : " + msg.length)
		l(msg.slice(1))
	}

})



function createFakePacket(){
	const size = 13;
	const id = 10;

	const buffer = Buffer.alloc(size);

	for(let i = 0; i < size; i++)
		buffer[i] = (id << 3)// + i;

	return buffer
}