import express from "express";
import { signIn, signUp } from "./mainAuth";
const app = express.Router();

app.post("/signup",signUp);
app.post("/signin",signIn);

export default app;