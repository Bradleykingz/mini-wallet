"use client"

import {useEffect, useState} from "react";
import {Alert, AlertDescription, AlertTitle} from "../../src/components/ui/alert";
import {fetcher, getApi} from "../../src/lib/api";
import useSWR from "swr";
import {Button} from "../../src/components/ui/button";
import {toast} from "sonner";

type AlertData = {
    alerts: {
        id: number;
        title: string;
        message: string;
        level: "info" | "warning" | "error";
        createdAt: string;
    }[];
    source: string;
};

export default function AlertBanner() {
    const {data, isLoading, error} = useSWR<AlertData>("/alerts", fetcher);

    // Keep track of the current alerts in local state for dismissing
    const [alertStack, setAlertStack] = useState<AlertData["alerts"]>([]);

    // Whenever we get new alerts from API, reset the stack
    useEffect(() => {
        if (data?.alerts) {
            setAlertStack(data.alerts);
        }
    }, [data?.alerts]);

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

    if (!alertStack.length) {
        return null;
    }

    // Show only the last alert in the stack
    const current = alertStack[alertStack.length - 1];

    async function markRead(alertId: number) {
        try {
            await getApi().markRead([alertId])
        } catch (error) {
            console.error("Error marking alert as read:", error);
            toast.error(error.message);
        }
    }

    const handleDismiss = async () => {
        setAlertStack((prev) => prev.slice(0, -1));
        await markRead(current.id);
    };

    return (
        <Alert variant={"destructive"}>
            <AlertTitle>
                <span
                    className={"font-bold text-xl"}>{current.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())}</span>
            </AlertTitle>
            <AlertDescription>{current.message}</AlertDescription>
            <AlertDescription>
                <span className={"text-sm text-gray-500"}>Created on {new Date(current.createdAt).toLocaleString()}</span>
            </AlertDescription>
            <Button className={"cursor-pointer w-fit"}
                    variant={"destructive"}
                    onClick={handleDismiss}
            >
                Dismiss
            </Button>
        </Alert>
    );
}