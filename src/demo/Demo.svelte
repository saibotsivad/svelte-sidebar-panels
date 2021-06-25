<script>
	import SidebarPanels from '../SidebarPanels.svelte'
	import LoremIpsum from './LoremIpsum.svelte'
	import DemoControls from './DemoControls.svelte'

	let leftOpen
	let rightOpen

	let duration = undefined
	let updatePanels
</script>

<style>
	/*
	These styles are not necessary to make the component function correctly, they are
	only here to make the demo prettier.
	*/
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
	/* custom scrollbars because the defaults look so bad */
	:global(.sidebar-panel) {
		scrollbar-width: thin;
		scrollbar-color: #454545 #b1b1b1;
	}
	:global(.sidebar-panel::-webkit-scrollbar) {
		width: 12px;
	}
	:global(.sidebar-panel::-webkit-scrollbar-track) {
		background: #b1b1b1;
	}
	:global(.sidebar-panel::-webkit-scrollbar-thumb) {
		background-color: #454545;
		border-radius: 20px;
		border: 3px solid #b1b1b1;
	}
</style>

<SidebarPanels bind:updatePanels {duration} on:change={({ detail: { left, right } }) => { leftOpen = left; rightOpen = right }}>
	<div slot="left">
		<LoremIpsum />
	</div>
	<div slot="right">
		<LoremIpsum />
	</div>
	<div slot="content">
		<div class="container">
			<h1>Svelte Sidebar Panels</h1>
			<p>Intro text.</p>
			<p>
				Filler content generated using <a href="http://officeipsum.com/">OfficeIpsum</a>.
			</p>
			<DemoControls
				{leftOpen}
				{rightOpen}
				bind:duration
				on:toggleLeft={ () => { updatePanels({ left: !leftOpen }) } }
				on:toggleRight={ () => { updatePanels({ right: !rightOpen }) } }
			/>
			<LoremIpsum />
		</div>
	</div>
</SidebarPanels>
