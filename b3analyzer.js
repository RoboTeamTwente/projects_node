l = console.log
let len = (str = "", size = str.length, char = ' ') => (str + Array(500).join(char)).substr(0, size)

let _, path, rl, fs

try{
	_ = require('lodash')
	path = require('path')
	rl = require('readline-sync')
	fs = require('fs-extra')
}catch(e){
	l("One or more modules not found. installing modules...")
	require('child_process').execSync("npm install lodash readline-sync fs-extra path ")

	l("Modules installed, please restart")
	process.exit(0)
}

/* ========================================================================================================================== */


let state = {}

state.paths = {}

// Workspace path
state.paths.ws = process.env.ROS_PACKAGE_PATH.split(":")[0]
// Projects path
state.paths.projects = path.join(state.paths.ws, "roboteam_tactics", "src", "trees", "projects")
// Projects
state.projectNames = _.filter(fs.readdirSync(state.paths.projects), project => project.endsWith(".b3"))

state.projects = []
state.nodes = {}
state.trees = {}

let idFactory = 0;

/* First, load all projects into state */
// For each project
_.each(state.projectNames, projectName => {

	// Load project from file
	let projectPath = path.join(state.paths.projects, projectName)
	let projectJson = fs.readFileSync(projectPath, "utf8")
	let project = JSON.parse(projectJson)

	state.projects[idFactory++] = project
})

/* For each project, extract nodes and trees */
_.each(state.projects, project => {

	// For each custom node in project
	_.each(project.data.custom_nodes, node => {
		
		if(!node.name){		// Fix for some nodes that are "undefined" : { version: '0.3.0', scope: 'node', properties: {} }
			return l("Warning : node without name", project.name, node)	
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
				id : idFactory
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
			nNodes : _.keys(tree.nodes).length
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
					id : idFactory
				}
				idFactory++
			}

			state.nodes[_node.id].usage++
			state.nodes[_node.id].usedBy.push(t.id)

		})
	})
})

/* =========================================================================================================== */

function showProject(projectId){
	let project = state.projects[projectId]
	l("DETAILS OF PROJECT " + projectId)
	l(len("│ name", 15) + " : " + project.name)
	l(len("│ description", 15) + " : " + project.description)
	l(len("│ trees", 15) + " : " + project.data.trees.length)
	l(len("│ custom nodes", 15) + " : " + project.data.custom_nodes.length)

	showProjectTrees(projectId)
}

function showTree(treeId){
	let tree = state.trees[treeId]

	l("\nDETAILS OF TREE " + tree.id)
	l("│ title   : " + tree.title)
	l("│ project : " + tree.project)
	l("┼───────────────────────────")

	// Find actual project
	let project    = _.find(state.projects, {'name' : tree.project })
	// Find actual tree
	let actualTree = _.find(project.data.trees, {'title' : tree.title })
	
	let printTree = (nodes, nodeName, indent = '') => {
		let l = (arg) => console.log(indent + arg)
		
		let node = nodes[nodeName]
		l(node.name)
		
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
}

function showNode(nodeId){
	let node = _.filter(state.nodes, n => n.id == nodeId)[0]
	l("\nDETAILS OF NODE " + nodeId)
	l("│ name     : " + node.name)
	l("│ category : " + node.category)
	l("│ usage    : " + node.usage)
	
	if(node.usage == 0)
		return

	l("│ usedBy   :")
	l("│ ")

	let treesCount = _.countBy(node.usedBy)
	let treeObjs = _.map(treesCount, (count, treeId) => {
		let o = _.clone(state.trees[treeId])
		o.usage = count
		return o
	})

	printTable(treeObjs, ['id', 'title', 'usage'])
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
	l("TREES OF PROJECT")
	printTable(trees, ['id', 'title', 'nNodes'], ['title'], ['asc'])
}

function repl(){
	showHelp()
	
	while(true){
		let input = rl.question("\n$ ")
		let args = input.split(" ")

		if(args.length < 1 || args[0] == "help"){
			showHelp()
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
			if(args.length == 1){
				l("\nLIST OF ALL NODES : " + _.keys(state.nodes).length)
				printTable(state.nodes, ['id', 'name', 'usage'], ['usage', 'name'], ['desc', 'asc'])
			}
		}

		if(args[0] == "t"){
			if(args.length == 1){
				l("\nLIST OF ALL TREES")
				printTable(state.trees, ['id', 'title', 'nNodes'], ['title'], ['asc'])
			}
		}
	}
}

function showHelp(){
	l("==== help =====")
	l("p       : Show all projects")
	l("t       : Show all trees")
	l("n       : Show all nodes")
	l("[i:int] : show details of project/tree/node i")
	l("===============\n")
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