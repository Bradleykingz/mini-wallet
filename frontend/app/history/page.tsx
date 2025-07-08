"use client";

import TransactionsTable from "./transaction-table";
import AuthGuard from "../../src/components/auth-guard";
import useSWR from "swr";
import {fetcher} from "../../src/lib/api";
import {Button} from "../../src/components/ui/button";

export default function History() {

    const {data: transactionsData, isLoading, error} = useSWR("/wallet/history", fetcher);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div className="p-12">
                <p className="text-red-500">Error loading transactions: {error.message}</p>
            </div>
        );
    }

    return (
        <>
            <AuthGuard>
                <div className={"p-12"}>
                    <div className={"mb-4"}>
                        <Button>
                            <a href={"/dashboard"}>Back to Dashboard</a>
                        </Button>
                    </div>
                    <h2 className={"text-2xl font-bold"}>History</h2>
                    <div>
                        <TransactionsTable transactions={transactionsData}/>
                    </div>
                </div>
            </AuthGuard>
        </>
    )
}