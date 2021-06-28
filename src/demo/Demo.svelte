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
		background-color: #bcd9b4;
	}
</style>

<SidebarPanels
	{duration}
	bind:updatePanels
	on:change={({ detail: { left, right } }) => { leftOpen = left; rightOpen = right }}
>
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
			<p>
				This component is the classic three-column website layout, where the left and right columns are
				collapsible on smaller screens. (If you've seen the Discord mobile app, it's similar to that.)
			</p>
			<p>
				For more details, check out the <a href="https://github.com/saibotsivad/svelte-sidebar-panels#readme">documentation</a>.
			</p>
			<DemoControls
				{leftOpen}
				{rightOpen}
				bind:duration
				on:toggleLeft={ () => { updatePanels({ left: !leftOpen }) } }
				on:toggleRight={ () => { updatePanels({ right: !rightOpen }) } }
			/>
			<p class="text-muted mb-0 mt-3">
				Filler text generated using <a href="http://officeipsum.com/">OfficeIpsum</a>.
			</p>
			<LoremIpsum />
		</div>
	</div>
</SidebarPanels>
