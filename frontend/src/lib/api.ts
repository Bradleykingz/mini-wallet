import axios, {AxiosInstance, AxiosResponse, RawAxiosRequestHeaders} from "axios";
import {Tokens} from "../../types";
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
        console.log("axios GET", url, this.getAuthHeaders());
        return this.client.get(url)
            .then(res => {
                console.log("Response:", res.data);
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

    transact(amount: number, type: "credit" | "debit", description?: string) {
        return this.client.post("/wallet/transact/", {amount, type, description}).then(res => res.data);
    }

    register(name: string, email: string, password1: string, password2: string) {
        return this.client.post("/auth/signup/", {name, email, password1, password2}).then(res => res.data);
    }

    getTokens() {
        const tokens = localStorage.getItem("tokens");
        if (!tokens) {
            return null;
        }

        return JSON.parse(tokens) as Tokens;
    }
}

let api: APIClient | null = null;

export const getApi = (): APIClient => {
    if (typeof window === "undefined") {
        throw new Error("APIClient can only be used in the browser");
    }

    if (!api) {
        api = new APIClient(process.env.API_URL || "http://localhost:2499/api");
    }

    return api;
};

export const fetcher = async (url: string) => {
    try {
        const client = getApi();
        const cleanedUrl = url.replace(/^\/api/, "");
        const result = await client.fetcher(cleanedUrl);
        return result;
    } catch (err) {
        console.error("Fetcher error", err);
        throw err;
    }
};
