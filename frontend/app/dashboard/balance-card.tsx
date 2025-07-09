"use client";

import {Card, CardHeader} from "../../components/ui/card";
import useSWR from "swr";
import {fetcher} from "../../lib/api";

export default function BalanceCard() {

    const {data: balanceData, isLoading, error} = useSWR("/wallet/balance", fetcher);


    if (isLoading) {
        return (
            <p>
                Loading balance...
            </p>
        )
    }

    if (error) {
        return (
            <>
              <pre>
                    {JSON.stringify(balanceData, null, 2)}
                </pre>
                <p className="text-red-500">

                    Error loading balance: {error.message}
                </p>
            </>

        )
    }

    return (
        <Card className={"max-w-sm"}>
            <CardHeader>
                <h2 className="text-2xl font-bold">Balance</h2>
                <p className="text-lg text-muted-foreground">
                    {Number(balanceData.balance).toLocaleString("en-US", {
                        style: "currency",
                        currency: balanceData.currency,
                    })}
                </p>
            </CardHeader>
        </Card>
    );
}