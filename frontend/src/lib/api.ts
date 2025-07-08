import axios, {AxiosInstance, AxiosResponse, RawAxiosRequestHeaders} from "axios";
import {Tokens} from "../../types";

class APIClient {
    private readonly client: AxiosInstance;
    private readonly baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;

        this.client = axios.create({baseURL, headers: this.getAuthHeaders()});

    }

    private getAuthHeaders(): RawAxiosRequestHeaders {
        const rawTokens = localStorage.getItem("tokens");
        const headers: RawAxiosRequestHeaders = {};
        if (rawTokens) {
            const tokens: Tokens = JSON.parse(rawTokens);
            headers.Authorization = `Bearer ${tokens.access_token}`;
        }
        return headers;
    }

    fetcher(url: string) {
        return this.client.get(url).then(res => res.data);
    }

    login(email: string, password: string) {
        return this.client.post("/auth/login/", {email, password}).then(res => res.data);
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
        api = new APIClient(process.env.API_URL || "http://localhost:2499");
    }

    return api;
};

export const fetcher = (url: string) => getApi().fetcher(url);
