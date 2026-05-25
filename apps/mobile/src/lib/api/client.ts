import { getClerkInstance } from "@clerk/clerk-expo";
import axios, { AxiosError } from "axios";

import { env } from "../env";

export interface ApiError {
  status: number | undefined;
  message: string;
  raw: unknown;
}

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
});

// Inject the Clerk session JWT on every request. Works outside React because
// getClerkInstance() returns the singleton initialized by <ClerkProvider>.
api.interceptors.request.use(async (config) => {
  const token = await getClerkInstance().session?.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize NestJS error shape: { statusCode, message: string | string[], error }.
// class-validator returns `message` as an array — flatten so the UI gets one string.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const data = error.response?.data;
    const message = Array.isArray(data?.message)
      ? data!.message.join(", ")
      : data?.message ?? error.message;

    const apiError: ApiError = {
      status: error.response?.status,
      message,
      raw: data ?? error,
    };
    return Promise.reject(apiError);
  },
);
