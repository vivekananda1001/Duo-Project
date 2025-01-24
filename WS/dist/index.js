"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const cookie = __importStar(require("cookie"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const stringGen_1 = __importDefault(require("./utils/stringGen"));
const prisma_1 = require("./utils/prisma");
dotenv_1.default.config();
const port = process.env.PORT || "8000";
const PORT = parseInt(port);
const wss = new ws_1.WebSocketServer({ port: PORT });
const userSocketMap = new Map();
const roomUserMap = new Map();
wss.on('connection', function (socket, req) {
    const cookies = req.headers.cookie;
    console.log("New user connected!");
    if (!cookies) {
        console.log("No cookies found!");
        socket.close();
        return;
    }
    const parsedCookies = cookie.parse(cookies);
    const authToken = parsedCookies.auth_token;
    if (!authToken) {
        console.log("auth_token not found in cookies!");
        socket.send("Invalid Auth Token");
        socket.close();
        return;
    }
    const decoded = jsonwebtoken_1.default.verify(authToken, process.env.JWT_SECRET || "");
    if (!decoded || !decoded.id) {
        console.log("Invalid or expired JWT token!");
        socket.close();
        return;
    }
    const userId = decoded.id;
    userSocketMap.set(userId, socket);
    socket.on("message", (e) => __awaiter(this, void 0, void 0, function* () {
        console.log("Received: %s", e);
        try {
            const parsedMsg = JSON.parse(e);
            if (!parsedMsg.type) {
                console.error("Error: 'type' field is missing in the message.");
                return;
            }
            const msgType = parsedMsg.type;
            console.log("Message type: ", msgType);
            if (msgType === "Create") {
                let roomName = parsedMsg.name;
                if (!roomName)
                    roomName = (0, stringGen_1.default)();
                const room = yield prisma_1.client.room.create({
                    data: {
                        name: roomName,
                        users: {
                            connect: [{ id: userId }],
                        }
                    }
                });
                roomUserMap.set(room.id, [userId]);
                socket.send("Welcome to room: " + roomName + "\nYour RoomId is: " + room.id);
            }
            else if (msgType === "Join") {
                const roomId = parsedMsg.roomId;
                if (!roomId) {
                    console.error("Error: 'id' field is missing in the message.");
                    return;
                }
                const room = yield prisma_1.client.room.findUnique({
                    where: { id: roomId },
                    include: { users: true }
                });
                if (!room) {
                    console.error("Error: Invalid room or user.");
                    socket.send("Invalid Room or User");
                    return;
                }
                const currentUsers = roomUserMap.get(room.id) || [];
                if (currentUsers.includes(userId)) {
                    console.error("User already in the room.");
                    socket.send("You are already in this room.");
                    return;
                }
                if (currentUsers.length >= 2) {
                    console.error("Room is full.");
                    socket.send("Room is full!");
                    return;
                }
                currentUsers.push(userId);
                yield prisma_1.client.room.update({
                    where: { id: roomId },
                    data: {
                        users: {
                            connect: [{ id: userId }, { id: room.users[0].id }],
                        }
                    }
                });
                roomUserMap.set(room.id, currentUsers);
                socket.send("Welcome to room: " +
                    room.name +
                    "\nYour RoomId is: " +
                    room.id);
            }
            else if (msgType === "Message") {
                const roomId = parsedMsg.roomId;
                if (!roomId) {
                    console.error("Error: 'roomId' field is missing in the message.");
                    return;
                }
                // check if the user is in the given roomId
                const currentUsers = roomUserMap.get(roomId) || [];
                if (!currentUsers.includes(userId)) {
                    console.error("User not in the room.");
                    socket.send("You are not in this room.");
                    return;
                }
                // send the message to all users in the room
                const sender = yield prisma_1.client.user.findUnique({ where: { id: userId } });
                if (!sender) {
                    console.error("Error: Invalid user.");
                    socket.send("Invalid User");
                    return;
                }
                const message = parsedMsg.message;
                if (!message) {
                    console.error("Error:'message' field is missing in the message.");
                    socket.send("No message");
                    return;
                }
                // add the message to chat database
                const chat = yield prisma_1.client.chat.create({
                    data: {
                        message,
                        user: { connect: { id: userId } },
                        room: { connect: { id: roomId } }
                    }
                });
                currentUsers.forEach((userId) => __awaiter(this, void 0, void 0, function* () {
                    const userSocket = userSocketMap.get(userId);
                    if (userSocket) {
                        userSocket.send(sender.name + ": " + message + "\n");
                    }
                }));
            }
        }
        catch (error) {
            console.error("Invalid JSON message received:", error);
            socket.send("Invalid JSON Message");
            return;
        }
    }));
});
