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

export function RegistrationForm({className, ...props}: React.ComponentProps<"div">) {

    const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const tokens = await getApi().register(email, password)
            toast.success("Registration successful!", {
                position: "top-right",
            })

            localStorage.setItem("tokens", JSON.stringify(tokens))

            router.push("/dashboard")
        } catch (e) {
            toast.error("Registration failed. Please check your email and password.", {
                position: "top-right",
            })
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Create a new account</CardTitle>
                    <CardDescription>
                        Enter an email and password you will use to login
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
                                    placeholder="wallace@example.com"
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
                                    Register
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

