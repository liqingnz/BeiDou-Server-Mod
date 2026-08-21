<template>
  <div class="container" :loading="true">
    <Breadcrumb />
    <a-card class="general-card" :title="$t('menu.account.player')">
      <a-form :model="filterForm" class="a-from-keyword">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item :label="$t('account.player.id')">
              <a-input-number
                v-model="filterForm.id"
                @keydown.enter="loadData"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item :label="$t('account.player.name')">
              <a-input v-model="filterForm.name" @keydown.enter="loadData" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item :label="$t('account.player.mapId')">
              <a-input-number
                v-model="filterForm.map"
                @keydown.enter="loadData"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <a-space>
        <a-button type="primary" @click="loadData()">
          <template #icon>
            <icon-search />
          </template>
          {{ $t('button.load') }}
        </a-button>
        <a-button @click="resetClick">
          <template #icon>
            <icon-refresh />
          </template>
          {{ $t('button.reset') }}
        </a-button>
      </a-space>
      <a-divider />
      <a-row style="margin-bottom: 16px">
        <a-col>
          <a-space>
            <a-button type="primary" @click="refreshClick">
              <template #icon>
                <icon-refresh />
              </template>
              {{ $t('button.refresh') }}
            </a-button>
            <a-button type="primary" @click="globalGiveClick">
              <template #icon>
                <icon-plus />
              </template>
              {{ $t('account.player.button.globalGive') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>
      <a-table
        row-key="id"
        :loading="loading"
        :data="tableData"
        column-resizable
        :pagination="false"
        :bordered="{ cell: true }"
      >
        <template #columns>
          <a-table-column
            :title="$t('account.player.id')"
            data-index="id"
            :width="80"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.name')"
            data-index="name"
            :width="200"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.map')"
            data-index="map"
            :width="120"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.job')"
            data-index="job"
            :width="80"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.jobName')"
            data-index="jobName"
            :width="160"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.level')"
            data-index="level"
            :width="70"
            align="center"
          />
          <a-table-column
            :title="$t('account.player.gm.level')"
            data-index="gm"
            :width="70"
            align="center"
          />
          <a-table-column :title="$t('account.list.column.operate')">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="giveClick(record)">
                {{ $t('account.player.button.give') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-pagination
        style="margin-top: 20px"
        :total="total"
        :page-size="size"
        :current="page"
        show-total
        show-jumper
        show-page-size
        :page-size-options="[10, 20, 50, 100]"
        @change="pageChange"
        @page-size-change="pageSizeChange"
      />
    </a-card>

    <a-modal
      v-model:visible="giveFormVisible"
      :title="giveFormTitle"
      :ok-loading="loading"
      :mask-closable="false"
      :esc-to-close="false"
      :ok-text="$t('account.player.give')"
      :on-before-ok="submitClick"
    >
      <a-form :model="formData">
        <a-form-item
          v-if="formData.playerId !== 0"
          :label="$t('account.player.form.player')"
        >
          <a-space>
            <a-tag color="red">{{ formData.playerId }}</a-tag>
            <a-tag color="blue">{{ formData.player }}</a-tag>
          </a-space>
        </a-form-item>
        <a-form-item :label="$t('account.player.form.type')">
          <a-select
            v-model="formData.type"
            :options="typeOptions"
            :field-names="typeFieldNames"
          />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 5 || formData.type === 6"
          :label="$t('account.player.form.id')"
        >
          <a-space>
            <a-input-number v-model="formData.id" @change="itemChanged" />
            <a-tooltip :content="$t('account.player.favorite.open')">
              <a-button @click="openFavoriteClick">
                <template #icon>
                  <icon-apps />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip :content="$t('account.player.favorite.add')">
              <a-button :disabled="!formData.id" @click="addFavoriteClick">
                <template #icon>
                  <icon-star />
                </template>
              </a-button>
            </a-tooltip>
          </a-space>
        </a-form-item>
        <a-form-item
          v-if="
            formData.type < 6 || formData.type === 11 || formData.type === 12
          "
          :label="$t('account.player.form.quantity')"
        >
          <a-input-number v-model="formData.quantity" />
        </a-form-item>
        <a-form-item
          v-if="formData.type > 6 && formData.type < 11"
          :label="$t('account.player.form.rate')"
          :rules="[
            {
              required: true,
              message: $t('account.player.form.rate.required'),
            },
            {
              type: 'number',
              min: 3,
              message: $t('account.player.form.rate.type'),
            },
          ]"
          :validate-trigger="['change', 'input']"
        >
          <a-input-number v-model="formData.rate" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.str')"
        >
          <a-input-number v-model="formData.str" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.dex')"
        >
          <a-input-number v-model="formData.dex" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.int')"
        >
          <a-input-number v-model="formData.int" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.luk')"
        >
          <a-input-number v-model="formData.luk" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.hp')"
        >
          <a-input-number v-model="formData.hp" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.mp')"
        >
          <a-input-number v-model="formData.mp" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.pAtk')"
        >
          <a-input-number v-model="formData.pAtk" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.mAtk')"
        >
          <a-input-number v-model="formData.mAtk" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.pDef')"
        >
          <a-input-number v-model="formData.pDef" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.mDef')"
        >
          <a-input-number v-model="formData.mDef" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.acc')"
        >
          <a-input-number v-model="formData.acc" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.avoid')"
        >
          <a-input-number v-model="formData.avoid" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.hands')"
        >
          <a-input-number v-model="formData.hands" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.speed')"
        >
          <a-input-number v-model="formData.speed" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.jump')"
        >
          <a-input-number v-model="formData.jump" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 6"
          :label="$t('account.player.form.upgradeSlot')"
        >
          <a-input-number v-model="formData.upgradeSlot" />
        </a-form-item>
        <a-form-item
          v-if="formData.type === 5 || formData.type === 6"
          :label="$t('account.player.form.expire')"
          :extra="$t('account.player.form.expire.tip')"
        >
          <a-space>
            <a-input-number
              v-model="expireAmount"
              :min="0"
              :placeholder="$t('account.player.form.expire.placeholder')"
            />
            <a-select
              v-model="expireUnit"
              :options="expireUnitOptions"
              style="width: 90px"
            />
          </a-space>
        </a-form-item>
      </a-form>
    </a-modal>
    <favorite-item-modal
      ref="favoriteItemModalRef"
      @select="favoriteSelected"
    />
  </div>
</template>

<script setup lang="ts">
  import useLoading from '@/hooks/loading';
  import { ref } from 'vue';
  import { AccountState } from '@/store/modules/account/types';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    getEquInitialInfo,
    getPlayerList,
    GiveForm,
    givePlayerSrc,
  } from '@/api/player';
  import { addFavoriteItem } from '@/api/favoriteItem';
  import FavoriteItemModal from '@/views/account/player/favoriteItem.vue';

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const tableData = ref<AccountState[]>([]);
  const total = ref(0);
  const page = ref(1);
  const size = ref(14);
  const filterForm = ref<{
    id?: number;
    name?: string;
    map?: number;
  }>({
    id: undefined,
    name: undefined,
    map: undefined,
  });
  const giveFormVisible = ref(false);
  const giveFormTitle = ref('');
  const formData = ref<GiveForm>({
    worldId: undefined,
    playerId: undefined,
    player: undefined,
    type: 0,
    id: undefined,
    quantity: undefined,
    rate: undefined,
    str: undefined,
    dex: undefined,
    int: undefined,
    luk: undefined,
    hp: undefined,
    mp: undefined,
    pAtk: undefined,
    mAtk: undefined,
    pDef: undefined,
    mDef: undefined,
    acc: undefined,
    avoid: undefined,
    hands: undefined,
    speed: undefined,
    jump: undefined,
    upgradeSlot: undefined,
    expire: undefined,
  });

  // 有效期在界面上拆成「数值 + 单位」两个控件，提交时统一折算成分钟发给后端
  // 下拉的 value 就是「1 个单位 = 多少分钟」
  const MINUTES_PER_MINUTE = 1;
  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
  const expireAmount = ref<number | undefined>(undefined);
  const expireUnit = ref(MINUTES_PER_MINUTE);
  const expireUnitOptions = [
    {
      value: MINUTES_PER_MINUTE,
      label: t('account.player.form.expire.unit.minute'),
    },
    {
      value: MINUTES_PER_HOUR,
      label: t('account.player.form.expire.unit.hour'),
    },
    { value: MINUTES_PER_DAY, label: t('account.player.form.expire.unit.day') },
  ];
  const resetExpire = () => {
    expireAmount.value = undefined;
    expireUnit.value = MINUTES_PER_MINUTE;
  };

  const typeFieldNames = { value: 'value', label: 'label' };
  const typeOptions = ref([{ value: 0, label: t('account.player.nxCredit') }]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await getPlayerList(
        page.value,
        size.value,
        filterForm.value.id,
        filterForm.value.name,
        filterForm.value.map
      );
      tableData.value = data.records;
      total.value = data.totalRow;
    } finally {
      setLoading(false);
    }
  };
  loadData();

  const refreshClick = () => {
    page.value = 1;
    loadData();
  };

  const pageChange = (data: number) => {
    page.value = data;
    loadData();
  };

  const pageSizeChange = (data: number) => {
    page.value = 1;
    size.value = data;
    loadData();
  };

  const resetClick = () => {
    filterForm.value.id = undefined;
    filterForm.value.name = undefined;
    filterForm.value.map = undefined;
    page.value = 1;
    loadData();
  };

  const globalGiveClick = () => {
    giveFormTitle.value = '全服发放资源';
    // 道具/自定义装备使用频率最高，置于列表首位
    typeOptions.value = [
      { value: 5, label: t('account.player.item') },
      { value: 6, label: t('account.player.equip') },
      { value: 0, label: t('account.player.nxCredit') },
      { value: 1, label: t('account.player.nxPrepaid') },
      { value: 2, label: t('account.player.maplePoint') },
      { value: 3, label: t('account.player.mesos') },
      { value: 4, label: t('account.player.exp') },
    ];
    formData.value.worldId = undefined;
    formData.value.playerId = 0;
    formData.value.player = undefined;
    formData.value.type = 5;
    resetExpire();
    giveFormVisible.value = true;
  };

  const giveClick = (data: any) => {
    giveFormTitle.value = '发放资源';
    // 道具/自定义装备使用频率最高，置于列表首位
    typeOptions.value = [
      { value: 5, label: t('account.player.item') },
      { value: 6, label: t('account.player.equip') },
      { value: 0, label: t('account.player.nxCredit') },
      { value: 1, label: t('account.player.nxPrepaid') },
      { value: 2, label: t('account.player.maplePoint') },
      { value: 3, label: t('account.player.mesos') },
      { value: 4, label: t('account.player.exp') },
      { value: 7, label: t('account.player.expRate') },
      { value: 8, label: t('account.player.mesosRate') },
      { value: 9, label: t('account.player.dropRate') },
      // { value: 10, label: t('account.player.bossRate') },
      { value: 11, label: t('account.player.gm') },
      { value: 12, label: t('account.player.fame') },
    ];

    formData.value = {
      worldId: data.world,
      playerId: data.id,
      player: data.name,
      type: 5,
      id: undefined,
      quantity: undefined,
      rate: undefined,
      str: undefined,
      dex: undefined,
      int: undefined,
      luk: undefined,
      hp: undefined,
      mp: undefined,
      pAtk: undefined,
      mAtk: undefined,
      pDef: undefined,
      mDef: undefined,
      acc: undefined,
      avoid: undefined,
      hands: undefined,
      speed: undefined,
      jump: undefined,
      upgradeSlot: undefined,
      expire: undefined,
    };
    resetExpire();
    giveFormVisible.value = true;
  };

  const submitClick = async () => {
    setLoading(true);
    try {
      await givePlayerSrc({
        ...formData.value,
        // 留空 / 0 表示永久有效
        expire: expireAmount.value
          ? expireAmount.value * expireUnit.value
          : undefined,
      });
      Message.success(t('message.success'));
    } catch {
      // 错误提示由 axios 响应拦截器统一弹出，此处只保证弹窗不关闭
    } finally {
      setLoading(false);
    }
    // 返回 false 阻止弹窗关闭，便于连续发放
    return false;
  };

  const favoriteItemModalRef = ref();
  const openFavoriteClick = () => {
    favoriteItemModalRef.value.init(formData.value.type);
  };

  const favoriteSelected = (itemId: number) => {
    formData.value.id = itemId;
    itemChanged();
  };

  const addFavoriteClick = async () => {
    setLoading(true);
    try {
      await addFavoriteItem(
        formData.value.type as number,
        formData.value.id as number
      );
      Message.success(t('message.success'));
    } catch {
      // 重复收藏、物品不存在等由响应拦截器提示
    } finally {
      setLoading(false);
    }
  };

  const itemChanged = async () => {
    if (formData.value.type !== 6) return;

    setLoading(true);
    try {
      const { data } = await getEquInitialInfo(formData.value.id as number);
      formData.value.str = data.str;
      formData.value.dex = data.dex;
      formData.value.int = data.int;
      formData.value.luk = data.luk;
      formData.value.hp = data.hp;
      formData.value.mp = data.mp;
      formData.value.pAtk = data.patk;
      formData.value.mAtk = data.matk;
      formData.value.pDef = data.pdef;
      formData.value.mDef = data.mdef;
      formData.value.acc = data.acc;
      formData.value.avoid = data.avoid;
      formData.value.hands = data.hands;
      formData.value.speed = data.speed;
      formData.value.jump = data.jump;
      formData.value.upgradeSlot = data.upgradeSlot;
      // 装备模板的 expire 恒为 -1（永久），回填只会让「有效期」框显示 -1，不回填
    } finally {
      setLoading(false);
    }
  };
</script>

<script lang="ts">
  export default {
    name: 'Player',
  };
</script>

<style lang="less">
  .a-from-keyword {
    @media (min-width: @screen-sm) {
      display: flex;
      flex-direction: initial;
      flex-wrap: wrap;
      width: 100%;
      div {
        margin-right: 5px;
      }
      .arco-row {
        width: max-content;
        display: flex;
      }
      .arco-col {
        flex: max-content;
        width: 100%;
      }
      .arco-form-item-label-col,
      .arco-form-item-label {
        min-width: auto;
        text-align: right;
      }
    }
    @media (max-width: @screen-sm) {
      display: block;
      flex-direction: column;
      .arco-row {
        flex-flow: row wrap;
        width: 100%;
      }

      .arco-col {
        flex: 0 0 100%;
        width: 100%;
      }

      .arco-form-item-label-col {
        display: contents;
      }
    }
  }
</style>
