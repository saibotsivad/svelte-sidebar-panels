<script>
	import { createEventDispatcher } from 'svelte'
	const dispatch = createEventDispatcher()

	export let leftOpen
	export let rightOpen
	export let duration

	let panelAnimatesSlowly
</script>

<div class="card">
	<div class="card-body">
		<h2>Controls</h2>
		<p>Not all controls are shown or needed, this just demonstrates a few of them.</p>
		<h4>Toggle panel visibility</h4>
		<p>
			Panels are automatically initialized open/closed based on the screen width,
			and automatically open/close if the window is resized. (You can opt out of
			that behaviour.)
		</p>
		<div class="btn-group" role="group" aria-label="Toggle panels">
			<button type="button" class="btn btn-{leftOpen ? 'primary' : 'secondary'}" on:click={() => dispatch('toggleLeft')}>
				Toggle Left
			</button>
			<button type="button" class="btn btn-{rightOpen ? 'primary' : 'secondary'}" on:click={() => dispatch('toggleRight')}>
				Toggle Right
			</button>
		</div>
		<h4 class="mt-4">Panel animation</h4>
		<p>
			The animation of the panels is quick and subtle, here you
			can slow it down to check for visual errors.
		</p>
		<div class="btn-group" role="group" aria-label="Toggle panels">
			<button type="button" class="btn btn-{panelAnimatesSlowly ? 'secondary' : 'primary'}" on:click={() => { duration = '0.08s'; panelAnimatesSlowly = false }}>
				Normal Speed
			</button>
			<button type="button" class="btn btn-{panelAnimatesSlowly ? 'primary' : 'secondary'}" on:click={() => { duration = '1.5s'; panelAnimatesSlowly = true }}>
				Slow Speed
			</button>
		</div>
	</div>
</div>
