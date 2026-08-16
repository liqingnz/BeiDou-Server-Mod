<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :ok-loading="loading"
    :mask-closable="false"
    :esc-to-close="false"
    :ok-text="$t('button.submit')"
    :on-before-ok="submitClick"
  >
    <a-alert type="warning" style="margin-bottom: 16px">
      {{ $t('account.character.updateForm.tip') }}
    </a-alert>
    <a-form ref="formRef" :rules="rules" :model="formData">
      <a-form-item
        field="level"
        :label="$t('account.character.column.level')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.level" :min="1" />
      </a-form-item>
      <a-form-item
        field="exp"
        :label="$t('account.character.column.exp')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.exp" :min="0" />
      </a-form-item>
      <a-form-item
        field="job"
        :label="$t('account.character.column.job')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.job" :min="0" />
      </a-form-item>
      <a-form-item
        field="meso"
        :label="$t('account.character.column.meso')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.meso" :min="0" />
      </a-form-item>
      <a-form-item
        field="fame"
        :label="$t('account.character.column.fame')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.fame" />
      </a-form-item>
      <a-form-item
        field="ap"
        :label="$t('account.character.column.ap')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.ap" :min="0" />
      </a-form-item>
      <a-form-item
        field="map"
        :label="$t('account.character.column.map')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.map" :min="0" />
      </a-form-item>
      <a-form-item
        field="gm"
        :label="$t('account.character.column.gm')"
        validate-trigger="blur"
      >
        <a-input-number v-model="formData.gm" :min="0" :max="127" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue';
  import useLoading from '@/hooks/loading';
  import {
    CharacterListItem,
    CharacterUpdateForm,
    updateCharacter,
  } from '@/api/character';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const emit = defineEmits(['reload']);
  const visible = ref(false);
  const title = ref('');
  const formRef = ref();
  const formData = reactive<CharacterUpdateForm>({});

  const rules = {
    gm: [
      {
        validator: (value: any, cb: any) => {
          if (
            value === undefined ||
            value === null ||
            (value >= 0 && value <= 127)
          ) {
            cb();
          } else {
            cb(t('account.character.updateForm.rules.gm.range'));
          }
        },
      },
    ],
  };

  const init = (record: CharacterListItem) => {
    formData.id = record.id;
    formData.level = record.level;
    formData.exp = record.exp;
    formData.job = record.job;
    formData.meso = record.meso;
    formData.fame = record.fame;
    formData.ap = record.ap;
    formData.map = record.map;
    formData.gm = record.gm;

    title.value = `${t('account.character.updateForm.title')} [${record.id}] ${
      record.name
    }`;
    visible.value = true;
  };
  defineExpose({ init });

  const submitClick = async () => {
    const errors = await formRef.value.validate();
    if (errors) return false;
    setLoading(true);
    try {
      await updateCharacter(formData);
      Message.success(t('message.success'));
      emit('reload');
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };
</script>

<script lang="ts">
  export default {
    name: 'CharacterUpdateForm',
  };
</script>
