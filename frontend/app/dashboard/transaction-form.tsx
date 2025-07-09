"use client";

import {Input} from "../../components/ui/input";
import {Card, CardContent, CardDescription, CardHeader} from "../../components/ui/card";
import {useState} from "react";
import {RadioGroup, RadioGroupItem} from "../../components/ui/radio-group";
import {Label} from "../../components/ui/label";
import {getApi} from "../../lib/api";
import {toast} from "sonner";
import {mutate} from "swr";
import {Button} from "../../components/ui/button";
import {Switch} from "../../components/ui/switch";
import {AxiosError} from "axios";

export default function TransactionForm() {
    const [type, setType] = useState<"credit" | "debit">("debit");
    const [loading, setLoading] = useState(false);
    const [simulate, setSimulate] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const form = e.currentTarget;
            const amount = parseFloat(form.amount.value);
            const description = form.description.value;

            const response = await getApi().transact(amount, type, description || undefined, simulate);

            let updatedWallet = response;
            if (response.updatedWallet) {
                updatedWallet = response.updatedWallet; // different structure for simulated transactions
            }

            await mutate("/wallet/balance", updatedWallet, false); // Optimistically update the balance
            await mutate("/alerts"); // Refresh alerts

            toast.info("Transaction successful!", {
                position: "top-right",
            })
            form.reset();
        } catch (error) {
            const message = error instanceof AxiosError ? error.response.data.message : error.message;
            console.error(error);
            toast.error(message, {
                position: "top-right",
            })
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <h2 className="text-xl font-bold">Transaction form</h2>
                <CardDescription>Deposit money to your account, or send money</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <RadioGroup defaultValue="debit"
                                        onValueChange={(e) => setType(e as "credit" | "debit")}
                                        className="flex space-x-4 mt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="credit" id="credit"/>
                                    <Label htmlFor="credit">Deposit money</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="debit" id="debit"/>
                                    <Label htmlFor="debit">Send Money</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label htmlFor="simulate">Simulate Third-party Processor</Label>
                            <Switch id={"simulate"}
                                    className={"cursor-pointer"}
                                    checked={simulate}
                                    onCheckedChange={(e) => setSimulate(e)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                type="number"
                                id="amount"
                                name="amount"
                                required
                                placeholder="$14.99"
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                name="description"
                                rows={3}
                                placeholder="A brief description of the transaction"
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full cursor-pointer text-white py-2 px-4 rounded-md disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Submit Transaction"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
