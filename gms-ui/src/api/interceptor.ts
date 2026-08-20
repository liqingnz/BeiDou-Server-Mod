import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message } from '@arco-design/web-vue';
import { getToken, clearToken } from '@/utils/auth';
import { requireReLogin } from '@/utils/re-login';
import i18n from '@/locale';

/* eslint-disable no-bitwise */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface HttpResponse<T = unknown> {
  status: string;
  message: string;
  code: number;
  data: T;
}

// 会话过期后要重放请求，需要记住原始body，并且标记已经重试过避免死循环
interface RetryableConfig extends AxiosRequestConfig {
  rawData?: unknown;
  retried?: boolean;
}

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // let each request carry token
    // this example using the JWT token
    // Authorization is a custom headers key
    // please modify it according to the actual situation
    const token = getToken();
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    const isUpload = config.headers?.['Content-type'] === 'multipart/form-data';
    if (config.data && !isUpload) {
      // 记下原始body，重新登录后重放请求时要用它重新包信封
      const retryable = config as RetryableConfig;
      retryable.rawData = retryable.rawData ?? config.data;
      config.data = {
        requestId: generateUUID(),
        data: retryable.rawData,
      };
    }
    return config;
  },
  (error) => {
    // do something
    return Promise.reject(error);
  }
);
// add response interceptors
axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse | Blob>) => {
    if (response.config.responseType === 'blob') {
      const res = response.data as Blob;
      if (response.status !== 200) {
        Message.error({
          content: response.statusText || 'Error',
          duration: 5 * 1000,
        });
        return Promise.reject(new Error(response.statusText || 'Error'));
      }
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement('a');
      link.href = url;
      // 从Content-Disposition中获取文件名
      link.setAttribute(
        'download',
        response.headers['content-disposition']
          .split('filename=')[1]
          .replace(/"/g, '')
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // 释放URL对象
      window.URL.revokeObjectURL(url);
      return null;
    }
    const res = response.data as HttpResponse;
    // if the custom code is not 20000, it is judged as an error.
    if (res.code !== 20000) {
      Message.error({
        content: res.message || 'Error',
        duration: 5 * 1000,
      });
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res;
  },
  async (error) => {
    const status = error.response?.status;
    const config = (error.config || {}) as RetryableConfig;
    // 会话过期：就地弹出登录窗口，登录成功后重放这次请求，页面留在原处
    if (status === 401) {
      const isAuthRequest = config.url?.includes('/auth/');
      if (!isAuthRequest && !config.retried) {
        clearToken();
        const success = await requireReLogin();
        if (success) {
          config.retried = true;
          // 包过信封的请求用原始body重放（拦截器会重新包信封）；
          // 上传这类没包过的（rawData不存在）保持原data，不能覆盖成undefined
          if (config.rawData !== undefined) {
            config.data = config.rawData;
          }
          return axios.request(config);
        }
      }
      return Promise.reject(new Error(i18n.global.t('relogin.expired')));
    }
    let errorMessage;
    if (error.message === 'Network Error') {
      errorMessage = i18n.global.t('message.network.error');
    } else {
      errorMessage = error.message || 'Request Error';
    }
    Message.error({
      content: errorMessage,
      duration: 5 * 1000,
    });
    return Promise.reject(error);
  }
);
