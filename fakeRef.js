l = console.log
let ros = require('rosnodejs');
let std_msgs = ros.require('datatype')


let list = ros.getAvailableMessagePackages()
let msgs = require(list.roboteam_msgs)

ros.initNode('/jsNode')
.then(fakeRef)


function fakeRef(rosNode){
    let l = (...args) => console.log("[fakeRef]", ...args)
    l("init")

    let pub = rosNode.advertise('/vision_refbox', msgs.msg.RefereeData)
    let m = new msgs.msg.RefereeData()
    // let pub = rosNode.advertise('/vision_referee', msgs.msg.RefereeCommand)
    // let m = new msgs.msg.RefereeCommand()

    // l(msgs.msg.RefereeData)
    // l(m)

    let cmd = process.argv[2]
    if(typeof cmd == "undefined")
        cmd = 2

    l("Sending command " + cmd)
    m.command.command = cmd // Normal start
    l(m)

    setInterval(function(){
        pub.publish(m)    
        l(Date.now() + " published")
    }, 2000)
}