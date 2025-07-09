"use client";

import BalanceCard from "./balance-card";
import TransactionForm from "./transaction-form";
import AlertBanner from "./alert-banner";
import AuthGuard from "../../components/auth-guard";
import {Button} from "../../components/ui/button";

export default function Dashboard() {

    async function logout() {
        localStorage.removeItem("tokens");
        window.location.href = "/login";
    }

    return (
        <>
            <AuthGuard>
                <div className={"p-12"}>
                    <h2 className={"text-2xl font-bold"}>Dashboard</h2>
                    <div className={"mb-8"}>
                        <AlertBanner/>
                    </div>
                    <div className={"mb-8"}>
                        <div className={"flex justify-between"}>

                            <Button variant={"default"} className={"mb-4"} asChild>
                                <a href={"/history"}>View all transactions</a>
                            </Button>

                            <Button variant={"default"}
                                    className={"mb-4"}
                                    asChild
                                    onClick={logout}
                            >
                                <a href={"#"}>Logout</a>
                            </Button>
                        </div>
                        <BalanceCard/>
                    </div>
                    <div>
                        <TransactionForm/>
                    </div>
                </div>
            </AuthGuard>
        </>
    )
}