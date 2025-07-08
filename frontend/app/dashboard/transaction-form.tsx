"use client";

import {Input} from "../../src/components/ui/input";
import {Card, CardContent, CardDescription, CardHeader} from "../../src/components/ui/card";
import {useState} from "react";
import {RadioGroup, RadioGroupItem} from "../../src/components/ui/radio-group";
import {Label} from "../../src/components/ui/label";
import {getApi} from "../../src/lib/api";
import {toast} from "sonner";

export default function TransactionForm() {
    const [type, setType] = useState<"credit" | "debit">("debit");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const form = e.currentTarget;
            const amount = parseFloat(form.amount.value);
            const description = form.description.value;

            const data = await getApi().transact(amount, type, description || undefined);

            toast.info("Transaction successful!", {
                position: "top-right",
            })
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error("could not perform transaction", {
                position: "top-right",
            })
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <h2 className="text-xl font-bold">Transaction form</h2>
                <CardDescription>Create a new transaction</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <RadioGroup defaultValue="credit"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 cursor-pointer text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Submit Transaction"}
                    </button>
                </form>
            </CardContent>
        </Card>
    );
}
