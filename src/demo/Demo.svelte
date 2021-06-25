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
		padding: 15px;
		min-height: 100%;
		background-color: #ececec;
	}
	div[slot="right"] {
		padding: 15px;
		min-height: 100%;
		background-color: #ececec;
	}
	div[slot="content"] {
		padding: 15px;
		min-height: 100%;
		background-color: #ececec;
	}
</style>

<SidebarPanels bind:updatePanels {duration} on:change={({ detail: { left, right } }) => { leftOpen = left; rightOpen = right }}>
	<div slot="left">
		<h2>Left Sidebar</h2>
		<LoremIpsum />
	</div>
	<div slot="right">
		<h2>Right Sidebar</h2>
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
