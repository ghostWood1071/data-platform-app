import { customFetch } from "./custom-fetch";
import type {
  PlatformService,
  PlatformServiceInput,
  PlatformServiceUpdate,
} from "./generated/api.schemas";

export const createService = (payload: PlatformServiceInput) => {
  return customFetch<PlatformService>("/api/services", {
    method: "POST",
    body: JSON.stringify(payload),
    responseType: "json",
  });
};

export const updateService = (id: string, payload: PlatformServiceUpdate) => {
  return customFetch<PlatformService>(`/api/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    responseType: "json",
  });
};

export const deleteService = (id: string) => {
  return customFetch<void>(`/api/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
