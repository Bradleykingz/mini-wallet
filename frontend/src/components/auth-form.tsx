"use client"

import {cn} from "../lib/utils"
import {Button} from "./ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "./ui/card"
import {Input} from "./ui/input"
import {Label} from "./ui/label"

import {useState} from "react"
import {getApi} from "../lib/api";

import {toast} from "sonner"
import {useRouter} from "next/navigation";

export function AuthForm({className, ...props}: React.ComponentProps<"div">) {

    const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const tokens = await getApi().login(email, password)
            toast.success("Login successful!", {
                position: "top-right",
            })

            localStorage.setItem("tokens", JSON.stringify(tokens))

            router.push("/dashboard")
        } catch (e) {
            toast.error("Login failed. Please check your email and password.", {
                position: "top-right",
            })
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="m@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full cursor-pointer">
                                    Login
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

