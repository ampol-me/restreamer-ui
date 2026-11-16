<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';

const { t } = useI18n();
const { login, state } = useRestreamer();

const fields = computed<AuthFormField[]>(() => [
	{ name: 'username', type: 'text', label: t('Username'), required: true, autocomplete: 'username' },
	{ name: 'password', type: 'password', label: t('Password'), required: true, autocomplete: 'current-password' },
]);

const failed = ref(false);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<{ username: string; password: string }>) {
	loading.value = true;
	failed.value = false;
	try {
		failed.value = !(await login(event.data.username, event.data.password));
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<div class="flex min-h-[70dvh] items-center justify-center">
		<UPageCard class="w-full max-w-md">
			<UAuthForm
				:fields="fields"
				:title="$t('Login')"
				:description="state.address"
				icon="i-lucide-lock"
				:loading="loading"
				:submit="{ label: $t('Login'), block: true }"
				@submit="onSubmit"
			>
				<template v-if="failed" #validation>
					<UAlert color="error" variant="subtle" icon="i-lucide-circle-alert" :title="$t('Login failed. Check the username and password.')" />
				</template>
			</UAuthForm>
		</UPageCard>
	</div>
</template>
