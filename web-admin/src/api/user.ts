import request from './request';

export interface LoginUserVO {
  id: number;
  userAccount?: string;
  userName: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: 'admin' | 'user';
  memberLevel?: string;
  memberPlanType?: string;
  pointBalance?: number;
  memberExpireTime?: string;
  createTime?: string;
  token?: string;
}

export interface UserVO {
  id: number;
  userAccount: string;
  userName?: string;
  userAvatar?: string;
  userRole: string;
  memberLevel?: string;
  memberPlanType?: string;
  pointBalance?: number;
  memberExpireTime?: string;
  createTime?: string;
}

export async function login(params: { userAccount: string; userPassword: string }) {
  return request.post('/user/login', params) as Promise<{ data: LoginUserVO }>;
}

export async function logout() {
  return request.post('/user/logout') as Promise<{ data: boolean }>;
}

export async function getLoginUser() {
  return request.get('/user/get/login') as Promise<{ data: LoginUserVO }>;
}

export async function listUserByPage(params: any) {
  return request.post('/user/list/page/vo', params) as Promise<any>;
}

export async function updateUser(params: any) {
  return request.post('/user/update', params) as Promise<{ data: boolean }>;
}

export async function deleteUser(params: { id: number }) {
  return request.post('/user/delete', params) as Promise<{ data: boolean }>;
}

export async function deleteUserBatch(params: { ids: number[] }) {
  return request.post('/user/delete/batch', params) as Promise<{ data: boolean }>;
}

export async function addUser(params: any) {
  return request.post('/user/add', params) as Promise<{ data: number }>;
}
