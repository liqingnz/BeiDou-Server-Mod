<template>
  <div class="container">
    <Breadcrumb />
    <a-card class="general-card" :title="$t('menu.account.character')">
      <a-form :model="filterForm" class="a-from-keyword">
        <a-form-item :label="$t('account.character.filter.id')">
          <a-input-number v-model="filterForm.id" @keydown.enter="loadData" />
        </a-form-item>
        <a-form-item :label="$t('account.character.filter.name')">
          <a-input v-model="filterForm.name" @keydown.enter="loadData" />
        </a-form-item>
        <a-form-item :label="$t('account.character.filter.accountId')">
          <a-input-number
            v-model="filterForm.accountId"
            @keydown.enter="loadData"
          />
        </a-form-item>
        <a-form-item :label="$t('account.character.filter.world')">
          <a-input-number
            v-model="filterForm.world"
            :min="0"
            @keydown.enter="loadData"
          />
        </a-form-item>
      </a-form>
      <a-space class="a-space-btn">
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
      <a-table
        row-key="id"
        :loading="loading"
        :data="tableData"
        column-resizable
        :pagination="false"
        :bordered="{ cell: true }"
        :scroll="{ x: 1400 }"
      >
        <template #columns>
          <a-table-column
            :title="$t('account.character.column.id')"
            data-index="id"
            :width="80"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.name')"
            data-index="name"
            :width="140"
          />
          <a-table-column
            :title="$t('account.character.column.accountId')"
            data-index="accountId"
            :width="90"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.job')"
            data-index="jobName"
            :width="120"
          />
          <a-table-column
            :title="$t('account.character.column.world')"
            data-index="worldName"
            :width="100"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.level')"
            data-index="level"
            :width="70"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.meso')"
            data-index="meso"
            :width="120"
            align="right"
          />
          <a-table-column
            :title="$t('account.character.column.fame')"
            data-index="fame"
            :width="70"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.gm')"
            data-index="gm"
            :width="70"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.map')"
            data-index="map"
            :width="100"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.status')"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag v-if="record.online" color="green">
                {{ $t('account.character.column.status.online') }}
              </a-tag>
              <a-tag v-else color="gray">
                {{ $t('account.character.column.status.offline') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('account.character.column.createdate')"
            data-index="createdate"
            :width="160"
            align="center"
          />
          <a-table-column
            :title="$t('account.character.column.operate')"
            :width="100"
            align="center"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-tooltip
                v-if="record.online"
                :content="$t('account.character.column.operate.edit.online')"
              >
                <a-button type="text" size="mini" disabled>
                  {{ $t('button.edit') }}
                </a-button>
              </a-tooltip>
              <a-button
                v-else
                type="text"
                size="mini"
                @click="editClick(record)"
              >
                {{ $t('button.edit') }}
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
    <character-update-form ref="characterUpdateFormRef" @reload="loadData" />
  </div>
</template>

<script setup lang="ts">
  import useLoading from '@/hooks/loading';
  import { ref } from 'vue';
  import { CharacterListItem, getCharacterList } from '@/api/character';
  import CharacterUpdateForm from '@/views/account/character/updateForm.vue';

  const { loading, setLoading } = useLoading(false);
  const tableData = ref<CharacterListItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const size = ref(14);
  const filterForm = ref<{
    id?: number;
    name?: string;
    accountId?: number;
    world?: number;
  }>({
    id: undefined,
    name: undefined,
    accountId: undefined,
    world: undefined,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await getCharacterList({
        pageNo: page.value,
        pageSize: size.value,
        id: filterForm.value.id,
        name: filterForm.value.name,
        accountId: filterForm.value.accountId,
        world: filterForm.value.world,
      });
      tableData.value = data.records;
      total.value = data.totalRow;
    } finally {
      setLoading(false);
    }
  };
  loadData();

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
    filterForm.value.accountId = undefined;
    filterForm.value.world = undefined;
    page.value = 1;
    loadData();
  };

  const characterUpdateFormRef = ref();
  const editClick = (data: CharacterListItem) => {
    characterUpdateFormRef.value.init(data);
  };
</script>

<script lang="ts">
  export default {
    name: 'CharacterList',
  };
</script>
