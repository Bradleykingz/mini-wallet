"use client";

import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";

type AuthGuardProps = {
    children: React.ReactNode;
}

export default function AuthGuard({children}: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
        const hasToken = !!localStorage.getItem("tokens");

        if (!hasToken) {
            console.log("No token found");
            // router.replace(`/login`);
        } else {
            setIsAuthenticating(false);
        }
    }, [pathname, searchParams, router]);

    if (isAuthenticating) {
        return <p>Loading...</p>;
    }

    return <>{children}</>;
}