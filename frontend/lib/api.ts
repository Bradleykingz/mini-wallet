import axios, {AxiosInstance, RawAxiosRequestHeaders} from "axios";
import {Tokens} from "../types";
import {toast} from "sonner";

class APIClient {
    private readonly client: AxiosInstance;
    private readonly baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;

        this.client = axios.create({baseURL, headers: this.getAuthHeaders()});

        this.client.interceptors.response.use(
            res => res,
            async (err) => {
                if (
                    err.response?.status === 403 || err.response?.status === 401
                ) {
                    localStorage.removeItem("tokens");
                    window.location.href = "/login";
                    toast.error("Please log in to continue");
                } else {
                    console.error("unknown error", err);
                }
                return Promise.reject(err);
            }
        );
    }

    private getAuthHeaders(): RawAxiosRequestHeaders {
        const rawTokens = localStorage.getItem("tokens");
        const headers: RawAxiosRequestHeaders = {};
        if (rawTokens) {
            const tokens: Tokens = JSON.parse(rawTokens);
            headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return headers;
    }

    fetcher(url: string) {
        return this.client.get(url)
            .then(res => {
                return res.data;
            })
            .catch(err => {
                console.error("Axios error", err);
                throw err;
            });
    }

    login(email: string, password: string) {
        return this.client.post("/auth/login/", {email, password}).then(res => res.data);
    }

    markRead(alertIds: number[]) {
        return this.client.post("/alerts/read/", {alertIds}).then(res => res.data);
    }

    transact(amount: number, type: "credit" | "debit", description?: string, simulate?: boolean) {
        if (simulate){
            return this.client.post("/mock-provider/transact", {amount, type}).then(res => res.data);
        }
        return this.client.post("/wallet/transact/", {amount, type, description, simulate}).then(res => res.data);
    }

    register(email: string, password: string) {
        return this.client.post("/auth/register/", {email, password}).then(res => res.data);
    }
}

export const getApi = (): APIClient => {
    if (typeof window === "undefined") {
        throw new Error("APIClient can only be used in the browser");
    }

    return new APIClient(process.env.NEXT_PUBLIC_API_URL || "http://localhost:2450/api");
};

export const fetcher = async (url: string) => {
    try {
        const client = getApi();
        const cleanedUrl = url.replace(/^\/api/, "");
        return client.fetcher(cleanedUrl);
    } catch (err) {
        console.error("Fetcher error", err);
        throw err;
    }
};
