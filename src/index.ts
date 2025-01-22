import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth/authRoutes";

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use('/api/v1/auth',authRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
