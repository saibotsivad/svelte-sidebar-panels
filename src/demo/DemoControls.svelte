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
		<div class="form-check fs-5">
			<input class="form-check-input" type="checkbox" checked={leftOpen} id="left-open" on:click={() => dispatch('toggleLeft')}>
			<label class="form-check-label" for="left-open">
				Show Left Panel
			</label>
		</div>
		<div class="form-check fs-5">
			<input class="form-check-input" type="checkbox" checked={rightOpen} id="right-open" on:click={() => dispatch('toggleRight')}>
			<label class="form-check-label" for="right-open">
				Show Right Panel
			</label>
		</div>
		<h4 class="mt-4">Panel animation</h4>
		<p>
			The animation of the panels is quick and subtle, here you
			can slow it down to check for visual errors.
		</p>
		<div class="form-check fs-5">
			<input class="form-check-input" type="radio" name="panelSpeed" id="normal-speed" checked={!panelAnimatesSlowly} on:click={() => { duration = '0.08s'; panelAnimatesSlowly = false }}>
			<label class="form-check-label" for="normal-speed">
				Normal Speed
			</label>
		</div>
		<div class="form-check fs-5">
			<input class="form-check-input" type="radio" name="panelSpeed" id="slow-speed" checked={panelAnimatesSlowly} on:click={() => { duration = '1.5s'; panelAnimatesSlowly = true }}>
			<label class="form-check-label" for="slow-speed">
				Slow Speed
			</label>
		</div>
	</div>
</div>
