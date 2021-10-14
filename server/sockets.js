var iolib = require('socket.io')
	, log = require("./log.js").log
	, BoardData = require("./boardData.js").BoardData
	, config = require("./configuration");
const db = require("./db/db.js");
const {BoardService} = require("./boardService");

/** Map from name to *promises* of BoardData
	@type {Object<string, Promise<BoardData>>}
*/
var boards = {};
var boardService = new BoardService();

function noFail(fn) {
	return function noFailWrapped(arg) {
		try {
			return fn(arg);
		} catch (e) {
			console.trace(e);
		}
	}
}

function startIO(app) {
	io = iolib(app);
	io.on('connection', noFail(socketConnection));
	return io;
}

function getStats() {

	const boardsCount = Object.keys(boards).length;
	let usersCount = 0;

	let output = '';

	for (key in boards) {
		const b = boards[key];
		usersCount += b.users.size;
		output += ' -- ' + b.name + ' : ' + b.users.size + '\n';
	}

	output = 'Всего досок: ' + boardsCount + '.\nВсего пользователей (неуникальных): ' + usersCount + '\n\n' + output;

	return output;
}

/** Returns a promise to a BoardData with the given name
 * @returns {Promise<BoardData>}
 */
async function getBoard(name) {
	if (boards.hasOwnProperty(name)) {
		return boards[name];
	} else {
		var board = await BoardData.load(name);
		boards[name] = board;
		return board;
	}
}

function socketConnection(socket) {
//Todo check is join can be did from frontend
	async function joinBoard(name) {
		// Join the board
		socket.join(name);

		// var board = await getBoard(name);
		// board.users.add(socket.id);
		// return board;
	}

	socket.on("error", noFail(function onError(error) {
		log("ERROR", error);
	}));

	// socket.on("getboard", async function onGetBoard(name) {
	// 	var board = await joinBoard(name);
	// 	//Send all the board's data as soon as it's loaded
	// 	socket.emit("broadcast", { _children: board.getAll() });
	// });

	socket.on("joinboard", noFail(joinBoard));

	var lastEmitSecond = Date.now() / config.MAX_EMIT_COUNT_PERIOD | 0;
	var emitCount = 0;
	socket.on('broadcast', noFail(async function onBroadcast(message) {
		var currentSecond = Date.now() / config.MAX_EMIT_COUNT_PERIOD | 0;
		if (currentSecond === lastEmitSecond) {
			emitCount++;
			if (emitCount > config.MAX_EMIT_COUNT) {
				var request = socket.client.request;
				if (emitCount % 100 === 0) {
					log('BANNED', {
						user_agent: request.headers['user-agent'],
						original_ip: request.headers['x-forwarded-for'] || request.headers['forwarded'],
						emit_count: emitCount,
						board: message.board
					});
				}
				return;
			}
		} else {
			emitCount = 0;
			lastEmitSecond = currentSecond;
		}

		var boardName = message.board;
		var data = message.data;

		if (!socket.rooms.hasOwnProperty(boardName)) socket.join(boardName);

		if (message.data.type === "doc") {
			if (message.data.data.length > config.MAX_DOCUMENT_SIZE) {
				console.warn("Received too large file");
				return;
			}
		}

		if (!data) {
			console.warn("Received invalid message: %s.", JSON.stringify(message));
			return;
		}

		if (!message.data.tool || config.BLOCKED_TOOLS.includes(message.data.tool)) {
			log('BLOCKED MESSAGE', message.data);
			return;
		}
		let emitData = {...data};

<<<<<<< Updated upstream
		// Save the message in the board
		handleMessage(boardName, data, socket);

=======
		if (data.tool !== 'Cursor') {
			await handleMessage(boardName, data, socket);
		}
		// Save the message in the board
>>>>>>> Stashed changes
		let outputData = {};
		Object.assign(outputData, emitData, {user: message.user})
		//Send data to all other users connected on the same board
		socket.broadcast.to(boardName).emit('broadcast', outputData);
		delete outputData;
	}));

	socket.on('disconnecting', function onDisconnecting(reason) {
		Object.keys(socket.rooms).forEach(async function disconnectFrom(room) {
			if (boards.hasOwnProperty(room)) {
				var board = await boards[room];
				board.users.delete(socket.id);
				var userCount = board.users.size;
				// log('disconnection', { 'board': board.name, 'users': board.users.size });
				if (userCount === 0) {
					// board.save();
					delete boards[room];
				}
			}
		});
	});
}

async function handleMessage(boardName, message, socket) {
	if (message.type === 'array') {
		return saveHistoryArray(boardName, message, socket);
	} else {
		return saveHistory(boardName, message, socket);
	}
}
async function saveHistoryArray(boardName, message, socket) {
	const data = {type: 'array', events: []};
	var socketEventName;
	for (let key in message.events) {
		let event = message.events[key];
		switch (event.type) {
			case "dublicate":
				socketEventName = "dublicateObjects"
				let d = await boardService.getItemFromDb(boardName, event.id);
				data.events.push(d);
				break;
			case 'getImagesCount':
				 socketEventName = 'getImagesCount';
				 data.events.push(await boardService.getItemFromDb(boardName, event.id));
				 db.deleteBoardData(boardName, event.id);
				 break;
			case 'copy':
				socketEventName = 'copyObjects';
				data.events.push(await boardService.getItemFromDb(boardName, event.id));
				break;
			case "delete":
				if (event.id) {
					if (message.sendBack && !message.sendToRedo) {
						socketEventName = "addActionToHistory";
					} else if (message.sendBack && message.sendToRedo) {
						socketEventName = "addActionToHistoryRedo";
					}
					data.events.push(await boardService.getItemFromDb(boardName, event.id));
					db.deleteBoardData(boardName, event.id);
				}
				break;
			case "update":
				await boardService.updateBoard(boardName, event.id, event);
				break;
		}
	}
	if (socketEventName) {
		setTimeout(()=> {
			socket.emit(socketEventName, data);
		}, 1)
	}
}

async function saveHistory(boardName, message, socket) {
	var id = message.id;
	switch (message.type) {
		case "dublicate":
			socket.emit("dublicateObject", message);
			break;
		case 'doc':
			boardService.getImagesCount(boardName).then(res => {
				socket.emit("getImagesCount", res + 1);
			});
			boardService.setData(boardName, id, message);
			break;
		case "delete":
			if (id) {
				if (message.sendBack && !message.sendToRedo) {
					socket.emit("addActionToHistory", message);
				} else if (message.sendBack && message.sendToRedo) {
					socket.emit("addActionToHistoryRedo", message);
				}
				db.deleteBoardData(boardName, id);
			}
			break;
		case "update":
			if (id) boardService.updateBoardData(boardName, id, message);
			break;
		case "child":
			boardService.addChild(boardName, message.parent, message);
			break;
		case "clearBoard":
			boardService.clearAll(boardName);
			socket.broadcast.to(boardName).emit('clearBoard');
			socket.emit('getImagesCount', message.imagesCount);
			break;
		case "background":
			boardService.updateBoardBackground(boardName, message);
			break;
		default: //Add data
			// if (!id) throw new Error("Invalid message: ", message);
			// board.set(id, message);

			if (id) {
				boardService.setItem(boardName, id, message);
			}
	}
}

function generateUID(prefix, suffix) {
	var uid = Date.now().toString(36); //Create the uids in chronological order
	uid += (Math.round(Math.random() * 36)).toString(36); //Add a random character at the end
	if (prefix) uid = prefix + uid;
	if (suffix) uid = uid + suffix;
	return uid;
}

if (exports) {
	exports.start = startIO;
	exports.getStats = getStats;
}
