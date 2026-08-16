import axios from 'axios';

export interface FavoriteItem {
  id: number;
  type: number;
  itemId: number;
  itemName: string;
  createTime: string;
}

/** 对应「发放资源」的类型值 */
export const FAVORITE_TYPE_ITEM = 5;
export const FAVORITE_TYPE_EQUIP = 6;

export function getFavoriteItems(type: number) {
  return axios.get<FavoriteItem[]>(`/favoriteItem/v1?type=${type}`);
}

export function addFavoriteItem(type: number, itemId: number) {
  return axios.post('/favoriteItem/v1', { type, itemId });
}

export function deleteFavoriteItem(id: number) {
  return axios.delete(`/favoriteItem/v1/${id}`);
}
