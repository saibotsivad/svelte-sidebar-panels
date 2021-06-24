<script>
	import SidebarPanels from '../SidebarPanels.svelte'
	import DemoContent from './DemoContent.svelte'

	let leftOpen
	let rightOpen

	let duration = undefined
	let updatePanels
</script>

<style>
	div[slot="left"] {
		background-color: #b1b1b1;
		padding: 15px;
		min-height: 100%;
	}
	div[slot="right"] {
		background-color: #b1b1b1;
		padding: 15px;
		min-height: 100%;
	}
	div[slot="content"] {
		background-color: #f5f5f5;
		padding: 15px;
		min-height: 100%;
	}
</style>

<SidebarPanels bind:updatePanels {duration} on:change={({ detail: { left, right } }) => { leftOpen = left; rightOpen = right }}>
	<div slot="left">
		<DemoContent />
	</div>
	<div slot="right">
		<DemoContent />
	</div>
	<div slot="content" class="container">
		<h1>Svelte Sidebar Panels</h1>
		<p>Intro text.</p>
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
					<button type="button" class="btn btn-{leftOpen ? 'primary' : 'secondary'}" on:click={ () => { updatePanels({ left: !leftOpen }) } }>
						Toggle Left
					</button>
					<button type="button" class="btn btn-{rightOpen ? 'primary' : 'secondary'}" on:click={ () => { updatePanels({ right: !rightOpen }) } }>
						Toggle Right
					</button>
				</div>
			</div>
		</div>
		<DemoContent />
	</div>
</SidebarPanels>
