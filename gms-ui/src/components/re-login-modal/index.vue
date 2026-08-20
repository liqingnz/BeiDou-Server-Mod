<template>
  <a-modal
    :visible="reLoginVisible"
    :title="$t('relogin.title')"
    :ok-text="$t('form.login.login')"
    :cancel-text="$t('relogin.toLoginPage')"
    :ok-loading="loading"
    :mask-closable="false"
    :esc-to-close="false"
    :closable="false"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-alert type="warning" class="relogin-tip">{{
      $t('relogin.tip')
    }}</a-alert>
    <a-form :model="userInfo" layout="vertical">
      <a-form-item
        field="username"
        :rules="[{ required: true, message: $t('form.login.user.empty') }]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <a-input
          v-model="userInfo.username"
          :placeholder="$t('form.login.user.placeholder')"
        >
          <template #prefix>
            <icon-user />
          </template>
        </a-input>
      </a-form-item>
      <a-form-item
        field="password"
        :rules="[{ required: true, message: $t('form.login.password.empty') }]"
        :validate-trigger="['change', 'blur']"
        hide-label
      >
        <a-input-password
          v-model="userInfo.password"
          :placeholder="$t('form.login.password.placeholder')"
          allow-clear
          @keydown.enter="handleSubmit"
        >
          <template #prefix>
            <icon-lock />
          </template>
        </a-input-password>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { useStorage } from '@vueuse/core';
  import { useI18n } from 'vue-i18n';
  import { useUserStore } from '@/store';
  import useLoading from '@/hooks/loading';
  import { reLoginVisible, finishReLogin } from '@/utils/re-login';

  const router = useRouter();
  const userStore = useUserStore();
  const { loading, setLoading } = useLoading();
  const { t } = useI18n();

  // 和登录页共用记住的账号，密码每次都要重新输
  const loginConfig = useStorage('login-config', {
    rememberPassword: true,
    username: '',
    password: '',
  });
  const userInfo = reactive({
    username: loginConfig.value.username,
    password: '',
  });

  watch(reLoginVisible, (value) => {
    if (value) {
      userInfo.username = loginConfig.value.username;
      userInfo.password = '';
    }
  });

  const handleSubmit = async () => {
    if (loading.value) return;
    if (!userInfo.username) {
      Message.error(t('form.login.user.empty'));
      return;
    }
    if (!userInfo.password) {
      Message.error(t('form.login.password.empty'));
      return;
    }
    setLoading(true);
    try {
      await userStore.login({
        username: userInfo.username,
        password: userInfo.password,
      });
      await userStore.info();
      Message.success(t('message.login.success'));
      // 登录成功后弹窗关闭，过期的请求由拦截器重放，页面留在原处
      finishReLogin(true);
    } catch {
      // 登录失败的提示已经由响应拦截器统一弹出，这里保持弹窗打开让用户重试
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    finishReLogin(false);
    userStore.logoutCallBack();
    const { name, query } = router.currentRoute.value;
    if (name === 'login') return;
    router.push({
      name: 'login',
      query: {
        redirect: name as string,
        ...query,
      },
    });
  };
</script>

<style lang="less" scoped>
  .relogin-tip {
    margin-bottom: 16px;
  }
</style>
