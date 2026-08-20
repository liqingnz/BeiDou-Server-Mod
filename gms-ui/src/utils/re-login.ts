import { ref } from 'vue';

// 会话过期后的重新登录状态。拦截器不在组件里，靠这个模块和登录弹窗通信
const visible = ref(false);
let resolvers: Array<(success: boolean) => void> = [];

// 是否正在要求重新登录，给弹窗组件绑定用
export const reLoginVisible = visible;

/**
 * 要求重新登录。返回的Promise在登录成功（true）或者放弃（false）时结束，
 * 期间过期的请求都挂在这里等着，登录成功后由拦截器重放，页面停在原处。
 */
export function requireReLogin(): Promise<boolean> {
  visible.value = true;
  return new Promise<boolean>((resolve) => {
    resolvers.push(resolve);
  });
}

// 关闭重新登录弹窗，并唤醒所有等着的请求
export function finishReLogin(success: boolean) {
  visible.value = false;
  const pending = resolvers;
  resolvers = [];
  pending.forEach((resolve) => resolve(success));
}
