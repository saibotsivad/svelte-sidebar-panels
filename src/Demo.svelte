<script>
	import SidebarPanels from '../src/SidebarPanels.svelte'

	let leftOpen
	let rightOpen
	let scrim
</script>

<style>
	div[slot="left"] {
		background-color: #4cb041;
		padding: 15px;
		min-height: 100%;
	}
	div[slot="right"] {
		background-color: #637de4;
		padding: 15px;
		min-height: 100%;
	}
	div[slot="content"] {
		background-color: #d4d4bd;
		padding: 15px;
		min-height: 100%;
	}
</style>

<SidebarPanels bind:leftOpen bind:rightOpen bind:scrim leftWidth="300px">
	<div slot="left">
		left menu area with many words that are wrapping eventually so you can see the draw
		left menu area with many words that are wrapping eventually so you can see the draw
		left menu area with many words that are wrapping eventually so you can see the draw
		left menu area with many words that are wrapping eventually so you can see the draw
		left menu area with many words that are wrapping eventually so you can see the draw
	</div>
	<div slot="right">
		right menu area with many words that are wrapping eventually so you can see the draw
		right menu area with many words that are wrapping eventually so you can see the draw
		right menu area with many words that are wrapping eventually so you can see the draw
		right menu area with many words that are wrapping eventually so you can see the draw
		right menu area with many words that are wrapping eventually so you can see the draw
	</div>
	<div slot="content">
		<p>
			content area with many words that are wrapping eventually so you can see the draw
			content area with many words that are wrapping eventually so you can see the draw
			content area with many words that are wrapping eventually so you can see the draw
			content area with many words that are wrapping eventually so you can see the draw
			content area with many words that are wrapping eventually so you can see the draw
			content area with many words that are wrapping eventually so you can see the draw
		</p>
		<button on:click={ () => { leftOpen = !leftOpen } }>
			toggle left ({leftOpen ? 'opened' : 'closed'})
		</button>
		<button on:click={ () => { rightOpen = !rightOpen } }>
			toggle right ({rightOpen ? 'opened' : 'closed'})
		</button>
	</div>
</SidebarPanels>
