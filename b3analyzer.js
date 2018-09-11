l = console.log

let execSync, _, path, rl, fs, chalk

try{
	execSync = require('child_process').execSync
	_ = require('lodash')
	path = require('path')
	rl = require('readline-sync')
	fs = require('fs-extra')
	chalk = require('chalk')
}catch(e){
	l("One or more modules not found. installing modules...")
	execSync("npm install lodash readline-sync fs-extra path chalk --loglevel=error")

	l("Modules installed, please restart")
	process.exit(0)
}

warning = (...args) => l(chalk.yellow("Warning :", ...args))

let len = (str = "", size = str.length, char = ' ') => (str + Array(500).join(char)).substr(0, size)

/* ========================================================================================================================== */
/* ======================================================= PREPARATION ====================================================== */
/* ========================================================================================================================== */



let state = {}

state.paths = {}

// Workspace path
state.paths.ws = path.join(process.env.RTT_ROOT, "workspace", "src")
// roboteam_tactics/src path
state.paths.src = path.join(state.paths.ws, "roboteam_tactics", "src")
// roboteam_tactics/include/roboteam_tactics path
state.paths.headers = path.join(state.paths.ws, "roboteam_tactics", "include", "roboteam_tactics")
// Projects path
state.paths.projects = path.join(state.paths.ws, "roboteam_tactics", "src", "trees", "projects")
// Projects
state.projectNames = _.filter(fs.readdirSync(state.paths.projects), project => project.endsWith(".b3"))

state.projects = []
state.nodes = {}
state.trees = {}
state.defaultStrategies = {}	// Stores which trees are used in the StrategyComposer; ref_state => tree_id

let idFactory = 0;

/* ====== A project has the following structure ====== */
/*  name : "qualification"
/*  description : "Some description"
/*  path : 
/*  data : []
/*      version
/*      scope : "project"
/*      selectedTree : "48acd209-e5b4-480c-ad15-26ed04093125"
/*
/*		trees : []
/*          version : "0.3.0"
/*  		scope : "tree"
/*  	    id : "5da8aba4-107b-4ca3-85cd-8eb8b7f44abe"
/*  		title : "SoloAttackerRole"
/*  		description : "Some description"
/*  		root : "96d0e326-bbab-42cf-af50-fe992c62343a"
/*			nodes : {}
/*  		  96d0e326-bbab-42cf-af50-fe992c62343a
/*  			id : "96d0e326-bbab-42cf-af50-fe992c62343a"
/*  			name : "RepeatUntilSuccess"
/*  			title : "Repeat Until Success"
/*  			description : ""
/*  			properties : {}
/*  				maxLoop : -1
/*  			child : "ad6941f8-3730-4bb0-aaab-6d0d3e0d0b5a"
/*  		  ad6941f8-3730-4bb0-aaab-6d0d3e0d0b5a
/*  			id : "ad6941f8-3730-4bb0-aaab-6d0d3e0d0b5a"
/*  			name : "MemSequence"
/*  			title : "MemSequence"
/*  			description : ""
/*  			properties : {}
/*  			children : []
/*  				"8c2e0f79-995e-4373-a1f9-a567e83abb7d"
/*  				"34e6c922-d513-4a3d-8c4b-5d43efa60943"
/*
/*		custom_nodes : []
/*			version : "0.3.0"
/*			scope : "node"
/*			name : "GoToPosAlt"
/*			category : "action"
/*			title : "GoToPosAlt"
/*			description : null
/*			properties : {}
/*				xGoal : ""
/*				yGoal : ""
	
/* First, load all projects into state */
// For each project
l(`Loading projects...`)
_.each(state.projectNames, projectName => {
	l(`    ${projectName}`)
	// Load project from file
	let projectPath = path.join(state.paths.projects, projectName)
	let projectJson = fs.readFileSync(projectPath, "utf8")
	let project = JSON.parse(projectJson)

	state.projects[idFactory++] = project
})
l(`Projects loaded\n`)

/* For each project, extract nodes and trees */
_.each(state.projects, project => {

	// For each custom node in project
	_.each(project.data.custom_nodes, node => {
		
		if(!node.name){		// Fix for some nodes that are "undefined" : { version: '0.3.0', scope: 'node', properties: {} }
			return warning(`custom node without name in project '${project.name}'`)
		}

		/* If the node has not been encountered yet, initialize it */
		// Find the node based on name
		if(!_.find(state.nodes, {'name' : node.name})){
			// Node has not been added yet
			state.nodes[idFactory] = {
				name : node.name,
				category : node.category,
				usage : 0,
				usedBy : [],
				uses : [],
				id : idFactory,
				filepath : null,
				headerpath : null,
				type : ""
			}
			idFactory++
		}
	})

	// For each tree in project
	_.each(project.data.trees, tree => {

		// Try to find tree in trees
		let key = {project : project.name, title : tree.title}
		if(_.findKey(state.trees, key)){
			l("Warning, duplicate tree : " + tree.title + ". Tree present in " + state.trees[tree.title].project + " and " + project.name)
		}
		
		// Add tree to state.trees
		let t
		state.trees[idFactory] = t = {
			title : tree.title,
			project : project.name,
			id : idFactory,
			b3id : tree.id,
			nNodes : _.keys(tree.nodes).length,
			usage : 0,
			usedBy : [],
			type : ""
		}
		idFactory++

		// For each node in tree
		_.each(tree.nodes, node => {

			let _node
			// Check if node has already been added
			if(!(_node = _.find(state.nodes, {'name' : node.name}))){
				// Node has not been added yet
				state.nodes[idFactory] = _node = {
					name : node.name,
					category : node.category,
					usage : 0,
					usedBy : [],
					uses : [],
					id : idFactory,
					filepath : null,
					headerpath : null,
					type : ""
				}
				idFactory++
			}

			state.nodes[_node.id].usage++
			state.nodes[_node.id].usedBy.push(t.id)

		})
	})
})



/* ======== Link filepath and type to corresponding node ======== */
/* Each node in a tree should have a corresponding file, be it a Strategy or a Skill */
/* The file is linked to the node by the use of the RTT_REGISTER_*** macros          */
/* By grepping for these macros, each node can be linked to its corresponding file   */

l("\nLinking each file to corresponding node...")
// Grep all files for RTT_REGISTER_
let cmd = "grep -r RTT_REGISTER_"
let cmdPath = state.paths.src
let output = execSync(cmd, {encoding : 'utf8', cwd : cmdPath})

// Split output into filename and code. E.g : 
// tactics/KickoffDefensePlay.cpp:RTT_REGISTER_TACTIC(KickoffDefensePlay);
// ["tactics/KickoffDefensePlay.cpp", "RTT_REGISTER_TACTIC(KickoffDefensePlay)"]
let filesAndCode = _.map(output.replace(/ /g, "").trim().split("\n"), f => f.split(":"))

// For each fileAndCode, find corresponding state.node
_.each(filesAndCode, ([filename, code]) => {

	let filepath = path.join(state.paths.src, filename)
	/* This regex retrieves the type and nodename of the file                              */
	/* e.g. RTT_REGISTER_TACTIC(KickoffDefensePlay) gives ["TACTIC", "KickoffDefensePlay"] */
	let match, reg = /RTT_REGISTER_(.*?)_?F? ?\((.*)\);/
	// Execute regex
	if(match = code.match(reg)){
		// Extract name and type
		let type = match[1]
		let registeredAs = match[2].replace(",", "/")
		// l("registeredAs: " + registeredAs)
		// Find matching node based on name
		let node = _.find(state.nodes, {name : registeredAs})
		if(node){
			// Add filepath and type to node
			node.filepath = filepath
			node.type = type

			// Try to find associated header file, assume path and extension
			let headerfile = filename.replace("cpp", "h")
			let headerpath = path.join(state.paths.headers, headerfile)

			// See if header file exists
			if(fs.pathExistsSync(headerpath)){
				node.headerpath = headerpath
			}else{
				warning("" + type + " " + registeredAs + " does not seem to have an associated header file")
			}

		}else{
			warning("" + len(type + " " + registeredAs, 20) + " registered, but not found in any .b3 json file")
		}
	}
})
/* ============================================================== */

/* ==== Check if there as still nodes without filepaths, such as predefined tactics ==== */
/* There can be nodes that do not have a file associated with them, because it is not registered with RTT_REGISTER_*** */
/* Sometimes, the file can be found by looking for the name of the node and appending ".cpp"                           */
/* However, that might mean that there is a Tactic / Skill / Condition file without RTT_REGISTER... weird              */

l("\nLinking each node to corresponding file...")
_.each(state.nodes, node => {
	// If node has filepath, skip
	if(node.filepath)
		return

	// Search for file that belongs to node
	let filesFound = execSync(`find -name ${node.name}.cpp`, {encoding : 'utf8', cwd : path.join(state.paths.ws, "roboteam_tactics")})
	filesFound = filesFound.trim().split("\n")
	
	if(filesFound[0].length){
		node.filepath = path.join(state.paths.ws, "roboteam_tactics", filesFound[0])
		node.type = "unknown"
	}
	if(filesFound.length > 1)
		warning("" + len(node.id + " " + node.name, 30) + "   has more than one file -> " + filesFound)
	if(!filesFound[0].length)
		warning(len(node.id + " " + node.name, 30) + "   has no file. Used " + node.usage + " times")
})
/* ===================================================================================== */



/* ==== Link plays to roles, by looking for tree assignments in file ==== */
l("\nGoing through .cpp files of plays, looking for roles...")
_.each(state.nodes, node => {
	// If node has no filepath, return
	if(!node.filepath)
		return

	// Load file from filepath
	let file = fs.readFileSync(node.filepath, {encoding : 'utf8'})
	// Regex, uses negative lookahead to ignore commented-out trees
	let treeAssignmentRegex = new RegExp(/^(?! +\/\/.*$).*\.tree ?= ?\"(.*)\"/, "gm")

	// Find regex in file
	let match, assignments = []
	while(match = treeAssignmentRegex.exec(file))
		assignments.push(match[1])
	assignments = _.uniq(assignments)
		
	if(!assignments.length)
		return

	// For each assignment
	_.each(assignments, treeName => {

		// Find the tree in state.trees
		let tree = _.find(state.trees, tree => {
			if(tree.project)	return (tree.project + "/" + tree.title) == treeName
			else				return tree.title == treeName
		})

		// If no tree has been found, then the play uses a non-exsting tree
		if(!tree){
			warning("play " + len(node.id + " " + node.name, 30) + " uses non-existent tree " + treeName + ". Play used " + node.usage + " times")
			return 
		}

		tree.usedBy.push(node.id)
		tree.usedBy = _.uniq(tree.usedBy)
		tree.usage = tree.usedBy.length

		node.uses.push(tree.id)

	})
})
/* ====================================================================== */



/* ====  Link plays/skills to plays/skills, by looking at the header files ==== */
l("\nGoing through .cpp files of plays and skills, linking all..")
_.each(state.nodes, node => {
    // If node has no filepath, return
    if(!node.filepath)
        return

    // Load file from filepath
    let file = fs.readFileSync(node.filepath, {encoding : 'utf8'})
    // Regex, uses negative lookahead to ignore commented-out includes
    let treeAssignmentRegex = new RegExp(/^(?! *\/\/.*$).*#include +"roboteam_tactics\/(?:skills|tactics|conditions)\/(.*)\.h"/, "gm")

    // Find regex in file
    let match, headers = []
    while(match = treeAssignmentRegex.exec(file))
        headers.push(match[1])
    headers = _.uniq(headers)

    // Remove self from header files
    headers = _.without(headers, node.name)

    if(!headers.length)
        return

    // For each assignment
    _.each(headers, header => {

		// Find the play/skill in state.nodes
		let nodeUsed = _.find(state.nodes, {name : header})
		// Update usedBy and usage
		// nodeUsed.usedBy.push(node.id)
		nodeUsed.usage = nodeUsed.usedBy.length

    })
})

/* ======== Assume type of trees based on their nodes ======== */
l("\nAssuming type of tree based on type of nodes used...")
_.each(state.trees, tree => {
	
	/* Not the most efficient lookup, but whatever.. */
	// Find actual project
	let project    = _.find(state.projects, {'name' : tree.project })
	// Find actual tree
	let actualTree = _.find(project.data.trees, {'title' : tree.title })
	
	// Collect all the types of nodes used
	let typesUsed = _.map(actualTree.nodes, actualNode => {
		return _.find(state.nodes, {name : actualNode.name}).type
	})
	typesUsed = _.uniq(typesUsed)
	
	/* Assume type. Using TACTIC makes it STRATEGY, using SKILL makes it ROLE */
	// If tree uses both, it's a conflict
	if(typesUsed.includes("TACTIC") && typesUsed.includes("SKILL")){
		warning("tree " + tree.id + " " + tree.title + " uses both tactics and skills!")
		tree.type = "conflict"
	// If tree uses TACTIC
	}else if(typesUsed.includes("TACTIC")){
		tree.type = "STRATEGY"
	// If tree uses SKILL
	}else if(typesUsed.includes("SKILL")){
		tree.type = "ROLE"
	// If tree uses neither, it's unknown
	}else{
		warning("tree " + tree.id + " " + tree.title + " has unknown type. Uses " + typesUsed.join(", "))
		tree.type = "unknown"
	}



})

// === Look into StrategyComposer === //
l("\nScanning through src/utils/StrategyComposer.cpp to see which strategies are used at the moment...")
{ // Scoping to keep the global namespace clean of variables
	let StrategyComposer = fs.readFileSync(path.join(state.paths.src, "utils", "StrategyComposer.cpp"), {encoding : 'utf8'})
	// Remove all tabs and whitespace from StrategyComposer, to make the regex easier
	StrategyComposer = StrategyComposer.replace(/[ \t]/g, "");
	// Regex that captures    {RefState::NORMAL_START,"rtt_jim/NormalPlay"s}    Ignores commented out lines by using negative lookahead
	let RefstateToStratRegex = new RegExp(/^(?!\/\/.*$){RefState::(.*?),"(.*?)"s}.*$/, "gm")
	// Find all RefState->Strategy assignments in StrategyComposer
	let match, assignments = []
	while(match = RefstateToStratRegex.exec(StrategyComposer)){
		// Get RefState and Strategy
		let [refState, tree] = [match[1], match[2]]
		// Get project name and tree title of Strategy
		let [projectName, treeTitle] = tree.split("/")
		// Find node that represents tree
		let key = {project : projectName, title : treeTitle}
		let nodeId = _.findKey(state.trees, key)
		if(nodeId){
			// Increment the usage of the strategy by 1
			state.trees[nodeId].usage++
			// Store refstate=>tree_id in defaultStrategies
			state.defaultStrategies[refState] = nodeId
		}else{
			// A tree is in StrategyComposer, but it doesn't seem to exist!
			warning(`Strategy ${tree} assigned to ${refState} does not seem to exist!`)
		}
		l(`    ${len(refState, 25)} ${len(nodeId, 3)} ${tree}`)
	}
}

// Show all strategies that are unused
if(false){

	// let newProjectPath = path.join(__dirname, "b3NewProjects");
	let newProjectPath = state.paths.projects
	_.each(state.trees, (tree, key) => {
		if(tree.usage == 0 && tree.type == "STRATEGY"){
			l(`removing ${tree.id} ${tree.project}/${tree.title}...`)
			/* Delete tree in state.projects */
			// Find project
			let project = _.find(state.projects, {name : tree.project});
			if(!project)
				return warning("Could not find project!");

			let treeKey = _.findKey(project.data.trees, {id : tree.b3id})
			if(!treeKey)
				return warning("Could not find tree in project!");

			project.data.trees.splice(treeKey, 1)
		}
	})

	// === Check for all nodes that are not used once === //
	_.each(state.nodes, node => {
		if(node.usage == 0)
			return;

		l("unused node : " + len(node.name, 40) + " " + node.filepath)

		// For each project, remove node with the same name from project.data.custom_nodes
		_.each(state.projects, project => {
			let pNodeId = _.findKey(project.data.custom_nodes, {name : node.name})
			
			if(typeof pNodeId !== "undefined"){ // remember, 0 and undefined both return false. Therefore, check on typeof
				l("    Found in " + project.name + " at " + pNodeId)
				project.data.custom_nodes.splice(pNodeId, 1);	
			}
		})
	})


	fs.ensureDirSync(newProjectPath);
	_.each(state.projects, project => {
		fs.writeFileSync(path.join(newProjectPath, project.name + ".b3"), JSON.stringify(project, null, 4));
	})
	l("Projects written")

}


/* ========================================================================================================================== */
/* ======================================================= REPL FUNCTIONS =================================================== */
/* ========================================================================================================================== */



function showProject(projectId){
	let project = state.projects[projectId]
	l()
	l("┼DETAILS OF PROJECT " + projectId)
	l(len("│ name", 15) + " : " + project.name)
	l(len("│ description", 15) + " : " + project.description)
	l(len("│ trees", 15) + " : " + project.data.trees.length)
	l(len("│ custom nodes", 15) + " : " + project.data.custom_nodes.length)

	showProjectTrees(projectId)
}

function showTree(treeId){
	let tree = state.trees[treeId]

	l()
	l("┼DETAILS OF TREE " + tree.id)
	l("│ title   : " + tree.title)
	l("│ project : " + tree.project)
	l("│ type    : " + tree.type)
	l("│ usage   : " + tree.usage);
	l("│ ")
	
	if(tree.usedBy.length){
		l("│ used by " + tree.usedBy.length + " nodes : ");
		_.each(tree.usedBy, t => {
			let node = state.nodes[t]
			l("│   " + node.id + " " + node.name)
		})
	}

	l("┼TREE───────────────────────")

	// Find actual project
	let project    = _.find(state.projects, {'name' : tree.project })
	// Find actual tree
	let actualTree = _.find(project.data.trees, {'title' : tree.title })
	// Keeps track of the nodes that are used
	let nodesUsed = []

	let printTree = (nodes, nodeName, indent = '') => {
		let l = (arg) => console.log(indent + arg)
		
		let node = nodes[nodeName]
		// Find id of node by name
		let id = _.findKey(state.nodes, { name : node.name })

		// If the node has parameters set
		if(_.keys(node.properties).length)
			l(id + " " + node.title + " | " + _.map(node.properties, (v,k) => k + "="+v ).join(" "))
		else
			l(id + " " + node.title)
		
		// Add key of node to nodesUsed
		nodesUsed.push(node.id)

		if(state.nodes[id].uses.length){
			_.each(state.nodes[id].uses, roleId => {
				let role = state.trees[roleId]
				
				// Find project of role
				let roleProject = _.find(state.projects, {'name' : role.project })
				// Find actual role in project
				let actualRole = _.find(roleProject.data.trees, {'title' : role.title })
				
				l("   ROLE : " + roleId + " " + role.title)
				if(!actualRole){

					warning("could not find actualRole ..?")
				}else{
					printTree(actualRole.nodes, actualRole.root, indent + '   │')
					l("")
				}
			})
			// l("THIS NODE USES TREES OMG PLZ PRINT IT")
		}

		if(node.children){
			_.each(node.children, node_id => {
				printTree(nodes, node_id, indent + '    ')
			})
		}
		if(node.child){
			printTree(nodes, node.child, indent + '    ')
		}
	}

	// Print the tree
	printTree(actualTree.nodes, actualTree.root, '│ ')

	// Check if there are nodes that are floating
	let allNodes = _.map(actualTree.nodes, (v, k) => k)
	let nodesUnused = _.difference(allNodes, nodesUsed)
	
	if(!nodesUnused.length)
		return

	l("│\n│ Floaters: ")
	_.each(nodesUnused, n => { 
		let node = actualTree.nodes[n]
		let nodeId = _.findKey(state.nodes, {name : node.name})

		l("│   " + nodeId + " " + node.name)
	})
}

function showNode(nodeId){
	let node = _.filter(state.nodes, n => n.id == nodeId)[0]
	l()
	l("┼DETAILS OF NODE " + nodeId)
	l("│ name     : " + node.name)
	l("│ category : " + node.category)
	l("│ type     : " + node.type)
	l("│ filepath : " + node.filepath)
	l("│ usage    : " + node.usage)
	
	if(node.usage > 0){
		l("│ ")
		l("├USED BY STRATEGIES :")
		l("│ ")

		let treesCount = _.countBy(node.usedBy)
		let treeObjs = _.map(treesCount, (count, treeId) => {
			let o = _.clone(state.trees[treeId])
			o.usage = count
			return o
		})
		printTable(treeObjs, ['id', 'title', 'usage'])
	}

	if(node.uses.length > 0){
		l("│ ")
		l("├USES ROLES :")
		l("│ ")

		let treesCount = _.countBy(node.uses)
		let treeObjs = _.map(treesCount, (count, treeId) => {
			let o = _.clone(state.trees[treeId])
			o.usage = count
			return o
		})
		printTable(treeObjs, ['id', 'title', 'usage'])
	}	
}

function showAllProjects(){

	let pObjs = _.map(state.projects, (p, k) => {
		return {
			id : k,
			name : p.name,
			nTrees : _.keys(p.data.trees).length,
			nNodes : _.keys(p.data.custom_nodes).length
		}
	})
	l("\nLIST OF ALL PROJECTS")
	printTable(pObjs, ['id', 'name', 'nTrees', 'nNodes'])
}

function showProjectTrees(projectId){
	let project = state.projects[projectId]
	let trees = _.filter(state.trees, t => t.project == project.name)
	l("│ ")
	l("┼TREES OF PROJECT")
	printTable(trees, ['id', 'title', 'nNodes'], ['title'], ['asc'])
}

function showDefaultStrategies(){
	l("\nSTRATEGIES USED IN STRATEGYCOMPOSER")
	_.each(state.defaultStrategies, (treeId, refState) => {
		l(`    ${len(refState, 25)} ${len(treeId, 3)} ${state.trees[treeId].title}`)
	})
}
/* ========================================================================================================================== */
/* ============================================================ REPL ======================================================== */
/* ========================================================================================================================== */

function repl(){
	l()
	showHelp()
	
	while(true){
		let input = rl.question("\n\n$ ")
		let args = input.split(" ")

		if(args.length < 1 || args[0] == "help"){
			showHelp()
		}

		// Extract sorting arguments
		let sortArgs = [], sortDirs = []
		if(args.length > 1){
			let filters = args.slice(1)
			_.each(filters, filter => {
				sortArgs.push(filter.split(":")[0])
				sortDirs.push(filter.split(":")[1])
			})
		}

		// If an id has been entered, load and show the correct object
		let id = parseInt(args[0])
		if(!isNaN(id)){
			let project = state.projects[id]
			if(project){
				showProject(id)
				continue
			}

			let tree = state.trees[id]
			if(tree){
				showTree(id)
				continue
			}

			let node = state.nodes[id]
			if(node){
				if(args[1] == "open")
					if(node.filepath)
						execSync("subl " + node.filepath)
					else
						warning("node " + node.id + " " + node.name + " has no associated file")
				else
					showNode(id)
				continue
			}

			l("There is nothing with id " + id)
			continue
		}

		if(args[0] == "p"){
			if(args.length == 1){
				showAllProjects()
			}
		}

		if(args[0] == "n"){
			l("\nLIST OF ALL NODES : " + _.keys(state.nodes).length)
			if(sortArgs.length)
				printTable(state.nodes, ['id', 'name', 'usage', 'type'], sortArgs, sortDirs)
			else
				// printTable(state.nodes, ['id', 'name', 'usage'], ['usage', 'name'], ['desc', 'asc'])
				printTable(state.nodes, ['id', 'name', 'usage', 'type'], ['name', 'usage'], ['asc', 'desc'])
		}

		if(args[0] == "t"){
			l("\nLIST OF ALL TREES")
			if(sortArgs.length)
				printTable(state.trees, ['id', 'title', 'usage', 'type'], sortArgs, sortDirs)
			else
				printTable(state.trees, ['id', 'title', 'usage', 'type'], ['usage'], ['desc'])
		}

		if(args[0] == "d"){
			showDefaultStrategies();
		}
	}
}

function showHelp(){
	l("==== HELP ============================================")
	l("help   : Show this window")
	l("p      : Show all projects")
	l("t      : Show all trees")
	l("n      : Show all nodes")
	l("i:int  : show details of project/tree/node i")
	l("i open : open the file of node i with Sublime Text (throws error if not installed)")
	l()
	l("ordering on nodes/trees can be done by appending the key(s) to order on.")
	l("    to order nodes on type and name : \"n type name\"")
	l("    to order in a specific direction: \"n usage:desc name:asc\"")
	l("======================================================\n")
}



function printTable(obj, keys, orderKeys, orderDir){

	/* ==== Calcualte max length of each key ==== */
	// Initialize size array with length of keys
	let maxLengths = _.zipObject(keys, _.map(keys, k => k.length))	
	// For each key, get all values and the max length	
	_.each(keys, k => {
		// Get max lengths of all values of key
		let maxLen = _.max(_.map(obj, o => (o[k] + "").length))
		// Set max length
		maxLengths[k] = Math.max(maxLengths[k], maxLen)		
	})
	let maxLen = _.sum(_.values(maxLengths))
	// Account for the spaces after each key
	maxLen += keys.length 	
	// Account for the "│ "
	maxLen += 2
	/* ========================================== */


	/* ==== Calculate the amount of columns and rows ==== */
	// Characters that fit on the screen
	let width = process.stdout.columns
	// Columns that fit on the screen
	let nCols = Math.floor(width / maxLen)
	// Rows needed
	let nRows = Math.ceil(_.keys(obj).length / nCols)
	// Set minimum amount of rows, unless number of objects is lower than minimum
	if(nRows < 10){
		nRows = Math.min(10, _.keys(obj).length)
		nCols = Math.ceil(_.keys(obj).length / nRows)
	}
	/* ================================================== */


	/* ==== Sort and divide the object into columns ==== */
	// First, turn the object into a large array
	let objArr = _.values(obj)
	// Sort the array ==== */
	objArr = _.orderBy(objArr, orderKeys, orderDir)
	// Split the array into columns
	let columns = []
	for(let col = 0; col < nCols; col++){
		columns[col] = objArr.slice(col * nRows, (col+1) * nRows)
	}
	/* ================================================= */


	/* ==== Print the header ==== */
	let strKeys = ""
	let strLine = ""
	for(let col = 0; col < nCols; col++){
		strKeys += "│ " + _.map(keys, k => len(k, maxLengths[k])).join(" ") + " "
		strLine += "┼─" + _.map(keys, k => len("", maxLengths[k], "─")).join("─") + "─"
	}
	l(strKeys)
	l(strLine)
	/* ========================== */


	/* ==== Print each row ==== */
	for(let row = 0; row < nRows; row++){
		let strRow = ""
		for(let col = 0; col < nCols; col++){
			// Get the object to print
			let o = columns[col][row]
			// If there are no more objects, continue
			if(!o) continue
			// Build the string
			strRow += "│ " + _.map(keys, k => len(o[k], maxLengths[k])).join(" ") + " "
		}
		// Print the row
		l(strRow)
	}
	/* ======================== */

}




repl()
return
