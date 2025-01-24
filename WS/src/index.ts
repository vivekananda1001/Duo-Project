import { WebSocketServer, WebSocket } from "ws";
import * as cookie from "cookie";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from 'dotenv';
import generateRandomString from "./utils/stringGen";
import { client } from "./utils/prisma";
dotenv.config();
const port = process.env.PORT || "8000";
const PORT = parseInt(port); 
const wss = new WebSocketServer({ port: PORT });

const userSocketMap = new Map<number, WebSocket>(); 
const roomUserMap = new Map<number, number[]>();
wss.on('connection', function (socket,req){
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

    const decoded = jwt.verify(authToken,process.env.JWT_SECRET||"");


    if (!decoded || !(decoded as JwtPayload).id) {
        console.log("Invalid or expired JWT token!");
        socket.close(); 
        return;
    }
    
    const userId = (decoded as JwtPayload).id;
    userSocketMap.set(userId, socket);

    socket.on("message",async (e)=>{
        console.log("Received: %s", e);
        try{
            const parsedMsg = JSON.parse(e as unknown as string);
            if (!parsedMsg.type) {
                console.error("Error: 'type' field is missing in the message.");
                return;
            }

            const msgType = parsedMsg.type;
            console.log("Message type: ",msgType);
            
            if(msgType==="Create"){
                let roomName = parsedMsg.name;
                if(!roomName)roomName = generateRandomString(); 

                const room = await client.room.create({
                    data: {
                        name: roomName,
                        users: {
                            connect: [{ id: userId }],
                        }
                    }
                });

                roomUserMap.set(room.id, [userId]);
                socket.send("Welcome to room: "+roomName+"\nYour RoomId is: "+room.id);
            }
            else if(msgType==="Join"){
                const roomId = parsedMsg.roomId;
                if(!roomId) {
                    console.error("Error: 'id' field is missing in the message.");
                    return;
                }

                const room = await client.room.findUnique({
                    where: { id: roomId },
                    include: { users: true }
                })

                if(!room){
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

                await client.room.update({
                    where: { id: roomId },
                    data: {
                        users: {
                            connect: [{ id: userId },{ id: room.users[0].id}],
                        }
                    }
                })
                roomUserMap.set(room.id, currentUsers);

                socket.send(
                    "Welcome to room: " +
                        room.name +
                        "\nYour RoomId is: " +
                        room.id
                );

            }
            else if(msgType === "Message"){
                const roomId = parsedMsg.roomId;
                if(!roomId) {
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
                const sender = await client.user.findUnique({ where: { id: userId } });
                if(!sender){
                    console.error("Error: Invalid user.");
                    socket.send("Invalid User");
                    return;
                }

                const message = parsedMsg.message;

                if(!message) {
                    console.error("Error:'message' field is missing in the message.");
                    socket.send("No message");
                    return;
                }

                // add the message to chat database
                const chat = await client.chat.create({
                    data: {
                        message,
                        user: { connect: { id: userId }},
                        room: { connect: { id: roomId }}
                    }
                });

                currentUsers.forEach(async (userId) => {
                    const userSocket = userSocketMap.get(userId);
                    if (userSocket){
                        userSocket.send(
                            sender.name + ": " + message + "\n"
                        );
                    }
                });
            }
            else if(msgType === "Leave"){
                const roomId = parsedMsg.roomId;
                if(!roomId) {
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
                
                await client.room.update({
                    where: { id: roomId },
                    data: {
                        users: { disconnect: { id: userId }},
                    }
                })

                // remove the user from the room
                currentUsers.splice(currentUsers.indexOf(userId), 1);
                roomUserMap.set(roomId, currentUsers);

                socket.send("Left room: " + roomId);
            }
        }catch(error){
            console.error("Invalid JSON message received:", error);
            socket.send("Invalid JSON Message");
            return;
        }
    });
});

