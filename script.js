l = console.log
let ros = require('rosnodejs');
let std_msgs = ros.require('datatype')


let list = ros.getAvailableMessagePackages()
let msgs = require(list.roboteam_msgs)

ros.initNode('/jsNode')
.then((rosNode) => { 
	l('Rosnode initialized')

	start(rosNode)

})


function start(rosNode){
	
	let startTime = Date.now()
	l("Starting at " + startTime)

	let pub = rosNode.advertise('/robotcommands', msgs.msg.RobotCommand);

	let robotCommand = new msgs.msg.RobotCommand()

	robotCommand.x_vel = 1;
	robotCommand.y_vel = 0.0;

	
    let allIds = false;

    let ID = 0;

    if(allIds){
    	
        /* ALL IDS */
    	setInterval(() => {
    		l('Ping')
    		for(id = 0; id < 16; id++){
    			setTimeout(
    			(function(i){
    				return function(){
    					l(i)
    					robotCommand.id = id;
    					pub.publish(robotCommand);
    				}
    			})(id), 20*id);
    		}
    	}, 1000);

    }else{

        /* ONE ID */
        let atTime = Date.now()
        let nMessages = 0

        setInterval(() => {

            let id = 1

            if(Date.now() - atTime > 1000){
                atTime = Date.now()
                l(`\n[Nodejs] ${nMessages} sent`)
            }

            
            let duration = Date.now() - startTime
            duration /= 500

            let wheelX = 1;//Math.sin(duration/2)
            let wheelY = 0;//Math.cos(duration)
            let wSwitch = Math.cos(duration/3.4)
            //if(wSwitch<0.15 && wSwitch>-0.15){
            //	wSwitch=0;
            //}

            let length = Math.sqrt(wheelX*wheelX+wheelY*wheelY)

            wheelX *= 1.2*0.5; //+ wheelX/length*0.1
            wheelY *= 0.5; //+ wheelY/length*0.1
            l(duration, wheelX, wheelY)
            
            

            robotCommand.x_vel = wheelX
            robotCommand.y_vel = wheelY
            robotCommand.w = 1.75*wSwitch;      
            robotCommand.id = id;

            nMessages++

            pub.publish(robotCommand);



        }, 30);  

    }

}