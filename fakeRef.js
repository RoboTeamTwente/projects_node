l = console.log

let rl = require('readline-sync');
let _ = require('lodash');

let ros = require('rosnodejs');
let std_msgs = ros.require('datatype');

let list = ros.getAvailableMessagePackages()
let msgs = require(list.roboteam_msgs)

class FakeRef {
    constructor(){
        l("[FakeRef] new FakeRef");
        // Create new node
        this.rosNode = ros.initNode('/jsFakeRef').then(rosNode => {
            this.rosNode = rosNode;
            // Let node advertise on vision topic
            this.pub = this.rosNode.advertise('/vision_refbox', msgs.msg.RefereeData);
            // Create new referee message
            this.m = new msgs.msg.RefereeData();
            l("[FakeRef] FakeRef initialized");
        }).catch(err => {
            l("[FakeRef] Error : could not create rosNode : " + err);
        });
        
    }

    send(cmd, args){
        if(cmd < 0 || 17 < cmd){
            l("[FakeRef] cmd out of range! : " + cmd);
            this.list();
            return;
        }

        this.m.command.command = cmd;

        if(cmd == stringToCmd['BALL_PLACEMENT_YELLOW'] || cmd == stringToCmd['BALL_PLACEMENT_BLUE']){
            this.m.designated_position.x = parseFloat(args[0]);
            this.m.designated_position.y = parseFloat(args[1]);
        }

        this.pub.publish(this.m);
        l("[FakeRef] Published cmd " + cmd + " => " + cmdToString[cmd] + (args.length ? " : " + args.join(', ') : ''));
    }

    list(){
        _.each(cmdToString, (str, cmd) => {
            l("    " + cmd + " : " + str);
        });
    }
}

const fakeRef = new FakeRef();

var stdin = process.openStdin();
stdin.addListener("data", function(d) {
    try{
        let inputs = d.toString().slice(0, -1).replace(/ +/, ' ').split(' ')
        
        let cmd = parseInt(inputs[0]);
        
        fakeRef.list();
        l();
        if(isNaN(cmd))
            l(d.toString().trim() + " is not a valid number")
        else
            fakeRef.send(cmd, inputs.slice(1));
        

    }catch(e){
        l("Error : " + e.message)
        l(e);
    }
});

const cmdToString = {
    0 : "HALT",
    1 : "STOP",
    2 : "NORMAL_START",
    3 : "FORCE_START",
    4 : "PREPARE_KICKOFF_YELLOW",
    5 : "PREPARE_KICKOFF_BLUE",
    6 : "PREPARE_PENALTY_YELLOW",
    7 : "PREPARE_PENALTY_BLUE",
    8 : "DIRECT_FREE_YELLOW",
    9 : "DIRECT_FREE_BLUE",
    10 : "INDIRECT_FREE_YELLOW",
    11 : "INDIRECT_FREE_BLUE",
    12 : "TIMEOUT_YELLOW",
    13 : "TIMEOUT_BLUE",
    14 : "GOAL_YELLOW",
    15 : "GOAL_BLUE",
    16 : "BALL_PLACEMENT_YELLOW",
    17 : "BALL_PLACEMENT_BLUE"
}

const stringToCmd = {
    "HALT" : 0,
    "STOP" : 1,
    "NORMAL_START" : 2,
    "FORCE_START" : 3,
    "PREPARE_KICKOFF_YELLOW" : 4,
    "PREPARE_KICKOFF_BLUE" : 5,
    "PREPARE_PENALTY_YELLOW" : 6,
    "PREPARE_PENALTY_BLUE" : 7,
    "DIRECT_FREE_YELLOW" : 8,
    "DIRECT_FREE_BLUE" : 9,
    "INDIRECT_FREE_YELLOW" : 10,
    "INDIRECT_FREE_BLUE" : 11,
    "TIMEOUT_YELLOW" : 12,
    "TIMEOUT_BLUE" : 13,
    "GOAL_YELLOW" : 14,
    "GOAL_BLUE" : 15,
    "BALL_PLACEMENT_YELLOW" : 16,
    "BALL_PLACEMENT_BLUE" : 17
}



