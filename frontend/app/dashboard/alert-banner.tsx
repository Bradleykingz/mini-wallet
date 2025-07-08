import {Alert, AlertDescription, AlertTitle} from "../../src/components/ui/alert";

export default function AlertBanner ({title = "Alert", description = "This is an alert message."}) {
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