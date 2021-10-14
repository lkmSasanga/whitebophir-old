const db = require('./db/db.js');
const config = require('./configuration.js');


class BoardService {
    constructor() {
        setInterval(() => {
            let saveTime = Date.now()-3000;
            if (Object.keys(this.items).length !== 0) {
                for (let boardName in this.items ) {
                    for (let id in this.items[boardName]) {
                        let currentItem = this.items[boardName][id];
                        if (currentItem.lastUpdateTime && currentItem.lastUpdateTime < saveTime) {
                            this.save(boardName, currentItem.id)
                        }
                    }
                }
            }

        }, 3000)
    }
    items = {};
    async addChild(boardName, parentId, child) {
        let parent = await this.getItem(boardName, parentId);
        if (!parent) return;
        if (typeof parent !== "object") return false;
        parent.lastUpdateTime = Date.now();
        if (Array.isArray(parent._children)) parent._children.push(child);
        else parent._children = [child]
        this.items[boardName][parentId] = parent;
    }

    async getItem(boardName, id) {
        if(!(this.items[boardName] && this.items[boardName][id])) {
            this.items[boardName] = {};
            let itemFromDb = await this.getItemFromDb(boardName, id);
            this.items[boardName][id] = itemFromDb;
            return itemFromDb;
        }

        return this.items[boardName][id]
    }

    async getItemFromDb(boardName, id) {
        return db.getBoardItem(boardName, id);
    }

    save(boardName, parentId) {
        this.update(boardName, parentId, this.items[boardName][parentId])
        delete this.items[boardName][parentId];
    }

    update(boardName, id, obj) {
        this.validate(obj);
        if (obj.tool === 'Pencil') {
            db.updateBoardData(boardName, id, obj);
        } else {
            db.addDataToBoard(boardName, id, obj);
        }
    };

    setItem(boardName, id, item) {
        this.validate(item);
        item.lastUpdateTime = Date.now();
        if (!this.items[boardName]) {
            this.items[boardName] = {};
        }
        this.items[boardName][id] = item;
        delete item.lastUpdateTime;
        db.addDataToBoard(boardName, id, item);
    }

    validate (item, parent) {
        if (item.hasOwnProperty("size")) {
            item.size = parseInt(item.size) || 1;
            item.size = Math.min(Math.max(item.size, 1), 50);
        }
        if (item.hasOwnProperty("x") || item.hasOwnProperty("y")) {
            item.x = parseFloat(item.x) || 0;
            item.x = Math.min(Math.max(item.x, 0), config.MAX_BOARD_SIZE_X);
            item.x = Math.round(10 * item.x) / 10;
            item.y = parseFloat(item.y) || 0;
            item.y = Math.min(Math.max(item.y, 0), config.MAX_BOARD_SIZE_Y);
            item.y = Math.round(10 * item.y) / 10;
        }
        if (item.hasOwnProperty("opacity")) {
            item.opacity = Math.min(Math.max(item.opacity, 0.1), 1) || 1;
            if (item.opacity === 1) delete item.opacity;
        }
        if (item.hasOwnProperty("_children")) {
            if (!Array.isArray(item._children)) item._children = [];
            if (item._children.length > config.MAX_CHILDREN) item._children.length = config.MAX_CHILDREN;
            for (var i = 0; i < item._children.length; i++) {
                this.validate(item._children[i]);
            }
        }
    }

    clearAll(boardName) {
        db.deleteAllBoardData(boardName)
    }

    updateBoardBackground(boardName, data) {
        this.validate(data);
        let board = {data};
        db.updateBoard(boardName, board);
    };

    async updateBoardData(boardName, id, data) {
        delete data.type;
        delete data.tool;
        let obj = await this.getItem(boardName, id);
        if (obj) {
            obj.lastUpdateTime = Date.now();
            if (typeof obj !== null) {
                for (let i in data) {
                    obj[i] = data[i];
                }
            }
        } else {
            this.addDataToBoard(boardName, id, data)
        }
    }

    addDataToBoard(boardName, id, data) {
        this.validate(data);
        db.addDataToBoard(boardName, id, data);
    }

    async updateBoard(boardName, id, data) {
        delete data.type;
        delete data.tool;
        let obj = await this.getItem(boardName, id);
        if (typeof obj === "object") {
            for (let i in data) {
                obj[i] = data[i];
            }
        }
        if (!obj) {
            return;
            // this.setItem(boardName, id, data)
        } else {
            this.validate(obj);
            db.updateBoardData(boardName, id, obj);
        }
    }

    setData(boardName, id, data) {
        data.time = Date.now();
        this.addDataToBoard(boardName, id, data);
    };

    async getImagesCount(boardName) {
        let images = await db.getBoardData(boardName, 'doc');
        return images.length;
    };
}

module.exports = {
    BoardService
};
