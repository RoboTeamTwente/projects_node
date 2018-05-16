l = console.log;

const serialport = require('serialport');
const portPath = '/dev/serial/by-id/usb-STMicroelectronics_STM32_Virtual_ComPort_00000000001A-if00'

counter=0;

l("Trying to open serial port..")
let port = new serialport(portPath, err => {
	if(err)
		l(err.message);
});

let i = 0;
let start = Date.now();

let received = false;

port.on('open', () => {
	l('Opened', portPath);

	function sendFakePacket(){
		if(!received){
			setTimeout(sendFakePacket, 10);
			// l("...");
			return;
		}
		received = false;

		let buf = createFakePacket();
		// l()
		// l(buf)
		
		port.write(buf, err => {
			l("messages per second : " + (i/((Date.now()-start)/1000)).toFixed(2));
			if(err)	l("Write Error:", err)
			setTimeout(sendFakePacket, 100);
		})

	};

	let buf = createFakePacket();
	port.write(buf, err => {
		l("messages per second : " + (i/((Date.now()-start)/1000)).toFixed(2));
		if(err)	l("Write Error:", err)
		setTimeout(sendFakePacket, 50);
	})

})

let hexStr = "";
let totalReceived = 0;

port.on('data', buffer => {
	
	let str = buffer.toString()
	totalReceived += str.length / 2;
	hexStr += str;
	let start = hexStr.lastIndexOf('\n');

	if(start > 0){
		i++;
		received = true;

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

	buffer[0] = (id << 3);

	for(let i = 1; i < size; i++)
		buffer[i] = counter// + i;

	buffer[5] = 1 << 3;

	counter++;
	return buffer
}