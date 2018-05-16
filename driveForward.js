l = console.log
let ID = NaN
let nPublished = 0

let ros = require('rosnodejs');
let std_msgs = ros.require('datatype')

let rl = require('readline-sync')

let list = ros.getAvailableMessagePackages()
let msgs = require(list.roboteam_msgs)


var stdin = process.openStdin();
stdin.addListener("data", function(d) {
    try{
        let _id = parseInt(d.toString().trim())
        if(isNaN(_id))
            throw new Error(d.toString().trim() + " is not a valid number")
        ID = _id 
        l("Now sending to id=" + ID)
    }catch(e){
        l(e.message)
    }
});


setInterval(function(){
    l("==== " + Date.now() + " ==== " + ID + " ==== " + nPublished + " msgs ====")
}, 1000)


ros.initNode('/jsNode')
.then(driveForward)

const ids = [2, 10];

function driveForward(rosNode){
    let l = (...args) => console.log("[driveForward]", ...args)
    l("init")

    let pub = rosNode.advertise('/robotcommands', msgs.msg.RobotCommand);

    let robotCommand = new msgs.msg.RobotCommand()

    robotCommand.x_vel = 0.6;
    robotCommand.y_vel = 0.0;

    setInterval(function(){
        // if(isNaN(ID)) return


        robotCommand.id = ids[nPublished % ids.length];
        // robotCommand.id = 10


        pub.publish(robotCommand)    
        nPublished++

    }, 60)    
}