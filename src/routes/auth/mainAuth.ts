import { Request, Response } from 'express';
import { client } from '../../utils/prisma';
import { signInSchema, signUpSchema } from '../../utils/zodschemas';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Signin Schema
// Signup Schema

export const signUp = async (req: Request, res: Response):Promise<void> => {
    const validationResult = signUpSchema.safeParse(req.body);

    if(!validationResult.success){
        res.status(400).json({
            error: "Validation unsuccesful. incorrect input.",
            details: validationResult.error.errors,
        });
        return;
    }

    const { email, password, name } = req.body;

    try{
        const userFromDb = await client.user.findFirst({
            where: {email : email}
        });
        
        const hashedPassword = await bcrypt.hash(password,5);
        if (userFromDb) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        const user = await client.user.create({
            data: {
                email: email,
                password: hashedPassword,
                name: name,
            }
        });

        res.status(201).json({ message: "User created successfully", user });
        return;
    }
    catch(error){
        console.error("Error while fetching user from db", error);
        res.status(500).json({ message: "Server Error" });
        return;
    }
};

export const signIn = async (req: Request, res: Response):Promise<void> => {
    const validationResult = signInSchema.safeParse(req.body);
    const { email, password } = req.body;
    
    if(!validationResult.success) {
        res.status(400).json({
            error: "Validation unsuccessful. Incorrect input.",
            details: validationResult.error.errors,
        });
        return;
    }

    try{
        const user = await client.user.findFirst({
            where: { 
                email: email,
            }
        });

        if(!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "1h" }
        )

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 3600000,
        })

        res.json({ 
            message: "User signed in successfully",
            user 
        });

        return;
    }
    catch(error){
        console.error("Error while fetching user from db", error);
        res.status(500).json({ message: "Server Error" });
        return;
    }
};
