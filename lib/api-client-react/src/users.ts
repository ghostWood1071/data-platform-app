import { customFetch } from "./custom-fetch";

export const deleteUser = (id: string) => {
  return customFetch<void>(`/api/users/${id}`, {
    method: "DELETE",
  });
};
