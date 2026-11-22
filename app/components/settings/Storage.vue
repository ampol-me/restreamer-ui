<script setup lang="ts">
import { toInt, type SettingsForm } from '#shared/settings/config';

defineEmits<{ tab: [tab: 'auth'] }>();

const form = defineModel<SettingsForm>({ required: true });

const { t } = useI18n();

// These contain double quotes, which an attribute in the template cannot hold.
const allowHelp = computed(() => t('List of file extensions to cache (e.g. ".html"), one per line. Leave empty to cache all file types.'));
const blockHelp = computed(() => t('List of file extensions not to cache (e.g. ".m3u8"), one per line. Leave empty for none.'));
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('Storage') }}</h2>

		<div>
			<h3 class="font-medium text-highlighted">{{ $t('In-memory') }}</h3>
			<p class="text-sm text-muted">{{ $t('Settings for /memfs path.') }}</p>
		</div>

		<SettingsToggle
			v-model="form.storage.memory.auth.enable"
			name="storage.memory.auth.enable"
			:label="$t('Write protection')"
			:help="$t('Enabling basic auth is strongly advised. Otherwise, anybody could write data to /memfs.')"
		/>

		<div class="grid gap-5 md:grid-cols-2">
			<SettingsField
				v-slot="{ disabled }"
				name="storage.memory.auth.username"
				:label="$t('Username')"
				:help="$t('Username for authorization.')"
				:disabled="!form.storage.memory.auth.enable"
			>
				<UInput v-model="form.storage.memory.auth.username" class="w-full" autocomplete="off" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="storage.memory.auth.password"
				:label="$t('Password')"
				:help="$t('Password for authorization.')"
				:disabled="!form.storage.memory.auth.enable"
			>
				<SettingsPassword v-model="form.storage.memory.auth.password" :disabled="disabled" />
			</SettingsField>
		</div>

		<SettingsField
			v-slot="{ disabled }"
			name="storage.memory.max_size_mbytes"
			:label="$t('Maximum size (Megabytes)')"
			:help="$t('Maximum allowed megabytes of RAM for /memfs, 0 for unlimited.')"
		>
			<SettingsNumber v-model="form.storage.memory.max_size_mbytes" :disabled="disabled" />
		</SettingsField>

		<SettingsToggle
			v-model="form.storage.memory.purge"
			name="storage.memory.purge"
			:label="$t('Remove the oldest entries if the /memfs is full')"
			:disabled="toInt(form.storage.memory.max_size_mbytes) <= 0"
		/>

		<USeparator />

		<div>
			<h3 class="font-medium text-highlighted">{{ $t('Disk') }}</h3>
			<p class="text-sm text-muted">
				{{ $t('Settings for /data path. The access is protected by') }}
				<ULink as="button" type="button" class="text-primary" @click="$emit('tab', 'auth')">login (JWT)</ULink>.
			</p>
		</div>

		<SettingsField
			v-slot="{ disabled }"
			name="storage.disk.max_size_mbytes"
			:label="$t('Maximum size (Megabytes)')"
			:help="$t('Maximum allowed megabytes to consume from hard disk. 0 for unlimited.')"
		>
			<SettingsNumber v-model="form.storage.disk.max_size_mbytes" :disabled="disabled" />
		</SettingsField>

		<USeparator />

		<div>
			<h3 class="font-medium text-highlighted">{{ $t('Disk cache') }}</h3>
			<p class="text-sm text-muted">{{ $t('Cache for files on /data.') }}</p>
		</div>

		<SettingsToggle v-model="form.storage.disk.cache.enable" name="storage.disk.cache.enable" :label="$t('Disk cache')" />

		<SettingsField
			v-slot="{ disabled }"
			name="storage.disk.cache.max_size_mbytes"
			:label="$t('Maximum size (Megabytes)')"
			:help="$t('Maximum allowed cache size, 0 for unlimited.')"
			:disabled="!form.storage.disk.cache.enable"
		>
			<SettingsNumber v-model="form.storage.disk.cache.max_size_mbytes" :disabled="disabled" />
		</SettingsField>

		<div class="grid gap-5 md:grid-cols-2">
			<SettingsField
				v-slot="{ disabled }"
				name="storage.disk.cache.ttl_seconds"
				:label="$t('Cache time (Seconds)')"
				:help="$t('Seconds to keep files in cache.')"
				:disabled="!form.storage.disk.cache.enable"
			>
				<SettingsNumber v-model="form.storage.disk.cache.ttl_seconds" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="storage.disk.cache.max_file_size_mbytes"
				:label="$t('Maximum file size (Megabytes)')"
				:help="$t('Maximum file size to put in cache.')"
				:disabled="!form.storage.disk.cache.enable"
			>
				<SettingsNumber v-model="form.storage.disk.cache.max_file_size_mbytes" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="storage.disk.cache.types.allow"
				:label="$t('Cache types')"
				:help="allowHelp"
				:disabled="!form.storage.disk.cache.enable"
			>
				<UTextarea v-model="form.storage.disk.cache.types.allow" class="w-full" :rows="5" :disabled="disabled" spellcheck="false" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="storage.disk.cache.types.block"
				:label="$t('Block cache types')"
				:help="blockHelp"
				:disabled="!form.storage.disk.cache.enable"
			>
				<UTextarea v-model="form.storage.disk.cache.types.block" class="w-full" :rows="5" :disabled="disabled" spellcheck="false" />
			</SettingsField>
		</div>
	</div>
</template>
