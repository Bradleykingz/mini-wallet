"use client"

import {Alert, AlertDescription, AlertTitle} from "../../src/components/ui/alert";
import {fetcher} from "../../src/lib/api";
import useSWR from "swr";

export default function AlertBanner({title = "Alert", description = "This is an alert message."}) {

    const {data, isLoading, error} = useSWR("/alerts", fetcher);

    if (isLoading) {
        return (
            <Alert>
                <AlertTitle>Loading...</AlertTitle>
            </Alert>
        );
    }

    if (error) {
        return (
            <Alert>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    if (!data.alerts?.length) {
        return (
            <></>
        )
    }

    return (
        <>
            <Alert>
                <AlertTitle>
                    {title}
                </AlertTitle>
                <AlertDescription>
                    {description}
                </AlertDescription>
            </Alert>
        </>
    )
}