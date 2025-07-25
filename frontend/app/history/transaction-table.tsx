import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table"
import {Transaction} from "../../types";


export default function TransactionTable({transactions}: { transactions: Transaction[] }) {
    return (
        <Table>
            <TableCaption>A list of your recent transactions.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map((transaction) => (
                    <TableRow key={transaction.referenceId}>
                        <TableCell className="font-medium">{transaction.referenceId}</TableCell>
                        <TableCell>{transaction.status}</TableCell>
                        <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{transaction.description || "No description"}</TableCell>
                        <TableCell className="text-right">
                            {
                                transaction.type == "debit" || transaction.type == "cash_out" ? (
                                    <>
                                        -{Number(transaction.amount).toLocaleString("en-US", {
                                        style: "currency",
                                        currency: transaction.currency,
                                    })}
                                    </>
                                ) : (
                                    <>
                                        +{Number(transaction.amount).toLocaleString("en-US", {
                                        style: "currency",
                                        currency: transaction.currency,
                                    })}
                                    </>
                                )
                            }
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={4}>Balance</TableCell>
                    <TableCell className="text-right">
                        {
                            transactions.reduce((total, transaction) => {
                                return total + (transaction.type === "debit" || transaction.type === "cash_out" ? -parseInt(transaction.amount) : parseInt(transaction.amount));
                            }, 0).toLocaleString("en-US", {
                                style: "currency",
                                currency: transactions[0]?.currency || "USD",
                            })
                        }
                    </TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    )
}
