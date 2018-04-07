l = console.log
_ = require('lodash')
execSync = require('child_process').execSync
exec = require('child_process').exec
let len = (str = "", size = str.length, char = ' ') => (str + Array(500).join(char)).substr(0, size)

l("packetTester.js")

function runCmd(i, args){
	return new Promise((resolve, reject) => {
		exec(`rosrun roboteam_robothub packet_tester ${args}`, {encoding : "utf-8"}, (err, output) => {
			output = output.split("###\n")
			let cmd = output[1].replace(/ /g, "").split("\n").slice(0, -1)
			cmd = _.zipObject(..._.zip(..._.map(cmd, c => c.split(':'))))

			let llrc  = output[2].replace(/ /g, "").split("\n").slice(0, -1)
			llrc = _.zipObject(..._.zip(..._.map(llrc, c => c.split(':'))))

			let bytes = output[3].replace(/ /g, "").split("\n").slice(0, -1)

			resolve({cmd, llrc, bytes});
		})
	})
}


let promises;

// ==== Test ID ==== //
// promises = _.map(_.range(16), i => runCmd(i, `${i} 0 0 0 0 0 0 0 0 0 0 0 0`))
// Promise.all(promises).then(values => {
// 	l("\nid")
// 	_.each(values, v => {
// 		l(len(v.cmd.id, 3), len(v.llrc.id, 3), v.bytes[0])
// 	})
// }).catch(err => {
// 	l("Error! : " + err)
// })

// ==== Test x_Vel ==== //
// promises = _.map(_.range(0, 8.192, 8.192/32), i => runCmd(i, `0 0 ${i} 0 0 0 0 0 0 0 0 0 0`))
// Promise.all(promises).then(values => {
// 	l("\nx_vel")
// 	_.each(values, v => {
// 		l(len(v.cmd.x_vel, 5), len(v.llrc.rho, 5), v.bytes.join('_'))
// 	})
// }).catch(err => {
// 	l("Error! : " + err)
// })

// ==== Test rotation ==== //
// promises = _.map(_.range(0, 2 * Math.PI, Math.PI / 20), dpi => {
// 	let x_vel = Math.cos(dpi)
// 	let y_vel = Math.sin(dpi)

// 	return runCmd(dpi, `0 0 ${x_vel} ${y_vel} 0 0 0 0 0 0 0 0 0`)
// })
// Promise.all(promises).then(values => {
// 	l("\ntheta")
// 	_.each(values, v => {
// 		l(
// 			"x: " + len(v.cmd.x_vel, 5), "y: " + len(v.cmd.y_vel, 5),
// 			"  ",
// 			"rho: " + len(v.llrc.rho, 5), "theta: " + len(v.llrc.theta, 5), 
// 			"  ",
// 			v.bytes.join('_'))
// 	})
// }).catch(err => {
// 	l("Error! : " + err)
// })

// ==== Test booleans ==== //
promises = _.map(_.range(Math.pow(2, 6)), i => {
	let b = p => (i >> p) & 1
	return runCmd(i, `0 ${b(0)} 0 0 0 ${b(1)} ${b(2)} ${b(3)} 0 ${b(4)} ${b(5)} 0 0`)	
})
Promise.all(promises).then(values => {
	l("\nobooleans")
	_.each(values, (v, i) => {
		l(len(i, 3), v.bytes.join('_'))
	})
}).catch(err => {
	l("Error! : " + err)
})




