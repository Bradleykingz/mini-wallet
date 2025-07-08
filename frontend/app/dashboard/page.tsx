"use client";

import BalanceCard from "./balance-card";
import TransactionForm from "./transaction-form";
import AlertBanner from "./alert-banner";
import AuthGuard from "../../src/components/auth-guard";

export default function Dashboard() {

    return (
        <>
            <AuthGuard>
                <div className={"p-12"}>
                    <h2 className={"text-2xl font-bold"}>Dashboard</h2>
                    <div className={"mb-8"}>
                        <AlertBanner/>
                    </div>
                    <div className={"mb-8"}>
                        <BalanceCard />
                    </div>
                    <div>
                        <TransactionForm/>
                    </div>
                </div>
            </AuthGuard>
        </>
    )
}