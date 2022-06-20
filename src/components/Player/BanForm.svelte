<script>
	import Dialog from '../Common/Dialog.svelte';
	import Select from 'svelte-select';
	import {createEventDispatcher} from 'svelte';

	const dispatch = createEventDispatcher();

	export let playerId;
    export let accountStore;

    let durations = [
        {
            label: "Day",
            value: 60 * 60 * 24
        },
        {
            label: "Week",
            value: 60 * 60 * 24 * 7
        },
        {
            label: "30 days",
            value: 60 * 60 * 24 * 30
        },
        {
            label: "Permanent",
            value: 0
        },
    ]

    let reason;
    let duration;

	function ban() {
        accountStore.banPlayer(playerId, reason, duration.value);

		dispatch('finished');
	}
</script>

<div class="ranking-voting">
	<Dialog
		type="confirm"
		title="Ban player"
		okButton="Ban"
		cancelButton="Cancel"
        okButtonDisabled={reason == undefined || duration == undefined }
		on:confirm={() => ban()}
		on:cancel={() => dispatch('finished')}>
		<div slot="content">
            <div>
                <label>Reason:</label>
                <input type="text" bind:value={reason} placeholder="Ban reason" class="sponsor-input">
            </div>
			<div>
                <label>Duration:</label>
                <Select bind:value={duration} items={durations} isSearchable={true} />
            </div>
		</div>
	</Dialog>
</div>

<style>
</style>
