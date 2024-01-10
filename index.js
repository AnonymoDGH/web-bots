const path = require("path");
const fs = require("fs");
const Vec3 = require("vec3");

const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const autoArmor = require("@nxg-org/mineflayer-auto-armor").getPlugin();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const bots = [];

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

let files = [];

const getFilesRecursively = (directory) => {
    const filesInDirectory = fs.readdirSync(directory);
    for(const file of filesInDirectory) {
        let absolute = path.join(directory, file);
        if(fs.statSync(absolute).isDirectory()) {
            getFilesRecursively(absolute);
        } else {
            files.push(absolute);
            let routePath = `/${path.relative("public/", absolute)}`.replaceAll("\\", "/");
            if(routePath.includes("index.html")) routePath = "/";
            app.get(routePath, (req, res) => {
                return res.sendFile(absolute, {
                    root: '.'
                });
            });
        };
    };
};
getFilesRecursively("./public");

io.on("connection", (socket) => {
    socket.on("con", (username, host, port, version) => {
        if(bots.filter(_bot => _bot.username == username).length) username += "_" + Math.floor(Math.random() * 100);

        const bot = mineflayer.createBot({
            host,
            port: port || "25565",
            version,
            username
        });

        bot.loadPlugin(pathfinder);
        bot.loadPlugin(autoArmor);

        bot.on('chat', (username, message) => {
 if (username === bot.username) return; // Ignora los mensajes del bot
 io.emit('chat message', { username, message });
});
        bots.push(bot);

        bot.on("messagestr", msg => {
            // console.log(msg);
        });

        bot.on("kicked", (reason, loggedIn) => {
            const index = bots.indexOf(bot);
            if(index !== -1) {
                bots.splice(index, 1);
            };
        });

        bot.on("windowOpen", (window) => {
            if(window.title.includes("режим") || window.title.includes("сервер")) {
                bot.clickWindow(9, 0, 0);
            };
        });
    });
    
    socket.on("mineStart", id => {
        for(let i in bots) {
            const bot = bots[i];
            bot.mining = true;
        
            const targetBlocks = bot.findBlocks({
                matching: (block) => block.name == id,
                maxDistance: 64,
                count: 256
            });
        
            if (targetBlocks.length) {
                targetBlocks.sort((a, b) => {
                    const distA = bot.entity.position.distanceTo(new Vec3(a.x, a.y, a.z));
                    const distB = bot.entity.position.distanceTo(new Vec3(b.x, b.y, b.z));
                    return distA - distB;
                });
        
                const digNextBlock = () => {
                    if (bot.mining) {
                        const targetBlockPosition = targetBlocks.shift();
                        if (targetBlockPosition) {
                            const targetBlock = bot.blockAt(targetBlockPosition);
        

                            const defaultMovements = new Movements(bot);
                            defaultMovements.allow1by1towers = false;
                            defaultMovements.canDig = true;
                            defaultMovements.placecost = 256;
                            defaultMovements.
                            bot.pathfinder.setMovements(defaultMovements);
                            bot.pathfinder.setGoal(new goals.GoalNear(targetBlockPosition.x, targetBlockPosition.y, targetBlockPosition.z, 1));
        
                            bot.once('goal_reached', () => {
                                // bot.pathfinder.setGoal(new goals.GoalBlock(targetBlock.x, targetBlock.y, targetBlock.z));
                                bot.dig(targetBlock).then(() => {
                                    setTimeout(digNextBlock, 500);
                                }).catch(() => {
                                    setTimeout(digNextBlock, 500);
                                });
                            });
                        };
                    };
                };
        
                digNextBlock();
            };
        };
    });

    socket.on("invDump", () => {
        bots.forEach(async bot => {
            var inventoryItemCount = bot.inventory.items().length;
            if(inventoryItemCount === 0) return;
        
            while(inventoryItemCount > 0) {
                const item = bot.inventory.items()[0];
                await bot.tossStack(item);
                await sleep(100);
                inventoryItemCount--;
            };
        });
    });

    socket.on("come", (targetNickname, radius) => {
        bots.forEach((bot, index) => {
            const targetPlayer = bot.players[targetNickname];

            const angle = (Math.PI * 2) / bots.length * index;
            const xOffset = Math.cos(angle) * radius;
            const zOffset = Math.sin(angle) * radius;

            if(targetPlayer.entity)
                bot.pathfinder.setGoal(new goals.GoalNear(targetPlayer.entity.position.x + xOffset, targetPlayer.entity.position.y, targetPlayer.entity.position.z + zOffset, 1));
        });
    });

    socket.on("follow", targetNickname => {
        bots.forEach(bot => {
            const target = bot.players[targetNickname];

            if(target) {
                const followInterval = setInterval(() => {
                    bot.pathfinder.setGoal(new goals.GoalFollow(target.entity, 1), true);
                }, 100);

                socket.once("followStop", () => {
                    clearInterval(followInterval);
                    bot.pathfinder.setGoal(null);
                });
            };
        });
    });

    socket.on("goto", (x, y, z) => {
        bots.forEach(bot => {
            bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z), true);
        });
    });

    socket.on("autoarmor", (value) => {
        for(let i in bots) {
            if(value) bots[i].autoArmor.enable();
            else bots[i].autoArmor.disable();
        };
    });

    socket.on("botStop", () => {
        bots.forEach(bot => {
            bot.pathfinder.setGoal(null);
        });
    });

    socket.on("selectSlot", slot => {
        bots.forEach(bot => {
            bot.setQuickBarSlot(slot);
        });
    });

    socket.on("say", message => {
        bots.forEach(bot => {
            bot.chat(message);
        });
    });

    socket.on("connect", () => {
        alert('Online Bot');
    });
});

server.listen(443, () => {
    console.log(`Server is running on port 443`);
});
