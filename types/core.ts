export type Company = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Administrator = {
  id: string;
  userId: string;
  createdAt: string;
};
