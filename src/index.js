import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

import { getSockets } from "./utils/helper.js";
import { Message } from "./models/message.model.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { socketAuthenticator } from "./middlewares/auth.middleware.js";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  corsOptions,
} from "./constants.js";

dotenv.config({
  path: "./.env",
});
const onlineUsers = new Set();
connectDB()
  .then(() => {
    app.set("io", io);

    const server = createServer(app);
    const io = new Server(server, {
      cors: corsOptions,
    });

    io.use((socket, next) => {
      cookieParser()(
        socket.request,
        socket.request.res,
        async (err) => await socketAuthenticator(err, socket, next)
      );
    });

    io.on("connection", (socket) => {
      const user = socket.user;
      userSocketIDs.set(user._id.toString(), socket.id);

      socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
        const messageForRealTime = {
          content: message,
          _id: uuid(),
          sender: {
            _id: user._id,
            name: user.name,
          },
          chat: chatId,
          createdAt: new Date().toISOString(),
        };

        const messageForDB = {
          content: message,
          sender: user._id,
          chat: chatId,
        };

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_MESSAGE, {
          chatId,
          message: messageForRealTime,
        });
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

        try {
          await Message.create(messageForDB);
        } catch (error) {
          throw new Error(error);
        }
      });

      socket.on(START_TYPING, ({ members, chatId }) => {
        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(START_TYPING, { chatId });
      });

      socket.on(STOP_TYPING, ({ members, chatId }) => {
        const membersSockets = getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING, { chatId });
      });

      socket.on(CHAT_JOINED, ({ userId, members }) => {
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
      });

      socket.on(CHAT_LEAVED, ({ userId, members }) => {
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
      });

      socket.on("disconnect", () => {
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
      });
    });

    app.use(errorMiddleware);

    server.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
