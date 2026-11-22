<template>
	<!-- The value comes from an environment variable of the core and cannot be changed here. -->
	<UTooltip :text="$t('An environment variable sets this value.')">
		<UBadge color="error" variant="solid" size="sm" label="ENV" class="font-bold" />
	</UTooltip>
</template>
