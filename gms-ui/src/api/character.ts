import axios from 'axios';
import { PageState } from '@/store/page';

export interface CharacterListItem {
  id: number;
  accountId: number;
  name: string;
  job: number;
  jobName: string;
  level: number;
  exp: number;
  ap: number;
  map: number;
  world: number;
  worldName: string;
  gm: number;
  meso: number;
  fame: number;
  guildid: number;
  createdate: string;
  lastLogoutTime: string;
  online: boolean;
}

export interface CharacterListReq {
  pageNo?: number;
  pageSize?: number;
  id?: number;
  name?: string;
  accountId?: number;
  world?: number;
}

/**
 * 角色编辑表单。仅开放安全字段——背包/装备/技能等关联表数据不在此列。
 */
export interface CharacterUpdateForm {
  id?: number;
  level?: number;
  exp?: number;
  meso?: number;
  fame?: number;
  job?: number;
  gm?: number;
  map?: number;
  ap?: number;
}

export function getAccountCharacters(accountId: number) {
  return axios.get<CharacterListItem[]>(`/character/v1/account/${accountId}`);
}

export function deleteCharacter(cid: number) {
  return axios.delete(`/character/v1/${cid}`);
}

export function getCharacterList(data: CharacterListReq) {
  return axios.post<PageState>('/character/v1/list', data);
}

export function updateCharacter(data: CharacterUpdateForm) {
  return axios.post('/character/v1/update', data);
}
