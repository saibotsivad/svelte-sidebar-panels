# Svelte Sidebar Panels

Svelte component for the classic two/three-column website layout, where the
left and right columns can be toggled.

[Have a look at the demo.](https://saibotsivad.github.io/svelte-sidebar-panels/)
(Be sure to check it on a mobile device, or in your browser in mobile mode.)

# Install

The usual way:

```bash
npm install svelte-sidebar-panels
```

# Use

There are three [slots](https://svelte.dev/docs#slot): the main content area,
and the left and right columns. (You don't need the left or right columns, e.g.
if you want only the left column.)

The component emits an event named `change` which tells you when the panels
change state, and you bind to `updatePanels` as a function to manually toggle
the panels (e.g. from a nav menu).

For example, using only the left panel:

```html
<script>
	import SidebarPanels from 'svelte-sidebar-panels'
	let updatePanels
	let leftOpen
</script>
<SidebarPanels
	bind:updatePanels
	on:change={ (event) => leftOpen = event.detail.left }
>
	<div slot="left">
		left panel
	</div>
	<div slot="content">
		main content
		<button on:click={ () => updatePanels({ left: !leftOpen }) }>
			toggle left panel
		</button>
	</div>
</SidebarPanels>
```

For more details, have a look at the [documentation for each configurable property](https://github.com/saibotsivad/svelte-sidebar-panels/blob/main/src/SidebarPanels.svelte).

### License

This project published and released under the [Very Open License](http://veryopenlicense.com)
