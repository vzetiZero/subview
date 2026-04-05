export type SessionAdmin = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
};

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
};

export type QueryRow = Record<string, any>;
