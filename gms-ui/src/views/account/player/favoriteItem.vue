<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :width="720"
    :mask-closable="true"
    :footer="false"
  >
    <a-spin :loading="loading" style="width: 100%">
      <a-empty
        v-if="!tableData.length"
        :description="$t('account.player.favorite.empty')"
      />
      <div v-else class="favorite-grid">
        <div
          v-for="record in tableData"
          :key="record.id"
          class="favorite-cell"
          @click="selectClick(record)"
        >
          <a-popconfirm
            type="error"
            :content="$t('account.player.favorite.delete.confirm')"
            @ok="deleteClick(record)"
          >
            <icon-close-circle-fill class="favorite-cell-remove" @click.stop />
          </a-popconfirm>
          <div class="favorite-cell-icon">
            <img
              :src="getIconUrl('item', record.itemId)"
              :alt="String(record.itemId)"
            />
          </div>
          <div class="favorite-cell-id">{{ record.itemId }}</div>
          <a-tooltip :content="record.itemName">
            <div class="favorite-cell-name">{{ record.itemName }}</div>
          </a-tooltip>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import useLoading from '@/hooks/loading';
  import {
    deleteFavoriteItem,
    FavoriteItem,
    getFavoriteItems,
  } from '@/api/favoriteItem';
  import { getIconUrl } from '@/utils/mapleStoryAPI';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const emit = defineEmits(['select']);
  const visible = ref(false);
  const tableData = ref<FavoriteItem[]>([]);
  const currentType = ref(5);

  const title = computed(() =>
    currentType.value === 6
      ? t('account.player.favorite.title.equip')
      : t('account.player.favorite.title.item')
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await getFavoriteItems(currentType.value);
      tableData.value = data ?? [];
    } finally {
      setLoading(false);
    }
  };

  const init = (type: number) => {
    currentType.value = type;
    visible.value = true;
    loadData();
  };
  defineExpose({ init });

  const selectClick = (record: FavoriteItem) => {
    emit('select', record.itemId);
    visible.value = false;
  };

  const deleteClick = async (record: FavoriteItem) => {
    setLoading(true);
    try {
      await deleteFavoriteItem(record.id);
      Message.success(t('message.success'));
      await loadData();
    } finally {
      setLoading(false);
    }
  };
</script>

<script lang="ts">
  export default {
    name: 'FavoriteItemModal',
  };
</script>

<style scoped lang="less">
  .favorite-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 12px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .favorite-cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border: 1px solid var(--color-neutral-3);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: rgb(var(--primary-6));
      background-color: var(--color-fill-1);

      .favorite-cell-remove {
        opacity: 1;
      }
    }
  }

  .favorite-cell-remove {
    position: absolute;
    top: 2px;
    right: 2px;
    color: var(--color-text-3);
    opacity: 0;
    transition: opacity 0.2s;

    &:hover {
      color: rgb(var(--danger-6));
    }
  }

  .favorite-cell-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;

    img {
      max-width: 100%;
      max-height: 100%;
    }
  }

  .favorite-cell-id {
    margin-top: 4px;
    font-size: 12px;
    color: var(--color-text-2);
  }

  .favorite-cell-name {
    width: 100%;
    overflow: hidden;
    font-size: 12px;
    color: var(--color-text-3);
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
