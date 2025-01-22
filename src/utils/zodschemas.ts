import { z } from "zod"

// model User {
//     id               Int      @id @default(autoincrement())
//     email            String   @unique
//     password         String
//     name             String
//     profileUrl       String
//     created_at       DateTime @default(now())
//     rooms            Room[]   @relation("UserRooms")
//     chats            Chat[]
// }


const signUpSchema = z.object({
    email: z
    .string()
    .email()
    .min(5)
    .max(255),
    password: z
    .string()
    .min(5)
    .max(50)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
    name: z
    .string()
    .min(5)
    .max(255),
    
})

const signInSchema = z.object({
    email: z
    .string()
    .email()
    .min(5)
    .max(255),
    password: z
    .string()
    .min(5)
    .max(50)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
})

export {
    signUpSchema,
    signInSchema,
}