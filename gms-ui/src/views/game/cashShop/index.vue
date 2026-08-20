<template>
  <div class="container">
    <Breadcrumb />
    <a-card class="general-card" :title="$t('menu.game.cashShop')">
      <a-tabs
        lazy-load
        destroy-on-hide
        type="card-gutter"
        :default-active-key="1"
        :active-key="topTab"
        @change="topCategoryChange"
      >
        <a-tab-pane
          v-for="topCategory in topCategoryList"
          :key="topCategory.id"
        >
          <template #title>{{ topCategory.name }}</template>
          <!-- 二级分类各成体系（同一个 subId 在装备下是帽子、在消耗下是卷轴），
               一级选「全部」时没有自洽的二级集合，直接铺表格 -->
          <cash-shop-table
            v-if="topCategory.id === ALL_CATEGORY_ID"
            :top-id="ALL_CATEGORY_ID"
            :sub-id="ALL_CATEGORY_ID"
          />
          <a-tabs
            v-else
            lazy-load
            destroy-on-hide
            type="text"
            :default-active-key="ALL_CATEGORY_ID"
            :active-key="subTab"
            @change="subCategoryChange"
          >
            <a-tab-pane
              v-for="subCategory in subCategoryList"
              :key="subCategory.subId"
            >
              <template #title>{{ subCategory.subName }}</template>
              <cash-shop-table
                :top-id="topCategory.id"
                :sub-id="subCategory.subId"
              />
            </a-tab-pane>
          </a-tabs>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import CashShopTable from '@/views/game/cashShop/table.vue';
  import { ref } from 'vue';
  import { ALL_CATEGORY_ID, getAllCategoryList } from '@/api/cashShop';
  import { categoryState } from '@/store/modules/cashShop/type';

  const topCategoryList = ref<categoryState[]>([]);
  const subCategoryList = ref<categoryState[]>([]);
  const allCategoryList = ref<categoryState[]>([]);
  const topTab = ref<string | number>(1);
  const subTab = ref<string | number>(ALL_CATEGORY_ID);

  const topCategoryChange = (tab: string | number) => {
    topTab.value = tab;
    subCategoryList.value = allCategoryList.value.filter((_data) => {
      return _data.id === tab;
    });
    subTab.value = ALL_CATEGORY_ID;
  };
  const subCategoryChange = (tab: string | number) => {
    subTab.value = tab;
  };

  const loadCategories = async () => {
    const { data } = await getAllCategoryList();
    allCategoryList.value = data; // 暂存全部数据

    const tc = topCategoryList.value;
    data.forEach((_data: any) => {
      if (_data.id === 8) return;
      // 检查一级分类存在
      let exist = false;
      for (let tci = 0; tci < tc.length; tci += 1) {
        if (tc[tci].id === _data.id) {
          exist = true;
          break;
        }
      }
      // 插入一级分类
      if (!exist) {
        tc.push(_data);
      }

      // 初始化二级分类
      if (_data.id === 1) {
        subCategoryList.value.push(_data);
      }
    });
  };

  loadCategories();
</script>

<script lang="ts">
  export default {
    name: 'CashShop',
  };
</script>

<style lang="less" scoped></style>
